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
const { validateCredentials, createSession, revokeSession } = require('../services/adminAuthService');
const verificationService = require('../services/verificationService');

const router = express.Router();

const getClientIp = req => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip;
};

const mapPlayerForResponse = player => {
  const status = player.status || 'active';
  const verificationStatus = player.verification_status || 'unverified';
  return {
    ...player,
    balance: Number(player.balance || 0),
    demo_balance: Number(player.demo_balance || 0),
    status,
    verification_status: verificationStatus,
    is_active: status === 'active'
  };
};

const normalizeMetadata = metadata => {
  if (!metadata) {
    return {};
  }
  if (typeof metadata === 'object') {
    return metadata;
  }
  try {
    return JSON.parse(metadata);
  } catch (_error) {
    return {};
  }
};

const mapVerificationForResponse = row => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    player_id: row.player_id,
    status: row.status,
    document_type: row.document_type,
    document_number: row.document_number,
    country: row.country,
    document_front_url: row.document_front_url,
    document_back_url: row.document_back_url,
    selfie_url: row.selfie_url,
    additional_document_url: row.additional_document_url,
    metadata: normalizeMetadata(row.metadata),
    note: row.note,
    rejection_reason: row.rejection_reason,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    submitted_at: row.submitted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    player: row.telegram_id
      ? {
          telegram_id: row.telegram_id,
          username: row.username,
          first_name: row.first_name,
          last_name: row.last_name
        }
      : null
  };
};

const mapBatchWithStats = async batch => {
  const withdrawals = await batchRepository.getWithdrawalsInBatch(batch.id);
  const totalAmount = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
  return {
    ...batch,
    withdrawalCount: withdrawals.length,
    totalAmount
  };
};

router.post('/auth/login', async (req, res) => {
  try {
    const { adminId, secret } = req.body || {};
    if (!validateCredentials({ adminId, secret })) {
      return sendError(res, new Error('Неверные учетные данные администратора'), 401);
    }
    const session = await createSession({ adminId, ip: getClientIp(req) });
    sendSuccess(res, { token: session.token, expiresIn: session.expiresIn });
  } catch (error) {
    const status = error.message === 'Redis недоступен' ? 503 : 401;
    sendError(res, error, status);
  }
});

router.post('/auth/logout', adminAuth, async (req, res) => {
  try {
    await revokeSession(req.admin?.sessionId);
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, error, 400);
  }
});

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
    const limitRaw = Number(req.query.limit || 50);
    const offsetRaw = Number(req.query.offset || 0);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
    const players = await playerRepository.listPlayers({ limit, offset });
    sendSuccess(res, players.map(mapPlayerForResponse));
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.get('/players/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return sendSuccess(res, []);
    }
    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;
    const players = await playerRepository.searchPlayers({ query, limit });
    sendSuccess(res, players.map(mapPlayerForResponse));
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

router.put('/players/:telegramId/balance', async (req, res) => {
  try {
    const targetBalance = Number(req.body?.balance);
    if (!Number.isFinite(targetBalance) || targetBalance < 0) {
      throw new Error('Баланс должен быть неотрицательным числом');
    }

    const player = await playerRepository.getOrCreatePlayer({
      telegramId: req.params.telegramId,
      username: null,
      firstName: null,
      lastName: null
    });

    const current = Number(player.balance || 0);
    const delta = Number((targetBalance - current).toFixed(2));
    if (Math.abs(delta) < 0.01) {
      return sendSuccess(res, { balance: current, updated: false });
    }

    if (delta > 0) {
      await balanceService.creditBalance({
        playerId: player.id,
        amount: delta,
        reason: 'admin_set_balance_increase',
        walletType: 'real'
      });
    } else {
      await balanceService.debitBalance({
        playerId: player.id,
        amount: Math.abs(delta),
        reason: 'admin_set_balance_decrease',
        walletType: 'real'
      });
    }

    const refreshed = await playerRepository.getPlayerById(player.id);
    sendSuccess(res, {
      balance: Number(refreshed.balance || 0),
      updated: true
    });
  } catch (error) {
    sendError(res, error, 400);
  }
});

