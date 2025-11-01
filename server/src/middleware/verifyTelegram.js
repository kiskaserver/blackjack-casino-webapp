const crypto = require('crypto');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');
const { log } = require('../utils/logger');

const TELEGRAM_INIT_CACHE_PREFIX = 'telegram:init:';

const timingSafeEqualHex = (expectedHex, actualHex) => {
  if (!expectedHex || !actualHex) {
    return false;
  }
  try {
    const bufExpected = Buffer.from(expectedHex, 'hex');
    const bufActual = Buffer.from(actualHex, 'hex');
    if (bufExpected.length !== bufActual.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufExpected, bufActual);
  } catch (error) {
    return false;
  }
};

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
  if (!timingSafeEqualHex(hash, data.hash)) {
    return { isValid: false, reason: 'Invalid Telegram hash', data };
  }

  const maxAgeSeconds = Math.max(30, Number(config.security?.telegramInitMaxAgeSeconds || 60));
  const authDate = Number(data.auth_date);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || nowSeconds - authDate > maxAgeSeconds) {
    return { isValid: false, reason: 'Telegram payload expired', data };
  }

  return { isValid: true, data };
};

const verifyTelegram = async (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  if (!initData) {
    return res.status(401).json({ success: false, error: 'Missing Telegram init data' });
  }

  try {
    const { isValid, data, reason } = verifyTelegramWebAppData(initData);
    if (!isValid) {
      return res.status(401).json({ success: false, error: reason || 'Invalid Telegram signature' });
    }

    if (!data.user) {
      return res.status(401).json({ success: false, error: 'Telegram user payload missing' });
    }

    let redis;
    try {
      redis = getRedisClient();
    } catch (error) {
      log.warn('Redis недоступен для проверки Telegram init data', { error: error.message });
    }

    const cacheTtl = Math.max(30, Number(config.security?.telegramInitMaxAgeSeconds || 60));
    if (redis) {
      const dedupeKey = data.query_id || data.hash || data.user;
      if (dedupeKey) {
        const cacheKey = `${TELEGRAM_INIT_CACHE_PREFIX}${dedupeKey}`;
        const stored = await redis.set(cacheKey, '1', 'EX', cacheTtl, 'NX');
        if (stored !== 'OK') {
          return res.status(401).json({ success: false, error: 'Telegram payload replay detected' });
        }
      }
    }

    req.telegramUser = JSON.parse(data.user);
    next();
  } catch (error) {
    log.warn('Failed to verify Telegram init data', { error: error.message });
    return res.status(401).json({ success: false, error: 'Failed to verify Telegram init data' });
  }
};

module.exports = {
  verifyTelegram,
  verifyTelegramWebAppData
};
