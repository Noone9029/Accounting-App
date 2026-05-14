# LedgerByte Project Audit

Audit date: 2026-05-14

Current commit audited: pending (`Add inventory clearing preview groundwork`)

## Summary

LedgerByte is a TypeScript monorepo for a GCC/Saudi-oriented accounting SaaS. The current codebase has a working local MVP for core AR and AP transaction flows, document PDFs, report CSV/PDF exports, generated-document archive, operational inventory warehouse/stock-ledger/adjustment/transfer/receipt/issue/report controls, inventory accounting preview and clearing/matching groundwork, local smoke coverage, and non-production ZATCA groundwork.

Current maturity level: `MVP_ACCOUNTING_FOUNDATION`. The app can be demonstrated locally for sales invoices, customer payments, credit notes, customer refunds, purchase orders, purchase bills, supplier payments, bank account profile balances/transactions, bank transfers, opening-balance posting, local bank statement import preview/reconciliation, reconciliation approval/close/lock review history, reconciliation reports, inventory warehouses, opening-balance movements, inventory adjustment approvals/voids, warehouse transfers/voids, purchase receipts/voids, sales stock issues/voids, inventory balances, inventory settings, inventory accounting settings, purchase receipt accounting previews, bill/receipt matching visibility, sales issue COGS previews, stock valuation/movement/low-stock reports, ledgers, statements, core report exports, and PDFs. It is not production-ready as a SaaS and is not production ZATCA compliant.

## Tech Stack

- Monorepo: pnpm workspaces.
- Backend: NestJS, Prisma, PostgreSQL, JWT auth, class-validator DTOs.
- Frontend: Next.js App Router, React, Tailwind CSS, typed API helpers.
- Shared packages: `accounting-core`, `pdf-core`, `zatca-core`, `shared`, `ui`.
- PDF: PDFKit through `packages/pdf-core`.
- ZATCA: local TypeScript scaffolding plus local official references and Java SDK wrapper readiness checks.
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
- Tenant-scoped role permissions with protected default Owner/Admin/Accountant/Sales/Purchases/Viewer roles.
- Role and organization member management UI/API with custom role creation, permission matrices, role/status changes, and local invite placeholders.
- API permission guards for sensitive accounting, document, report, fiscal period, and ZATCA actions.
- Frontend sidebar, route access, and high-risk action visibility based on active role permissions.
- Tenant-scoped CRUD foundations for accounts, branches, contacts, tax rates, items, and journals.
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
- Inventory `MAIN` warehouse defaults, warehouse create/archive/reactivate, opening-balance stock movements, draft/approved/voided inventory adjustments, posted/voided warehouse transfers, posted/voided purchase receipts, posted/voided sales stock issues, source document receive/issue status helpers, purchase bill/order receipt matching status helpers, derived item/warehouse balances, valuation settings, inventory accounting settings with inventory clearing mapping, purchase receipt accounting previews, sales issue COGS previews, explicit manual COGS post/reverse journals, operational stock reports, low-stock reporting, and explicit no-journal inventory movement behavior outside manual COGS actions.
- Sales invoice, credit note, customer payment, customer refund, customer statement, purchase order, purchase bill, supplier payment, core report, and bank reconciliation PDFs.
- Core accounting report JSON/CSV/PDF outputs for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, and Aged Payables.
- Generated document archive for generated PDFs.
- Local-only ZATCA profile, EGS, CSR, mock CSID, XML/QR/hash, compliance checklist, reference maps, and SDK wrapper readiness/dry-run.
- Full `typecheck`, `test`, `build`, and smoke workflow is run for each release checkpoint.

## Groundwork Or Scaffold Only

