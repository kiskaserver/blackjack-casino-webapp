const playerRepository = require('../repositories/playerRepository');
const transactionRepository = require('../repositories/transactionRepository');
const settingsService = require('./settingsService');
const riskRepository = require('../repositories/riskRepository');

const analyzePlayer = async (playerId, stats, settings) => {
  const { antiFraud } = settings;
  if (!antiFraud) return;

  if (stats.totalGames > 0) {
    const winRate = stats.wins / stats.totalGames;
    if (winRate > 0.85) {
      await riskRepository.createEvent({
        playerId,
        eventType: 'win_rate_anomaly',
        severity: 'medium',
        payload: { winRate }
      });
    }
  }

  if (stats.netProfit > antiFraud.maxDailyWin) {
    await riskRepository.createEvent({
      playerId,
      eventType: 'profit_threshold',
      severity: 'high',
      payload: { netProfit: stats.netProfit, threshold: antiFraud.maxDailyWin }
    });
  }
};

const runAntiFraudSweep = async () => {
  const settings = await settingsService.getSettings();
  const recent = await transactionRepository.getRecentTransactions({ limit: 200 });
  const playerIds = [...new Set(recent.map(row => row.player_id))];
  for (const playerId of playerIds) {
    const stats = await playerRepository.getPlayerStats({ playerId });
    await analyzePlayer(playerId, stats, settings);
  }
};

module.exports = {
  runAntiFraudSweep
};
