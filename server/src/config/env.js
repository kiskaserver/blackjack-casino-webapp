const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const required = (value, name) => {
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5050),
  jwtSecret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
  adminPanelSecret: required(process.env.ADMIN_PANEL_SECRET, 'ADMIN_PANEL_SECRET'),
  databaseUrl: required(process.env.DATABASE_URL, 'DATABASE_URL'),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  cryptomus: {
    merchantId: required(process.env.CRYPTOMUS_MERCHANT_ID, 'CRYPTOMUS_MERCHANT_ID'),
    apiKey: required(process.env.CRYPTOMUS_API_KEY, 'CRYPTOMUS_API_KEY'),
    paymentUrl: process.env.CRYPTOMUS_PAYMENT_URL || 'https://api.cryptomus.com/v1/payment',
    paymentStatusUrl: process.env.CRYPTOMUS_STATUS_URL || 'https://api.cryptomus.com/v1/payment/info'
  },
  telegramStars: {
    providerToken: process.env.TELEGRAM_PROVIDER_TOKEN || '',
    botToken: required(process.env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN')
  },
  security: {
    requestLimitPerMinute: Number(process.env.REQUEST_LIMIT_PER_MINUTE || 120),
    ipWhitelist: (process.env.IP_WHITELIST || '')
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean)
  }
};
