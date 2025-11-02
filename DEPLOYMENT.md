# 🚀 Deployment Guide

This guide walks through running the Blackjack Casino platform locally (with ngrok tunnelling for Telegram) and deploying to an Internet-facing environment. Follow the checklists sequentially to avoid missing prerequisites.

---

## 1. Prerequisites

- **Node.js 18 or newer** on all runtime hosts
- **PostgreSQL 13+** with `pgcrypto` extension enabled
- **Redis 6+** (persistent, not ephemeral) for sessions and BullMQ queues
- **ngrok 3+** (local testing) or an HTTPS reverse proxy with a valid TLS certificate in production
- **Cryptomus merchant account** (payments & payouts)
- **Telegram bot** created via @BotFather with WebApp support enabled
- Optional: **PM2** or systemd for process management, **Docker** for containerized deployment

---

## 2. Environment Variables

The backend expects the variables listed in `server/.env.example`. Copy it to `.env` and fill in actual values:

```ini
cp server/.env.example server/.env
```

Key settings:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs player/admin tokens |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection for sessions + queues |
| `ADMIN_PANEL_SECRET` / `_HASH` | Credentials for admin console login |
| `CRYPTOMUS_*` | Payment + payout API credentials |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `ALLOWED_ORIGINS` | Comma-delimited list of frontend origins allowed to call the API |
| `NGROK_MODE`, `NGROK_SKIP_HEADER`, `NGROK_SKIP_QUERY` | Enable automatic bypass of ngrok's "Visit site" splash |
| `VERIFICATION_ALLOWED_HOSTS` | Allowlist for KYC document URLs |

> ℹ️ Frontend-specific values (e.g., `VITE_API_BASE_URL`) live in `frontend/.env.example`.

---

## 3. Database & Redis Setup

1. Create the PostgreSQL database (`blackjack_casino` for staging/production).
2. Ensure the `pgcrypto` extension is available: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
3. Run migrations from the backend folder:
   ```powershell
   cd server
   npm run migrate
   ```
4. Provision Redis and note the connection URL.

---

## 4. Local Development with ngrok

1. Start backend & workers:
   ```powershell
   cd server
   npm install
   npm run migrate
   npm run dev          # API on http://localhost:5050
   npm run worker       # in a second terminal (optional during dev)
   ```
2. Launch the frontend:
   ```powershell
   cd ..\frontend
   npm install
   npm run dev          # http://localhost:5173
   ```
3. Expose the backend with ngrok (HTTPS is required for Telegram WebApp):
   ```powershell
   ngrok http 5050
   ```
4. In `server/.env`, set:
   ```ini
   NGROK_MODE=true
   NGROK_SKIP_HEADER=ngrok-skip-browser-warning
   NGROK_SKIP_QUERY=ngrok-skip-browser-warning
   ALLOWED_ORIGINS=https://<your_ngrok_subdomain>.ngrok.app
   ```
   Restart the backend so the middleware begins redirecting GET/HEAD requests with `?ngrok-skip-browser-warning=true`.
5. Configure the Telegram bot:
   ```powershell
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" ^
     -d "url=https://<your_ngrok_subdomain>.ngrok.app/api/telegram/webhook"
   ```
6. In the BotFather WebApp configuration, set:
   - **WebApp URL**: `https://<your_ngrok_subdomain>.ngrok.app/
   - **Short description / menu button** as desired
7. Open the bot from Telegram → launch WebApp → Vite SPA should load (hash router keeps routes stable).

---

## 5. Production Deployment

### 5.1 Infrastructure Checklist

- Hardened Node.js host(s) with reverse proxy (Nginx, Traefik, or cloud load balancer)
- Managed PostgreSQL instance with automated backups
- Managed Redis (HA preferred) for sessions/queues
- Object storage or CDN to host `frontend/dist`
- TLS certificate covering your domain(s)

### 5.2 Build & Publish Frontend

```powershell
cd frontend
npm install
npm run build
# Deploy the contents of frontend/dist to your static host/CDN
```

Set `VITE_API_BASE_URL` (or proxy rules) so the built SPA points at the production API domain.

### 5.3 Deploy Backend API

1. Copy the backend folder to the server (or build a container image).
2. Install dependencies: `npm install --production`
3. Apply migrations: `npm run migrate`
4. Start processes:
   - API: `npm run start` (or `pm2 start ecosystem.config.js --only api`)
   - Workers: `npm run worker` (or `pm2 start ecosystem.config.js --only workers`)
5. Configure reverse proxy:
   ```nginx
   server {
     listen 443 ssl;
     server_name api.example.com;

     ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

     location /api/ {
       proxy_pass http://127.0.0.1:5050/api/;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto https;
     }
   }
   ```
6. Update environment:
   - `ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`
   - `NGROK_MODE=false`
   - Ensure webhook URLs (`CRYPTOMUS_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_URL`) reference the production domain.
7. Register Telegram webhook with production domain.

### 5.4 Cron & Background Jobs

- BullMQ repeatable jobs are scheduled automatically by `ensurePayoutSchedules` and `ensureRiskSchedules` when the API boots.
- Keep the worker process running (PM2/systemd/Kubernetes deployment) to process queues.
- Monitor queue health via Redis or a Bull board (optional).

---

## 6. Observability & Security

- **Logging:** The backend outputs structured JSON via `server/src/utils/logger.js`; ship logs to your SIEM.
- **Health checks:** `/health` endpoint returns `{ status: "ok" }`; wire to uptime monitors.
- **Backups:** Automate PostgreSQL dumps and ensure Redis persistence (AOF or snapshot).
- **Secrets:** Store `.env` values in a secure secret manager; never commit them to git.
- **Firewall:** Restrict database/Redis access to application hosts; use VPC peering where possible.

---

## 7. Post-Deployment Validation

1. Open the WebApp from Telegram; verify:
   - Profile data loads and balances match the database.
   - Blackjack rounds start/settle and update balances correctly.
   - Payment invoice creation returns links from Cryptomus / Telegram Stars.
   - Withdrawals reach the payout queue and complete (check logs for Cryptomus transaction IDs).
2. Test admin console login and review operations (approve/reject withdrawals, view risk feed).
3. Confirm webhooks (Telegram, Cryptomus) hit the API and respond with 200.
4. Review Redis queues to ensure no stuck jobs.

---

## 8. CI/CD Hints

- Run `npm test` inside `server/` on every push to catch regressions.
- Lint/build the frontend: `npm run build` (Vite performs type-aware bundling).
- Automate migrations using `npm run migrate` during deployment (ensure idempotency).
- Version lock dependencies by committing `package-lock.json` from both workspaces.

---

Happy shipping! If you encounter an environment-specific issue, check the dedicated READMEs and log output first—most configuration errors surface there.
