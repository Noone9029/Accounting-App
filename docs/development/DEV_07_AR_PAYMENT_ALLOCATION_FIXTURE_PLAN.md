# DEV-07 AR Payment Allocation Fixture Plan

## Purpose And Scope

DEV-07 Part 2 defines the exact local-only fixture shape for future Sales/AR customer payment allocation testing. This is planning/read-only work only.

No invoice, payment, allocation, unapplied allocation, refund, credit note, fixture, generated document, PDF/archive, email, ZATCA XML/signing/submission, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider setting, schema, or login/audit-writing browser mutation was performed.

## Local-Only Safety Boundary

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture use is local disposable data only.
- No production, beta/user-testing, deployed, shared, hosted database, or customer data target is allowed.
- Future mutations must refuse non-local database targets before any write-capable service use.
- Cleanup deletion remains unapproved and out of scope.
- The voided DEV-06 invoice `INVOICE-000001` is excluded from happy-path payment allocation.

## Current DEV-06 Final State Summary

- DEV-06 completed the invoice lifecycle slice for marker `DEV03-AR-20260524T130000`.
- `INVOICE-000001` is `VOIDED`; safe id prefix `6ebb2d71`; total `287.5000`; balance due `0.0000`.
- Original journal `JOURNAL_ENTRY-000001` is `REVERSED`.
- Reversal journal `JOURNAL_ENTRY-000002` is `POSTED` and balanced.
- SalesInvoice audit actions exist through `SALES_INVOICE_VOIDED`.
- One local `ZatcaInvoiceMetadata` row remains for the voided invoice.
- Generated documents, customer payments, customer refunds, credit notes, allocations, email, ZATCA signed drafts/submission logs, and cleanup deletion were last verified at `0`.

## Current Local Fixture Dependency Summary

Local live database inspection could not run in Part 2 because Docker Desktop's Linux engine was unavailable and `127.0.0.1:5432` / `127.0.0.1:6379` were not reachable. The `apps/api/.env` database target guard parsed the configured database host as `localhost:5432`, with no forbidden production/beta/shared-host pattern, but no read-only database query was executed.

Part 3 must re-run read-only fixture dependency checks before any mutation. It must verify:

- marker `DEV03-AR-20260524T130000` and family `ar`.
- fixture organization exists.
- fixture actor user and active membership exist.
- fixture customer `DEV03-AR-CUSTOMER-20260524T130000` exists, is active, and has customer type.
- fixture service item `DEV03-AR-SERVICE-20260524T130000` exists, is active, non-inventory service type, and points to the fixture revenue account and tax rate.
- account code `120` exists, is active, allows posting, and has type `ASSET`.
- account code `220` exists, is active, allows posting, and has type `LIABILITY`.
- fixture paid-through cash/bank asset account exists, is active, allows posting, and has a bank/cash profile.
- fixture revenue account exists, is active, allows posting, and has type `REVENUE`.
- fixture sales tax rate exists, is active, sales-scoped, and has rate `15.0000`.
- `INVOICE-000001` remains `VOIDED` and is not selected for the payment allocation happy path.
- customer payments, refunds, credit notes, payment allocations, unapplied payment allocations, generated documents, email records, ZATCA signed drafts, and ZATCA submission logs for the DEV-07 payment slice are still zero.

If any dependency differs, Part 3 must stop before mutation and document the blocker.

## Code Paths Inspected

Payment controller, service, DTOs, and accounting:

- `apps/api/src/customer-payments/customer-payment.controller.ts`
  - `POST /customer-payments`
  - `POST /customer-payments/:id/apply-unapplied`
  - `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`
  - `POST /customer-payments/:id/void`
  - receipt data/PDF/archive routes inspected as output boundaries only.
- `apps/api/src/customer-payments/customer-payment.service.ts`
  - `create`
  - `applyUnapplied`
  - `reverseUnappliedAllocation`
  - `void`
  - `findAndValidateInvoices`
  - `findPaidThroughAccount`
  - `findPostingAccountByCode`
  - `createReversalJournal`
- `apps/api/src/customer-payments/customer-payment-accounting.ts`
  - `buildCustomerPaymentJournalLines`
- `apps/api/src/customer-payments/dto/create-customer-payment.dto.ts`
- `apps/api/src/customer-payments/dto/customer-payment-allocation.dto.ts`
- `apps/api/src/customer-payments/dto/apply-unapplied-payment.dto.ts`
- `apps/api/src/customer-payments/dto/reverse-unapplied-payment-allocation.dto.ts`

Invoice, accounting, and blocker paths:

