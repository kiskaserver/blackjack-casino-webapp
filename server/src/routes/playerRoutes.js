const express = require('express');
const limiter = require('../middleware/rateLimiter');
const { verifyTelegram } = require('../middleware/verifyTelegram');
const { sendSuccess, sendError } = require('../utils/http');
const playerRepository = require('../repositories/playerRepository');
const settingsService = require('../services/settingsService');
const balanceService = require('../services/balanceService');

const router = express.Router();

router.get('/profile', limiter, verifyTelegram, async (req, res) => {
  try {
    const user = req.telegramUser;
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: String(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    });
    const stats = await playerRepository.getPlayerStats({ playerId: player.id });
    const settings = await settingsService.getSettings();
    sendSuccess(res, {
      player,
      stats,
      demo: settings.demo || { defaultBalance: 10000, topUpThreshold: 500 }
    });
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.post('/demo/reset', limiter, verifyTelegram, async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    const defaultBalance = Number(settings.demo?.defaultBalance ?? 10000);
    const targetBalance = Number.isFinite(Number(req.body?.target)) && Number(req.body.target) > 0
      ? Number(req.body.target)
      : defaultBalance;

    const user = req.telegramUser;
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: String(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    });

    const currentDemo = Number(player.demo_balance || 0);
    const delta = Number((targetBalance - currentDemo).toFixed(2));

    let result = {
      balance: currentDemo,
      walletType: 'demo',
      realBalance: Number(player.balance || 0),
      demoBalance: currentDemo,
      updated: false
    };

    if (Math.abs(delta) >= 0.01) {
      const referenceId = `${player.id}:demo_reset:${Date.now()}`;
      if (delta > 0) {
        result = await balanceService.creditBalance({
          playerId: player.id,
          amount: delta,
          reason: 'demo_reset',
          referenceId,
          walletType: 'demo'
        });
      } else {
        result = await balanceService.debitBalance({
          playerId: player.id,
          amount: Math.abs(delta),
          reason: 'demo_reset',
          referenceId,
          walletType: 'demo'
        });
      }
      result.updated = true;
    }

    sendSuccess(res, {
      balance: result.balance,
      walletType: 'demo',
      balances: {
        real: result.realBalance,
        demo: result.demoBalance
      },
      target: targetBalance,
      defaultBalance,
      updated: result.updated || false
    });
  } catch (error) {
    sendError(res, error, 500);
  }
});

module.exports = router;
