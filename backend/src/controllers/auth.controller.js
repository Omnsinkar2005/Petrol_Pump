const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required',
      });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.password, u.role, u.employee_id, u.is_active,
              e.name AS employee_name
         FROM Users u
    LEFT JOIN Employees e ON e.id = u.employee_id
        WHERE u.username = ?
        LIMIT 1`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Contact your administrator.',
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Fire-and-forget: update last_login (don't block the response)
    pool
      .query('UPDATE Users SET last_login = NOW() WHERE id = ?', [user.id])
      .catch((err) => console.error('Failed to update last_login:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id,
        name: user.employee_name || user.username,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently-authenticated user.
 * Useful for the frontend to hydrate state after a refresh.
 */
async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.role, u.employee_id, u.is_active, u.last_login,
              e.name AS employee_name, e.email_id, e.phone_number, e.salary
         FROM Users u
    LEFT JOIN Employees e ON e.id = u.employee_id
        WHERE u.id = ?
        LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * With stateless JWTs there's nothing to invalidate server-side (unless we
 * add a denylist later). Client should just discard the token.
 * This endpoint exists so the frontend has a clean flow.
 */
async function logout(req, res) {
  return res.json({ success: true, message: 'Logged out' });
}

module.exports = { login, me, logout };
