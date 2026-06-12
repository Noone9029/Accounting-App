# Production Trust Foundation Audit

Date: 2026-06-12

Scope: static repository audit only. This pass uses committed docs, code, and readiness surfaces. It does not run backups, restores, bucket operations, provider changes, email sends, monitoring setup, Supabase/Vercel mutations, or ZATCA execution.

## Verdict

- LedgerByte remains controlled beta/user-testing only.
- LedgerByte is not production-ready.
- LedgerByte is not paid SaaS ready.
- LedgerByte is not official VAT filing ready.
- LedgerByte is not ZATCA compliant.
- Vercel remains beta/user-testing only; final production hosting remains separate.

## 1. Storage/object storage

- Current repo evidence: `apps/api/src/storage/*` exposes storage readiness and migration-plan surfaces; `apps/web/src/app/(app)/settings/storage/page.tsx` shows S3 boolean readiness only; `scripts/object-storage-proof-validate.cjs` and `scripts/object-storage-proof-validate.test.cjs` now add a safe proof harness for dry-run and local/mock validation; `docs/production/PAID_SAAS_V1_GAP_MATRIX.md` and `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md` document remaining object-storage gaps and ticket IDs.
- Status: Partial.
- Safe for controlled beta: database-backed storage plus feature-flagged S3 attachment groundwork is acceptable for local/dev and narrow beta planning. The new proof harness adds safe no-network validation and local/mock synthetic lifecycle proof without requiring any real bucket mutation.
- Missing for paid SaaS: private bucket proof, versioning/lifecycle decisions, signed access rules, malware scanning path, encryption/control evidence, and real non-production bucket validation remain open.
- Next concrete implementation ticket: `PROD-C3 Object storage backup proof`.
- Current commands/evidence: `GET /storage/readiness`, `GET /storage/migration-plan`, `GET /system/backup-readiness`, `corepack pnpm storage:proof-validate -- --json --strict --dry-run`, `corepack pnpm storage:proof-validate -- --json --strict --mock-cycle --provider local`.
- Commands still forbidden: bucket creation, object upload/download validation against a real provider, lifecycle changes, migration execution, provider credential reads, and storage deletion.

## 2. Generated document storage

- Current repo evidence: generated documents remain database-backed; README, scorecard, and `docs/BACKUP_AND_RESTORE_READINESS_PLAN.md` call out that generated-document S3 writes are still planned. `scripts/object-storage-proof-validate.cjs` now validates a tenant-scoped generated-document object-key policy in dry-run and local/mock proof modes only.
- Status: Partial.
- Safe for controlled beta: existing database-backed generated-document archive metadata and download paths remain usable for controlled beta with explicit non-production limits. The proof harness confirms planned generated-document key separation without enabling real provider writes.
- Missing for paid SaaS: generated-document runtime object-storage writes, retention/legal-hold policy, restore proof, signed access rules, and lifecycle governance remain unimplemented.
- Next concrete implementation ticket: `PROD-C4 Generated document storage policy`.
- Current commands/evidence: `GET /storage/readiness`, `GET /storage/migration-plan`, generated-document archive/report surfaces already documented in `docs/API_CATALOG.md`, and `corepack pnpm storage:proof-validate -- --json --strict --mock-cycle --provider local`.
- Commands still forbidden: generated-document migration execution, provider bucket mutation, archive purge, legal-hold enforcement changes, and file-body export for proof.

## 3. Attachment storage

- Current repo evidence: `apps/api/src/storage/storage.service.ts` and `apps/web/src/lib/storage.ts` distinguish database and S3-compatible attachment modes; `apps/api/src/attachments/attachment-storage.service.ts` includes the S3-compatible attachment adapter groundwork; README and scorecard state database/base64 remains the default. `scripts/object-storage-proof-validate.cjs` now validates attachment path policy and local/mock upload-read-delete behavior.
- Status: Partial.
- Safe for controlled beta: current attachment upload/list/download/soft-delete paths with database default and optional S3 groundwork remain acceptable for controlled beta with explicit scale limits. The new proof harness adds local/mock lifecycle validation using synthetic payloads only.
- Missing for paid SaaS: real non-production bucket validation, object backup/restore proof, malware scanning, lifecycle policy, and migration execution remain open.
- Next concrete implementation ticket: `PROD-C3 Object storage backup proof`.
- Current commands/evidence: `GET /storage/readiness`, `GET /storage/migration-plan`, attachment/storage sections in README and scorecard, `corepack pnpm storage:proof-validate -- --json --strict --dry-run`, and `corepack pnpm storage:proof-validate -- --json --strict --mock-cycle --provider local`.
- Commands still forbidden: real bucket uploads/downloads, attachment migration, destructive cleanup, and provider setting changes.

