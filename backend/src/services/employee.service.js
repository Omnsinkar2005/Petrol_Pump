const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * Employee service — all DB access for employees lives here.
 * Controllers call these functions; they should not write SQL directly.
 */

async function listEmployees({ status } = {}) {
  const params = [];
  let where = '';
  if (status) {
    where = 'WHERE status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(
    `SELECT id, name, phone_number, email_id, role, salary, status, joined_on,
            created_at, updated_at
       FROM Employees
       ${where}
       ORDER BY id DESC`,
    params
  );
  return rows;
}

async function getEmployeeById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, phone_number, email_id, role, salary, status, joined_on,
            created_at, updated_at
       FROM Employees
       WHERE id = ?
       LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Create a new employee. Optionally create a matching login account.
 * If `createUser` is true, a Users row is created with role='employee'
 * and the provided username/password.
 */
async function createEmployee(data) {
  const {
    name,
    phone_number,
    email_id = null,
    role,
    salary = 0,
    status = 'active',
    // optional user account
    createUser = false,
    username = null,
    password = null,
  } = data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [empResult] = await conn.query(
      `INSERT INTO Employees (name, phone_number, email_id, role, salary, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone_number, email_id, role, salary, status]
    );

    const employeeId = empResult.insertId;
    let userId = null;

    if (createUser) {
      if (!username || !password) {
        throw Object.assign(
          new Error('username and password required when createUser=true'),
          { status: 400 }
        );
      }
      const hash = await bcrypt.hash(password, 10);
      const [userResult] = await conn.query(
        `INSERT INTO Users (username, password, role, employee_id)
         VALUES (?, ?, 'employee', ?)`,
        [username, hash, employeeId]
      );
      userId = userResult.insertId;
    }

    await conn.commit();
    const employee = await getEmployeeById(employeeId);
    return { employee, userId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Update only the provided fields.
 */
async function updateEmployee(id, data) {
  const allowed = ['name', 'phone_number', 'email_id', 'role', 'salary', 'status'];
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    values.push(id);
    const [result] = await conn.query(
      `UPDATE Employees SET ${sets.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return null;
    }

    if (data.status !== undefined) {
      await conn.query(
        `UPDATE Users
            SET is_active = ?
          WHERE employee_id = ?`,
        [data.status !== 'deactivated', id]
      );
    }

    await conn.commit();
    return getEmployeeById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Soft delete — mark employee as deactivated.
 * Hard delete would cascade and wipe attendance/salary history.
 */
async function deactivateEmployee(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE Employees SET status = 'deactivated' WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return false;
    }

    await conn.query(
      `UPDATE Users SET is_active = FALSE WHERE employee_id = ?`,
      [id]
    );

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
};
