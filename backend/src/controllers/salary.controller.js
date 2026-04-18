const service = require('../services/salary.service');

/** GET /api/salary/employee/:employeeId */
async function byEmployee(req, res, next) {
  try {
    const id = Number(req.params.employeeId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid employeeId' });
    }
    if (req.user.role === 'employee' && req.user.employee_id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Employees can only view their own salary',
      });
    }
    const rows = await service.getSalariesByEmployee(id);
    res.json({ success: true, count: rows.length, salaries: rows });
  } catch (err) {
    next(err);
  }
}

/** GET /api/salary/month/:month   (YYYY-MM) */
async function byMonth(req, res, next) {
  try {
    const { month } = req.params;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Month must be YYYY-MM' });
    }
    const rows = await service.getAllSalariesForMonth(month);
    res.json({ success: true, count: rows.length, month, salaries: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/salary/generate
 * Body: { month?: "YYYY-MM", employee_id?: number }
 *   - no body      → generate for all active employees, current month
 *   - month only   → all active employees for that month
 *   - employee_id  → single employee (month optional, defaults to current)
 */
async function generate(req, res, next) {
  try {
    const month = req.body.month || service.currentMonth();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Month must be YYYY-MM' });
    }

    if (req.body.employee_id) {
      const id = Number(req.body.employee_id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid employee_id' });
      }
      const salary = await service.generateSalaryForEmployee(id, month);
      return res.status(201).json({ success: true, salary });
    }

    const results = await service.generateSalariesForMonth(month);
    res.status(201).json({ success: true, month, count: results.length, salaries: results });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/salary/:id/status   Body: { status: "approved" | "paid" } */
async function updateStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const updated = await service.setSalaryStatus(id, req.body.status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Salary not found' });
    }
    res.json({ success: true, salary: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { byEmployee, byMonth, generate, updateStatus };
