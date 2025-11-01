const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000
});

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
