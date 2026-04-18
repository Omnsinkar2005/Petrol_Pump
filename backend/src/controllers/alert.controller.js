const service = require('../services/alert.service');

async function list(req, res, next) {
  try {
    const rows = await service.listForUser(req.user, { unread: req.query.unread });
    res.json({ success: true, count: rows.length, alerts: rows });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const ok = await service.markAsRead(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const n = await service.markAllAsRead(req.user.role);
    res.json({ success: true, marked: n });
  } catch (err) {
    next(err);
  }
}

/** Manual trigger — useful for testing without waiting for the cron. */
async function runScanNow(req, res, next) {
  try {
    const summary = await service.runDeadlineScan();
    res.json({ success: true, ...summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead, runScanNow };
