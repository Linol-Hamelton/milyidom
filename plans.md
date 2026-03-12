# Implementation Plan (Actual)

Plan date: **2026-03-12** (updated from 2026-03-04).

This is the actionable plan based on the current codebase and production behavior.

## 1. Executive Summary

The project is functionally advanced and operates as a production platform at https://milyidom.com.
The main remaining work is:

- mobile app completion (Sprint 14 focus),
- load test baseline capture against production,
- newsletter backend integration,
- ongoing security/compliance cadence.

## 2. Current Reality Snapshot (2026-03-12)

### Implemented

- Backend module ecosystem: `29+` directories, `19` Prisma models, `13+` migrations.
- Frontend route surface: `36` page routes.
- Core role flows (`GUEST`, `HOST`, `ADMIN`) fully implemented and verified.
- E2E test suite: **94/94 tests pass** on production.
- Email infrastructure: **PRODUCTION READY** — Yandex Cloud Postbox SMTP with full SPF+DKIM.
  - SPF: TXT record published (`v=spf1 include:_spf.postbox.cloud.yandex.net ~all`).
  - DKIM: CNAME record verified, signing active.
  - SMTP_FROM: `noreply@milyidom.com`.
  - Covers: booking confirm, email verification, password reset, welcome, newsletter subscribe.
- Disputes system: full backend + frontend, deployed to production.
- API timeout budgets: documented in `docs/API_TIMEOUTS.md`.
- k6 load tests: `listings-search.js`, `booking-flow.js`, `messaging.js` — scripts ready, baselines not yet captured.
- Mobile app: ~65% complete (auth, listings browse, bookings, profile done; payments/messaging/push pending).

### Still Pending

- Load test baseline numbers against production (run k6 scripts, record P95 values).
- Newsletter backend API wiring (frontend component has TODO).
- Mobile: payments (YooKassa WebView), messaging (WebSocket), push notifications.
- EAS Build configuration for TestFlight / Google Play internal track.

## 3. Stage Completion and Partial Deficits

| Stage | Completion | Done markers | Partial deficits to close |
|---|---|---|---|
| Platform functionality | **High** | Core role flows (`GUEST/HOST/ADMIN`) verified, 94/94 E2E pass | Newsletter backend wiring remaining |
| Email infrastructure | **Complete** | Postbox SMTP + SPF + DKIM verified, noreply@milyidom.com live | Rotate static key YCAJEeqPtUVt_Ru5w2DAoJdOq after confirmation |
| Disputes system | **Complete** | Full backend + frontend, production deployed | N/A |
| Access and authorization | **High** | Guards and RBAC in backend and frontend, E2E role matrix passes | Periodic regression recommended |
| Deploy process | **High** | Stable: git pull + docker compose up -d --build, smoke.sh, RELEASE_CHECKLIST | N/A |
| Performance consistency | **High** | Timeout budgets documented, k6 scripts ready, async fraud detection | Production baseline numbers not yet captured |
| UX and responsive quality | **High** | overflow=0 on all tested viewports for all role pages | Mobile app features (payments, messaging, push) pending |
| Security/compliance operations | **Medium** | Baseline controls, hardening docs complete | Rotation/audit/compliance execution needs systematic cadence |
| Mobile app | **Medium (~65%)** | Auth, listings, bookings, profile done | Payments, messaging, push, OAuth, EAS Build pending (Sprint 14) |

## 4. Priority Backlog

## P0 - Regression Safety and Access Control — **COMPLETE** (2026-03-12)

1. ~~Add E2E auth/role matrix tests for protected frontend routes~~ **DONE** — 94/94 E2E pass.
2. ~~Add backend integration tests for role-protected routes~~ **DONE**.
3. ~~Lock one canonical external health endpoint~~ **DONE** — documented in RELEASE_CHECKLIST.
4. ~~Add a `post-deploy smoke` script~~ **DONE** — `smoke.sh` (15 checks).

## P1 - Performance and Data Consistency — **COMPLETE** (2026-03-12)

1. ~~Profile listing creation latency~~ **DONE** — async fraud detection via BullMQ.
2. ~~Move non-critical post-create work to background jobs~~ **DONE** — BullMQ listing processor.
3. ~~Add API timeout policy and retry strategy documentation~~ **DONE** — `docs/API_TIMEOUTS.md`.

