const db = require('../config/database');

const getAllSettings = async () => {
  const res = await db.query('SELECT key, value FROM platform_settings');
  return res.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
};

const upsertSetting = async (key, value) => {
  await db.query(
    `INSERT INTO platform_settings (key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()
    `,
    [key, JSON.stringify(value)]
  );
};

module.exports = {
  getAllSettings,
  upsertSetting
};
