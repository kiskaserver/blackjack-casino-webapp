const { v4: uuidv4 } = require('uuid');
const balanceService = require('./balanceService');
const playerRepository = require('../repositories/playerRepository');
const withdrawalRepository = require('../repositories/withdrawalRepository');
const batchRepository = require('../repositories/batchRepository');
const settingsService = require('./settingsService');
const { log } = require('../utils/logger');

const supportedMethods = ['cryptomus', 'telegram_stars'];

const computeFees = (amount, config) => {
  const platformPercent = Number(config?.platformPercent || 0);
  const providerPercent = Number(config?.providerPercent || 0);
  const platformFee = amount * platformPercent;
  const providerFee = amount * providerPercent;
  const netAmount = amount - platformFee - providerFee;
  return {
    platformFee,
    providerFee,
    netAmount
  };
};

const determineProcessingMode = async (amount, method, player, settings) => {
  const crypto = settings.payouts?.crypto || {};
  const autoThreshold = Number(crypto.autoApprovalThreshold || 200);
  const manualThreshold = Number(crypto.manualReviewThreshold || 1000);
  
  // Check if player is trusted
  const isPlayerTrusted = player.trusted === true || player.status === 'verified';
  
  if (method === 'telegram_stars') {
    return { mode: 'auto', priority: 'standard' };
  }
  
  if (amount <= autoThreshold && isPlayerTrusted) {
    return { mode: 'auto', priority: 'standard' };
  }
  
  if (amount >= manualThreshold) {
    return { mode: 'batch', priority: 'high', kycRequired: true };
  }
  
  return { mode: 'batch', priority: 'standard' };
};

const scheduleWithdrawal = async (withdrawal, settings) => {
  const crypto = settings.payouts?.crypto || {};
  const cutoffHour = Number(crypto.cutoffHourUtc || 22);
  const batchHour = Number(crypto.batchHourUtc || 23);
  
  const now = new Date();
  const todayCutoff = new Date(now);
  todayCutoff.setUTCHours(cutoffHour, 0, 0, 0);
  
  const todayBatch = new Date(now);
  todayBatch.setUTCHours(batchHour, 0, 0, 0);
  
  const tomorrowBatch = new Date(todayBatch);
  tomorrowBatch.setUTCDate(tomorrowBatch.getUTCDate() + 1);
  
  const scheduledFor = now <= todayCutoff ? todayBatch : tomorrowBatch;
  
  await withdrawalRepository.updateWithdrawalSchedule({
    id: withdrawal.id,
    scheduledFor,
    processingMode: 'batch'
  });
  
  return scheduledFor;
};

const requestWithdrawal = async ({ telegramUser, amount, method, destination, currency, network, isUrgent = false }) => {
  if (!supportedMethods.includes(method)) {
    throw new Error('Unsupported withdrawal method');
  }

  const player = await playerRepository.getOrCreatePlayer({
    telegramId: String(telegramUser.id),
    username: telegramUser.username,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name
  });

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount');
  }

  const settings = await settingsService.getSettings();
  const feesConfig = settings.commission?.withdraw?.[method];
  if (!feesConfig) {
    throw new Error('Комиссия для выбранного метода не настроена');
  }

  const { platformFee, providerFee, netAmount } = computeFees(numericAmount, feesConfig);
  if (netAmount <= 0) {
    throw new Error('Сумма после вычета комиссий должна быть положительной');
  }

  // Determine processing mode
  const { mode, priority, kycRequired } = await determineProcessingMode(numericAmount, method, player, settings);
  
  // Handle urgent withdrawals
  const crypto = settings.payouts?.crypto || {};
  const allowUrgent = crypto.allowUrgent !== false;
  const urgentFeePercent = Number(crypto.urgentFeePercent || 0.02);
  
  let finalPlatformFee = platformFee;
  let finalNetAmount = netAmount;
  let finalIsUrgent = false;
  
  if (isUrgent && allowUrgent && method !== 'telegram_stars') {
    const urgentFee = numericAmount * urgentFeePercent;
    finalPlatformFee += urgentFee;
    finalNetAmount -= urgentFee;
    finalIsUrgent = true;
  }

  const debit = await balanceService.debitBalance({
    playerId: player.id,
    amount: numericAmount,
    reason: `withdraw_${method}`,
    referenceId: `${uuidv4()}:withdraw`,
    walletType: 'real'
  });

  const withdrawal = await withdrawalRepository.createWithdrawal({
    playerId: player.id,
    method,
    amount: numericAmount,
    platformFee: finalPlatformFee,
    providerFee,
    netAmount: finalNetAmount,
    destination,
    currency,
    network,
    priority,
    isUrgent: finalIsUrgent,
    processingMode: mode,
    kycRequired: kycRequired || false,
    metadata: { 
      balanceAfter: debit.balance,
      urgentFeeApplied: finalIsUrgent ? urgentFeePercent : 0
    }
  });

  // Schedule for batch processing if needed
  if (mode === 'batch' && !finalIsUrgent) {
    await scheduleWithdrawal(withdrawal, settings);
  }

  return withdrawal;
};