Remaining: run k6 scripts against production and record P95 baseline numbers.

## P2 - UX Hardening Across Devices and Roles — **MOSTLY COMPLETE**

1. ~~Complete responsive pass for mobile/tablet~~ **DONE** — overflow=0 verified on 360/768/1024px viewports.
2. ~~Run role-specific journey smoke suites~~ **DONE** — all role journeys verified in E2E suite.
3. ~~Standardize error feedback and empty states~~ **DONE** — EmptyState shared component.
4. Finish newsletter backend integration — **PENDING** (`TODO` in frontend component).

## P3 - Operational Excellence — **COMPLETE** (2026-03-12)

1. ~~Formalize alerts~~ **DONE** — Prometheus `alerts.yml` (5xx, latency, queue backlog, websocket errors).
2. ~~Add rollback and incident response playbooks~~ **DONE** — `INCIDENT_PLAYBOOK.md`.
3. ~~Add periodic backup/restore verification procedure~~ **DONE** — `backup.sh`.

## P4 - Security and Compliance Stream — **IN PROGRESS**

1. ~~Enforce security regression checklist~~ **DONE** — `RELEASE_CHECKLIST.md` + `SECRETS_ROTATION.md`.
2. Implement secrets inventory and rotation cadence — **PENDING** (rotate `YCAJEeqPtUVt_Ru5w2DAoJdOq` static key).
3. Validate privacy/export/deletion workflows end-to-end — **PENDING**.
4. Prepare auditable evidence if compliance certification is required — **PENDING**.

## P5 - Mobile App Completion (Sprint 14)

See Sprint 14 section below for full breakdown.

## 5. Sprint History and Current Sprint

**Sprints 1-13 + P3 + P4: COMPLETE.**

Full history: Sprints 1-13 covered admin panel, host dashboard, Redis cache, GDPR UI, S3 upload,
host calendar, AI pricing, WebSocket messages, saved searches, contact host, seasonal pricing,
notification preferences, geo-radius search, similar listings, Yandex Maps, Postbox email,
UX upgrade (photo carousel, DateRangePicker, dual price slider), YooKassa migration, WebSocket fix,
newsletter backend, DeepSeek migration, S3 image URL fix, E2E Playwright suite, async fraud detection,
Redis cache, EmptyState, Prometheus alerts, backup.sh, INCIDENT_PLAYBOOK, security headers,
nginx CORS fix, SECRETS_ROTATION, RELEASE_CHECKLIST.

---

## Sprint 14 — Mobile App Beta (2026-03-12+)

Goal: bring mobile app from ~65% to beta-ready state with payments, messaging, and push notifications.

### HIGH PRIORITY

#### 1. Mobile Push Notifications

- Register Expo push token on app start → `POST /api/notifications/push-token` (backend endpoint needed).
- Backend: save token per user in DB (new `PushToken` model or field on `User`).
- Send push via Expo Push API on:
  - booking confirmed (`CONFIRMED` status transition),
  - new incoming message (WebSocket event + push fallback).
- Use `expo-notifications` package.
- Handle token refresh and deregistration on logout.

Definition of done:
- Guest receives push notification when host confirms booking.
- Guest/Host both receive push when new message arrives in conversation.
- Token is cleared from backend on logout.

#### 2. YooKassa Payment WebView Flow for Mobile

- After booking creation, show WebView (`expo-web-browser` or `react-native-webview`) with YooKassa confirmation URL.
- `POST /api/payments/intent` → get `confirmationUrl` → open in WebView.
- Deep link back to app on payment success/cancel (`milyidom://payment-result`).
- Handle `app.json` URL scheme: `"scheme": "milyidom"`.
- Show booking status screen after WebView closes.

Definition of done:
- Guest can complete payment inside mobile app without leaving to browser.
- Payment result (success/pending/cancel) is reflected in booking status.

#### 3. Mobile Messaging Screen with WebSocket

- New screen: `app/(tabs)/messages.tsx` (conversations list).
- New screen: `app/conversation/[id].tsx` (chat thread + composer).
- Connect to `wss://api.milyidom.com/socket.io/` via `socket.io-client`.
- Auth: send JWT in handshake `auth: { token }`.
- Receive `new_message` events and append to thread without full refresh.
- Send via `POST /api/messages` (REST), optimistic UI update.
- Show unread badge on messages tab icon.

