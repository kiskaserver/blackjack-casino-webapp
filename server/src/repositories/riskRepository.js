const db = require('../config/database');

const createEvent = async ({ playerId, eventType, severity = 'low', payload = {} }) => {
  await db.query(
    `INSERT INTO risk_events (player_id, event_type, severity, payload)
     VALUES ($1, $2, $3, $4::jsonb)
    `,
    [playerId || null, eventType, severity, JSON.stringify(payload)]
  );
};

const getPlayerRiskEvents = async (playerId, limit = 50) => {
  const res = await db.query(
    `SELECT * FROM risk_events
     WHERE player_id = $1
     ORDER BY created_at DESC
     LIMIT $2
    `,
    [playerId, limit]
  );
  return res.rows;
};

const getRecentRiskEvents = async ({ limit = 100, severity, eventType } = {}) => {
  const clauses = [];
  const params = [];
  
  if (severity) {
    clauses.push('severity = $' + (params.length + 1));
    params.push(severity);
  }
  
  if (eventType) {
    clauses.push('event_type = $' + (params.length + 1));
    params.push(eventType);
  }
  
  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  
  const res = await db.query(
    `SELECT re.*, p.telegram_id, p.username
     FROM risk_events re
     LEFT JOIN players p ON p.id = re.player_id
     ${where}
     ORDER BY re.created_at DESC
     LIMIT $${params.length}
    `,
    params
  );
  return res.rows;
};

module.exports = {
  createEvent,
  getPlayerRiskEvents,
  getRecentRiskEvents
};
