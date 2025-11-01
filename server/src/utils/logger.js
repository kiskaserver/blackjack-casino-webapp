const morgan = require('morgan');

const SENSITIVE_KEYS = ['authorization', 'token', 'secret', 'password', 'key', 'signature'];

const sanitizeValue = value => {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.length <= 8) {
    return '***';
  }
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
};

const sanitizeMeta = meta => {
  if (!meta || typeof meta !== 'object') {
    return meta;
  }
  if (Array.isArray(meta)) {
    return meta.map(item => (typeof item === 'object' ? sanitizeMeta(item) : item));
  }
  const sanitized = {};
  Object.entries(meta).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = sanitizeValue(String(value));
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

const buildEntry = (level, msg, meta = {}) => {
  const sanitizedMeta = sanitizeMeta(meta);
  if (!sanitizedMeta || typeof sanitizedMeta !== 'object' || Array.isArray(sanitizedMeta)) {
    return JSON.stringify({ level, msg, meta: sanitizedMeta });
  }
  return JSON.stringify({ level, msg, ...sanitizedMeta });
};

const stream = {
  write: message => {
    process.stdout.write(message);
  }
};

morgan.token('safe-url', req => {
  if (!req.originalUrl) {
    return '';
  }
  const [path] = req.originalUrl.split('?');
  return path;
});

const loggerMiddleware = morgan(':remote-addr - :method :safe-url :status :res[content-length] - :response-time ms', {
  stream,
  skip: req => req.originalUrl === '/health'
});

const log = {
  info: (msg, meta) => console.log(buildEntry('info', msg, meta)),
  warn: (msg, meta) => console.warn(buildEntry('warn', msg, meta)),
  error: (msg, meta) => console.error(buildEntry('error', msg, meta))
};

module.exports = {
  loggerMiddleware,
  log
};