- `apps/api/src/sales-invoices/sales-invoice.controller.ts`
  - `POST /sales-invoices`
  - `POST /sales-invoices/:id/finalize`
  - `POST /sales-invoices/:id/void`
  - `GET /sales-invoices/open`
  - output routes inspected only as boundaries.
- `apps/api/src/sales-invoices/sales-invoice.service.ts`
  - `create`
  - `finalize`
  - `void`
  - `prepareInvoice`
  - `calculateTotals`
  - `validateLineAccounts`
  - `getTaxRatesById`
  - invoice void blockers for direct payments, unapplied payment allocations, and credit-note allocations.
- `apps/api/src/sales-invoices/sales-invoice-accounting.ts`
  - `buildSalesInvoiceJournalLines`

Shared guards, models, audit, fixture, and tests:

- `apps/api/src/fiscal-periods/fiscal-period-guard.service.ts`
- `apps/api/src/number-sequences/number-sequence.service.ts`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/src/audit-log/audit-log.service.ts`
- `apps/api/prisma/schema.prisma`
  - `SalesInvoiceStatus`
  - `CustomerPaymentStatus`
  - `SalesInvoice`
  - `CustomerPayment`
  - `CustomerPaymentAllocation`
  - `CustomerPaymentUnappliedAllocation`
  - `JournalEntry`
  - `AuditLog`
  - `NumberSequenceScope`
- `apps/api/scripts/dev04-fixture-runner.ts`
- `apps/api/scripts/dev04-fixture-runner.spec.ts`
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts`
- `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts`
- `apps/api/src/customer-refunds/customer-refund-rules.spec.ts`
- `apps/api/src/credit-notes/credit-note-rules.spec.ts`
- `packages/shared/src/permissions.ts`

## Fixture Strategy Decision

Decision: reuse the existing local `DEV03-AR-20260524T130000` fixture organization and dependencies, and create exactly one new DEV-07-specific finalized invoice in a later approved mutation part.

Rejected strategies:

- Reuse `INVOICE-000001`: rejected because it is `VOIDED`, while customer payment allocation requires `SalesInvoiceStatus.FINALIZED`.
- Create a new DEV-07 organization marker: rejected for this slice because the existing DEV03-AR fixture already contains the needed fake organization, customer, item, tax, AR `120`, VAT `220`, revenue, and paid-through asset dependencies; cleanup deletion is not approved.
- Create two new invoices: not needed for the happy path because the inspected `applyUnapplied` path allows applying unapplied payment credit to a finalized invoice for the same customer when it has enough `balanceDue`.

Chosen shape:

- One new finalized invoice under the existing marker.
- One future customer payment with a direct partial allocation to that same invoice.
- The payment amount will exceed the direct allocation, leaving an unapplied amount.
- A later approved step will apply that unapplied amount back to the same invoice's remaining balance.

This keeps the future mutation surface minimal while still testing direct allocation, unapplied payment state, and later unapplied allocation.

## Exact Future Fixture Labels

Use marker-safe labels in descriptions/notes, not as production-facing values:

- Slice label: `DEV07-AR-PAYALLOC-20260524T130000`.
- Planned invoice label: `DEV07-AR-PAYALLOC-INVOICE-20260524T130000`.
- Planned payment label: `DEV07-AR-PAYALLOC-PAYMENT-20260524T130000`.
- Planned unapplied allocation label: `DEV07-AR-PAYALLOC-UNAPPLIED-20260524T130000`.

Expected future invoice number if the invoice sequence remains at next number `2`:

- `INVOICE-000002`.

Part 3 should stop if the invoice sequence no longer makes the planned invoice number deterministic, unless a later approval explicitly accepts the new number.

## Exact Future Invoice, Payment, And Allocation Amounts

Planned invoice line:

- item: existing active fixture service item.
- quantity: `10.0000`.
- unit price: `100.0000`.
- discount rate: `0.0000`.
- tax rate: existing active fixture sales tax rate, expected `15.0000`.
- currency: `SAR`.

Expected invoice totals from inspected invoice calculation behavior:

- subtotal: `1000.0000`.
- discount total: `0.0000`.
- taxable total: `1000.0000`.
- tax total: `150.0000`.
- total: `1150.0000`.
- balance due after create: `1150.0000`.
- balance due after finalization: `1150.0000`.

Planned future payment creation:

- amount received: `500.0000`.
- direct allocation supplied during `CustomerPaymentService.create`: `300.0000`.
- expected unapplied amount after payment creation: `200.0000`.
- invoice balance after direct allocation: `850.0000`.

Planned later unapplied allocation:

