// ============================================
// ADMIN ROUTES
// ============================================
const express = require('express');
const db = require('../db');
const { adminMiddleware, auditLog } = require('../middleware');
const router = express.Router();

router.get('/dashboard', adminMiddleware, (req, res) => {
  try {
    const { priceEngine } = require('../priceEngine');
    const total_users    = db.prepare("SELECT COUNT(*) as c FROM users WHERE role!='admin'").get().c;
    const active_users   = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='active' AND role!='admin'").get().c;
    const verified_users = db.prepare("SELECT COUNT(*) as c FROM users WHERE kyc_status='verified'").get().c;
    const total_orders   = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
    const total_trades   = db.prepare("SELECT COUNT(*) as c FROM trades").get().c;
    const total_volume   = db.prepare("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='filled'").get().v;
    const total_fees     = db.prepare("SELECT COALESCE(SUM(fee),0) as f FROM trades").get().f;
    const pending_wd     = db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status='pending'").get().c;
    const pending_kyc    = db.prepare("SELECT COUNT(*) as c FROM kyc_submissions WHERE status='pending'").get().c;
    const total_markets  = db.prepare("SELECT COUNT(*) as c FROM markets WHERE status='active'").get().c;
    const today          = new Date().setHours(0,0,0,0);
    const new_users_today= db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at>=?").get(today).c;
    const volume_today   = db.prepare("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='filled' AND created_at>=?").get(today).v;
    const fees_today     = db.prepare("SELECT COALESCE(SUM(fee),0) as f FROM trades WHERE created_at>=?").get(today).f;

    // Daily stats 30 days
    const daily_stats = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
      const start = d.getTime(); const end = start + 86400000;
      const vol  = db.prepare("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status='filled' AND created_at>=? AND created_at<?").get(start, end).v;
      const fees = db.prepare("SELECT COALESCE(SUM(fee),0) as f FROM trades WHERE created_at>=? AND created_at<?").get(start, end).f;
      const regs = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at>=? AND created_at<?").get(start, end).c;
      daily_stats.push({ date: d.toLocaleDateString('en',{month:'short',day:'numeric'}), volume: parseFloat(vol.toFixed(2)), fees: parseFloat(fees.toFixed(4)), registrations: regs });
    }

    const recent_users = db.prepare("SELECT id,name,email,status,kyc_status,created_at FROM users WHERE role!='admin' ORDER BY created_at DESC LIMIT 8").all();
    const pending_withdrawals = db.prepare("SELECT w.*,u.name as user_name FROM withdrawals w JOIN users u ON w.user_id=u.id WHERE w.status='pending' ORDER BY w.created_at ASC LIMIT 10").all();
    const top_traders = db.prepare("SELECT u.id,u.name,COUNT(t.id) as trade_count,COALESCE(SUM(t.amount*t.price),0) as volume FROM trades t JOIN users u ON t.user_id=u.id GROUP BY t.user_id ORDER BY volume DESC LIMIT 10").all();
    const prices = priceEngine.getAllPrices();
    const markets = db.prepare("SELECT pair,base,quote FROM markets WHERE status='active' ORDER BY pair LIMIT 10").all();
    const market_overview = markets.map(m => ({ ...m, ...(prices[m.pair] || { price:0, change_pct:0, volume:0 }) }));

    res.json({
      success: true,
      stats: { total_users, active_users, verified_users, total_orders, total_trades,
        total_volume: parseFloat(total_volume.toFixed(2)), total_fees: parseFloat(total_fees.toFixed(4)),
        pending_wd, pending_kyc, total_markets, new_users_today,
        volume_today: parseFloat(volume_today.toFixed(2)), fees_today: parseFloat(fees_today.toFixed(4)) },
      daily_stats, top_traders, recent_users, pending_withdrawals, market_overview
    });
  } catch(err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/audit-logs', adminMiddleware, (req, res) => {
  try {
    const { user_id, action, limit = 100, offset = 0 } = req.query;
    let query = "SELECT l.*,u.name as user_name FROM audit_logs l LEFT JOIN users u ON l.user_id=u.id WHERE 1=1";
    const params = [];
    if (user_id) { query += " AND l.user_id=?"; params.push(user_id); }
    if (action)  { query += " AND l.action LIKE ?"; params.push('%'+action+'%'); }
    query += " ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    params.push(Math.min(parseInt(limit),500), parseInt(offset));
    const logs  = db.prepare(query).all(...params);
    const total = db.prepare("SELECT COUNT(*) as c FROM audit_logs").get().c;
    res.json({ success: true, logs, total });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/announcements', (req, res) => {
  try {
    const anns = db.prepare("SELECT * FROM announcements WHERE is_active=1 ORDER BY created_at DESC LIMIT 20").all();
    res.json({ success: true, announcements: anns });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/announcements', adminMiddleware, (req, res) => {
  try {
    const { title, content, type, target } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content required' });
    db.prepare("INSERT INTO announcements (title,content,type,target,is_active,created_by,created_at) VALUES (?,?,?,?,1,?,?)").run(title, content, type || 'info', target || 'all', req.user.id, Date.now());
    auditLog(req.user.id, 'CREATE_ANNOUNCEMENT', { title }, req.ip);
    res.json({ success: true, message: 'Announcement published' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/announcements/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare("UPDATE announcements SET is_active=? WHERE id=?").run(req.body.is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/announcements/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare("DELETE FROM announcements WHERE id=?").run(req.params.id);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/system-stats', adminMiddleware, (req, res) => {
  try {
    const fs = require('fs'), path = require('path');
    let dbSize = 'N/A';
    try { dbSize = (fs.statSync(path.join(__dirname,'../../data/cryptox.db')).size/1024/1024).toFixed(2)+' MB'; } catch {}
    res.json({ success: true, system: { uptime: process.uptime(), memory: process.memoryUsage(), node_ver: process.version, db_size: dbSize, platform: process.platform } });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
