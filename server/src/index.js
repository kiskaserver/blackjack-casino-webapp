const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const config = require('./config/env');
const { loggerMiddleware, log } = require('./utils/logger');
const gameRoutes = require('./routes/gameRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const playerRoutes = require('./routes/playerRoutes');
const { runMigrations } = require('./config/migrations');
const { ensureRiskSchedules } = require('./jobs/riskQueue');
const { ensurePayoutSchedules } = require('./jobs/payoutQueue');

const app = express();

const allowedOrigins = config.security.allowedOrigins || [];
if (allowedOrigins.length) {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, origin || true);
      }
      if (allowedOrigins.some(allowed => origin && origin.endsWith(`.${allowed}`))) {
        return callback(null, origin);
      }
      log.warn('Blocked CORS origin', { origin });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
} else {
  if (config.nodeEnv === 'production') {
    log.warn('No ALLOWED_ORIGINS configured; rejecting cross-origin requests');
    app.use(cors({ origin: false }));
  } else {
    app.use(cors({ credentials: true }));
  }
}

app.use(helmet());
app.use(bodyParser.json({
  verify: (req, _res, buffer) => {
    if (buffer?.length) {
      req.rawBody = Buffer.from(buffer);
    }
  }
}));
app.use(loggerMiddleware);

if (config.ngrok?.enabled) {
  app.use((req, res, next) => {
    if (config.ngrok.headerName) {
      res.set(config.ngrok.headerName, 'true');
    }
    const headerName = (config.ngrok.headerName || '').toLowerCase();
    const queryParam = config.ngrok.queryParam || 'ngrok-skip-browser-warning';
    const hasHeader = headerName ? Object.prototype.hasOwnProperty.call(req.headers, headerName) : false;
    const hasQuery = req.query && Object.prototype.hasOwnProperty.call(req.query, queryParam);

  const isRedirectMethod = req.method === 'GET' || req.method === 'HEAD';
  if (!hasHeader && !hasQuery && isRedirectMethod) {
      const separator = req.originalUrl.includes('?') ? '&' : '?';
      const location = `${req.originalUrl}${separator}${queryParam}=true`;
      return res.redirect(302, location);
    }

    return next();
  });
}

const adminStaticPath = path.resolve(__dirname, '..', '..', 'admin');
app.use('/admin', express.static(adminStaticPath));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/game', gameRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/player', playerRoutes);

app.use((err, _req, res, _next) => {
  log.error('Unhandled error', { error: err.message });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const bootstrap = async () => {
  try {
    await runMigrations();
    await Promise.all([
      ensureRiskSchedules(),
      ensurePayoutSchedules()
    ]);

    app.listen(config.port, () => {
      log.info('Server started', { port: config.port, env: config.nodeEnv });
    });
  } catch (error) {
    log.error('Failed to bootstrap server', { error: error.message });
    process.exit(1);
  }
};

bootstrap();