- apply unapplied amount: `200.0000`.
- target: same new finalized DEV-07 invoice.
- expected invoice balance after unapplied allocation: `650.0000`.
- expected payment unapplied amount after unapplied allocation: `0.0000`.

Why the same invoice is sufficient:

- invoice total `1150.0000` is greater than payment amount `500.0000`.
- payment amount `500.0000` is greater than direct allocation `300.0000`.
- unapplied amount `200.0000` is positive.
- invoice balance after direct allocation `850.0000` is greater than the later unapplied allocation `200.0000`.

## Expected Invoice Lifecycle Impact

Part 3, after approval only, should create and finalize one new local-only invoice fixture.

Expected invoice state after Part 3:

- status: `FINALIZED`.
- total: `1150.0000`.
- balance due: `1150.0000`.
- `finalizedAt`: present.
- `journalEntryId`: present.
- `reversalJournalEntryId`: absent.
- line count: `1`.
- local `ZatcaInvoiceMetadata`: `1` for the new invoice with type `STANDARD_TAX_INVOICE`.
- generated documents/PDF/archive/email/ZATCA XML/signing/submission: `0`.

Number sequence expectations:

- `INVOICE` sequence advances by one on invoice create.
- `JOURNAL_ENTRY` sequence advances by one on invoice finalization.
- `PAYMENT` sequence does not advance in Part 3 because no payment is created.

## Expected Payment Lifecycle Impact

Future payment creation, after a separate approval, should call `CustomerPaymentService.create(...)` exactly once.

Expected payment state after payment creation:

- status: `POSTED`.
- amount received: `500.0000`.
- direct allocation count: `1`.
- direct allocation amount: `300.0000`.
- unapplied amount: `200.0000`.
- journal entry: present and `POSTED`.
- invoice balance due decreases from `1150.0000` to `850.0000`.

Number sequence expectations:

- `PAYMENT` sequence advances by one.
- `JOURNAL_ENTRY` sequence advances by one for the payment journal.
- `INVOICE` sequence does not advance during payment creation.

## Expected Allocation Lifecycle Impact

Future unapplied allocation, after a separate approval, should call `CustomerPaymentService.applyUnapplied(...)` exactly once.

Expected allocation state:

- creates one `CustomerPaymentUnappliedAllocation`.
- amount applied: `200.0000`.
- payment `unappliedAmount` decreases from `200.0000` to `0.0000`.
- invoice `balanceDue` decreases from `850.0000` to `650.0000`.
- no journal entry is created.
- payment status remains `POSTED`.
- invoice status remains `FINALIZED`.

Future reversal and payment void work should be planned separately. Active unapplied allocations block payment void until reversed.

## Expected Accounting And Journal Impact

Invoice finalization:

- posted journal status: `POSTED`.
- reference: new invoice number, expected `INVOICE-000002` if the invoice sequence remains unchanged.
- total debit: `1150.0000`.
- total credit: `1150.0000`.
- debit account code `120` AR: `1150.0000`.
- credit fixture revenue account: `1000.0000`.
- credit account code `220` VAT: `150.0000`.

Payment creation:

- posted journal status: `POSTED`.
- reference: new payment number.
- total debit: `500.0000`.
- total credit: `500.0000`.
- debit fixture paid-through asset/cash account: `500.0000`.
- credit account code `120` AR: `500.0000`.
- direct `CustomerPaymentAllocation`: `300.0000`.
- invoice balance decreases by only the direct allocation amount during payment creation.
- remaining `200.0000` is represented by `CustomerPayment.unappliedAmount`.

Unapplied allocation:

- no new journal.
- creates one matching record only.
- invoice balance decreases by `200.0000`.
- payment unapplied amount decreases by `200.0000`.

Future payment void:

- high-level only in this Part 2 plan.
- expected to reverse the full payment journal, mark original payment journal `REVERSED`, set payment status `VOIDED`, and restore direct-allocation invoice balance after active unapplied allocations are reversed.

## Expected Audit Impact

Expected future invoice fixture audit actions:

- `SALES_INVOICE_CREATED`.
- `SALES_INVOICE_FINALIZED`.

Expected future payment and allocation audit actions:

- payment create: `CUSTOMER_PAYMENT_CREATED`.
- unapplied allocation apply: raw action `APPLY_UNAPPLIED`.
- unapplied allocation reversal: raw action `REVERSE_UNAPPLIED_ALLOCATION`.
- payment void: `CUSTOMER_PAYMENT_VOIDED`.

Evidence docs must record safe action names and counts only. They must not include full audit payload bodies, session metadata, tokens, auth headers, IP headers, user-agent bodies, customer/vendor bodies, or real data.

## Expected Output, Email, And ZATCA Boundary

Expected allowed local metadata effect:

