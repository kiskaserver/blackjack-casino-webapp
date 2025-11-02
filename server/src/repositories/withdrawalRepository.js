const db = require('../config/database');

const createWithdrawal = async ({
  playerId,
  method,
  amount,
  platformFee,
  providerFee,
  netAmount,
  destination,
  currency,
  network,
  priority = 'standard',
  isUrgent = false,
  processingMode = 'batch',
  kycRequired = false,
  metadata
}) => {
  const res = await db.query(
    `INSERT INTO withdrawals (
       player_id, method, amount, platform_fee, provider_fee, net_amount, destination, 
       currency, network, priority, is_urgent, processing_mode, kyc_required, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
     RETURNING *
    `,
    [playerId, method, amount, platformFee, providerFee, netAmount, destination, 
     currency, network, priority, isUrgent, processingMode, kycRequired, JSON.stringify(metadata || {})]
  );
  return res.rows[0];
};

const getWithdrawalById = async id => {
  const res = await db.query(
    `SELECT w.*, p.telegram_id, p.username
     FROM withdrawals w
     JOIN players p ON p.id = w.player_id
     WHERE w.id = $1
    `,
    [id]
  );
  return res.rows[0] || null;
};

const updateWithdrawalSchedule = async ({ id, scheduledFor, processingMode }) => {
  const res = await db.query(
    `UPDATE withdrawals
     SET scheduled_for = $2,
         processing_mode = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [id, scheduledFor, processingMode]
  );
  return res.rows[0] || null;
};

const listWithdrawals = async ({ status, limit = 100, scheduledBefore, processingMode }) => {
  const clauses = [];
  const params = [];
  
  if (status) {
    clauses.push('w.status = $' + (params.length + 1));
    params.push(status);
  }
  
  if (scheduledBefore) {
    clauses.push('w.scheduled_for <= $' + (params.length + 1));
    params.push(scheduledBefore);
  }
  
  if (processingMode) {
    clauses.push('w.processing_mode = $' + (params.length + 1));
    params.push(processingMode);
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
         processed_at = CASE WHEN $2 IN ('approved', 'rejected', 'paid', 'failed') THEN NOW() ELSE processed_at END
     WHERE id = $1
     RETURNING *
    `,
    [id, status, JSON.stringify(metadata || {})]
  );
  return res.rows[0] || null;
};

module.exports = {
  createWithdrawal,
  getWithdrawalById,
  updateWithdrawalSchedule,
  listWithdrawals,
  updateWithdrawalStatus
};
