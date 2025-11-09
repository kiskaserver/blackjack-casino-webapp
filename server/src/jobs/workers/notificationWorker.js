const { Worker, JobScheduler } = require('bullmq');
const { getBullConnection } = require('../../config/redis');
const { QUEUES, JOBS } = require('../constants');
const autoMessageService = require('../../services/autoMessageService');
const { log } = require('../../utils/logger');

const initNotificationWorker = async () => {
  const connection = getBullConnection();
  const scheduler = new JobScheduler(QUEUES.NOTIFICATIONS, { connection });
  await scheduler.waitUntilReady();
  log.info('Notification job scheduler ready');

  const worker = new Worker(
    QUEUES.NOTIFICATIONS,
    async job => {
      log.info('Processing notification job', { jobName: job.name, jobId: job.id });
      switch (job.name) {
        case JOBS.NOTIFICATION_SWEEP:
          await autoMessageService.enqueueDueMessages();
          return { status: 'sweep-complete' };
        case JOBS.NOTIFICATION_DELIVERY:
          if (!job.data?.templateId || !job.data?.playerId) {
            log.warn('Notification delivery job missing parameters', { jobId: job.id });
            return { status: 'skipped', reason: 'missing-params' };
          }
          return autoMessageService.deliverMessage({
            templateId: job.data.templateId,
            playerId: job.data.playerId
          });
        default:
          log.warn('Unknown notification job received', { jobName: job.name });
          return { status: 'unknown-job' };
      }
    },
    { connection, concurrency: 5 }
  );

  worker.on('completed', job => {
    log.info('Notification job completed', { jobName: job.name, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    log.error('Notification job failed', { jobName: job?.name, jobId: job?.id, error: error.message });
  });

  return { worker, scheduler };
};

module.exports = {
  initNotificationWorker
};