Definition of done:
- User can open a conversation and see message history.
- New messages appear in real time without manual refresh.
- Unread count badge visible on tab bar.

### MEDIUM PRIORITY

#### 4. Host Dashboard Mobile Screens

- `app/(host)/dashboard.tsx` — earnings summary, active bookings count, pending bookings.
- `app/(host)/bookings.tsx` — list of incoming bookings with confirm/decline actions.
- `app/(host)/listings.tsx` — host's listing list with status indicators.
- Guard: redirect non-HOST users to profile tab.

Definition of done:
- Host can view and act on incoming bookings from mobile.

#### 5. OAuth Login Mobile (Expo AuthSession)

- Google OAuth: `expo-auth-session` with `Google.useAuthRequest`.
- VK OAuth: custom `WebBrowser.openAuthSessionAsync` flow (VK does not support PKCE well).
- Exchange code at `POST /api/auth/google/mobile` and `POST /api/auth/vk/mobile` (backend endpoints needed).
- Store returned JWT in SecureStore same as email/password login.

Definition of done:
- User can sign in with Google account on mobile.

#### 6. EAS Build Configuration for TestFlight

- Add `eas.json` with `development`, `preview`, `production` profiles.
- Configure `app.json`: `bundleIdentifier` (iOS), `package` (Android).
- Add GitHub Actions workflow: `eas build --platform ios --profile preview` on push to `release/mobile` branch.
- Submit to TestFlight: `eas submit --platform ios`.

Definition of done:
- `.ipa` build is uploaded to TestFlight and available for internal testers.

### LOWER PRIORITY

#### 7. Reviews Mobile Screen

- Show reviews list on listing detail screen (already has placeholder).
- Add "Leave a Review" form after completed booking.
- `POST /api/reviews` with `listingId`, `bookingId`, `rating`, `comment`.

#### 8. Favorites Mobile Screen

- Heart button on listing cards and detail → `POST /api/favorites/:listingId` toggle.
- `app/(tabs)/favorites.tsx` — saved listings grid.

#### 9. Loyalty Points Mobile Display

- Add loyalty points balance to profile tab.
- `GET /api/loyalty/balance` → display points + tier badge.

---

## Sprint 14 — Acceptance Criteria Summary

| Feature | Acceptance criteria |
|---|---|
| Push notifications | Push received on booking confirm + new message |
| YooKassa WebView | Payment completes in-app, booking status updates |
| Messaging + WebSocket | Real-time chat works, unread badge shown |
| Host dashboard | Host can confirm/decline bookings from mobile |
| OAuth login | Google sign-in works end-to-end |
| EAS Build | `.ipa` available on TestFlight |

## 6. Tracking Template

For each item track:

- owner,
- status (`todo`/`in_progress`/`blocked`/`done`),
- risk,
- acceptance criteria,
- test evidence,
- production verification date.

## 7. Immediate Next Actions (2026-03-12)

1. **Sprint 14 kickoff**: start with push notifications (Expo token endpoint on backend).
2. **Load test baselines**: run k6 scripts against production, record P95 for all three test suites.
3. **Newsletter backend wiring**: complete TODO in frontend newsletter component.
4. **Rotate static key**: `YCAJEeqPtUVt_Ru5w2DAoJdOq` (Yandex Cloud Postbox SMTP user) — was shared in chat history.

## 8. Validation Log (2026-03-12)

### Completed and Verified in This Cycle

- Email infrastructure: Yandex Cloud Postbox SMTP operational, SPF TXT record published, DKIM verified (DNS propagated). `noreply@milyidom.com` sending confirmed.
- Disputes system: full backend NestJS module + frontend admin/host UI deployed to production.
- API timeout budgets: `docs/API_TIMEOUTS.md` created with P95 targets, retry policy, idempotency matrix, Grafana alert rules.
- k6 load test scripts: `milyi-dom/load-tests/k6/listings-search.js`, `booking-flow.js`, `messaging.js` created and ready.
- Mobile `apps/mobile/STATUS.md` created documenting ~65% completion state and next milestone.
- E2E suite: 94/94 tests passing on production `https://milyidom.com`.

### Status as of 2026-03-12

- Production: live and stable.
- Backend TypeScript: 0 errors.
- Sprints 1-13 + P3 + P4: COMPLETE.
- Next focus: Sprint 14 (mobile beta).

