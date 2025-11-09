const { Queue } = require('bullmq');
const { getBullConnection } = require('../config/redis');
const { log } = require('../utils/logger');
const { QUEUES, JOBS } = require('./constants');

const connection = getBullConnection();

const notificationQueue = new Queue(QUEUES.NOTIFICATIONS, {
  connection
});

const ensureNotificationSchedules = async () => {
  try {
    await notificationQueue.add(JOBS.NOTIFICATION_SWEEP, {}, {
      jobId: JOBS.NOTIFICATION_SWEEP,
      repeat: {
        every: 30 * 60 * 1000
      },
      removeOnComplete: true,
      removeOnFail: 50
    });
    log.info('Notification sweep job scheduled');
  } catch (error) {
    log.error('Failed to schedule notification sweep', { error: error.message });
    throw error;
  }
};

module.exports = {
  notificationQueue,
  ensureNotificationSchedules
};
