const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/alert.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);

// Manual cron trigger — restricted to admin/owner
router.post('/run-scan', requireRole('admin', 'owner'), ctrl.runScanNow);

module.exports = router;
