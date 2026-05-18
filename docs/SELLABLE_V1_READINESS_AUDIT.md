# Sellable v1 readiness audit

Last updated: 2026-05-18

## Scope

This audit covers LedgerByte SaaS/product readiness while ZATCA OTP and sandbox credentials are still unavailable. It intentionally excludes real ZATCA CSID requests, production CSID, clearance/reporting, PDF-A3, production credentials, signed XML/QR body persistence, and production compliance claims.

## Current readiness by area

| Area | Readiness | Status |
| --- | ---: | --- |
| Authentication, users, roles, permissions | 82% | MVP-ready, with mock email and no MFA as production gaps. |
| Tenant isolation and organization context | 84% | Tenant-scoped guards and x-organization-id workflows are in place; continued route-level regression coverage is required. |
| Onboarding | 82% | Improved with a dashboard sellable-v1 checklist and `/setup` guided first-run wizard; still needs production email. |
| Accounting workflows | 82% | Sales, purchases, payments, journals, reports, bank workflows, and operational inventory are usable for MVP-style testing. |
| Reliability and deployment readiness | 76% | Health/readiness, smoke, dashboard partial fallback, and Vercel/Supabase notes exist; production monitoring/backups remain incomplete. |
| Documents and storage | 62% | Generated docs and attachments exist; database/base64 fallback is still a scale and operations risk. |
| Admin/supportability | 70% | Audit logs, readiness docs, and settings pages exist; support dashboards and structured incident tooling remain limited. |
| ZATCA local readiness | 36% | Local planning, validation, custody boundaries, and evidence workflows exist; real sandbox/prod flows remain blocked. |

Overall sellable-v1 readiness: **75%** for a controlled test/beta workspace, not production ZATCA compliance.

## What is ready

- Email/password auth, organization membership, roles, permissions, and /auth/me membership metadata.
- Tenant-scoped accounting APIs using organization context.
- Chart of accounts, tax rates, contacts, items, journals, sales invoices, purchase bills, payments, refunds, notes, reports, bank profiles, bank reconciliation, attachments, and generated documents at MVP or partial-MVP depth.
- Dashboard summary with sequential database reads, partial section fallback, sanitized section warnings, and reduced Prisma pool pressure.
- Guided `/setup` wizard backed by `GET /dashboard/onboarding-checklist`, with read-only navigation for organization profile, chart of accounts, VAT/tax profile, first customer, first invoice, bank/payment method, ZATCA local readiness visibility, contact VAT/ID validation, and storage readiness.
- Contact VAT validation locked to exactly 15 digits and buyer ID Type / ID Number validation mapped into local ZATCA XML.
- ZATCA local-only planning, validation, evidence, storage, CSID mapper, mock adapter, and custody boundaries without real network calls.
- Smoke coverage for major accounting workflows and ZATCA safety gates.

## Critical blockers

- Real ZATCA sandbox OTP/CSID credentials are not available, so no real CSID request, clearance/reporting, or production compliance can be claimed.
- Production email delivery is not validated; mock email remains acceptable only for development/test.
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
- Updated readiness docs to make the sellable-v1 boundary explicit.

## Medium-priority fixes still recommended

- Add production SMTP readiness validation and admin-visible outbound email diagnostics.
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

## Next 10 implementation prompts

1. Add production SMTP readiness validation and email diagnostics without sending real customer emails by default.
2. Add Vercel/Supabase deployment runbook checks for pooled DB URLs, migration status, and safe environment summaries.
3. Add Playwright E2E coverage for login, dashboard, setup wizard, customer creation, invoice creation, payment, and reports.
4. Add attachment/generated-document object-store migration executor after a safe non-prod object-store rehearsal.
5. Add admin-visible support diagnostics for tenant configuration and common deployment failures.
6. Add accountant-reviewed dashboard KPI definitions and documentation.
7. Add contact/item import-export with validation previews.
8. Add backup/restore runbook evidence capture and smoke-level restore verification metadata.
9. Add controlled beta review checklist export for support and implementation handoff.
10. Resume ZATCA sandbox onboarding only after official OTP/sandbox access is available.
