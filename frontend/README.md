# Blackjack Casino – Frontend

React 18 + Vite single-page application that delivers both the player-facing Telegram WebApp and the authenticated admin console. Hash-based routing keeps navigation working inside Telegram while enabling static hosting/CDN delivery.

## Tech stack

- React 18, React Router 6 (`HashRouter`)
- Vite 5 build tool (ESM + fast HMR)
- Context providers for Telegram WebApp integration and admin session management
- Fetch-based API clients with typed helpers (`src/api/*`)
- CSS modules replaced by a hand-written global stylesheet (`src/styles/global.css`)

## Directory layout

```
frontend/
  package.json
  vite.config.js
  index.html
  src/
    main.jsx             # Entry point, wraps Router + providers
    App.jsx              # Route map (player + admin)
    styles/global.css    # Shared styling theme
    providers/           # TelegramProvider, AdminProvider
    api/                 # baseClient.js, playerApi.js, adminApi.js
    components/          # Access guards (RequireTelegram/AdminAuth)
    layouts/             # PlayerLayout, AdminLayout nav shells
    pages/
      player/            # Game, Profile, Payments, Verification, History
      admin/             # Login, Dashboard, Players, Withdrawals, Verifications, Settings
```

## Environment variables

Vite exposes environment variables prefixed with `VITE_` at build time. Create `frontend/.env.local` for local overrides.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Prefix for API requests in production build (no trailing slash) |
| `VITE_API_PROXY_TARGET` | `http://localhost:5050` | Dev server proxy target for `/api` calls |
| `VITE_DEV_SERVER_PORT` | `5173` | Vite dev server port |
| `VITE_TELEGRAM_INIT_DATA` | — | Optional hard-coded `initData` string for local testing without Telegram shell |

## Available scripts

```powershell
npm install           # install dependencies
npm run dev           # start Vite dev server (http://localhost:5173)
npm run build         # create production build in dist/
npm run preview       # serve built assets locally for smoke tests
```

## Player application

- **TelegramProvider** reads `Telegram.WebApp.initData`, keeps theme in sync, and allows manual input when running outside Telegram.
- **Player routes** (`/`, `/profile`, `/payments`, `/verification`, `/history`) call backend endpoints via `createPlayerApi`. Requests automatically include `X-Telegram-Init-Data`.
- **HistoryPage** fetches aggregated stats, recent rounds, and ledger transactions from `/api/player/history` (new backend endpoint).
- **PaymentsPage** covers Cryptomus invoices, Telegram Stars deposits, and withdrawal requests without client-side mocks.

### Local testing tips

1. Launch the backend (`npm run dev` in `server/`).
2. Start Vite (`npm run dev` in `frontend/`).
3. Navigate to `http://localhost:5173/#/`.
4. When prompted, paste a valid `initData` string (copy from Telegram or use `VITE_TELEGRAM_INIT_DATA`).

> **Note:** Telegram restricts some features (payments) outside the WebApp container. Use staging bots + the official Telegram desktop/mobile client for end-to-end tests.

## Admin console

- **Login** – `/admin/login`, uses `AdminProvider` to persist JWT session in `localStorage`.
- **Dashboard** – `/admin/dashboard`, surfaces aggregated KPIs, transaction feed, and risk events.
- **Players** – `/admin/players`, search/list players, adjust balances, manage statuses, update demo wallets/settings, inspect risk events.
- **Withdrawals** – `/admin/withdrawals`, filter queue, change statuses, enqueue urgent payouts, manage batches.
- **Verifications** – `/admin/verifications`, review KYC payloads, approve/reject/resubmit.
- **Settings** – `/admin/settings`, live-edit demo defaults, payout policy, commission tables, and house bias controls.

All admin requests are executed through `createAdminApi`, which injects bearer tokens and handles JSON parsing/error normalization.

## Styling

A single global stylesheet (`styles/global.css`) defines the dark casino theme. Components rely on utility classes (`card`, `main-shell`, `sidebar`, etc.). Adjustments should go through this file to keep admin/player themes consistent.

## Building for production

1. Point `VITE_API_BASE_URL` to your deployed API origin (e.g. `https://api.example.com/api`).
2. Run `npm run build`.
3. Deploy the contents of `dist/` to your static hosting provider (Netlify, Cloudflare Pages, S3+CloudFront, etc.).
4. Ensure your hosting rewrites `/*` to `index.html` (hash routing tolerates direct hits, but index fallback is still required).

## Future improvements

- Add automated testing (Vitest + React Testing Library, Cypress for E2E).
- Extract reusable table/form components shared between admin pages.
- Internationalisation layer for Russian/English toggling.
- Deep links into risk events and withdrawals (shareable permalinks).

For backend-specific information, see `../server/README.md`. For deployment considerations (Telegram bot setup, webhook exposure, CI/CD) consult `../DEPLOYMENT.md`.
