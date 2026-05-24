# DEV-07 AR Customer Payment Creation Mutation Plan

## Purpose And Scope

Plan the next local-only DEV-07 Sales/AR mutation: creating exactly one posted customer payment against the finalized payment-allocation invoice fixture.

This document is planning/read-only evidence only. Part 5 did not create customer payments, payment allocations, unapplied allocations, refunds, credit notes, invoices, generated documents, email, ZATCA XML/signing/submission artifacts, cleanup deletion, migrations, seed/reset/delete, deployments, environment changes, provider changes, schema changes, or login/browser audit-writing flows.

## Local-Only Safety Boundary

- Fixture marker: `DEV03-AR-20260524T130000`.
- Fixture family: `ar`.
- Target invoice for the future mutation: `INVOICE-000002`.
- DEV-06 invoice `INVOICE-000001` is `VOIDED` and remains excluded from the happy-path payment allocation workstream.
- Database target guard parsed the API database target as local `localhost:5432`.
- The target did not match forbidden production, beta, user-testing, hosted, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, shared, or customer-data patterns.

## Current Invoice Fixture Evidence Summary

Read-only local checks confirmed the fixture baseline for the future Part 6 payment creation mutation:

- Fixture organization: `DEV03-AR-ORG-20260524T130000`.
- Active actor membership: `1`.
- Customer: `DEV03-AR-CUSTOMER-20260524T130000`, type `CUSTOMER`, active.
- Paid-through asset account: `D3AR-60524T130000-CASH` / `DEV03-AR-ACCT-CASH-20260524T130000`, type `ASSET`, active, posting allowed, active bank/cash profile.
- Accounts receivable account: code `120`, type `ASSET`, active, posting allowed.
- Invoice `INVOICE-000002`: safe id prefix `ddadfdd7`, status `FINALIZED`, total `1150.0000`, balance due `1150.0000`, no reversal journal.
- DEV-07 invoice count: exactly one `DEV07-AR-PAYALLOC` invoice, `INVOICE-000002`.
- DEV-06 invoice `INVOICE-000001`: safe id prefix `6ebb2d71`, status `VOIDED`, total `287.5000`, balance due `0.0000`.
- Customer payments, direct payment allocations, unapplied payment allocations, refunds, credit notes, generated documents, email records, ZATCA signed drafts, and ZATCA submission logs remained `0`.
- Fiscal period count for the fixture organization was `0`, so the current local posting-date guard would allow payment posting.
- Number sequences before the future payment mutation: `INVOICE` next `3`, `JOURNAL_ENTRY` next `4`, no existing `PAYMENT` sequence.

Because no `PAYMENT` number sequence exists yet, `NumberSequenceService.next(...)` will upsert it on the first customer payment creation. Based on the inspected service code, the first issued customer payment number is expected to be `PAYMENT-000001`, with sequence prefix `PAYMENT-`, padding `6`, and stored next number `2` afterward.

## Code Paths Inspected

- `apps/api/src/customer-payments/customer-payment.controller.ts`
  - `CustomerPaymentController.create(...)`.
  - `POST /customer-payments`.
  - class guards: `JwtAuthGuard`, `OrganizationContextGuard`, `PermissionGuard`.
  - create permission: `PERMISSIONS.customerPayments.create`.
  - receipt/output routes inspected as boundary references only.
- `apps/api/src/customer-payments/customer-payment.service.ts`
  - `CustomerPaymentService.create(...)`.
  - `applyUnapplied(...)`.
  - `reverseUnappliedAllocation(...)`.
  - `void(...)`.
  - `findCustomer(...)`.
  - `findPaidThroughAccount(...)`.
  - `findAndValidateInvoices(...)`.
  - `findPostingAccountByCode(...)`.
  - receipt/PDF methods inspected as output boundary references only.
- `apps/api/src/customer-payments/customer-payment-accounting.ts`
  - `buildCustomerPaymentJournalLines(...)`.
