# Blackjack Casino Backend

Server-side companion for the Blackjack Casino WebApp. Provides trusted game logic, balance ledger, payment processing (Cryptomus + Telegram Stars), anti-cheat hooks, and admin reporting.

## Features

- Server-authoritative round creation with deterministic deck seed & commit hash
- Balance ledger with transactional updates and audit trail
- Cryptomus invoice creation + webhook to credit deposits
- Telegram Stars invoice link generator
- Player profile endpoint with live stats
- Admin API (locked to predefined Telegram IDs) for aggregated KPIs and transaction review
- Security middleware: Telegram init-data verification, rate limiting, Helmet, request logging

## Requirements

- Node.js 18+
- PostgreSQL 14+
- Environment variables (see `.env.example`)

## Getting Started

1. Install dependencies:
   ```powershell
   cd server
   npm install
   ```
2. Prepare database:
   ```sql
   -- Run in psql or a migration tool
   \i sql/schema.sql
   ```
3. Create `server/.env` based on `.env.example` and set:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ADMIN_TELEGRAM_IDS` (comma separated IDs with admin access)
   - `CRYPTOMUS_*` keys
   - `TELEGRAM_*` keys
   - `CRYPTOMUS_WEBHOOK_URL` (public HTTPS endpoint)
4. Start the server:
   ```powershell
   npm run dev
   # or
   $env:NODE_ENV='production'; npm start
   ```

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/game/start` | Start new round, returns roundId + commit hash |
| `POST` | `/api/game/settle` | (TODO) Submit server-visible outcome & reveal |
| `GET`  | `/api/player/profile` | Player balance & stats |
| `POST` | `/api/payments/cryptomus/invoice` | Generate Cryptomus invoice |
| `POST` | `/api/payments/cryptomus/webhook` | Webhook receiver |
| `POST` | `/api/payments/telegram-stars/invoice` | Telegram Stars invoice link |
| `GET`  | `/api/admin/stats/overview` | Aggregate analytics (admin) |
| `GET`  | `/api/admin/stats/player/:telegramId` | Player deep-dive (admin) |
| `GET`  | `/api/admin/transactions/recent` | Recent ledger activity (admin) |

All player endpoints require the `X-Telegram-Init-Data` header with the exact `initData` string from the Telegram WebApp. Admin endpoints require a Bearer token issued by `POST /api/admin/auth/login` (pass `adminId` and `secret`). Tokens are short-lived, bound to the caller IP, and validated against Redis-backed sessions.

## Next Steps

- Implement `/api/game/settle` to validate round, compute result, credit/debit balance atomically
- Add background job for anti-fraud checks (velocity limits, anomaly detection)
- Wire WebApp JavaScript to call these APIs and remove client-side balance authority
- Build secure admin UI (e.g., Next.js or pure HTML) consuming admin endpoints
- Add unit/integration tests and proper migration tooling (e.g., Prisma, Knex)
