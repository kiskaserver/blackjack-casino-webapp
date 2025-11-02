const fs = require('fs');
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

const parsePositiveInteger = (value, defaultValue, name) => {
  const base = value === undefined || value === null || String(value).trim() === ''
    ? undefined
    : Number(value);
  if (base === undefined) {
    return defaultValue;
  }
  if (!Number.isFinite(base) || base <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Math.floor(base);
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const resolveSecret = (inlineValue, filePath, name) => {
  if (filePath) {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
      return fs.readFileSync(absolutePath, 'utf8').trim();
    } catch (error) {
      throw new Error(`Failed to read ${name} from file ${filePath}: ${error.message}`);
    }
  }
  return inlineValue ? String(inlineValue).trim() : '';
};

const adminSecret = resolveSecret(
  process.env.ADMIN_PANEL_SECRET,
  process.env.ADMIN_PANEL_SECRET_FILE,
  'ADMIN_PANEL_SECRET'
);

const adminSecretHash = process.env.ADMIN_PANEL_SECRET_HASH
  ? String(process.env.ADMIN_PANEL_SECRET_HASH).trim()
  : '';

if (!adminSecret && !adminSecretHash) {
  throw new Error('Missing admin secret. Set ADMIN_PANEL_SECRET, ADMIN_PANEL_SECRET_FILE, or ADMIN_PANEL_SECRET_HASH');
}

const allowedOriginsRaw = process.env.ALLOWED_ORIGINS
  || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://localhost:5173');

const allowedOrigins = allowedOriginsRaw
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (!allowedOrigins.length && process.env.NODE_ENV === 'production') {
  throw new Error('ALLOWED_ORIGINS must be configured in production');
}

const verificationAllowedHosts = (process.env.VERIFICATION_ALLOWED_HOSTS || '')
  .split(',')
  .map(host => host.trim().toLowerCase())
  .filter(Boolean);

const requestLimitPerMinute = parsePositiveInteger(
  process.env.REQUEST_LIMIT_PER_MINUTE,
  120,
  'REQUEST_LIMIT_PER_MINUTE'
);

const ngrokHeaderName = process.env.NGROK_SKIP_HEADER || 'ngrok-skip-browser-warning';
const ngrokQueryParam = process.env.NGROK_SKIP_QUERY || 'ngrok-skip-browser-warning';

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5050),
  jwtSecret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
  adminPanelSecret: adminSecret,
  adminPanelSecretHash: adminSecretHash,
  databaseUrl: required(process.env.DATABASE_URL, 'DATABASE_URL'),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  cryptomus: {
    merchantId: required(process.env.CRYPTOMUS_MERCHANT_ID, 'CRYPTOMUS_MERCHANT_ID'),
    apiKey: required(process.env.CRYPTOMUS_API_KEY, 'CRYPTOMUS_API_KEY'),
    paymentUrl: process.env.CRYPTOMUS_PAYMENT_URL || 'https://api.cryptomus.com/v1/payment',
    paymentStatusUrl: process.env.CRYPTOMUS_STATUS_URL || 'https://api.cryptomus.com/v1/payment/info',
    payoutUrl: process.env.CRYPTOMUS_PAYOUT_URL || 'https://api.cryptomus.com/v1/payout',
    payoutStatusUrl: process.env.CRYPTOMUS_PAYOUT_STATUS_URL || 'https://api.cryptomus.com/v1/payout/info'
  },
  telegramStars: {
    providerToken: process.env.TELEGRAM_PROVIDER_TOKEN || '',
    botToken: required(process.env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN')
  },
  security: {
    requestLimitPerMinute,
    ipWhitelist: (process.env.IP_WHITELIST || '')
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean),
    allowedOrigins,
    adminSessionTtlSeconds: Number(process.env.ADMIN_SESSION_TTL_SECONDS || 3600),
    telegramInitMaxAgeSeconds: Number(process.env.TELEGRAM_INIT_MAX_AGE_SECONDS || 60),
    verificationAllowedHosts
  },
  ngrok: {
    enabled: parseBoolean(process.env.NGROK_MODE ?? process.env.USE_NGROK_MODE, false),
    headerName: ngrokHeaderName,
    queryParam: ngrokQueryParam
  }
};
