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
