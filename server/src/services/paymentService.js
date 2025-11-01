const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const balanceService = require('./balanceService');
const playerRepository = require('../repositories/playerRepository');
const settingsService = require('./settingsService');
const paymentRepository = require('../repositories/paymentRepository');

const encodePayload = payload => Buffer.from(JSON.stringify(payload)).toString('base64');

const cryptomusSign = payload => {
  return crypto
    .createHash('md5')
    .update(encodePayload(payload) + config.cryptomus.apiKey)
    .digest('hex');
};

const createCryptomusInvoice = async ({ amount, currency = 'USDT', orderId, network = 'TRC20', telegramUser }) => {
  const userInfo = telegramUser || {};
  const player = await playerRepository.getOrCreatePlayer({
    telegramId: String(userInfo.id),
    username: userInfo.username,
    firstName: userInfo.first_name,
    lastName: userInfo.last_name
  });

  const payload = {
    amount: Number(amount).toFixed(2),
    currency,
    network,
    order_id: orderId || uuidv4(),
    url_callback: process.env.CRYPTOMUS_WEBHOOK_URL,
    subtract: 0
  };

  const headers = {
    merchant: config.cryptomus.merchantId,
    sign: cryptomusSign(payload)
  };

  const { data } = await axios.post(config.cryptomus.paymentUrl, payload, { headers });
  return { invoice: data.result, playerId: player.id };
};

const verifyCryptomusWebhook = ({ body, headers }) => {
  const { sign: signature } = headers;
  const expected = cryptomusSign(body);
  const valid = signature === expected && body.merchant === config.cryptomus.merchantId;
  return valid;
};

const handleCryptomusWebhook = async ({ body }) => {
  if (body.status !== 'paid') {
    return { ignored: true };
  }

  const referenceId = `cryptomus:${body.order_id}`;
  const amount = Number(body.amount);
  const telegramId = body.payer ? String(body.payer) : null;
  if (!telegramId) {
    throw new Error('Missing payer id in Cryptomus payload');
  }

  const player = await playerRepository.getOrCreatePlayer({
    telegramId,
    username: null,
    firstName: null,
    lastName: null
  });

  const settings = await settingsService.getSettings();
  const commission = settings.commission?.deposit?.cryptomus || {};
  const platformFee = amount * Number(commission.platformPercent || 0);
  const providerFee = amount * Number(commission.providerPercent || 0);
  const creditAmount = amount - platformFee - providerFee;
  if (creditAmount <= 0) {
    throw new Error('Deposit amount too small after fees');
  }

  await paymentRepository.recordEvent({
    provider: 'cryptomus',
    reference: referenceId,
    payload: body
  });

  const result = await balanceService.creditBalance({
    playerId: player.id,
    amount: creditAmount,
    reason: 'deposit_crypto',
    referenceId,
    walletType: 'real'
  });

  return {
    balance: result.balance,
    credited: creditAmount,
    platformFee,
    providerFee
  };
};

const createTelegramStarsInvoice = async ({ amount, description, payload }) => {
  const botUrl = `https://api.telegram.org/bot${config.telegramStars.botToken}/createInvoiceLink`;
  const requestPayload = {
    title: 'Blackjack Casino balance top-up',
    description: description || 'Deposit to in-game balance',
    payload: payload || uuidv4(),
    currency: 'XTR',
    prices: [{ label: 'Deposit', amount: amount }]
  };

  if (config.telegramStars.providerToken) {
    requestPayload.provider_token = config.telegramStars.providerToken;
  }

  const { data } = await axios.post(botUrl, requestPayload);
  if (!data.ok) {
    throw new Error(`Telegram Stars API error: ${data.description}`);
  }
  return data.result;
};

module.exports = {
  createCryptomusInvoice,
  verifyCryptomusWebhook,
  handleCryptomusWebhook,
  createTelegramStarsInvoice
};
