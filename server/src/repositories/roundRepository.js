const db = require('../config/database');

const createRound = async ({
  roundId,
  playerId,
  baseBet,
  seed,
  seedCommit,
  playerCards,
  dealerCards,
  nextIndex,
  walletType
}) => {
  await db.query(
    `INSERT INTO game_rounds (
        round_id,
        player_id,
        base_bet,
        final_bet,
        double_down,
        seed,
        seed_commit,
        status,
        player_cards,
        dealer_cards,
        next_index,
        player_actions,
        wallet_type
     ) VALUES ($1, $2, $3, $3, false, $4, $5, 'pending', $6::jsonb, $7::jsonb, $8, '[]'::jsonb, $9)
    `,
    [roundId, playerId, baseBet, seed, seedCommit, JSON.stringify(playerCards), JSON.stringify(dealerCards), nextIndex, walletType || 'real']
  );
};

const getRoundById = async roundId => {
  const res = await db.query(
    `SELECT * FROM game_rounds WHERE round_id = $1`,
    [roundId]
  );
  return res.rows[0] || null;
};

const appendActionAndUpdateState = async ({
  roundId,
  playerCards,
  dealerCards,
  nextIndex,
  action
}) => {
  await db.query(
    `UPDATE game_rounds
     SET player_cards = $2::jsonb,
         dealer_cards = $3::jsonb,
         next_index = $4,
         player_actions = player_actions || $5::jsonb
     WHERE round_id = $1 AND status = 'pending'
    `,
    [roundId, JSON.stringify(playerCards), JSON.stringify(dealerCards), nextIndex, JSON.stringify([action])]
  );
};

const markDoubleDown = async ({ roundId, newFinalBet }) => {
  await db.query(
    `UPDATE game_rounds
     SET double_down = true,
         final_bet = $2
     WHERE round_id = $1
    `,
    [roundId, newFinalBet]
  );
};

const settleRound = async ({ roundId, result, winAmount, status = 'finished' }) => {
  await db.query(
    `UPDATE game_rounds
     SET result = $2,
         win_amount = $3,
         status = $4,
         settled_at = NOW()
     WHERE round_id = $1
    `,
    [roundId, result, winAmount, status]
  );
};

const listRecentRoundsForPlayer = async ({ playerId, limit = 25 }) => {
  const res = await db.query(
    `SELECT round_id, wallet_type, base_bet, final_bet, win_amount, result, status, created_at, settled_at
     FROM game_rounds
     WHERE player_id = $1
     ORDER BY created_at DESC
     LIMIT $2
    `,
    [playerId, limit]
  );
  return res.rows;
};

module.exports = {
  createRound,
  getRoundById,
  appendActionAndUpdateState,
  markDoubleDown,
  settleRound,
  listRecentRoundsForPlayer
};
