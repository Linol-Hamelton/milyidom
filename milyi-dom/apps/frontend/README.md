## Frontend (Milyi Dom)

Next.js web app for guest, host, and admin experiences.

Last synchronized: **2026-03-04**.

### Tech

- Next.js 15 (App Router)
- React 18
- TailwindCSS
- Axios + socket.io-client
- Vitest + Testing Library

### Run (workspace)

From `milyi-dom/`:

```bash
pnpm --filter frontend dev
```

### Run (inside app folder)

From `milyi-dom/apps/frontend/`:

```bash
pnpm install
pnpm dev
```

App URL:

- `http://localhost:3000`

### Environment

Copy template:

```bash
cp .env.example .env.local
```

Minimum variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=...
```

Optional websocket override:

```env
NEXT_PUBLIC_WS_URL=http://localhost:4001
```

### Quality commands

```bash
pnpm test
pnpm lint
pnpm type-check
```

### Notes

- Protected pages use `RequireAuth` with optional role filters.
- Realtime messaging uses websocket origin derived from `NEXT_PUBLIC_API_URL` when `NEXT_PUBLIC_WS_URL` is not set.
