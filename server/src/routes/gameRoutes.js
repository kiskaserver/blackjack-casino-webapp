const express = require('express');
const limiter = require('../middleware/rateLimiter');
const { verifyTelegram } = require('../middleware/verifyTelegram');
const { sendSuccess, sendError } = require('../utils/http');
const gameService = require('../services/gameService');
const fairnessService = require('../services/fairnessService');

const router = express.Router();

router.post('/start', limiter, verifyTelegram, async (req, res) => {
  try {
    const { betAmount, walletType } = req.body;
    if (!betAmount || betAmount <= 0) {
      throw new Error('Invalid bet amount');
    }
    const round = await gameService.startRound({
      telegramUser: req.telegramUser,
      betAmount,
      walletType
    });
    sendSuccess(res, round);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/hit', limiter, verifyTelegram, async (req, res) => {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      throw new Error('Missing roundId');
    }
    const state = await gameService.hitRound({ roundId, telegramUser: req.telegramUser });
    sendSuccess(res, state);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/double', limiter, verifyTelegram, async (req, res) => {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      throw new Error('Missing roundId');
    }
    const state = await gameService.doubleDown({ roundId, telegramUser: req.telegramUser });
    sendSuccess(res, state);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/settle', limiter, verifyTelegram, async (req, res) => {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      throw new Error('Missing roundId');
    }
    const state = await gameService.settleRound({ roundId, telegramUser: req.telegramUser });
    sendSuccess(res, state);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/fairness', limiter, verifyTelegram, async (_req, res) => {
  try {
    const report = await fairnessService.getGameFairnessReport();
    sendSuccess(res, report);
  } catch (error) {
    sendError(res, error, 500);
  }
});

module.exports = router;
