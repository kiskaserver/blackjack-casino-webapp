const { Worker, QueueScheduler } = require('bullmq');
const { getBullConnection } = require('../../config/redis');
const { QUEUES, JOBS } = require('../constants');
const antiFraudService = require('../../services/antiFraudService');
const { log } = require('../../utils/logger');

const initRiskWorker = async () => {
  const connection = getBullConnection();
  const scheduler = new QueueScheduler(QUEUES.RISK, { connection });
  await scheduler.waitUntilReady();
  log.info('Risk queue scheduler ready');

  const worker = new Worker(QUEUES.RISK, async job => {
    log.info('Processing risk job', { jobName: job.name, jobId: job.id });
    switch (job.name) {
      case JOBS.RISK_VELOCITY:
        return antiFraudService.runVelocityCheck();
      case JOBS.RISK_DAILY_CAP:
        return antiFraudService.runDailyWinCapCheck();
      case JOBS.RISK_FULL_SWEEP:
      default:
        return antiFraudService.runAntiFraudSweep();
    }
  }, { connection });

  worker.on('completed', job => {
    log.info('Risk job completed', { jobName: job.name, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    log.error('Risk job failed', { jobName: job?.name, jobId: job?.id, error: error.message });
  });

  return { worker, scheduler };
};

module.exports = {
  initRiskWorker
};
