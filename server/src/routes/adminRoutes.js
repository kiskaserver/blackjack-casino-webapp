const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { sendSuccess, sendError } = require('../utils/http');
const playerRepository = require('../repositories/playerRepository');
const playerSettingsRepository = require('../repositories/playerSettingsRepository');
const transactionRepository = require('../repositories/transactionRepository');
const settingsService = require('../services/settingsService');
const withdrawalService = require('../services/withdrawalService');
const batchRepository = require('../repositories/batchRepository');
const houseRepository = require('../repositories/houseRepository');
const balanceService = require('../services/balanceService');
const riskRepository = require('../repositories/riskRepository');

const router = express.Router();

router.use(adminAuth);

router.get('/stats/overview', async (_req, res) => {
  try {
    const stats = await transactionRepository.getAggregatedStats();
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.get('/stats/player/:telegramId', async (req, res) => {
  try {
    const player = await playerRepository.findPlayerByTelegramId(req.params.telegramId);
    if (!player) {
      return sendError(res, new Error('Player not found'), 404);
    }
    const stats = await playerRepository.getPlayerStats({ playerId: player.id });
    const playerSettings = await playerSettingsRepository.getPlayerSettings(player.id);
    const riskEvents = await riskRepository.getPlayerRiskEvents(player.id);
    sendSuccess(res, { player, stats, playerSettings, riskEvents });
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.get('/transactions/recent', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const rows = await transactionRepository.getRecentTransactions({ limit });
    sendSuccess(res, rows);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.get('/players', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const players = await playerRepository.listPlayers({ limit, offset });
    sendSuccess(res, players);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.post('/players/:telegramId/adjust-balance', async (req, res) => {
  try {
    const { amount, reason, walletType } = req.body;
    const wallet = walletType === 'demo' ? 'demo' : 'real';
    if (!amount || Number(amount) === 0) {
      throw new Error('Amount must be non-zero');
    }

    const player = await playerRepository.getOrCreatePlayer({
      telegramId: req.params.telegramId,
      username: null,
      firstName: null,
      lastName: null
    });

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) {
      throw new Error('Amount must be numeric');
    }

    let result;
    const baseReason = wallet === 'demo' ? 'admin_demo_adjust' : 'admin_adjust';
    if (numericAmount > 0) {
      result = await balanceService.creditBalance({
        playerId: player.id,
        amount: numericAmount,
        reason: reason || `${baseReason}_credit`,
        walletType: wallet
      });
    } else {
      result = await balanceService.debitBalance({
        playerId: player.id,
        amount: Math.abs(numericAmount),
        reason: reason || `${baseReason}_debit`,
        walletType: wallet
      });
    }

    sendSuccess(res, {
      walletType: wallet,
      balance: result.balance,
      realBalance: result.realBalance,
      demoBalance: result.demoBalance
    });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/players/:telegramId/demo/reset', async (req, res) => {
  try {
    const { targetBalance } = req.body;
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: req.params.telegramId,
      username: null,
      firstName: null,
      lastName: null
    });

    const settings = await settingsService.getSettings();
    const defaultBalance = Number(settings.demo?.defaultBalance || 10000);
    const resetTo = Number.isFinite(Number(targetBalance)) ? Number(targetBalance) : defaultBalance;
    
    const currentDemo = Number(player.demo_balance || 0);
    const delta = resetTo - currentDemo;
    
    let result;
    if (delta > 0) {
      result = await balanceService.creditBalance({
        playerId: player.id,
        amount: delta,
        reason: 'admin_demo_reset',
        walletType: 'demo'
      });
    } else if (delta < 0) {
      result = await balanceService.debitBalance({
        playerId: player.id,
        amount: Math.abs(delta),
        reason: 'admin_demo_reset',
        walletType: 'demo'
      });
    } else {
      result = {
        balance: currentDemo,
        realBalance: Number(player.balance),
        demoBalance: currentDemo
      };
    }

    sendSuccess(res, {
      previousBalance: currentDemo,
      newBalance: result.demoBalance,
      delta,
      targetBalance: resetTo
    });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/players/:telegramId/demo/settings', async (req, res) => {
  try {
    const { enabled, initialBalance, topupThreshold } = req.body;
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: req.params.telegramId,
      username: null,
      firstName: null,
      lastName: null
    });

    const settings = await playerSettingsRepository.upsertPlayerSettings({
      playerId: player.id,
      demoEnabled: enabled,
      demoInitialBalance: initialBalance,
      demoTopupThreshold: topupThreshold
    });

    sendSuccess(res, settings);
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.delete('/players/:telegramId/demo/settings', async (req, res) => {
  try {
    const player = await playerRepository.findPlayerByTelegramId(req.params.telegramId);
    if (!player) {
      return sendError(res, new Error('Player not found'), 404);
    }

    await playerSettingsRepository.deletePlayerSettings(player.id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/players/:telegramId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['active', 'suspended', 'limited', 'verified', 'banned'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const player = await playerRepository.findPlayerByTelegramId(req.params.telegramId);
    if (!player) {
      return sendError(res, new Error('Player not found'), 404);
    }

    const updated = await playerRepository.updateStatus({ playerId: player.id, status });
    sendSuccess(res, updated);
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const settings = await settingsService.getSettings();
    sendSuccess(res, settings);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.patch('/settings', async (req, res) => {
  try {
    await settingsService.updateSettings(req.body || {});
    const settings = await settingsService.getSettings();
    sendSuccess(res, settings);
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const withdrawals = await withdrawalService.listWithdrawals({ status, limit });
    sendSuccess(res, withdrawals);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.get('/withdrawals/batches', async (req, res) => {
  try {
    const batches = await batchRepository.getScheduledBatches();
    const activeBatches = [];
    
    for (const batch of batches) {
      const withdrawals = await batchRepository.getWithdrawalsInBatch(batch.id);
      activeBatches.push({
        ...batch,
        withdrawalCount: withdrawals.length,
        totalAmount: withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0)
      });
    }
    
    sendSuccess(res, activeBatches);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.post('/withdrawals/:id/status', async (req, res) => {
  try {
    const updated = await withdrawalService.updateWithdrawalStatus({
      id: req.params.id,
      status: req.body.status,
      note: req.body.note
    });
    sendSuccess(res, updated);
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/withdrawals/:id/urgent', async (req, res) => {
  try {
    const { enqueueUrgentWithdrawal } = require('../jobs/payoutQueue');
    await enqueueUrgentWithdrawal(req.params.id);
    sendSuccess(res, { queued: true });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.put('/house-overrides/:telegramId', async (req, res) => {
  try {
    const { mode, rigProbability } = req.body;
    const allowedModes = ['fair', 'favor_house', 'favor_player'];
    if (!allowedModes.includes(mode)) {
      throw new Error('Invalid mode');
    }
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: req.params.telegramId,
      username: null,
      firstName: null,
      lastName: null
    });
    await houseRepository.upsertOverride({
      playerId: player.id,
      mode,
      rigProbability: Number(rigProbability || 0)
    });
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.delete('/house-overrides/:telegramId', async (req, res) => {
  try {
    const player = await playerRepository.findPlayerByTelegramId(req.params.telegramId);
    if (!player) {
      return sendError(res, new Error('Player not found'), 404);
    }
    await houseRepository.deleteOverride(player.id);
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.get('/risk-events', async (req, res) => {
  try {
    const { limit = 100, severity, eventType } = req.query;
    const events = await riskRepository.getRecentRiskEvents({ limit, severity, eventType });
    sendSuccess(res, events);
  } catch (error) {
    sendError(res, error, 500);
  }
});

module.exports = router;
