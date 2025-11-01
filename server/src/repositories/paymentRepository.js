const db = require('../config/database');

const recordEvent = async ({ provider, reference, payload }) => {
  await db.query(
    `INSERT INTO payment_events (provider, provider_reference, payload)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (provider, provider_reference)
     DO NOTHING
    `,
    [provider, reference, JSON.stringify(payload)]
  );
};

module.exports = {
  recordEvent
};
