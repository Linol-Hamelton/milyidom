# SECURITY

Security baseline date: **2026-03-04**.

This is the practical security status for the current repository state.

## 1. Security Posture Summary

- No currently known unpatched critical authorization regressions from the latest QA cycle.
- RBAC and route guards are implemented across backend and frontend protected surfaces.
- Payments are integrated through Stripe with dedicated webhook endpoint handling.
- Remaining security work is focused on hardening, verification depth, and operational discipline.

## 2. Implemented Controls

### 2.1 Authentication and Session

- JWT access and refresh token flow.
- Password-based auth.
- Email verification and password reset APIs.
- OAuth providers: Google and VK.
- 2FA endpoints (setup/enable/disable/verify).

### 2.2 Authorization

- Guard-based protection on sensitive backend routes.
- Role checks for host/admin scopes.
- Frontend `RequireAuth` on protected pages.
- Admin-only and host/admin mixed routes explicitly defined.

### 2.3 API Input and Transport Safety

- Global validation with whitelisting and transform.
- Security headers via `helmet`.
- Controlled CORS through environment-configured allowlist.
- Stripe webhook raw body handling.
- Idempotency header support for sensitive create flow (listing create path).

### 2.4 Operational Security Foundations

- Dockerized local/prod-like runtime.
- Metrics stack (Prometheus/Grafana).
- Sentry dependencies integrated for error tracking.
- Audit log model + admin audit log endpoint available.

## 3. Verified Recent Fixes (Security-Relevant)

Recent releases included fixes for:

1. Unauthorized access risk on host payouts page routing.
2. Role mismatch behavior between admin host-bookings page and backend route metadata.
3. Message send flow reliability (preventing silent user-action failure in protected auth context).
4. Duplicate listing risk mitigation under slow create flow via idempotency and timeout handling.

## 4. Open Security Backlog

### High Priority

1. Expand automated authorization tests (backend + frontend route matrix).
2. Standardize and verify reverse-proxy route mapping to avoid ambiguous API pathing.
3. Add repeatable security smoke checks after each deployment.

### Medium Priority

1. Formalize secrets rotation runbook and cadence.
2. Tighten CSP/CORS policies based on exact production origins and websocket behavior.
3. Add abuse/rate-limit verification tests for high-risk endpoints.

### Medium/Long Priority (Compliance Stream)

1. Data retention and deletion policy enforcement checks.
2. Privacy and data export process hardening.
3. Artifact preparation for external audits (if SOC2/ISO track is required).

## 5. Security Regression Checklist (Release Gate)

Run after each deployment:

1. Verify protected frontend routes redirect unauthorized users.
2. Verify backend role-protected endpoints reject wrong-role calls.
3. Verify payment webhook endpoint still validates signatures.
4. Verify messaging, booking status, and listing mutations require auth.
5. Verify no accidental open admin routes.

## 6. Incident Readiness Minimal Runbook

1. Detect issue via logs/alerts/user report.
2. Classify severity (`critical`, `high`, `medium`, `low`).
3. Contain impact (route disable, temporary guard, feature flag, rollback).
4. Patch and redeploy with smoke + regression checks.
5. Record postmortem with root cause and permanent guardrail.

## 7. Ownership Notes

- Security controls must be treated as first-class acceptance criteria in feature PRs.
- Any route or role change requires matching test updates.
- Deployment docs (`DEPLOY*.md`) are part of security posture and must stay synchronized with production reality.
