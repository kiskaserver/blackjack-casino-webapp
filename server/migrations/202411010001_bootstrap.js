const ensureColumn = async (knex, tableName, columnName, alterCallback) => {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) {
    await knex.schema.alterTable(tableName, alterCallback);
  }
};

exports.up = async knex => {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  const hasPlayers = await knex.schema.hasTable('players');
  if (!hasPlayers) {
    await knex.schema.createTable('players', table => {
      table.increments('id').primary();
      table.text('telegram_id').notNullable().unique();
      table.text('username');
      table.text('first_name');
      table.text('last_name');
      table.decimal('balance', 18, 2).notNullable().defaultTo(0);
      table.decimal('demo_balance', 18, 2).notNullable().defaultTo(10000);
      table.integer('level').notNullable().defaultTo(1);
      table.text('status').notNullable().defaultTo('active');
      table.boolean('trusted').notNullable().defaultTo(false);
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  } else {
    await ensureColumn(knex, 'players', 'demo_balance', table => {
      table.decimal('demo_balance', 18, 2).notNullable().defaultTo(10000);
    });
    await ensureColumn(knex, 'players', 'status', table => {
      table.text('status').notNullable().defaultTo('active');
    });
    await ensureColumn(knex, 'players', 'trusted', table => {
      table.boolean('trusted').notNullable().defaultTo(false);
    });
    await ensureColumn(knex, 'players', 'updated_at', table => {
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasTransactions = await knex.schema.hasTable('transactions');
  if (!hasTransactions) {
    await knex.schema.createTable('transactions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('player_id').notNullable().references('players.id');
      table.decimal('amount', 18, 2).notNullable();
      table.text('reason').notNullable();
      table.text('reference_id');
      table.text('wallet_type').notNullable().defaultTo('real');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));
    });
    await knex.schema.alterTable('transactions', table => {
      table.unique(['reference_id']);
    });
  } else {
    await ensureColumn(knex, 'transactions', 'wallet_type', table => {
      table.text('wallet_type').notNullable().defaultTo('real');
    });
    await ensureColumn(knex, 'transactions', 'metadata', table => {
      table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));
    });
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_id_uindex ON transactions(reference_id)');
  }

  const hasRounds = await knex.schema.hasTable('game_rounds');
  if (!hasRounds) {
    await knex.schema.createTable('game_rounds', table => {
      table.uuid('round_id').primary();
      table.integer('player_id').notNullable().references('players.id');
      table.decimal('base_bet', 18, 2).notNullable();
      table.decimal('final_bet', 18, 2).notNullable();
      table.boolean('double_down').notNullable().defaultTo(false);
      table.text('seed').notNullable();
      table.text('seed_commit').notNullable();
      table.text('status').notNullable().defaultTo('pending');
      table.jsonb('player_cards').notNullable();
      table.jsonb('dealer_cards').notNullable();
      table.integer('next_index').notNullable();
      table.jsonb('player_actions').notNullable().defaultTo(knex.raw("'[]'::jsonb"));
      table.text('wallet_type').notNullable().defaultTo('real');
      table.text('result');
      table.decimal('win_amount', 18, 2).defaultTo(0);
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('settled_at', { useTz: true });
    });
  } else {
    await ensureColumn(knex, 'game_rounds', 'wallet_type', table => {
      table.text('wallet_type').notNullable().defaultTo('real');
    });
    await ensureColumn(knex, 'game_rounds', 'win_amount', table => {
      table.decimal('win_amount', 18, 2).defaultTo(0);
    });
  }

  const hasPaymentEvents = await knex.schema.hasTable('payment_events');
  if (!hasPaymentEvents) {
    await knex.schema.createTable('payment_events', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.text('provider').notNullable();
      table.text('provider_reference').notNullable();
      table.jsonb('payload').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.unique(['provider', 'provider_reference']);
    });
  }

  const hasPlatformSettings = await knex.schema.hasTable('platform_settings');
  if (!hasPlatformSettings) {
    await knex.schema.createTable('platform_settings', table => {
      table.text('key').primary();
      table.jsonb('value').notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasHouseOverrides = await knex.schema.hasTable('house_overrides');
  if (!hasHouseOverrides) {
    await knex.schema.createTable('house_overrides', table => {
      table.increments('id').primary();
      table.integer('player_id').notNullable().references('players.id').onDelete('CASCADE');
      table.text('mode').notNullable();
      table.decimal('rig_probability', 5, 4).notNullable().defaultTo(0);
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.unique(['player_id']);
    });
  }

  const hasWithdrawalBatches = await knex.schema.hasTable('withdrawal_batches');
  if (!hasWithdrawalBatches) {
    await knex.schema.createTable('withdrawal_batches', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.timestamp('scheduled_for', { useTz: true }).notNullable();
      table.text('status').notNullable().defaultTo('scheduled');
      table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('processed_at', { useTz: true });
    });
  }

  const hasWithdrawals = await knex.schema.hasTable('withdrawals');
  if (!hasWithdrawals) {
    await knex.schema.createTable('withdrawals', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('player_id').notNullable().references('players.id');
      table.text('method').notNullable();
      table.decimal('amount', 18, 2).notNullable();
      table.decimal('platform_fee', 18, 2).notNullable();
      table.decimal('provider_fee', 18, 2).notNullable();
      table.decimal('net_amount', 18, 2).notNullable();
      table.text('destination').notNullable();
      table.text('status').notNullable().defaultTo('pending');
      table.jsonb('metadata');
      table.boolean('kyc_required').notNullable().defaultTo(false);
      table.text('priority').notNullable().defaultTo('standard');
      table.boolean('is_urgent').notNullable().defaultTo(false);
      table.text('processing_mode').notNullable().defaultTo('batch');
      table.timestamp('scheduled_for', { useTz: true });
      table.uuid('batch_id').references('withdrawal_batches.id');
      table.text('currency');
      table.text('network');
      table.jsonb('volatility_lock');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('processed_at', { useTz: true });
      table.timestamp('auto_approved_at', { useTz: true });
    });
    await knex.schema.alterTable('withdrawals', table => {
      table.index(['status']);
    });
  } else {
    await ensureColumn(knex, 'withdrawals', 'priority', table => {
      table.text('priority').notNullable().defaultTo('standard');
    });
    await ensureColumn(knex, 'withdrawals', 'is_urgent', table => {
      table.boolean('is_urgent').notNullable().defaultTo(false);
    });
    await ensureColumn(knex, 'withdrawals', 'processing_mode', table => {
      table.text('processing_mode').notNullable().defaultTo('batch');
    });
    await ensureColumn(knex, 'withdrawals', 'scheduled_for', table => {
      table.timestamp('scheduled_for', { useTz: true });
    });
    await ensureColumn(knex, 'withdrawals', 'batch_id', table => {
      table.uuid('batch_id').references('withdrawal_batches.id');
    });
    await ensureColumn(knex, 'withdrawals', 'currency', table => {
      table.text('currency');
    });
    await ensureColumn(knex, 'withdrawals', 'network', table => {
      table.text('network');
    });
    await ensureColumn(knex, 'withdrawals', 'volatility_lock', table => {
      table.jsonb('volatility_lock');
    });
    await ensureColumn(knex, 'withdrawals', 'kyc_required', table => {
      table.boolean('kyc_required').notNullable().defaultTo(false);
    });
    await ensureColumn(knex, 'withdrawals', 'auto_approved_at', table => {
      table.timestamp('auto_approved_at', { useTz: true });
    });
    const hasStatusIndex = await knex.raw("SELECT 1 FROM pg_class WHERE relname = 'withdrawals_status_idx'");
    if (!hasStatusIndex.rowCount) {
      await knex.raw('CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status)');
    }
  }

  const hasRiskEvents = await knex.schema.hasTable('risk_events');
  if (!hasRiskEvents) {
    await knex.schema.createTable('risk_events', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('player_id').references('players.id');
      table.text('event_type').notNullable();
      table.text('severity');
      table.jsonb('payload');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasPlayerSettings = await knex.schema.hasTable('player_settings');
  if (!hasPlayerSettings) {
    await knex.schema.createTable('player_settings', table => {
      table.increments('id').primary();
      table.integer('player_id').notNullable().references('players.id').onDelete('CASCADE');
      table.boolean('demo_enabled');
      table.decimal('demo_initial_balance', 18, 2);
      table.decimal('demo_topup_threshold', 18, 2);
      table.jsonb('metadata').defaultTo(knex.raw("'{}'::jsonb"));
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.unique(['player_id']);
    });
  }
};

exports.down = async knex => {
  const dropColumnIfExists = async (table, column) => {
    const exists = await knex.schema.hasColumn(table, column);
    if (exists) {
      await knex.schema.alterTable(table, tbl => {
        tbl.dropColumn(column);
      });
    }
  };

  if (await knex.schema.hasTable('player_settings')) {
    await knex.schema.dropTable('player_settings');
  }

  await dropColumnIfExists('withdrawals', 'priority');
  await dropColumnIfExists('withdrawals', 'is_urgent');
  await dropColumnIfExists('withdrawals', 'processing_mode');
  await dropColumnIfExists('withdrawals', 'scheduled_for');
  await dropColumnIfExists('withdrawals', 'batch_id');
  await dropColumnIfExists('withdrawals', 'currency');
  await dropColumnIfExists('withdrawals', 'network');
  await dropColumnIfExists('withdrawals', 'volatility_lock');
  await dropColumnIfExists('withdrawals', 'kyc_required');
  await dropColumnIfExists('withdrawals', 'auto_approved_at');

  await dropColumnIfExists('players', 'status');
  await dropColumnIfExists('players', 'trusted');

  if (await knex.schema.hasTable('withdrawal_batches')) {
    await knex.schema.dropTable('withdrawal_batches');
  }
};
