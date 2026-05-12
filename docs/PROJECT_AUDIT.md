# LedgerByte Project Audit

Audit date: 2026-05-12

Current commit audited: `dd498c7ab3a5e5108b93dcfa3cc43315cee610d7` (`Add purchases and supplier payments MVP`)

## Summary

LedgerByte is a TypeScript monorepo for a GCC/Saudi-oriented accounting SaaS. The current codebase has a working local MVP for core AR and AP transaction flows, document PDFs, generated-document archive, local smoke coverage, and non-production ZATCA groundwork.

Current maturity level: `MVP_ACCOUNTING_FOUNDATION`. The app can be demonstrated locally for sales invoices, customer payments, credit notes, customer refunds, purchase bills, supplier payments, ledgers, statements, and PDFs. It is not production-ready as a SaaS and is not production ZATCA compliant.

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

- Register/login and organization selection.
- Tenant-scoped CRUD foundations for accounts, branches, contacts, tax rates, items, and journals.
- Sales invoice draft/create/edit/finalize/void with AR journal posting.
- Customer payment posting with invoice allocation and balance updates.
- Unapplied customer payment application and reversal.
- Credit note creation/finalization/void, allocation to invoices, and allocation reversal.
- Manual customer refunds from unapplied customer payments or credit notes.
- Customer ledger and statement rows for AR events.
- Purchase bill draft/create/edit/finalize/void with AP journal posting.
- Supplier payment posting, allocation to bills, bill balance updates, and void restoration.
- Supplier ledger and statement rows for AP events.
- Sales invoice, credit note, customer payment, customer refund, customer statement, purchase bill, and supplier payment PDFs.
- Generated document archive for generated PDFs.
- Local-only ZATCA profile, EGS, CSR, mock CSID, XML/QR/hash, compliance checklist, reference maps, and SDK wrapper readiness/dry-run.
- Full `typecheck`, `test`, `build`, and smoke workflow passed after latest AP implementation.

## Groundwork Or Scaffold Only

- Role/permission data exists, but authorization is currently active-organization membership only.
- Fiscal periods exist in schema, but no period close/lock enforcement exists.
- Reports are not implemented beyond customer/supplier ledger and statements.
- Inventory tracking flags exist on items, but no warehouse, stock, COGS, or valuation engine exists.
- PDF rendering is operational only, not legal/template-complete.
- Generated document storage is database base64, not object storage.
- ZATCA is local/mock/scaffold only. No real CSID, signing, official SDK validation, clearance, reporting, or PDF/A-3 exists.
- Redis is present in local infra but workers/queues are not wired.
- Production deployment, monitoring, backups, subscription billing, email, WhatsApp, and storage integrations are not implemented.

## Top 10 Risks

1. ZATCA is not production compliant; real onboarding, signing, SDK validation, and API submission are missing.
2. Role permissions are stored but not enforced beyond org membership.
3. No fiscal-period locking; backdated edits/postings can affect prior accounting periods.
4. No formal financial reports such as trial balance, P&L, balance sheet, VAT return, or aging.
5. No bank reconciliation or bank statement import.
6. Inventory flags exist without stock movements, valuation, COGS, or warehouse controls.
7. Generated PDFs are stored as base64 in the database, which is not scalable for production.
8. Production secrets/key custody is not hardened; ZATCA private key storage is explicitly dev-only.
9. Frontend has limited end-to-end browser testing and limited UX validation for all routes.
10. Supplier AP balance display reuses a generic Dr/Cr helper; supplier-specific payable wording should be reviewed to avoid user confusion.

## Top 10 Next Priorities

1. Run a human QA pass through all sales, purchase, payment, refund, and PDF routes.
2. Enforce role/permission checks on API and UI navigation.
3. Add accounting reports: trial balance, general ledger, P&L, balance sheet, VAT return, AR/AP aging.
4. Add fiscal period lock/close behavior and posting-date guards.
5. Add debit notes and supplier credit workflows.
6. Add purchase orders and cash expenses.
7. Add bank accounts, bank statement import, and reconciliation.
8. Add inventory warehouses, stock movements, adjustments, valuation, and COGS.
9. Advance ZATCA official SDK validation, official XML mapping, signing, CSID, clearance/reporting, and PDF/A-3.
10. Move generated documents to object storage and prepare production deployment, monitoring, backups, and secrets management.

## New Issues Found During Audit

- Supplier AP balances currently display through the shared `formatLedgerBalance` helper that labels positive balances as `Dr`. The underlying supplier ledger math is documented as credit-minus-debit, but the UI should later use supplier-specific payable labels to avoid confusing accountants.
- Prisma still warns that `package.json#prisma` seed configuration is deprecated and should move to Prisma config before Prisma 7.
- Windows PowerShell requires quoting paths containing `(app)` when running git or shell commands against frontend App Router paths.

## Audit Verification Commands

- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed.
- `corepack pnpm build`: passed.
- `corepack pnpm smoke:accounting`: skipped because local API was not responding on `localhost:4000` during this audit.
