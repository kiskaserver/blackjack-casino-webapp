const fs = require('fs');
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

if (config.trustProxy !== false && config.trustProxy !== undefined && config.trustProxy !== null) {
  app.set('trust proxy', config.trustProxy);
  log.info('Trust proxy enabled', { value: config.trustProxy });
}

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
    if (headerName && !Object.prototype.hasOwnProperty.call(req.headers, headerName)) {
      req.headers[headerName] = 'true';
    }
    return next();
  });
}

const adminStaticPath = path.resolve(__dirname, '..', '..', 'admin');
app.use('/admin', express.static(adminStaticPath));

const clientStaticPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const clientIndexPath = path.join(clientStaticPath, 'index.html');
const serveClientBundle = fs.existsSync(clientIndexPath);

if (serveClientBundle) {
  app.use(express.static(clientStaticPath));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/game', gameRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/player', playerRoutes);

if (serveClientBundle) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
      return next();
    }
    return res.sendFile(clientIndexPath);
  });
}

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
