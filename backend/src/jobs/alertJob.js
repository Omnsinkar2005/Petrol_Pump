const cron = require('node-cron');
const { runDeadlineScan } = require('../services/alert.service');

/**
 * Daily alert scan.
 * Default: 09:00 server time every day.
 * Override via env: ALERT_CRON_SCHEDULE='0 9 * * *'
 *
 * Cron format: minute hour day-of-month month day-of-week
 */
function startAlertJob() {
  const schedule = process.env.ALERT_CRON_SCHEDULE || '0 9 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[alertJob] Invalid cron schedule: "${schedule}" — job NOT started.`);
    return null;
  }

  const task = cron.schedule(
    schedule,
    async () => {
      const started = new Date();
      console.log(`[alertJob] Running deadline scan at ${started.toISOString()}`);
      try {
        const summary = await runDeadlineScan();
        console.log(
          `[alertJob] Done — scanned=${summary.scanned}, ` +
            `alertsCreated=${summary.alertsCreated}, ` +
            `statusChanges=${summary.statusChanges}, ` +
            `smsSent=${summary.smsSent || 0}`
        );
      } catch (err) {
        console.error('[alertJob] FAILED:', err.message);
      }
    },
    { scheduled: true }
  );

  console.log(`[alertJob] Scheduled with "${schedule}"`);
  return task;
}

module.exports = { startAlertJob };
