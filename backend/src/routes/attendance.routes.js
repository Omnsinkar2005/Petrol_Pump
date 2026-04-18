const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/attendance.controller');

const router = express.Router();
router.use(requireAuth);

// Any authenticated user can check in / out — controller enforces who they can act for
router.post('/checkin', ctrl.checkin);
router.post('/checkout', ctrl.checkout);

// Current-user convenience
router.get('/me', ctrl.todayMe);

// Full "today" view — staff only
router.get('/today', requireRole('admin', 'owner', 'manager'), ctrl.today);

// History — employees only for self; controller enforces
router.get('/employee/:id', ctrl.history);

module.exports = router;