const processDailyBatch = async () => {
  const batches = await batchRepository.getScheduledBatches();
  let processedCount = 0;
  
  for (const batch of batches) {
    try {
      await batchRepository.updateBatchStatus({
        batchId: batch.id,
        status: 'processing',
        metadata: { startedAt: new Date().toISOString() }
      });
      
      // Find approved withdrawals ready for this batch
      const pendingWithdrawals = await withdrawalRepository.listWithdrawals({
        status: 'approved',
        scheduledBefore: batch.scheduled_for,
        processingMode: 'batch',
        limit: 1000
      });
      
      if (pendingWithdrawals.length === 0) {
        await batchRepository.updateBatchStatus({
          batchId: batch.id,
          status: 'completed',
          metadata: { withdrawalCount: 0, completedAt: new Date().toISOString() }
        });
        continue;
      }
      
      const withdrawalIds = pendingWithdrawals.map(w => w.id);
      const assigned = await batchRepository.assignWithdrawalsToBatch({
        batchId: batch.id,
        withdrawalIds
      });
      
      // Process crypto withdrawals
      await processCryptoBatch(batch.id);
      
      await batchRepository.updateBatchStatus({
        batchId: batch.id,
        status: 'completed',
        metadata: { 
          withdrawalCount: assigned,
          completedAt: new Date().toISOString()
        }
      });
      
      processedCount += assigned;
      log.info('Batch processed', { batchId: batch.id, withdrawalCount: assigned });
      
    } catch (error) {
      log.error('Batch processing failed', { batchId: batch.id, error: error.message });
      await batchRepository.updateBatchStatus({
        batchId: batch.id,
        status: 'failed',
        metadata: { 
          error: error.message,
          failedAt: new Date().toISOString()
        }
      });
    }
  }
  
  return { processedBatches: batches.length, processedWithdrawals: processedCount };
};

const processCryptoBatch = async batchId => {
  const withdrawals = await batchRepository.getWithdrawalsInBatch(batchId);
  const cryptoWithdrawals = withdrawals.filter(w => w.method === 'cryptomus');
  
  // Group by currency and network for batch optimization
  const groups = {};
  for (const withdrawal of cryptoWithdrawals) {
    const key = `${withdrawal.currency || 'USDT'}_${withdrawal.network || 'TRC20'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(withdrawal);
  }
  
  // Process each group
  for (const [groupKey, groupWithdrawals] of Object.entries(groups)) {
    try {
      await processCryptoGroup(groupWithdrawals);
    } catch (error) {
      log.error('Crypto group processing failed', { groupKey, count: groupWithdrawals.length, error: error.message });
      
      // Mark withdrawals as failed
      for (const withdrawal of groupWithdrawals) {
        await withdrawalRepository.updateWithdrawalStatus({
          id: withdrawal.id,
          status: 'failed',
          metadata: { batchError: error.message }
        });
      }
    }
  }
};

const processCryptoGroup = async withdrawals => {
  // Implement actual crypto processing logic here
  // This is a placeholder that marks withdrawals as processed
  for (const withdrawal of withdrawals) {
    await withdrawalRepository.updateWithdrawalStatus({
      id: withdrawal.id,
      status: 'processing',
      metadata: { 
        batchProcessedAt: new Date().toISOString(),
        txHash: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await withdrawalRepository.updateWithdrawalStatus({
      id: withdrawal.id,
      status: 'paid',
      metadata: { 
        completedAt: new Date().toISOString()
      }
    });
  }
};

const processWithdrawalJob = async withdrawalId => {
  if (!withdrawalId) {
    throw new Error('Withdrawal ID required');
  }
  
  const withdrawal = await withdrawalRepository.getWithdrawalById(withdrawalId);
  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }
  
  if (withdrawal.status !== 'approved') {
    return { skipped: true, reason: 'not approved' };
  }
  
  // Process urgent or auto-approved withdrawals immediately
  if (withdrawal.is_urgent || withdrawal.processing_mode === 'auto') {
    await processCryptoGroup([withdrawal]);
    return { processed: true, mode: withdrawal.processing_mode };
  }
  
  return { skipped: true, reason: 'not urgent' };
};

const enqueueUrgentReviewJob = async withdrawalId => {
  if (!withdrawalId) {
    throw new Error('Withdrawal ID required');
  }
  
  const withdrawal = await withdrawalRepository.getWithdrawalById(withdrawalId);
  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }
  
  // Mark for urgent review
  await withdrawalRepository.updateWithdrawalStatus({
    id: withdrawalId,
    status: 'pending',
    metadata: { 
      urgentReview: true,
      reviewRequestedAt: new Date().toISOString()
    }
  });
  
  return { queued: true };
};

const listWithdrawals = async ({ status, limit }) => {
  return withdrawalRepository.listWithdrawals({ status, limit });
};

const updateWithdrawalStatus = async ({ id, status, note }) => {
  const allowed = ['pending', 'approved', 'rejected', 'paid', 'processing', 'failed'];
  if (!allowed.includes(status)) {
    throw new Error('Invalid withdrawal status');
  }
  const updated = await withdrawalRepository.updateWithdrawalStatus({
    id,
    status,
    metadata: note ? { note } : {}
  });
  if (!updated) {
    throw new Error('Withdrawal not found');
  }
  return updated;
};

module.exports = {
  requestWithdrawal,
  listWithdrawals,
  updateWithdrawalStatus
};
