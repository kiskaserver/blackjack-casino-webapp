const knexLib = require('knex');
const knexConfig = require('../../knexfile');
const config = require('./env');
const { log } = require('../utils/logger');

const resolveEnvironment = () => {
  if (process.env.KNEX_ENV) {
    return process.env.KNEX_ENV;
  }
  if (config.nodeEnv === 'test') {
    return 'test';
  }
  if (config.nodeEnv === 'production') {
    return 'production';
  }
  return 'development';
};

const runMigrations = async () => {
  const environment = resolveEnvironment();
  const envConfig = knexConfig[environment] || knexConfig.development;
  const knex = knexLib(envConfig);
  log.info('Running database migrations', { environment });
  try {
    await knex.migrate.latest();
    log.info('Database migrations complete');
  } catch (error) {
    log.error('Database migration failed', { error: error.message });
    throw error;
  } finally {
    await knex.destroy();
  }
};

module.exports = {
  runMigrations
};
