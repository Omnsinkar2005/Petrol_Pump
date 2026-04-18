/**
 * One-time dev helper: resets every user's password to 'password123'.
 * Run:   node scripts/setDevPasswords.js
 *
 * NEVER run this in production.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const NEW_PASSWORD = 'password123';

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  console.log(`Generated fresh bcrypt hash for "${NEW_PASSWORD}"`);

  const [result] = await pool.query('UPDATE Users SET password = ?', [hash]);
  console.log(`✓ Updated ${result.affectedRows} user(s).`);

  // Quick verify on one user
  const [rows] = await pool.query(
    "SELECT username, password FROM Users WHERE username = 'admin' LIMIT 1"
  );
  if (rows.length) {
    const ok = await bcrypt.compare(NEW_PASSWORD, rows[0].password);
    console.log(`✓ Verification for "admin": ${ok ? 'PASS' : 'FAIL'}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
