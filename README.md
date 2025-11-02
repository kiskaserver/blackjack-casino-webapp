<h1 align="center">♠️ Blackjack Casino Platform</h1>
<p align="center">
  <strong>Telegram WebApp</strong> for a provably-fair blackjack table, real-money wallets, automated payouts, and a full-featured operations console.<br />
  <sub>Node.js · Express · React 18 · Vite · PostgreSQL · Redis · BullMQ</sub>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img alt="Node 18+" src="https://img.shields.io/badge/node-18%2B-5FA04E?style=flat-square"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=black"></a>
  <a href="https://www.postgresql.org/"><img alt="PostgreSQL" src="https://img.shields.io/badge/postgresql-14%2B-336791?style=flat-square&logo=postgresql&logoColor=white"></a>
  <a href="https://redis.io/"><img alt="Redis" src="https://img.shields.io/badge/redis-6%2B-D82C20?style=flat-square&logo=redis&logoColor=white"></a>
</p>

---

## �️ Repository Layout

| Path | Description |
| --- | --- |
| `frontend/` | React + Vite single-page app (player WebApp + admin console) |
| `server/` | Express API, BullMQ workers, Knex migrations, Jest suites |
| `DEPLOYMENT.md` | Runbooks for local ngrok tunnels, prod hosting, bot configuration |
| `frontend/README.md`, `server/README.md` | Deep dives for each package |

## 🏛️ Architecture Overview

- **Transport** – Telegram WebApp loads the SPA; REST API exposed under `/api/*` for player, payment, and admin flows.
- **Backend** – Node 18, Express 5, PostgreSQL for ledgers & rounds, Redis for sessions/queues, BullMQ for payouts + anti-fraud jobs.
- **Frontend** – React 18 with hash-based routing for Telegram compatibility, context providers for Telegram/ Admin state, typed API clients with automatic `X-Telegram-Init-Data` headers.
- **Security** – Telegram signature verification, JWT + Redis backed admin sessions, IP/rate limiting, verification host allowlists, configurable anti-fraud throttles.
- **Fairness** – Multi-deck commit-reveal shoe, dealer rules driven by admin settings, RTP/house-edge analytics surfaced to both players and admins.

## ✨ Feature Highlights

- 🎲 **Blackjack engine** – commit/reveal RNG, hit/stand/double rules, dealer soft-17 logic, gameplay telemetry.
- 💳 **Payments & payouts** – Cryptomus deposits, Telegram Stars top-ups, withdrawal batching, urgent payout path, commission accounting.
- 🧾 **Player services** – profile & balances, round history, ledger view, KYC submissions, demo wallet controls.
- 📊 **Transparency tools** – live RTP & house edge cards in the WebApp and admin console, configurable target RTP window, rolling sample analytics.
- 🛡️ **Risk & compliance** – velocity limits, profit caps, Redis-backed throttles, automated risk events, audit trail via BullMQ workers.
- 🧰 **Admin console** – dashboard KPIs, player management, withdrawal approvals, verification workflow, runtime settings editor.

## 🚀 Quickstart

```powershell
# Backend API
cd server
npm install
npm run migrate        # applies Knex migrations
npm run dev            # http://localhost:5050

# Worker processes (new terminal)
npm run worker         # risk/payout queues

# Frontend SPA
cd ..\frontend
npm install
npm run dev            # http://localhost:5173 (proxy -> 5050)
```

Prepare `.env` files from `*.env.example` before starting services. The Vite dev server proxies `/api` requests to the backend (configurable via `VITE_API_PROXY_TARGET`).

## 🔗 Frontend ⇄ Backend Matrix

| Flow | Frontend entry point | Backend endpoint |
| --- | --- | --- |
| Player profile & balances | `pages/player/ProfilePage.jsx` → `playerApi.getProfile()` | `GET /api/player/profile` |
| Round history & ledger | `pages/player/HistoryPage.jsx` → `playerApi.getHistory()` | `GET /api/player/history` |
| Blackjack actions | `pages/player/GamePage.jsx` → `startRound`/`hitRound`/`doubleDown`/`settleRound` | `POST /api/game/*` |
| Fairness analytics | `GamePage.jsx` / `AdminDashboardPage.jsx` → `playerApi.getFairness()` / `adminApi.getOverview()` | `GET /api/game/fairness`, `GET /api/admin/stats/overview` |
| Payments & withdrawals | `pages/player/PaymentsPage.jsx` | `POST /api/payments/*` |
| Verification flow | `pages/player/VerificationPage.jsx` | `GET/POST /api/player/verification` |
| Admin operations | `pages/admin/*` via `adminApi` | `/api/admin/**/*` |

All player requests include the raw Telegram `initData` inside the `X-Telegram-Init-Data` header so the backend can validate sessions with HMAC.

## ⚙️ Core Scripts

| Package | Script | Purpose |
| --- | --- | --- |
| `server` | `npm run dev` | start Express API |
|  | `npm run worker` | launch BullMQ workers |
|  | `npm run migrate` / `npm run migrate:rollback` | apply or rollback database migrations |
|  | `npm test` | Jest suites (anti-fraud, player routes, withdrawals) |
| `frontend` | `npm run dev` | Vite dev server with proxy |
|  | `npm run build` | production bundle in `dist/` |
|  | `npm run preview` | serve built assets locally |

## 🧪 Quality & Observability

- **Backend tests:** `cd server && npm test`
- **Frontend smoke:** `cd frontend && npm run preview`
- **Workers:** run `npm run worker` alongside Redis to process payouts and risk sweeps
- **Logging:** structured JSON logs via `src/utils/logger.js`, sensitive fields auto-redacted

## � Documentation Hub

- [`server/README.md`](server/README.md) – environment matrix, API surface, queue jobs, testing
- [`frontend/README.md`](frontend/README.md) – routing, providers, UI architecture, Telegram tips
- [`DEPLOYMENT.md`](DEPLOYMENT.md) – ngrok usage, production checklist, monitoring hooks

## 🤝 Contributing

1. Branch from `main`
2. Keep tests/builds green (`npm test`, `npm run build`)
3. Include migrations when the schema changes
4. Update docs when environment variables, endpoints, or operations change

Refer to `DEPLOYMENT.md` for release procedures and infrastructure expectations.