const morgan = require('morgan');

const stream = {
  write: message => {
    process.stdout.write(message);
  }
};

const loggerMiddleware = morgan('combined', { stream });

const log = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', msg, ...meta }))
};

module.exports = {
  loggerMiddleware,
  log
};
