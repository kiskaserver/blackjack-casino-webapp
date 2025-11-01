const crypto = require('crypto');
const config = require('../config/env');

const buildDataCheckString = data => {
  return Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
};

const verifyTelegramWebAppData = (initDataRaw = '') => {
  const urlSearchParams = new URLSearchParams(initDataRaw);
  const data = {};
  for (const [key, value] of urlSearchParams.entries()) {
    data[key] = value;
  }

  const checkString = buildDataCheckString(data);
  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.telegramStars.botToken)
    .digest();

  const hash = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  const isValid = hash === data.hash;

  return { isValid, data };
};

const verifyTelegram = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  if (!initData) {
    return res.status(401).json({ success: false, error: 'Missing Telegram init data' });
  }

  try {
    const { isValid, data } = verifyTelegramWebAppData(initData);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid Telegram signature' });
    }

    if (!data.user) {
      return res.status(401).json({ success: false, error: 'Telegram user payload missing' });
    }

    req.telegramUser = JSON.parse(data.user);
    next();
  } catch (error) {
    console.error('Failed to verify Telegram init data', error);
    return res.status(401).json({ success: false, error: 'Failed to verify Telegram init data' });
  }
};

module.exports = {
  verifyTelegram,
  verifyTelegramWebAppData
};
