const { pool } = require('../config/db');

/**
 * Attendance service — daily check-in/out and history queries.
 *
 * Business rules:
 *  - One row per (employee_id, date).
 *  - Checkout computes working_hours = (check_out - check_in) in hours.
 *  - Status: >= 8h → 'present', >= 4h → 'half_day', else 'half_day' (still counted).
 */

const FULL_DAY_HOURS = 8;
const HALF_DAY_HOURS = 4;

function classify(hours) {
  if (hours >= FULL_DAY_HOURS) return 'present';
  if (hours >= HALF_DAY_HOURS) return 'half_day';
  return 'half_day';
}

async function getTodayForEmployee(employeeId) {
  const [rows] = await pool.query(
    `SELECT * FROM Attendance
      WHERE employee_id = ? AND date = CURDATE()
      LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
}

async function checkIn(employeeId) {
  const existing = await getTodayForEmployee(employeeId);
  if (existing) {
    throw Object.assign(
      new Error('Already checked in today'),
      { status: 409, code: 'ALREADY_CHECKED_IN' }
    );
  }

  const [result] = await pool.query(
    `INSERT INTO Attendance (employee_id, date, check_in, status)
     VALUES (?, CURDATE(), NOW(), 'present')`,
    [employeeId]
  );

  const [rows] = await pool.query(
    `SELECT * FROM Attendance WHERE id = ? LIMIT 1`,
    [result.insertId]
  );
  return rows[0];
}

async function checkOut(employeeId) {
  const existing = await getTodayForEmployee(employeeId);
  if (!existing) {
    throw Object.assign(
      new Error('No check-in recorded for today'),
      { status: 400, code: 'NO_CHECKIN' }
    );
  }
  if (existing.check_out) {
    throw Object.assign(
      new Error('Already checked out today'),
      { status: 409, code: 'ALREADY_CHECKED_OUT' }
    );
  }

  // Compute working_hours in the DB for consistent timezone handling
  const [result] = await pool.query(
    `UPDATE Attendance
        SET check_out     = NOW(),
            working_hours = ROUND(TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600, 2),
            status        = CASE
              WHEN TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600 >= ? THEN 'present'
              ELSE 'half_day'
            END
      WHERE id = ?`,
    [FULL_DAY_HOURS, existing.id]
  );

  if (result.affectedRows === 0) {
    throw Object.assign(new Error('Failed to record checkout'), { status: 500 });
  }

  const [rows] = await pool.query(
    `SELECT * FROM Attendance WHERE id = ? LIMIT 1`,
    [existing.id]
  );
  return rows[0];
}

async function getHistoryByEmployee(employeeId, { month } = {}) {
  const params = [employeeId];
  let where = 'WHERE employee_id = ?';
  if (month) {
    // month format: YYYY-MM
    where += " AND DATE_FORMAT(date, '%Y-%m') = ?";
    params.push(month);
  }
  const [rows] = await pool.query(
    `SELECT id, employee_id, date, check_in, check_out, working_hours, status, notes
       FROM Attendance
       ${where}
       ORDER BY date DESC`,
    params
  );
  return rows;
}

async function getTodayAll() {
  const [rows] = await pool.query(
    `SELECT a.id, a.employee_id, e.name AS employee_name,
            a.date, a.check_in, a.check_out, a.working_hours, a.status
       FROM Attendance a
       JOIN Employees e ON e.id = a.employee_id
      WHERE a.date = CURDATE()
      ORDER BY a.check_in DESC`
  );
  return rows;
}

module.exports = {
  checkIn,
  checkOut,
  getTodayForEmployee,
  getHistoryByEmployee,
  getTodayAll,
};
