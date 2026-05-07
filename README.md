# LedgerByte

LedgerByte accounting SaaS foundation with a Next.js frontend, NestJS API, Prisma/PostgreSQL persistence, Redis-ready queue infrastructure, and package boundaries for accounting, ZATCA, PDF, shared types, and UI.

This is an original implementation inspired by common accounting workflows. It does not copy Wafeq branding, proprietary text, logos, UI assets, or copyrighted material.

## Stack

- Monorepo: pnpm workspaces
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT bearer auth
- Queue target: BullMQ + Redis ready infrastructure
- File storage target: S3-compatible storage env placeholders
- Testing: Jest

## Setup

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Docker infrastructure:

```bash
docker compose -f infra/docker-compose.yml up
```

Useful commands:

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm smoke:accounting
pnpm db:migrate
pnpm db:seed
```

Seed login:

- Email: `admin@example.com`
- Password: `Password123!`
- Demo organization id: `00000000-0000-0000-0000-000000000001`

Tenant-scoped API calls require:

```http
Authorization: Bearer <token>
x-organization-id: <organizationId>
```

## Local Smoke Test

The accounting smoke test runs against the live API and creates clearly named `Smoke Test` records. It does not delete data.

1. Start local services:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

2. Apply database setup:

```bash
corepack pnpm db:migrate
corepack pnpm db:seed
```

3. Start the API and web apps:

```bash
corepack pnpm dev
```

4. In another terminal, run:

```bash
corepack pnpm smoke:accounting
```

Optional overrides:

```bash
LEDGERBYTE_API_URL=http://localhost:4000 corepack pnpm smoke:accounting
LEDGERBYTE_SMOKE_EMAIL=admin@example.com LEDGERBYTE_SMOKE_PASSWORD=Password123! corepack pnpm smoke:accounting
```

The smoke covers seed login, organization discovery, item/customer setup, draft invoice edit, invoice finalization idempotency, payment over-allocation rejection, partial and full payments, ledger/statement balances, receipt-data, PDF endpoint availability, payment void idempotency, and invoice void rejection while active payments exist.

The smoke also verifies document settings, PDF archive creation after invoice PDF generation, and generated document archive download.

On Windows, if `db:generate` fails with Prisma query engine `EPERM`, stop running API/dev Node processes and rerun it. This is usually a file lock on Prisma's generated client DLL.

## Implemented API

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Organizations:

- `POST /organizations`
- `GET /organizations`
- `GET /organizations/:id`

Accounts:

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`

Tax rates:

- `GET /tax-rates`
- `POST /tax-rates`
- `PATCH /tax-rates/:id`

Manual journals:

- `GET /journal-entries`
- `POST /journal-entries`
- `GET /journal-entries/:id`
- `PATCH /journal-entries/:id`
- `POST /journal-entries/:id/post`
- `POST /journal-entries/:id/reverse`

Contacts:

- `GET /contacts`
- `POST /contacts`
- `PATCH /contacts/:id`
- `GET /contacts/:id`
- `GET /contacts/:id/ledger`
- `GET /contacts/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /contacts/:id/statement-pdf-data?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /contacts/:id/statement.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /contacts/:id/generate-statement-pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`

Branches:

- `GET /branches`
- `POST /branches`
- `PATCH /branches/:id`

Items:

- `GET /items`
- `POST /items`
- `GET /items/:id`
- `PATCH /items/:id`
- `DELETE /items/:id`

Sales invoices:

- `GET /sales-invoices`
- `GET /sales-invoices/open?customerId=<id>`
- `POST /sales-invoices`
- `GET /sales-invoices/:id`
- `GET /sales-invoices/:id/pdf-data`
- `GET /sales-invoices/:id/pdf`
- `POST /sales-invoices/:id/generate-pdf`
- `PATCH /sales-invoices/:id`
- `DELETE /sales-invoices/:id`
- `POST /sales-invoices/:id/finalize`
- `POST /sales-invoices/:id/void`

Customer payments:

- `GET /customer-payments`
- `POST /customer-payments`
- `GET /customer-payments/:id`
- `GET /customer-payments/:id/receipt-data`
- `GET /customer-payments/:id/receipt-pdf-data`
- `GET /customer-payments/:id/receipt.pdf`
- `POST /customer-payments/:id/generate-receipt-pdf`
- `POST /customer-payments/:id/void`
- `DELETE /customer-payments/:id`

Organization document settings:

- `GET /organization-document-settings`
- `PATCH /organization-document-settings`

