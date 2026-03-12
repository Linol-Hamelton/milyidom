# ARCHITECTURE

Architecture snapshot date: **2026-03-04**.

This document describes the architecture currently implemented in repository.

## 1. System Overview

Milyi Dom is a monorepo with three apps:

- `apps/backend`: NestJS API (REST + websocket gateway).
- `apps/frontend`: Next.js web app (App Router).
- `apps/mobile`: Expo mobile client.

Infrastructure is containerized via `docker-compose.yml` and includes:

- PostgreSQL + PostGIS,
- PgBouncer,
- Redis,
- Typesense,
- backend,
- frontend,
- Prometheus,
- Grafana.

## 2. Backend Architecture

### 2.1 Runtime and Framework

- NestJS 11.
- Global API prefix: `/api`.
- Validation: `ValidationPipe` with whitelist + transform.
- Security headers: `helmet`.
- CORS: controlled by `ALLOWED_ORIGINS`.
- Webhook raw body handling for Stripe endpoint.

### 2.2 Backend Modules (directory-level)

`29` modules/directories are present under `apps/backend/src`:

- `admin`
- `ai-search`
- `analytics`
- `audit`
- `auth`
- `bookings`
- `cache`
- `common`
- `config`
- `email`
- `favorites`
- `gateway`
- `ical`
- `listings`
- `loyalty`
- `messages`
- `metrics`
- `notifications`
- `payments`
- `prisma`
- `queue`
- `reviews`
- `saved-searches`
- `search`
- `storage`
- `superhost`
- `users`
- plus shared `@types` and support structures.

### 2.3 Exposed Controller Domains

Main controller groups currently include:

- `auth`
- `users`
- `listings`
- `amenities`
- `bookings`
- `payments`
- `messages`
- `notifications`
- `favorites`
- `reviews`
- `saved-searches`
- `analytics`
- `admin`
- `loyalty`
- `search`
- `ai-search`
- `ical`
- `metrics`
- `api` root (`/api/health`, `/api/stats`, etc.)

### 2.4 RBAC

Role model in use: `GUEST`, `HOST`, `ADMIN`.

Authorization is implemented through:

- JWT guard,
- optional JWT guard for mixed public/private endpoints,
- roles decorator + roles guard for privileged routes.

### 2.5 Messaging Architecture

- HTTP APIs for conversations/messages/unread/read state.
- Socket.IO gateway events for real-time messaging/typing/read markers.
- Frontend socket URL resolved from env with fallback rules.

## 3. Data Architecture (Prisma)

### 3.1 Schema Scope

Current Prisma schema contains `19` models:

- `User`
- `Profile`
- `Listing`
- `BlockedDate`
- `PriceOverride`
- `Amenity`
- `ListingAmenity`
- `PropertyImage`
- `Booking`
- `Favorite`
- `Review`
- `Payment`
- `Conversation`
- `Message`
- `Notification`
- `LoyaltyAccount`
- `LoyaltyTransaction`
- `SavedSearch`
- `AuditLog`

### 3.2 Migrations

Current migration history count: `13` directories.

Recent migration includes:

- `20260304000001_fix_currency_default_rub_add_yookassa`

### 3.3 Data Access

- Primary ORM: Prisma.
- Connection pooling in deployment via PgBouncer.
- `DATABASE_URL` and `DIRECT_DATABASE_URL` pattern is used for runtime vs migration operations.

## 4. Frontend Architecture

### 4.1 Runtime and Framework

- Next.js 15 App Router.
- React 18.
- Styling via TailwindCSS.
- Data fetching via API service layer.
- State via local hooks/store (`zustand` in auth store).

### 4.2 Route Surface

Current `page.tsx` route count: `36`.

Major sections:

- public catalog pages,
- auth pages,
- guest pages (`bookings`, `favorites`, `saved-searches`, etc.),
- host pages (`host/*`),
- admin pages (`admin/*`),
- messaging and payments flows.

### 4.3 Route Guards

Frontend uses `RequireAuth` wrapper on protected routes.

Role-protected pages include:

- host pages (`HOST|ADMIN`),
- admin analytics (`ADMIN`),
- messages (`GUEST|HOST|ADMIN`),
- other authenticated pages via generic auth guard.

## 5. Mobile App

`apps/mobile` contains Expo route groups:

- `(auth)`
- `(tabs)`
- `booking/[id]`
- `listing/[id]`

Mobile exists as MVP-level client and should be treated as a parallel delivery stream.

## 6. Observability and Operations

- Metrics endpoint: `/api/metrics`.
- Prometheus + Grafana services are present in compose stack.
- Sentry packages are integrated in backend/frontend dependencies.

## 7. Test Architecture (Current)

Automated tests currently tracked in repo:

- Backend specs: `3`
- Frontend tests: `5`

Current test suites are targeted and not full E2E coverage.

## 8. Known Architectural Constraints

1. Critical user journeys still rely heavily on smoke/manual regression checks.
2. Production proxy path handling for external API health endpoint needs normalization.
3. Performance variability can still occur on heavy listing creation scenarios.
4. Some product areas have implementation but limited defense-in-depth test coverage.

## 9. Architecture Priorities

Immediate priorities are:

1. E2E coverage for critical role journeys.
2. Performance hardening around listing create and other expensive paths.
3. Deployment consistency checks and health endpoint standardization.
4. Security and compliance hardening documented in `SECURITY.md`.
