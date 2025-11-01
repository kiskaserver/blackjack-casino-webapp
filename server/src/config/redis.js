const Redis = require('ioredis');
const config = require('./env');

let singletonClient = null;

const createClient = () => {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });

  client.on('error', error => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Redis connection error', error);
    }
  });

  return client;
};

const getRedisClient = () => {
  if (!singletonClient) {
    singletonClient = createClient();
  }
  return singletonClient;
};

const closeRedisClient = async () => {
  if (singletonClient) {
    await singletonClient.quit();
    singletonClient = null;
  }
};

const getBullConnection = () => ({
  connectionString: config.redisUrl,
  maxRetriesPerRequest: null
});

module.exports = {
  getRedisClient,
  closeRedisClient,
  getBullConnection
};
