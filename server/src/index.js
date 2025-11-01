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

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(loggerMiddleware);

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
