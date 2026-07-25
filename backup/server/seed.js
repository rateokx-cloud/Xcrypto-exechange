// ============================================
// DATABASE SEEDER - Initial Data
// ============================================
const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seed() {
  const now = Date.now();

  // ---- MARKETS ----
  const markets = [
    ['BTC','USDT','BTC/USDT',0.001,0.001,10,2,6],
    ['ETH','USDT','ETH/USDT',0.001,0.001,10,2,6],
    ['BNB','USDT','BNB/USDT',0.001,0.001,5,2,4],
    ['SOL','USDT','SOL/USDT',0.001,0.001,5,3,4],
    ['XRP','USDT','XRP/USDT',0.001,0.001,5,4,0],
    ['ADA','USDT','ADA/USDT',0.001,0.001,5,4,0],
    ['DOGE','USDT','DOGE/USDT',0.001,0.001,5,5,0],
    ['AVAX','USDT','AVAX/USDT',0.001,0.001,5,3,4],
    ['DOT','USDT','DOT/USDT',0.001,0.001,5,3,4],
    ['MATIC','USDT','MATIC/USDT',0.001,0.001,5,4,4],
    ['LINK','USDT','LINK/USDT',0.001,0.001,5,3,4],
    ['LTC','USDT','LTC/USDT',0.001,0.001,5,2,6],
    ['NEAR','USDT','NEAR/USDT',0.001,0.001,5,3,4],
    ['ARB','USDT','ARB/USDT',0.001,0.001,5,4,4],
    ['TRX','USDT','TRX/USDT',0.001,0.001,5,5,0],
    ['ETH','BTC','ETH/BTC',0.001,0.001,0.0001,6,6],
    ['BNB','BTC','BNB/BTC',0.001,0.001,0.0001,6,6],
    ['SOL','BTC','SOL/BTC',0.001,0.001,0.0001,6,6],
    ['ETH','BNB','ETH/BNB',0.001,0.001,0.01,4,6],
  ];

  const insertMarket = db.prepare(`
    INSERT OR IGNORE INTO markets (id,base,quote,pair,maker_fee,taker_fee,min_order,price_prec,amount_prec,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'active',?)
  `);
  markets.forEach(m => insertMarket.run(m[2], m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], now));

  // ---- ADMIN USER ----
  const adminExists = db.prepare('SELECT id FROM users WHERE email=?').get('admin@cryptox.io');
  if (!adminExists) {
    const adminId = 'UID' + now;
    const hash    = bcrypt.hashSync('Admin@123456', 12);
    const refCode = 'ADMIN01';
    db.prepare(`
      INSERT INTO users (id,name,email,password,role,status,kyc_level,kyc_status,referral_code,created_at)
      VALUES (?,?,?,?,'admin','active',3,'verified',?,?)
    `).run(adminId, 'Admin CryptoX', 'admin@cryptox.io', hash, refCode, now);

    // Admin balances
    const coins = ['USDT','BTC','ETH','BNB','SOL'];
    const amounts = [1000000, 10, 50, 100, 500];
    const insertBal = db.prepare('INSERT OR IGNORE INTO balances (user_id,coin,available,in_order) VALUES (?,?,?,0)');
    coins.forEach((c,i) => insertBal.run(adminId, c, amounts[i]));
    console.log('✅ Admin user created: admin@cryptox.io / Admin@123456');
  }

  // ---- DEMO USER ----
  const demoExists = db.prepare('SELECT id FROM users WHERE email=?').get('demo@cryptox.io');
  if (!demoExists) {
    const demoId = 'UID' + (now + 1);
    const hash   = bcrypt.hashSync('Demo@123456', 12);
    db.prepare(`
      INSERT INTO users (id,name,email,password,role,status,kyc_level,kyc_status,referral_code,created_at)
      VALUES (?,?,?,?,'user','active',1,'unverified',?,?)
    `).run(demoId, 'Demo User', 'demo@cryptox.io', hash, 'DEMO01', now);

    const coins   = ['USDT','BTC','ETH','BNB','SOL','XRP','ADA','DOGE'];
    const amounts = [10000, 0.05, 1.5, 5, 10, 500, 1000, 5000];
    const insertBal = db.prepare('INSERT OR IGNORE INTO balances (user_id,coin,available,in_order) VALUES (?,?,?,0)');
    coins.forEach((c,i) => insertBal.run(demoId, c, amounts[i]));
    console.log('✅ Demo user created: demo@cryptox.io / Demo@123456');
  }

  // ---- ANNOUNCEMENTS ----
  const annCount = db.prepare('SELECT COUNT(*) as c FROM announcements').get().c;
  if (annCount === 0) {
    const anns = [
      ['New Listing: NEAR Protocol','We are excited to announce the listing of NEAR Protocol (NEAR) on CryptoX Exchange!','listing','all'],
      ['System Maintenance Notice','Scheduled maintenance on June 20, 2026 from 02:00-04:00 UTC.','maintenance','all'],
      ['Zero Fee Trading Weekend','Enjoy zero maker fees this weekend for all USDT spot pairs!','promotion','all'],
    ];
    const insertAnn = db.prepare('INSERT INTO announcements (title,content,type,target,is_active,created_at) VALUES (?,?,?,?,1,?)');
    anns.forEach(a => insertAnn.run(...a, now));
    console.log('✅ Announcements seeded');
  }

  console.log('✅ Database seeded successfully');
}

module.exports = { seed };
