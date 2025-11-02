# Blackjack Casino – Backend API & Workers

Express-based backend that powers gameplay, wallets, verification, risk automation, and the admin console for the Blackjack Casino Telegram WebApp. The service exposes REST APIs, manages PostgreSQL/Redis state, and executes BullMQ jobs for payouts and compliance checks.
## 🧱 Stack

- Node.js 18+, Express 5
- PostgreSQL 14+ via `pg` and Knex migrations
- Redis 6+ for caching, sessions, and BullMQ queues
- BullMQ workers (`payoutQueue`, `riskQueue`)
- Jest + Supertest for integration tests
- PM2 (optional) for production orchestration

## 📂 Project Structure
```
server/
  package.json           # scripts & dependencies
  index.js             # Express bootstrap (API + health checks)
  worker.js            # BullMQ worker bootstrap
  config/              # env, database, redis, migration helpers
  middleware/          # verifyTelegram, adminAuth, rate limiting, etc.
  routes/              # /api/player, /api/game, /api/payments, /api/admin
  services/            # business logic (game, payments, withdrawals, verification, fairness)
  repositories/        # PostgreSQL data access helpers
  jobs/                # queue producers/constants
  utils/               # logger, HTTP helpers, URL tools
  migrations/            # Knex migrations
  sql/schema.sql         # bootstrap DDL (optional alternative to migrations)
  __tests__/             # Jest suites (player routes, withdrawals, anti-fraud)
  jest.config.js
  knexfile.js
  ecosystem.config.js    # PM2 profile (optional)
## 🔐 Environment Configuration

Create `.env` (and optionally `.env.test`) by copying `.env.example`. Key parameters are validated in `src/config/env.js`.
| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | no | `development` (default), `production`, `test` |
| `PORT` | no | API port (default `5050`) |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `DATABASE_SSL_MODE`, `DATABASE_SSL_CERT*` | when TLS needed | Controls SSL configuration for Postgres |
| `REDIS_URL` | yes | Redis connection string for sessions & queues |
| `REDIS_TLS` | no | Enable TLS when using `rediss://` |
| `JWT_SECRET` | yes | Admin JWT signing secret |
| `ADMIN_TELEGRAM_IDS` | yes | Allowed Telegram IDs for admin login |
| `ADMIN_PANEL_SECRET` / `ADMIN_PANEL_SECRET_FILE` / `ADMIN_PANEL_SECRET_HASH` | one of | Shared secret (plain text, file path, or pre-hashed) |
| `TELEGRAM_BOT_TOKEN` | yes | Bot token used for init data verification & Stars API calls |
| `TELEGRAM_PROVIDER_TOKEN` | yes (Stars) | Provider token for Telegram Stars invoice API |
| `ALLOWED_ORIGINS` | required in prod | CORS whitelist for frontend origins |
| `VERIFICATION_ALLOWED_HOSTS` | recommended | Allowlist for externally hosted KYC assets |
| `CRYPTOMUS_*` | when Cryptomus enabled | Merchant credentials + webhook URLs |
| `REQUEST_LIMIT_PER_MINUTE` | no | Global rate limiter (default `120`) |
| `TELEGRAM_INIT_MAX_AGE_SECONDS` | no | Max age for Telegram init data HMAC (default `60`) |
| `TELEGRAM_INIT_REUSE_TTL_SECONDS` | no | Redis TTL for cached init data reuse (default `3600`) |

Runtime-tunable gameplay and transparency controls (deck count, soft-17 rules, RTP targets, payout multipliers, commissions, anti-fraud options) are persisted in Postgres via `settingsService` and editable through the admin UI.
## 🧑‍💻 Development Workflow

```powershell
cd server
npm install

# Database schema
npm run migrate              # apply latest Knex migrations
# or bootstrap manually
# psql "$env:DATABASE_URL" -f sql/schema.sql

# Start the API
npm run dev                  # serves http://localhost:5050

# Start workers (new terminal)
npm run worker               # processes payout + risk queues
# Run tests
npm test
```

The API expects Redis and PostgreSQL to be available. During frontend development the Vite dev server proxies `/api` calls to `http://localhost:5050`.
## 🛣️ API Surface (Condensed)

### Player & Game Routes

