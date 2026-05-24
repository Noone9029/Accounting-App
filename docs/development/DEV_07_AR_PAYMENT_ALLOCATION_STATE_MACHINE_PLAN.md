# DEV-07 AR Payment Allocation State-Machine Plan

## Purpose And Scope

DEV-07 plans the next local-only Sales/AR accounting-risk slice after DEV-06: customer payment creation, direct invoice allocation, unapplied payment application, unapplied allocation reversal, and customer payment void/reversal boundaries.

This Part 1 is planning/read-only only. It did not create payments, allocate payments, mutate invoices, create fixtures, delete fixtures, generate output, send email, run ZATCA actions, migrate, seed/reset/delete, deploy, change environment variables, change provider settings, change schema, or run login/browser audit-writing flows.

## Local-Only Safety Boundary

- Use local disposable fixture data only.
- Current reusable fixture marker: `DEV03-AR-20260524T130000`.
- Current reusable fixture family: `ar`.
- No production, beta/user-testing, deployed, shared, or customer data.
- Future mutations require explicit approval phrases and local target guards before any write-capable service use.
- Cleanup deletion remains unapproved and out of scope.

## Current DEV-06 Final State Summary

- DEV-06 completed the invoice lifecycle slice for `INVOICE-000001`.
- `INVOICE-000001` is `VOIDED`; safe id prefix `6ebb2d71`; total `287.5000`; balance due `0.0000`.
- Original journal `JOURNAL_ENTRY-000001` is `REVERSED`.
- Reversal journal `JOURNAL_ENTRY-000002` is `POSTED` and balanced.
- SalesInvoice audit actions exist through `SALES_INVOICE_VOIDED`.
- One local `ZatcaInvoiceMetadata` row remains for the voided invoice.
- Generated documents, customer payments, customer refunds, credit notes, allocations, email, ZATCA signed drafts/submission logs, and cleanup deletion remained `0`.

The DEV-06 invoice must not be used as the happy-path DEV-07 allocation target because customer payment allocation requires finalized, non-voided invoices. It can be used later only for a deliberate blocker test after a separate plan approves that scope.

## Code Paths Inspected

Backend payment and allocation paths:

- `apps/api/src/customer-payments/customer-payment.controller.ts`
  - `CustomerPaymentController`
  - `GET /customer-payments`
  - `POST /customer-payments`
  - `GET /customer-payments/:id`
  - `GET /customer-payments/:id/receipt-data`
  - `GET /customer-payments/:id/receipt-pdf-data`
  - `GET /customer-payments/:id/receipt.pdf`
  - `POST /customer-payments/:id/generate-receipt-pdf`
  - `GET /customer-payments/:id/unapplied-allocations`
  - `POST /customer-payments/:id/apply-unapplied`
  - `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`
  - `POST /customer-payments/:id/void`
  - `DELETE /customer-payments/:id`
- `apps/api/src/customer-payments/customer-payment.service.ts`
  - `create`
  - `applyUnapplied`
  - `reverseUnappliedAllocation`
  - `void`
  - `remove`
  - `receiptData`
  - `receiptPdfData`
  - `receiptPdf`
  - `generateReceiptPdf`
  - `findAndValidateInvoices`
  - `createReversalJournal`
- `apps/api/src/customer-payments/customer-payment-accounting.ts`
  - `buildCustomerPaymentJournalLines`
- `apps/api/src/customer-payments/dto/create-customer-payment.dto.ts`
- `apps/api/src/customer-payments/dto/customer-payment-allocation.dto.ts`
- `apps/api/src/customer-payments/dto/apply-unapplied-payment.dto.ts`
- `apps/api/src/customer-payments/dto/reverse-unapplied-payment-allocation.dto.ts`

Related blockers and downstream references:

- `apps/api/src/sales-invoices/sales-invoice.service.ts`
  - `void`
  - `paymentUnappliedAllocations`
  - `pdfData`
- `apps/api/src/sales-invoices/sales-invoice.controller.ts`
  - `GET /sales-invoices/open`
  - `GET /sales-invoices/:id/customer-payment-unapplied-allocations`
  - PDF routes inspected only as output boundary references.
