const db = require('../config/database');

const createVerificationRequest = async ({
  playerId,
  documentType,
  documentNumber,
  country,
  documentFrontUrl,
  documentBackUrl,
  selfieUrl,
  additionalDocumentUrl,
  metadata = {}
}, client = null) => {
  const runner = client || db;
  const res = await runner.query(
    `INSERT INTO player_verifications (
       player_id,
       status,
       document_type,
       document_number,
       country,
       document_front_url,
       document_back_url,
       selfie_url,
       additional_document_url,
       metadata,
       submitted_at,
       created_at,
       updated_at
     ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW(), NOW())
     RETURNING *
    `,
    [
      playerId,
      documentType,
      documentNumber,
      country,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
      additionalDocumentUrl,
      JSON.stringify(metadata || {})
    ]
  );
  return res.rows[0];
};

const getLatestForPlayer = async (playerId, client = null) => {
  const runner = client || db;
  const res = await runner.query(
    `SELECT *
     FROM player_verifications
     WHERE player_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1
    `,
    [playerId]
  );
  return res.rows[0] || null;
};

const findPendingForPlayer = async (playerId, client = null) => {
  const runner = client || db;
  const res = await runner.query(
    `SELECT * FROM player_verifications
     WHERE player_id = $1 AND status = 'pending'
     ORDER BY submitted_at DESC
     LIMIT 1
    `,
    [playerId]
  );
  return res.rows[0] || null;
};

const getById = async (id, client = null) => {
  const runner = client || db;
  const res = await runner.query(
    `SELECT pv.*, p.telegram_id, p.username, p.first_name, p.last_name
     FROM player_verifications pv
     JOIN players p ON p.id = pv.player_id
     WHERE pv.id = $1
    `,
    [id]
  );
  return res.rows[0] || null;
};

const listVerifications = async ({ status, playerId, limit = 100 }, client = null) => {
  const runner = client || db;
  const params = [];
  const where = [];
  if (status) {
    params.push(status);
    where.push(`pv.status = $${params.length}`);
  }
  if (playerId) {
    params.push(playerId);
    where.push(`pv.player_id = $${params.length}`);
  }
  params.push(limit);
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const res = await runner.query(
    `SELECT pv.*, p.telegram_id, p.username, p.first_name, p.last_name
     FROM player_verifications pv
     JOIN players p ON p.id = pv.player_id
     ${whereClause}
     ORDER BY pv.submitted_at DESC
     LIMIT $${params.length}
    `,
    params
  );
  return res.rows;
};

const updateStatus = async ({ id, status, reviewedBy, note, rejectionReason }, client = null) => {
  const runner = client || db;
  const res = await runner.query(
    `UPDATE player_verifications
     SET status = $2,
         reviewed_by = $3,
         note = COALESCE($4, note),
         rejection_reason = $5,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *
    `,
    [id, status, reviewedBy || null, note || null, rejectionReason || null]
  );
  return res.rows[0] || null;
};

module.exports = {
  createVerificationRequest,
  getLatestForPlayer,
  findPendingForPlayer,
  getById,
  listVerifications,
  updateStatus
};
