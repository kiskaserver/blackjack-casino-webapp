exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('player_verifications');
  if (!hasTable) {
    await knex.schema.createTable('player_verifications', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('player_id').notNullable().references('players.id').onDelete('CASCADE');
      table.text('status').notNullable().defaultTo('pending');
      table.text('document_type').notNullable();
      table.text('document_number');
      table.text('country');
      table.text('document_front_url');
      table.text('document_back_url');
      table.text('selfie_url');
      table.text('additional_document_url');
      table.jsonb('metadata').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
      table.text('note');
      table.text('rejection_reason');
      table.text('reviewed_by');
      table.timestamp('submitted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('reviewed_at', { useTz: true });
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.alterTable('player_verifications', table => {
      table.index(['status']);
      table.index(['player_id']);
    });

    await knex.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS player_verifications_unique_pending
      ON player_verifications(player_id)
      WHERE status = 'pending'
    `);
  }

  const hasVerificationStatus = await knex.schema.hasColumn('players', 'verification_status');
  if (!hasVerificationStatus) {
    await knex.schema.alterTable('players', table => {
      table.text('verification_status').notNullable().defaultTo('unverified');
    });
  }
};

exports.down = async knex => {
  const hasVerificationStatus = await knex.schema.hasColumn('players', 'verification_status');
  if (hasVerificationStatus) {
    await knex.schema.alterTable('players', table => {
      table.dropColumn('verification_status');
    });
  }

  const hasTable = await knex.schema.hasTable('player_verifications');
  if (hasTable) {
    await knex.raw('DROP INDEX IF EXISTS player_verifications_unique_pending');
    await knex.schema.dropTable('player_verifications');
  }
};
