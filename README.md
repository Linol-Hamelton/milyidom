# Milyi Dom

Monorepo for the Milyi Dom rental platform.

Last synchronized with codebase: **2026-03-04**.

## Current Product State

- Delivery stage: **production beta**.
- Core web roles are implemented: `GUEST`, `HOST`, `ADMIN`.
- Main API and UI flows are functional, including:
  - authentication (password, OAuth, 2FA),
  - listings/search/favorites,
  - bookings and payments,
  - messaging,
  - host dashboard/listings/payout settings,
  - admin sections.
- Critical regressions from the latest QA cycle were fixed (route guards, messaging send flow, listing create duplicate risk, favorites price display, decimal coordinates input).
- Remaining work and priorities: see [plans.md](plans.md).

## Repository Layout

```text
newhome/
├── milyi-dom/                        # pnpm workspace
│   ├── apps/
│   │   ├── backend/                  # NestJS API
│   │   ├── frontend/                 # Next.js web app
│   │   └── mobile/                   # Expo app
│   ├── docker-compose.yml
│   ├── prometheus.yml
│   └── package.json
├── README.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── SECURITY.md
├── plans.md
├── DEPLOY.md
├── DEPLOY_FASTPANEL.md
└── milyi-dom/SETUP_INSTRUCTIONS.md
```

## Stack (Actual)

- Backend: NestJS 11, Prisma 6, PostgreSQL 16 + PostGIS
- Frontend: Next.js 15 (App Router), React 18
- Mobile: Expo SDK 52
- Infra: Docker Compose, PgBouncer, Redis, Typesense
- Realtime: Socket.IO
- Payments: Stripe
- Monitoring: Prometheus + Grafana

## Quick Start (Docker)

```bash
cd milyi-dom
docker compose up -d
```

Local service ports from the current `docker-compose.yml`:

- Frontend: `http://127.0.0.1:3002`
- Backend API: `http://127.0.0.1:4001/api`
- PostgreSQL: `127.0.0.1:5432`
- PgBouncer: `127.0.0.1:5433`
- Redis: `127.0.0.1:6380`
- Typesense: `127.0.0.1:8108`
- Prometheus: `127.0.0.1:9090`
- Grafana: `127.0.0.1:3003`

## Quick Start (Local Development)

```bash
cd milyi-dom
pnpm install

# infrastructure only
docker compose up -d db redis typesense pgbouncer

# backend
pnpm --filter backend dev

# frontend (new terminal)
pnpm --filter frontend dev
```

## Testing

Current targeted automated tests in repository:

- Backend specs: `3`
- Frontend tests: `5`

Run:

```bash
cd milyi-dom
pnpm --filter backend test
pnpm --filter frontend test
```

If `pnpm` is not available in shell `PATH`, use:

```bash
corepack pnpm --filter backend test
corepack pnpm --filter frontend test -- --run
corepack pnpm --filter backend exec npx tsc --noEmit --skipLibCheck
corepack pnpm --filter frontend exec npx tsc --noEmit --skipLibCheck
```

## Regression Protocol (Feature Work)

For each feature fix or new implementation:

1. Run backend and frontend regression tests.
2. Run backend and frontend TypeScript checks.
3. Update [plans.md](plans.md) validation log with executed commands and outcomes.
4. Re-check protected routes and role-based behavior if auth-sensitive code changed.

## Environment Files

- Backend template: `milyi-dom/apps/backend/.env.example`
- Frontend template: `milyi-dom/apps/frontend/.env.example`

## Documentation Index

- [ARCHITECTURE.md](ARCHITECTURE.md): current system architecture and constraints.
- [ROADMAP.md](ROADMAP.md): delivery roadmap from current baseline.
- [SECURITY.md](SECURITY.md): implemented controls and open security backlog.
- [plans.md](plans.md): prioritized implementation plan for remaining work.
- [DEPLOY.md](DEPLOY.md): full deployment and operations guide.
- [DEPLOY_FASTPANEL.md](DEPLOY_FASTPANEL.md): FastPanel-specific production notes.
- [milyi-dom/SETUP_INSTRUCTIONS.md](milyi-dom/SETUP_INSTRUCTIONS.md): setup guide for local development.

## Release Note (2026-03-04)

Latest merged stabilization changes include:

- Host payouts page guard enforcement (`HOST`/`ADMIN` only).
- Host bookings RBAC alignment for backend controller metadata.
- Messaging send flow fix in `/messages` (no silent no-op on submit).
- Listing creation hardening with idempotency key support and longer request timeout.
- Favorites price formatting fix (numeric value handling).
- Decimal coordinate support in listing form (`latitude`/`longitude` step validation).
- Responsive improvements in listing controls on narrow screens.
