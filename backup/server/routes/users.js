// ============================================
// USER ROUTES
// ============================================
const express = require('express');
const db = require('../db');
const { authMiddleware, adminMiddleware, auditLog } = require('../middleware');
const router = express.Router();

router.get('/notifications', authMiddleware, (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const notifs = db.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?").all(req.user.id, limit);
    const unread = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0").get(req.user.id).c;
    res.json({ success: true, notifications: notifs, unread });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/notifications/read-all', authMiddleware, (req, res) => {
  db.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").run(req.user.id);
  res.json({ success: true });
});

router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  db.prepare("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?").run(req.params.id, req.user.id);
  res.json({ success: true });
});

router.get('/referrals', authMiddleware, (req, res) => {
  try {
    const referrals = db.prepare("SELECT r.*,u.name as referee_name,u.email as referee_email,u.created_at as joined_at FROM referrals r JOIN users u ON r.referee_id=u.id WHERE r.referrer_id=? ORDER BY r.created_at DESC").all(req.user.id);
    const totalComm = referrals.reduce((s,r) => s+(r.commission||0), 0);
    res.json({ success: true, referrals, total_count: referrals.length, total_commission: totalComm });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/kyc', authMiddleware, (req, res) => {
  try {
    const { level, doc_type, country } = req.body;
    if (!level || !doc_type || !country) return res.status(400).json({ success: false, message: 'Missing fields' });
    const existing = db.prepare("SELECT id FROM kyc_submissions WHERE user_id=? AND level=? AND status='pending'").get(req.user.id, level);
    if (existing) return res.status(409).json({ success: false, message: 'Already pending' });
    const id = 'KYC' + Date.now();
    db.prepare("INSERT INTO kyc_submissions (id,user_id,level,doc_type,country,status,submitted_at) VALUES (?,?,?,?,?,?,?)").run(id, req.user.id, level, doc_type, country, 'pending', Date.now());
    db.prepare("UPDATE users SET kyc_status='pending' WHERE id=?").run(req.user.id);
    auditLog(req.user.id, 'KYC_SUBMIT', { level, doc_type }, req.ip);
    res.json({ success: true, message: 'KYC submitted', id });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/kyc', authMiddleware, (req, res) => {
  try {
    const subs = db.prepare("SELECT * FROM kyc_submissions WHERE user_id=? ORDER BY submitted_at DESC").all(req.user.id);
    const user = db.prepare("SELECT kyc_level,kyc_status FROM users WHERE id=?").get(req.user.id);
    res.json({ success: true, kyc_level: user.kyc_level, kyc_status: user.kyc_status, submissions: subs });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/api-keys', authMiddleware, (req, res) => {
  try {
    const keys = db.prepare("SELECT id,label,permissions,ip_whitelist,status,last_used,created_at FROM api_keys WHERE user_id=?").all(req.user.id);
    res.json({ success: true, keys });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/api-keys', authMiddleware, (req, res) => {
  try {
    const { label, permissions } = req.body;
    if (!label) return res.status(400).json({ success: false, message: 'Label required' });
    const cnt = db.prepare("SELECT COUNT(*) as c FROM api_keys WHERE user_id=?").get(req.user.id).c;
    if (cnt >= 10) return res.status(400).json({ success: false, message: 'Max 10 API keys' });
    const rawKey  = require('crypto').randomBytes(32).toString('hex');
    const keyHash = require('bcryptjs').hashSync(rawKey, 8);
    const id = 'KEY' + Date.now();
    db.prepare("INSERT INTO api_keys (id,user_id,label,key_hash,permissions,status,created_at) VALUES (?,?,?,?,?,?,?)").run(id, req.user.id, label, keyHash, permissions||'read', 'active', Date.now());
    auditLog(req.user.id, 'CREATE_API_KEY', { label }, req.ip);
    res.json({ success: true, key: rawKey, id, label, message: 'Store this key safely — it will not be shown again.' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/api-keys/:id', authMiddleware, (req, res) => {
  try {
    const key = db.prepare("SELECT id FROM api_keys WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
    if (!key) return res.status(404).json({ success: false, message: 'Key not found' });
    db.prepare("DELETE FROM api_keys WHERE id=?").run(req.params.id);
    auditLog(req.user.id, 'DELETE_API_KEY', { id: req.params.id }, req.ip);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

// ===== ADMIN =====
router.get('/admin/stats', adminMiddleware, (req, res) => {
  try {
    const total     = db.prepare("SELECT COUNT(*) as c FROM users WHERE role!='admin'").get().c;
    const active    = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='active' AND role!='admin'").get().c;
    const verified  = db.prepare("SELECT COUNT(*) as c FROM users WHERE kyc_status='verified'").get().c;
    const pending   = db.prepare("SELECT COUNT(*) as c FROM kyc_submissions WHERE status='pending'").get().c;
    const suspended = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='suspended'").get().c;
    const today     = new Date().setHours(0,0,0,0);
    const newToday  = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at>=?").get(today).c;
    res.json({ success: true, stats: { total, active, verified, pending_kyc: pending, suspended, new_today: newToday } });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/list', adminMiddleware, (req, res) => {
  try {
    const { search, status, kyc_status, limit=50, offset=0 } = req.query;
    let q = "SELECT id,name,email,role,status,kyc_level,kyc_status,vip_level,created_at,last_login FROM users WHERE role!='admin'";
    const p = [];
    if (search)     { q += " AND (name LIKE ? OR email LIKE ? OR id LIKE ?)"; const s='%'+search+'%'; p.push(s,s,s); }
    if (status)     { q += " AND status=?";     p.push(status); }
    if (kyc_status) { q += " AND kyc_status=?"; p.push(kyc_status); }
    q += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    p.push(Math.min(parseInt(limit),200), parseInt(offset));
    const users = db.prepare(q).all(...p);
    const total = db.prepare("SELECT COUNT(*) as c FROM users WHERE role!='admin'").get().c;
    res.json({ success: true, users, total });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/kyc/pending', adminMiddleware, (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const subs = db.prepare("SELECT k.*,u.name as user_name,u.email as user_email FROM kyc_submissions k JOIN users u ON k.user_id=u.id WHERE k.status=? ORDER BY k.submitted_at DESC").all(status);
    res.json({ success: true, submissions: subs });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/:id', adminMiddleware, (req, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const balances = db.prepare("SELECT coin,available,in_order FROM balances WHERE user_id=?").all(req.params.id);
    const orders   = db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20").all(req.params.id);
    delete user.password; delete user.totp_secret;
    res.json({ success: true, user, balances, orders });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/admin/:id/status', adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    if (!['active','suspended','banned'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    db.prepare("UPDATE users SET status=? WHERE id=?").run(status, req.params.id);
    auditLog(req.user.id, 'ADMIN_USER_STATUS', { id: req.params.id, status }, req.ip);
    res.json({ success: true, message: 'User '+status });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/admin/:id/kyc', adminMiddleware, (req, res) => {
  try {
    const { kyc_status, kyc_level } = req.body;
    db.prepare("UPDATE users SET kyc_status=?,kyc_level=? WHERE id=?").run(kyc_status||'unverified', kyc_level||0, req.params.id);
    if (kyc_status === 'verified') {
      db.prepare("UPDATE kyc_submissions SET status='approved',reviewed_at=? WHERE user_id=? AND status='pending'").run(Date.now(), req.params.id);
    } else if (kyc_status === 'rejected') {
      db.prepare("UPDATE kyc_submissions SET status='rejected',reviewed_at=? WHERE user_id=? AND status='pending'").run(Date.now(), req.params.id);
    }
    auditLog(req.user.id, 'ADMIN_UPDATE_KYC', { id: req.params.id, kyc_status }, req.ip);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