- `apps/api/src/customer-payments/dto/create-customer-payment.dto.ts`.
- `apps/api/src/customer-payments/dto/customer-payment-allocation.dto.ts`.
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts`.
- `apps/api/src/sales-invoices/sales-invoice.service.ts`
  - invoice balance and void-blocker behavior for active payment allocations.
- `apps/api/src/audit-log/audit-events.ts`.
- `apps/api/src/audit-log/audit-log.service.ts`.
- `apps/api/prisma/schema.prisma`
  - `CustomerPayment`, `CustomerPaymentAllocation`, `CustomerPaymentUnappliedAllocation`, `SalesInvoice`, `JournalEntry`, `AuditLog`, `NumberSequence`.

## Payment Creation Route, Service, And DTO

Normal API route:

- `POST /customer-payments`.
- Controller method: `CustomerPaymentController.create(...)`.
- Service method: `CustomerPaymentService.create(organizationId, actorUserId, dto)`.

Normal API guards and permissions:

- `JwtAuthGuard`.
- `OrganizationContextGuard`.
- `PermissionGuard`.
- `PERMISSIONS.customerPayments.create`.

Required DTO shape:

- `customerId`: UUID.
- `paymentDate`: ISO date string.
- `amountReceived`: decimal with up to four decimal places.
- `accountId`: UUID for the paid-through asset account.
- `allocations`: non-empty array.
- Allocation object:
  - `invoiceId`: UUID.
  - `amountApplied`: decimal with up to four decimal places.

Optional DTO fields:

- `currency`: three-character code; service defaults to `SAR`.
- `description`: free-form string. The DTO has no separate payment method or external reference field, so Part 6 should use a safe DEV-07 description label only.

## Payment Creation Preconditions

Part 6 should stop before mutation unless all of these are true:

- Docker Desktop/Linux engine is available.
- Local Postgres is healthy and `127.0.0.1:5432` is reachable.
- Redis is healthy/reachable if the planned script path requires app services that touch Redis.
- API database target guard accepts only local `localhost`/`127.0.0.1`/local Docker and rejects production, beta, user-testing, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or customer-data targets.
- Marker is exactly `DEV03-AR-20260524T130000`.
- Family is `ar`.
- Fixture organization exists.
- Actor user and active membership exist.
- Customer `DEV03-AR-CUSTOMER-20260524T130000` exists, is active, and has type `CUSTOMER` or `BOTH`.
- `INVOICE-000002` exists, safe id prefix starts with `ddadfdd7`, belongs to the fixture organization/customer, is `FINALIZED`, has total `1150.0000`, balance due `1150.0000`, and has no reversal journal.
- `INVOICE-000001` remains `VOIDED` and is not used.
- Paid-through account `D3AR-60524T130000-CASH` / `DEV03-AR-ACCT-CASH-20260524T130000` exists, is active, posting allowed, type `ASSET`, and has an active bank/cash profile.
- Account code `120` exists, active, posting allowed, type `ASSET`.
- No DEV-07 customer payment exists yet.
- Customer payments, payment allocations, unapplied payment allocations, refunds, credit notes, generated documents, email records, ZATCA signed drafts, and ZATCA submission logs remain at the Part 5 baseline.
- Posting-date guard allows the selected payment date.
- Total direct allocation amount is greater than zero and not greater than `amountReceived`.
- The direct allocation amount does not exceed invoice balance due.
- Each invoice appears at most once in the `allocations` array.

## Exact Planned Part 6 Payment Payload

Part 6 should create exactly one customer payment:

- Customer: `DEV03-AR-CUSTOMER-20260524T130000`.
- Target invoice: `INVOICE-000002`.
- Paid-through account: fixture paid-through cash/asset account `D3AR-60524T130000-CASH` / `DEV03-AR-ACCT-CASH-20260524T130000`.
- Currency: `SAR`.
- Payment date: current local date at mutation time, only after posting-date guard passes.
- Amount received: `500.0000`.
- Direct allocation during payment creation: `300.0000` to `INVOICE-000002`.
- Expected unapplied amount after creation: `200.0000`.
- Description: `DEV07-AR-PAYALLOC-PAYMENT-20260524T130000`.

Part 6 must not apply the remaining unapplied amount. The same-invoice unapplied allocation of `200.0000` is a later DEV-07 part.

## Expected Payment State

Expected immediately after the Part 6 payment creation mutation:

- One `CustomerPayment` exists for the DEV-07 slice.
- Expected first payment number: `PAYMENT-000001`, because the `PAYMENT` number sequence is currently absent and `NumberSequenceService.next(...)` upserts the default prefix `PAYMENT-`.
- Status: `POSTED`.
- `amountReceived`: `500.0000`.
- `unappliedAmount`: `200.0000`.
- `journalEntryId`: present.
- `voidReversalJournalEntryId`: absent.
- `postedAt`: present.
- Direct `CustomerPaymentAllocation` rows: `1`.
- Direct allocated amount: `300.0000` to `INVOICE-000002`.
- `CustomerPaymentUnappliedAllocation` rows: `0`.

## Expected Invoice Balance Impact

- Before payment creation: `INVOICE-000002` balance due `1150.0000`.
- Direct allocation during payment creation: `300.0000`.
- After payment creation: `INVOICE-000002` balance due `850.0000`.
- Later future unapplied allocation, not in Part 6: `200.0000`.
- Later planned final balance after both allocations: `650.0000`.

## Expected Journal And Accounting Impact

`CustomerPaymentService.create(...)` posts the payment immediately and uses `buildCustomerPaymentJournalLines(...)`.

Expected payment journal:

- One new `JournalEntry`.
- Expected journal number: `JOURNAL_ENTRY-000004`.
- Status: `POSTED`.
- Reference: expected payment number `PAYMENT-000001`.
- Description: `Customer payment PAYMENT-000001 - <fixture customer name>`.
- Total debit: `500.0000`.
- Total credit: `500.0000`.
- Balanced: yes.
- Lines:
  - Dr paid-through cash/asset account `D3AR-60524T130000-CASH`: `500.0000`.
  - Cr account `120` AR: `500.0000`.

No journal is expected for the direct allocation row itself beyond the payment journal, because the payment journal posts the full `amountReceived`.

## Expected Audit Impact

Expected audit result:

- One customer-payment audit event for the created payment.
- Service raw action: `CREATE`.
- Mapped audit action: `CUSTOMER_PAYMENT_CREATED`.
- Entity type: `CustomerPayment`.
- No login/auth audit-writing browser flow.
- No `APPLY_UNAPPLIED` audit action in Part 6.
- No `REVERSE_UNAPPLIED_ALLOCATION` audit action in Part 6.
- No `CUSTOMER_PAYMENT_VOIDED` audit action in Part 6.
- Full audit payload bodies, session metadata, tokens, auth headers, IP headers, and user-agent bodies must not be printed or recorded.

## Expected Output, Email, And ZATCA Non-Effects

Payment creation does not call the receipt/PDF/archive controller routes or service methods. Receipt generation/archive is only reachable through separate receipt routes such as `GET /customer-payments/:id/receipt.pdf` and `POST /customer-payments/:id/generate-receipt-pdf`, which remain forbidden for Part 6.

Expected non-effects:

- No `CustomerPaymentUnappliedAllocation` row yet.
- No generated document.
- No receipt PDF/archive.
- No export/download.
- No email outbox record.
- No email provider event.
- No ZATCA XML generation.
- No ZATCA signing.
- No QR generation.
- No ZATCA submission, clearance, or reporting.
- No ZATCA signed artifact draft.
- No ZATCA submission log.
- No customer refund.
- No credit note.
- No invoice create/edit/finalize/void.
- No cleanup deletion.

## Read-Only Preflight Checks For Part 6

Part 6 should run these before any write-capable service use:

- `git status --short`.
- `git log -1 --oneline`.
- Confirm HEAD and `origin/main` alignment or document if they differ.
- Confirm unrelated web/marketing and graphify files remain untouched and unstaged.
- Confirm no DEV-06/DEV-07 temp mutation script is tracked or staged.
- Docker Desktop/Linux engine status.
- Docker Postgres/Redis container status.
- `127.0.0.1:5432` reachability.
- `127.0.0.1:6379` reachability if useful.
- API database target guard without printing the database URL.
- Targeted AR Jest suites.
- Fixture-runner targeted test.
- `fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000` only in dry-run/counts-only mode.
- `corepack pnpm verify:diff`.
- Read-only SQL checks for marker/family, fixture organization, actor membership, customer, `INVOICE-000002`, `INVOICE-000001`, paid-through account, account `120`, payment/refund/credit-note/output/ZATCA side-effect counts, fiscal-period guard, and current number sequences.

## Planned Part 6 Temporary Script Shape

Use one temporary local script under `apps/api/scripts`, for example:

```text
apps/api/scripts/dev07-ar-customer-payment-create.temp.ts
```

Script requirements:

- Refuse non-local database targets before write-capable service use.
- Accept only marker `DEV03-AR-20260524T130000`.
- Accept only family `ar`.
- Resolve fixture organization, actor user, customer, `INVOICE-000002`, paid-through cash account, and account `120` from local fixture records.
- Verify `INVOICE-000002` safe id prefix starts with `ddadfdd7`.
- Verify `INVOICE-000002` is `FINALIZED`, has balance due `1150.0000`, and has no reversal journal.
- Verify `INVOICE-000001` remains `VOIDED` and is not used.
- Verify no existing DEV-07 customer payment exists.
- Verify no customer payments, payment allocations, unapplied allocations, refunds, credit notes, generated documents, email records, ZATCA signed drafts, or ZATCA submission logs exist for the DEV-07 slice.
- Verify paid-through asset account and account `120` are active/posting.
- Verify posting-date guard allows the selected payment date.
- Call `CustomerPaymentService.create(organizationId, actorUserId, dto)` exactly once.
- Do not call `applyUnapplied`, `reverseUnappliedAllocation`, `void`, receipt/PDF/archive, generated-document, email, ZATCA XML/signing/submission, refund, credit-note, invoice mutation, cleanup, migration, seed, reset, or delete paths.
- Print safe summaries only: payment number, safe payment id prefix, status, amount received, direct allocation summary, unapplied amount, invoice balance before/after, journal number/line summary, audit action names, and forbidden side-effect counts.
- Remove the temporary script after execution.
- Do not stage the temporary script.
- Do not add root package scripts.

## Planned Post-Mutation Evidence Checks For Part 6

After the one approved payment creation mutation, Part 6 should verify read-only:

Payment:

- Exactly one DEV-07 customer payment exists.
- Payment number is recorded safely.
- Safe payment id prefix is recorded.
- Status is `POSTED`.
- `amountReceived` is `500.0000`.
- `unappliedAmount` is `200.0000`.
- `journalEntryId` is present.
- `voidReversalJournalEntryId` is absent.
- `postedAt` is present.
- Payment number sequence advanced from absent to next `2`, if safely checkable.

Direct allocation:

- Exactly one `CustomerPaymentAllocation` exists.
- It links the payment to `INVOICE-000002`.
- `amountApplied` is `300.0000`.
- No `CustomerPaymentUnappliedAllocation` exists yet.

Invoice:

- `INVOICE-000002` remains `FINALIZED`.
- Balance due decreased from `1150.0000` to `850.0000`.
- Total remains `1150.0000`.
- No reversal journal is present.
- `INVOICE-000001` remains `VOIDED` and unchanged.

Journal:

- One new posted journal exists for the payment.
- Expected journal number is `JOURNAL_ENTRY-000004`.
- Reference matches the payment number.
- Total debit is `500.0000`.
- Total credit is `500.0000`.
- Journal is balanced.
- Lines are Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.
- Journal sequence advanced to next `5`, if safely checkable.

Audit/output/ZATCA/non-effects:

- `CUSTOMER_PAYMENT_CREATED` exists exactly once for the payment.
- No `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, or `CUSTOMER_PAYMENT_VOIDED`.
- No auth/login audit-writing browser flow.
- Generated documents, receipt PDF/archive, email outbox/provider events, ZATCA signed drafts, ZATCA submission logs, refunds, credit notes, and cleanup deletion remain at the expected baseline.
- Temporary script is absent, untracked, and unstaged.

