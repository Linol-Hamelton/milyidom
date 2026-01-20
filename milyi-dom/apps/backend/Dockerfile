FROM node:20-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN corepack enable && pnpm fetch

COPY . .
RUN pnpm install --offline
RUN pnpm prisma generate
RUN pnpm build

EXPOSE 4001
CMD ["pnpm", "start:prod"]

