const { Worker, QueueScheduler } = require('bullmq');
const { getBullConnection } = require('../../config/redis');
const { QUEUES, JOBS } = require('../constants');
const withdrawalService = require('../../services/withdrawalService');
const { log } = require('../../utils/logger');

const initPayoutWorker = async () => {
  const connection = getBullConnection();
  const scheduler = new QueueScheduler(QUEUES.PAYOUT, { connection });
  await scheduler.waitUntilReady();
  log.info('Payout queue scheduler ready');

  const worker = new Worker(QUEUES.PAYOUT, async job => {
    log.info('Processing payout job', { jobName: job.name, jobId: job.id });
    switch (job.name) {
      case JOBS.PAYOUT_DAILY_BATCH:
        return withdrawalService.processDailyBatch();
      case JOBS.PAYOUT_PROCESS_WITHDRAWAL:
        return withdrawalService.processWithdrawalJob(job.data?.withdrawalId);
      case JOBS.PAYOUT_URGENT_REVIEW:
        return withdrawalService.enqueueUrgentReviewJob(job.data?.withdrawalId);
      default:
        log.warn('Unknown payout job received', { jobName: job.name });
        return null;
    }
  }, { connection });

  worker.on('completed', job => {
    log.info('Payout job completed', { jobName: job.name, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    log.error('Payout job failed', { jobName: job?.name, jobId: job?.id, error: error.message });
  });

  return { worker, scheduler };
};

module.exports = {
  initPayoutWorker
};