- `apps/api/src/customer-refunds/customer-refund.service.ts`
  - `claimRefundSource`
  - `restoreRefundSource`
  - payment-source refund blockers for posted payments with unapplied amounts.
- `apps/api/src/customer-refunds/customer-refund-accounting.ts`
- `apps/api/src/audit-log/audit-events.ts`
  - `CUSTOMER_PAYMENT_CREATED`
  - `CUSTOMER_PAYMENT_VOIDED`
  - generic action fallback for unmapped allocation actions.
- `apps/api/src/audit-log/audit-log.service.ts`
  - `log`
  - metadata sanitization path.
- `apps/api/prisma/schema.prisma`
  - `CustomerPaymentStatus`
  - `SalesInvoiceStatus`
  - `CustomerPayment`
  - `CustomerPaymentAllocation`
  - `CustomerPaymentUnappliedAllocation`
  - `SalesInvoice`
  - `JournalEntry`
  - `AuditLog`
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts`
- `apps/api/src/customer-refunds/customer-refund-rules.spec.ts`
- `apps/api/src/credit-notes/credit-note-rules.spec.ts`
- `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts`

Frontend/API usage and smoke references were inspected as references only; no smoke, E2E, browser, or login flow was run:

- `apps/web/src/app/(app)/sales/customer-payments/new/page.tsx`
- `apps/web/src/app/(app)/sales/customer-payments/[id]/page.tsx`
- `apps/web/src/lib/customer-payments.ts`
- `packages/shared/src/permissions.ts`
- `apps/api/scripts/smoke-accounting-tail.ts`

## Payment Lifecycle Model

Payment statuses from `CustomerPaymentStatus`:

- `DRAFT`
- `POSTED`
- `VOIDED`

Current `CustomerPaymentService.create(...)` creates posted customer payments directly. Although the enum includes `DRAFT`, the normal create path posts immediately and writes `status: POSTED`, `postedAt`, `journalEntryId`, and allocation rows in one transaction.

Payment create route and guard:

- API route: `POST /customer-payments`.
- Controller method: `CustomerPaymentController.create`.
- Service method: `CustomerPaymentService.create`.
- Guards: `JwtAuthGuard`, `OrganizationContextGuard`, `PermissionGuard`.
- Permission: `PERMISSIONS.customerPayments.create`.

Payment create preconditions from inspected code:

- `customerId` belongs to the organization and is an active contact with type `CUSTOMER` or `BOTH`.
- `accountId` is an active posting `ASSET` account in the same organization.
- `paymentDate` passes `FiscalPeriodGuardService.assertPostingDateAllowed`.
- `amountReceived` is greater than zero.
- `allocations` is required and must contain at least one allocation.
- Each allocation amount is greater than zero.
- Total allocated amount must not exceed `amountReceived`.
- Each invoice appears only once in the payment create payload.
- Every allocated invoice must belong to the organization, belong to the same customer, have status `FINALIZED`, and have enough `balanceDue`.
- Account code `120` must exist as an active posting account for the AR credit line.
- Conditional invoice row updates must successfully claim the invoice balances before payment and journal records are created.

Payment creation effects:

- Creates one `CustomerPayment` with status `POSTED`.
- Creates one posted `JournalEntry`.
- Creates one or more `CustomerPaymentAllocation` rows for direct allocations supplied in the create payload.
- Decrements each allocated invoice `balanceDue` by the direct allocated amount.
- Sets `unappliedAmount = amountReceived - direct allocations`.
- Uses number sequence scope `PAYMENT` for `paymentNumber`.
- Uses number sequence scope `JOURNAL_ENTRY` for the payment journal.
- Writes audit action `CUSTOMER_PAYMENT_CREATED` through the `CustomerPayment:CREATE` audit mapping.

## Allocation Lifecycle Model

Direct allocations at payment creation:

- Stored in `CustomerPaymentAllocation`.
- Created inside `CustomerPaymentService.create`.
- Allocation rows do not have a reversal flag; payment void restores balances and marks the payment `VOIDED`.

Unapplied payment application:

- API route: `POST /customer-payments/:id/apply-unapplied`.
- Controller method: `CustomerPaymentController.applyUnapplied`.
- Service method: `CustomerPaymentService.applyUnapplied`.
- Permission: `PERMISSIONS.customerPayments.create`.
- Stored in `CustomerPaymentUnappliedAllocation`.

Unapplied application preconditions:

- Payment exists in the same organization.
- Payment status is `POSTED`.
- `amountApplied` is greater than zero.
- `amountApplied` does not exceed payment `unappliedAmount`.
- Invoice exists in the same organization.
- Invoice belongs to the same customer as the payment.
- Invoice status is `FINALIZED`.
- `amountApplied` does not exceed invoice `balanceDue`.
- Conditional payment and invoice row updates must claim the remaining unapplied amount and invoice balance.

Unapplied application effects:

- Decrements `CustomerPayment.unappliedAmount`.
- Decrements `SalesInvoice.balanceDue`.
- Creates one `CustomerPaymentUnappliedAllocation`.
- Does not create a journal entry because the original payment journal already posted `Dr Bank/Cash, Cr Accounts Receivable`.
- Writes audit action string `APPLY_UNAPPLIED`; this action is not mapped to a standardized `AUDIT_EVENTS` constant in `audit-events.ts`, so it remains the raw action string.

Unapplied allocation reversal:

- API route: `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`.
- Controller method: `CustomerPaymentController.reverseUnappliedAllocation`.
- Service method: `CustomerPaymentService.reverseUnappliedAllocation`.
- Permission: `PERMISSIONS.customerPayments.void`.

Unapplied reversal effects:

- Sets `CustomerPaymentUnappliedAllocation.reversedAt`.
- Sets `reversedById` and optional `reversalReason`.
- Increments `CustomerPayment.unappliedAmount` without exceeding `amountReceived`.
- Increments `SalesInvoice.balanceDue` without exceeding invoice `total`.
- Does not create a journal entry.
- Writes audit action string `REVERSE_UNAPPLIED_ALLOCATION`; this action is not mapped to a standardized `AUDIT_EVENTS` constant in `audit-events.ts`, so it remains the raw action string.

## Expected Accounting And Journal Impact

Customer payment creation posts accounting:

- Debit paid-through active posting asset account: full `amountReceived`.
- Credit account code `120` AR: full `amountReceived`.
- Journal status: `POSTED`.
- Journal reference: payment number.
- Journal description: `Customer payment {paymentNumber} - {customerName}`.

Direct allocation at payment creation does not create a separate allocation journal. It is part of the payment create transaction and changes invoice balance state.

Applying unapplied payment amounts does not create a journal entry. It is matching-only and only moves previously posted payment credit from unapplied to an invoice balance match.

Reversing an unapplied allocation does not create a journal entry. It restores matching state only.

Voiding a posted customer payment creates or reuses one posted reversal journal:

- Original payment journal lines are reversed by `createReversalLines`.
- Original payment journal status changes to `REVERSED`.
- Payment status changes to `VOIDED`.
- `voidReversalJournalEntryId` is set.
- Direct `CustomerPaymentAllocation` invoice balances are incremented, but only while the invoice remains `FINALIZED`.

## Expected Invoice Balance Impact

Payment creation with direct allocation:

- Decrements each target finalized invoice `balanceDue` by the direct allocated amount.
- A full direct allocation can reduce invoice `balanceDue` to `0.0000`.
- A partial direct allocation leaves invoice `balanceDue` above zero.

Unapplied payment application:

- Decrements target finalized invoice `balanceDue` by the applied unapplied amount.
- Does not change invoice total.
- Does not change invoice status.

Unapplied allocation reversal:

- Increments invoice `balanceDue` by the reversed amount, guarded so the balance does not exceed invoice total.
- Does not change invoice total.
- Does not change invoice status.

Payment void:

- Increments invoice `balanceDue` for direct `CustomerPaymentAllocation` rows only when the invoice is still `FINALIZED`.
- Does not restore balances for already-voided invoices.
- Active unapplied allocations must be reversed before payment void.

## Expected Audit Impact

Expected payment lifecycle audit actions:

- Payment create: `CUSTOMER_PAYMENT_CREATED`.
- Payment void: `CUSTOMER_PAYMENT_VOIDED`.
- Unapplied payment application: raw action `APPLY_UNAPPLIED`.
- Unapplied allocation reversal: raw action `REVERSE_UNAPPLIED_ALLOCATION`.

Audit payload bodies must not be copied into evidence docs. Future evidence should record counts, action names, entity types, and safe id prefixes only.

## Expected Output, Email, And ZATCA Behavior

Payment create, direct allocation, unapplied application, unapplied allocation reversal, and payment void do not call PDF/render/archive, generated-document, email, or ZATCA XML/signing/submission paths.

Customer payment output paths exist but must stay out of mutation slices unless separately approved:

- `GET /customer-payments/:id/receipt-data` returns receipt data.
- `GET /customer-payments/:id/receipt-pdf-data` returns PDF data payload.
- `GET /customer-payments/:id/receipt.pdf` renders a PDF and archives it through `GeneratedDocumentService.archivePdf`.
- `POST /customer-payments/:id/generate-receipt-pdf` also archives a generated payment receipt PDF.

DEV-07 mutation evidence should verify these remain zero unless a future output-specific ticket explicitly approves receipt PDF/archive behavior:

- generated documents.
- receipt PDFs.
- email outbox/provider events.
- ZATCA metadata for payment paths.
- ZATCA signed artifact drafts.
- ZATCA submission logs.

## Fixture Strategy Decision

Decision: reuse the existing local DEV03-AR fixture organization and dependencies, but create a new DEV-07-specific finalized invoice fixture in a later approved mutation part.

Rationale:

- The DEV-06 invoice is `VOIDED`, and payment allocation happy paths require `SalesInvoiceStatus.FINALIZED`.
- Reusing the DEV03-AR fixture organization avoids duplicating base fixture setup and keeps continuity with existing local fake customer, item, tax, cash/bank, AR `120`, and VAT `220` dependencies.
- A new invoice keeps the DEV-06 lifecycle evidence immutable and avoids mutating a terminal invoice.
- The fixture must be clearly labeled for DEV-07 using marker-safe descriptions/notes, for example `DEV07-AR-PAYALLOC-20260524T130000`, while still remaining under the known fixture marker/family unless Part 2 decides a separate marker is safer.
- Future fixture mutation should create/finalize one new invoice with enough balance due for partial direct payment allocation plus later unapplied application.
- The simplest future happy path can use one new finalized invoice: create a payment where `amountReceived` exceeds the initial allocation, leaving `unappliedAmount`, then apply that unapplied amount back to the same invoice's remaining balance. Part 2 should decide exact amounts after read-only preflight.

Rejected for happy path:

- Reusing `INVOICE-000001`, because it is `VOIDED`.
- Creating a brand-new organization marker immediately, because the current local fixture organization already has required AR dependencies and cleanup deletion is not approved.
- Changing service code, because inspected behavior already supports the needed local state-machine slice.

## Proposed Future DEV-07 Parts

1. Part 2: `DEV-07 Part 2: AR payment allocation fixture plan`
   - Planning/read-only only.
   - Define exact future invoice amount, payment amount, direct allocation amount, expected unapplied amount, account ids, sequence expectations, and blocker checks.
2. Part 3: approved local payment-allocation invoice fixture mutation.
   - Create and finalize the new local-only DEV-07 invoice fixture.
   - Do not create payments yet.
3. Part 4: verify payment-allocation fixture evidence.
   - Read-only verification that the new invoice is finalized, unvoided, has balance due, and has no payment/refund/credit-note/output side effects.
4. Part 5: customer payment creation mutation plan.
   - Plan one posted payment with a direct partial allocation that leaves unapplied amount.
5. Part 6: approved customer payment creation mutation.
   - Create exactly one local-only customer payment.
   - Expected journal: debit paid-through asset, credit `120` AR.
6. Part 7: verify payment creation evidence.
   - Verify payment, direct allocation, journal, invoice balance, audit, and no output/email/ZATCA side effects.
7. Part 8: payment allocation mutation plan.
   - Plan applying the remaining unapplied payment amount to a finalized invoice balance.
8. Part 9: approved payment allocation mutation.
   - Apply exactly one unapplied payment allocation.
   - Expected journal delta: none.
9. Part 10: verify payment allocation evidence.
   - Verify `CustomerPaymentUnappliedAllocation`, reduced `unappliedAmount`, reduced invoice `balanceDue`, audit action, and no journal/output/email/ZATCA side effects.
10. Part 11: payment void/reversal plan.
    - Plan reversal of active unapplied allocation if needed, then payment void/reversal boundaries.
11. Part 12+: final triage.
    - Summarize DEV-07 payment/allocation coverage and remaining AR gaps.

## Read-Only Preflight Checks For Future Mutation Parts

Future DEV-07 mutation parts should stop before mutation unless all applicable checks pass:

- Target is explicit local Docker/localhost and not production, beta/user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, shared, or customer data.
- Marker is `DEV03-AR-20260524T130000` unless Part 2 explicitly chooses a new marker.
- Fixture family is `ar`.
- Existing DEV-06 invoice `INVOICE-000001` remains `VOIDED` and is not used for happy-path allocation.
- Fixture organization and actor user are marker-scoped.
- Active customer contact exists and belongs to the fixture organization.
- Active posting paid-through `ASSET` account exists for customer payment receipt.
- Active posting account code `120` exists for AR.
- New DEV-07 invoice exists only after its approved fixture part, is `FINALIZED`, not `VOIDED`, has no `reversalJournalEntryId`, and has enough `balanceDue`.
- Payment amount, direct allocation amount, unapplied amount, and target invoice balance are positive and internally consistent.
- No existing customer payments, refunds, credit notes, payment allocations, unapplied payment allocations, generated documents, email records, ZATCA signed drafts/submission logs, or cleanup deletion exist for the DEV-07 payment slice before the relevant mutation.
- Posting date guard will allow payment creation and future payment void reversal dates.
- Invoice void blocker counts are understood before attempting any invoice void after payments.

## Exact Approval Phrases For Future Mutation Categories

Part 3 invoice fixture mutation approval phrase:

```text
I approve DEV-07 Part 3 local-only AR payment-allocation invoice fixture mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

