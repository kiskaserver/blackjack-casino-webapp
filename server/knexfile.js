const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const defaultConnection = process.env.DATABASE_URL || 'postgresql://localhost:5432/blackjack';

const baseConfig = {
  client: 'pg',
  connection: defaultConnection,
  pool: { min: 0, max: 10 },
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    tableName: 'knex_migrations'
  }
};

module.exports = {
  development: { ...baseConfig },
  production: {
    ...baseConfig,
    connection: process.env.DATABASE_URL || defaultConnection
  },
  test: {
    ...baseConfig,
    connection: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || defaultConnection
  }
};
