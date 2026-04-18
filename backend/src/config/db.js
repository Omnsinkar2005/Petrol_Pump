const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL connection pool.
 * A pool reuses connections instead of opening a new one per query,
 * which is what you want for any real Node.js backend.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Verify the pool can actually reach MySQL on startup.
 * Called once from server.js — fails fast if credentials/DB are wrong.
 */
async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    const [rows] = await conn.query('SELECT DATABASE() AS db, NOW() AS `time`');
    return rows[0];
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection };
