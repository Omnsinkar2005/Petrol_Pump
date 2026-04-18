const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/employee.controller');

const router = express.Router();

// All employee routes require authentication
router.use(requireAuth);

// List + view: admin, owner, manager can see all; employees use GET /:id for self
router.get('/', requireRole('admin', 'owner', 'manager'), ctrl.list);

// GET /:id — controller handles "self-access" for employees
router.get('/:id', ctrl.getOne);

// Create / update / delete: admin or manager only
router.post('/', requireRole('admin', 'manager'), ctrl.create);
router.put('/:id', requireRole('admin', 'manager'), ctrl.update);
router.delete('/:id', requireRole('admin', 'manager'), ctrl.remove);

module.exports = router;
