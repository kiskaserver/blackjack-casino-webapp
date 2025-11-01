require('./config/env');
const { initRiskWorker } = require('./jobs/workers/antiFraudWorker');
const { initPayoutWorker } = require('./jobs/workers/payoutWorker');
const { log } = require('./utils/logger');

(async () => {
  try {
    await Promise.all([initRiskWorker(), initPayoutWorker()]);
    log.info('Background workers started');
  } catch (error) {
    log.error('Failed to start background workers', { error: error.message });
    process.exit(1);
  }
})();
