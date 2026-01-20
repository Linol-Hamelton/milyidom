---
globs: |-
  **/docker-compose.yml
  **/package.json
description: Prevents port conflicts by ensuring backend only runs in one
  location at a time. Docker backend runs on port 4001, same as local
  development backend.
alwaysApply: false
---

Never run backend both in Docker and locally simultaneously. Choose one: either use docker-compose up -d for full Docker setup OR use docker-compose up -d db + pnpm start:dev for local backend development.