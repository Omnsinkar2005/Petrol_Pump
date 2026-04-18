const { pool } = require('../config/db');

/**
 * Alerts service.
 *
 * The cron job (see src/jobs/alertJob.js) calls runDeadlineScan() daily.
 * The scan:
 *   1. Finds borrowed petrol records with deadline <= today+1 and not fully_paid
 *   2. Updates their status (alert_active / overdue)
 *   3. Creates an Alert row if none exists for that record today
 */

async function listForUser(user, { unread } = {}) {
  const params = [];
  const clauses = [];

  // Employees see only their-role alerts; 'all' is visible to everyone
  clauses.push(`(target_role = 'all' OR target_role = ?)`);
  params.push(user.role);

  if (unread === true || unread === 'true') {
    clauses.push('is_read = FALSE');
  }

  const [rows] = await pool.query(
    `SELECT a.*, bp.borrower_name, bp.amount AS borrowed_amount, bp.deadline
       FROM Alerts a
  LEFT JOIN BorrowedPetrol bp ON bp.id = a.borrowed_petrol_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY a.date DESC, a.id DESC
      LIMIT 200`,
    params
  );
  return rows;
}

async function markAsRead(id) {
  const [result] = await pool.query(
    `UPDATE Alerts SET is_read = TRUE WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

async function markAllAsRead(role) {
  const [result] = await pool.query(
    `UPDATE Alerts SET is_read = TRUE
      WHERE is_read = FALSE AND (target_role = 'all' OR target_role = ?)`,
    [role]
  );
  return result.affectedRows;
}

/**
 * Check whether an alert for a borrowed record was already created today.
 * Prevents the daily cron from spamming duplicates on repeat runs.
 */
async function alertExistsTodayForBorrowed(borrowedId, alertType) {
  const [rows] = await pool.query(
    `SELECT id FROM Alerts
      WHERE borrowed_petrol_id = ?
        AND alert_type = ?
        AND DATE(date) = CURDATE()
      LIMIT 1`,
    [borrowedId, alertType]
  );
  return rows.length > 0;
}

/**
 * The core scan.
 * Returns a summary: { scanned, alertsCreated, statusChanges }.
 */
async function runDeadlineScan() {
  const [records] = await pool.query(
    `SELECT id, borrower_name, amount, paid_amount, deadline, status
       FROM BorrowedPetrol
      WHERE status IN ('pending', 'alert_active', 'partially_paid', 'overdue')`
  );

  let alertsCreated = 0;
  let statusChanges = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const r of records) {
    const due = new Date(r.deadline);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    const outstanding = Number(r.amount) - Number(r.paid_amount);
    if (outstanding <= 0) continue;

    let newStatus = r.status;
    let alertType = null;
    let message = null;

    if (diffDays < 0) {
      newStatus = 'overdue';
      alertType = 'overdue';
      message = `OVERDUE: ${r.borrower_name} owes Rs.${outstanding.toFixed(
        2
      )} — deadline was ${Math.abs(diffDays)} day(s) ago (${r.deadline}).`;
    } else if (diffDays <= 1) {
      newStatus = 'alert_active';
      alertType = 'deadline_approaching';
      const when = diffDays === 0 ? 'today' : 'tomorrow';
      message = `Deadline approaching: ${r.borrower_name} (Rs.${outstanding.toFixed(
        2
      )} remaining) is due ${when} (${r.deadline}).`;
    }

    // Update status if it changed
    if (newStatus !== r.status) {
      await pool.query(
        `UPDATE BorrowedPetrol SET status = ? WHERE id = ?`,
        [newStatus, r.id]
      );
      statusChanges++;
    }

    // Create alert if needed and not already created today
    if (alertType) {
      const already = await alertExistsTodayForBorrowed(r.id, alertType);
      if (!already) {
        await pool.query(
          `INSERT INTO Alerts (message, alert_type, borrowed_petrol_id, target_role, date)
           VALUES (?, ?, ?, 'owner', NOW())`,
          [message, alertType, r.id]
        );
        alertsCreated++;
      }
    }
  }

  return { scanned: records.length, alertsCreated, statusChanges };
}

module.exports = {
  listForUser,
  markAsRead,
  markAllAsRead,
  runDeadlineScan,
};
