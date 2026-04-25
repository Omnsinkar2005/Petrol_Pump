const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/borrowedPetrol.controller');

const router = express.Router();
router.use(requireAuth);

// Employees do not access this module
router.use(requireRole('admin', 'owner', 'manager'));

// /pending must come BEFORE /:id or it matches as an id
router.get('/pending', ctrl.pending);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

// Create / update / payment — admin, manager, and owner
router.post('/', requireRole('admin', 'manager', 'owner'), ctrl.create);
router.put('/:id', requireRole('admin', 'manager', 'owner'), ctrl.update);
router.post('/:id/payment', requireRole('admin', 'manager', 'owner'), ctrl.addPayment);

module.exports = router;
