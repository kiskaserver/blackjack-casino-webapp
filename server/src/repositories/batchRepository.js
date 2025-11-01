const db = require('../config/database');

const createBatch = async ({ scheduledFor, metadata = {} }) => {
  const res = await db.query(
    `INSERT INTO withdrawal_batches (scheduled_for, metadata)
     VALUES ($1, $2::jsonb)
     RETURNING *
    `,
    [scheduledFor, JSON.stringify(metadata)]
  );
  return res.rows[0];
};

const getBatchById = async batchId => {
  const res = await db.query(
    `SELECT * FROM withdrawal_batches WHERE id = $1`,
    [batchId]
  );
  return res.rows[0] || null;
};

const updateBatchStatus = async ({ batchId, status, metadata }) => {
  const res = await db.query(
    `UPDATE withdrawal_batches
     SET status = $2,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         processed_at = CASE WHEN $2 = 'processed' THEN NOW() ELSE processed_at END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [batchId, status, JSON.stringify(metadata || {})]
  );
  return res.rows[0] || null;
};

const getScheduledBatches = async () => {
  const res = await db.query(
    `SELECT * FROM withdrawal_batches
     WHERE status = 'scheduled'
       AND scheduled_for <= NOW()
     ORDER BY scheduled_for ASC
    `
  );
  return res.rows;
};

const assignWithdrawalsToBatch = async ({ batchId, withdrawalIds }) => {
  if (!withdrawalIds || !withdrawalIds.length) return 0;
  const res = await db.query(
    `UPDATE withdrawals
     SET batch_id = $1,
         processing_mode = 'batch',
         updated_at = NOW()
     WHERE id = ANY($2::uuid[])
       AND status = 'approved'
       AND batch_id IS NULL
     RETURNING id
    `,
    [batchId, withdrawalIds]
  );
  return res.rowCount;
};

const getWithdrawalsInBatch = async batchId => {
  const res = await db.query(
    `SELECT w.*, p.telegram_id, p.username
     FROM withdrawals w
     JOIN players p ON p.id = w.player_id
     WHERE w.batch_id = $1
     ORDER BY w.created_at ASC
    `,
    [batchId]
  );
  return res.rows;
};

module.exports = {
  createBatch,
  getBatchById,
  updateBatchStatus,
  getScheduledBatches,
  assignWithdrawalsToBatch,
  getWithdrawalsInBatch
};