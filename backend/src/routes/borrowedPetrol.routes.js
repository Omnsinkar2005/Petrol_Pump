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

// Create / update / payment — manager/admin only (owner view-only)
router.post('/', requireRole('admin', 'manager'), ctrl.create);
router.put('/:id', requireRole('admin', 'manager'), ctrl.update);
router.post('/:id/payment', requireRole('admin', 'manager'), ctrl.addPayment);

module.exports = router;
