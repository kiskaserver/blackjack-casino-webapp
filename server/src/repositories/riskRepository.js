const db = require('../config/database');

const createEvent = async ({ playerId, eventType, severity = 'low', payload = {} }) => {
  await db.query(
    `INSERT INTO risk_events (player_id, event_type, severity, payload)
     VALUES ($1, $2, $3, $4::jsonb)
    `,
    [playerId || null, eventType, severity, JSON.stringify(payload)]
  );
};

module.exports = {
  createEvent
};
