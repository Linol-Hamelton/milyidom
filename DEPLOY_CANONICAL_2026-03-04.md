# Deploy Update 2026-03-04

This file is the canonical short runbook for production updates on `milyidom.com`.

## Server Path

```bash
cd /opt/milyi-dom/milyi-dom
```

## Pull + Build + Restart

```bash
git pull --ff-only origin main
docker compose up -d --build frontend backend
```

## Database Migrations

```bash
docker compose exec backend sh -c "cd /monorepo/apps/backend && npx prisma migrate deploy"
```

## Runtime Checks

```bash
docker compose ps
docker compose logs backend --tail=80
docker compose logs frontend --tail=80
curl -fsS https://api.milyidom.com/api/health
```

## Optional Hard Recreate

```bash
docker compose up -d --force-recreate frontend backend
```

## Cleanup

```bash
docker image prune -f
```

## Frontend Env (Chat/WebSocket)

```env
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
# optional explicit socket endpoint override
NEXT_PUBLIC_WS_URL=https://api.milyidom.com
```

If `NEXT_PUBLIC_WS_URL` is not set, frontend now derives socket origin from `NEXT_PUBLIC_API_URL`.

## Smoke Checklist

- Guest opens `/host/bookings`: must be redirected and host bookings API must not be called.
- Authenticated user sends a message in `/messages`: new message appears and input is cleared.
- `/listings` on mobile width has no horizontal overflow in view mode controls.
