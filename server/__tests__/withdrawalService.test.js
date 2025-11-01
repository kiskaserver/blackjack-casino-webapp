const withdrawalService = require('../src/services/withdrawalService');

const mockBalanceService = {
  debitBalance: jest.fn()
};

const mockPlayerRepository = {
  getOrCreatePlayer: jest.fn()
};

const mockWithdrawalRepository = {
  createWithdrawal: jest.fn(),
  updateWithdrawalSchedule: jest.fn(),
  listWithdrawals: jest.fn(),
  updateWithdrawalStatus: jest.fn(),
  getWithdrawalById: jest.fn()
};

const mockBatchRepository = {
  getScheduledBatches: jest.fn(),
  updateBatchStatus: jest.fn(),
  assignWithdrawalsToBatch: jest.fn(),
  getWithdrawalsInBatch: jest.fn()
};

const mockSettingsService = {
  getSettings: jest.fn()
};

jest.mock('../src/services/balanceService', () => mockBalanceService);
jest.mock('../src/repositories/playerRepository', () => mockPlayerRepository);
jest.mock('../src/repositories/withdrawalRepository', () => mockWithdrawalRepository);
jest.mock('../src/repositories/batchRepository', () => mockBatchRepository);
jest.mock('../src/services/settingsService', () => mockSettingsService);

describe('Withdrawal Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestWithdrawal', () => {
    it('should create withdrawal request for crypto with batch processing', async () => {
      const telegramUser = {
        id: 123456789,
        username: 'testuser'
      };

      const mockPlayer = {
        id: 1,
        telegram_id: '123456789',
        trusted: false,
        status: 'active'
      };

      const mockSettings = {
        commission: {
          withdraw: {
            cryptomus: {
              platformPercent: 0.02,
              providerPercent: 0.01
            }
          }
        },
        payouts: {
          crypto: {
            autoApprovalThreshold: 200,
            manualReviewThreshold: 1000,
            cutoffHourUtc: 22,
            batchHourUtc: 23,
            allowUrgent: true,
            urgentFeePercent: 0.02
          }
        }
      };

      const mockDebitResult = {
        balance: 1000,
        realBalance: 1000,
        demoBalance: 5000
      };

      const mockWithdrawal = {
        id: 'withdrawal-123',
        player_id: 1,
        method: 'cryptomus',
        amount: 500,
        status: 'pending'
      };

      mockPlayerRepository.getOrCreatePlayer.mockResolvedValue(mockPlayer);
      mockSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockBalanceService.debitBalance.mockResolvedValue(mockDebitResult);
      mockWithdrawalRepository.createWithdrawal.mockResolvedValue(mockWithdrawal);
      mockWithdrawalRepository.updateWithdrawalSchedule.mockResolvedValue();

      const result = await withdrawalService.requestWithdrawal({
        telegramUser,
        amount: 500,
        method: 'cryptomus',
        destination: 'TQn9Y2khEsLMWD2ZweMs4b5UmFELs9v2nN',
        currency: 'USDT',
        network: 'TRC20'
      });

      expect(result.id).toBe('withdrawal-123');
      expect(mockBalanceService.debitBalance).toHaveBeenCalledWith({
        playerId: 1,
        amount: 500,
        reason: 'withdraw_cryptomus',
        referenceId: expect.any(String),
        walletType: 'real'
      });

      expect(mockWithdrawalRepository.createWithdrawal).toHaveBeenCalledWith({
        playerId: 1,
        method: 'cryptomus',
        amount: 500,
        platformFee: 10, // 500 * 0.02
        providerFee: 5, // 500 * 0.01
        netAmount: 485, // 500 - 10 - 5
        destination: 'TQn9Y2khEsLMWD2ZweMs4b5UmFELs9v2nN',
        currency: 'USDT',
        network: 'TRC20',
        priority: 'standard',
        isUrgent: false,
        processingMode: 'batch',
        kycRequired: false,
        metadata: expect.any(Object)
      });
    });

    it('should handle urgent withdrawals with additional fees', async () => {
      const telegramUser = { id: 123456789, username: 'testuser' };
      const mockPlayer = { id: 1, trusted: false, status: 'active' };
      const mockSettings = {
        commission: {
          withdraw: {
            cryptomus: { platformPercent: 0.02, providerPercent: 0.01 }
          }
        },
        payouts: {
          crypto: {
            autoApprovalThreshold: 200,
            allowUrgent: true,
            urgentFeePercent: 0.02
          }
        }
      };

      const mockDebitResult = { balance: 1000, realBalance: 1000, demoBalance: 5000 };
      const mockWithdrawal = { id: 'withdrawal-123', amount: 500 };

      mockPlayerRepository.getOrCreatePlayer.mockResolvedValue(mockPlayer);
      mockSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockBalanceService.debitBalance.mockResolvedValue(mockDebitResult);
      mockWithdrawalRepository.createWithdrawal.mockResolvedValue(mockWithdrawal);

      const result = await withdrawalService.requestWithdrawal({
        telegramUser,
        amount: 500,
        method: 'cryptomus',
        destination: 'TQn9Y2khEsLMWD2ZweMs4b5UmFELs9v2nN',
        isUrgent: true
      });

      expect(mockWithdrawalRepository.createWithdrawal).toHaveBeenCalledWith(
        expect.objectContaining({
          platformFee: 20, // (500 * 0.02) + (500 * 0.02 urgent fee)
          netAmount: 475, // 500 - 20 - 5
          isUrgent: true,
          processingMode: 'batch'
        })
      );
    });
  });

  describe('processDailyBatch', () => {
    it('should process scheduled withdrawal batches', async () => {
      const mockBatches = [
        {
          id: 'batch-1',
          scheduled_for: new Date(),
          status: 'scheduled'
        }
      ];

      const mockWithdrawals = [
        { id: 'w1', method: 'cryptomus', amount: 100 },
        { id: 'w2', method: 'cryptomus', amount: 200 }
      ];

      mockBatchRepository.getScheduledBatches.mockResolvedValue(mockBatches);
      mockWithdrawalRepository.listWithdrawals.mockResolvedValue(mockWithdrawals);
      mockBatchRepository.assignWithdrawalsToBatch.mockResolvedValue(2);
      mockBatchRepository.getWithdrawalsInBatch.mockResolvedValue(mockWithdrawals);
      mockBatchRepository.updateBatchStatus.mockResolvedValue();
      mockWithdrawalRepository.updateWithdrawalStatus.mockResolvedValue();

      const result = await withdrawalService.processDailyBatch();

      expect(result.processedBatches).toBe(1);
      expect(result.processedWithdrawals).toBe(2);
      expect(mockBatchRepository.updateBatchStatus).toHaveBeenCalledWith({
        batchId: 'batch-1',
        status: 'processing',
        metadata: { startedAt: expect.any(String) }
      });
    });
  });
});