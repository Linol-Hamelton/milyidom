# syntax=docker/dockerfile:1
# Build context: monorepo root (milyi-dom/)
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Builder: install deps, then build ────────────────────────────────────────
FROM base AS builder
WORKDIR /monorepo
# Copy workspace manifests + all source (node_modules excluded by .dockerignore)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend ./apps/frontend
# Install frontend dependencies (creates symlinks in node_modules/.pnpm)
RUN pnpm install --filter=frontend --frozen-lockfile

ARG NEXT_PUBLIC_API_URL=http://localhost:4001/api
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ARG NEXT_PUBLIC_YANDEX_MAPS_API_KEY=
ARG NEXT_PUBLIC_FALLBACK_IMAGE_URL=/images/listing-1.jpg
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_YANDEX_MAPS_API_KEY=$NEXT_PUBLIC_YANDEX_MAPS_API_KEY
ENV NEXT_PUBLIC_FALLBACK_IMAGE_URL=$NEXT_PUBLIC_FALLBACK_IMAGE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter=frontend build

# ── Runner ────────────────────────────────────────────────────────────────────
# In a pnpm monorepo, Next.js standalone places server.js at:
#   .next/standalone/apps/frontend/server.js
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/frontend/.next/static     ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/frontend/public           ./apps/frontend/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
