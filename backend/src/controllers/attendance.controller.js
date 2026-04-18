const service = require('../services/attendance.service');

/**
 * Resolve which employee the action is for.
 *  - employees can only act on themselves
 *  - admin/manager can pass `employee_id` in the body to act on someone else
 */
function resolveEmployeeId(req) {
  if (req.user.role === 'employee') {
    if (!req.user.employee_id) {
      throw Object.assign(
        new Error('Your user account is not linked to any employee record'),
        { status: 400 }
      );
    }
    return req.user.employee_id;
  }
  const id = Number(req.body.employee_id || req.query.employee_id);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(
      new Error('employee_id is required in the request body'),
      { status: 400 }
    );
  }
  return id;
}

/** POST /api/attendance/checkin */
async function checkin(req, res, next) {
  try {
    const employeeId = resolveEmployeeId(req);
    const record = await service.checkIn(employeeId);
    res.status(201).json({ success: true, message: 'Checked in', attendance: record });
  } catch (err) {
    next(err);
  }
}

/** POST /api/attendance/checkout */
async function checkout(req, res, next) {
  try {
    const employeeId = resolveEmployeeId(req);
    const record = await service.checkOut(employeeId);
    res.json({ success: true, message: 'Checked out', attendance: record });
  } catch (err) {
    next(err);
  }
}

/** GET /api/attendance/today — admin/owner/manager see all */
async function today(req, res, next) {
  try {
    const rows = await service.getTodayAll();
    res.json({ success: true, count: rows.length, attendance: rows });
  } catch (err) {
    next(err);
  }
}

/** GET /api/attendance/me — employee sees their own today record */
async function todayMe(req, res, next) {
  try {
    if (!req.user.employee_id) {
      return res.json({ success: true, attendance: null });
    }
    const rec = await service.getTodayForEmployee(req.user.employee_id);
    res.json({ success: true, attendance: rec });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/employee/:id?month=YYYY-MM
 * Employees can only view their own history.
 */
async function history(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    if (req.user.role === 'employee' && req.user.employee_id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Employees can only view their own attendance',
      });
    }
    const rows = await service.getHistoryByEmployee(id, { month: req.query.month });
    res.json({ success: true, count: rows.length, attendance: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkin, checkout, today, todayMe, history };
