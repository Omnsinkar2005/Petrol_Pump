const { pool } = require('../config/db');

/**
 * Salary service.
 *
 * Calculation rule (simple and auditable):
 *   total_days    = count(present) + 0.5 * count(half_day)
 *   total_hours   = sum(working_hours)
 *   amount        = base_salary * (total_days / WORKING_DAYS_PER_MONTH)
 *
 * WORKING_DAYS_PER_MONTH is a business constant — adjust if needed.
 */

const WORKING_DAYS_PER_MONTH = 26;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getSalariesByEmployee(employeeId) {
  const [rows] = await pool.query(
    `SELECT id, employee_id, month, amount, total_hours, total_days, status,
            generated_at, paid_at, notes
       FROM Salaries
      WHERE employee_id = ?
      ORDER BY month DESC`,
    [employeeId]
  );
  return rows;
}

async function getSalaryForMonth(employeeId, month) {
  const [rows] = await pool.query(
    `SELECT * FROM Salaries WHERE employee_id = ? AND month = ? LIMIT 1`,
    [employeeId, month]
  );
  return rows[0] || null;
}

async function getAllSalariesForMonth(month) {
  const [rows] = await pool.query(
    `SELECT s.*, e.name AS employee_name, e.role AS employee_role
       FROM Salaries s
       JOIN Employees e ON e.id = s.employee_id
      WHERE s.month = ?
      ORDER BY e.name ASC`,
    [month]
  );
  return rows;
}

/**
 * Generate (or regenerate) salary for one employee for a given month.
 * If a row exists and is already 'paid', it is NOT overwritten.
 */
async function generateSalaryForEmployee(employeeId, month) {
  const [empRows] = await pool.query(
    `SELECT id, name, salary, status FROM Employees WHERE id = ? LIMIT 1`,
    [employeeId]
  );
  if (empRows.length === 0) {
    throw Object.assign(new Error('Employee not found'), { status: 404 });
  }
  const employee = empRows[0];

  // Aggregate attendance for this month
  const [aggRows] = await pool.query(
    `SELECT
        COALESCE(SUM(working_hours), 0) AS total_hours,
        SUM(CASE WHEN status = 'present'  THEN 1   ELSE 0 END) +
        SUM(CASE WHEN status = 'half_day' THEN 0.5 ELSE 0 END) AS total_days
       FROM Attendance
      WHERE employee_id = ?
        AND DATE_FORMAT(date, '%Y-%m') = ?`,
    [employeeId, month]
  );
  const totalHours = Number(aggRows[0].total_hours) || 0;
  const totalDays = Number(aggRows[0].total_days) || 0;

  const baseSalary = Number(employee.salary) || 0;
  const amount = Number(
    ((baseSalary * totalDays) / WORKING_DAYS_PER_MONTH).toFixed(2)
  );

  // Don't overwrite paid salaries
  const existing = await getSalaryForMonth(employeeId, month);
  if (existing && existing.status === 'paid') {
    return { ...existing, skipped: 'already paid' };
  }

  if (existing) {
    await pool.query(
      `UPDATE Salaries
          SET amount = ?, total_hours = ?, total_days = ?,
              status = 'pending', generated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [amount, totalHours, totalDays, existing.id]
    );
    return getSalaryForMonth(employeeId, month);
  }

  await pool.query(
    `INSERT INTO Salaries (employee_id, month, amount, total_hours, total_days, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [employeeId, month, amount, totalHours, totalDays]
  );
  return getSalaryForMonth(employeeId, month);
}

/**
 * Generate salaries for ALL active employees for a given month.
 */
async function generateSalariesForMonth(month) {
  const [emps] = await pool.query(
    `SELECT id FROM Employees WHERE status = 'active'`
  );
  const results = [];
  for (const e of emps) {
    const sal = await generateSalaryForEmployee(e.id, month);
    results.push(sal);
  }
  return results;
}

async function setSalaryStatus(salaryId, newStatus) {
  const allowed = ['pending', 'approved', 'paid'];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(new Error('Invalid status'), { status: 400 });
  }

  const paidAtClause = newStatus === 'paid' ? ', paid_at = NOW()' : '';
  const [result] = await pool.query(
    `UPDATE Salaries SET status = ?${paidAtClause} WHERE id = ?`,
    [newStatus, salaryId]
  );
  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    `SELECT * FROM Salaries WHERE id = ? LIMIT 1`,
    [salaryId]
  );
  return rows[0];
}

module.exports = {
  currentMonth,
  getSalariesByEmployee,
  getSalaryForMonth,
  getAllSalariesForMonth,
  generateSalaryForEmployee,
  generateSalariesForMonth,
  setSalaryStatus,
};
