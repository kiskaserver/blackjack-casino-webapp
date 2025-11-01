const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const DEFAULT_MAX = Math.max(20, Math.floor((config.security.requestLimitPerMinute || 60) / 2));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: DEFAULT_MAX,
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.'
  }
});

module.exports = {
  generalLimiter,
  loginLimiter
};
