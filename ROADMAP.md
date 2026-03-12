# ROADMAP

Roadmap baseline date: **2026-03-12** (updated from 2026-03-10).

This file reflects the code currently in repository, not historical audit snapshots.

## Current Baseline

### Implemented Platform Areas

- Authentication and account lifecycle:
  - register/login/refresh,
  - email verification,
  - password reset,
  - OAuth (Google, VK),
  - 2FA setup/enable/disable/verify.
- Listings:
  - search/featured/catalog/detail,
  - host CRUD and status updates,
  - amenities,
  - images upload,
  - similar listings,
  - city autocomplete,
  - price overrides,
  - iCal sync and manual date blocking.
- Bookings:
  - create,
  - guest bookings,
  - host bookings,
  - status update and cancel,
  - listing availability check.
- Payments:
  - payment intent,
  - webhook,
  - payout status and payout phone,
  - host earnings and CSV export,
  - booking payment status updates.
- Messaging and notifications:
  - conversations list/history,
  - message send,
  - unread counters,
  - websocket events.
- Reviews and trust:
  - create/reply/hide/feature/delete,
  - listing stats and summary,
  - host and admin review endpoints.
- Admin scope:
  - users,
  - listings moderation,
  - audit log,
  - disputes (full backend + frontend, deployed to production),
  - stats,
  - analytics.
- Email infrastructure:
  - Yandex Cloud Postbox SMTP (host: postbox.cloud.yandex.net),
  - SPF record published and verified,
  - DKIM: **VERIFIED** (DNS propagated, DKIM signing active),
  - SMTP_FROM: noreply@milyidom.com,
  - transactional emails: booking confirm, email verification, password reset, welcome, newsletter.
- Additional modules:
  - loyalty,
  - saved searches,
  - AI search helper,
  - metrics endpoint.
- Reliability and observability:
  - API timeout budgets documented (`docs/API_TIMEOUTS.md`),
  - k6 load test scripts: listings-search, booking-flow, messaging,
  - Prometheus alerts, Grafana dashboards, backup.sh, smoke.sh.

### Known Current Gaps

- ~~End-to-end test coverage for critical journeys is still low.~~ **FIXED** — 94/94 E2E tests pass (Phase A complete).
- ~~Production proxy health path behavior~~ **FIXED** — backend handles both `/health` and `/api/health`; canonical URL documented in RELEASE_CHECKLIST.
- ~~DKIM verification for Yandex Cloud Postbox~~ **FIXED** — DKIM verified, SPF published, email production-ready.
- Observability and SLO enforcement are present but load test baselines against production not yet captured.
- Newsletter section still has a TODO for real API integration.
- Mobile app (~65% complete) — payments, messaging, push notifications not yet implemented (see `apps/mobile/STATUS.md`).

## Stage Status Matrix (Completed vs Partial)

| Stage | Status | What is complete | Deficits in partial completion |
|---|---|---|---|
| Core Platform Foundations | `DONE` | Monorepo, backend/frontend apps, DB, auth, listings, bookings, payments, messaging primitives | N/A |
| Role Access Model | `PARTIAL` | Route guards and role checks are implemented across major surfaces | Role-path behavior still needs broader automated regression tests |
| Deployment and Operations | `DONE` | Health endpoint canonicalized, RELEASE_CHECKLIST + INCIDENT_PLAYBOOK + SECRETS_ROTATION docs complete | N/A |
| Email Infrastructure | `DONE` | Yandex Cloud Postbox SMTP, SPF published, DKIM verified, noreply@milyidom.com live | N/A |
| Disputes System | `DONE` | Full backend + frontend disputes, deployed to production | N/A |
| Reliability and Test Safety | `DONE` | 94/94 E2E tests pass; API timeout budgets documented; k6 load test scripts ready | Load test baselines need to be captured against production |
| UX and Device Adaptation | `PARTIAL` | Responsive improvements are in place for key pages | Full desktop/tablet/mobile role-flow sweep is still pending |
| Compliance and Security Hardening | `PARTIAL` | Core security controls are implemented | Operational security verification and compliance artifacts are still incomplete |
| Mobile App | `PARTIAL` | Auth, listings browse, bookings list, profile (~65%) | Payments, messaging, push notifications, host dashboard, OAuth, EAS Build pending |

## Delivery Plan (Next)

## Phase A - Stabilization and Regression Safety — **COMPLETE** (2026-03-12)

1. ~~Add E2E tests for critical journeys~~ **DONE** — 94/94 E2E tests pass.
2. ~~Standardize auth/role matrix in tests~~ **DONE** — all protected frontend routes covered.
3. ~~Fix/align external health endpoint~~ **DONE** — canonical URL documented in RELEASE_CHECKLIST.
4. ~~Build a mandatory post-deploy smoke script~~ **DONE** — `smoke.sh` (15 checks) attached to deployment docs.

Exit criteria: **ALL MET** as of 2026-03-12.

## Phase B - Performance and Reliability — **COMPLETE** (2026-03-12)

1. ~~Reduce long-running listing creation latency~~ **DONE** — heavy post-processing moved to BullMQ queue (async fraud detection).
2. ~~Add timeout budgets and retry/idempotency policy docs~~ **DONE** — `docs/API_TIMEOUTS.md` covers all mutating endpoints.
3. ~~Add API latency and error budget dashboard~~ **DONE** — Prometheus alerts (`alerts.yml`) + Grafana dashboards live.
4. ~~Expand load tests~~ **DONE** — k6 scripts: `listings-search.js`, `booking-flow.js`, `messaging.js`.

Exit criteria: **ALL MET** as of 2026-03-12.
Remaining: capture baseline numbers against production (run k6 scripts and record P95 values).

## Phase C - Product Completion and UX Hardening (in progress)

1. ~~Responsive QA pass for mobile/tablet across all role pages~~ **DONE** — overflow=0 on all tested viewports.
2. ~~Finalize admin operational workflows~~ **DONE** — disputes system (full backend + frontend) deployed to production.
3. Complete newsletter backend integration (frontend component still has TODO for real API wiring).
4. Expand localization/formatting consistency and error UX for critical forms.
5. **NEW: Mobile app Sprint 14** — push notifications, YooKassa WebView, messaging screen (see Sprint 14 in plans.md).

Exit criteria:

- Role journeys are complete and pass smoke tests on desktop/mobile/tablet.
- No known high/medium severity UX blockers in top user flows.
- Mobile app reaches beta-ready state (push, payments, messaging implemented).

## Phase D - Security and Compliance Hardening (parallel stream)

1. Rotate and inventory production secrets with documented procedure.
2. Harden CSP/CORS rules and verify websocket/security header behavior in production.
3. Add periodic security regression checklist (authz, webhook, IDOR, rate limits).
4. Prepare compliance artifacts (privacy/data-export/retention policies).

Exit criteria:

- Security runbook is actionable and regularly executed.
- Compliance-critical controls are documented and testable.

## KPI Targets

- Deployment rollback-free rate: `>= 95%`.
- Critical regression escape rate: `0` per sprint.
- API p95 latency for core endpoints: tracked and bounded.
- Automated test coverage on critical paths: increasing sprint over sprint.

## Notes

- This roadmap intentionally avoids speculative "18 month" detail and focuses on the current code and delivery needs.
- Strategic long-term initiatives should be added only when Phase A and B acceptance criteria are satisfied.
