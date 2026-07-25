const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

async function initDB() {
  pool = mysql.createPool({
    host:            process.env.DB_HOST     || 'localhost',
    port:            process.env.DB_PORT     || 3306,
    user:            process.env.DB_USER     || 'root',
    password:        process.env.DB_PASSWORD || '',
    database:        process.env.DB_NAME     || 'cryptox_db',
    waitForConnections: true,
    connectionLimit:    20,
    queueLimit:         0,
    timezone:           'Z',
    charset:            'utf8mb4',
  });
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  return pool;
}

function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function transaction(callback) {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { initDB, getPool, query, queryOne, transaction };