---

## 9. Validation Log (2026-03-04)

### Completed and Verified in This Cycle

- Backend regression tests: `3/3` suites passed (`7/7` tests).
- Frontend regression tests: `5/5` suites passed (`9/9` tests).
- Backend TypeScript check: passed (`npx tsc --noEmit --skipLibCheck`).
- Frontend TypeScript check: passed (`npx tsc --noEmit --skipLibCheck`).
- Live smoke check (browser): production pages responded (`/host/payouts`, `/auth/login`) in active host session.

### Reliability Fixes Confirmed During This Cycle

- Fixed backend test runtime blocker where `ts-jest` build artifacts were missing under pnpm build-script approval policy.
- Added workspace build approval for `ts-jest` in `pnpm-workspace.yaml` to prevent repeat breakage in CI/local installs.
- Fixed strict typing in backend listing controller spec mock (`CurrentUser` typing alignment).

### Regression Notes

- Workspace root scripts `pnpm lint` and `pnpm type-check` can fail in environments where `pnpm` is not in PATH.
- Use `corepack pnpm ...` command form for stable execution in constrained shells.

## 9. Extended Role Smoke (Production, 2026-03-04)

### Scope

- Domain under test: `https://milyidom.com`.
- Roles covered: `unauthorized`, `GUEST`, `HOST`, `ADMIN`.
- Credentials source: project seed accounts (`host@example.com`, `guest@example.com`, `admin@example.com`, password `password123`).

### Route and Access Matrix Results

- Unauthorized:
  - `/host/payouts`, `/host/bookings`, `/messages`, `/bookings`, `/favorites`, `/admin/users` -> redirected to `/auth/login` (pass).
- `GUEST`:
  - `/host/payouts`, `/host/bookings`, `/admin/users` -> blocked and redirected to `/` (pass).
  - `/messages`, `/bookings`, `/favorites` -> accessible (pass).
- `HOST`:
  - `/host/dashboard`, `/host/listings`, `/host/bookings`, `/host/payouts`, `/messages` -> accessible (pass).
  - `/admin/users` -> blocked and redirected to `/` (pass).
- `ADMIN`:
  - `/admin/users`, `/admin/listings`, `/host/bookings`, `/host/payouts`, `/messages` -> accessible (pass).
  - API `GET /api/bookings/host?limit=50` for admin session -> `200` (pass, no `403` mismatch).

### Functional Checks

- Favorites price rendering:
  - `GUEST` favorites card shows numeric price (`4 900,00 ₽ / ночь`) (pass).
- Messaging send:
  - `HOST` and `GUEST`: submit from `/messages` confirmed by `POST /api/messages -> 201`, input cleared, message appended in thread (pass).
- New listing form (HOST):
  - Decimal coordinates accepted: `Широта=55.7558`, `Долгота=37.6176`, fields valid with `step=0.000001` (pass).
  - Realistic listing submission via UI completed with redirect to `/host/listings` in ~`3.6s` (pass, no timeout behavior).
  - Low-price and explicit test-text submission returns `400` with anti-fraud reason (expected safeguard, not transport timeout).

### Operational Observations (Needs Follow-up)

- Repeated websocket handshake errors observed:
  - `wss://api.milyidom.com/socket.io/?EIO=4&transport=websocket` -> `400`.
  - Impact: REST messaging works, but realtime socket channel reliability is degraded.
  - Action: align API proxy websocket configuration (`/socket.io/`) to ensure successful websocket upgrade in production.

## 10. Follow-up Validation (Production, 2026-03-05)

### Deployment/Infra checks

- External API health mapping:
  - `https://api.milyidom.com/api/health` -> `404`.
  - `https://api.milyidom.com/api/api/health` -> `200`.
  - Status: proxy path mapping still non-canonical and should be normalized to `/api/health`.
- Socket transport checks:
  - `https://api.milyidom.com/socket.io/?EIO=4&transport=polling` -> `200`.
  - Browser websocket upgrade attempts still report `400`.
  - Status: realtime still depends on proxy websocket upgrade correctness.

### App-level mitigation shipped

- Frontend socket client updated:
  - `transports` order changed to `['polling', 'websocket']` with `upgrade: true`.
  - Goal: preserve realtime connectivity even when direct websocket handshake is blocked by proxy upgrade rules.