## 4. Backup/PITR

- Current repo evidence: `apps/api/src/system/backup-readiness.service.ts` implements metadata-only evidence tracking for database backup, PITR, migration history, object storage backup, restore drill, and RPO/RTO review; `docs/BACKUP_AND_RESTORE_READINESS_PLAN.md` records local non-production restore-count evidence; `scripts/backup-restore-proof-harness.cjs` now adds a synthetic backup-manifest and restore-simulation harness with temp-directory-only artifacts.
- Status: Partial.
- Safe for controlled beta: metadata-only readiness, evidence capture, and local restore-count proof improve operator honesty without mutating hosted environments.
- Missing for paid SaaS: hosted provider backup/PITR proof, owner sign-off, recurring review cadence, and production-intended provider evidence.
- Next concrete implementation ticket: `PROD-C1 Hosted backup/PITR proof`.
- Current commands/evidence: `GET /system/backup-readiness`, `GET /system/restore-drill-plan`, `GET /system/backup-evidence`, `corepack pnpm backup:restore-proof -- --json --strict --dry-run`, `corepack pnpm backup:restore-proof -- --json --strict --mock-cycle`.
- Commands still forbidden: real hosted backup execution, PITR invocation, provider API calls, secret reads, and customer-data export.

## 5. Restore proof

- Current repo evidence: local non-production restore-count evidence is documented in `docs/BACKUP_AND_RESTORE_READINESS_PLAN.md`; `scripts/backup-restore-proof-harness.cjs` now proves a synthetic restore-simulation path with checksum and count verification; launch gates and scorecard still treat hosted restore proof as blocked.
- Status: Partial.
- Safe for controlled beta: the repo proves local non-production restore-count behavior, synthetic restore-simulation mechanics, and operator planning only; it does not claim hosted restore readiness.
- Missing for paid SaaS: restore proof remains missing at the hosted-provider level. Object-storage restore proof remains missing. Hosted cleanup/rollback criteria and pass-fail ownership are not yet proven.
- Next concrete implementation ticket: `PROD-C2 Restore drill in hosted environment`.
- Current commands/evidence: `GET /system/restore-drill-plan`, `GET /system/backup-readiness`, `docs/BACKUP_AND_RESTORE_READINESS_PLAN.md`, `corepack pnpm backup:restore-proof -- --json --strict --mock-cycle`.
- Commands still forbidden: hosted restore execution, snapshot import, destructive reset, customer-data validation dumps, and provider-side restore operations.

## 6. Monitoring/alerting

- Current repo evidence: `docs/production/LAUNCH_GATE_CHECKLIST.md`, `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`, `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`, and `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md` define monitoring tickets for uptime, API errors, workers, queues, email, and incidents.
- Status: Planning-only.
- Safe for controlled beta: health/readiness endpoints and runbooks provide limited operator visibility, but there is no live alerting claim.
- Missing for paid SaaS: monitoring/alerting remains missing beyond planning docs and metadata-only readiness surfaces.
- Next concrete implementation ticket: `PROD-D1 Uptime checks`.
- Current commands/evidence: docs-only evidence in production roadmap, launch gate, and implementation ticket backlog.
- Commands still forbidden: production monitor creation, provider webhook setup, external alert routing, and live incident simulations.

## 7. Runtime logs/error visibility

- Current repo evidence: `apps/api/src/health/health.controller.ts` exposes root/health/readiness; deployment runbooks document Vercel/Supabase troubleshooting and pooler behavior; no observability SDK is wired.
- Status: Partial.
- Safe for controlled beta: root/health/readiness plus deployment troubleshooting notes provide minimum operator visibility for user-testing.
- Missing for paid SaaS: centralized error monitoring, structured alert routing, worker/queue visibility, retention policy for logs, and explicit ownership.
- Next concrete implementation ticket: `PROD-D2 API error monitoring`.
- Current commands/evidence: `GET /`, `GET /health`, `GET /readiness`, deployment runbooks, troubleshooting docs.
- Commands still forbidden: provider log drains, error-monitoring SDK setup, production log forwarding, and request/response body logging.

