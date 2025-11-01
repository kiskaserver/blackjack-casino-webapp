const db = require('../config/database');

const createWithdrawal = async ({
  playerId,
  method,
  amount,
  platformFee,
  providerFee,
  netAmount,
  destination,
  metadata
}) => {
  const res = await db.query(
    `INSERT INTO withdrawals (player_id, method, amount, platform_fee, provider_fee, net_amount, destination, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING *
    `,
    [playerId, method, amount, platformFee, providerFee, netAmount, destination, JSON.stringify(metadata || {})]
  );
  return res.rows[0];
};

const listWithdrawals = async ({ status, limit = 100 }) => {
  const clauses = [];
  const params = [];
  if (status) {
    clauses.push('status = $' + (params.length + 1));
    params.push(status);
  }
  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await db.query(
    `SELECT w.*, p.telegram_id, p.username
     FROM withdrawals w
     JOIN players p ON p.id = w.player_id
     ${where}
     ORDER BY w.created_at DESC
     LIMIT $${params.length}
    `,
    params
  );
  return res.rows;
};

const updateWithdrawalStatus = async ({ id, status, metadata }) => {
  const res = await db.query(
    `UPDATE withdrawals
     SET status = $2,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         processed_at = CASE WHEN $2 IN ('approved', 'rejected', 'paid') THEN NOW() ELSE processed_at END
     WHERE id = $1
     RETURNING *
    `,
    [id, status, JSON.stringify(metadata || {})]
  );
  return res.rows[0] || null;
};

module.exports = {
  createWithdrawal,
  listWithdrawals,
  updateWithdrawalStatus
};
