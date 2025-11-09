const ensureColumn = async (knex, tableName, columnName, alterCallback) => {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) {
    await knex.schema.alterTable(tableName, alterCallback);
  }
};

exports.up = async knex => {
  await ensureColumn(knex, 'players', 'last_seen_at', table => {
    table.timestamp('last_seen_at', { useTz: true });
  });

  await ensureColumn(knex, 'players', 'last_game_at', table => {
    table.timestamp('last_game_at', { useTz: true });
  });

  const hasTemplates = await knex.schema.hasTable('player_message_templates');
  if (!hasTemplates) {
    await knex.schema.createTable('player_message_templates', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.text('name').notNullable();
      table.text('description');
      table.text('trigger_type').notNullable().defaultTo('inactivity');
      table.integer('inactivity_threshold_hours').notNullable().defaultTo(72);
      table.integer('repeat_cooldown_hours').notNullable().defaultTo(72);
      table.integer('batch_size').notNullable().defaultTo(200);
      table.text('target_scope').notNullable().defaultTo('all');
      table.jsonb('target_filters').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
      table.jsonb('target_player_telegram_ids').notNullable().defaultTo(knex.raw("'[]'::jsonb"));
      table.text('message_html').notNullable();
      table.text('message_plain');
      table.boolean('allow_html').notNullable().defaultTo(true);
      table.boolean('enabled').notNullable().defaultTo(true);
      table.timestamp('last_run_at', { useTz: true });
      table.integer('last_run_queued').defaultTo(0);
      table.text('last_run_status');
      table.text('last_error');
      table.jsonb('metadata').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
      table.text('created_by');
      table.text('updated_by');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('player_message_templates', table => {
      table.index(['enabled']);
      table.index(['last_run_at']);
    });
  }

  const hasDeliveries = await knex.schema.hasTable('player_message_deliveries');
  if (!hasDeliveries) {
    await knex.schema.createTable('player_message_deliveries', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('template_id').notNullable().references('player_message_templates.id').onDelete('CASCADE');
      table.integer('player_id').notNullable().references('players.id').onDelete('CASCADE');
      table.text('telegram_chat_id').notNullable();
      table.text('status').notNullable().defaultTo('sent');
      table.text('error_message');
      table.jsonb('metadata').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
      table.text('rendered_html');
      table.text('rendered_text');
      table.timestamp('sent_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('next_retry_at', { useTz: true });
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('player_message_deliveries', table => {
      table.index(['template_id', 'player_id']);
      table.index(['player_id', 'sent_at']);
      table.index(['template_id', 'sent_at']);
      table.index(['status']);
    });
  }
};

exports.down = async knex => {
  if (await knex.schema.hasTable('player_message_deliveries')) {
    await knex.schema.dropTable('player_message_deliveries');
  }

  if (await knex.schema.hasTable('player_message_templates')) {
    await knex.schema.dropTable('player_message_templates');
  }

  const dropColumnIfExists = async column => {
    const exists = await knex.schema.hasColumn('players', column);
    if (exists) {
      await knex.schema.alterTable('players', table => {
        table.dropColumn(column);
      });
    }
  };

  await dropColumnIfExists('last_seen_at');
  await dropColumnIfExists('last_game_at');
};
