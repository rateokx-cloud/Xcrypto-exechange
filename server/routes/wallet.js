// ============================================
// WALLET ROUTES
// ============================================
const express = require('express');
const db = require('../db');
const { authMiddleware, adminMiddleware, auditLog } = require('../middleware');
const router = express.Router();

router.get('/balances', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare("SELECT coin,available,in_order FROM balances WHERE user_id=?").all(req.user.id);
    const result = {};
    rows.forEach(b => { result[b.coin] = { available: b.available, in_order: b.in_order }; });
    res.json({ success: true, balances: result });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/balance/:coin', authMiddleware, (req, res) => {
  try {
    const bal = db.prepare("SELECT available,in_order FROM balances WHERE user_id=? AND coin=?").get(req.user.id, req.params.coin.toUpperCase());
    res.json({ success: true, coin: req.params.coin.toUpperCase(), available: bal ? bal.available : 0, in_order: bal ? bal.in_order : 0 });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/deposit/address', authMiddleware, (req, res) => {
  try {
    const { coin, network } = req.body;
    if (!coin || !network) return res.status(400).json({ success: false, message: 'Coin and network required' });
    const seed = req.user.id + coin + network;
    let addr = '';
    const coinUp = coin.toUpperCase();
    if (coinUp === 'BTC') addr = '1' + Buffer.from(seed).toString('hex').slice(0, 33);
    else if (coinUp === 'SOL') addr = Buffer.from(seed).toString('base64').replace(/[^A-Za-z0-9]/g,'').slice(0,44);
    else addr = '0x' + Buffer.from(seed).toString('hex').slice(0, 40);
    const minDeposit   = { BTC:'0.0001', ETH:'0.01', USDT:'10', BNB:'0.01', SOL:'0.1', XRP:'25' };
    const confRequired = { BTC:3, ETH:12, USDT:15, BNB:15, SOL:1, XRP:1 };
    res.json({ success: true, address: addr, coin: coinUp, network, min_deposit: minDeposit[coinUp] || '0.01', confirmations_required: confRequired[coinUp] || 3 });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/deposits', authMiddleware, (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const deps   = db.prepare("SELECT * FROM deposits WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?").all(req.user.id, limit, offset);
    const total  = db.prepare("SELECT COUNT(*) as c FROM deposits WHERE user_id=?").get(req.user.id).c;
    res.json({ success: true, deposits: deps, total });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/withdraw', authMiddleware, (req, res) => {
  try {
    const { coin, network, address, amount } = req.body;
    if (!coin || !network || !address || !amount)
      return res.status(400).json({ success: false, message: 'All fields required' });
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const coinUp = coin.toUpperCase();
    const fees = { BTC:0.0005, ETH:0.005, USDT:1, BNB:0.001, SOL:0.00001 };
    const fee  = fees[coinUp] || 0;
    const total = amt + fee;
    const bal = db.prepare("SELECT available FROM balances WHERE user_id=? AND coin=?").get(req.user.id, coinUp);
    if (!bal || bal.available < total)
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    const wdId = 'WD' + Date.now() + Math.floor(Math.random()*1000);
    const now  = Date.now();
    db.prepare("UPDATE balances SET available=available-? WHERE user_id=? AND coin=?").run(total, req.user.id, coinUp);
    db.prepare("INSERT INTO withdrawals (id,user_id,coin,network,amount,fee,address,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(wdId, req.user.id, coinUp, network, amt, fee, address, 'pending', now);
    db.prepare("INSERT INTO notifications (user_id,type,title,message,created_at) VALUES (?,?,?,?,?)").run(req.user.id, 'withdrawal', 'Withdrawal Submitted', `Your withdrawal of ${amt} ${coinUp} is being processed.`, now);
    auditLog(req.user.id, 'WITHDRAW', { coin: coinUp, amount: amt, address, network }, req.ip);
    res.json({ success: true, message: 'Withdrawal submitted', withdrawal_id: wdId });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/withdrawals', authMiddleware, (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const wds    = db.prepare("SELECT * FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?").all(req.user.id, limit, offset);
    const total  = db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE user_id=?").get(req.user.id).c;
    res.json({ success: true, withdrawals: wds, total });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/transactions', authMiddleware, (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
    const deps   = db.prepare("SELECT id,coin,amount,status,created_at,'deposit' as type FROM deposits WHERE user_id=? ORDER BY created_at DESC LIMIT ?").all(req.user.id, limit);
    const wds    = db.prepare("SELECT id,coin,amount,status,created_at,'withdrawal' as type FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT ?").all(req.user.id, limit);
    const trades = db.prepare("SELECT id,pair as coin,amount,status,created_at,'trade' as type FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT ?").all(req.user.id, limit);
    const all    = [...deps, ...wds, ...trades].sort((a,b) => b.created_at - a.created_at).slice(0, limit);
    res.json({ success: true, transactions: all });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ADMIN
router.get('/admin/withdrawals', adminMiddleware, (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    let rows;
    if (status === 'all') {
      rows = db.prepare("SELECT w.*,u.name as user_name,u.email as user_email FROM withdrawals w JOIN users u ON w.user_id=u.id ORDER BY w.created_at DESC LIMIT ?").all(limit);
    } else {
      rows = db.prepare("SELECT w.*,u.name as user_name,u.email as user_email FROM withdrawals w JOIN users u ON w.user_id=u.id WHERE w.status=? ORDER BY w.created_at DESC LIMIT ?").all(status, limit);
    }
    res.json({ success: true, withdrawals: rows });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/admin/withdrawals/:id', adminMiddleware, (req, res) => {
  try {
    const { status, admin_note } = req.body;
    if (!['approved','rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    const wd = db.prepare("SELECT * FROM withdrawals WHERE id=?").get(req.params.id);
    if (!wd) return res.status(404).json({ success: false, message: 'Not found' });
    if (wd.status !== 'pending') return res.status(400).json({ success: false, message: 'Already processed' });
    db.prepare("UPDATE withdrawals SET status=?,admin_note=?,processed_at=? WHERE id=?").run(status, admin_note || null, Date.now(), wd.id);
    if (status === 'rejected') {
      db.prepare("UPDATE balances SET available=available+? WHERE user_id=? AND coin=?").run(wd.amount + wd.fee, wd.user_id, wd.coin);
    }
    const title = status === 'approved' ? 'Withdrawal Approved' : 'Withdrawal Rejected';
    const msg   = status === 'approved' ? `Your withdrawal of ${wd.amount} ${wd.coin} has been approved.` : `Withdrawal rejected. ${admin_note || ''}`;
    db.prepare("INSERT INTO notifications (user_id,type,title,message,created_at) VALUES (?,?,?,?,?)").run(wd.user_id, 'withdrawal', title, msg, Date.now());
    auditLog(req.user.id, 'ADMIN_WD_' + status.toUpperCase(), { wd_id: wd.id }, req.ip);
    res.json({ success: true, message: `Withdrawal ${status}` });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/admin/credit', adminMiddleware, (req, res) => {
  try {
    const { user_id, coin, amount } = req.body;
    if (!user_id || !coin || !amount) return res.status(400).json({ success: false, message: 'Missing fields' });
    const user = db.prepare("SELECT id FROM users WHERE id=?").get(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    db.prepare("INSERT INTO balances (user_id,coin,available,in_order) VALUES (?,?,?,0) ON CONFLICT(user_id,coin) DO UPDATE SET available=available+?").run(user_id, coin.toUpperCase(), parseFloat(amount), parseFloat(amount));
    auditLog(req.user.id, 'ADMIN_CREDIT', { user_id, coin, amount }, req.ip);
    res.json({ success: true, message: 'Balance credited' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