- invoice finalization creates local `ZatcaInvoiceMetadata` for the new invoice with `STANDARD_TAX_INVOICE`, matching existing invoice finalization behavior.

Expected non-effects for Part 3 and later payment/allocation parts:

- no receipt PDF generation.
- no invoice PDF generation.
- no generated document archive.
- no document body inspection.
- no email outbox record.
- no email provider event.
- no ZATCA XML generation.
- no ZATCA signing.
- no QR generation.
- no ZATCA clearance/reporting/submission.
- no ZATCA signed artifact draft.
- no payment metadata side channel.

Customer payment receipt routes exist and can archive generated receipt PDFs, but they must not be called in DEV-07 payment allocation mutation slices unless a later output-specific ticket explicitly approves them.

## Preflight Checks For Future Part 3 Mutation

Part 3 must stop before mutation unless all checks pass:

- `git status --short` confirms unrelated marketing and graphify files remain untouched.
- latest commit is the Part 2 plan commit or a newer handoff-documented commit.
- no DEV-06 or DEV-07 temporary mutation script is tracked or staged.
- Docker/local Postgres readiness is clear enough for a local-only mutation.
- database URL target parses as explicit localhost/local Docker and has no forbidden hosted/production/beta/shared pattern.
- marker is exactly `DEV03-AR-20260524T130000`.
- family is `ar`.
- fixture organization, actor user, and active membership are marker-scoped.
- reusable customer, service item, revenue account, tax rate, account `120`, account `220`, and paid-through asset/cash account exist and are active/posting where applicable.
- `INVOICE-000001` remains `VOIDED` and is excluded.
- planned new invoice number does not already exist.
- no DEV-07 payment-allocation invoice label already exists.
- no customer payments, refunds, credit notes, direct payment allocations, unapplied payment allocations, generated documents, email records, ZATCA signed drafts, or submission logs exist for the planned DEV-07 slice.
- invoice posting date passes fiscal-period guard.
- current invoice and journal sequences are recorded safely before mutation.

## Planned Part 3 Temporary Script Shape

Use one temporary local script under `apps/api/scripts`, for example:

`apps/api/scripts/dev07-ar-payalloc-invoice-fixture.temp.ts`

The script should:

- refuse non-local database targets before write-capable service use.
- accept only marker `DEV03-AR-20260524T130000`.
- accept only family `ar`.
- resolve only the marker-scoped fixture organization and actor user.
- resolve the marker-scoped active customer, service item, revenue account, tax rate, account `120`, account `220`, and paid-through asset account.
- verify `INVOICE-000001` remains `VOIDED` and is not selected.
- verify no planned DEV-07 invoice already exists.
- create exactly one draft invoice using `SalesInvoiceService.create(...)`.
- finalize exactly that invoice using `SalesInvoiceService.finalize(...)`.
- not create customer payments.
- not allocate payments.
- not apply or reverse unapplied allocations.
- not void invoices or payments.
- not create refunds or credit notes.
- not call receipt/PDF/generated-document/email/ZATCA XML/signing/submission/cleanup/migration/seed/reset/delete paths.
- print safe summaries only: planned label, invoice number, safe id prefix, invoice status, total, balance due, journal totals, audit action names, local ZATCA metadata count, and forbidden side-effect counts.
- remove the temporary script after execution.
- not stage the temporary script.
- not add root package scripts.

## Planned Part 4 Evidence Verification Checks

Part 4 should be read-only and verify:

- new DEV-07 invoice exists and has the expected safe label.
- expected invoice number is present, if deterministic.
- status is `FINALIZED`.
- total and balance due are `1150.0000`.
- line count is `1`.
- finalizedAt and journalEntryId are present.
- reversalJournalEntryId is absent.
- finalization journal is `POSTED`, balanced, and has Dr `120` AR `1150.0000`, Cr fixture revenue `1000.0000`, and Cr `220` VAT `150.0000`.
- local `ZatcaInvoiceMetadata` exists for the new invoice with type `STANDARD_TAX_INVOICE`.
- no customer payment, refund, credit note, direct payment allocation, unapplied payment allocation, generated document, email, ZATCA signed draft, or submission log was created by Part 3.
- invoice sequence and journal sequence advanced only as expected.
- temporary script is absent, unstaged, and untracked.

## Forbidden Actions

Until an explicit mutation approval is received:

