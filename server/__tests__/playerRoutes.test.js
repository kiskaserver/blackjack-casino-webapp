const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';
process.env.CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID || 'merchant-id';
process.env.CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY || 'api-key';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'telegram-token';
process.env.ADMIN_PANEL_SECRET = process.env.ADMIN_PANEL_SECRET || 'admin-secret';

jest.mock('../src/repositories/playerRepository', () => ({
  getOrCreatePlayer: jest.fn(),
  getPlayerStats: jest.fn()
}));

jest.mock('../src/services/settingsService', () => ({
  getSettings: jest.fn()
}));

jest.mock('../src/services/balanceService', () => ({
  creditBalance: jest.fn(),
  debitBalance: jest.fn()
}));
jest.mock('../src/middleware/verifyTelegram', () => ({
  verifyTelegram: (req, res, next) => {
    req.telegramUser = { id: 123456789, username: 'testuser' };
    next();
  }
}));
jest.mock('../src/middleware/rateLimiter', () => (req, res, next) => next());

const mockPlayerRepository = require('../src/repositories/playerRepository');
const mockSettingsService = require('../src/services/settingsService');
const mockBalanceService = require('../src/services/balanceService');

const playerRoutes = require('../src/routes/playerRoutes');

describe('Player Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/player', playerRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /api/player/profile', () => {
    it('should return player profile with stats and demo settings', async () => {
      const mockPlayer = {
        id: 1,
        telegram_id: '123456789',
        username: 'testuser',
        balance: 1000,
        demo_balance: 5000,
        level: 2
      };

      const mockStats = {
        totalGames: 10,
        wins: 6,
        losses: 4,
        wallets: {
          real: { totalGames: 5, wins: 3, losses: 2 },
          demo: { totalGames: 5, wins: 3, losses: 2 }
        }
      };

      const mockSettings = {
        demo: { defaultBalance: 10000, topUpThreshold: 500 }
      };

      mockPlayerRepository.getOrCreatePlayer.mockResolvedValue(mockPlayer);
      mockPlayerRepository.getPlayerStats.mockResolvedValue(mockStats);
      mockSettingsService.getSettings.mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/player/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.player).toEqual(mockPlayer);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(response.body.data.demo).toEqual(mockSettings.demo);
    });
  });

  describe('POST /api/player/demo/reset', () => {
    it('should reset demo balance to default amount', async () => {
      const mockPlayer = {
        id: 1,
        telegram_id: '123456789',
        demo_balance: 100,
        balance: 1000
      };

      const mockSettings = {
        demo: { defaultBalance: 10000, topUpThreshold: 500 }
      };

      const mockCreditResult = {
        balance: 10000,
        walletType: 'demo',
        realBalance: 1000,
        demoBalance: 10000
      };

      mockPlayerRepository.getOrCreatePlayer.mockResolvedValue(mockPlayer);
      mockSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockBalanceService.creditBalance.mockResolvedValue(mockCreditResult);

      const response = await request(app)
        .post('/api/player/demo/reset')
        .send({ target: 10000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(true);
      expect(response.body.data.balances.demo).toBe(10000);
      expect(mockBalanceService.creditBalance).toHaveBeenCalledWith({
        playerId: 1,
        amount: 9900, // 10000 - 100
        reason: 'demo_reset',
        referenceId: expect.any(String),
        walletType: 'demo'
      });
    });

    it('should handle demo balance debit when target is lower', async () => {
      const mockPlayer = {
        id: 1,
        telegram_id: '123456789',
        demo_balance: 15000,
        balance: 1000
      };

      const mockSettings = {
        demo: { defaultBalance: 10000, topUpThreshold: 500 }
      };

      const mockDebitResult = {
        balance: 10000,
        walletType: 'demo',
        realBalance: 1000,
        demoBalance: 10000
      };

      mockPlayerRepository.getOrCreatePlayer.mockResolvedValue(mockPlayer);
      mockSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockBalanceService.debitBalance.mockResolvedValue(mockDebitResult);

      const response = await request(app)
        .post('/api/player/demo/reset')
        .send({ target: 10000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(true);
      expect(mockBalanceService.debitBalance).toHaveBeenCalledWith({
        playerId: 1,
        amount: 5000, // 15000 - 10000
        reason: 'demo_reset',
        referenceId: expect.any(String),
        walletType: 'demo'
      });
    });
  });
});