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
- `PATCH /sales-invoices/:id`
- `DELETE /sales-invoices/:id`
- `POST /sales-invoices/:id/finalize`
- `POST /sales-invoices/:id/void`

Customer payments:

- `GET /customer-payments`
- `POST /customer-payments`
- `GET /customer-payments/:id`
- `GET /customer-payments/:id/receipt-data`
- `POST /customer-payments/:id/void`
- `DELETE /customer-payments/:id`

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
- Voided invoices cannot be edited or finalized.

Posting behavior:

- Finalization posts one balanced journal entry inside a transaction.
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
- If `amountReceived` is greater than allocated amount, the difference is stored as `unappliedAmount`; applying unapplied credits later is future work.

Payment posting behavior:

- Payment creation posts one balanced journal entry inside a transaction.
- Debit the paid-through cash/bank asset account for `amountReceived`.
- Credit account code `120` Accounts Receivable for `amountReceived`.
- Payment creation creates immutable allocation rows and updates invoice balances.
- Voiding a posted payment creates or reuses one reversal journal entry, marks the payment `VOIDED`, and restores invoice balances.
- Voiding twice is idempotent and does not create repeated reversals.

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
- Statement PDF export is not implemented yet.

Receipt data:

- `GET /customer-payments/:id/receipt-data` returns structured receipt data for future PDF rendering.
- The response includes organization, customer, payment, paid-through account, journal entry, status, and invoice allocations.
- No receipt PDF is generated in this step.

## Current Package Boundaries

- `packages/accounting-core`: decimal-safe journal and invoice calculation rules
- `packages/zatca-core`: placeholder interfaces for future ZATCA Phase 2 integration
- `packages/pdf-core`: placeholder interfaces for server-side PDF generation
- `packages/shared`: shared tenant/API types
- `packages/ui`: small UI utility package placeholder

## Known Limitations

- ZATCA Phase 2 XML, QR, CSID, clearance, reporting, PDF/A-3, and hash-chain logic are not implemented yet.
- Payment receipt PDF rendering is not implemented yet.
- Applying unapplied overpayment credits to invoices later is not implemented yet.
- Sales invoice PDF rendering is not implemented yet.
- Credit notes are not implemented yet.
- Credit note ledger rows are reserved as a future hook, but credit notes are not implemented yet.
- Recurring invoices are not implemented yet.
- Bank reconciliation is not implemented yet.
- Inventory movement and stock valuation are not implemented yet.
- BullMQ workers and S3 upload adapters are not wired yet.
- Authorization is role-ready but currently only enforces active organization membership.
