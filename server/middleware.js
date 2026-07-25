// ============================================
// MIDDLEWARE - Auth, Rate Limiting, Validation
// ============================================
const jwt = require('jsonwebtoken');
const db  = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'cryptox_secret_key_change_in_production';

// Verify JWT token
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id,name,email,role,status,kyc_level,kyc_status FROM users WHERE id=?').get(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended' });
    if (user.status === 'banned')    return res.status(403).json({ success: false, message: 'Account banned' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Admin only
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  });
}

// Optional auth (does not fail if no token)
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = db.prepare('SELECT id,name,email,role,status FROM users WHERE id=?').get(decoded.id);
    } catch {}
  }
  next();
}

// Log audit
function auditLog(userId, action, details, ip) {
  try {
    db.prepare('INSERT INTO audit_logs (user_id,action,details,ip,created_at) VALUES (?,?,?,?,?)').run(userId, action, JSON.stringify(details), ip, Date.now());
  } catch {}
}

module.exports = { authMiddleware, adminMiddleware, optionalAuth, auditLog, JWT_SECRET };
