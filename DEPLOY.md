# DEPLOY

Full deployment and operations guide for Milyi Dom.

Last synchronized with real server workflow: **2026-03-04**.

## 1. Production Layout

- Server project path: `/opt/milyi-dom/milyi-dom`
- Stack is managed by `docker compose` from that directory.
- Public domains:
  - `https://milyidom.com` -> frontend container (`127.0.0.1:3002`)
  - `https://api.milyidom.com` -> backend container (`127.0.0.1:4001`)

## 2. Required Files

- `apps/backend/.env`
- `apps/frontend/.env.local`
- optional compose args file in project root (if used by your setup)

Use templates:

- `apps/backend/.env.example`
- `apps/frontend/.env.example`

## 3. Standard Update Procedure

```bash
cd /opt/milyi-dom/milyi-dom

# get code
git pull --ff-only origin main

# rebuild changed app services
docker compose up -d --build frontend backend

# optional explicit restart
docker compose restart frontend backend

# safe migration step (always allowed)
docker compose exec backend sh -c "cd /monorepo/apps/backend && npx prisma migrate deploy"
```

## 4. Validation Procedure

```bash
docker compose ps
docker compose logs backend --tail=80
docker compose logs frontend --tail=80
```

Health checks:

```bash
curl -fsS https://api.milyidom.com/api/health
```

Socket transport sanity check:

```bash
curl -fsS "https://api.milyidom.com/socket.io/?EIO=4&transport=polling"
```

If this fails or websocket handshake in browser logs returns `400`, verify reverse-proxy websocket upgrade config for `/socket.io/`.

Path sanity check:

```bash
# current canonical socket path
curl -fsS "https://api.milyidom.com/socket.io/?EIO=4&transport=polling"

# should be 404 in current setup (non-canonical)
curl -i "https://api.milyidom.com/api/socket.io/?EIO=4&transport=polling"
```

If the check fails but backend is up, test current fallback path (validated in production on 2026-03-05):

```bash
curl -fsS https://api.milyidom.com/api/api/health
```

If only fallback works, fix proxy path mapping so canonical endpoint is `/api/health`.

## 5. Rollback Procedure

If current deployment is unstable:

```bash
cd /opt/milyi-dom/milyi-dom
git log --oneline -n 5

# checkout previous stable commit (example)
git checkout <stable_commit_sha>
docker compose up -d --build frontend backend
docker compose exec backend sh -c "cd /monorepo/apps/backend && npx prisma migrate deploy"
```

After incident is resolved, return branch to `main` and pull latest verified commit.

## 6. Database Notes

- Runtime DB traffic uses PgBouncer in compose network.
- Migrations should run with backend container command shown above.
- Command is idempotent when there are no pending migrations.

## 7. Common Operational Commands

```bash
# container status
docker compose ps

# backend logs
docker compose logs -f backend

# frontend logs
docker compose logs -f frontend

# tail all
docker compose logs --tail=100

# cleanup dangling images
docker image prune -f
```

## 8. Post-Deploy Smoke Tests (Minimum)

Run these manually or script them:

1. Guest access control:
   - `/host/payouts` -> blocked/redirected.
   - `/host/bookings` -> blocked/redirected.
2. Authenticated messaging:
   - open `/messages`, send message, verify instant append and input clear.
3. Host listing creation:
   - create listing once, verify no duplicate created.
4. Favorites:
   - verify numeric price rendering.
5. API health endpoint:
   - canonical check returns `{"status":"ok"...}`.

## 9. Security and Reliability Notes

- Do not commit `.env` or `.env.local` files.
- Use `git pull --ff-only` to avoid accidental merge commits on server.
- Keep deployment docs aligned with actual reverse proxy behavior.
- For frontend websocket resilience, use:
  - `NEXT_PUBLIC_WS_TRANSPORTS=polling,websocket`
  - `NEXT_PUBLIC_WS_UPGRADE_BACKOFF_MINUTES=30`
  - client auto-downgrades to polling on websocket probe failures.
- Run migrations before final acceptance checks.
- Preserve `restart: unless-stopped` in compose services.

## 10. Related Docs

- [DEPLOY_FASTPANEL.md](DEPLOY_FASTPANEL.md): FastPanel-specific production notes.
