// ============================================
// AUTH ROUTES - Register, Login, Logout, Profile
// ============================================
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db       = require('../db');
const { authMiddleware, auditLog, JWT_SECRET } = require('../middleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, referral_code } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash    = await bcrypt.hash(password, 12);
    const userId  = 'UID' + Date.now() + Math.floor(Math.random() * 1000);
    const refCode = userId.slice(-8).toUpperCase();
    const now     = Date.now();

    // Check referral
    let referredBy = null;
    if (referral_code) {
      const ref = db.prepare('SELECT id FROM users WHERE referral_code=?').get(referral_code.toUpperCase());
      if (ref) referredBy = ref.id;
    }

    db.prepare(`
      INSERT INTO users (id,name,email,phone,password,role,status,kyc_level,kyc_status,referral_code,referred_by,created_at)
      VALUES (?,?,?,?,?,'user','active',0,'unverified',?,?,?)
    `).run(userId, name.trim(), email.toLowerCase().trim(), phone || null, hash, refCode, referredBy, now);

    // Default balances
    const defaultCoins = [
      ['USDT', 10000], ['BTC', 0], ['ETH', 0], ['BNB', 0],
      ['SOL', 0], ['XRP', 0], ['ADA', 0], ['DOGE', 0]
    ];
    const insertBal = db.prepare('INSERT OR IGNORE INTO balances (user_id,coin,available,in_order) VALUES (?,?,?,0)');
    defaultCoins.forEach(([c, a]) => insertBal.run(userId, c, a));

    // Track referral
    if (referredBy) {
      db.prepare('INSERT INTO referrals (referrer_id,referee_id,commission,created_at) VALUES (?,?,0,?)').run(referredBy, userId, now);
    }

    const token = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    const user  = db.prepare('SELECT id,name,email,role,status,kyc_level,kyc_status,referral_code,created_at FROM users WHERE id=?').get(userId);

    auditLog(userId, 'REGISTER', { email, ip: req.ip }, req.ip);

    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase().trim());
    if (!user)
      return res.status(401).json({ success: false, message: 'Account not found' });
    if (user.status === 'suspended')
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support.' });
    if (user.status === 'banned')
      return res.status(403).json({ success: false, message: 'Account banned.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Incorrect password' });

    // Update last login
    db.prepare('UPDATE users SET last_login=?, last_ip=? WHERE id=?').run(Date.now(), req.ip, user.id);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const safeUser = {
      id: user.id, name: user.name, email: user.email,
      role: user.role, status: user.status,
      kyc_level: user.kyc_level, kyc_status: user.kyc_status,
      referral_code: user.referral_code, totp_enabled: user.totp_enabled,
      created_at: user.created_at
    };

    auditLog(user.id, 'LOGIN', { ip: req.ip, ua: req.headers['user-agent'] }, req.ip);
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,name,email,phone,role,status,kyc_level,kyc_status,referral_code,totp_enabled,vip_level,avatar,created_at,last_login FROM users WHERE id=?').get(req.user.id);
  res.json({ success: true, user });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { name, phone, country, dob } = req.body;
    db.prepare('UPDATE users SET name=?, phone=? WHERE id=?').run(
      name || req.user.name, phone || null, req.user.id
    );
    auditLog(req.user.id, 'UPDATE_PROFILE', {}, req.ip);
    const user = db.prepare('SELECT id,name,email,phone,role,status,kyc_level,kyc_status,referral_code,vip_level,created_at FROM users WHERE id=?').get(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password || new_password.length < 8)
      return res.status(400).json({ success: false, message: 'Invalid passwords' });

    const user = db.prepare('SELECT password FROM users WHERE id=?').get(req.user.id);
    const valid = await bcrypt.compare(old_password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.user.id);
    auditLog(req.user.id, 'CHANGE_PASSWORD', {}, req.ip);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  auditLog(req.user.id, 'LOGOUT', {}, req.ip);
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
