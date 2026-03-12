---
globs: |-
  **/docker-compose.yml
  **/package.json
description: Prevent port conflicts by running backend in exactly one mode.
alwaysApply: false
---

Do not run backend in Docker and locally at the same time.

Choose one mode:

1. Full dockerized app backend:

```bash
docker compose up -d backend
```

2. Local backend with dockerized infra only:

```bash
docker compose up -d db redis typesense pgbouncer
pnpm --filter backend dev
```

Both modes use backend port `4001`, so parallel launch causes bind/conflict and misleading test results.
