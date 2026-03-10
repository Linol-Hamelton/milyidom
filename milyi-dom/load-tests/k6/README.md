# Load Tests (k6)

## Prerequisites

```bash
# Install k6 (https://k6.io/docs/getting-started/installation/)
# macOS:
brew install k6
# Linux:
sudo apt-get install k6
# Windows (scoop):
scoop add bucket https://github.com/grafana/k6/releases
scoop install k6
```

## Scripts

| Script | Endpoint(s) | P95 target |
|---|---|---|
| `listings-search.js` | `GET /api/listings` | 300ms |
| `booking-flow.js` | `GET /api/listings/:id/availability` | 500ms |
| `messaging.js` | `GET /api/messages`, `GET /api/messages/:id/history` | 200ms |

## Running

```bash
# From project root — no auth needed
k6 run --env BASE_URL=https://api.milyidom.com \
  milyi-dom/load-tests/k6/listings-search.js

# With auth for booking/messaging tests
k6 run \
  --env BASE_URL=https://api.milyidom.com \
  --env GUEST_TOKEN=<jwt> \
  --env LISTING_ID=<id> \
  milyi-dom/load-tests/k6/booking-flow.js

k6 run \
  --env BASE_URL=https://api.milyidom.com \
  --env USER_TOKEN=<jwt> \
  --env CONVERSATION_ID=<id> \
  milyi-dom/load-tests/k6/messaging.js
```

## Reading results

k6 outputs a summary table. Key metrics:

- `http_req_duration p(95)` — P95 latency (must be under threshold)
- `http_req_failed` — error rate (must be < 1%)
- Custom trends (`listings_search_duration`, etc.) — per-endpoint P95
