# syntax=docker/dockerfile:1
# Build context: monorepo root (milyi-dom/)
# Note: single-stage build keeps pnpm workspace symlinks intact.
# For production use, replace with multi-stage using inject-workspace-packages.
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend ./apps/backend
RUN pnpm install --filter=backend --frozen-lockfile --shamefully-hoist
RUN pnpm --filter=backend exec prisma generate
RUN pnpm --filter=backend build

ENV NODE_ENV=production
EXPOSE 4001
WORKDIR /monorepo
CMD ["sh", "-c", "apps/backend/node_modules/.bin/prisma migrate deploy --schema=apps/backend/prisma/schema.prisma 2>&1 || true && node apps/backend/dist/main"]
