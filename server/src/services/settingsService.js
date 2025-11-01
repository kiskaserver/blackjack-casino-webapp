const settingsRepository = require('../repositories/settingsRepository');

const defaultSettings = {
  payouts: {
    blackjackMultiplier: 1.5,
    winMultiplier: 1,
    pushReturn: 1,
    crypto: {
      autoApprovalThreshold: 200,
      manualReviewThreshold: 1000,
      urgentFeePercent: 0.02,
      allowUrgent: true,
      batchHourUtc: 23,
      cutoffHourUtc: 22
    }
  },
  house: {
    biasMode: 'fair', // fair | favor_house | favor_player
    rigProbability: 0.0
  },
  commission: {
    deposit: {
      cryptomus: { platformPercent: 0.02, providerPercent: 0.0 },
      telegram_stars: { platformPercent: 0.06, providerPercent: 0.30 }
    },
    withdraw: {
      cryptomus: { platformPercent: 0.02, providerPercent: 0.01 },
      telegram_stars: { platformPercent: 0.08, providerPercent: 0.35 }
    }
  },
  antiFraud: {
    velocity: {
      enabled: true,
      threshold: 15,
      windowMinutes: 10,
      intervalMinutes: 5,
      cooldownMinutes: 60
    },
    dailyWinCap: {
      enabled: true,
      maxNetProfit: 5000,
      checkIntervalMinutes: 30,
      cooldownHours: 24,
      timezone: 'UTC'
    },
    flaggedRigProbability: 0.5,
    sweepIntervalMinutes: 60
  },
  demo: {
    enabled: true,
    defaultBalance: 10000,
    topUpThreshold: 500,
    allowPlayerOverrides: true
  }
};

let cache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

const mergeDeep = (target, source) => {
  const merged = { ...target };
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      merged[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      merged[key] = source[key];
    }
  });
  return merged;
};

const getSettings = async () => {
  const now = Date.now();
  if (cache && now - cacheTimestamp < CACHE_TTL_MS) {
    return cache;
  }

  const stored = await settingsRepository.getAllSettings();
  const merged = Object.keys(stored).reduce((acc, key) => {
    if (defaultSettings[key]) {
      acc[key] = mergeDeep(defaultSettings[key], stored[key]);
    } else {
      acc[key] = stored[key];
    }
    return acc;
  }, {});

  cache = mergeDeep(defaultSettings, merged);
  cacheTimestamp = now;
  return cache;
};

const updateSettings = async updates => {
  const entries = Object.entries(updates || {});
  for (const [key, value] of entries) {
    if (!defaultSettings[key]) {
      throw new Error(`Unknown settings key: ${key}`);
    }
    await settingsRepository.upsertSetting(key, value);
  }
  cache = null;
};

module.exports = {
  getSettings,
  updateSettings,
  defaultSettings
};
