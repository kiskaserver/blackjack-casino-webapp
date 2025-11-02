const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const config = require('./src/config/env');

const buildConnection = url => {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      database: parsed.pathname.replace(/^\//, ''),
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      ssl: config.databaseSsl
    };
  } catch (_error) {
    return {
      connectionString: url,
      ssl: config.databaseSsl
    };
  }
};

const defaultConnection = buildConnection(process.env.DATABASE_URL || 'postgresql://localhost:5432/blackjack');

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
    connection: buildConnection(process.env.DATABASE_URL) || defaultConnection
  },
  test: {
    ...baseConfig,
    connection: buildConnection(process.env.TEST_DATABASE_URL)
      || buildConnection(process.env.DATABASE_URL)
      || defaultConnection
  }
};
