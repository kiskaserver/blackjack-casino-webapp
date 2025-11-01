const { Queue } = require('bullmq');
const { getBullConnection } = require('../config/redis');
const settingsService = require('../services/settingsService');
const { log } = require('../utils/logger');
const { QUEUES, JOBS } = require('./constants');

const connection = getBullConnection();
const payoutQueue = new Queue(QUEUES.PAYOUT, { connection });

const ensureDailyBatchJob = async () => {
  const settings = await settingsService.getSettings();
  const crypto = settings.payouts?.crypto || {};
  const batchHour = Number.isFinite(Number(crypto.batchHourUtc)) ? Number(crypto.batchHourUtc) : 23;
  const cronPattern = `0 0 ${Math.min(Math.max(batchHour, 0), 23)} * * *`;
  await payoutQueue.add(JOBS.PAYOUT_DAILY_BATCH, {}, {
    jobId: JOBS.PAYOUT_DAILY_BATCH,
    repeat: {
      pattern: cronPattern,
      tz: 'UTC'
    }
  });
  log.info('Payout daily batch job scheduled', { cronPattern });
};

const enqueueUrgentWithdrawal = async withdrawalId => {
  if (!withdrawalId) return;
  await payoutQueue.add(JOBS.PAYOUT_PROCESS_WITHDRAWAL, { withdrawalId }, {
    jobId: `${JOBS.PAYOUT_PROCESS_WITHDRAWAL}:${withdrawalId}`
  });
};

const enqueueUrgentReview = async withdrawalId => {
  if (!withdrawalId) return;
  await payoutQueue.add(JOBS.PAYOUT_URGENT_REVIEW, { withdrawalId }, {
    jobId: `${JOBS.PAYOUT_URGENT_REVIEW}:${withdrawalId}`
  });
};

const ensurePayoutSchedules = async () => {
  await ensureDailyBatchJob();
};

module.exports = {
  payoutQueue,
  ensurePayoutSchedules,
  enqueueUrgentWithdrawal,
  enqueueUrgentReview
};
