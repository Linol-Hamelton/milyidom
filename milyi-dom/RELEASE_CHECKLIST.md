# Milyi Dom — Release Checklist

Run before every production deploy. All items must pass.

---

## 1. Pre-deploy (local)

```bash
# TypeScript — zero errors
cd milyi-dom/apps/backend  && npx tsc --noEmit --skipLibCheck
cd milyi-dom/apps/frontend && npx tsc --noEmit --skipLibCheck

# No placeholder secrets in .env
grep -E '<[A-Z_]+>|PLACEHOLDER|changeme|secret123' \
  milyi-dom/apps/backend/.env && echo "FIX BEFORE DEPLOY" || echo "OK"

# Unit tests pass
cd milyi-dom/apps/backend && npx pnpm test --passWithNoTests
```

## 2. Security regression

```bash
# Run E2E suite against production (from local)
cd milyi-dom/e2e && npm test -- --reporter=list
# Required: 94/94 pass
```

Manual checks (5 min):
- [ ] `GET /api/admin/users` without token → 401
- [ ] `GET /api/bookings/host` as GUEST → 403
- [ ] `PATCH /api/admin/listings/:id/status` as HOST → 403
- [ ] Webhook endpoint rejects invalid Stripe/YooKassa signature → 400
- [ ] No admin routes accessible to unauthenticated users (`/admin/*`)

## 3. Deploy

```bash
cd /opt/milyi-dom/milyi-dom

# 1. Backup DB first
./backup.sh

# 2. Pull code
git pull

# 3. Run migrations (no-op if none pending)
docker compose exec backend npx prisma migrate deploy

# 4. Rebuild changed services
docker compose up -d --build backend frontend

# 5. Smoke test (~30s)
./smoke.sh
```

## 4. Post-deploy verification

```bash
# Health check
curl -s https://api.milyidom.com/api/health | grep '"status":"ok"'

# Check container logs for errors (first 60s after deploy)
docker compose logs backend --tail=50 | grep -i "error\|fatal\|crash" | grep -v "No error"
```

Manual spot checks:
- [ ] Homepage loads at https://milyidom.com
- [ ] Login works (admin@example.com)
- [ ] Listing detail page renders with map
- [ ] Can send a message (WebSocket active)

## 5. Security headers check

```bash
# Verify headers on frontend
curl -sI https://milyidom.com | grep -E "X-Frame|X-Content|Strict-Transport|Referrer|Content-Security"
```

Expected output:
```
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; ...
```

---

## Rollback

```bash
cd /opt/milyi-dom/milyi-dom
git log --oneline -5         # find last good commit
git checkout <commit-sha>
docker compose up -d --build backend frontend
```

Full runbook: [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md)
Secrets: [SECRETS_ROTATION.md](./SECRETS_ROTATION.md)
