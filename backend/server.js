require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { startAlertJob } = require('./src/jobs/alertJob');

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    const dbInfo = await testConnection();
    console.log(`✓ MySQL connected → db="${dbInfo.db}" @ ${dbInfo.time}`);
  } catch (err) {
    console.error('✗ MySQL connection FAILED.');
    console.error('  ', err.code || '', err.message);
    console.error('  Check your .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) and that MySQL is running.');
    process.exit(1);
  }

  // Bind to 0.0.0.0 so phones on the same Wi-Fi can hit us via the LAN IP.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Backend listening on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
  });

  // Start scheduled jobs
  startAlertJob();
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});