## Forbidden Actions

- Do not create more than one customer payment.
- Do not apply unapplied payment credit.
- Do not reverse unapplied allocations.
- Do not void customer payments.
- Do not create, edit, finalize, or void invoices.
- Do not create refunds, credit notes, or additional allocations.
- Do not create/delete fixtures.
- Do not run cleanup deletion.
- Do not generate, export, download, archive, or inspect PDF/document bodies.
- Do not send email.
- Do not run ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- Do not run migrations, seed/reset/delete, E2E, smoke, full tests, full build, deploys, env changes, schema changes, provider changes, production-hosting research, backup/restore, or login/browser audit-writing flows.
- Do not use production, beta, deployed, shared, or customer data.

## Risks And Blockers

- The `PAYMENT` number sequence is currently absent. This is expected and safe only because `NumberSequenceService.next(...)` upserts the sequence atomically; Part 6 must document the upsert result.
- Payment creation requires at least one direct allocation. A fully unapplied initial payment is not supported by this DTO/service path.
- The payment journal is for the full `amountReceived` (`500.0000`), not only the direct allocation (`300.0000`).
- Active direct payment allocations will block invoice void until the payment is voided.
- The future active unapplied allocation, once created in a later part, will block payment void until reversed.
- Fiscal-period locks can block payment posting.
- Receipt PDF/archive routes can write generated documents if called; they must stay out of scope.
- Unrelated dirty/untracked web marketing and graphify files remain outside DEV-07 and must not be staged.
- Cleanup deletion remains unapproved; local fixture data remains as evidence.

