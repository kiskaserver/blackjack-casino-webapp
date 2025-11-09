CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    telegram_id TEXT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    demo_balance NUMERIC(18, 2) NOT NULL DEFAULT 10000,
    level INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    trusted BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    last_game_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id INTEGER NOT NULL REFERENCES players(id),
    amount NUMERIC(18, 2) NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT,
    wallet_type TEXT NOT NULL DEFAULT 'real',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_id_uindex ON transactions(reference_id);

CREATE TABLE IF NOT EXISTS game_rounds (
    round_id UUID PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id),
    base_bet NUMERIC(18, 2) NOT NULL,
    final_bet NUMERIC(18, 2) NOT NULL,
    double_down BOOLEAN NOT NULL DEFAULT FALSE,
    seed TEXT NOT NULL,
    seed_commit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    player_cards JSONB NOT NULL,
    dealer_cards JSONB NOT NULL,
    next_index INTEGER NOT NULL,
    player_actions JSONB NOT NULL,
    wallet_type TEXT NOT NULL DEFAULT 'real',
    result TEXT,
    win_amount NUMERIC(18, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_reference TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_reference_idx
    ON payment_events(provider, provider_reference);

CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS house_overrides (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    rig_probability NUMERIC(5, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (player_id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id INTEGER NOT NULL REFERENCES players(id),
    method TEXT NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    platform_fee NUMERIC(18, 2) NOT NULL,
    provider_fee NUMERIC(18, 2) NOT NULL,
    net_amount NUMERIC(18, 2) NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status);

CREATE TABLE IF NOT EXISTS risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id INTEGER REFERENCES players(id),
    event_type TEXT NOT NULL,
    severity TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL DEFAULT 'inactivity',
    inactivity_threshold_hours INTEGER NOT NULL DEFAULT 72,
    repeat_cooldown_hours INTEGER NOT NULL DEFAULT 72,
    batch_size INTEGER NOT NULL DEFAULT 200,
    target_scope TEXT NOT NULL DEFAULT 'all',
    target_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    target_player_telegram_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    message_html TEXT NOT NULL,
    message_plain TEXT,
    allow_html BOOLEAN NOT NULL DEFAULT TRUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_queued INTEGER DEFAULT 0,
    last_run_status TEXT,
    last_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_message_templates_enabled_idx ON player_message_templates(enabled);
CREATE INDEX IF NOT EXISTS player_message_templates_last_run_idx ON player_message_templates(last_run_at);

CREATE TABLE IF NOT EXISTS player_message_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES player_message_templates(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    telegram_chat_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    rendered_html TEXT,
    rendered_text TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_message_deliveries_template_player_idx ON player_message_deliveries(template_id, player_id);
CREATE INDEX IF NOT EXISTS player_message_deliveries_player_sent_idx ON player_message_deliveries(player_id, sent_at);
CREATE INDEX IF NOT EXISTS player_message_deliveries_template_sent_idx ON player_message_deliveries(template_id, sent_at);
CREATE INDEX IF NOT EXISTS player_message_deliveries_status_idx ON player_message_deliveries(status);
