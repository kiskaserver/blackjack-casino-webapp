npm run migrate
npm run worker   # BullMQ worker processing payout jobs
# Blackjack Casino Platform

Full-stack Telegram WebApp for multiplayer Blackjack with real balances, automated payments, KYC workflow, and an authenticated operations console. The project now ships with a modern React/Vite frontend (`frontend/`) and an Express/Node.js backend (`server/`) that share a single repository and deployment pipeline.

## Repository layout

- `frontend/` – React 18 + Vite SPA (player UI + admin console)
- `server/` – Express API, BullMQ workers, Knex migrations, Jest tests
- `DEPLOYMENT.md` – production hosting, CI/CD, and infrastructure checklist
- `README.md` – this document (global view)
- `frontend/README.md` – frontend-specific documentation
- `server/README.md` – backend-specific documentation

Legacy static assets (`index.html`, `admin/`, `css/`, `js/`) were removed in favour of the React build. Serve the compiled SPA from any CDN/static host and proxy `/api` requests to the Express backend.

## Architecture overview

- **Transport:** Telegram WebApp + HTTPS REST API (`/api/player`, `/api/game`, `/api/payments`, `/api/admin`)
- **Backend:** Node.js 18, Express, PostgreSQL, Redis, BullMQ workers (payout/risk queues)
- **Frontend:** React Router (HashRouter for Telegram compatibility), context providers for Telegram init data and admin auth, reusable API clients with automatic header injection
- **Security:** Telegram init data verification, admin JWT sessions persisted in Redis, per-route rate limiting, host allowlist for KYC document URLs, configurable anti-fraud throttles

## Getting started

```powershell
# clone repo, then in separate terminals start backend and frontend

# backend
cd server
npm install
npm run migrate
npm run dev        # API on http://localhost:5050

# frontend
cd ..\frontend
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

The frontend dev server proxies `/api` to `http://localhost:5050` by default (configurable via `VITE_API_PROXY_TARGET`). The SPA uses a hash-based router so it can be embedded in Telegram and served from static hosting without special rewrite rules.

For feature-by-feature breakdowns, testing strategy, and environment variables see:

- `frontend/README.md` – React structure, page inventory, dev/CI commands, Telegram testing tips
- `server/README.md` – API surface, worker jobs, migrations, environment variable catalogue

## Key capabilities

- Server-authoritative Blackjack engine with commit/reveal deck handling and balance ledger
- Cryptomus and Telegram Stars payments (invoices + withdrawal scheduling, urgent payouts)
- Player portal: gameplay, wallet management, payment requests, verification/KYC, round & transaction history
- Admin console: login, KPI dashboard, player management, risk feed, withdrawal operations, KYC review, platform settings (demo bankroll, payout policy, commissions, house bias)
- Background workers for payout batching and risk scoring (BullMQ + Redis)
- Comprehensive audit trail stored in PostgreSQL (`transactions`, `game_rounds`, `verification_requests`)

## Tooling & scripts

- `frontend`: `npm run dev`, `npm run build`, `npm run preview`
- `server`: `npm run dev`, `npm run start`, `npm run worker`, `npm run migrate`, `npm test`
- `.vscode/` tasks or PM2 config (`server/ecosystem.config.js`) can be used for multi-process orchestration in production

## Deployment checklist

- Configure backend environment (`server/.env`) with database, Redis, JWT secret, Telegram credentials, Cryptomus keys, and security allowlists (see `server/README.md`)
- Build the frontend (`npm run build` in `frontend/`); upload `frontend/dist/` to your CDN/static host
- Expose the Express API behind an HTTPS reverse proxy; ensure `/api` routes and webhook endpoints are reachable
- Keep Redis highly available (sessions + job queues) and schedule the payout worker alongside the API
- Monitor critical jobs (`riskQueue`, `payoutQueue`) and enable structured logging to your observability stack

## Testing

- Frontend: rely on Vite preview/manual QA today (`npm run preview`); add Vitest/Cypress as needed
- Backend: Jest suites under `server/__tests__/` (`npm test`, `npm test -- --watch`)
- End-to-end: recommended to script Telegram WebApp scenarios with Bot API + Playwright (see `DEPLOYMENT.md` for hints)

## Contributing

1. Create a feature branch
2. Run `npm run lint` / `npm test` (backend) and `npm run build` (frontend) before opening a PR
3. Update documentation when touching config, endpoints, or operational flows
4. Include migrations & seed data when mutating the schema

See the dedicated READMEs for more detail on project conventions, coding standards, and debugging workflows.