## 8. Health/readiness endpoints

- Current repo evidence: `apps/api/src/health/health.controller.ts` implements public root status, lightweight health, and database-backed readiness; README documents their safe JSON contract.
- Status: Implemented.
- Safe for controlled beta: these endpoints are already safe for beta/user-testing because they avoid secrets and only expose minimal service status.
- Missing for paid SaaS: broader production coverage still needs authenticated read-only probes, uptime ownership, and alerting around failures.
- Next concrete implementation ticket: `PROD-D1 Uptime checks`.
- Current commands/evidence: `GET /`, `GET /health`, `GET /readiness`.
- Commands still forbidden: live uptime monitors, production alert policies, and synthetic authenticated traffic against real customer tenants.

## 9. Email provider readiness

- Current repo evidence: `apps/api/src/email/email.controller.ts` and `apps/api/src/email/email.service.ts` implement readiness, diagnostics planning, retry planning, provider-event planning, sender-domain evidence, suppression metadata, and monitoring-evidence capture; README and API catalog keep `productionReady=false` unless multiple gates are satisfied.
- Status: Partial.
- Safe for controlled beta: mock/local outbox default, metadata-only diagnostics/evidence, and disabled-by-default worker/webhook paths are acceptable for controlled beta.
- Missing for paid SaaS: non-production relay proof, provider-specific signed webhooks, live sender-domain validation, worker scheduling, alerting, invoice/statement sending flows, and support remediation.
- Next concrete implementation ticket: `PROD-D5 Email delivery monitoring`.
- Current commands/evidence: `GET /email/readiness`, `GET /email/monitoring-plan`, `GET /email/provider-events/plan`, metadata-only monitoring/sender-domain evidence endpoints.
- Commands still forbidden: real customer email sends, live provider webhook setup, DNS mutation, production relay diagnostics, and provider secret exposure.

## 10. Tenant isolation/RLS/runtime DB role

- Current repo evidence: API-layer organization context and permission guards exist; README and deployment reviews document revoked public grants in user-testing, while `docs/deployment/SUPABASE_RLS_REVIEW_20260519.md` and `docs/deployment/SUPABASE_RLS_DATA_API_HARDENING_20260521.md` keep runtime-role and RLS work explicitly incomplete.
- Status: Partial.
- Safe for controlled beta: API-layer tenancy plus grant mitigation is enough for controlled beta/user-testing only, with no claim that production DB isolation is finished.
- Missing for paid SaaS: least-privilege runtime DB role, `DIRECT_URL` and admin/runtime separation proof, Data API posture decision, and cross-tenant denial verification.
- Next concrete implementation ticket: `PROD-B1 Least-privilege Prisma runtime role`.
- Current commands/evidence: Supabase security/RLS review docs, README deployment notes, permission guard code, `/auth/me` and organization-context flows already implemented.
- Commands still forbidden: role creation, password rotation, Vercel/Supabase env mutation, RLS policy changes, SQL grants mutation, and data dumps.

## 11. Auth/session/MFA posture

- Current repo evidence: JWT auth, invite acceptance, password reset, auth tokens, and rate limits are implemented; route and database catalogs explicitly note missing MFA, refresh-token rotation, and advanced session invalidation.
- Status: Partial.
- Safe for controlled beta: basic JWT auth is usable for controlled beta with explicit limitations and no production-readiness claim.
- Missing for paid SaaS: MFA/session hardening remains missing. Refresh-token rotation, session invalidation, abuse monitoring, and stronger production identity controls are not implemented.
- Next concrete implementation ticket: `PROD-B6 Secrets management plan` for custody context, followed by the auth hardening work already called out in readiness docs.
- Current commands/evidence: `GET /auth/me`, invite/password-reset routes, route/database catalog docs, readiness scorecard entries.
- Commands still forbidden: production auth-provider mutation, real MFA enrollment flows, session-store changes in hosted environments, and secret rotation.

## 12. Audit immutability/export

