const db = require('../config/database');

const getRecentTransactions = async ({ limit = 100 }) => {
  const res = await db.query(
    `SELECT t.id, t.player_id, p.telegram_id, p.username, t.amount, t.reason, t.reference_id, t.wallet_type, t.created_at
     FROM transactions t
     JOIN players p ON p.id = t.player_id
     ORDER BY t.created_at DESC
     LIMIT $1
    `,
    [limit]
  );
  return res.rows;
};

const getAggregatedStats = async () => {
  const res = await db.query(`
    SELECT
      COUNT(DISTINCT p.id) AS players,
      COUNT(gr.round_id) FILTER (WHERE gr.wallet_type = 'real') AS rounds,
      COUNT(gr.round_id) FILTER (WHERE gr.wallet_type = 'demo') AS demo_rounds,
      COALESCE(SUM(gr.final_bet) FILTER (WHERE gr.wallet_type = 'real'), 0) AS total_bet,
      COALESCE(SUM(gr.final_bet) FILTER (WHERE gr.wallet_type = 'demo'), 0) AS demo_total_bet,
      COALESCE(SUM(gr.win_amount) FILTER (WHERE gr.wallet_type = 'real'), 0) AS total_paid,
      COALESCE(SUM(gr.win_amount) FILTER (WHERE gr.wallet_type = 'demo'), 0) AS demo_total_paid,
      COALESCE(SUM(t.amount) FILTER (WHERE t.wallet_type = 'real' AND t.reason LIKE 'deposit%' AND t.amount > 0), 0) AS total_deposit,
      COALESCE(SUM(t.amount) FILTER (WHERE t.wallet_type = 'real' AND t.reason LIKE 'withdraw%' AND t.amount < 0), 0) AS total_withdraw
    FROM players p
    LEFT JOIN game_rounds gr ON gr.player_id = p.id
    LEFT JOIN transactions t ON t.player_id = p.id
  `);

  return res.rows[0] || {};
};

module.exports = {
  getRecentTransactions,
  getAggregatedStats
};