Generated documents:

- `GET /generated-documents`
- `GET /generated-documents/:id`
- `GET /generated-documents/:id/download`

Audit logs:

- `GET /audit-logs`

## Accounting Rules

- Every tenant business record is scoped by `organizationId`.
- Tenant endpoints validate active organization membership through `x-organization-id`.
- Journal entries are `DRAFT`, `POSTED`, `VOIDED`, or `REVERSED`.
- Posted entries cannot be edited.
- Journal entries must balance using decimal-safe values.
- Reversal creates a new posted opposite journal entry and marks the original as reversed.
- Draft-only void behavior is reserved for a future endpoint.
- Mutating services create audit log records.
- Controllers stay thin; accounting rules live in service/domain layers.

## Sales Invoice Rules

Invoice line amounts are calculated server-side:

- `lineGrossAmount = quantity * unitPrice`
- `discountAmount = lineGrossAmount * discountRate / 100`
- `taxableAmount = lineGrossAmount - discountAmount`
- `taxAmount = taxableAmount * taxRate / 100`
- `lineTotal = taxableAmount + taxAmount`

Invoice totals:

- `subtotal = sum(lineGrossAmount)`
- `discountTotal = sum(discountAmount)`
- `taxableTotal = subtotal - discountTotal`
- `taxTotal = sum(taxAmount)`
- `total = taxableTotal + taxTotal`
- `balanceDue = total - posted payment allocations`

Lifecycle behavior:

- Draft invoices can be edited, deleted, finalized, or voided.
- Finalized invoices cannot be edited or deleted.
- Finalizing twice is idempotent and does not create a second journal entry.
- Voiding a draft marks it `VOIDED`.
- Voiding a finalized invoice creates or reuses one reversal journal entry and marks the invoice `VOIDED`.
- Finalized invoices with active non-voided payment allocations cannot be voided. Void the payments first.
- Voided invoices cannot be edited or finalized.

Posting behavior:

- Finalization posts one balanced journal entry inside a transaction.
- Finalization claims the draft invoice row before journal creation, so repeated or concurrent finalize calls do not double-post.
- Debit account code `120` Accounts Receivable for invoice total.
- Credit revenue accounts grouped by invoice line revenue account using taxable amounts.
- Credit account code `220` VAT Payable only when `taxTotal > 0`.
- The invoice stores the linked `journalEntryId`; voided finalized invoices store `reversalJournalEntryId`.

## Customer Payment Rules

Customer payments are posted immediately in this MVP.

Allocation behavior:

- A payment must reference an active customer contact in the same organization.
- The paid-through account must be an active posting asset account in the same organization.
- Allocation invoices must be finalized, non-voided, open invoices for the same customer.
- Allocation amounts must be greater than zero and cannot exceed invoice `balanceDue`.
- Total allocated amount cannot exceed `amountReceived`.
- Partial payments are supported; invoice `balanceDue` is reduced by allocated amount.
- Allocation writes use conditional invoice balance updates to prevent concurrent payments from making `balanceDue` negative.
- If `amountReceived` is greater than allocated amount, the difference is stored as `unappliedAmount`; applying unapplied credits later is future work.

Payment posting behavior:

- Payment creation posts one balanced journal entry inside a transaction.
- Debit the paid-through cash/bank asset account for `amountReceived`.
- Credit account code `120` Accounts Receivable for `amountReceived`.
- Payment creation creates immutable allocation rows and updates invoice balances.
- Voiding a posted payment creates or reuses one reversal journal entry, marks the payment `VOIDED`, and restores invoice balances.
- Payment voiding claims the posted payment row before restoring balances, so repeated or concurrent void calls restore each invoice balance only once.
- Voiding twice is idempotent and does not create repeated reversals.

Concurrency/idempotency notes:

- Invoice finalization, invoice voiding, customer payment creation, and payment voiding are protected with database transactions plus conditional row updates.
- Manual journal reversal handles duplicate reversal attempts with a clear business error instead of leaking a database unique-constraint error.
- A failed journal creation or allocation claim rolls back the surrounding accounting workflow.

## Customer Ledger Rules

Customer ledgers are available for contacts of type `CUSTOMER` or `BOTH`.

