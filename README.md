# Blackjack Casino WebApp

Node.js/Express backend, static web client, and lightweight admin console for running a Blackjack game inside a Telegram Web App. The server owns all game decisions, manages balances, talks to Cryptomus and Telegram Stars, and exposes an authenticated admin API.

## Repository layout

- `index.html`, `css/`, `js/` – player-facing Telegram Web App
- `admin/` – static admin console that calls the authenticated API
- `server/` – Express application, workers, migrations, tests
- `DEPLOYMENT.md` – production hosting notes
- `netlify.toml` – sample static hosting config for the web assets

## Features

- Server-authoritative Blackjack rounds with provable deck shuffling
- Balance ledger with transactional history in PostgreSQL
- Withdrawals scheduling flow (batch or urgent) backed by BullMQ queues
- Cryptomus invoice creation + webhook handler and Telegram Stars invoice links
- Admin endpoints for player lookup, balance adjustments, withdrawals, verifications, and risk events
- Security middleware: Telegram init-data verification, admin JWT with Redis session pinning, per-route rate limiting, strict CORS, verification document allowlist

## Requirements

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Public HTTPS endpoint for production webhook callbacks

## Configuration

Create `server/.env` (or `.env.test` for tests). Key variables:

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | no | `development`, `test`, or `production` |
| `PORT` | no | HTTP port for Express (default `5050`) |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | no | Redis connection URL (`redis://127.0.0.1:6379` by default) |
| `JWT_SECRET` | yes | Secret used to sign admin JWTs |
| `ADMIN_TELEGRAM_IDS` | yes | Comma-separated Telegram IDs allowed to sign in to `/api/admin` |
| `ADMIN_PANEL_SECRET` / `ADMIN_PANEL_SECRET_FILE` / `ADMIN_PANEL_SECRET_HASH` | one of | Plain secret, path to file with secret, or `scrypt:<salt_base64>:<hash_hex>` digest |
| `ALLOWED_ORIGINS` | yes in prod | Comma-separated list of trusted origins for CORS (`https://admin.example.com`) |
| `REQUEST_LIMIT_PER_MINUTE` | no | Global per-IP rate limit (default `120`) |
| `VERIFICATION_ALLOWED_HOSTS` | yes in prod | Comma-separated host allowlist (`cdn.example.com,*.trusted-storage.net`) for KYC document URLs |
| `CRYPTOMUS_MERCHANT_ID`, `CRYPTOMUS_API_KEY`, `CRYPTOMUS_PAYMENT_URL`, `CRYPTOMUS_STATUS_URL`, `CRYPTOMUS_WEBHOOK_URL` | depends | Credentials and endpoints for Cryptomus |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PROVIDER_TOKEN` | yes | Telegram bot credentials |
| `ADMIN_SESSION_TTL_SECONDS` | no | Life time of admin sessions (default `3600`) |

Other optional values are described inline in `server/src/config/env.js`.

## Local development

```powershell
# install dependencies
cd server
npm install

# run database migrations (requires DATABASE_URL)
npm run migrate

# start API & web workers
npm run dev      # Express server on port 5050 (or PORT)
npm run worker   # BullMQ worker processing payout jobs

# run automated tests
npm test
```

Serve the static web app in a separate terminal (any static server works):

```powershell
cd d:\blackjack-casino-webapp
npx http-server -p 8080
```

- Player WebApp: `http://localhost:8080`
- Admin panel: `http://localhost:8080/admin` (communicates with the API on `http://localhost:5050`)

## Production checklist

- Issue real HTTPS certificates and expose the Express app behind a reverse proxy
- Set `ALLOWED_ORIGINS` and `VERIFICATION_ALLOWED_HOSTS`; without them document uploads will be rejected
- To test verification uploads before storage is ready, set `VERIFICATION_ALLOWED_HOSTS` to `localhost`-only values and use the Telegram file proxy; external hosts remain blocked until you add them explicitly
- Provide either `ADMIN_PANEL_SECRET_HASH` (`scrypt` format) or mount the secret via file
- Point `CRYPTOMUS_WEBHOOK_URL` to the publicly reachable `/api/payments/cryptomus/webhook`
- Configure Redis persistence or managed Redis for session storage and queues
- Schedule the payout worker (`npm run worker`) alongside the API process
- Back up PostgreSQL regularly; migrations live in `server/migrations`

## Testing

```powershell
cd server
npm test -- --watch    # run Jest suite
```

Tests rely on `NODE_ENV=test` and the `.env.test` file if present. See `server/__tests__/` for examples covering anti-fraud service, player routes, and withdrawal flow.

## Security notes

- Player endpoints require raw `initData` from Telegram via the `X-Telegram-Init-Data` header; payloads outside the replay window are rejected and cached in Redis to prevent reuse
- Admin tokens are IP-bound and stored in Redis; `POST /api/admin/auth/login` is rate limited (10 attempts / 15 min)
- Verification document links are validated against `VERIFICATION_ALLOWED_HOSTS` on the server, and the admin UI reuses the same allowlist to block unsafe URLs
- Error responses hide stack traces for 5xx codes and log details server-side only
- Sensitive fields passed to the logger are masked automatically (`authorization`, `token`, `secret`, etc.)

## Deployment helpers

- `server/ecosystem.config.js` – PM2 example configuration
- `server/knexfile.js` – Knex migration configuration (uses `DATABASE_URL`)
- `DEPLOYMENT.md` – outlines static hosting for the web client and API deployment considerations

## Contributing

1. Fork and create a feature branch
2. Run tests (`npm test`) before submitting changes
3. Keep documentation and environment variable lists in sync with code
4. Submit a pull request with a summary of behavior changes

---

Play responsibly and have fun!