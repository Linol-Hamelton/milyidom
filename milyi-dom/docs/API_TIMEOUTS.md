# API Timeout Budgets & Retry Policy

Baseline date: **2026-03-10**

---

## Timeout Budgets (P95 targets)

| Endpoint group | Method | P95 target | Notes |
|---|---|---|---|
| `GET /api/listings` (search) | GET | ≤ 300 ms | Typesense-backed, paginated |
| `GET /api/listings/:id` | GET | ≤ 150 ms | DB + Redis cache |
| `POST /api/listings` | POST | ≤ 800 ms | Creates listing, geocoding |
| `GET /api/bookings/me` | GET | ≤ 200 ms | Paginated, indexed |
| `POST /api/bookings` | POST | ≤ 500 ms | Availability check + insert |
| `POST /api/payments/intent` | POST | ≤ 1500 ms | YooKassa API call |
| `GET /api/messages/:id` | GET | ≤ 150 ms | Paginated, indexed |
| `POST /api/messages` | POST | ≤ 300 ms | Insert + WebSocket push |
| `POST /api/auth/login` | POST | ≤ 500 ms | bcrypt verify (cost 12) |
| `POST /api/auth/register` | POST | ≤ 500 ms | bcrypt hash + email queue |
| `GET /api/ai-search` | GET | ≤ 3000 ms | LLM call (DeepSeek), degraded OK |
| `GET /api/health` | GET | ≤ 100 ms | No DB, always fast |

---

## Client-Side Timeouts

All frontend `axios` calls use the default instance. Configure as:

```typescript
// apps/frontend/src/lib/api-client.ts
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000, // 15s global client timeout
});
```

Mobile (Expo): same 15s default via `axios`.

---

## Backend Guards

### NestJS global timeout (recommended)

Add a global `TimeoutInterceptor` if P95 violations occur in production:

```typescript
// main.ts
app.useGlobalInterceptors(new TimeoutInterceptor(10_000)); // 10s backend abort
```

### PgBouncer pool timeout

```
pool_mode = transaction
server_idle_timeout = 600
query_timeout = 30000   # ms — hard DB query abort
```

---

## Retry & Idempotency Policy

### Mutating endpoints

| Endpoint | Idempotent? | Client retry allowed? | Notes |
|---|---|---|---|
| `POST /api/bookings` | No | **No** — may double-book | Check availability first, show error |
| `POST /api/payments/intent` | Yes (YooKassa deduplication) | Yes, once after 2s | YooKassa idempotency key = bookingId |
| `POST /api/disputes` | No (unique constraint on open disputes) | Yes, show existing dispute instead | |
| `PATCH /api/bookings/:id/cancel` | Yes | Yes, up to 3× with backoff | |
| `POST /api/auth/register` | No | No | Show "email already registered" |
| `POST /api/messages` | No | No — user sees delivery error | WebSocket fallback for offline |

### Safe endpoints (GET, read-only PATCH)

Retry freely up to 3× with exponential backoff: 1s → 2s → 4s.

---

## Alerting Thresholds (Grafana / Prometheus)

```yaml
# alerts.yml
- alert: APIHighLatency
  expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "P95 API latency > 800ms for 5 min"

- alert: APIErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.02
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Error rate > 2%"
```

---

## Measurement

Run load tests to capture baselines:

```bash
# From project root
k6 run milyi-dom/load-tests/k6/listings-search.js
k6 run milyi-dom/load-tests/k6/booking-flow.js
k6 run milyi-dom/load-tests/k6/messaging.js
```

See [load-tests/k6/](../load-tests/k6/) for scripts.