- `GET /contacts/:id/ledger` returns contact summary, opening balance, closing balance, and chronological ledger rows.
- Opening balance is `0.0000` for the full ledger foundation.
- Invoice rows increase accounts receivable with a debit equal to invoice total.
- Payment rows decrease accounts receivable with a credit equal to payment `amountReceived`.
- Payment allocation rows are visible as zero-value informational rows to avoid double-counting.
- Voided payment rows reverse the visible payment effect with a debit equal to payment `amountReceived`.
- Voided invoice rows reverse the visible invoice effect with a credit equal to invoice total.
- Running balance is decimal-safe and reflects finalized non-voided invoices minus non-voided posted payments.
- Unapplied payment amounts are included in row metadata because payment creation currently credits AR for full `amountReceived`.

Customer statements:

- `GET /contacts/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD` reuses ledger rows with period filtering.
- `openingBalance` is calculated from ledger activity before `from`.
- `closingBalance` is calculated at the end of the filtered period.
- `GET /contacts/:id/statement-pdf-data?from=YYYY-MM-DD&to=YYYY-MM-DD` returns structured statement data for templates.
- `GET /contacts/:id/statement.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD` returns a basic server-rendered statement PDF.

Receipt data:

- `GET /customer-payments/:id/receipt-data` returns structured receipt data for future PDF rendering.
- The response includes organization, customer, payment, paid-through account, journal entry, status, and invoice allocations.
- `GET /customer-payments/:id/receipt-pdf-data` returns the receipt PDF data contract.
- `GET /customer-payments/:id/receipt.pdf` returns a basic server-rendered receipt PDF.

## PDF Groundwork

`packages/pdf-core` contains shared TypeScript data contracts and simple server-side PDF renderers using PDFKit.

Implemented PDF documents:

- Sales invoice PDF: `GET /sales-invoices/:id/pdf`
- Customer payment receipt PDF: `GET /customer-payments/:id/receipt.pdf`
- Customer statement PDF: `GET /contacts/:id/statement.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`

PDF endpoints:

- Require JWT auth and `x-organization-id`.
- Are tenant-scoped and return `404` outside the active organization.
- Return `Content-Type: application/pdf`.
- Use attachment filenames such as `invoice-INV-000001.pdf`, `receipt-PAY-000001.pdf`, and `statement-Customer.pdf`.
- Apply organization document settings for document titles, footer text, basic colors, tax number visibility, and invoice notes/terms/payment sections.
- Archive each generated PDF as a `GeneratedDocument` record with content hash, size, filename, source reference, and local base64 content.

These PDFs are operational documents only. They are not ZATCA compliant yet, do not embed XML, do not include QR codes, and are not PDF/A-3.

## Document Settings And Archive

Each organization has document settings that can be read or updated through `GET /organization-document-settings` and `PATCH /organization-document-settings`.

Supported settings:

- invoice, receipt, and statement titles
- footer text
- optional primary and accent hex colors
- tax number, payment summary, notes, and terms visibility flags
- default template names: `standard`, `compact`, or `detailed`

Only the `standard` renderer is implemented today. `compact` and `detailed` are saved for future template work and currently fall back to the standard layout.

Generated PDF downloads are archived automatically in the database through `GeneratedDocument`. Archive list/detail endpoints exclude the base64 payload; `/generated-documents/:id/download` streams the archived PDF. Local base64 storage is intentionally temporary and should move to S3-compatible storage before production scale.

## Current Package Boundaries

- `packages/accounting-core`: decimal-safe journal and invoice calculation rules
- `packages/zatca-core`: placeholder interfaces for future ZATCA Phase 2 integration
- `packages/pdf-core`: shared PDF data contracts and basic server-side renderers
- `packages/shared`: shared tenant/API types
- `packages/ui`: small UI utility package placeholder

## Known Limitations

- ZATCA Phase 2 XML, QR, CSID, clearance, reporting, PDF/A-3, and hash-chain logic are not implemented yet.
- PDF output is basic operational rendering only; no ZATCA XML, QR code, PDF/A-3, or template designer exists yet.
- Generated PDFs are stored as base64 database records for local/dev groundwork; S3-compatible storage is planned before production scale.
- GET PDF endpoints currently archive every download.
- Applying unapplied overpayment credits to invoices later is not implemented yet.
- Credit notes are not implemented yet.
- Credit note ledger rows are reserved as a future hook, but credit notes are not implemented yet.
- Recurring invoices are not implemented yet.
- Bank reconciliation is not implemented yet.
- Inventory movement and stock valuation are not implemented yet.
- BullMQ workers and S3 upload adapters are not wired yet.
- Authorization is role-ready but currently only enforces active organization membership.
