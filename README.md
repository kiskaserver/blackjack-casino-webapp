<h1 align="center">♠️ Blackjack Casino Platform</h1>
<p align="center">
	<strong>Telegram WebApp</strong> for multiplayer blackjack, real-money wallets, automated payouts, and an operations console.<br/>
	<sub>Node.js · Express · React 18 · Vite · PostgreSQL · Redis · BullMQ</sub>
</p>

<p align="center">
	<a href="https://nodejs.org/"><img alt="Node 18+" src="https://img.shields.io/badge/node-18%2B-5FA04E?style=flat-square" /></a>
	<a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=black" /></a>
	<a href="https://www.postgresql.org/"><img alt="PostgreSQL" src="https://img.shields.io/badge/postgresql-15-336791?style=flat-square&logo=postgresql&logoColor=white" /></a>
	<a href="https://redis.io/"><img alt="Redis" src="https://img.shields.io/badge/redis-7-D82C20?style=flat-square&logo=redis&logoColor=white" /></a>
</p>

---

## 📦 Repository Layout

- `frontend/` – React 18 + Vite SPA (player portal + admin console)
- `server/` – Express API, BullMQ workers, Knex migrations, Jest tests
- `DEPLOYMENT.md` – operational runbooks for local ngrok and production hosting
- `frontend/README.md` / `server/README.md` – component and API level deep dives

Legacy static assets (`index.html`, `admin/`, `css/`, `js/`) were removed; always serve the compiled SPA and proxy `/api` traffic to the backend.

## 🧭 Architecture Snapshot

- **Transport:** Telegram WebApp embeds + HTTPS REST API (`/api/player`, `/api/game`, `/api/payments`, `/api/admin`)
- **Backend:** Node.js 18, Express, PostgreSQL, Redis, BullMQ queues (payout + risk)
- **Frontend:** HashRouter for WebApp compatibility, React context providers, service-layer API clients with automatic Telegram header injection
- **Security:** Telegram init data verification, Redis-backed admin sessions (JWT), per-route rate limiting, verification host allowlist, anti-fraud throttles

## ✨ Feature Highlights

- 🎲 Provably fair blackjack engine (commit/reveal deck, double down, dealer automation)
- 💳 Payments via Cryptomus + Telegram Stars, withdrawal batching with urgent payout path
- 🧾 Player self-service: wallet balances, game history, transactions, demo resets, KYC submissions
- 🛡️ Risk automation: velocity checks, win-cap enforcement, rigging overrides, audit trail
- 📊 Operations console: admin auth, KPI dashboards, player management, payout approval workflow

## 🔗 Frontend ⇄ Backend Integration

| Flow | Frontend Source | Backend Endpoint |
| --- | --- | --- |
| Player profile + balances | `playerApi.getProfile` (`pages/player/ProfilePage.jsx`) | `GET /api/player/profile`
| Round history & ledger | `playerApi.getHistory` (`pages/player/HistoryPage.jsx`) | `GET /api/player/history`
| Blackjack gameplay | `startRound`, `hitRound`, `doubleDown`, `settleRound` (`pages/player/GamePage.jsx`) | `POST /api/game/(start|hit|double|settle)`
| Payments & withdrawals | `requestWithdrawal`, `createCryptomusInvoice`, `createTelegramStarsInvoice` (`pages/player/PaymentsPage.jsx`) | `POST /api/payments/(withdraw|cryptomus/invoice|telegram-stars/invoice)`
| Verification | `getVerification`, `submitVerification` (`pages/player/VerificationPage.jsx`) | `GET/POST /api/player/verification`
| Admin dashboard | `adminApi` hooks (`pages/admin/*`) | `/api/admin/*` routes with Redis-backed JWT sessions

Each API client injects `X-Telegram-Init-Data` to satisfy `verifyTelegram` middleware. Withdrawal actions run through BullMQ (`payoutQueue`) and crypto payouts now call Cryptomus directly—no placeholders remain. Jest suites cover risk, withdrawal, and player flows to guard regressions.

## 🚀 Quickstart

```powershell
# Backend
cd server
npm install
npm run migrate
npm run dev        # http://localhost:5050

# Frontend (new terminal)
cd ..\frontend
npm install
npm run dev        # http://localhost:5173 (proxy -> 5050)
```

Set up environment variables first (see `server/.env.example` and `frontend/.env.example`). The Vite dev server proxies `/api` to the Express backend; adjust `VITE_API_PROXY_TARGET` if your API runs elsewhere.

## 🧪 Testing & Quality

- Backend unit tests: `cd server && npm test`
- Targeted suites: `npm test -- --runTestsByPath __tests__/withdrawalService.test.js`
- Frontend preview smoke tests: `cd frontend && npm run preview`
- Workers: run `npm run worker` (server) alongside Redis to process payout/risk queues

## 📘 Documentation Map

- `server/README.md` – API contracts, environment matrix, migration strategy
- `frontend/README.md` – routing, contexts, Telegram integration tips
- `DEPLOYMENT.md` – local ngrok tunnelling, production reverse proxy & CI/CD checklist

## 🛠️ Core Scripts

- `server`: `npm run dev`, `npm run start`, `npm run worker`, `npm run migrate`, `npm test`
- `frontend`: `npm run dev`, `npm run build`, `npm run preview`
- PM2 profile: `server/ecosystem.config.js` for multi-process orchestration

## 🤝 Contributing

1. Create a feature branch from `main`
2. Keep tests green (`npm test` in `server/`, `npm run build` in `frontend/`)
3. Update docs when touching environment, endpoints, or operational flows
4. Include migrations & seeds whenever the schema changes

See `DEPLOYMENT.md` for rollout instructions.