const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/salary.controller');

const router = express.Router();
router.use(requireAuth);

// Employees can view own salary (controller enforces self-only)
router.get('/employee/:employeeId', ctrl.byEmployee);

// Monthly report — staff only
router.get('/month/:month', requireRole('admin', 'owner', 'manager'), ctrl.byMonth);

// Generate salaries — manager/admin
router.post('/generate', requireRole('admin', 'manager'), ctrl.generate);

// Approve / mark paid — manager (approve), admin/owner (mark paid)
router.put('/:id/status', requireRole('admin', 'owner', 'manager'), ctrl.updateStatus);

module.exports = router;
