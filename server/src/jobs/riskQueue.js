const { Queue } = require('bullmq');
const { getBullConnection } = require('../config/redis');
const settingsService = require('../services/settingsService');
const { log } = require('../utils/logger');
const { QUEUES, JOBS } = require('./constants');

const connection = getBullConnection();
const riskQueue = new Queue(QUEUES.RISK, { connection });

const removeRepeatableJobsByName = async name => {
  const repeatable = await riskQueue.getRepeatableJobs();
  const targets = repeatable.filter(job => job.name === name);
  await Promise.all(targets.map(job => riskQueue.removeRepeatableByKey(job.key)));
};

const scheduleRepeatableJob = async (name, repeatOptions) => {
  await riskQueue.add(name, {}, {
    jobId: name,
    repeat: repeatOptions
  });
};

const ensureRiskSchedules = async () => {
  const settings = await settingsService.getSettings();
  const velocity = settings.antiFraud?.velocity || {};
  if (velocity.enabled === false) {
    await removeRepeatableJobsByName(JOBS.RISK_VELOCITY);
  } else {
    const intervalMinutes = Number(velocity.intervalMinutes || velocity.windowMinutes || 5);
    const every = Math.max(1, intervalMinutes) * 60 * 1000;
    await scheduleRepeatableJob(JOBS.RISK_VELOCITY, { every });
  }

  const dailyCap = settings.antiFraud?.dailyWinCap || {};
  if (dailyCap.enabled === false) {
    await removeRepeatableJobsByName(JOBS.RISK_DAILY_CAP);
  } else {
    const intervalMinutes = Number(dailyCap.checkIntervalMinutes || 30);
    const every = Math.max(5, intervalMinutes) * 60 * 1000;
    await scheduleRepeatableJob(JOBS.RISK_DAILY_CAP, { every });
  }

  const sweepInterval = Number(settings.antiFraud?.sweepIntervalMinutes || 60);
  if (!Number.isFinite(sweepInterval) || sweepInterval <= 0) {
    await removeRepeatableJobsByName(JOBS.RISK_FULL_SWEEP);
  } else {
    const every = Math.max(15, sweepInterval) * 60 * 1000;
    await scheduleRepeatableJob(JOBS.RISK_FULL_SWEEP, { every });
  }

  log.info('Risk monitoring jobs ensured');
};

module.exports = {
  riskQueue,
  ensureRiskSchedules,
  removeRepeatableJobsByName
};
