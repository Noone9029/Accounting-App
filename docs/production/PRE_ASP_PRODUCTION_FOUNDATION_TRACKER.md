# Pre-ASP Production Foundation Tracker

Date: 2026-07-02
Goal ID: PRE-ASP-PRODUCTION-FOUNDATION-01
Baseline inspected: `8dc76db9046a9037806fcde33c14be4bc24bf3c2`

This tracker covers foundations that can be completed before final production hosting and before UAE ASP access. It does not approve production launch, production hosting, real ASP calls, Peppol/FTA submission, UAE compliance, or payment collection.

| Area | Current state | Target state before ASP access | Implemented in this PR | Blocked | Tests/checks | Owner discipline | Remaining follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| database/security | Prisma schema uses `organizationId` per tenant model; app guards enforce tenant context; Supabase RLS and runtime role cutover remain planned. | Least-privilege runtime role design, tenant-scope catalog, RLS/Data API strategy, and verification checklist ready before hosted mutation. | Added dry-run tenant/env diagnostics and security hardening plans. Diagnostic catalog found 112 models: 109 direct tenant-scoped, 2 roots, 1 global template model. | Hosted runtime role creation, RLS enablement, Data API/default grants hardening. | `corepack pnpm test:pre-asp-diagnostics`; `corepack pnpm pre-asp:diagnostics`. | No DB connection, no secret values, no role creation, no migration. | Run hosted read-only grants/RLS audit when a safe admin credential and deployment window exist. |
| backups/PITR | Local/mock restore and object-storage proof docs exist; hosted PITR and object storage are not proven. | PITR and restore-drill evidence index, object-storage validation plan, archive retention plan. | Added operations plans and evidence index. | Hosted PITR proof, real object bucket proof, legal hold/retention approval. | Docs plus existing local proof scripts. | No uploads/downloads/deletes; no destructive restore. | Execute hosted PITR drill and bucket validation in a dedicated infrastructure goal. |
| object storage | Attachments/generated documents have storage groundwork; production object storage readiness remains pending. | Provider config checklist, tenant isolation proof, metadata/hash validation, retention/legal-hold review. | Added validation and archive-retention plans. | Real S3/Supabase Storage bucket, signed URL proof, lifecycle/immutability proof. | Existing storage proof scripts; future provider-specific dry run. | No private document body access. | Choose provider and run non-production bucket proof. |
| monitoring/support | Health/readiness and beta docs exist; support process is informal. | Incident, support, alerting, dashboard requirements, and operational signals documented. | Added runbooks, alerting matrix, and dashboard requirements. | Monitoring vendor, production log drain, support inbox SLA tooling. | Docs review; future smoke checks. | No provider choice or production alert mutation. | Wire dashboards once hosting/provider choices are final. |
| billing/legal | Billing not enabled; legal docs are incomplete drafts. | Draft terms, privacy, data retention, beta limitations, billing readiness, pricing gates, provider decision log. | Added draft billing/legal package. | Legal counsel review, final pricing, payment provider selection, tax/legal review. | Docs review. | No payment collection or provider integration. | Legal review and billing implementation in a separate paid-beta goal. |
| UAE/PINT-AE pre-ASP adapter | Disabled/mock adapters and local PINT-AE serializer exist; no ASP access. | Provider-agnostic contract, local idempotency, webhook signature/replay helpers, error normalization, onboarding checklist, serializer gap list. | Added local-only idempotency/outbox draft helpers, HMAC verification with fake secrets, replay guard, error normalization, and docs. | Real ASP credentials, provider payload contracts, provider webhooks, accreditation evidence. | `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae test`. | No network, no real provider URL, no production compliance claim. | Integrate real provider only after ASP access and legal/security review. |
| evidence/retention | Audit and evidence models exist; production retention policy remains draft. | Evidence retention plan for backup, documents, support, and UAE eInvoice artifacts. | Added retention docs. | Legal retention approval and immutable storage proof. | Docs review. | No evidence fabrication. | Convert draft retention into reviewed policy. |
| launch gates | Controlled beta is GO with restrictions; production gates remain blocked. | Scorecards show improved pre-ASP readiness without overstating production readiness. | Status docs updated to mark frontend blocker closed and pre-ASP foundations partial. | Production hosting, ASP access, PITR/object storage, billing/legal review, monitoring provider. | Safety scans before PR. | No production deployment or hosted mutation. | Next goal should remain production-readiness implementation, not public launch. |

## Evidence Commands Added

- `corepack pnpm pre-asp:diagnostics`
- `corepack pnpm test:pre-asp-diagnostics`
- `corepack pnpm security:tenant-scope-audit`
- `corepack pnpm test:security-tenant-scope-audit`
- `corepack pnpm security:api-route-tenancy-audit`
- `corepack pnpm test:security-api-route-tenancy-audit`
- `corepack pnpm security:env-separation-check`
- `corepack pnpm test:security-env-separation-check`
- `corepack pnpm security:safe-script-audit`
- `corepack pnpm test:security-safe-script-audit`

These commands are read-only. They do not connect to a database, call a network endpoint, print secret values, run dangerous scripts, or mutate hosted infrastructure.

## SECURITY-EXECUTION-01 Evidence Baseline

- Tenant-scope audit: 112 Prisma models cataloged; 109 direct tenant-scoped, 3 indirect tenant-scoped, 0 risky unclassified. Unique constraint review queue: 55.
- API tenancy audit: 144 controller/service files scanned; 126 tenant-guarded, 8 review-needed, 3 webhook, 1 auth-only, 1 system/admin, 5 public-safe.
- Environment separation check: variable names only, no values printed.
- Safe-script audit: 166 script/package entries scanned; 112 potentially dangerous entries inventoried, 80 guarded/dry-run, 32 review-required.
- Hosted runtime role creation, Supabase RLS/Data API mutation, Vercel secret cutover, migrations, provider calls, storage operations, and production compliance remain pending.

