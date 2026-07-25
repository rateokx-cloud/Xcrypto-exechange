// ============================================
// TRADING ROUTES
// ============================================
const express = require('express');
const db = require('../db');
const { authMiddleware, adminMiddleware, auditLog } = require('../middleware');
const router = express.Router();

function pe() { return require('../priceEngine').priceEngine; }

router.get('/markets', (req, res) => {
  try {
    const markets = db.prepare("SELECT * FROM markets WHERE status='active' ORDER BY pair").all();
    res.json({ success: true, markets });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/ticker', (req, res) => {
  try {
    const engine  = pe();
    const markets = db.prepare("SELECT pair,base,quote FROM markets WHERE status='active'").all();
    const tickers = markets.map(m => ({ pair: m.pair, base: m.base, quote: m.quote, ...(engine.getPrice(m.pair) || {}) }));
    res.json({ success: true, tickers });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/ticker/:pair', (req, res) => {
  try {
    const pair = req.params.pair.toUpperCase().replace('-', '/');
    const data = pe().getPrice(pair);
    if (!data) return res.status(404).json({ success: false, message: 'Pair not found' });
    res.json({ success: true, pair, ...data });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orderbook/:pair', (req, res) => {
  try {
    const pair   = req.params.pair.toUpperCase().replace('-', '/');
    const levels = Math.min(parseInt(req.query.levels) || 15, 50);
    const book   = pe().getOrderBook(pair, levels);
    res.json({ success: true, pair, ...book });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/trades/:pair', (req, res) => {
  try {
    const pair   = req.params.pair.toUpperCase().replace('-', '/');
    const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
    const trades = pe().getRecentTrades(pair, limit);
    res.json({ success: true, pair, trades });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/klines/:pair', (req, res) => {
  try {
    const pair     = req.params.pair.toUpperCase().replace('-', '/');
    const interval = req.query.interval || '15m';
    const limit    = Math.min(parseInt(req.query.limit) || 100, 500);
    const klines   = pe().getKlines(pair, interval, limit);
    res.json({ success: true, pair, interval, klines });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/order', authMiddleware, (req, res) => {
  try {
    const { pair, side, type, price, amount } = req.body;
    if (!pair || !side || !type || !amount)
      return res.status(400).json({ success: false, message: 'Missing fields' });
    if (!['buy','sell'].includes(side))
      return res.status(400).json({ success: false, message: 'Invalid side' });
    if (!['limit','market','stop'].includes(type))
      return res.status(400).json({ success: false, message: 'Invalid type' });

    const pairUp = pair.toUpperCase().replace('-', '/');
    const market = db.prepare("SELECT * FROM markets WHERE pair=? AND status='active'").get(pairUp);
    if (!market) return res.status(404).json({ success: false, message: 'Market not found' });

    const engine    = pe();
    const ticker    = engine.getPrice(pairUp);
    const execPrice = type === 'market' ? ticker.price : parseFloat(price);
    const execAmt   = parseFloat(amount);
    if (!execPrice || execPrice <= 0) return res.status(400).json({ success: false, message: 'Invalid price' });
    if (!execAmt   || execAmt   <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const total = execPrice * execAmt;
    if (total < market.min_order)
      return res.status(400).json({ success: false, message: 'Order too small. Min: ' + market.min_order + ' ' + market.quote });

    if (side === 'buy') {
      const required = total * (1 + market.taker_fee);
      const bal = db.prepare("SELECT available FROM balances WHERE user_id=? AND coin=?").get(req.user.id, market.quote);
      if (!bal || bal.available < required)
        return res.status(400).json({ success: false, message: 'Insufficient ' + market.quote });
      db.prepare("UPDATE balances SET available=available-?,in_order=in_order+? WHERE user_id=? AND coin=?").run(required, required, req.user.id, market.quote);
    } else {
      const bal = db.prepare("SELECT available FROM balances WHERE user_id=? AND coin=?").get(req.user.id, market.base);
      if (!bal || bal.available < execAmt)
        return res.status(400).json({ success: false, message: 'Insufficient ' + market.base });
      db.prepare("UPDATE balances SET available=available-?,in_order=in_order+? WHERE user_id=? AND coin=?").run(execAmt, execAmt, req.user.id, market.base);
    }

    const orderId = 'ORD' + Date.now() + Math.floor(Math.random() * 9999);
    const fee     = total * market.taker_fee;
    const now     = Date.now();
    db.prepare("INSERT INTO orders (id,user_id,pair,side,type,price,amount,filled,total,fee,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?,?,?,?)").run(orderId, req.user.id, pairUp, side, type, execPrice, execAmt, total, fee, 'open', now, now);

    if (type === 'market') {
      _fill(orderId, req.user.id, pairUp, side, execPrice, execAmt, fee, market);
    }

    db.prepare("INSERT INTO notifications (user_id,type,title,message,created_at) VALUES (?,?,?,?,?)").run(req.user.id, 'order', 'Order Placed', side.toUpperCase()+' '+execAmt+' '+market.base+' @ $'+execPrice.toFixed(2), now);
    auditLog(req.user.id, 'PLACE_ORDER', { pair: pairUp, side, type, price: execPrice, amount: execAmt }, req.ip);

    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
    res.json({ success: true, order });
  } catch(err) {
    console.error('Order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

function _fill(orderId, userId, pair, side, price, amount, fee, market) {
  const now = Date.now();
  db.prepare("UPDATE orders SET status='filled',filled=?,updated_at=? WHERE id=?").run(amount, now, orderId);
  if (side === 'buy') {
    const refund = price * amount * (1 + market.taker_fee);
    db.prepare("UPDATE balances SET in_order=in_order-? WHERE user_id=? AND coin=?").run(refund, userId, market.quote);
    db.prepare("INSERT INTO balances (user_id,coin,available,in_order) VALUES (?,?,?,0) ON CONFLICT(user_id,coin) DO UPDATE SET available=available+?").run(userId, market.base, amount, amount);
  } else {
    db.prepare("UPDATE balances SET in_order=in_order-? WHERE user_id=? AND coin=?").run(amount, userId, market.base);
    const received = price * amount * (1 - market.taker_fee);
    db.prepare("INSERT INTO balances (user_id,coin,available,in_order) VALUES (?,?,?,0) ON CONFLICT(user_id,coin) DO UPDATE SET available=available+?").run(userId, market.quote, received, received);
  }
  db.prepare("INSERT INTO trades (id,order_id,user_id,pair,side,price,amount,fee,fee_coin,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run('TRD'+now+Math.floor(Math.random()*999), orderId, userId, pair, side, price, amount, fee, side==='buy'?market.base:market.quote, now);
}

router.delete('/order/:id', authMiddleware, (req, res) => {
  try {
    const order = db.prepare("SELECT * FROM orders WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'open') return res.status(400).json({ success: false, message: 'Cannot cancel' });
    db.prepare("UPDATE orders SET status='cancelled',updated_at=? WHERE id=?").run(Date.now(), order.id);
    const market = db.prepare("SELECT * FROM markets WHERE pair=?").get(order.pair);
    if (market) {
      if (order.side === 'buy') {
        const refund = order.total * (1 + market.taker_fee);
        db.prepare("UPDATE balances SET available=available+?,in_order=in_order-? WHERE user_id=? AND coin=?").run(refund, refund, req.user.id, market.quote);
      } else {
        const rem = order.amount - order.filled;
        db.prepare("UPDATE balances SET available=available+?,in_order=in_order-? WHERE user_id=? AND coin=?").run(rem, rem, req.user.id, market.base);
      }
    }
    auditLog(req.user.id, 'CANCEL_ORDER', { order_id: order.id }, req.ip);
    res.json({ success: true, message: 'Order cancelled' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders', authMiddleware, (req, res) => {
  try {
    const { status, pair, limit=50, offset=0 } = req.query;
    let q = "SELECT * FROM orders WHERE user_id=?";
    const p = [req.user.id];
    if (status) { q += " AND status=?"; p.push(status); }
    if (pair)   { q += " AND pair=?";   p.push(pair.toUpperCase().replace('-','/')); }
    q += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    p.push(Math.min(parseInt(limit),200), parseInt(offset));
    const orders = db.prepare(q).all(...p);
    const total  = db.prepare("SELECT COUNT(*) as c FROM orders WHERE user_id=?").get(req.user.id).c;
    res.json({ success: true, orders, total });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/my-trades', authMiddleware, (req, res) => {
  try {
    const { pair, limit=50, offset=0 } = req.query;
    let q = "SELECT * FROM trades WHERE user_id=?";
    const p = [req.user.id];
    if (pair) { q += " AND pair=?"; p.push(pair.toUpperCase().replace('-','/')); }
    q += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    p.push(Math.min(parseInt(limit),200), parseInt(offset));
    res.json({ success: true, trades: db.prepare(q).all(...p) });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/orders', adminMiddleware, (req, res) => {
  try {
    const { status, pair, limit=100 } = req.query;
    let q = "SELECT o.*,u.name as user_name,u.email as user_email FROM orders o JOIN users u ON o.user_id=u.id";
    const p = [];
    const w = [];
    if (status) { w.push("o.status=?"); p.push(status); }
    if (pair)   { w.push("o.pair=?");   p.push(pair.toUpperCase()); }
    if (w.length) q += " WHERE "+w.join(" AND ");
    q += " ORDER BY o.created_at DESC LIMIT ?";
    p.push(Math.min(parseInt(limit),500));
    res.json({ success: true, orders: db.prepare(q).all(...p) });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/stats', adminMiddleware, (req, res) => {
  try {
    const total_orders = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
    const total_trades = db.prepare("SELECT COUNT(*) as c FROM trades").get().c;
    const total_volume = db.prepare("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='filled'").get().v;
    const total_fees   = db.prepare("SELECT COALESCE(SUM(fee),0) as f FROM orders WHERE status='filled'").get().f;
    const today        = new Date().setHours(0,0,0,0);
    const today_volume = db.prepare("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='filled' AND created_at>=?").get(today).v;
    const top_pairs    = db.prepare("SELECT pair,COUNT(*) as count,SUM(total) as volume FROM orders WHERE status='filled' GROUP BY pair ORDER BY volume DESC LIMIT 5").all();
    res.json({ success: true, stats: { total_orders, total_trades, total_volume, total_fees, today_volume, top_pairs } });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/admin/markets/:id', adminMiddleware, (req, res) => {
  try {
    const { maker_fee, taker_fee, min_order, status } = req.body;
    db.prepare("UPDATE markets SET maker_fee=?,taker_fee=?,min_order=?,status=? WHERE id=?").run(parseFloat(maker_fee)||0.001, parseFloat(taker_fee)||0.001, parseFloat(min_order)||10, status||'active', req.params.id);
    auditLog(req.user.id, 'ADMIN_UPDATE_MARKET', { id: req.params.id }, req.ip);
    res.json({ success: true, message: 'Market updated' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/admin/markets', adminMiddleware, (req, res) => {
  try {
    const { base, quote, maker_fee, taker_fee, min_order } = req.body;
    if (!base || !quote) return res.status(400).json({ success: false, message: 'Base and quote required' });
    const pair = base.toUpperCase()+'/'+quote.toUpperCase();
    if (db.prepare("SELECT id FROM markets WHERE pair=?").get(pair))
      return res.status(409).json({ success: false, message: 'Market exists' });
    db.prepare("INSERT INTO markets (id,base,quote,pair,maker_fee,taker_fee,min_order,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(pair, base.toUpperCase(), quote.toUpperCase(), pair, parseFloat(maker_fee)||0.001, parseFloat(taker_fee)||0.001, parseFloat(min_order)||10, 'active', Date.now());
    res.json({ success: true, message: 'Market created' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
