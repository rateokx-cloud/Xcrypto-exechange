// ============================================
// MAIN SERVER - Express App
// ============================================
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const http         = require('http');

const db           = require('./db');
const { seed }     = require('./seed');
const { setupWebSocket } = require('./websocket');

// Routes
const authRoutes    = require('./routes/auth');
const walletRoutes  = require('./routes/wallet');
const tradingRoutes = require('./routes/trading');
const userRoutes    = require('./routes/users');
const adminRoutes   = require('./routes/admin');

const app    = express();
const server = http.createServer(app);

// ============ MIDDLEWARE ============
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many requests, please try again later.' } });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ============ API ROUTES ============
app.use('/api/auth',    authRoutes);
app.use('/api/wallet',  walletRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/admin',   adminRoutes);

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: Date.now(), version: '1.0.0' });
});

// ============ SERVE FRONTEND ============
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback — serve index.html for all non-API routes
app.get(/^(?!\/api|\/ws).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ============ START ============
const PORT = process.env.PORT || 3000;

// Seed database
seed();

// Setup WebSocket
setupWebSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     CryptoX Exchange Server          ║');
  console.log(`║     Running on http://localhost:${PORT}  ║`);
  console.log('║     WebSocket: ws://localhost:' + PORT + '/ws ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('📧 Admin: admin@cryptox.io');
  console.log('🔑 Password: Admin@123456');
  console.log('');
});

module.exports = { app, server };
