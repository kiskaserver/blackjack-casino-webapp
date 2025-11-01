const db = require('../config/database');

const getOverrideForPlayer = async playerId => {
  const res = await db.query(
    `SELECT mode, rig_probability
     FROM house_overrides
     WHERE player_id = $1
    `,
    [playerId]
  );
  return res.rows[0] || null;
};

const upsertOverride = async ({ playerId, mode, rigProbability }) => {
  await db.query(
    `INSERT INTO house_overrides (player_id, mode, rig_probability)
     VALUES ($1, $2, $3)
     ON CONFLICT (player_id)
     DO UPDATE SET mode = $2, rig_probability = $3, created_at = NOW()
    `,
    [playerId, mode, rigProbability]
  );
};

const deleteOverride = async playerId => {
  await db.query(
    `DELETE FROM house_overrides WHERE player_id = $1`,
    [playerId]
  );
};

module.exports = {
  getOverrideForPlayer,
  upsertOverride,
  deleteOverride
};
