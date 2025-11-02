const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const balanceService = require('./balanceService');
const playerRepository = require('../repositories/playerRepository');
const roundRepository = require('../repositories/roundRepository');
const settingsService = require('./settingsService');

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const WALLET_TYPES = {
  REAL: 'real',
  DEMO: 'demo'
};

const MIN_DECKS = 1;
const MAX_DECKS = 8;
const DEFAULT_DECK_COUNT = 6;

const clampDeckCount = value => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_DECK_COUNT;
  }
  return Math.min(MAX_DECKS, Math.max(MIN_DECKS, Math.floor(numeric)));
};

const parseSeedConfig = rawSeed => {
  const seedString = typeof rawSeed === 'string' ? rawSeed : String(rawSeed || '');
  const separatorIndex = seedString.indexOf('|');
  if (separatorIndex === -1) {
    const fallback = seedString || 'legacy';
    return {
      deckCount: MIN_DECKS,
      baseSeed: fallback,
      hashSource: fallback
    };
  }

  const deckCountRaw = seedString.slice(0, separatorIndex);
  const baseSeed = seedString.slice(separatorIndex + 1) || 'default';
  const deckCount = clampDeckCount(deckCountRaw);
  return {
    deckCount,
    baseSeed,
    hashSource: `${deckCount}|${baseSeed}`
  };
};

const buildShoe = deckCount => {
  const shoe = [];
  const normalized = clampDeckCount(deckCount);
  for (let deckIndex = 0; deckIndex < normalized; deckIndex += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        shoe.push({ suit, rank });
      }
    }
  }
  return shoe;
};

const normalizeWalletType = value => (value === WALLET_TYPES.DEMO ? WALLET_TYPES.DEMO : WALLET_TYPES.REAL);

const getPlayerBalances = player => ({
  real: Number(player.balance || 0),
  demo: Number(player.demo_balance || 0)
});

const getCardValue = rank => {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return Number(rank);
};

const calculateScore = cards => {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.hidden) continue;
    const value = getCardValue(card.rank);
    score += value;
    if (card.rank === 'A') aces += 1;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
};

const isSoftHand = cards => {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.hidden) continue;
    score += getCardValue(card.rank);
    if (card.rank === 'A') {
      aces += 1;
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return aces > 0;
};

const isBlackjack = cards => cards.length === 2 && calculateScore(cards) === 21;

