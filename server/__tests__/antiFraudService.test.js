const antiFraudService = require('../src/services/antiFraudService');

const mockDb = {
  query: jest.fn()
};

const mockSettingsService = {
  getSettings: jest.fn()
};

const mockRiskRepository = {
  createEvent: jest.fn()
};

const mockHouseRepository = {
  upsertOverride: jest.fn()
};

const mockPlayerRepository = {
  updateStatus: jest.fn()
};

jest.mock('../src/config/database', () => mockDb);
jest.mock('../src/services/settingsService', () => mockSettingsService);
jest.mock('../src/repositories/riskRepository', () => mockRiskRepository);
jest.mock('../src/repositories/houseRepository', () => mockHouseRepository);
jest.mock('../src/repositories/playerRepository', () => mockPlayerRepository);

describe('Anti-Fraud Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runVelocityCheck', () => {
    it('should detect high velocity players and flag them', async () => {
      const mockSettings = {
        antiFraud: {
          velocity: {
            enabled: true,
            threshold: 10,
            windowMinutes: 5,
            cooldownMinutes: 60
          },
          flaggedRigProbability: 0.3
        }
      };

      const mockQueryResult = {
        rows: [
          { player_id: 1, activity_count: 15 },
          { player_id: 2, activity_count: 12 }
        ]
      };

      mockDb.query.mockResolvedValue(mockQueryResult);

      const result = await antiFraudService.runVelocityCheck(mockSettings);

      expect(result.flaggedPlayers).toHaveLength(2);
      expect(mockRiskRepository.createEvent).toHaveBeenCalledTimes(2);
      expect(mockHouseRepository.upsertOverride).toHaveBeenCalledTimes(2);
      
      expect(mockRiskRepository.createEvent).toHaveBeenCalledWith({
        playerId: 1,
        eventType: 'velocity_threshold',
        severity: 'medium',
        payload: {
          windowMinutes: 5,
          threshold: 10,
          activityCount: 15
        }
      });
    });

    it('should skip check when velocity checking is disabled', async () => {
      const mockSettings = {
        antiFraud: {
          velocity: { enabled: false }
        }
      };

      const result = await antiFraudService.runVelocityCheck(mockSettings);

      expect(result.skipped).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('runDailyWinCapCheck', () => {
    it('should detect players exceeding daily win limits', async () => {
      const mockSettings = {
        antiFraud: {
          dailyWinCap: {
            enabled: true,
            maxNetProfit: 1000,
            cooldownHours: 24,
            timezone: 'UTC'
          },
          flaggedRigProbability: 0.5
        }
      };

      const mockQueryResult = {
        rows: [
          { 
            player_id: 1, 
            net_profit: 1500, 
            total_wagered: 2000, 
            total_won: 3500 
          },
          { 
            player_id: 2, 
            net_profit: 1200, 
            total_wagered: 1500, 
            total_won: 2700 
          }
        ]
      };

      mockDb.query.mockResolvedValue(mockQueryResult);

      const result = await antiFraudService.runDailyWinCapCheck(mockSettings);

      expect(result.flaggedPlayers).toHaveLength(2);
      expect(mockRiskRepository.createEvent).toHaveBeenCalledTimes(2);
      expect(mockHouseRepository.upsertOverride).toHaveBeenCalledTimes(2);
      expect(mockPlayerRepository.updateStatus).toHaveBeenCalledTimes(2);
      
      expect(mockRiskRepository.createEvent).toHaveBeenCalledWith({
        playerId: 1,
        eventType: 'profit_threshold',
        severity: 'high',
        payload: {
          netProfit: 1500,
          threshold: 1000,
          timezone: 'UTC',
          totalWagered: 2000,
          totalWon: 3500
        }
      });
    });

    it('should skip check when daily win cap is disabled', async () => {
      const mockSettings = {
        antiFraud: {
          dailyWinCap: { enabled: false }
        }
      };

      const result = await antiFraudService.runDailyWinCapCheck(mockSettings);

      expect(result.skipped).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });
});