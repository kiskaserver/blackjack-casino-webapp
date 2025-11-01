const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.security.requestLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = limiter;
