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

  const nowSeconds = Math.floor(Date.now() / 1000);
  const maxAgeSeconds = Math.max(30, Number(config.security?.telegramInitMaxAgeSeconds || 60));
  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate)) {
    return { isValid: false, reason: 'Telegram auth date missing', data };
  }

  const ageSeconds = nowSeconds - authDate;
  const isExpired = ageSeconds > maxAgeSeconds;

  return {
    isValid: true,
    data,
    authDate,
    ageSeconds,
    maxAgeSeconds,
    isExpired,
    reason: isExpired ? 'Telegram payload expired' : undefined
  };
};

const verifyTelegram = async (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  if (!initData) {
    return res.status(401).json({ success: false, error: 'Missing Telegram init data' });
  }

  try {
  const { isValid, data, reason, isExpired, authDate } = verifyTelegramWebAppData(initData);
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

    const baseCacheTtl = Math.max(30, Number(config.security?.telegramInitMaxAgeSeconds || 60));
    const reuseCacheTtl = Math.max(
      baseCacheTtl,
      Number(config.security?.telegramInitReuseTtlSeconds || 3600)
    );

    const dedupeKey = data.query_id || (data.hash ? `hash:${data.hash}` : null);

    if (isExpired) {
      if (!redis) {
        return res.status(401).json({ success: false, error: reason || 'Telegram payload expired' });
      }
      if (!dedupeKey) {
        return res.status(401).json({ success: false, error: reason || 'Telegram payload expired' });
      }

      const cacheKey = `${TELEGRAM_INIT_CACHE_PREFIX}${dedupeKey}`;
      const cachedValue = await redis.get(cacheKey);
      if (!cachedValue) {
        return res.status(401).json({ success: false, error: reason || 'Telegram payload expired' });
      }
      // Refresh TTL to keep session alive once it was validated
      try {
        await redis.expire(cacheKey, reuseCacheTtl);
      } catch (redisError) {
        log.warn('Не удалось обновить TTL Telegram init данных', {
          error: redisError.message,
          cacheKey
        });
      }
    }

    try {
      req.telegramUser = JSON.parse(data.user);
    } catch (parseError) {
      return res.status(401).json({ success: false, error: 'Telegram user payload invalid' });
    }

    if (redis && dedupeKey) {
      const cacheKey = `${TELEGRAM_INIT_CACHE_PREFIX}${dedupeKey}`;
      const cachePayload = JSON.stringify({
        userId: req.telegramUser?.id ?? null,
        authDate,
        refreshedAt: Date.now()
      });
      try {
        await redis.set(cacheKey, cachePayload, 'EX', reuseCacheTtl);
      } catch (redisError) {
        log.warn('Не удалось сохранить Telegram init данные в Redis', {
          error: redisError.message,
          cacheKey
        });
      }
    }

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
