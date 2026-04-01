# Project Aegis – Zero-Trust Secrets Management

Project Aegis delivers a production-grade secrets platform built on FastAPI, PostgreSQL, HashiCorp Vault, and a React + Tailwind operations console. It enforces Zero-Trust principles, tamper-proof auditing, dynamic leasing, and real-time situational awareness.

## Architecture

```
project-root
├─ backend/                # FastAPI, SQLAlchemy, Celery, Redis adapters
│  ├─ auth/                # JWT, MFA, RBAC endpoints
│  ├─ vault/               # Shamir sharing + Vault orchestration
│  ├─ secrets/             # Static storage + dynamic leasing services
│  ├─ audit/               # Hash-chained logging + verification
│  ├─ alerts/              # Alert retrieval + streaming
│  ├─ services/            # Crypto, events, rate limiting helpers
│  ├─ models/              # ORM entities and Alembic migrations
│  └─ main.py              # FastAPI app + WebSocket hubs
├─ frontend/               # Vite + React admin dashboard
│  ├─ components/          # Cards, charts, tables, Vault UI
│  ├─ pages/               # Dashboard, Secrets, Audit, Access, Vault
│  └─ services/            # Axios + WebSocket helpers
├─ docker-compose.yml      # API, worker, frontend, db, redis, vault services
└─ .env.example            # Reference configuration
```

## Key Capabilities

- **Shamir-based Vault Governance**: Initialize, split master key into 5 fragments, require 3 to unseal, expose live progress UI, and panic mode to revoke leases + seal immediately.
- **Cold Start Guard**: While sealed, every endpoint (except login + unseal) returns `503 Vault Sealed`, and WebSockets refuse connections until three Redis-tracked fragments arrive within the five-minute TTL.
- **Layered Security**: JWT access tokens, short-lived refresh tokens, TOTP MFA, RBAC roles (Admin, Security Officer, Auditor), device fingerprinting, Redis rate limiting, and brute-force alerts.
- **Secrets Lifecycle**: Vault Transit performs envelope encryption, Redis-backed "view" leases return plaintext with a 900-second countdown, and UI purges secrets the instant the timer expires.
- **Immutable Auditing**: Each log commits `SHA-256(prev_hash + payload)` to enforce tamper detection; streaming WebSockets feed dashboards and trigger alerts if the chain breaks.
- **Fail-safe Auto Seal**: Rate-limit breaches or a broken hash-chain trigger an automatic seal (local + remote), broadcast alerts, and force admins through the unseal ritual again.
- **Situational Awareness**: React dashboard visualizes vault status, live alerts, lease velocity (Recharts), audit timeline, and access governance with responsive, dark-themed UI.
- **Deployment Ready**: Dockerized backend, worker, frontend, Postgres, Redis, and Vault. Alembic migrations included. Websocket endpoints exposed for audit, vault, and alerts channels.

## Prerequisites

- Docker / Docker Compose
- Node.js 20+ (if running frontend locally)
- Python 3.11+ (if running backend manually)

## Quick Start with Docker

1. Copy environment template and adjust secrets:
   ```bash
   cp .env.example .env
   ```
2. Build and launch the stack:
   ```bash
   docker compose up --build
   ```
3. Apply database migrations once the API container is healthy:
   ```bash
   docker compose exec api alembic upgrade head
   ```
4. Access services:
   - API docs: http://localhost:8000/docs
   - Frontend UI: http://localhost:5173
   - Vault (dev mode): http://localhost:8200 (token from `.env`)

## Manual Backend Setup

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn backend.main:app --reload
```

Set `DATABASE_URL` to Postgres or leave the default SQLite path for lightweight testing.

## Manual Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL`/`VITE_WS_URL` in a `.env` file (Vite automatically loads `import.meta.env`).

## Operating the Vault

1. **Initialize Shares**: `POST /api/vault/init` (Admin role). Securely distribute the returned 5 fragments.
2. **Unseal**: Submit 3 unique fragments via `POST /api/vault/unseal`. The UI displays progress `n/3`.
3. **Seal**: `POST /api/vault/seal` or press the UI button.
4. **Panic Mode**: `POST /api/vault/panic` revokes all active leases and reseals immediately.

> The dev Vault container runs in -dev mode for simplicity. For production, switch to HA Vault, disable dev flags, and store master shares offline.
> Unseal fragments live in Redis for `UNSEAL_SHARE_TTL_SECONDS` seconds. If the TTL lapses before `k` admins respond, the ritual must restart.

## Security Notes

- Passwords are hashed with bcrypt via Passlib, MFA enforced with TOTP (pyotp), and JWTs expire in 15 minutes by default.
- Redis-backed rate limiting locks out abusive IPs and device fingerprints.
- Access events + failed logins generate alert records and stream via WebSockets for instant visualization.
- Vault Transit wraps every stored secret; rotate `VAULT_TRANSIT_KEY` periodically and rewrap ciphertexts via the Vault CLI/API.

## API Surface

| Method | Endpoint               | Description                      |
|--------|------------------------|----------------------------------|
| POST   | /api/auth/login        | Username/password stage          |
| POST   | /api/auth/mfa-verify   | TOTP verification, issues JWTs   |
| GET    | /api/users             | List users + roles               |
| POST   | /api/secrets/store     | Vault-transit static storage     |
| POST   | /api/secrets/issue     | Create dynamic lease             |
| GET    | /api/secrets/leases    | Inspect lease ledger             |
| GET    | /api/secrets/static    | List stored secrets (metadata)   |
| POST   | /api/secrets/static/{id}/view | Vault-transit decrypt + 15-min lease |
| GET    | /api/audit/entries     | Hash-chained audit log           |
| POST   | /api/vault/init        | Generate Shamir shares           |
| POST   | /api/vault/unseal      | Submit key fragment              |
| POST   | /api/vault/seal        | Seal vault + revoke access       |
| POST   | /api/vault/panic       | Revoke leases + seal             |
| GET    | /api/vault/status      | Vault seal state + progress      |
| GET    | /api/alerts            | Active security alerts           |

WebSocket channels:
- `/ws/audit` – live audit feed
- `/ws/vault` – seal/unseal status
- `/ws/leases` – lease issuance and panic revocations
- `/ws/alerts` – security alerts

## Testing & Next Steps

- Add pytest suites for services, Shamir validation, and audit chain verification.
- Integrate production-ready OIDC provider for SSO.
- Harden Vault integration by exchanging real unseal keys and enabling auto-unseal with HSM/cloud KMS.
- Extend Celery beat tasks for anomaly detection jobs.

## Troubleshooting

- **Rate Limit**: 429 responses include `retry_after`. Tune via `RATE_LIMIT_*` env vars.
- **WebSockets**: Ensure `VITE_WS_URL` matches backend host (`ws://localhost:8000`).
- **Vault Dev Token**: Provided via `.env`; rotate before production.
- **Migrations**: If using SQLite, update `alembic.ini` URL accordingly.

Project Aegis is ready for further hardening: plug into centralized identity, wire SIEM exports, and enforce infrastructure-as-code guardrails for enterprise deployment.
