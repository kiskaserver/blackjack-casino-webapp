const db = require('../config/database');
const playerRepository = require('../repositories/playerRepository');
const transactionRepository = require('../repositories/transactionRepository');
const settingsService = require('./settingsService');
const riskRepository = require('../repositories/riskRepository');
const houseRepository = require('../repositories/houseRepository');
const { getRedisClient } = require('../config/redis');
const { log } = require('../utils/logger');

const redisThrottle = async (key, ttlSeconds) => {
  try {
    const client = getRedisClient();
    if (!client) {
      return true;
    }
    const response = await client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return response === 'OK';
  } catch (error) {
    log.warn('Redis throttle fallback', { error: error.message, key });
    return true;
  }
};

const applyHouseMitigation = async (playerId, settings) => {
  const probability = Number(settings.antiFraud?.flaggedRigProbability || 0);
  if (probability <= 0) {
    return;
  }
  await houseRepository.upsertOverride({
    playerId,
    mode: 'favor_house',
    rigProbability: probability
  });
};

const analyzePlayer = async (playerId, stats, settings) => {
  if (!stats || !settings) return;

  if (stats.totalGames > 0) {
    const winRate = stats.wins / stats.totalGames;
    if (winRate > 0.85) {
      const shouldEmit = await redisThrottle(`risk:winrate:${playerId}`, 6 * 3600);
      if (shouldEmit) {
        await riskRepository.createEvent({
          playerId,
          eventType: 'win_rate_anomaly',
          severity: 'medium',
          payload: { winRate: Number(winRate.toFixed(4)), games: stats.totalGames }
        });
        await applyHouseMitigation(playerId, settings);
      }
    }
  }
};

const runVelocityCheck = async (settingsOverride = null) => {
  const settings = settingsOverride || (await settingsService.getSettings());
  const config = settings.antiFraud?.velocity;
  if (!config || config.enabled === false) {
    return { skipped: true };
  }

  const threshold = Number(config.threshold || 0);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return { skipped: true };
  }

  const windowMinutes = Math.max(1, Number(config.windowMinutes || config.intervalMinutes || 10));
  const cooldownMinutes = Math.max(1, Number(config.cooldownMinutes || 60));

  const result = await db.query(
    `SELECT player_id, COUNT(*) AS activity_count
     FROM game_rounds
     WHERE wallet_type = 'real'
       AND created_at >= NOW() - ($1::interval)
     GROUP BY player_id
     HAVING COUNT(*) >= $2`,
    [`${windowMinutes} minutes`, threshold]
  );

  const flagged = [];
  for (const row of result.rows) {
    const playerId = row.player_id;
    const shouldEmit = await redisThrottle(`risk:velocity:${playerId}`, cooldownMinutes * 60);
    if (!shouldEmit) {
      continue;
    }
    const activityCount = Number(row.activity_count || 0);
    await riskRepository.createEvent({
      playerId,
      eventType: 'velocity_threshold',
      severity: 'medium',
      payload: {
        windowMinutes,
        threshold,
        activityCount
      }
    });
    await applyHouseMitigation(playerId, settings);
    flagged.push(playerId);
  }

  if (flagged.length) {
    log.info('Velocity check flagged players', { count: flagged.length });
  }

  return { flaggedPlayers: flagged };
};

const runDailyWinCapCheck = async (settingsOverride = null) => {
  const settings = settingsOverride || (await settingsService.getSettings());
  const config = settings.antiFraud?.dailyWinCap;
  if (!config || config.enabled === false) {
    return { skipped: true };
  }

  const limit = Number(config.maxNetProfit || 0);
  if (!Number.isFinite(limit) || limit <= 0) {
    return { skipped: true };
  }

  const timezone = config.timezone || 'UTC';
  const cooldownHours = Math.max(1, Number(config.cooldownHours || 24));

  const res = await db.query(
    `SELECT player_id,
            SUM(COALESCE(win_amount, 0) - final_bet) AS net_profit,
            SUM(final_bet) AS total_wagered,
            SUM(COALESCE(win_amount, 0)) AS total_won
     FROM game_rounds
     WHERE wallet_type = 'real'
       AND status = 'finished'
       AND date_trunc('day', settled_at AT TIME ZONE $1) = date_trunc('day', NOW() AT TIME ZONE $1)
     GROUP BY player_id`,
    [timezone]
  );

  const flagged = [];
  for (const row of res.rows) {
    const netProfit = Number(row.net_profit || 0);
    if (netProfit <= limit) {
      continue;
    }
    const playerId = row.player_id;
    const shouldEmit = await redisThrottle(`risk:dailycap:${playerId}`, cooldownHours * 3600);
    if (!shouldEmit) {
      continue;
    }

    await riskRepository.createEvent({
      playerId,
      eventType: 'profit_threshold',
      severity: 'high',
      payload: {
        netProfit,
        threshold: limit,
        timezone,
        totalWagered: Number(row.total_wagered || 0),
        totalWon: Number(row.total_won || 0)
      }
    });

    await applyHouseMitigation(playerId, settings);
    await playerRepository.updateStatus({ playerId, status: 'limited' });
    flagged.push(playerId);
  }

  if (flagged.length) {
    log.warn('Daily win cap triggered', { count: flagged.length, timezone });
  }

  return { flaggedPlayers: flagged };
};

const runAntiFraudSweep = async () => {
  const settings = await settingsService.getSettings();
  const recent = await transactionRepository.getRecentTransactions({ limit: 200 });
  const playerIds = [...new Set(recent.map(row => row.player_id))];
  for (const playerId of playerIds) {
    const stats = await playerRepository.getPlayerStats({ playerId });
    await analyzePlayer(playerId, stats, settings);
  }
  await runVelocityCheck(settings);
  await runDailyWinCapCheck(settings);
};

module.exports = {
  runAntiFraudSweep,
  runVelocityCheck,
  runDailyWinCapCheck
};
