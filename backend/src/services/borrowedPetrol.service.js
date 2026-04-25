const { pool } = require('../config/db');
const { syncBorrowedAlert } = require('./alert.service');

/**
 * Borrowed Petrol service.
 *
 * Status transitions (matches the SRS state diagram):
 *   pending          -> fresh record, deadline far away
 *   alert_active     -> deadline within 1 day
 *   partially_paid   -> paid_amount > 0 but < amount
 *   overdue          -> deadline passed AND not fully paid
 *   fully_paid       -> paid_amount >= amount (terminal)
 */

function computeStatus({ amount, paid_amount, deadline, currentStatus }) {
  const amt = Number(amount);
  const paid = Number(paid_amount) || 0;

  if (paid >= amt) return 'fully_paid';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';

  if (paid > 0) return 'partially_paid';

  if (diffDays <= 1) return 'alert_active';

  if (currentStatus === 'alert_active') return 'alert_active';
  return 'pending';
}

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function list({ status } = {}) {
  const params = [];
  let where = '';
  if (status) {
    where = 'WHERE status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(
    `SELECT bp.*, u.username AS recorded_by_username
       FROM BorrowedPetrol bp
  LEFT JOIN Users u ON u.id = bp.recorded_by
       ${where}
       ORDER BY deadline ASC, bp.id DESC`,
    params
  );
  return rows;
}

async function listPending() {
  const [rows] = await pool.query(
    `SELECT bp.*, u.username AS recorded_by_username
       FROM BorrowedPetrol bp
  LEFT JOIN Users u ON u.id = bp.recorded_by
      WHERE bp.status IN ('pending', 'alert_active', 'partially_paid', 'overdue')
      ORDER BY bp.deadline ASC`
  );
  return rows;
}

async function getById(id, executor = pool) {
  const [rows] = await executor.query(
    `SELECT * FROM BorrowedPetrol WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data, recordedByUserId) {
  const {
    borrower_name,
    borrower_email = null,
    borrower_phone_number,
    quantity,
    amount,
    borrow_date = null,
    deadline,
    notes = null,
  } = data;

  if (!borrower_name || !borrower_phone_number || !quantity || !amount || !deadline) {
    throw Object.assign(
      new Error(
        'borrower_name, borrower_phone_number, quantity, amount, and deadline are required'
      ),
      { status: 400 }
    );
  }

  const initialStatus = computeStatus({
    amount,
    paid_amount: 0,
    deadline,
  });

  return withTransaction(async (conn) => {
    let sql;
    let params;

    if (borrow_date) {
      sql = `INSERT INTO BorrowedPetrol
               (borrower_name, borrower_email, borrower_phone_number,
                quantity, amount, borrow_date, deadline, status, recorded_by, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      params = [
        borrower_name,
        borrower_email,
        borrower_phone_number,
        quantity,
        amount,
        borrow_date,
        deadline,
        initialStatus,
        recordedByUserId,
        notes,
      ];
    } else {
      sql = `INSERT INTO BorrowedPetrol
               (borrower_name, borrower_email, borrower_phone_number,
                quantity, amount, deadline, status, recorded_by, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      params = [
        borrower_name,
        borrower_email,
        borrower_phone_number,
        quantity,
        amount,
        deadline,
        initialStatus,
        recordedByUserId,
        notes,
      ];
    }

    const [result] = await conn.query(sql, params);
    const record = await getById(result.insertId, conn);
    await syncBorrowedAlert(conn, record);
    return record;
  });
}

/**
 * Record a payment. Updates paid_amount and recalculates status.
 */
async function addPayment(id, paymentAmount) {
  const payment = Number(paymentAmount);
  if (!Number.isFinite(payment) || payment <= 0) {
    throw Object.assign(new Error('payment must be a positive number'), { status: 400 });
  }

  return withTransaction(async (conn) => {
    const record = await getById(id, conn);
    if (!record) return null;
    if (record.status === 'fully_paid') {
      throw Object.assign(new Error('This record is already fully paid'), { status: 409 });
    }

    const newPaid = Number(record.paid_amount) + payment;
    const cappedPaid = Math.min(newPaid, Number(record.amount));
    const newStatus = computeStatus({
      amount: record.amount,
      paid_amount: cappedPaid,
      deadline: record.deadline,
      currentStatus: record.status,
    });

    await conn.query(
      `UPDATE BorrowedPetrol SET paid_amount = ?, status = ? WHERE id = ?`,
      [cappedPaid, newStatus, id]
    );

    const updated = await getById(id, conn);
    await syncBorrowedAlert(conn, updated);
    return updated;
  });
}

/**
 * Generic update - lets manager edit fields like deadline, notes, etc.
 */
async function update(id, data) {
  const allowed = [
    'borrower_name',
    'borrower_email',
    'borrower_phone_number',
    'quantity',
    'amount',
    'deadline',
    'notes',
  ];

  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (sets.length === 0) {
    throw Object.assign(new Error('No valid fields to update'), { status: 400 });
  }

  return withTransaction(async (conn) => {
    values.push(id);
    const [result] = await conn.query(
      `UPDATE BorrowedPetrol SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return null;

    let record = await getById(id, conn);
    const newStatus = computeStatus({
      amount: record.amount,
      paid_amount: record.paid_amount,
      deadline: record.deadline,
      currentStatus: record.status,
    });

    if (newStatus !== record.status) {
      await conn.query(`UPDATE BorrowedPetrol SET status = ? WHERE id = ?`, [newStatus, id]);
      record = await getById(id, conn);
    }

    await syncBorrowedAlert(conn, record);
    return record;
  });
}

module.exports = {
  list,
  listPending,
  getById,
  create,
  update,
  addPayment,
  computeStatus,
};