const updatePlayerStatus = async (req, res) => {
  try {
    const payload = req.body || {};
    let { status } = payload;
    if (typeof payload.is_active === 'boolean') {
      status = payload.is_active ? 'active' : 'suspended';
    }
    const allowedStatuses = ['active', 'suspended', 'limited', 'verified', 'banned'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const player = await playerRepository.findPlayerByTelegramId(req.params.telegramId);
    if (!player) {
      return sendError(res, new Error('Player not found'), 404);
    }

    const updated = await playerRepository.updateStatus({ playerId: player.id, status });
    sendSuccess(res, { status: updated.status, is_active: status === 'active' });
  } catch (error) {
    sendError(res, error, 400);
  }
};

router.post('/players/:telegramId/status', updatePlayerStatus);
router.put('/players/:telegramId/status', updatePlayerStatus);

router.get('/verifications', async (req, res) => {
  try {
    const rawStatus = String(req.query.status || '').trim();
    const limitRaw = Number(req.query.limit || 100);
    const playerIdRaw = req.query.playerId;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 100;
    const filters = {};
    if (rawStatus) {
      const allowed = Object.values(verificationService.VERIFICATION_STATUSES);
      if (!allowed.includes(rawStatus)) {
        throw new Error('Недопустимый статус фильтра верификации');
      }
      filters.status = rawStatus;
    }
    if (typeof playerIdRaw !== 'undefined') {
      const numericPlayerId = Number(playerIdRaw);
      if (!Number.isFinite(numericPlayerId) || numericPlayerId <= 0) {
        throw new Error('Некорректный идентификатор игрока');
      }
      filters.playerId = numericPlayerId;
    }
    filters.limit = limit;
    const verifications = await verificationService.listVerifications(filters);
    sendSuccess(res, verifications.map(mapVerificationForResponse));
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.get('/verifications/:id', async (req, res) => {
  try {
    const verification = await verificationService.getVerificationById(req.params.id);
    if (!verification) {
      return sendError(res, new Error('Запрос на верификацию не найден'), 404);
    }
    sendSuccess(res, mapVerificationForResponse(verification));
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/verifications/:id/approve', async (req, res) => {
  try {
    const verification = await verificationService.approveVerification({
      id: req.params.id,
      reviewer: req.admin?.id,
      note: req.body?.note || null
    });
    sendSuccess(res, mapVerificationForResponse(verification));
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/verifications/:id/reject', async (req, res) => {
  try {
    const verification = await verificationService.rejectVerification({
      id: req.params.id,
      reviewer: req.admin?.id,
      note: req.body?.note || null,
      reason: req.body?.reason || null
    });
    sendSuccess(res, mapVerificationForResponse(verification));
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/verifications/:id/request-resubmission', async (req, res) => {
  try {
    const verification = await verificationService.requestResubmission({
      id: req.params.id,
      reviewer: req.admin?.id,
      note: req.body?.note || null,
      reason: req.body?.reason || null
    });
    sendSuccess(res, mapVerificationForResponse(verification));
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
    const activeBatches = await Promise.all(batches.map(mapBatchWithStats));
    sendSuccess(res, activeBatches);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.get('/withdrawal-batches', async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;
    const batches = await batchRepository.listBatches({ limit });
    const enriched = await Promise.all(batches.map(mapBatchWithStats));
    sendSuccess(res, enriched);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.post('/withdrawal-batches/force', async (req, res) => {
  try {
    const scheduledFor = new Date();
    const batch = await batchRepository.createBatch({
      scheduledFor,
      metadata: {
        forced: true,
        createdBy: req.admin?.id || null
      }
    });
    const result = await withdrawalService.processBatchNow(batch.id, { assignPending: true });
    sendSuccess(res, { batchId: batch.id, scheduledFor: scheduledFor.toISOString(), ...result });
  } catch (error) {
    sendError(res, error, 400);
  }
});

router.post('/withdrawal-batches/:id/process', async (req, res) => {
  try {
    const result = await withdrawalService.processBatchNow(req.params.id, { assignPending: true });
    sendSuccess(res, { batchId: req.params.id, ...result });
  } catch (error) {
    sendError(res, error, 400);
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
    const { severity } = req.query;
    const eventType = req.query.eventType || req.query.type;
  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 100;
  const events = await riskRepository.getRecentRiskEvents({ limit, severity, eventType });
    sendSuccess(res, events);
  } catch (error) {
    sendError(res, error, 500);
  }
});

module.exports = router;