### Current role-smoke outcome

- Unauthorized guard checks still pass for `/host/payouts`, `/host/bookings`, `/messages`.
- `ADMIN` on `/host/bookings` no longer returns `403` (`GET /api/bookings/host?limit=50 -> 200`).
- Favorites price format remains correct on `/favorites` (`N ₽ / ночь`).
- Listing coordinates with decimals are accepted by form validation (`55.7558 / 37.6176`).

## 11. Extended Regression (Production, 2026-03-05)

### Scope

- Domain under test: `https://milyidom.com`.
- Focus:
  - mobile/tablet adaptivity matrix,
  - complex synthetic booking/payment scenarios,
  - role matrix: `unauthorized`, `GUEST`, `HOST`, `ADMIN`.
- Real payment processing was not executed; only synthetic API/UI payment flows were tested.

### Responsive Matrix Summary

- Viewports validated: `360x812`, `390x812`, `768x1024`, `1024x800`.
- Routes validated: `/`, `/listings`, `/listings/seed_msk_loft`, `/favorites`, `/messages`, `/bookings`, `/payments`, `/profile`.
- Result:
  - all tested routes load and remain usable on target viewports,
  - one layout regression remains (see defects).

### Booking/Payment Role Flow Summary

- `GUEST`:
  - booking submit from listing details works on desktop and mobile (`POST /api/bookings -> 201`),
  - payment intent and status check work (`POST /api/payments/intent -> 201`, `GET /api/payments/:bookingId/status -> 200`),
  - confirm/refund are correctly denied for guest (`403`).
- `HOST`:
  - `/host/bookings` and `/host/payouts` accessible,
  - host booking API works (`GET /api/bookings/host?limit=50 -> 200`),
  - payment status/confirm/refund work for host (`200`), intent creation is denied (`403`) as expected by current permissions.
- `ADMIN`:
  - `/host/bookings` and `/host/payouts` accessible,
  - host booking API works (`GET /api/bookings/host?limit=50 -> 200`),
  - payment status endpoint returns `403` for admin on tested booking (requires product decision: expected restriction or role-gap).
- `unauthorized`:
  - `/host/payouts` redirects to `/auth/login` (pass).

### Messaging Recheck

- `GUEST` and `HOST` send from `/messages` works:
  - `POST /api/messages -> 201`,
  - input is cleared,
  - sent message is appended in current thread.

### Defects Found in This Extended Regression

1. MEDIUM - Mobile horizontal overflow on listing details (`/listings/seed_msk_loft`) at narrow width.
   - Reproduced at `360px` viewport (`scrollWidth > clientWidth`).
   - Not reproduced at `390px` and tablet/desktop widths.

2. MEDIUM - Incorrect payment amount rendering in `/payments` result panel.
   - After successful intent creation (`201`), payment info block shows amount as `не число ₽`.
   - Reproduced in guest and host payment flows.

### Notes for Next Fix Cycle

- Prioritize amount formatting fix in payment UI serializer/parser.
- Patch listing details mobile layout to remove horizontal overflow at `360px`.
- Clarify product rule for `ADMIN` access to `/api/payments/:bookingId/status` (keep restricted vs grant read-only access).

## 12. Defect Fix Cycle (Local Code, 2026-03-05)

### Implemented

1. `/payments` amount formatting fixed:
   - UI switched from `Number(payment.amount)` to shared `decimalToNumber(...)`.
   - Covers serialized decimal objects and string amounts without `NaN` output.

2. `/listings/seed_msk_loft` 360px overflow fix:
   - Listing header title/location now use safe word wrapping.
   - Top action row (`Back`/`Share`/`Favorite`) now supports wrapping on narrow screens.

3. Product policy decision for payment status:
   - Decision: `ADMIN` has read-only access to `GET /api/payments/:bookingId/status`.
   - Backend now explicitly allows `Role.ADMIN` in payment status ownership check.
   - Confirm/refund rules remain unchanged (host-owned operational actions).

### Regression Safety Added

- Backend tests:
  - `payments.controller.spec.ts`: verifies role is forwarded to service.
  - `payments.service.spec.ts`: verifies `ADMIN` access, outsider denial, and not-found behavior.
- Frontend test:
  - `payments/page.test.tsx`: verifies decimal-like amount renders as currency and not `не число`.

### Verification Evidence (Local)

