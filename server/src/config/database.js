const { Pool } = require('pg');
const config = require('./env');

const buildPoolConfig = () => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  try {
    const parsed = new URL(config.databaseUrl);
    const connection = {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      database: parsed.pathname.replace(/^\//, ''),
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      max: 10,
      idleTimeoutMillis: 30_000
    };

    if (config.databaseSsl !== undefined) {
      connection.ssl = config.databaseSsl;
    }

    return connection;
  } catch (_error) {
    const fallback = {
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000
    };

    if (config.databaseSsl !== undefined) {
      fallback.ssl = config.databaseSsl;
    }

    return fallback;
  }
};

const pool = new Pool(buildPoolConfig());

const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query failed', { text, error });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query
};