## SECURITY-HARDENING-02 Diagnostic Review Update

- API tenancy diagnostic queue from PR #222 was reviewed and resolved: `docs/security/evidence/API_TENANCY_AUDIT.md` now reports `NO_RISKY_ROUTES_DETECTED`.
- Safe-script diagnostic queue was reduced from 32 to 10 review-required entries. The remaining entries are intentionally retained for DB migration/seed, demo seed, API smoke, and ZATCA validation/debug commands.
- New review evidence: `docs/security/evidence/API_TENANCY_REVIEW_02.md` and `docs/security/evidence/SAFE_SCRIPT_REVIEW_02.md`.
- No production hosting, Supabase/Vercel mutation, migration, seed/reset/delete, provider call, storage operation, email/payment action, or compliance behavior changed.

## SECURITY-SAFE-SCRIPTS-03 Safe-Script Guardrail Update

- Safe-script diagnostic queue is now reduced from 10 review-required entries to 0 review-required entries.
- The 10 retained dangerous-capable entries are reclassified as `owner-approval-required` with explicit local-only defaults, production/remote refusal, disposable non-production approval gates, and redaction tests where applicable.
- New review evidence: `docs/security/evidence/SAFE_SCRIPT_REVIEW_03.md`; audit evidence regenerated at `docs/security/evidence/SAFE_SCRIPT_AUDIT.md` and `.json`.
- This does not approve production execution. Migration, seed, demo seed, API smoke, and ZATCA validation/debug workflows remain blocked unless an owner explicitly approves a disposable non-production target.
- No production hosting, Supabase/Vercel mutation, migration, seed/reset/delete, provider call, storage operation, email/payment action, or compliance behavior changed.

## MONITORING-SUPPORT-EXECUTION-01 Local Diagnostic Update

- Added `corepack pnpm monitoring:support-readiness` and `corepack pnpm test:monitoring-support-readiness`.
- Generated local/read-only evidence at `docs/operations/evidence/MONITORING_SUPPORT_READINESS.md` and `.json`.
- Current status: `MONITORING_SUPPORT_PARTIAL_READY` with 13 available signals, 5 partial signals, and 0 blocked signals.
- Partial areas remain production-provider dependent: web uptime monitoring, email outbox provider alerting, generic queue/worker monitoring, object-storage proof, and UAE ASP readiness.
- Added controlled-beta support incident simulations, response templates, and support checklist under `docs/operations/`.
- No production monitoring provider, hosted log drain, production SLA, real email sending, provider call, storage/signed-URL operation, Supabase/Vercel mutation, migration, seed/reset/delete, or compliance behavior changed.

## UAE-PRE-ASP-ADAPTER-02 Local Adapter Readiness Update

- Strengthened package-level UAE PINT-AE and ASP adapter foundations: official identifier helpers, endpoint scheme validation, readiness-vs-official serializer modes, typed transmission drafts/timeline events, provider capability flags, timestamped fake webhook replay protection, and typed provider error normalization.
- Disabled providers still return blocked/no-network states. Mock providers now emit explicit `_MOCK` statuses such as `ACCEPTED_MOCK` and `REJECTED_MOCK`; real-provider statuses remain future contract values only.
- Evidence/retention mapping now covers official XML, readiness XML, provider envelopes/responses, webhook hashes/events, attempts, timeline, archive hashes, delivery evidence, future FTA evidence, and future inbound invoice evidence.
- No real ASP access, provider URL, provider credential, Peppol network call, FTA reporting, production compliance, storage operation, signed URL operation, hosted mutation, migration, seed/reset/delete, accounting behavior, report math, VAT math, invoice totals, or ledger posting changed.

## UAE-PRE-ASP-ADAPTER-03 Local Official Draft Readiness Update

- Added local official-draft invoice and credit-note model helpers plus structured validators for party, address, tax registration, line, tax, document total, credit-note, and business-process metadata readiness.
- Added `docs/uae-peppol/UAE_PINT_AE_SERIALIZER_READINESS_MATRIX.md` to separate implemented-local coverage from documented gaps and official/provider blockers.
- Serializer outputs now expose explicit metadata for mode, official identifier use, official-reference verification, provider requirement, missing provider access, conformance evidence availability, warnings, and errors.
- Disabled/mock provider behavior remains local-only: disabled returns `BLOCKED_NO_ASP`; mock returns `_MOCK` statuses only.
- No real ASP access, provider URL, provider credential, Peppol network call, FTA reporting, production compliance, storage operation, signed URL operation, hosted mutation, migration, seed/reset/delete, accounting behavior, report math, VAT math, invoice totals, or ledger posting changed.

## UAE-PRE-ASP-ADAPTER-04 Provider Harness Update

- Added provider-neutral envelope skeletons, sandbox onboarding state helpers, deterministic fake provider submission/status/webhook simulators, provider capability negotiation, and provider error fixtures to `@ledgerbyte/uae-peppol-pint-ae`.
- Added docs for the provider envelope skeleton, sandbox onboarding simulator, fake provider test harness, capability negotiation, and provider error fixture library.
- The harness is local-only and no-network. It rejects production simulation and external provider URLs, emits mock/local statuses only, and redacts document bodies, payloads, tokens, credentials, and secrets.
- No real ASP access, provider URL, provider credential, Peppol network call, FTA reporting, production compliance, storage operation, signed URL operation, hosted mutation, migration, seed/reset/delete, accounting behavior, report math, VAT math, invoice totals, or ledger posting changed.
