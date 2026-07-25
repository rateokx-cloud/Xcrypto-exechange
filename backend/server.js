require('dotenv').config();
require('express-async-errors');

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const { initDB }       = require('./database/db');
const { initSocket }   = require('./services/socket');
const { initPriceFeed } = require('./services/priceFeed');
const { startCronJobs } = require('./services/cronJobs');
const logger           = require('./utils/logger');

// Routes
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const marketRoutes   = require('./routes/markets');
const orderRoutes    = require('./routes/orders');
const walletRoutes   = require('./routes/wallet');
const adminRoutes    = require('./routes/admin');
const kycRoutes      = require('./routes/kyc');
const earnRoutes     = require('./routes/earn');
const p2pRoutes      = require('./routes/p2p');
const notifRoutes    = require('./routes/notifications');

const { errorHandler } = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);

// ─── Security & Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..')));

// ─── API Routes ───────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/markets',       marketRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/kyc',           kycRoutes);
app.use('/api/earn',          earnRoutes);
app.use('/api/p2p',           p2pRoutes);
app.use('/api/notifications', notifRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// Serve frontend
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

// Error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initDB();
    logger.info('✅ Database connected');

    const io = initSocket(server);
    initPriceFeed(io);
    startCronJobs();

    server.listen(PORT, () => {
      logger.info(`🚀 CryptoX Server running on http://localhost:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
