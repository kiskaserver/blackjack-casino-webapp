const express = require('express');
const limiter = require('../middleware/rateLimiter');
const { verifyTelegram } = require('../middleware/verifyTelegram');
const { sendSuccess, sendError } = require('../utils/http');
const paymentService = require('../services/paymentService');
const withdrawalService = require('../services/withdrawalService');

const router = express.Router();

router.post('/cryptomus/invoice', limiter, verifyTelegram, async (req, res) => {
  try {
    const { amount, currency, network, orderId } = req.body;
    if (!amount || amount <= 0) {
      throw new Error('Amount must be positive');
    }
    const response = await paymentService.createCryptomusInvoice({
      amount,
      currency,
      network,
      orderId,
      telegramUser: req.telegramUser
    });
    sendSuccess(res, response, 201);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/cryptomus/webhook', async (req, res) => {
  try {
    if (!paymentService.verifyCryptomusWebhook({ body: req.body, headers: req.headers })) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const result = await paymentService.handleCryptomusWebhook({ body: req.body });
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error, 500);
  }
});

router.post('/telegram-stars/invoice', limiter, verifyTelegram, async (req, res) => {
  try {
    const { amount, description, payload } = req.body;
    if (!amount || amount <= 0) {
      throw new Error('Amount must be positive');
    }
    const invoiceLink = await paymentService.createTelegramStarsInvoice({ amount, description, payload });
    sendSuccess(res, { invoiceLink }, 201);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/withdraw', limiter, verifyTelegram, async (req, res) => {
  try {
    const { amount, method, destination } = req.body;
    if (!amount || amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (!method) {
      throw new Error('Withdrawal method required');
    }
    if (!destination) {
      throw new Error('Destination required');
    }

    const withdrawal = await withdrawalService.requestWithdrawal({
      telegramUser: req.telegramUser,
      amount,
      method,
      destination
    });
    sendSuccess(res, withdrawal, 201);
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
