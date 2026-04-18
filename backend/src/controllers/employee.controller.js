const service = require('../services/employee.service');

/**
 * GET /api/employees?status=active
 */
async function list(req, res, next) {
  try {
    const employees = await service.listEmployees({ status: req.query.status });
    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/employees/:id
 * Employees can view only themselves; admin/owner/manager can view anyone.
 */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    if (req.user.role === 'employee' && req.user.employee_id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Employees can only access their own profile',
      });
    }

    const employee = await service.getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, employee });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/employees
 * Body: { name, phone_number, email_id, role, salary,
 *         createUser?, username?, password? }
 */
async function create(req, res, next) {
  try {
    const { name, phone_number, role } = req.body || {};
    if (!name || !phone_number || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, phone_number, and role are required',
      });
    }
    const result = await service.createEmployee(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry — phone number, email, or username already exists',
      });
    }
    next(err);
  }
}

/**
 * PUT /api/employees/:id
 */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const employee = await service.updateEmployee(id, req.body);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, employee });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry — phone number or email already exists',
      });
    }
    next(err);
  }
}

/**
 * DELETE /api/employees/:id  (soft delete — sets status='deactivated')
 */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const ok = await service.deactivateEmployee(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, message: 'Employee deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
