require('./config/env');
const { initRiskWorker } = require('./jobs/workers/antiFraudWorker');
const { initPayoutWorker } = require('./jobs/workers/payoutWorker');
const { initNotificationWorker } = require('./jobs/workers/notificationWorker');
const { log } = require('./utils/logger');

(async () => {
  try {
  await Promise.all([initRiskWorker(), initPayoutWorker(), initNotificationWorker()]);
    log.info('Background workers started');
  } catch (error) {
    log.error('Failed to start background workers', { error: error.message });
    process.exit(1);
  }
})();
