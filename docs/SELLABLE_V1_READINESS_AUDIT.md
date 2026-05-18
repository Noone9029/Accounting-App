# Sellable v1 readiness audit

Last updated: 2026-05-19

## Scope

This audit covers LedgerByte SaaS/product readiness while ZATCA OTP and sandbox credentials are still unavailable. It intentionally excludes real ZATCA CSID requests, production CSID, clearance/reporting, PDF-A3, production credentials, signed XML/QR body persistence, and production compliance claims.

## Current readiness by area

| Area | Readiness | Status |
| --- | ---: | --- |
| Authentication, users, roles, permissions | 86% | MVP-ready, with email readiness diagnostics, sender-domain evidence capture, retry/outbox metadata, webhook/suppression readiness, and no MFA/real-provider validation as production gaps. |
| Tenant isolation and organization context | 84% | Tenant-scoped guards and x-organization-id workflows are in place; continued route-level regression coverage is required. |
| Onboarding | 82% | Improved with a dashboard sellable-v1 checklist and `/setup` guided first-run wizard; still needs production email. |
| Accounting workflows | 82% | Sales, purchases, payments, journals, reports, bank workflows, and operational inventory are usable for MVP-style testing. |
| Reliability and deployment readiness | 80% | Health/readiness, smoke, dashboard partial fallback, email diagnostics/domain evidence, retry/provider-event/webhook/suppression readiness, and Vercel/Supabase notes exist; production monitoring/backups remain incomplete. |
| Documents and storage | 62% | Generated docs and attachments exist; database/base64 fallback is still a scale and operations risk. |
| Admin/supportability | 72% | Audit logs, readiness docs, email diagnostics, and settings pages exist; support dashboards and structured incident tooling remain limited. |
| ZATCA local readiness | 36% | Local planning, validation, custody boundaries, and evidence workflows exist; real sandbox/prod flows remain blocked. |

Overall sellable-v1 readiness: **78%** for a controlled test/beta workspace, not production ZATCA compliance.

## What is ready

- Email/password auth, organization membership, roles, permissions, and /auth/me membership metadata.
- Tenant-scoped accounting APIs using organization context.
- Chart of accounts, tax rates, contacts, items, journals, sales invoices, purchase bills, payments, refunds, notes, reports, bank profiles, bank reconciliation, attachments, and generated documents at MVP or partial-MVP depth.
- Dashboard summary with sequential database reads, partial section fallback, sanitized section warnings, and reduced Prisma pool pressure.
- Guided `/setup` wizard backed by `GET /dashboard/onboarding-checklist`, with read-only navigation for organization profile, chart of accounts, VAT/tax profile, first customer, first invoice, bank/payment method, ZATCA local readiness visibility, contact VAT/ID validation, and storage readiness.
- Email readiness, diagnostics, sender-domain evidence, retry planning, provider-event capture, webhook readiness, and suppression metadata for production SMTP visibility: `GET /email/readiness` is read-only/no-mutation, `POST /email/diagnostics` and default `POST /email/retry-process` skip without sending customer email or creating outbox records, SPF/DKIM/DMARC evidence plus provider events are metadata-only, webhook verification is disabled by default, and suppressions store masked/hash metadata only.
- Contact VAT validation locked to exactly 15 digits and buyer ID Type / ID Number validation mapped into local ZATCA XML.
- ZATCA local-only planning, validation, evidence, storage, CSID mapper, mock adapter, and custody boundaries without real network calls.
- Smoke coverage for major accounting workflows and ZATCA safety gates.

## Critical blockers

- Real ZATCA sandbox OTP/CSID credentials are not available, so no real CSID request, clearance/reporting, or production compliance can be claimed.
- Production email delivery is not validated against a real provider; readiness, disabled-by-default diagnostics/retry processing, sender-domain evidence, webhook/suppression metadata, and provider-event capture exist, but mock email remains acceptable only for development/test.
- Production storage strategy is incomplete: database/base64 fallback is not a scalable attachment/generated-document archive.
- Backup/restore, monitoring, alerting, and incident runbooks need deployment-owner validation.
- Subscription billing, tenant lifecycle, and customer support operations are not implemented as a sellable SaaS package.
- Production key/secret custody for ZATCA and other sensitive material remains blocked.

## High-priority fixes implemented in this audit