| Endpoint | Description |
| --- | --- |
| `GET /api/player/profile` | Player balances, demo settings, aggregated stats |
| `GET /api/player/history` | Recent rounds + ledger transactions |
| `POST /api/player/demo/reset` | Restore demo wallet |
| `GET /api/player/verification` | Fetch latest KYC submission |
| `POST /api/player/verification` | Submit new KYC request |
| `POST /api/game/start` | Start a blackjack round |
| `POST /api/game/hit` | Player takes a card |
| `POST /api/game/double` | Player doubles down |
| `POST /api/game/settle` | Dealer plays out hand & settles |
| `GET /api/game/fairness` | Lifetime/rolling RTP & house edge metrics |
| `POST /api/payments/cryptomus/invoice` | Create Cryptomus deposit invoice |
| `POST /api/payments/telegram-stars/invoice` | Create Telegram Stars invoice |
| `POST /api/payments/withdraw` | Submit withdrawal request |

> Player routes require the `X-Telegram-Init-Data` header (raw `initData` string). Verification is performed with HMAC using the configured bot token and results are cached in Redis for session reuse.
### Admin Routes

| Endpoint | Description |
| --- | --- |
| `POST /api/admin/auth/login` / `logout` | JWT-based admin session management |
| `GET /api/admin/stats/overview` | KPIs + fairness report |
| `GET /api/admin/transactions/recent` | Latest ledger entries |
| `GET /api/admin/players` / `search` | Player directory & search tooling |
| `POST /api/admin/players/:telegramId/adjust-balance` | Balance adjustments |
| `POST /api/admin/players/:telegramId/demo/reset` | Reset player demo wallet |
| `GET /api/admin/players/:telegramId` | Player stats + risk events + settings |
| `GET /api/admin/withdrawals` | Withdrawal queue overview |
| `POST /api/admin/withdrawals/:id/status` | Approve / reject / mark processed |
| `POST /api/admin/withdrawals/:id/urgent` | Enqueue urgent payout |
| `GET /api/admin/withdrawal-batches` | Batch pipeline control |
| `GET /api/admin/verifications` | Pending/processed KYC submissions |
| `POST /api/admin/verifications/:id/(approve|reject|request-resubmission)` | KYC workflow |
| `GET /api/admin/settings` / `PATCH /api/admin/settings` | Runtime configuration editor |
| `GET /api/admin/risk-events` | Risk feed (velocity, win caps, anomalies) |

Admin routes expect a Bearer token issued by `/api/admin/auth/login`. Tokens are signed with `JWT_SECRET`, stored in Redis with TTL, and bound to the client IP.
## 🛠️ Workers & Queues

- **`payoutQueue`** – batches withdrawals, supports urgent payouts, integrates with Cryptomus.
- **`riskQueue`** – velocity checks, daily profit caps, and targeted anti-fraud sweeps.
- Workers share configuration via `settingsService`, allowing runtime updates without restarts.

Run `npm run worker` alongside the API in production (or configure PM2/Systemd using `ecosystem.config.js`).

## 📈 Fairness & Transparency

`fairnessService.getGameFairnessReport()` aggregates lifetime, trailing 24h, and rolling window RTP/house-edge metrics. The results power both the player-facing fairness cards and the admin dashboard. Metrics are calculated from *real* wallet rounds (`wallet_type = 'real'`, `status = 'finished'`, `settled_at IS NOT NULL`). Demo rounds are intentionally excluded.
## 🧪 Testing

- `npm test` – runs Jest suites serially (`--runInBand`).
- Tests mock database/redis interactions where possible; integration suites assume a dedicated Postgres/Redis instance defined in `.env.test`.
- `__tests__/antiFraudService.test.js` validates velocity/daily win cap logic, `playerRoutes.test.js` covers Telegram verification + gameplay, `withdrawalService.test.js` ensures payout flow correctness.
## 📋 Deployment Notes

- Execute `npm run migrate` during deploys (migrations are idempotent).
- Keep API and worker processes running (PM2/systemd recommended).
- Configure HTTPS termination (load balancer / reverse proxy) and ensure Telegram webhooks use TLS.
- Monitor Redis/BullMQ queue depths to detect stalled payouts or risk sweeps.
- Review `DEPLOYMENT.md` for bot setup, DNS, monitoring, and failover guidance.

## 📎 Useful Commands

```powershell
npm run migrate            # apply schema changes
npm run migrate:rollback   # rollback last batch
npm run dev                # start API
npm run worker             # start BullMQ worker
npm test                   # run Jest suites
```

For environment-specific overrides or additional helpers (e.g., database seeding) extend `npm` scripts in `package.json` as needed.
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