- Invite delivery, invited-user onboarding, and password reset remain placeholder/missing even though local role/member management exists.
- Bank feeds, external bank APIs, automatic matching, OFX/CAMT/MT940 upload parsing, transfer fees, and multi-currency FX transfers are not implemented.
- Purchase receiving exists as a manual operational workflow; partial billing, supplier delivery documents, landed cost, and automatic inventory receipt are not implemented.
- Reports have CSV/PDF delivery, but accountant-reviewed filing definitions, scheduling, and email delivery remain missing.
- Inventory warehouse, stock ledger, adjustment approval, warehouse transfer controls, manual purchase receiving, manual sales stock issue, valuation settings, inventory clearing preview/matching groundwork, manual COGS posting, and operational reports exist, but automatic COGS, purchase receipt inventory asset posting, inventory clearing journals, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are not implemented.
- PDF rendering is operational only, not legal/template-complete.
- Generated document storage is database base64, not object storage.
- ZATCA is local/mock/scaffold only. No real CSID, signing, official SDK validation, clearance, reporting, or PDF/A-3 exists.
- Redis is present in local infra but workers/queues are not wired.
- Production deployment, monitoring, backups, subscription billing, email, WhatsApp, and storage integrations are not implemented.

## Top 10 Risks

1. ZATCA is not production compliant; real onboarding, signing, SDK validation, and API submission are missing.
2. Email-backed invites, invited-user onboarding, and password reset are still missing despite local role/member management.
3. No broad approval workflow, dual control, or maker-checker policy exists for high-risk accounting actions outside the new bank reconciliation approval path.
4. Bank reconciliation has local import preview, manual matching, categorization, approval, close/lock, and report export groundwork, but there is no live feed, automatic matching, OFX/CAMT/MT940 parser, file upload storage, or external bank integration.
5. Inventory warehouses, adjustment controls, transfers, manual receipts/issues, valuation settings, inventory clearing preview/matching groundwork, and manual COGS posting exist, but automatic COGS, purchase receipt inventory asset posting, GL valuation, clearing journals, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are still missing.
6. Generated PDFs are stored as base64 in the database, which is not scalable for production.
7. Production secrets/key custody is not hardened; ZATCA private key storage is explicitly dev-only.
8. Frontend has limited end-to-end browser testing and limited UX validation for all routes.
9. Supplier AP balance display reuses a generic Dr/Cr helper; supplier-specific payable wording should be reviewed to avoid user confusion.
10. Permission coverage must be kept current as new API routes and UI actions are added.

## Top 10 Next Priorities

1. Run a human QA pass through all sales, purchase, payment, refund, and PDF routes.
2. Add email-backed invite delivery, password reset/onboarding, and stronger audit views for role/member changes.
3. Add official VAT return work, accountant review for report definitions, and scheduled/email report delivery.
4. Add fiscal year close, retained earnings close, and controlled unlock/approval workflows.
5. Add partial PO receiving/billing design and purchase matching hardening.
6. Harden bank reconciliation with upload storage, import file-format samples/parsers, transfer fees, and multi-currency FX handling.
7. Finalize accountant-reviewed inventory clearing posting and explicit purchase receipt inventory asset posting workflows after reviewing the new matching visibility and manual COGS behavior.
8. Advance ZATCA official SDK validation, official XML mapping, signing, CSID, clearance/reporting, and PDF/A-3.
9. Move generated documents to object storage.
10. Prepare production deployment, monitoring, backups, secrets management, and security review.

## New Issues Found During Audit

- Supplier AP balances currently display through the shared `formatLedgerBalance` helper that labels positive balances as `Dr`. The underlying supplier ledger math is documented as credit-minus-debit, but the UI should later use supplier-specific payable labels to avoid confusing accountants.
- Prisma still warns that `package.json#prisma` seed configuration is deprecated and should move to Prisma config before Prisma 7.
- Windows PowerShell requires quoting paths containing `(app)` when running git or shell commands against frontend App Router paths.

## Audit Verification Commands

- `corepack pnpm install`: passed.
- `corepack pnpm db:generate`: passed.
- `corepack pnpm db:migrate`: passed.
- `corepack pnpm db:seed`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed.
- `corepack pnpm build`: passed.
- `corepack pnpm smoke:accounting`: passed against a temporary local API on `localhost:4000`.
