# SETUP_INSTRUCTIONS

Local development setup guide for Milyi Dom.

Last synchronized: **2026-03-04**.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (recommended for infra)

## 1. Install dependencies

```bash
cd milyi-dom
pnpm install
```

## 2. Prepare environment files

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Fill secrets and required keys before running production-like flows.

## 3. Start infrastructure

```bash
docker compose up -d db redis typesense pgbouncer
```

## 4. Database migration

```bash
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec prisma generate
```

## 5. Start backend

```bash
pnpm --filter backend dev
```

## 6. Start frontend

```bash
pnpm --filter frontend dev
```

## 7. Useful URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4001/api`
- Health: `http://localhost:4001/api/health`

## 8. Optional seed

```bash
pnpm --filter backend prisma:seed
```

## 9. Troubleshooting

1. If dependencies mismatch, run `pnpm install` at workspace root again.
2. If prisma errors after schema updates, run `pnpm --filter backend exec prisma generate`.
3. If frontend cannot call API, verify `NEXT_PUBLIC_API_URL` in `apps/frontend/.env.local`.
4. If Docker services are unhealthy, check `docker compose ps` and service logs.

## 10. Mandatory Regression Checks Before Merge

```bash
# backend tests
corepack pnpm --filter backend test

# frontend tests
corepack pnpm --filter frontend test -- --run

# backend types
corepack pnpm --filter backend exec npx tsc --noEmit --skipLibCheck

# frontend types
corepack pnpm --filter frontend exec npx tsc --noEmit --skipLibCheck
```

Record results in root `plans.md` validation log after each feature cycle.
