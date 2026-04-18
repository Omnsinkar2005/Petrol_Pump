const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * GET /api/health
 * Basic liveness + DB connectivity check.
 * Returns 200 with status info if DB is reachable, 503 otherwise.
 */
router.get('/', async (req, res) => {
  const payload = {
    success: true,
    service: 'petrol-pump-backend',
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db, NOW() AS `time`');
    payload.database = {
      connected: true,
      name: rows[0].db,
      server_time: rows[0].time,
    };
    res.status(200).json(payload);
  } catch (err) {
    payload.success = false;
    payload.database = { connected: false, error: err.message };
    res.status(503).json(payload);
  }
});

module.exports = router;
