# Sellable v1 readiness audit

Last updated: 2026-05-18

## Scope

This audit covers LedgerByte SaaS/product readiness while ZATCA OTP and sandbox credentials are still unavailable. It intentionally excludes real ZATCA CSID requests, production CSID, clearance/reporting, PDF-A3, production credentials, signed XML/QR body persistence, and production compliance claims.

## Current readiness by area

| Area | Readiness | Status |
| --- | ---: | --- |
| Authentication, users, roles, permissions | 82% | MVP-ready, with mock email and no MFA as production gaps. |
| Tenant isolation and organization context | 84% | Tenant-scoped guards and x-organization-id workflows are in place; continued route-level regression coverage is required. |
| Onboarding | 78% | Improved with a dashboard sellable-v1 checklist; still needs guided first-run setup and production email. |
| Accounting workflows | 82% | Sales, purchases, payments, journals, reports, bank workflows, and operational inventory are usable for MVP-style testing. |
| Reliability and deployment readiness | 76% | Health/readiness, smoke, dashboard partial fallback, and Vercel/Supabase notes exist; production monitoring/backups remain incomplete. |
| Documents and storage | 62% | Generated docs and attachments exist; database/base64 fallback is still a scale and operations risk. |
| Admin/supportability | 70% | Audit logs, readiness docs, and settings pages exist; support dashboards and structured incident tooling remain limited. |
| ZATCA local readiness | 36% | Local planning, validation, custody boundaries, and evidence workflows exist; real sandbox/prod flows remain blocked. |

Overall sellable-v1 readiness: **74%** for a controlled test/beta workspace, not production ZATCA compliance.

## What is ready

- Email/password auth, organization membership, roles, permissions, and /auth/me membership metadata.
- Tenant-scoped accounting APIs using organization context.
- Chart of accounts, tax rates, contacts, items, journals, sales invoices, purchase bills, payments, refunds, notes, reports, bank profiles, bank reconciliation, attachments, and generated documents at MVP or partial-MVP depth.
- Dashboard summary with sequential database reads, partial section fallback, sanitized section warnings, and reduced Prisma pool pressure.
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
- Added a dashboard onboarding checklist card showing organization setup, COA, tax, customer, invoice, bank/payment, ZATCA visibility, contact VAT/ID validation, and storage readiness.
- Added smoke assertions proving the checklist is safe, no-mutation, tenant-scoped, and keeps ZATCA production compliance/network/body persistence disabled.
- Added backend and frontend targeted tests for checklist behavior and helper formatting.
- Updated readiness docs to make the sellable-v1 boundary explicit.

## Medium-priority fixes still recommended

- Add a first-run setup wizard that links directly to organization profile, tax rates, contacts, and first invoice creation.
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

## Next 10 implementation prompts

1. Add a guided first-run setup wizard that uses the onboarding checklist as its source of truth.
2. Add production SMTP readiness validation and email diagnostics without sending real customer emails by default.
3. Add Vercel/Supabase deployment runbook checks for pooled DB URLs, migration status, and safe environment summaries.
4. Add Playwright E2E coverage for login, dashboard, customer creation, invoice creation, payment, and reports.
5. Add attachment/generated-document object-store migration executor after a safe non-prod object-store rehearsal.
6. Add admin-visible support diagnostics for tenant configuration and common deployment failures.
7. Add accountant-reviewed dashboard KPI definitions and documentation.
8. Add contact/item import-export with validation previews.
9. Add backup/restore runbook evidence capture and smoke-level restore verification metadata.
10. Resume ZATCA sandbox onboarding only after official OTP/sandbox access is available.
