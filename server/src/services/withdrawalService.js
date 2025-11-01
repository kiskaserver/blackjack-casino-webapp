const { v4: uuidv4 } = require('uuid');
const balanceService = require('./balanceService');
const playerRepository = require('../repositories/playerRepository');
const withdrawalRepository = require('../repositories/withdrawalRepository');
const settingsService = require('./settingsService');

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

const requestWithdrawal = async ({ telegramUser, amount, method, destination }) => {
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
    platformFee,
    providerFee,
    netAmount,
    destination,
    metadata: { balanceAfter: debit.balance }
  });

  return withdrawal;
};

const listWithdrawals = async ({ status, limit }) => {
  return withdrawalRepository.listWithdrawals({ status, limit });
};

const updateWithdrawalStatus = async ({ id, status, note }) => {
  const allowed = ['pending', 'approved', 'rejected', 'paid'];
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
