# Implementation Plan (Actual)

Plan date: **2026-03-04**.

This is the actionable plan based on the current codebase and production behavior.

## 1. Executive Summary

The project is functionally advanced and already operates as a production beta.
The main remaining risks are not about "missing foundation", but about:

- regression safety,
- operational reliability,
- performance under real workloads,
- full role-journey completeness and UX polish,
- security/compliance depth.

## 2. Current Reality Snapshot

### Implemented

- Backend module ecosystem is broad (`29` directories, `19` Prisma models, `13` migrations).
- Frontend route surface is broad (`36` page routes).
- Core role flows (`GUEST`, `HOST`, `ADMIN`) are implemented.
- Recent high-priority regressions have been patched.

### Under-Implemented

- Automated E2E coverage for critical paths is still limited.
- Some production checks still rely on manual CLI operations.
- Health endpoint path consistency in public proxy setup needs final standardization.
- Performance budgets and alert thresholds are not yet formalized as hard gates.

## 3. Stage Completion and Partial Deficits

| Stage | Completion | Done markers | Partial deficits to close |
|---|---|---|---|
| Platform functionality | High | Core role flows (`GUEST/HOST/ADMIN`) operate in production beta | Need more automated journey validation |
| Access and authorization | Medium-high | Guards and RBAC exist in backend and protected frontend pages | Need broader regression tests across all protected routes |
| Deploy process | Medium-high | Pull/build/migrate/restart workflow is stable | External health endpoint mapping still inconsistent in some proxy configs |
| Performance consistency | Medium | Listing create idempotency/timeouts improved | Latency budgets and background offloading still pending |
| UX and responsive quality | Medium | Multiple critical regressions fixed | Full role-based responsive QA matrix is not complete |
| Security/compliance operations | Medium | Baseline controls and hardening backlog are documented | Rotation/audit/compliance execution needs systematic cadence |

## 4. Priority Backlog

## P0 - Regression Safety and Access Control (Immediate)

1. Add E2E auth/role matrix tests for protected frontend routes:
   - `/host/*`, `/admin/*`, `/messages`, `/favorites`, `/bookings`.
2. Add backend integration tests for role-protected routes:
   - host/admin booking endpoints,
   - payout endpoints,
   - admin management endpoints.
3. Lock one canonical external health endpoint and update proxy config/docs accordingly.
4. Add a `post-deploy smoke` script to run standard checks in one command.

Definition of done:

- Route guard regressions are caught in CI.
- Health check path is unambiguous.
- Deployment smoke can be executed by one script without manual branching.

## P1 - Performance and Data Consistency (Next)

1. Profile listing creation latency and identify heavy synchronous operations.
2. Move non-critical post-create work to background jobs.
3. Keep idempotency behavior for create operations and standardize across other key mutations.
4. Add API timeout policy and retry strategy documentation per endpoint class.

Definition of done:

- Listing creation no longer risks duplicate records under user retries.
- API p95/p99 targets are defined and monitored.

## P2 - UX Hardening Across Devices and Roles

1. Complete responsive pass for mobile/tablet on all role pages.
2. Run role-specific journey smoke suites:
   - guest discovery -> booking flow,
   - host listing management and bookings,
   - admin moderation workflows.
3. Standardize error feedback and empty states.
4. Finish newsletter backend integration (`TODO` currently in frontend component).

Definition of done:

- No high/medium UX blockers in role journeys on target breakpoints.
- TODO markers for user-facing flows are eliminated or tracked in explicit tickets.

## P3 - Operational Excellence

1. Formalize alerts for:
   - API 5xx spikes,
   - latency degradation,
   - queue backlogs,
   - websocket error rates.
2. Add rollback and incident response playbooks to deployment docs.
3. Add periodic backup/restore verification procedure.

Definition of done:

- On-call can detect, diagnose, and recover from failures with documented steps.

## P4 - Security and Compliance Stream (Parallel)

1. Enforce security regression checklist in release process.
2. Implement secrets inventory and rotation cadence.
3. Validate privacy/export/deletion workflows end-to-end.
4. Prepare auditable evidence if compliance certification is required.

Definition of done:

- Security controls are testable and operationally maintained, not only documented.

## 5. Suggested Sprint Sequence

## Sprint 1

- P0 items 1-4.

## Sprint 2

- P1 items 1-4.
- Start P2 item 1.

## Sprint 3

- Finish P2 items 1-4.
- Start P3 item 1.

## Sprint 4

- P3 items 2-3.
- P4 items 1-2.

## Sprint 5+

- P4 items 3-4 and continuous hardening.

## 6. Tracking Template

For each item track:

- owner,
- status (`todo`/`in_progress`/`blocked`/`done`),
- risk,
- acceptance criteria,
- test evidence,
- production verification date.

## 7. Immediate Next Actions

1. Implement missing E2E route-access matrix tests.
2. Normalize production API health endpoint mapping.
3. Add scripted post-deploy smoke checks and run them after each release.
4. Open performance task for listing create latency budget.

## 8. Validation Log (2026-03-04)

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