const buildDeck = seed => {
  const { deckCount, hashSource } = parseSeedConfig(seed);
  const deck = buildShoe(deckCount);

  let hash = crypto.createHash('sha512').update(hashSource).digest();
  for (let i = deck.length - 1; i > 0; i--) {
    if (i % hash.length === 0) {
      hash = crypto.createHash('sha512').update(hash).digest();
    }
    const randomNumber = hash[i % hash.length];
    const j = randomNumber % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

const maskDealerCards = (dealerCards, status) => {
  if (status !== 'pending') {
    return dealerCards.map(card => ({ ...card, hidden: false }));
  }
  return dealerCards.map((card, index) => (index === 1 ? { ...card, hidden: true } : { ...card, hidden: false }));
};

const buildRoundPayload = ({ round, balances }) => {
  const walletType = normalizeWalletType(round.wallet_type);
  const currentBalances = {
    real: Number(balances?.real ?? 0),
    demo: Number(balances?.demo ?? 0)
  };
  const playerCards = round.player_cards;
  const dealerCards = maskDealerCards(round.dealer_cards, round.status);
  const playerScore = calculateScore(playerCards);
  const dealerScore = round.status === 'pending'
    ? calculateScore([dealerCards[0]])
    : calculateScore(dealerCards);

  return {
    roundId: round.round_id,
    status: round.status,
    walletType,
    playerCards,
    dealerCards,
    playerScore,
    dealerScore,
    balance: walletType === WALLET_TYPES.DEMO ? currentBalances.demo : currentBalances.real,
    balances: currentBalances,
    doubleDown: round.double_down,
    baseBet: Number(round.base_bet),
    finalBet: Number(round.final_bet),
    result: round.result,
    winAmount: Number(round.win_amount || 0)
  };
};

const settleFinancials = async ({ round, playerId, result, settings, walletType }) => {
  const payouts = settings.payouts;
  const baseBet = Number(round.base_bet);
  const finalBet = Number(round.final_bet);
  let winAmount = 0;

  if (result === 'blackjack') {
    winAmount = baseBet * (1 + payouts.blackjackMultiplier);
  } else if (result === 'win') {
    winAmount = finalBet * (1 + payouts.winMultiplier);
  } else if (result === 'push') {
    winAmount = finalBet * payouts.pushReturn;
  }

  let balances;
  if (winAmount > 0) {
    const credit = await balanceService.creditBalance({
      playerId,
      amount: winAmount,
      reason: `round_${result}`,
      referenceId: `${round.round_id}:payout`,
      walletType
    });
    balances = {
      real: credit.realBalance,
      demo: credit.demoBalance
    };
  } else {
    const player = await playerRepository.getPlayerById(playerId);
    balances = getPlayerBalances(player);
  }

  await roundRepository.settleRound({ roundId: round.round_id, result, winAmount });
  return { winAmount, balances };
};

const revealDealerHoleCard = dealerCards => dealerCards.map((card, index) => (
  index === 1 ? { ...card, hidden: false } : { ...card, hidden: card.hidden }
));

const dealerShouldHit = (cards, gameplay) => {
  const score = calculateScore(cards);
  if (score < 17) {
    return true;
  }
  if (score > 17) {
    return false;
  }
  if (!gameplay?.dealerHitsSoft17) {
    return false;
  }
  return isSoftHand(cards);
};

const runDealerPlay = (round, deck, gameplay) => {
  const dealerCards = revealDealerHoleCard(round.dealer_cards);
  let nextIndex = round.next_index;
  while (dealerShouldHit(dealerCards, gameplay) && nextIndex < deck.length) {
    const nextCard = deck[nextIndex];
    dealerCards.push({ ...nextCard, hidden: false });
    nextIndex += 1;
  }

  const dealerScore = calculateScore(dealerCards);
  return { dealerCards, nextIndex, dealerScore };
};

const determineResult = ({ playerScore, dealerScore, playerBlackjack }) => {
  if (playerScore > 21) {
    return 'bust';
  }
  if (dealerScore > 21) {
    return playerBlackjack ? 'blackjack' : 'win';
  }
  if (playerBlackjack && dealerScore !== 21) {
    return 'blackjack';
  }
  if (playerScore > dealerScore) {
    return 'win';
  }
  if (playerScore === dealerScore) {
    return 'push';
  }
  return 'lose';
};

const fetchRoundAndPlayer = async (roundId, expectedTelegramId) => {
  const round = await roundRepository.getRoundById(roundId);
  if (!round) {
    throw new Error('Round not found');
  }
  const player = await playerRepository.getPlayerById(round.player_id);
  if (!player) {
    throw new Error('Player not found');
  }
  if (expectedTelegramId && String(player.telegram_id) !== String(expectedTelegramId)) {
    throw new Error('Access denied for this round');
  }
  return { round, player };
};

const startRound = async ({ telegramUser, betAmount, walletType }) => {
  const userInfo = telegramUser || {};
  const player = await playerRepository.getOrCreatePlayer({
    telegramId: String(userInfo.id),
    username: userInfo.username,
    firstName: userInfo.first_name,
    lastName: userInfo.last_name
  });

  const mode = normalizeWalletType(walletType);
  const balancesBefore = getPlayerBalances(player);

  const numericBet = Number(betAmount);
  if (!Number.isFinite(numericBet) || numericBet <= 0) {
    throw new Error('Invalid bet amount');
  }
  const availableBalance = mode === WALLET_TYPES.DEMO ? balancesBefore.demo : balancesBefore.real;
  if (availableBalance < numericBet) {
    throw new Error(mode === WALLET_TYPES.DEMO ? 'Недостаточно средств на демо-счете' : 'Недостаточно средств для ставки');
  }

  const settings = await settingsService.getSettings();
  const gameplay = settings.gameplay || {};
  const deckCount = clampDeckCount(gameplay.deckCount ?? DEFAULT_DECK_COUNT);

  const randomSeed = crypto.randomBytes(32).toString('hex');
  const seed = `${deckCount}|${randomSeed}`;
  const roundId = uuidv4();
  const deck = buildDeck(seed);
  const commit = crypto.createHash('sha256').update(seed).digest('hex');

  const playerCards = [deck[0], deck[2]].map(card => ({ ...card, hidden: false }));
  const dealerCards = [deck[1], { ...deck[3], hidden: true }];
  const nextIndex = 4;

  const debit = await balanceService.debitBalance({
    playerId: player.id,
    amount: numericBet,
    reason: 'bet_wager',
    referenceId: `${roundId}:bet`,
    walletType: mode
  });

  await roundRepository.createRound({
    roundId,
    playerId: player.id,
    baseBet: numericBet,
    seed,
    seedCommit: commit,
    playerCards,
    dealerCards,
    nextIndex,
    walletType: mode
  });

  const round = await roundRepository.getRoundById(roundId);
  return buildRoundPayload({
    round,
    balances: {
      real: debit.realBalance,
      demo: debit.demoBalance
    }
  });
};

const hitRound = async ({ roundId, telegramUser }) => {
  const { round, player } = await fetchRoundAndPlayer(roundId, telegramUser?.id);
  if (round.status !== 'pending') {
    throw new Error('Round already finished');
  }

  const deck = buildDeck(round.seed);
  if (round.next_index >= deck.length) {
    throw new Error('Deck exhausted');
  }

  const nextCard = deck[round.next_index];
  const playerCards = [...round.player_cards, { ...nextCard, hidden: false }];
  const dealerCards = round.dealer_cards;
  const nextIndex = round.next_index + 1;

  await roundRepository.appendActionAndUpdateState({
    roundId,
    playerCards,
    dealerCards,
    nextIndex,
    action: { type: 'hit', timestamp: Date.now() }
  });

  const updatedRound = await roundRepository.getRoundById(roundId);
  const playerScore = calculateScore(updatedRound.player_cards);
  const balances = getPlayerBalances(await playerRepository.getPlayerById(player.id));

  if (playerScore > 21) {
    await roundRepository.settleRound({ roundId, result: 'bust', winAmount: 0, status: 'finished' });
    const finalRound = await roundRepository.getRoundById(roundId);
    const finalState = buildRoundPayload({ round: finalRound, balances });
    return { ...finalState, message: '💥 Перебор! Вы проиграли.' };
  }

  return { ...buildRoundPayload({ round: updatedRound, balances }), message: 'Вы взяли карту' };
};

const doubleDown = async ({ roundId, telegramUser }) => {
  const { round, player } = await fetchRoundAndPlayer(roundId, telegramUser?.id);
  if (round.status !== 'pending') {
    throw new Error('Round already завершен');
  }
  if (round.player_cards.length !== 2) {
    throw new Error('Удвоение доступно только на первых двух картах');
  }
  if (round.double_down) {
    throw new Error('Удвоение уже выполнено');
  }

  const deck = buildDeck(round.seed);
  const betIncrease = Number(round.base_bet);

  const debit = await balanceService.debitBalance({
    playerId: player.id,
    amount: betIncrease,
    reason: 'bet_double',
    referenceId: `${round.round_id}:double`,
    walletType: normalizeWalletType(round.wallet_type)
  });

  const nextCard = deck[round.next_index];
  const playerCards = [...round.player_cards, { ...nextCard, hidden: false }];
  const dealerCards = round.dealer_cards;
  const nextIndex = round.next_index + 1;

  await roundRepository.appendActionAndUpdateState({
    roundId,
    playerCards,
    dealerCards,
    nextIndex,
    action: { type: 'double', timestamp: Date.now() }
  });
  await roundRepository.markDoubleDown({ roundId, newFinalBet: Number(round.base_bet) * 2 });

  return settleRound({ roundId });
};

const settleRound = async ({ roundId, telegramUser }) => {
  const { round, player } = await fetchRoundAndPlayer(roundId, telegramUser?.id);
  if (round.status !== 'pending') {
    return buildRoundPayload({ round, balances: getPlayerBalances(player) });
  }

  const settings = await settingsService.getSettings();
  const gameplay = settings.gameplay || {};

  const deck = buildDeck(round.seed);
  const playerCards = round.player_cards;
  const playerScore = calculateScore(playerCards);
  const playerBlackjack = isBlackjack(playerCards);

  const dealerPlay = runDealerPlay(round, deck, gameplay);

  await roundRepository.appendActionAndUpdateState({
    roundId,
    playerCards,
    dealerCards: dealerPlay.dealerCards,
    nextIndex: dealerPlay.nextIndex,
    action: { type: 'settle', timestamp: Date.now() }
  });

  const updatedRound = await roundRepository.getRoundById(roundId);
  const dealerScore = dealerPlay.dealerScore;
  const result = determineResult({ playerScore, dealerScore, playerBlackjack });

  const { winAmount, balances } = await settleFinancials({
    round: updatedRound,
    playerId: player.id,
    result,
    settings,
    walletType: normalizeWalletType(round.wallet_type)
  });
  const latestRound = await roundRepository.getRoundById(roundId);
  const refreshedPlayer = await playerRepository.getPlayerById(player.id);
  const payload = buildRoundPayload({ round: latestRound, balances: balances || getPlayerBalances(refreshedPlayer) });
  return { ...payload, message: resultMessage(result, winAmount) };
};

const resultMessage = (result, winAmount) => {
  switch (result) {
    case 'blackjack':
      return `🎉 Блэкджек! Выигрыш ${winAmount.toFixed(2)} 💎`;
    case 'win':
      return `🎊 Победа! Вы получили ${winAmount.toFixed(2)} 💎`;
    case 'push':
      return '🤝 Ничья. Ставка возвращена.';
    case 'bust':
    case 'lose':
    default:
      return '😔 Поражение. Попробуйте снова!';
  }
};

module.exports = {
  startRound,
  hitRound,
  doubleDown,
  settleRound,
  buildDeck
};
