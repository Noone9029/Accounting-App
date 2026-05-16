# LedgerByte Project Audit

Audit date: 2026-05-15

Current commit audited: pending (`Fix ZATCA XML structure against SDK gaps`)

See also:

- `docs/PRODUCT_AUDIT_V2.md` for the current product maturity and go/no-go view.
- `docs/PRODUCT_READINESS_SCORECARD.md` for 0-100 readiness scores by product area.
- `docs/NEXT_30_PROMPTS_ROADMAP.md` for the prioritized next 30 implementation prompts.

## Summary

LedgerByte is a TypeScript monorepo for a GCC/Saudi-oriented accounting SaaS. The current codebase has a working local MVP for core AR and AP transaction flows, dashboard KPI overview, document PDFs, report CSV/PDF exports, generated-document archive, uploaded supporting-file attachment groundwork with database-default storage and feature-flagged S3-compatible storage for new uploads, storage readiness and dry-run migration planning, email invitation/password reset groundwork with mock-default delivery, opt-in SMTP adapter, provider readiness, test-send, and DB-backed rate limits, standardized audit logging with admin review UI, filtered CSV export, retention settings, dry-run retention preview, guarded number-sequence settings, operational inventory warehouse/stock-ledger/adjustment/transfer/receipt/issue/report controls, inventory accounting preview, clearing/matching groundwork, accountant-reviewed purchase bill clearing-mode finalization, explicit compatible purchase receipt asset posting, inventory clearing reconciliation/variance reporting, accountant-reviewed inventory variance proposal workflow, inventory accounting integrity audit, purchase receipt posting readiness audit, local API smoke coverage, browser E2E smoke coverage, and non-production ZATCA groundwork.

Current maturity level: `MVP_ACCOUNTING_FOUNDATION`. The Product Audit v2 now estimates local demo MVP readiness at 88%, private beta readiness at 62%, production SaaS readiness at 38%, Saudi/ZATCA production readiness at 28%, and Xero/Wafeq competitor readiness at 45%. The app can be demonstrated locally for dashboard KPI overview, sales invoices, customer payments, credit notes, customer refunds, purchase orders, purchase bills, purchase bill accounting previews, supplier payments, bank account profile balances/transactions, bank transfers, opening-balance posting, local bank statement import preview/reconciliation, reconciliation approval/close/lock review history, reconciliation reports, uploaded attachment upload/list/download/soft-delete on key source records, inventory warehouses, opening-balance movements, inventory adjustment approvals/voids, warehouse transfers/voids, purchase receipts/voids, sales stock issues/voids, inventory balances, inventory settings, inventory accounting settings, purchase receipt posting readiness, purchase receipt accounting previews, compatible receipt asset posting/reversal, bill/receipt matching visibility, inventory clearing reconciliation/variance reports, variance proposal create/submit/approve/post/reverse/void workflow, sales issue COGS previews/posting, stock valuation/movement/low-stock reports, ledgers, statements, core report exports, and PDFs. It is not production-ready as a SaaS and is not production ZATCA compliant.

## Tech Stack

- Monorepo: pnpm workspaces.
- Backend: NestJS, Prisma, PostgreSQL, JWT auth, class-validator DTOs.
- Frontend: Next.js App Router, React, Tailwind CSS, typed API helpers.
- Shared packages: `accounting-core`, `pdf-core`, `zatca-core`, `shared`, `ui`.
- PDF: PDFKit through `packages/pdf-core`.
- ZATCA: local TypeScript scaffolding plus local official references, Java SDK readiness/local-validation wrapper checks, official sample fixture validation pass under Java 11, and first LedgerByte XML structural fixes against SDK output.
- Local infra: Docker Compose for PostgreSQL, Redis, API, and web.

## Monorepo Structure

- `apps/api`: NestJS API, Prisma schema/migrations/seed, smoke script, backend tests.
- `apps/web`: Next.js app routes, forms, helpers, frontend tests.
- `packages/accounting-core`: decimal-safe journal and invoice calculation helpers.
- `packages/pdf-core`: PDF data contracts and renderers.
- `packages/zatca-core`: local-only XML/QR/hash/CSR/checklist helpers.
- `packages/shared`: shared tenant/API types.
- `packages/ui`: UI placeholder package.
- `docs`: project audit docs plus ZATCA implementation maps.
- `reference`: local ZATCA/FATOORA docs and Java SDK material; not used for real network calls.
- `infra`: local Docker Compose and setup notes.

## What Works End To End

