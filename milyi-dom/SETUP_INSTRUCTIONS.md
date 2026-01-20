# Setup Guide – Milyi Dom

## Prerequisites
- Node.js 18+
- pnpm 8+
- Docker (optional, for PostgreSQL)

## 1. Start the database (optional)
```bash
cd milyi-dom
docker-compose up -d db
```

## 2. Start the backend
```bash
cd apps/backend
pnpm install
pnpm prisma:migrate reset --force
pnpm prisma:seed
pnpm start:dev
```

## 3. Start the frontend
```bash
cd apps/frontend
pnpm install
pnpm dev
```

## Useful URLs
- **Homepage**: http://localhost:3000
- **Register**: http://localhost:3000/auth/register
- **Login**: http://localhost:3000/auth/login
- **Listings**: http://localhost:3000/listings

## Troubleshooting
1. Delete `.next`/`.next-dev` if TypeScript picks up stale types.
2. Ensure the backend runs on port `4001` (default).
3. The frontend expects env var `NEXT_PUBLIC_API_URL`. Copy `.env.example` to `.env.local` if needed.
4. For Dockerised DB, confirm the container is healthy: `docker ps`.
5. Run `pnpm lint` and `pnpm type-check` before committing.
