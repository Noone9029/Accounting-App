# Codebase Map

Audit date: 2026-05-12

## Root

- `package.json`: root pnpm scripts for dev, build, test, typecheck, smoke, and Prisma commands.
- `pnpm-workspace.yaml`: workspace package definitions.
- `README.md`: setup, API overview, accounting rules, ZATCA notes, and known limitations.
- `BUG_AUDIT.md`: chronological bug/risk notes and remaining risks.
- `docs/`: project audit docs and ZATCA implementation maps.
- `infra/`: local Docker Compose for Postgres, Redis, API, and web.
- `reference/`: local ZATCA/FATOORA docs and Java SDK files used for future reference only.

## Backend: `apps/api`

- `prisma/schema.prisma`: all data models, enums, relations, and indexes.
- `prisma/migrations`: migration history from foundation through purchases/AP.
- `prisma/seed.ts`: demo user, organization, system accounts, branches, tax rates, document settings, ZATCA profile.
- `scripts/smoke-accounting.ts`: live API smoke workflow.
- `src/app.module.ts`: imports all Nest modules.
- `src/main.ts`: API bootstrap and global validation behavior.

Major modules:

- `auth`: registration, login, JWT guard, active organization context.
- `organizations`: organization creation/list/detail.
- `branches`: branch CRUD.
- `contacts`: contacts plus customer/supplier ledger and statements.
- `chart-of-accounts`: account CRUD and account deletion guards.
- `tax-rates`: tax rate CRUD and validations.
- `items`: product/service records.
- `accounting`: manual journal entry create/edit/post/reverse.
- `sales-invoices`: sales invoice lifecycle, AR posting, PDFs, linked credit/payment allocation views.
- `customer-payments`: customer payment posting, allocation, unapplied application/reversal, receipts.
- `credit-notes`: credit note lifecycle, posting, allocation/reversal, PDFs.
- `customer-refunds`: manual refund posting/voiding and PDFs.
- `purchase-orders`: non-posting supplier PO lifecycle, PDFs, and conversion to draft bills.
- `purchase-bills`: supplier bill lifecycle, source PO link, AP posting, PDFs.
- `supplier-payments`: supplier payment posting, allocation, voiding, receipt PDFs.
- `document-settings`: PDF document settings.
- `generated-documents`: generated PDF archive and download.
- `audit-log`: audit log listing.
- `number-sequences`: sequence generation service.
- `zatca`: profile, EGS, local XML/QR/hash, mock CSID, safe adapters, logs.
- `zatca-sdk`: local SDK readiness and dry-run wrapper.
- `health`: unauthenticated health check.

## Frontend: `apps/web`

- `src/app/(auth)`: login/register routes.
- `src/app/(app)`: authenticated application shell and business pages.
- `src/components/app-shell`: sidebar, topbar, organization switcher.
- `src/components/forms`: reusable forms for auth, journals, invoices, credit notes, purchase bills, organization setup.
- `src/components/common`: status messages.
- `src/hooks/use-active-organization.ts`: active organization selection helper.
- `src/lib/api.ts`: authenticated API request helper.
- `src/lib/types.ts`: frontend TypeScript contracts matching API payloads.
- `src/lib/money.ts`: decimal display and preview helpers.
- `src/lib/pdf-download.ts`: authenticated PDF download helpers.
- `src/lib/zatca.ts`, `credit-notes.ts`, `customer-payments.ts`, `customer-refunds.ts`, `document-settings.ts`, `ledger-display.ts`: UI helper modules and tests.

Major route groups:

- General: dashboard, accounts, tax rates, branches, contacts, documents, settings.
- Sales: invoices, customer payments, customer refunds, credit notes.
- Purchases: bills and supplier payments.
- ZATCA: settings/readiness/checklists/SDK readiness inside `/settings/zatca`.

## Packages

- `packages/accounting-core`: shared decimal-safe journal and invoice calculation primitives.
- `packages/pdf-core`: shared PDF data contracts and PDFKit renderers for invoice, receipt, statement, refund, credit note, purchase bill, and supplier payment receipt documents.
- `packages/zatca-core`: local-only ZATCA XML/QR/hash/CSR/checklist/mapping helpers and local fixtures.
- `packages/shared`: shared tenant/API type placeholders.
- `packages/ui`: small UI utility placeholder.

## Where Core Logic Lives

- Accounting calculations: `packages/accounting-core/src/index.ts`, plus workflow-specific services in `apps/api/src/*`.
- AR posting: `apps/api/src/sales-invoices/sales-invoice-accounting.ts`, `customer-payments/customer-payment-accounting.ts`, `credit-notes/credit-note-accounting.ts`, `customer-refunds/customer-refund-accounting.ts`.
- AP posting: `apps/api/src/purchase-bills/purchase-bill-accounting.ts`, `supplier-payments/supplier-payment-accounting.ts`.
- Ledger behavior: `apps/api/src/contacts/contact-ledger.service.ts`.
- PDF contracts/rendering: `packages/pdf-core/src/index.ts`; archive creation inside API services.
- ZATCA local behavior: `packages/zatca-core`, `apps/api/src/zatca`, `apps/api/src/zatca-sdk`.
- Smoke tests: `apps/api/scripts/smoke-accounting.ts`.
- Unit tests: `apps/api/src/**/*.spec.ts`, `apps/web/src/lib/*.test.ts`, `packages/zatca-core/test/*.test.ts`.

## Documentation Locations

- Project-level audit docs: `docs/*.md`.
- ZATCA engineering maps/checklists: `docs/zatca/*.md`.
- Current status and known limitations: `README.md`, `BUG_AUDIT.md`.
- Local infra notes: `infra/README.md`.
