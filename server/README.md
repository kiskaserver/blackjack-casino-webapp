# Blackjack Casino – Backend

Express/Node.js service that powers gameplay, wallets, verification, and admin workflows for the Blackjack Casino Telegram WebApp. Responsibilities include round resolution, balance ledger, payment integrations, risk checks, KYC, and operational tooling.

## Tech stack

- Node.js 18+, Express 4
- PostgreSQL 14+ (via `pg` + hand-written queries / Knex migrations)
- Redis 6+ (sessions + BullMQ queues)
- BullMQ workers for payout batching and risk automation
- Jest for unit/integration tests
- PM2 (optional) for production process orchestration

## Project structure

```
server/
  package.json          # scripts, dependencies
  src/
    index.js            # Express app bootstrap
    worker.js           # BullMQ worker bootstrap (risk/payout queues)
    routes/             # REST endpoints (/api/player, /api/game, /api/admin, ...)
    services/           # Business logic (game, payments, verification, withdrawal, settings)
    repositories/       # Postgres data access helpers
    middleware/         # Telegram auth, admin auth, rate limiting, etc.
    jobs/               # Queue producers + processors
    utils/              # Logger, HTTP helpers, URL validation
  migrations/           # Knex migrations
  sql/                  # Bootstrap schema (psql friendly)
  __tests__/            # Jest suites (player routes, anti-fraud, withdrawals)
  jest.config.js
  knexfile.js
```

## Environment configuration

Create `server/.env` (and optionally `.env.test`) using the template below. All variables are documented inline in `src/config/env.js`.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no | `development`, `test`, `production`; defaults to `development` |
| `PORT` | no | Express port (default `5050`) |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string (sessions + BullMQ) |
| `JWT_SECRET` | yes | JWT signing key for admin sessions |
| `ADMIN_TELEGRAM_IDS` | yes | Comma-separated Telegram IDs allowed to log into admin routes |
| `ADMIN_PANEL_SECRET` / `*_FILE` / `*_HASH` | one of | Shared secret used on login (plain, file path, or scrypt hash) |
| `ALLOWED_ORIGINS` | prod | Comma-separated list for CORS whitelist |
| `VERIFICATION_ALLOWED_HOSTS` | prod | Host allowlist for KYC document URLs |
| `CRYPTOMUS_*` | when payments enabled | Merchant credentials, webhook URL, API endpoints |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PROVIDER_TOKEN` | yes | Required for Telegram Stars payments and bot actions |
| `ADMIN_SESSION_TTL_SECONDS` | no | Lifetime of admin JWT/Redis session (default 3600s) |
| `PAYMENTS_SIGNING_SECRET` | optional | Extra webhook verification secret |

Additional knobs (anti-fraud thresholds, payout cut-offs, etc.) live in `src/config/env.js` and `src/services/settingsService.js` with defaults applied if unset.

## Development workflow

```powershell
cd server
npm install

# Initialise database (choose one):
npm run migrate          # Knex migrations
# or run the bootstrap SQL
psql "$env:DATABASE_URL" -f sql/schema.sql

# Start API
npm run dev              # nodemon + ts-node/register

# Start workers (in another terminal)


# Run tests
npm test
npm test -- --watch
```

The API listens on `http://localhost:5050` by default; the Vite dev server proxies `/api` requests during frontend development.

## API surface (abridged)

### Player-facing (`/api/player`, `/api/game`, `/api/payments`)

- `GET /api/player/profile` – balance, demo config, aggregated stats
- `GET /api/player/history` – recent rounds + ledger movements (new)
- `POST /api/player/demo/reset` – reset demo wallet to target amount
- `GET/POST /api/player/verification` – fetch & submit KYC requests
- `POST /api/game/start|hit|double|settle` – game actions
- `POST /api/payments/cryptomus/invoice` – create deposit invoice
- `POST /api/payments/telegram-stars/invoice` – create Stars invoice
- `POST /api/payments/withdraw` – enqueue withdrawal request

All player routes require the `X-Telegram-Init-Data` header (raw `initData` string) which is verified with Telegram using the bot token + hash.

### Admin (`/api/admin`)

- Auth: `POST /auth/login`, `POST /auth/logout`
- Overview & analytics: `GET /stats/overview`, `GET /transactions/recent`
- Player ops: list/search players, balance adjustments, status updates, demo overrides, per-player stats + risk feed
- Withdrawals: list, status transitions, urgent queue, batch scheduling/processing
- Verifications: list, get, approve, reject, request resubmission
- Settings: fetch + patch platform settings (demo, payout cut-offs, commissions, house bias)
- Risk feed: `GET /risk-events`

Admin routes require a Bearer token issued via `/api/admin/auth/login` (Telegram ID + shared secret). Tokens are bound to IP, signed with `JWT_SECRET`, and persisted in Redis with TTL.

## Background jobs

- `src/jobs/payoutQueue.js` – schedules withdrawals into batches, handles urgent payouts
- `src/jobs/riskQueue.js` – anti-fraud sweeps, velocity checks (extend as needed)
- Workers pull configuration from `settingsService` allowing runtime updates via admin UI

## Logs & observability

- Structured logger in `src/utils/logger.js` (pino-like signature)
- Sensitive headers/fields are redacted automatically
- Use `REQUEST_ID_HEADER` to correlate across services (see `src/utils/http.js`)

## Testing

- Jest configured via `jest.config.js`
- Example suites: `__tests__/playerRoutes.test.js`, `__tests__/withdrawalService.test.js`
- Tests expect a dedicated database (`DATABASE_URL` / `DATABASE_URL_TEST`) and Redis instance; see `jest.setup.js`

## Deployment notes

- PM2 config: `ecosystem.config.js`
- Ensure migrations run during deploy (`npm run migrate`)
- Keep worker process alive alongside API (supervisor/PM2/systemd)
- Terminate TLS at load balancer; enforce HTTPS for webhook endpoints
- Backup database regularly; monitor queue depth (`riskQueue`, `payoutQueue`)

For the full deployment checklist (SSL, Telegram bot setup, webhook exposure, monitoring) refer to the top-level `DEPLOYMENT.md`.
