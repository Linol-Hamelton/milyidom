# ROADMAP

Roadmap baseline date: **2026-03-10** (updated from 2026-03-04).

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
  - disputes,
  - stats,
  - analytics.
- Additional modules:
  - loyalty,
  - saved searches,
  - AI search helper,
  - metrics endpoint.

### Known Current Gaps

- ~~End-to-end test coverage for critical journeys is still low.~~ **FIXED** — 94/94 E2E tests pass (Phase A complete).
- ~~Production proxy health path behavior~~ **FIXED** — backend handles both `/health` and `/api/health`; canonical URL documented in RELEASE_CHECKLIST.
- Observability and SLO enforcement are present but not fully formalized (alerts, dashboards, runbook checks).
- Newsletter section still has a TODO for real API integration.
- Mobile app (~65% complete) — payments, messaging, push notifications not yet implemented (see `apps/mobile/STATUS.md`).
- DKIM verification for Yandex Cloud Postbox: recheck DNS propagation 24-72h after CNAME was added.

## Stage Status Matrix (Completed vs Partial)

| Stage | Status | What is complete | Deficits in partial completion |
|---|---|---|---|
| Core Platform Foundations | `DONE` | Monorepo, backend/frontend apps, DB, auth, listings, bookings, payments, messaging primitives | N/A |
| Role Access Model | `PARTIAL` | Route guards and role checks are implemented across major surfaces | Role-path behavior still needs broader automated regression tests |
| Deployment and Operations | `DONE` | Health endpoint canonicalized, RELEASE_CHECKLIST + INCIDENT_PLAYBOOK + SECRETS_ROTATION docs complete | N/A |
| Reliability and Test Safety | `DONE` | 94/94 E2E tests pass; API timeout budgets documented; k6 load test scripts ready | Load test baselines need to be captured against production |
| UX and Device Adaptation | `PARTIAL` | Responsive improvements are in place for key pages | Full desktop/tablet/mobile role-flow sweep is still pending |
| Compliance and Security Hardening | `PARTIAL` | Core security controls are implemented | Operational security verification and compliance artifacts are still incomplete |

## Delivery Plan (Next)

## Phase A - Stabilization and Regression Safety (1-2 weeks)

1. Add E2E tests for:
   - guest search -> listing detail -> booking start,
   - host listing create -> edit -> availability,
   - auth guard redirects for protected pages,
   - messaging send/receive in one conversation.
2. Standardize auth/role matrix in tests for all protected frontend routes.
3. Fix/align external health endpoint in reverse proxy and lock in one canonical URL.
4. Build a mandatory post-deploy smoke script and attach it to deployment docs.

Exit criteria:

- All critical user paths have at least one automated E2E happy-path test.
- Guard regression tests fail on unauthorized access attempts.
- One canonical external health URL is documented and verified.

## Phase B - Performance and Reliability (2-4 weeks)

1. Reduce long-running listing creation latency:
   - profile backend create path,
   - move heavy post-processing to queue/background,
   - keep API create response fast and deterministic.
2. Add timeout budgets and retry/idempotency policy docs for all mutating endpoints.
3. Add API latency and error budget dashboard with thresholds.
4. Expand load tests for listings search and messaging endpoints.

Exit criteria:

- P95 create listing and send message stay within agreed budget.
- No duplicate listing creation under timeout/retry scenarios.
- Alerting exists for latency/error spikes.

## Phase C - Product Completion and UX Hardening (4-8 weeks)

1. Responsive QA pass for mobile/tablet across all role pages.
2. Finalize admin operational workflows (review/dispute handling UX quality pass).
3. Complete newsletter backend integration.
4. Expand localization/formatting consistency and error UX for critical forms.

Exit criteria:

- Role journeys are complete and pass smoke tests on desktop/mobile/tablet.
- No known high/medium severity UX blockers in top user flows.

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
