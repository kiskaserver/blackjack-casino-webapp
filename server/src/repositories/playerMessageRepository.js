const db = require('../config/database');

const mapTemplate = row => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    trigger_type: row.trigger_type,
    inactivity_threshold_hours: Number(row.inactivity_threshold_hours || 0),
    repeat_cooldown_hours: Number(row.repeat_cooldown_hours || 0),
    batch_size: Number(row.batch_size || 0),
    target_scope: row.target_scope,
    target_filters: row.target_filters || {},
    target_player_telegram_ids: row.target_player_telegram_ids || [],
    message_html: row.message_html,
    message_plain: row.message_plain || '',
    allow_html: Boolean(row.allow_html),
    enabled: Boolean(row.enabled),
    last_run_at: row.last_run_at,
    last_run_queued: Number(row.last_run_queued || 0),
    last_run_status: row.last_run_status || null,
    last_error: row.last_error || null,
    metadata: row.metadata || {},
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

const mapDelivery = row => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    template_id: row.template_id,
    player_id: row.player_id,
    telegram_chat_id: row.telegram_chat_id,
    status: row.status,
    error_message: row.error_message || null,
    metadata: row.metadata || {},
    rendered_html: row.rendered_html || null,
    rendered_text: row.rendered_text || null,
    sent_at: row.sent_at,
    next_retry_at: row.next_retry_at || null,
    created_at: row.created_at
  };
};

const listTemplates = async () => {
  const res = await db.query(
    `SELECT *
       FROM player_message_templates
       ORDER BY created_at DESC`
  );
  return res.rows.map(mapTemplate);
};

const listEnabledTemplates = async () => {
  const res = await db.query(
    `SELECT *
       FROM player_message_templates
       WHERE enabled = TRUE
       ORDER BY created_at DESC`
  );
  return res.rows.map(mapTemplate);
};

const getTemplateById = async id => {
  const res = await db.query(
    `SELECT * FROM player_message_templates WHERE id = $1`,
    [id]
  );
  return mapTemplate(res.rows[0]);
};

const createTemplate = async payload => {
  const {
    name,
    description,
    trigger_type,
    inactivity_threshold_hours,
    repeat_cooldown_hours,
    batch_size,
    target_scope,
    target_filters,
    target_player_telegram_ids,
    message_html,
    message_plain,
    allow_html,
    enabled,
    metadata,
    created_by,
    updated_by
  } = payload;

  const res = await db.query(
    `INSERT INTO player_message_templates (
        name,
        description,
        trigger_type,
        inactivity_threshold_hours,
        repeat_cooldown_hours,
        batch_size,
        target_scope,
        target_filters,
        target_player_telegram_ids,
        message_html,
        message_plain,
        allow_html,
        enabled,
        metadata,
        created_by,
        updated_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14::jsonb, $15, $16)
     RETURNING *
    `,
    [
      name,
      description,
      trigger_type,
      inactivity_threshold_hours,
      repeat_cooldown_hours,
      batch_size,
      target_scope,
      JSON.stringify(target_filters || {}),
      JSON.stringify(target_player_telegram_ids || []),
      message_html,
      message_plain,
      allow_html,
      enabled,
  JSON.stringify(metadata || {}),
      created_by || null,
      updated_by || null
    ]
  );

  return mapTemplate(res.rows[0]);
};

const updateTemplate = async (id, payload) => {
  const fields = [
    'name',
    'description',
    'trigger_type',
    'inactivity_threshold_hours',
    'repeat_cooldown_hours',
    'batch_size',
    'target_scope',
    'target_filters',
    'target_player_telegram_ids',
    'message_html',
    'message_plain',
    'allow_html',
    'enabled',
    'metadata',
    'updated_by'
  ];

  const updates = [];
  const values = [];
  let index = 1;

  fields.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (key === 'target_filters' || key === 'metadata' || key === 'target_player_telegram_ids') {
        updates.push(`${key} = $${index}::jsonb`);
        if (key === 'metadata') {
          values.push(JSON.stringify(payload[key] || {}));
        } else {
          values.push(JSON.stringify(payload[key] || (key === 'target_player_telegram_ids' ? [] : {})));
        }
      } else {
        updates.push(`${key} = $${index}`);
        values.push(payload[key]);
      }
      index += 1;
    }
  });

  if (!updates.length) {
    const current = await getTemplateById(id);
    return current;
  }

  updates.push(`updated_at = NOW()`);
  const res = await db.query(
    `UPDATE player_message_templates
        SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `,
    [...values, id]
  );

  return mapTemplate(res.rows[0]);
};

