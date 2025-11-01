const express = require('express');
const { URL } = require('url');
const limiter = require('../middleware/rateLimiter');
const config = require('../config/env');
const { verifyTelegram } = require('../middleware/verifyTelegram');
const { sendSuccess, sendError } = require('../utils/http');
const { log } = require('../utils/logger');
const { isUrlAllowed } = require('../utils/url');
const playerRepository = require('../repositories/playerRepository');
const settingsService = require('../services/settingsService');
const balanceService = require('../services/balanceService');
const verificationService = require('../services/verificationService');

const router = express.Router();

const verificationAllowedHosts = config.security?.verificationAllowedHosts || [];
const allowLocalFallback = config.nodeEnv !== 'production' && verificationAllowedHosts.length === 0;
let loggedVerificationWarning = false;

const isAllowedVerificationUrl = value => isUrlAllowed(value, {
  allowedHosts: verificationAllowedHosts,
  allowLocalhostFallback: allowLocalFallback
});

const sanitizeVerificationUrl = (value, { label, required }) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    if (required) {
      throw new Error(`Ссылка на ${label} обязательна`);
    }
    return null;
  }

  if (!verificationAllowedHosts.length && !allowLocalFallback && !loggedVerificationWarning) {
    log.warn('Verification host allowlist is empty; rejecting non-local document URLs');
    loggedVerificationWarning = true;
  }

  if (!isAllowedVerificationUrl(trimmed)) {
    throw new Error(`Недопустимая ссылка на ${label}`);
  }

  try {
    const canonical = new URL(trimmed);
    return canonical.toString();
  } catch (_error) {
    throw new Error(`Недопустимая ссылка на ${label}`);
  }
};

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

router.get('/verification', limiter, verifyTelegram, async (req, res) => {
  try {
    const user = req.telegramUser;
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: String(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    });

    const mostRecent = await verificationService.getLatestVerificationForPlayer(player.id);

    sendSuccess(res, {
      verification_status: player.verification_status,
      request: mostRecent ? {
        id: mostRecent.id,
        status: mostRecent.status,
        document_type: mostRecent.document_type,
        submitted_at: mostRecent.submitted_at,
        reviewed_at: mostRecent.reviewed_at,
        note: mostRecent.note,
        rejection_reason: mostRecent.rejection_reason
      } : null
    });
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.post('/verification', limiter, verifyTelegram, async (req, res) => {
  try {
    const {
      documentType,
      documentNumber,
      country,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
      additionalDocumentUrl,
      metadata
    } = req.body || {};

    if (!documentType || typeof documentType !== 'string') {
      throw new Error('Тип документа обязателен');
    }
    const sanitizedFrontUrl = sanitizeVerificationUrl(documentFrontUrl, { label: 'лицевую сторону документа', required: true });
    const sanitizedBackUrl = sanitizeVerificationUrl(documentBackUrl, { label: 'оборотную сторону документа', required: false });
    const sanitizedSelfieUrl = sanitizeVerificationUrl(selfieUrl, { label: 'селфи', required: true });
    const sanitizedAdditionalUrl = sanitizeVerificationUrl(additionalDocumentUrl, { label: 'дополнительный документ', required: false });

    const user = req.telegramUser;
    const player = await playerRepository.getOrCreatePlayer({
      telegramId: String(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    });

    const submission = await verificationService.submitVerification({
      playerId: player.id,
      documentType,
      documentNumber: documentNumber || null,
      country: country || null,
  documentFrontUrl: sanitizedFrontUrl,
  documentBackUrl: sanitizedBackUrl,
  selfieUrl: sanitizedSelfieUrl,
  additionalDocumentUrl: sanitizedAdditionalUrl,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : {}
    });

    const refreshed = await playerRepository.getPlayerById(player.id);

    sendSuccess(res, {
      verification_status: refreshed?.verification_status || submission.status,
      request: {
        id: submission.id,
        status: submission.status,
        document_type: submission.document_type,
        submitted_at: submission.submitted_at
      }
    });
  } catch (error) {
    if (error.code === '23505' || error.message === 'Pending verification already exists') {
      return sendError(res, new Error('У вас уже есть запрос на рассмотрении'), 409);
    }
    sendError(res, error, 400);
  }
});

module.exports = router;