- Do not create, edit, finalize, or void invoices.
- Do not create customer payments.
- Do not allocate customer payments.
- Do not apply or reverse unapplied allocations.
- Do not void customer payments.
- Do not create refunds, credit notes, or allocations.
- Do not create fixtures.
- Do not delete fixtures or run cleanup deletion.
- Do not generate, export, download, archive, or inspect PDF/document bodies.
- Do not send email.
- Do not run ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- Do not run migrations.
- Do not run seed/reset/delete.
- Do not deploy, provision, change environment variables, change provider settings, or change schema.
- Do not use production, beta, deployed, shared, or customer data.
- Do not run login/browser flows that write audit logs.

## Risks And Blockers

- Local DB inspection was blocked in Part 2 because Docker/local Postgres was unavailable; Part 3 must refresh dependencies before mutation.
- `CustomerPaymentService.create(...)` requires at least one direct allocation, so DEV-07 cannot test a fully unapplied payment through the current create path.
- The planned same-invoice unapplied application depends on the invoice remaining finalized, same-customer, and with balance due at least `200.0000`.
- Active unapplied allocations block customer payment void until reversed.
- Posted customer refunds block customer payment void until voided.
- Active non-voided payment allocations block invoice void.
- Fiscal-period locks can block invoice finalization, payment posting, and payment reversal.
- Customer payment receipt PDF/archive routes can write generated documents if called; they must stay out of scope.
- Cleanup deletion remains unapproved; local fixture data will remain as evidence.
- Unrelated dirty/untracked web marketing and graphify files remain outside DEV-07 and must not be staged.

## Exact Approval Phrase Required Before Part 3

```text
I approve DEV-07 Part 3 local-only AR payment-allocation invoice fixture mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

Do not treat this plan as approval. The approval phrase must be provided in the Part 3 prompt before any invoice fixture mutation.

## Commands Run

- `git status --short`
- `git log -1 --oneline`
- `git log -5 --oneline`
- `git ls-files apps/api/scripts | rg "dev0(6|7).*temp|invoice.*temp|payment.*temp|allocation.*temp"`
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`
- local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- local database URL guard against `apps/api/.env` without printing the URL.
- read-only code inspection with `rg`, `Get-Content`, and `Select-String` across the files listed above.

## Commands Skipped And Why

- Read-only fixture DB query: skipped because Docker Desktop Linux engine was unavailable and localhost database ports were closed.
- Invoice/payment/allocation/refund/credit-note mutations: forbidden in Part 2.
- Fixture creation and cleanup deletion: forbidden in Part 2.
- Receipt/invoice PDF, generated-document archive, export/download, email, and ZATCA XML/signing/submission commands: forbidden output/network-sensitive paths.
- E2E, smoke, migrations, seed/reset/delete, deploys, env changes, provider setting changes, and production-hosting research: outside the Part 2 planning scope.

## Conclusion

DEV-07 Part 2 is planned as a one-invoice happy path under the existing local DEV03-AR fixture marker. The future invoice should total `1150.0000`, the future payment should receive `500.0000`, the direct allocation should be `300.0000`, the payment should retain `200.0000` unapplied, and a later unapplied allocation should apply `200.0000` back to the same invoice, leaving invoice balance due `650.0000`.

Evidence status: planned from inspected code and prior DEV-06 docs, with live DB dependency inspection blocked by unavailable local Docker/Postgres.

## Part 3 Blocker Note

DEV-07 Part 3 received the exact approval phrase for the local-only invoice fixture mutation, but stopped before mutation because local Docker/Postgres was unavailable. Docker Desktop's Linux engine pipe was missing, `127.0.0.1:5432` and `127.0.0.1:6379` were closed, and read-only fixture dependency queries could not run.

The configured database target guard still parsed as local `localhost:5432` with no forbidden hosted, production, beta, or shared target pattern. No temporary mutation script was created, no invoice fixture was created or finalized, no customer payment/allocation occurred, and no forbidden output/email/ZATCA/cleanup path ran.

Part 3 evidence is recorded in [DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md). The next prompt is `DEV-07 Part 3B: retry AR payment allocation invoice fixture mutation preflight`.

## Part 3B Preflight Retry Blocker Note

DEV-07 Part 3B retried local readiness and read-only fixture dependency preflight only. It did not carry mutation approval forward and did not create/finalize the planned invoice fixture.

Docker/Postgres remained unavailable: Docker Desktop's Linux engine pipe was missing, `127.0.0.1:5432` and `127.0.0.1:6379` were closed, and fixture dependency queries could not run. The database target guard still parsed as local `localhost:5432` with no forbidden hosted, production, beta, shared, or customer-data target pattern.

Preflight remains blocked. No temporary mutation script was created, no invoice/payment/allocation mutation occurred, and no forbidden output/email/ZATCA/cleanup path ran. Part 3B evidence is appended in [DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 3C: retry AR payment allocation invoice fixture mutation preflight
```
