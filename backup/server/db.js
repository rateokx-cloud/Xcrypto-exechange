// ============================================
// DATABASE SETUP - SQLite via better-sqlite3
// ============================================
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'cryptox.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============ CREATE TABLES ============
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    phone       TEXT,
    password    TEXT NOT NULL,
    role        TEXT DEFAULT 'user',
    status      TEXT DEFAULT 'active',
    kyc_level   INTEGER DEFAULT 0,
    kyc_status  TEXT DEFAULT 'unverified',
    totp_secret TEXT,
    totp_enabled INTEGER DEFAULT 0,
    anti_phish  TEXT,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    vip_level   INTEGER DEFAULT 0,
    created_at  INTEGER NOT NULL,
    last_login  INTEGER,
    last_ip     TEXT,
    avatar      TEXT
  );

  CREATE TABLE IF NOT EXISTS balances (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  TEXT NOT NULL,
    coin     TEXT NOT NULL,
    available REAL DEFAULT 0,
    in_order  REAL DEFAULT 0,
    UNIQUE(user_id, coin),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    pair       TEXT NOT NULL,
    side       TEXT NOT NULL,
    type       TEXT NOT NULL,
    price      REAL,
    amount     REAL NOT NULL,
    filled     REAL DEFAULT 0,
    total      REAL,
    fee        REAL DEFAULT 0,
    status     TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trades (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    pair       TEXT NOT NULL,
    side       TEXT NOT NULL,
    price      REAL NOT NULL,
    amount     REAL NOT NULL,
    fee        REAL NOT NULL,
    fee_coin   TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    coin          TEXT NOT NULL,
    network       TEXT NOT NULL,
    amount        REAL NOT NULL,
    address       TEXT NOT NULL,
    txid          TEXT,
    confirmations INTEGER DEFAULT 0,
    required_conf INTEGER DEFAULT 3,
    status        TEXT DEFAULT 'pending',
    created_at    INTEGER NOT NULL,
    confirmed_at  INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    coin        TEXT NOT NULL,
    network     TEXT NOT NULL,
    amount      REAL NOT NULL,
    fee         REAL NOT NULL,
    address     TEXT NOT NULL,
    txid        TEXT,
    status      TEXT DEFAULT 'pending',
    admin_note  TEXT,
    created_at  INTEGER NOT NULL,
    processed_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS markets (
    id           TEXT PRIMARY KEY,
    base         TEXT NOT NULL,
    quote        TEXT NOT NULL,
    pair         TEXT UNIQUE NOT NULL,
    maker_fee    REAL DEFAULT 0.001,
    taker_fee    REAL DEFAULT 0.001,
    min_order    REAL DEFAULT 10,
    price_prec   INTEGER DEFAULT 2,
    amount_prec  INTEGER DEFAULT 6,
    status       TEXT DEFAULT 'active',
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pair      TEXT NOT NULL,
    open      REAL NOT NULL,
    high      REAL NOT NULL,
    low       REAL NOT NULL,
    close     REAL NOT NULL,
    volume    REAL NOT NULL,
    interval  TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    type         TEXT DEFAULT 'info',
    target       TEXT DEFAULT 'all',
    is_active    INTEGER DEFAULT 1,
    created_by   TEXT,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kyc_submissions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    level        INTEGER NOT NULL,
    doc_type     TEXT NOT NULL,
    doc_front    TEXT,
    doc_back     TEXT,
    selfie       TEXT,
    country      TEXT,
    status       TEXT DEFAULT 'pending',
    reviewer_id  TEXT,
    reject_reason TEXT,
    submitted_at INTEGER NOT NULL,
    reviewed_at  INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    label       TEXT NOT NULL,
    key_hash    TEXT NOT NULL,
    permissions TEXT DEFAULT 'read',
    ip_whitelist TEXT,
    status      TEXT DEFAULT 'active',
    last_used   INTEGER,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id  TEXT NOT NULL,
    referee_id   TEXT NOT NULL,
    commission   REAL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    FOREIGN KEY(referrer_id) REFERENCES users(id),
    FOREIGN KEY(referee_id)  REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT,
    action     TEXT NOT NULL,
    details    TEXT,
    ip         TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    token      TEXT NOT NULL,
    ip         TEXT,
    user_agent TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_pair    ON orders(pair);
  CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_trades_user    ON trades(user_id);
  CREATE INDEX IF NOT EXISTS idx_balances_user  ON balances(user_id);
  CREATE INDEX IF NOT EXISTS idx_notif_user     ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_price_pair     ON price_history(pair, timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs(user_id);
`);

module.exports = db;
