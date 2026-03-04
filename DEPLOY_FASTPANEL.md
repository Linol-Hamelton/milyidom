# DEPLOY_FASTPANEL

FastPanel-oriented production deployment notes for Milyi Dom.

Last synchronized: **2026-03-04**.

## 1. Server Facts

- Domain: `milyidom.com`
- API domain: `api.milyidom.com`
- Project path: `/opt/milyi-dom/milyi-dom`
- Compose-managed services run on localhost-bound ports.

Current internal port map from compose:

- frontend: `127.0.0.1:3002 -> 3000`
- backend: `127.0.0.1:4001 -> 4001`
- db: `127.0.0.1:5432 -> 5432`
- pgbouncer: `127.0.0.1:5433 -> 5432`
- redis: `127.0.0.1:6380 -> 6379`
- typesense: `127.0.0.1:8108 -> 8108`
- prometheus: `127.0.0.1:9090 -> 9090`
- grafana: `127.0.0.1:3003 -> 3000`

## 2. FastPanel Proxy Targets

Recommended:

- `milyidom.com` -> `http://127.0.0.1:3002`
- `api.milyidom.com` -> `http://127.0.0.1:4001`

Important:

- Backend already has Nest global prefix `/api`.
- Avoid adding extra `/api` rewrite in proxy location blocks, or you can end up with `/api/api/*` externally.

## 3. Required Nginx Directives (API Site)

Use custom directives for websocket and webhook reliability:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

location /socket.io/ {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_send_timeout 86400s;
    proxy_read_timeout 86400s;
}

location /api/payments/webhook {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_request_buffering off;
}

client_max_body_size 15M;
```

## 4. Deploy Commands (FastPanel Server)

```bash
cd /opt/milyi-dom/milyi-dom

git pull --ff-only origin main
docker compose up -d --build frontend backend
docker compose exec backend sh -c "cd /monorepo/apps/backend && npx prisma migrate deploy"
```

Optional explicit restart:

```bash
docker compose restart frontend backend
```

## 5. Verification

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

If this fails or websocket handshake logs show `400`, verify `location /socket.io/` proxy directives and upgrade headers.

Websocket upgrade path check (from local/dev machine):

```bash
# polling transport must be 200
curl -fsS "https://api.milyidom.com/socket.io/?EIO=4&transport=polling"

# NOTE: /api/socket.io is NOT the canonical path in current setup and should return 404
curl -i "https://api.milyidom.com/api/socket.io/?EIO=4&transport=polling"
```

Production behavior target:

- if websocket upgrade succeeds: clients may switch from polling to websocket;
- if websocket upgrade fails (`probe error: websocket error`), frontend should keep working over polling without breaking messaging.

Fallback currently observed in production state (validated 2026-03-05):

```bash
curl -fsS https://api.milyidom.com/api/api/health
```

If fallback is needed, fix proxy route mapping.

## 6. Environment Notes

Backend env path:

- `/opt/milyi-dom/milyi-dom/apps/backend/.env`

Frontend env path:

- `/opt/milyi-dom/milyi-dom/apps/frontend/.env.local`

Minimum frontend vars:

```env
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...
```

Optional websocket override:

```env
NEXT_PUBLIC_WS_URL=https://api.milyidom.com
NEXT_PUBLIC_WS_TRANSPORTS=polling,websocket
NEXT_PUBLIC_WS_UPGRADE_BACKOFF_MINUTES=30
```

Runtime resilience note:

- frontend now auto-downgrades to polling-only mode on websocket probe failures and stores temporary backoff in browser storage.
- this prevents repeated websocket reconnect flapping when proxy upgrade path is misconfigured.

## 7. Post-Deploy Smoke Checklist

1. Unauthorized guest cannot access `/host/payouts` and `/host/bookings`.
2. Authenticated messaging send works from `/messages`.
3. Host listing creation is stable (no duplicate records from retries).
4. Favorites show valid numeric prices.

## 8. Cleanup

```bash
docker image prune -f
```

Use `docker system prune -f` only if you explicitly want broader cleanup.