- Register/login, organization selection, and role-aware `/auth/me` membership responses.
- Read-only dashboard summary and UI showing AR/AP, banking, inventory, report-health, compliance/admin counts, attention items, and permission-gated quick actions.
- Tenant-scoped role permissions with protected default Owner/Admin/Accountant/Sales/Purchases/Viewer roles.
- Role and organization member management UI/API with custom role creation, permission matrices, role/status changes, active-provider email invites, invite acceptance, password reset, email provider readiness/test-send, token request rate limits, expired-token cleanup, email outbox inspection, audit log review UI, filtered audit CSV export, retention dry-run controls, and guarded number-sequence settings.
- API permission guards for sensitive accounting, document, report, fiscal period, and ZATCA actions.
- Frontend sidebar, route access, and high-risk action visibility based on active role permissions.
- Tenant-scoped CRUD foundations for accounts, branches, contacts, tax rates, items, journals, and future document numbering settings.
- Bank account profiles for cash/bank asset accounts, posted transaction visibility, bank-aware payment/expense account labels, posted bank transfers, transfer voids, guarded one-time opening-balance journals, local statement import preview/validation, manual matching, categorization journals, ignores, reconciliation summaries, reconciliation submit/approve/reopen/close records, review events, close item snapshots, void history, and closed-period statement/import locks.
- Sales invoice draft/create/edit/finalize/void with AR journal posting.
- Customer payment posting with invoice allocation and balance updates.
- Unapplied customer payment application and reversal.
- Credit note creation/finalization/void, allocation to invoices, and allocation reversal.
- Manual customer refunds from unapplied customer payments or credit notes.
- Customer ledger and statement rows for AR events.
- Purchase bill draft/create/edit/finalize/void with AP journal posting.
- Purchase order draft/create/edit/delete, approve, mark sent, close, void, PDF/archive, and conversion to draft purchase bills without posting journals.
- Supplier payment posting, allocation to bills, bill balance updates, and void restoration.
- Supplier ledger and statement rows for AP events.
- Inventory `MAIN` warehouse defaults, warehouse create/archive/reactivate, opening-balance stock movements, draft/approved/voided inventory adjustments, posted/voided warehouse transfers, posted/voided purchase receipts, posted/voided sales stock issues, source document receive/issue status helpers, purchase bill/order receipt matching status helpers, purchase bill direct-vs-clearing accounting previews/finalization, compatible purchase receipt asset previews/post/reverse journals, inventory clearing reconciliation/variance reports, accountant-reviewed variance proposals with explicit approved posting/reversal, derived item/warehouse balances, valuation settings, inventory accounting settings with inventory clearing mapping, purchase receipt posting readiness, sales issue COGS previews, explicit manual COGS post/reverse journals, operational stock reports, low-stock reporting, and explicit no-journal inventory movement behavior outside manual COGS/receipt asset/approved variance proposal post actions.
- Sales invoice, credit note, customer payment, customer refund, customer statement, purchase order, purchase bill, supplier payment, core report, and bank reconciliation PDFs.
- Core accounting report JSON/CSV/PDF outputs for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, and Aged Payables.
- Generated document archive for generated PDFs.
- Uploaded supporting-file attachment groundwork with database-default storage, metadata, tenant-scoped linked entity validation, reusable panels on key detail pages, storage readiness API, feature-flagged S3-compatible upload/download storage for new attachments, dry-run migration counts, and `/settings/storage`.
- Local-only ZATCA profile, EGS, CSR, mock CSID, XML/QR/hash, compliance checklist, reference maps, SDK wrapper readiness/dry-run/local-validation disabled path, and official fixture registry/results documentation.
- Full `typecheck`, `test`, `build`, and API smoke workflow is run for each release checkpoint; browser E2E smoke now exists for local user-facing route checks.

## Groundwork Or Scaffold Only

- Email invitation, invited-user onboarding, and password reset exist with mock/local default delivery, an opt-in SMTP adapter, provider readiness/test-send, DB-backed rate limits, and expired-token cleanup; no background queue/retry, provider webhooks, domain authentication validation, MFA, or advanced session management exists.
- Bank feeds, external bank APIs, automatic matching, OFX/CAMT/MT940 upload parsing, transfer fees, and multi-currency FX transfers are not implemented.
- Purchase receiving exists as a manual operational workflow; partial billing, supplier delivery documents, landed cost, and automatic inventory receipt are not implemented.
- Dashboard and reports have useful MVP visibility, but dashboard KPI definitions, report filing definitions, scheduling, and email delivery remain missing.
- Inventory warehouse, stock ledger, adjustment approval, warehouse transfer controls, manual purchase receiving, manual sales stock issue, valuation settings, purchase bill clearing-mode finalization, compatible manual purchase receipt asset posting, inventory clearing preview/matching/reconciliation groundwork, accountant-reviewed variance proposal workflow, purchase receipt posting readiness audit, inventory accounting integrity audit, manual COGS posting, and operational reports exist, but automatic COGS, automatic/direct-mode receipt asset posting, automatic variance posting, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are not implemented.
- PDF rendering is operational only, not legal/template-complete.
- Generated document storage and existing uploaded attachment content still default to database base64; new uploaded attachments can use S3-compatible storage only when explicitly configured, and no migration executor is active.
- ZATCA is local/mock/scaffold only. Local SDK validation groundwork exists behind a disabled-by-default flag; official SDK sample fixtures now pass under Java 11, LedgerByte standard XML fixture now passes SDK global validation, and simplified XML fixture passes XSD/EN/PIH, but signing, Phase 2 QR, real CSID, clearance, reporting, and PDF/A-3 do not exist.
- Redis is present in local infra but workers/queues are not wired.
- Production deployment, monitoring, backups, subscription billing, email queue/retry/webhook operations, WhatsApp, generated-document object storage, and attachment migration operations are not implemented.

