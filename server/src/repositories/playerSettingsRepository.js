const db = require('../config/database');

const getPlayerSettings = async playerId => {
  const res = await db.query(
    `SELECT * FROM player_settings WHERE player_id = $1`,
    [playerId]
  );
  return res.rows[0] || null;
};

const upsertPlayerSettings = async ({ playerId, demoEnabled, demoInitialBalance, demoTopupThreshold, metadata = {} }) => {
  const res = await db.query(
    `INSERT INTO player_settings (player_id, demo_enabled, demo_initial_balance, demo_topup_threshold, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (player_id)
     DO UPDATE SET
       demo_enabled = COALESCE($2, player_settings.demo_enabled),
       demo_initial_balance = COALESCE($3, player_settings.demo_initial_balance),
       demo_topup_threshold = COALESCE($4, player_settings.demo_topup_threshold),
       metadata = COALESCE(player_settings.metadata, '{}'::jsonb) || $5::jsonb,
       updated_at = NOW()
     RETURNING *
    `,
    [playerId, demoEnabled, demoInitialBalance, demoTopupThreshold, JSON.stringify(metadata)]
  );
  return res.rows[0];
};

const deletePlayerSettings = async playerId => {
  await db.query(`DELETE FROM player_settings WHERE player_id = $1`, [playerId]);
};

module.exports = {
  getPlayerSettings,
  upsertPlayerSettings,
  deletePlayerSettings
};