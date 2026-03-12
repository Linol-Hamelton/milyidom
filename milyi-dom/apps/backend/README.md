## Backend (Milyi Dom)

NestJS API service for the Milyi Dom platform.

Last synchronized: **2026-03-04**.

### Tech

- NestJS 11
- Prisma 6
- PostgreSQL 16 + PostGIS
- Redis, Socket.IO, Stripe, Typesense

### Run (workspace)

From `milyi-dom/`:

```bash
pnpm --filter backend dev
```

### Run (inside app folder)

From `milyi-dom/apps/backend/`:

```bash
pnpm install
pnpm start:dev
```

API base URL:

- `http://localhost:4001/api`

### Required env

Copy template:

```bash
cp .env.example .env
```

Important variables include:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Prisma

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:seed
```

### Tests and quality

```bash
pnpm test
pnpm lint
```

### Notes

- Global prefix is `/api`.
- Health endpoint is `/api/health`.
- Stripe webhook endpoint is `/api/payments/webhook`.