## Top 10 Risks

1. ZATCA is not production compliant; LedgerByte simplified XML still fails signing/QR/certificate checks and real onboarding, signing, SDK-verified generated XML, and API submission are missing.
2. Invite/onboarding/password reset default to mock/local delivery with provider readiness, test-send, opt-in SMTP, and DB-backed request rate limits; MFA, queue/retry, webhooks, and advanced session management are still missing.
3. No broad approval workflow, dual control, or maker-checker policy exists for high-risk accounting actions outside the new bank reconciliation approval path.
4. Bank reconciliation has local import preview, manual matching, categorization, approval, close/lock, report export groundwork, and basic linked attachments, but there is no live feed, automatic matching, OFX/CAMT/MT940 parser, production-grade bank file parser/storage workflow, or external bank integration.
5. Inventory warehouses, adjustment controls, transfers, manual receipts/issues, valuation settings, purchase bill clearing-mode finalization, compatible manual receipt asset posting, inventory clearing preview/matching/reconciliation groundwork, variance proposal workflow, purchase receipt posting readiness audit, integrity audit, and manual COGS posting exist, but automatic COGS, automatic/direct-mode receipt asset posting, GL valuation reports, automatic variance posting, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are still missing.
6. Generated PDFs and existing uploaded attachments remain database/base64 by default; new uploaded attachments can use the feature-flagged S3-compatible adapter, but no migration executor, generated-document S3 path, virus scanning, or lifecycle policy is active.
7. Production secrets/key custody is not hardened; ZATCA private key storage is explicitly dev-only.
8. Dashboard, browser E2E, and API smoke improve visibility, but dashboard KPIs are still MVP definitions and there is no visual regression coverage yet.
9. Supplier AP balance display reuses a generic Dr/Cr helper; supplier-specific payable wording should be reviewed to avoid user confusion.
10. Audit logs cover high-risk events, admin review, filtered CSV export, retention dry-run controls, and number-sequence update events, but scheduled export, automatic purge, immutable external storage, alerting, anomaly detection, and tamper evidence are not implemented.

## Top 10 Next Priorities

1. Run a human QA pass through the dashboard, sales, purchase, payment, refund, and PDF routes, then wire typecheck/test/build/API smoke into CI and decide when the manual deployed E2E workflow should become scheduled.
2. Validate SMTP against a non-production relay, add DKIM/SPF/domain-authentication checks, MFA planning, scheduled audit export, audit alerting for role/member changes, and a reviewed number-sequence reset/skip workflow.
3. Add official VAT return work, accountant review for report definitions, and scheduled/email report delivery.
4. Add fiscal year close, retained earnings close, and controlled unlock/approval workflows.
5. Add partial PO receiving/billing design and purchase matching hardening.
6. Harden bank reconciliation with upload storage, import file-format samples/parsers, transfer fees, and multi-currency FX handling.
7. Review accountant-reviewed inventory variance journal proposal outputs, then define historical direct-mode exclusion/migration and landed-cost policy before any automatic posting.
8. Resolve remaining LedgerByte generated XML, SDK hash comparison, signing/certificate, and Phase 2 QR gaps, then advance CSID, clearance/reporting, and PDF/A-3.
9. Test the uploaded-attachment S3 adapter with a real non-production bucket, then implement the migration executor and generated-document S3 path.
10. Prepare production deployment, monitoring, backups, secrets management, and security review.

## New Issues Found During Audit

- Supplier AP balances currently display through the shared `formatLedgerBalance` helper that labels positive balances as `Dr`. The underlying supplier ledger math is documented as credit-minus-debit, but the UI should later use supplier-specific payable labels to avoid confusing accountants.
- Prisma still warns that `package.json#prisma` seed configuration is deprecated and should move to Prisma config before Prisma 7.
- Windows PowerShell requires quoting paths containing `(app)` when running git or shell commands against frontend App Router paths.

## Audit Verification Commands

- `corepack pnpm add -D @playwright/test -w`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm e2e --list`: passed and discovered 11 Playwright smoke specs.
- `corepack pnpm build`: passed.
- `corepack pnpm --filter @ledgerbyte/web test`: passed.
- Full browser E2E run was skipped because local API/web were not listening on `localhost:4000` and `localhost:3000`.