- Added GET /dashboard/onboarding-checklist, a tenant-scoped, read-only, no-mutation sellable-v1 checklist.
- Added a dashboard onboarding card with progress, next incomplete step, blocker summary, and an `Open setup wizard` link.
- Added `/setup`, a checklist-backed guided first-run wizard with evidence, blockers, warnings, and safe action links for each setup step.
- Added smoke assertions proving the checklist is safe, no-mutation, tenant-scoped, and keeps ZATCA production compliance/network/body persistence disabled.
- Added frontend targeted tests for wizard helper logic, rendered setup steps, safe fallback, ZATCA local-only messaging, and the dashboard setup link.
- Added production email readiness fields, disabled-by-default diagnostics, redaction guarantees, settings-page status, and smoke assertions for no-send/no-mutation diagnostics.
- Added `EmailSenderDomainEvidence`, metadata-only SPF/DKIM/DMARC evidence endpoints, diagnostics plan visibility, relay/bounce/retry/monitoring readiness blockers, settings-page evidence controls, and smoke assertions for no-send/no-outbox behavior.
- Added durable outbox retry metadata, disabled-by-default `/email/retry-process`, read-only `/email/retry-plan`, metadata-only `EmailProviderEvent`, unsigned `/email/provider-events/mock`, settings-page retry/event readiness, and smoke assertions for no-send/no-mutation default behavior.
- Added provider-agnostic signed webhook readiness, disabled-by-default `/email/provider-events/webhook`, read-only `/email/provider-events/webhook-plan`, metadata-only `EmailSuppression`, suppression list/create/revoke endpoints, settings-page webhook/suppression readiness, and smoke assertions for no-secret/no-send defaults.
- Updated readiness docs to make the sellable-v1 boundary explicit.

## Medium-priority fixes still recommended

- Run an explicitly enabled non-production SMTP relay diagnostic against an allowlisted sandbox recipient and document provider evidence.
- Add a scheduled retry worker, provider-specific webhook adapter, and monitoring-safe bounce/complaint alert thresholds.
- Add deployment runbooks for Vercel/Supabase pooled connection strings, migrations, backups, restore tests, and rollback.
- Add Playwright browser E2E coverage for login, dashboard, contact creation, invoice creation, payment, and report views.
- Add production storage migration execution for attachments/generated documents after a non-prod object-store rehearsal.

## Nice-to-have items

- Import/export for contacts and items.
- More accountant-reviewed dashboard KPI definitions.
- More guided empty states across reports and settings pages.
- Support/admin diagnostics page for organization-level configuration issues.
- Billing/subscription workflows after product readiness stabilizes.

## What not to do until ZATCA OTP arrives

- Do not request real compliance CSIDs or production CSIDs.
- Do not call real ZATCA network endpoints.
- Do not implement clearance/reporting or PDF-A3.
- Do not persist signed XML bodies, QR payload bodies, CSID tokens, CSID secrets, certificates, private keys, OTPs, or CSR bodies.
- Do not claim production ZATCA compliance.

## Deployment and environment recommendations

- Use Supabase pooled database URLs for Vercel/serverless deployments and avoid a brittle connection_limit=1 unless the plan forces it.
- Keep dashboard query fan-out limited and keep non-critical section fallbacks.
- Keep NEXT_PUBLIC_API_URL aligned with the deployed API origin and keep API CORS explicit for deployed web origins.
- Validate /health, /readiness, /dashboard/summary, and /dashboard/onboarding-checklist after each deployment.
- Keep object-storage probe and CSID execution flags disabled by default.
- Validate backup/restore and storage retention policies before production customer data.

## Smoke and test recommendations

- Run targeted tests for changed modules, then typecheck, build, smoke, and git diff --check.
- Keep smoke:accounting as the release gate for core demo workflows.
- Add browser smoke for deployed login/dashboard when domain or CORS settings change.
- Do not run Java SDK or real ZATCA network commands unless the task explicitly touches local SDK validation.