- Current repo evidence: `apps/api/src/audit-log/*` provides filtered list/detail, CSV export, retention settings, and dry-run preview; README and readiness docs explicitly say there is no immutable external store, scheduled export, purge executor, alerting, anomaly detection, or tamper-evident chain.
- Status: Partial.
- Safe for controlled beta: sanitized audit logs and manual export improve controlled-beta audit visibility without claiming immutable production evidence.
- Missing for paid SaaS: immutable external retention, scheduled export, reviewed purge executor, alerting, anomaly detection, and tamper evidence.
- Next concrete implementation ticket: `PROD-C6 Retention/deletion policy`, followed by the audit/export work already called out in readiness docs.
- Current commands/evidence: `GET /audit-logs`, `GET /audit-logs/export.csv`, `GET /audit-logs/retention-settings`, `GET /audit-logs/retention-preview`.
- Commands still forbidden: destructive purge execution, external audit-store provisioning, customer-data export for audit proof, and production alert wiring.

## 13. Billing/legal/support ownership

- Current repo evidence: production roadmap, gap matrix, launch gate, and implementation tickets define billing, support, ToS, privacy, refund, provisioning, and support-workflow tracks, but they remain planning-only.
- Status: Planning-only.
- Safe for controlled beta: controlled beta can continue with explicit no-paid-SaaS wording while ownership and customer-ops processes are still unimplemented.
- Missing for paid SaaS: billing/legal/support ownership remains missing. No paid plan model, payment provider path, ToS, Privacy Policy, retention policy, customer support SLAs, or support ownership workflow is implemented.
- Next concrete implementation ticket: `PROD-E1 Subscription plans`.
- Current commands/evidence: `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`, `docs/production/NEXT_10_PRODUCTION_TICKETS.md`, `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`.
- Commands still forbidden: billing-provider account setup, payment-key handling, pricing-page mutation, legal finalization claims, and real customer support tooling changes.

## 14. Launch gate status

- Current repo evidence: `docs/production/LAUNCH_GATE_CHECKLIST.md` enumerates controlled beta, paid private beta, public production, security, backup/restore, monitoring/support, billing/legal, and ZATCA gates with blocked/not-started status where appropriate.
- Status: Partial.
- Safe for controlled beta: launch gates are honest about current posture and keep beta/user-testing separated from paid SaaS and production claims.
- Missing for paid SaaS: most paid/private-beta and public-production gates remain blocked or not started. Object-storage proof now has local/mock validation and S3 config-name validation, and backup/restore now has a synthetic proof harness, but real non-production bucket proof, hosted backup/PITR proof, hosted restore proof, monitoring/alerting, production email operations, billing/legal, security review, and ZATCA production compliance remain open.
- Next concrete implementation ticket: `Production trust implementation ticket 3: monitoring and runtime health proof`.
- Current commands/evidence: `docs/production/LAUNCH_GATE_CHECKLIST.md`, `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`, `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`.
- Commands still forbidden: treating this checklist as launch approval, flipping production claims, or using the static gate as deployment authorization.

## Current Safe Non-Mutating Commands

- `corepack pnpm production:trust-foundation-gate -- --json`
- `corepack pnpm production:trust-foundation-gate -- --json --strict`
- `corepack pnpm test:production-trust-foundation-gate`
- `corepack pnpm storage:proof-validate -- --json --strict --dry-run`
- `corepack pnpm storage:proof-validate -- --json --strict --mock-cycle --provider local`
- `corepack pnpm test:storage-proof-validate`
- `corepack pnpm backup:restore-proof -- --json --strict --dry-run`
- `corepack pnpm backup:restore-proof -- --json --strict --mock-cycle`
- `corepack pnpm test:backup-restore-proof`
- `corepack pnpm verify:diff`
- `git diff --check`

## Commands Still Forbidden In This Lane

- Real backup or restore execution
- Real object-storage upload, download, or bucket mutation
- Monitoring/alert provider setup
- Vercel or Supabase settings changes
- Runtime DB role or RLS mutation
- Real email sending
- Billing/provider setup
- Real ZATCA network, OTP, CSID, signing, clearance/reporting, or PDF-A3

## Exact Next Recommended Prompt Title

`Production trust implementation ticket 3: monitoring and runtime health proof`
