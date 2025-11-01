const { v4: uuidv4 } = require('uuid');
const playerRepository = require('../repositories/playerRepository');

const creditBalance = async ({ playerId, amount, reason, referenceId, walletType = 'real' }) => {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }
  const ref = referenceId || uuidv4();
  const result = await playerRepository.updateBalance({
    playerId,
    amount,
    reason,
    referenceId: ref,
    walletType
  });
  return {
    balance: result.walletBalance,
    walletType,
    realBalance: result.realBalance,
    demoBalance: result.demoBalance,
    referenceId: ref
  };
};

const debitBalance = async ({ playerId, amount, reason, referenceId, walletType = 'real' }) => {
  if (amount <= 0) {
    throw new Error('Debit amount must be positive');
  }
  const ref = referenceId || uuidv4();
  const result = await playerRepository.updateBalance({
    playerId,
    amount: amount * -1,
    reason,
    referenceId: ref,
    walletType
  });
  return {
    balance: result.walletBalance,
    walletType,
    realBalance: result.realBalance,
    demoBalance: result.demoBalance,
    referenceId: ref
  };
};

module.exports = {
  creditBalance,
  debitBalance
};
