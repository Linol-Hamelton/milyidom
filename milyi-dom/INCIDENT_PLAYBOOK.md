# Milyi Dom — Incident Response Playbook

Server: `62.217.178.117` | Project: `/opt/milyi-dom/milyi-dom/`

---

## 1. Quick Diagnostics

```bash
# All containers status
docker compose ps

# Last 50 lines of backend logs
docker compose logs backend --tail=50

# Last 50 lines of frontend logs
docker compose logs frontend --tail=50

# Resource usage
docker stats --no-stream

# Disk space
df -h /opt/milyi-dom/backups /var/lib/docker
```

---

## 2. Rollback Procedure

### Standard rollback (to previous git commit)

```bash
cd /opt/milyi-dom/milyi-dom

# Find last known-good commit
git log --oneline -10

# Roll back code
git checkout <commit-sha>

# Rebuild and restart
docker compose up -d --build backend frontend
```

### Emergency rollback (keep DB, restart containers only)

```bash
cd /opt/milyi-dom/milyi-dom
docker compose restart backend frontend
```

---

## 3. Scenario Runbooks

### A. Backend is DOWN (HTTP 502 / BackendDown alert)

```bash
# 1. Check container state
docker compose ps backend

# 2. Check for crash loop
docker compose logs backend --tail=100 | grep -i "error\|fatal\|crash"

# 3. Restart
docker compose restart backend

# 4. If crash loop — rebuild
docker compose up -d --build backend

# 5. Verify
curl -s https://api.milyidom.com/api/health
```

**Common causes:**
- OOM killed → check `docker inspect milyi_dom_backend | grep OOMKilled`
- Prisma migration failure → run `docker compose exec backend npx prisma migrate deploy`
- Redis connection lost → `docker compose restart redis backend`

---

### B. API 5xx spike (ApiHighErrorRate alert)

```bash
# 1. Check recent errors
docker compose logs backend --tail=200 | grep '"statusCode":5'

# 2. Check DB connection
docker compose exec backend sh -c 'npx prisma db pull 2>&1 | head -5'

# 3. Check PgBouncer
docker compose logs pgbouncer --tail=50

# 4. Restart if DB-related
docker compose restart pgbouncer backend
```

---

### C. High latency (ApiHighLatency alert)

```bash
# 1. Check if AI/DeepSeek is the culprit (fraud check timeouts)
docker compose logs backend --tail=100 | grep "timed out\|Fraud detection"

# 2. Check Redis
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli info stats | grep -E "rejected|blocked"

# 3. Check Typesense
curl -s http://localhost:8108/health

# 4. Check Postgres slow queries (connect directly)
docker compose exec db psql -U postgres milyi_dom \
  -c "SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity WHERE state='active' ORDER BY duration DESC LIMIT 10;"
```

---

### D. Bull queue backlog (QueueBacklogHigh alert)

```bash
# 1. Check processor logs
docker compose logs backend --tail=100 | grep -i "processor\|queue\|job"

# 2. Check Redis queue keys
docker compose exec redis redis-cli keys "bull:*" | head -20

# 3. Restart backend to restart processors
docker compose restart backend

# 4. Monitor Bull Board UI (internal only)
# Access via SSH tunnel: ssh -L 4001:localhost:4001 root@62.217.178.117
# Then open: http://localhost:4001/admin/queues
```

---

### E. Database restore from backup

```bash
BACKUP_FILE="/opt/milyi-dom/backups/milyi_dom_YYYYMMDD_HHMMSS.sql.gz"

# 1. Stop backend (prevent writes)
docker compose stop backend

# 2. Drop and recreate DB
docker compose exec db psql -U postgres \
  -c "DROP DATABASE IF EXISTS milyi_dom;" \
  -c "CREATE DATABASE milyi_dom;"

# 3. Restore
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U postgres milyi_dom

# 4. Restart
docker compose start backend

# 5. Run migrations (in case backup is older than latest migration)
docker compose exec backend npx prisma migrate deploy
```

---

### F. Frontend is DOWN (HTTP 502 on milyidom.com)

```bash
# 1. Check container
docker compose ps frontend
docker compose logs frontend --tail=50

# 2. Restart
docker compose restart frontend

# 3. If build failure — rebuild
docker compose up -d --build frontend

# 4. Check FastPanel reverse proxy if container is healthy but site is still down
# FastPanel → Sites → milyidom.com → Proxy settings → upstream port 3002
```

---

## 4. Monitoring Access

| Service | Internal URL | Access via |
|---|---|---|
| Grafana | `http://localhost:3003` | SSH tunnel |
| Prometheus | `http://localhost:9090` | SSH tunnel |
| Bull Board | `http://localhost:4001/admin/queues` | SSH tunnel (admin JWT required) |

SSH tunnel example:
```bash
ssh -L 3003:localhost:3003 -L 9090:localhost:9090 root@62.217.178.117
```

---

## 5. Backup Schedule

```bash
# Set up daily backup cron (run once on server)
echo "0 3 * * * root /opt/milyi-dom/milyi-dom/backup.sh >> /var/log/milyi-dom-backup.log 2>&1" \
  > /etc/cron.d/milyi-dom-backup

# Verify last backup
ls -lh /opt/milyi-dom/backups/ | tail -5

# Manual backup
/opt/milyi-dom/milyi-dom/backup.sh
```

---

## 6. Deploy Procedure (standard)

```bash
cd /opt/milyi-dom/milyi-dom

# 1. Pull latest
git pull

# 2. Run backup before deploy
./backup.sh

# 3. Run migrations
docker compose exec backend npx prisma migrate deploy

# 4. Rebuild and restart
docker compose up -d --build backend frontend

# 5. Smoke test
./smoke.sh
```

---

## 7. Severity Levels

| Level | Response time | Examples |
|---|---|---|
| P0 Critical | Immediate | Backend DOWN, DB unreachable, payment failures |
| P1 High | < 30 min | 5xx spike > 5%, latency > 5s, queue backlog > 500 |
| P2 Medium | < 2h | Latency > 2s, fraud spike, WS connection drop |
| P3 Low | Next business day | Memory warning, single failing job, DKIM check |
