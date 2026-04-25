const { pool } = require('../config/db');
const { buildDeadlineSmsMessages } = require('../config/smsTemplates');
const { cleanPhone, getOwnerPhones, hasSmsConfig, sendSms } = require('./sms.service');

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Alerts service.
 *
 * The cron job (see src/jobs/alertJob.js) calls runDeadlineScan() daily.
 * The scan:
 *   1. Finds borrowed petrol records with deadline <= today+1 and not fully_paid
 *   2. Updates their status (alert_active / overdue)
 *   3. Creates or refreshes an owner Alert row for that record today
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

function startOfDay(dateLike) {
  const value = new Date(dateLike);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getBorrowedAlertDetails(record, now = new Date()) {
  const outstanding = Number(record.amount) - Number(record.paid_amount || 0);
  if (outstanding <= 0) return null;

  const today = startOfDay(now);
  const due = startOfDay(record.deadline);
  const diffDays = Math.round((due - today) / DAY_MS);

  if (diffDays < 0) {
    return {
      alertType: 'overdue',
      nextStatus: 'overdue',
      daysUntilDeadline: diffDays,
      message: `OVERDUE: ${record.borrower_name} owes Rs.${outstanding.toFixed(
        2
      )} - deadline was ${Math.abs(diffDays)} day(s) ago (${record.deadline}).`,
    };
  }

  if (diffDays <= 1) {
    return {
      alertType: 'deadline_approaching',
      nextStatus: 'alert_active',
      daysUntilDeadline: diffDays,
      message: `Deadline approaching: ${record.borrower_name} (Rs.${outstanding.toFixed(
        2
      )} remaining) is due ${diffDays === 0 ? 'today' : 'tomorrow'} (${record.deadline}).`,
    };
  }

  return null;
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
 * Create or refresh today's owner alert for a borrowed petrol record.
 * `executor` can be either the pool or a transaction connection.
 */
async function syncBorrowedAlert(executor, record) {
  const details = getBorrowedAlertDetails(record);
  if (!details) {
    return { created: false, updated: false, alertType: null };
  }

  const [rows] = await executor.query(
    `SELECT id
       FROM Alerts
      WHERE borrowed_petrol_id = ?
        AND alert_type = ?
        AND DATE(date) = CURDATE()
      LIMIT 1`,
    [record.id, details.alertType]
  );

  if (rows.length > 0) {
    await executor.query(
      `UPDATE Alerts
          SET message = ?, target_role = 'owner', date = NOW()
        WHERE id = ?`,
      [details.message, rows[0].id]
    );
    return { created: false, updated: true, alertType: details.alertType };
  }

  await executor.query(
    `INSERT INTO Alerts (message, alert_type, borrowed_petrol_id, target_role, date)
     VALUES (?, ?, ?, 'owner', NOW())`,
    [details.message, details.alertType, record.id]
  );

  return { created: true, updated: false, alertType: details.alertType };
}

async function sendDeadlineSmsNotifications(record, details) {
  if (!details || details.alertType !== 'deadline_approaching') {
    return { sent: 0, skipped: 'not_deadline_approaching' };
  }

  if (!hasSmsConfig()) {
    return { sent: 0, skipped: 'sms_not_configured' };
  }

  const messages = buildDeadlineSmsMessages(record, details);
  const deliveries = [];
  const ownerPhones = getOwnerPhones();

  for (const ownerPhone of ownerPhones) {
    deliveries.push({ to: ownerPhone, kind: 'owner', body: messages.owner });
  }

  const borrowerPhone = cleanPhone(record.borrower_phone_number);
  if (borrowerPhone) {
    deliveries.push({ to: borrowerPhone, kind: 'borrower', body: messages.borrower });
  }

  if (deliveries.length === 0) {
    return { sent: 0, skipped: 'no_recipients' };
  }

  let sent = 0;
  const errors = [];

  for (const delivery of deliveries) {
    try {
      await sendSms(delivery.to, delivery.body);
      sent++;
    } catch (err) {
      errors.push(`${delivery.kind}:${delivery.to}:${err.message}`);
      console.error(`[sms] Failed to send ${delivery.kind} SMS to ${delivery.to}: ${err.message}`);
    }
  }

  return {
    sent,
    skipped: sent > 0 ? null : 'all_failed',
    errors,
  };
}

/**
 * The core scan.
 * Returns a summary: { scanned, alertsCreated, statusChanges }.
 */
async function runDeadlineScan() {
  const [records] = await pool.query(
    `SELECT id, borrower_name, borrower_phone_number, amount, paid_amount, deadline, status
       FROM BorrowedPetrol
      WHERE status IN ('pending', 'alert_active', 'partially_paid', 'overdue')`
  );

  let alertsCreated = 0;
  let statusChanges = 0;
  let smsSent = 0;

  const today = startOfDay(new Date());

  for (const record of records) {
    const details = getBorrowedAlertDetails(record, today);
    if (!details) continue;

    if (details.nextStatus !== record.status) {
      await pool.query(
        `UPDATE BorrowedPetrol SET status = ? WHERE id = ?`,
        [details.nextStatus, record.id]
      );
      statusChanges++;
    }

    const synced = await syncBorrowedAlert(pool, record);
    if (synced.created) {
      alertsCreated++;
      const smsSummary = await sendDeadlineSmsNotifications(record, details);
      smsSent += smsSummary.sent || 0;
    }
  }

  return { scanned: records.length, alertsCreated, statusChanges, smsSent };
}

module.exports = {
  listForUser,
  markAsRead,
  markAllAsRead,
  alertExistsTodayForBorrowed,
  getBorrowedAlertDetails,
  runDeadlineScan,
  sendDeadlineSmsNotifications,
  syncBorrowedAlert,
};