Part 6 customer payment creation approval phrase:

```text
I approve DEV-07 Part 6 local-only AR customer payment creation mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

Part 9 unapplied payment allocation approval phrase:

```text
I approve DEV-07 Part 9 local-only AR unapplied customer payment allocation mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

Part 11 or later customer payment void/reversal approval phrase:

```text
I approve DEV-07 local-only AR customer payment void/reversal mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

Do not ask for approval in Part 1. The next thread is still planning-only.

## Forbidden Actions

Until an explicit mutation approval is received:

- Do not create, edit, finalize, or void invoices.
- Do not create customer payments.
- Do not allocate customer payments.
- Do not reverse unapplied allocations.
- Do not void customer payments.
- Do not create refunds, credit notes, or allocations.
- Do not generate, export, download, archive, or inspect PDF/document bodies.
- Do not send email.
- Do not run ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- Do not run migrations.
- Do not run seed/reset/delete.
- Do not run cleanup deletion.
- Do not deploy, provision, change environment variables, change Vercel/Supabase settings, or change schema.
- Do not use production, beta, deployed, shared, or customer data.
- Do not run login/browser flows that write audit logs.

## Risks And Blockers

- DEV-06 invoice is terminal and unsuitable for payment allocation happy paths.
- `CustomerPaymentService.create(...)` requires at least one allocation, so a fully unapplied initial payment is not supported by the current DTO/service path.
- Future unapplied handling must create an overpayment relative to the initial direct allocation, not a zero-allocation payment.
- Active unapplied allocations block payment void until reversed.
- Posted customer refunds block payment void until voided.
- Active non-voided payment allocations block invoice void.
- Future output/PDF receipt endpoints can archive generated documents and must stay outside payment mutation evidence unless explicitly approved.
- Fiscal-period locks can block payment posting and payment reversal.
- Cleanup deletion remains unapproved; fixture records will remain in the local database as evidence.
- Unrelated dirty/untracked web marketing and graphify files remain outside this workstream and must not be staged.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 2: AR payment allocation fixture plan
```

Part 2 should remain planning/read-only. It should inspect the current local fixture state, choose exact invoice/payment/allocation amounts, decide whether one or two new invoices are needed, and define the Part 3 local fixture mutation script shape before any new invoice fixture is created.