Latest guided setup verification:
- `corepack pnpm --filter @ledgerbyte/web test -- --runTestsByPath src/lib/dashboard.test.ts src/components/onboarding/setup-wizard.test.tsx` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm build` passed and included the static `/setup` route.
- `corepack pnpm smoke:accounting` passed against a transient local API; the smoke still verifies `/dashboard/onboarding-checklist`, `productionCompliance=false`, and real ZATCA network disabled.
- `git diff --check` passed.
- Skipped backend dashboard tests because no backend code changed.
- Skipped `pnpm install`, Prisma generate/migrate/seed, Java SDK execution, real ZATCA network, CSID request, clearance/reporting, and PDF-A3 work because dependencies, schema, seed data, and ZATCA execution scope did not change.

Latest email readiness diagnostics verification:
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs src/email src/auth src/organization-members` passed and covers missing SMTP blockers, redaction, no-send readiness, disabled diagnostics, unsafe-recipient rejection, mocked allowed-recipient delivery summaries, invite, and password reset paths.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --passWithNoTests --runTestsByPath src/lib/email.test.ts src/components/email/email-readiness-safe-status.test.tsx` passed and covers readiness/diagnostics labels plus safe settings status rendering without secret values.
- `corepack pnpm typecheck` passed.
- `corepack pnpm build` passed.
- `smoke:accounting` now verifies `/email/readiness`, default-disabled `/email/diagnostics`, `noCustomerEmailSent=true`, no outbox mutation, secret-marker redaction, and continued mock `test-send` behavior.
- `git diff --check` passed with line-ending warnings only.
- ZATCA execution, real CSID, clearance/reporting, and PDF-A3 commands remain skipped because this change is email-only.

Latest email sender-domain readiness verification:
- Targeted API email tests now cover missing sender-domain evidence, secret rejection for private DKIM keys/SMTP passwords/API keys/tokens, metadata-only evidence create, verified SPF/DKIM/DMARC readiness, default-disabled diagnostics, mocked safe delivery summaries, and no outbox mutation.
- Targeted web email tests now cover sender-domain status labels, relay diagnostics labels, diagnostics disabled-by-default rendering, production-not-ready messaging, and no secret-like values in status output.
- `smoke:accounting` now checks `senderDomain`, SPF/DKIM/DMARC requirements, relay diagnostics status, bounce/retry/monitoring blockers, `/email/sender-domain-evidence`, diagnostics default no-send/no-mutation behavior, no outbox mutation, and secret-marker redaction.
- The task did not run Java SDK, real ZATCA network, real CSID, clearance/reporting, PDF-A3, or real customer email sends.

Latest email retry and bounce readiness verification:
- Targeted API email tests now cover read-only retry plans, default-skipped retry processing, enabled mocked retry metadata updates, max-attempt blocking, redacted provider errors, secret/customer-content rejection for mock provider events, unsigned event non-contribution to production readiness, and readiness retry/bounce/monitoring blockers.
- Targeted web email tests now cover retry processor and provider event readiness labels plus production-not-ready/no-secret status rendering.
- `smoke:accounting` now checks `/email/retry-plan`, default `/email/retry-process`, `/email/provider-events/plan`, retry/bounce/provider-event readiness fields, no email sent, no mutation by default, no new outbox records, and secret-marker redaction.
- The task did not run Java SDK, real ZATCA network, real CSID, clearance/reporting, PDF-A3, or real customer email sends.

Latest email webhook suppression readiness verification:
- Targeted API email tests now cover webhook plans, disabled/invalid signed webhook rejection, valid mocked signature metadata storage, bounce suppression creation, masked/hash suppression storage, suppression revoke, suppressed send/retry blocking, and readiness webhook/suppression/alert blockers.
- Targeted web email tests now cover webhook verification labels, suppression labels, production-not-ready rendering, and no secret-like values in status output.
- `smoke:accounting` now checks `/email/provider-events/webhook-plan`, `/email/suppressions`, manual suppression masking/hash behavior, retry-plan suppression counts, no webhook secret/raw payload exposure, default retry/diagnostics no-send behavior, and `productionReady=false`.
- The task did not run Java SDK, real ZATCA network, real CSID, clearance/reporting, PDF-A3, real provider webhook calls, or real customer email sends.

## Next 10 implementation prompts

1. Add a scheduled transactional email retry worker and monitoring dashboard evidence for retry throughput, bounce/complaint thresholds, and suppression trends while real customer sends remain disabled by default.
2. Run a non-production SMTP relay diagnostic using an allowlisted sandbox recipient, then record provider result evidence without sending customer emails.
3. Add Vercel/Supabase deployment runbook checks for pooled DB URLs, migration status, and safe environment summaries.
4. Add Playwright E2E coverage for login, dashboard, setup wizard, customer creation, invoice creation, payment, and reports.
5. Add attachment/generated-document object-store migration executor after a safe non-prod object-store rehearsal.
6. Add admin-visible support diagnostics for tenant configuration and common deployment failures.
7. Add accountant-reviewed dashboard KPI definitions and documentation.
8. Add contact/item import-export with validation previews.
9. Add backup/restore runbook evidence capture and smoke-level restore verification metadata.
10. Resume ZATCA sandbox onboarding only after official OTP/sandbox access is available.