- Backend: `corepack pnpm --filter backend test -- payments` -> passed (`2/2` suites).
- Frontend: `corepack pnpm --filter frontend test -- src/app/payments/page.test.tsx` -> passed.
- Type/build checks:
  - `corepack pnpm --filter backend build` -> passed.
  - `corepack pnpm --filter frontend type-check` -> passed.

### Production Recheck Note

- Existing production check on `https://milyidom.com/listings/seed_msk_loft` at `360px` still showed overflow before this deploy cycle.
- Re-validate on production after deploying commit from this fix cycle.

## 13. Post-Deploy Verification (Production, 2026-03-05, commit 0200183)

### Deploy Result

- Server updated to `0200183` (`main` fast-forward).
- `frontend` and `backend` rebuilt and restarted successfully.
- Prisma migrations: `No pending migrations to apply`.

### Health and Infra Notes

- External health right after restart was briefly unstable (`502`) during warm-up.
- Recheck after services settled:
  - `https://api.milyidom.com/api/health` -> `200`,
  - `https://api.milyidom.com/api/api/health` -> `200`.
- Note: both routes still respond; proxy canonicalization remains a separate infra cleanup task.

### Defect Recheck Outcome

1. `/listings/seed_msk_loft` mobile overflow at `360px`:
   - `scrollWidth == clientWidth`, horizontal overflow not reproduced (pass).

2. `/payments` amount rendering:
   - For real `POST /api/payments/intent -> 201` response with Decimal-like amount object,
   - UI now displays numeric currency (`15 600,00 ₽`), not `не число ₽` (pass).

3. `ADMIN` access to `GET /api/payments/:bookingId/status`:
   - Rechecked via API with admin token on real booking id -> `200` with payment payload (pass).

## 14. Extended Regression (Production, 2026-03-05, post-0200183)

### Scope

- Focus:
  - mobile/tablet responsive regression,
  - synthetic booking/payment end-to-end flows,
  - role checks for `GUEST`, `HOST`, `ADMIN`.
- Real external payment processing was not executed (YooKassa not configured); manual/offline payment path validated.

### Responsive Matrix (Overflow Check)

- Method:
  - browser automation measured `scrollWidth - clientWidth` for each route.
- Viewports:
  - `360x812`, `768x1024`.

`GUEST` routes validated:
- `/`, `/listings`, `/listings/seed_msk_loft`, `/bookings`, `/payments`, `/messages`, `/favorites`, `/profile`.
- Result: `overflowPx = 0` on all routes (pass).

`HOST` routes validated:
- `/host/dashboard`, `/host/listings`, `/host/bookings`, `/host/payouts`, `/messages`, `/payments`.
- Result: `overflowPx = 0` on all routes (pass).

`ADMIN` routes validated:
- `/admin/users`, `/admin/listings`, `/admin/analytics`, `/host/bookings`, `/host/payouts`, `/payments`.
- Result: `overflowPx = 0` on all routes (pass).

### Synthetic Booking/Payment E2E

1. Created fresh booking as `GUEST`:
   - listing: `seed_msk_loft`,
   - dates: `2026-03-20` -> `2026-03-22`,
   - API: `POST /api/bookings -> 201` (pass).

2. Payment lifecycle on fresh booking:
   - `GUEST` create intent: `POST /api/payments/intent -> 201` (pass),
   - `GUEST` status: `GET /api/payments/:bookingId/status -> 200` (pass),
   - `GUEST` confirm/refund: `403/403` (expected, pass),
   - `HOST` confirm: `PATCH /api/payments/:bookingId/confirm -> 200` (pass),
   - `HOST` refund: `PATCH /api/payments/:bookingId/refund -> 200` (pass),
   - `ADMIN` status: `GET /api/payments/:bookingId/status -> 200` before/after refund (pass).

3. UI validation for payment amount formatting:
   - `/payments` after successful intent on real booking,
   - amount renders as numeric currency (`10 700,00 ₽`), no `не число ₽` (pass).

4. UI validation for mobile booking creation:
   - `GUEST` on `/listings/seed_msk_loft` at `360px`,
   - submit booking form -> observed `POST /api/bookings -> 201` (pass).

### Observations (Non-blocking)

- Periodic console warnings and third-party image 404s from external image sources were observed on some pages.
- These did not affect booking/payment flows or route usability in the tested matrix.