## Exact Approval Phrase Required Before Part 6

```text
I approve DEV-07 Part 6 local-only AR customer payment creation mutation under marker DEV03-AR-20260524T130000 for invoice INVOICE-000002. No production, no beta, no customer data.
```

Do not treat this plan as approval. The approval phrase must be provided in the Part 6 prompt before any customer payment mutation.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse --short HEAD`.
- `git rev-parse --short origin/main`.
- Required documentation reads for DEV-07 Part 5.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- Local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- Local `apps/api/.env` database target guard without printing the database URL.
- Read-only code inspection with `rg`, `Get-Content`, and `Select-String` across the code paths listed above.
- Docker `psql` read-only `SELECT` queries for current fixture, invoice, payment/allocation baseline, output/ZATCA baseline, fiscal-period, and sequence evidence.

## Commands Skipped And Why

- Customer payment creation, direct payment allocation mutation, unapplied allocation, unapplied allocation reversal, customer payment void, customer refund, and credit-note mutation: forbidden in Part 5.
- Invoice create, edit, finalize, void, and repeated void: forbidden in Part 5.
- Fixture creation/deletion and cleanup deletion: forbidden in Part 5.
- Receipt/PDF/archive/export/download, generated-document, email, and ZATCA XML/signing/QR/submission paths: forbidden output/network-sensitive paths.
- E2E, smoke, migrations, seed/reset/delete, deploys, environment changes, provider setting changes, schema changes, backup/restore, production-hosting research, full tests, and full build: outside scope or explicitly forbidden.

## Conclusion

DEV-07 Part 5 planned the customer payment creation mutation only. The future approved Part 6 should create exactly one posted customer payment for `500.0000`, directly allocate `300.0000` to `INVOICE-000002`, leave `200.0000` unapplied, reduce invoice balance due from `1150.0000` to `850.0000`, and post one balanced payment journal Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.

No mutation was performed in Part 5.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 6: approved local AR customer payment creation mutation
```

## Part 6 Customer Payment Creation Mutation Completed Note

DEV-07 Part 6 received the exact local-only approval phrase and completed the approved customer payment creation mutation.

- Mutation evidence doc: [DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md](DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md).
- Payment created: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `POSTED`.
- Amount received: `500.0000`.
- Direct allocation to `INVOICE-000002`: `300.0000`.
- Unapplied amount retained for a later part: `200.0000`.
- `INVOICE-000002` remains `FINALIZED`; balance due decreased from `1150.0000` to `850.0000`.
- Payment journal: `JOURNAL_ENTRY-000004`, `POSTED`, reference `PAYMENT-000001`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`.
- Audit/output/ZATCA boundary held: `CUSTOMER_PAYMENT_CREATED` exists exactly once; no `APPLY_UNAPPLIED`, receipt PDF/archive, generated document, email, ZATCA XML/signing/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow occurred.
- Temporary Part 6 script was removed and is not staged or tracked.

Next prompt title:

```text
DEV-07 Part 7: verify AR customer payment creation evidence
```
