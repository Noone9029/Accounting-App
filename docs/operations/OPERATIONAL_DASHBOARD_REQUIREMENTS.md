# Operational Dashboard Requirements

Status: requirements only
Date: 2026-07-02

This is not a live dashboard implementation. It defines the panels a future controlled-beta/paid-beta support dashboard must expose once hosting, log drains, provider choices, and access controls are approved.

## Dashboard Panels

| Panel | Required fields | Current source | Current status |
| --- | --- | --- | --- |
| System health | API health, API readiness, deployment SHA, environment, last checked | `apps/api/src/health/health.controller.ts` | available as source/readiness endpoints |
| Database readiness | readiness database result, migration head evidence, connection mode, runtime role class, pool errors | `/readiness`, deployment checklist | partial; hosted runtime role evidence blocked |
| Email/outbox | queued, failed, retrying, suppressed, provider disabled/enabled, monitoring evidence age | `apps/api/src/email/email.controller.ts` | partial; provider monitoring blocked |
| Backup/restore evidence | latest backup evidence, latest restore drill, evidence age, missing evidence flag | `docs/operations/RESTORE_DRILL_EVIDENCE_INDEX.md` | partial; hosted PITR/restore proof blocked |
| Storage readiness | provider, bucket configured, signed URL configured, proof status, blocked reason | `apps/api/src/storage/storage.controller.ts` | partial; object storage/signed URL proof blocked |
| Security diagnostic status | tenant audit status, API tenancy audit status, safe-script review-required count, env separation status | `docs/security/evidence/*` | available as local/read-only evidence |
| Beta issue queue | open issues by severity, blocker/high aging, route category, owner | `docs/beta-testing/BETA_ISSUE_TRIAGE_RUNBOOK.md` and issue log | partial/manual |
| Compliance disabled/no-network status | ZATCA mode, UAE ASP provider mode, no-network status, blocked claims | ZATCA no-network scripts, compliance readiness source | partial; real provider access blocked |
| Support incidents | incident severity, owner, response age, sanitized evidence links, stop-beta flag | support runbooks/templates | partial/manual |
| Release/deploy status | active SHA, branch, deployment status, rollback notes | future approved hosting integration | future |
| Remaining production blockers | hosting, runtime role, RLS/Data API, PITR, object storage, signed URL, monitoring, SLA, billing/legal, ASP | `docs/production/PRE_ASP_PRODUCTION_FOUNDATION_TRACKER.md` | available as tracker, not live |

## Local Evidence

- `corepack pnpm monitoring:support-readiness`
- `docs/operations/evidence/MONITORING_SUPPORT_READINESS.md`
- `docs/operations/evidence/MONITORING_SUPPORT_READINESS.json`

## Data Safety

Dashboard data must use aggregated status and identifiers only. It must not expose secrets, private document bodies, customer invoice contents, raw bank files, signed XML, QR payloads, reset/invite links, auth tokens, database URLs, API keys, SMTP credentials, provider responses, or customer-sensitive screenshots.