const deleteTemplate = async id => {
  await db.query(`DELETE FROM player_message_templates WHERE id = $1`, [id]);
};

const recordDelivery = async payload => {
  const {
    template_id,
    player_id,
    telegram_chat_id,
    status,
    error_message,
    metadata,
    rendered_html,
    rendered_text,
    sent_at,
    next_retry_at
  } = payload;

  const res = await db.query(
    `INSERT INTO player_message_deliveries (
        template_id,
        player_id,
        telegram_chat_id,
        status,
        error_message,
        metadata,
        rendered_html,
        rendered_text,
        sent_at,
        next_retry_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
     RETURNING *
    `,
    [
      template_id,
      player_id,
      telegram_chat_id,
      status,
      error_message || null,
      JSON.stringify(metadata || {}),
      rendered_html || null,
      rendered_text || null,
      sent_at || new Date(),
      next_retry_at || null
    ]
  );

  return mapDelivery(res.rows[0]);
};

const updateTemplateRunStats = async ({ templateId, queued = 0, status = null, error = null }) => {
  const res = await db.query(
    `UPDATE player_message_templates
        SET last_run_at = NOW(),
            last_run_queued = $2,
            last_run_status = $3,
            last_error = $4,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [templateId, queued, status, error]
  );
  return mapTemplate(res.rows[0]);
};

const markTemplateError = async ({ templateId, error }) => {
  const res = await db.query(
    `UPDATE player_message_templates
        SET last_run_at = NOW(),
            last_run_status = 'error',
            last_error = $2,
            updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [templateId, error]
  );
  return mapTemplate(res.rows[0]);
};

const findEligiblePlayersForInactivityTemplate = async ({
  templateId,
  inactivityHours,
  repeatCooldownHours,
  targetScope,
  targetFilters,
  telegramIds,
  limit
}) => {
  const params = [];
  let idx = 1;
  const whereClauses = ['p.telegram_id IS NOT NULL'];

  if (inactivityHours > 0) {
    params.push(inactivityHours);
    whereClauses.push(`(p.last_seen_at IS NULL OR p.last_seen_at <= NOW() - ($${idx}::numeric * INTERVAL '1 hour'))`);
    idx += 1;
  }

  if (targetScope === 'list') {
    const ids = telegramIds && telegramIds.length ? telegramIds.map(String) : [];
    if (!ids.length) {
      return [];
    }
    params.push(ids);
    whereClauses.push(`p.telegram_id = ANY($${idx}::text[])`);
    idx += 1;
  } else {
    const statuses = Array.isArray(targetFilters?.statuses) ? targetFilters.statuses.filter(Boolean) : [];
    if (statuses.length) {
      params.push(statuses);
      whereClauses.push(`p.status = ANY($${idx}::text[])`);
      idx += 1;
    }

    const verificationStatuses = Array.isArray(targetFilters?.verification_statuses)
      ? targetFilters.verification_statuses.filter(Boolean)
      : [];
    if (verificationStatuses.length) {
      params.push(verificationStatuses);
      whereClauses.push(`p.verification_status = ANY($${idx}::text[])`);
      idx += 1;
    }

    if (typeof targetFilters?.trusted === 'boolean') {
      params.push(targetFilters.trusted);
      whereClauses.push(`p.trusted = $${idx}`);
      idx += 1;
    }
  }

  if (repeatCooldownHours > 0) {
    params.push(templateId);
    params.push(repeatCooldownHours);
    whereClauses.push(`NOT EXISTS (
      SELECT 1
        FROM player_message_deliveries d
       WHERE d.template_id = $${idx}
         AND d.player_id = p.id
         AND d.sent_at >= NOW() - ($${idx + 1}::numeric * INTERVAL '1 hour')
    )`);
    idx += 2;
  } else {
    params.push(templateId);
    whereClauses.push(`NOT EXISTS (
      SELECT 1
        FROM player_message_deliveries d
       WHERE d.template_id = $${idx}
         AND d.player_id = p.id
    )`);
    idx += 1;
  }

  params.push(limit);
  const query = `
    SELECT
      p.id,
      p.telegram_id,
      p.username,
      p.first_name,
      p.last_name,
      p.balance,
      p.demo_balance,
      p.status,
      p.verification_status,
      p.last_seen_at,
      p.last_game_at,
      p.created_at
    FROM players p
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY p.last_seen_at NULLS FIRST, p.created_at ASC
    LIMIT $${idx}
  `;

  const res = await db.query(query, params);
  return res.rows;
};

module.exports = {
  listTemplates,
  listEnabledTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  recordDelivery,
  updateTemplateRunStats,
  markTemplateError,
  findEligiblePlayersForInactivityTemplate
};
