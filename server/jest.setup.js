require('dotenv').config({ path: '.env.test' });

// Mock Redis to avoid connection issues in tests
jest.mock('./src/config/redis', () => ({
  getRedisClient: () => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue()
  }),
  closeRedisClient: jest.fn().mockResolvedValue(),
  getBullConnection: () => ({
    connectionString: 'redis://localhost:6379',
    maxRetriesPerRequest: null
  })
}));

// Set test timeout
jest.setTimeout(30000);