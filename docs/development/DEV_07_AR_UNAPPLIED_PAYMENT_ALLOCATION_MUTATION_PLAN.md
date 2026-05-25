# DEV-07 AR Unapplied Payment Allocation Mutation Plan

## Purpose And Scope

DEV-07 Part 8 plans one future local-only unapplied customer payment allocation mutation.

The planned mutation is to apply the remaining unapplied amount from `PAYMENT-000001` to `INVOICE-000002` under marker `DEV03-AR-20260524T130000`, family `ar`.

This Part 8 is planning/read-only only. It did not create customer payments, apply unapplied payment amounts, reverse unapplied allocations, void payments, create/edit/finalize/void invoices, create refunds, create credit notes, create fixtures, delete fixtures, generate documents, export/download/archive/PDF output, send email, run ZATCA XML/signing/QR/submission, run cleanup deletion, migrate, seed/reset/delete, deploy, change environment variables, change provider settings, change schema, use production/beta/shared/customer data, or run login/browser audit-writing flows.

## Local-Only Safety Boundary

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Payment: `PAYMENT-000001`, safe id prefix `b39f4d38`.
- Invoice: `INVOICE-000002`, safe id prefix `ddadfdd7`.
- Local disposable fixture data only.
- No production, beta/user-testing, deployed, hosted, shared, or customer data target is allowed.
- Part 9 must refuse non-local database targets before any write-capable service use.
- Cleanup deletion remains unapproved and out of scope.
- The voided DEV-06 invoice `INVOICE-000001` remains excluded from this happy path.

## Current Payment And Invoice Evidence Summary

Read-only Part 8 checks found the expected starting point:

- Fixture organization exists for marker `DEV03-AR-20260524T130000`, family `ar`.
- Active fixture actor membership exists.
- Fixture customer exists and remains active with type `CUSTOMER`.
- `INVOICE-000002` exists under the fixture organization/customer.
- `INVOICE-000002` safe id prefix starts with `ddadfdd7`.
- `INVOICE-000002` status is `FINALIZED`.
- Invoice total remains `1150.0000`.
- Invoice balance due is `850.0000`.
- `INVOICE-000002.reversalJournalEntryId` is absent.
- `PAYMENT-000001` exists under the fixture organization/customer.
- `PAYMENT-000001` safe id prefix starts with `b39f4d38`.
- Payment status is `POSTED`.
- Payment amount received is `500.0000`.
- Payment unapplied amount is `200.0000`.
- Payment journal is present and linked to `JOURNAL_ENTRY-000004`.
- Payment void reversal journal is absent.
- Exactly one direct `CustomerPaymentAllocation` links `PAYMENT-000001` to `INVOICE-000002` for `300.0000`.
- `CustomerPaymentUnappliedAllocation` count is `0`.
- `CUSTOMER_PAYMENT_CREATED` exists exactly once.
- No `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, or `CUSTOMER_PAYMENT_VOIDED` audit action exists.
- `INVOICE-000001` remains `VOIDED`, safe id prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`.
- Generated documents, email records, ZATCA signed drafts, ZATCA submission logs, refunds, credit notes, and cleanup deletion remain at the expected baseline.

## Code Paths Inspected

Unapplied allocation route and service:

- `apps/api/src/customer-payments/customer-payment.controller.ts`
  - `CustomerPaymentController.applyUnapplied`
  - `POST /customer-payments/:id/apply-unapplied`
  - `CustomerPaymentController.reverseUnappliedAllocation` inspected as downstream reference only.
  - `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse` inspected as downstream reference only.
  - Receipt data/PDF/archive routes inspected as output boundaries only.
- `apps/api/src/customer-payments/customer-payment.service.ts`
  - `CustomerPaymentService.applyUnapplied`
  - `CustomerPaymentService.reverseUnappliedAllocation` inspected as downstream reference only.
  - `CustomerPaymentService.void` inspected as downstream blocker/reference only.
- `apps/api/src/customer-payments/dto/apply-unapplied-payment.dto.ts`
- `apps/api/src/customer-payments/dto/reverse-unapplied-payment-allocation.dto.ts`
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts`
- `apps/api/src/sales-invoices/sales-invoice.service.ts`
  - invoice balance and payment-allocation void blocker references only.
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/src/audit-log/audit-log.service.ts`
- `apps/api/prisma/schema.prisma`
  - `CustomerPayment`
  - `CustomerPaymentAllocation`
  - `CustomerPaymentUnappliedAllocation`
  - `SalesInvoice`
  - `JournalEntry`
  - `AuditLog`
- Customer payment receipt/PDF/generated-document paths were inspected only to confirm they are separate output routes and not called by `applyUnapplied`.
- Existing smoke/E2E references were not run.

## Apply-Unapplied Route, Service, And DTO

Normal API route:

- `POST /customer-payments/:id/apply-unapplied`

Controller:

- `CustomerPaymentController.applyUnapplied`

Guards and permission:

- `JwtAuthGuard`
- `OrganizationContextGuard`
- `PermissionGuard`
- `PERMISSIONS.customerPayments.create`

Service method:

- `CustomerPaymentService.applyUnapplied(organizationId, actorUserId, id, dto)`

DTO:

- `invoiceId`: UUID for the invoice receiving the unapplied amount.
- `amountApplied`: decimal string with up to 4 decimal places.

The DTO has no reason, notes, or description field. Part 9 should not invent one.

## Apply-Unapplied Preconditions

Part 9 must verify all of these before mutation:

- Local DB target is explicit `localhost`/local Docker and does not match production, beta, user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, shared, or customer-data target patterns.
- Marker is exactly `DEV03-AR-20260524T130000`.
- Family is exactly `ar`.
- Fixture organization exists.
- Fixture actor user and active membership exist.
- Fixture customer exists, is active, and has type `CUSTOMER` or `BOTH`.
- `PAYMENT-000001` exists in the fixture organization/customer.
- Payment safe id prefix starts with `b39f4d38`.
- Payment status is `POSTED`.
- Payment amount received is `500.0000`.
- Payment unapplied amount is exactly `200.0000`.
- Payment `journalEntryId` is present.
- Payment `voidReversalJournalEntryId` is absent.
- `INVOICE-000002` exists in the fixture organization/customer.
- Invoice safe id prefix starts with `ddadfdd7`.
- Invoice status is `FINALIZED`.
- Invoice total is `1150.0000`.
- Invoice balance due is exactly `850.0000`.
- Invoice `reversalJournalEntryId` is absent.
- Payment and invoice have the same customer.
- Applying `200.0000` does not exceed payment `unappliedAmount`.
- Applying `200.0000` does not exceed invoice `balanceDue`.
- Exactly one direct `CustomerPaymentAllocation` already exists for `PAYMENT-000001` to `INVOICE-000002` for `300.0000`.
- No `CustomerPaymentUnappliedAllocation` exists yet.
- No `APPLY_UNAPPLIED` audit action exists yet.
- No `REVERSE_UNAPPLIED_ALLOCATION` or `CUSTOMER_PAYMENT_VOIDED` action exists.
- `JOURNAL_ENTRY` sequence next number is `5`, if safely checkable.
- No payment void, refund, credit note, generated document, receipt/PDF/archive, email, ZATCA signed draft, ZATCA submission log, invoice void, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data action has occurred since Part 7.

The inspected service path does not call `FiscalPeriodGuardService.assertPostingDateAllowed` for `applyUnapplied`; `customer-payment-rules.spec.ts` asserts that posting-date guard is not called for this matching-only operation.

## Exact Planned Allocation Payload

Part 9 should perform exactly one service call after all guards pass:

```ts
await customerPaymentService.applyUnapplied(organizationId, actorUserId, paymentId, {
  invoiceId,
  amountApplied: "200.0000",
});
```

Resolved values:

- `paymentId`: resolved only from `PAYMENT-000001`.
- `invoiceId`: resolved only from `INVOICE-000002`.
- `amountApplied`: `200.0000`.

Do not create another payment. Do not create another direct `CustomerPaymentAllocation`. Do not call `CustomerPaymentService.create`. Do not call `reverseUnappliedAllocation`. Do not call `CustomerPaymentService.void`. Do not call receipt/PDF/archive/generated-document/email/ZATCA/refund/credit-note/invoice mutation/cleanup/migration/seed/reset/delete paths.

## Expected Payment State

After Part 9:

- `PAYMENT-000001` remains `POSTED`.
- Safe payment id prefix remains `b39f4d38`.
- `amountReceived` remains `500.0000`.
- `unappliedAmount` changes from `200.0000` to `0.0000`.
- `journalEntryId` remains present and linked to `JOURNAL_ENTRY-000004`.
- `voidReversalJournalEntryId` remains absent.
- `postedAt` remains present.
- `PAYMENT` sequence remains next `2`, if safely checkable.

## Expected Invoice Balance Impact

After Part 9:

- `INVOICE-000002` remains `FINALIZED`.
- Safe invoice id prefix remains `ddadfdd7`.
- Invoice total remains `1150.0000`.
- Invoice balance due changes from `850.0000` to `650.0000`.
- `reversalJournalEntryId` remains absent.
- `INVOICE-000001` remains `VOIDED` and excluded from the happy path.

## Expected CustomerPaymentUnappliedAllocation State

After Part 9:

- Direct `CustomerPaymentAllocation` count remains `1`.
- Existing direct allocation remains `PAYMENT-000001 -> INVOICE-000002` for `300.0000`.
- `CustomerPaymentUnappliedAllocation` count changes from `0` to `1`.
- The new unapplied allocation links `PAYMENT-000001` to `INVOICE-000002`.
- `amountApplied` is `200.0000`.
- `reversedAt` is absent.
- `reversedById` is absent.
- `reversalReason` is absent.
- No credit-note allocation is created.

## Expected Journal And Accounting Impact

Applying unapplied payment amount is matching-only.

Expected Part 9 accounting result:

- No new `JournalEntry`.
- `JOURNAL_ENTRY-000004` remains the posted payment journal.
- Payment journal remains reference `PAYMENT-000001`.
- Payment journal remains balanced at debit `500.0000` and credit `500.0000`.
- Payment journal lines remain Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.
- `JOURNAL_ENTRY` sequence remains next `5`, if safely checkable.
- AR/cash ledger impact was already posted during Part 6 payment creation.

## Expected Audit Impact

Expected Part 9 audit result:

- One raw `APPLY_UNAPPLIED` audit action is created.
- The action is logged on entity type `CustomerPayment`, entity id for `PAYMENT-000001`.
- `audit-events.ts` maps `CustomerPayment:CREATE` and `CustomerPayment:VOID`, but does not map `CustomerPayment:APPLY_UNAPPLIED`, so the inspected audit service keeps the raw `APPLY_UNAPPLIED` action string.
- `CUSTOMER_PAYMENT_CREATED` count remains `1`.
- No `REVERSE_UNAPPLIED_ALLOCATION`.
- No `CUSTOMER_PAYMENT_VOIDED`.
- No invoice audit action is expected from this operation.
- No login/auth audit-writing browser flow should run.
- Full audit payload bodies, session metadata, tokens, auth headers, IP headers, user-agent bodies, and request/response bodies must not be recorded.

## Expected Output, Email, And ZATCA Non-Effects

Part 9 must not run output or network-sensitive paths.

Expected non-effects:

- No receipt PDF/archive.
- No `receipt-data`, `receipt-pdf-data`, `receipt.pdf`, or `generate-receipt-pdf` route call.
- No generated document.
- No email outbox record.
- No email provider event.
- No ZATCA XML generation.
- No ZATCA signing.
- No QR generation.
- No ZATCA submission, clearance, or reporting.
- No ZATCA signed artifact draft.
- No ZATCA submission log.
- Existing local `ZatcaInvoiceMetadata` for `INVOICE-000002` remains present and unchanged except for ordinary untouched timestamps.
- No refund.
- No credit note.
- No invoice void.
- No cleanup deletion.

## Read-Only Preflight Checks For Part 9

Before the Part 9 mutation script imports write-capable services, it should verify:

- Repo state and tracked temp-script absence.
- Docker Desktop/Linux engine availability.
- Docker Postgres/Redis status.
- `127.0.0.1:5432` reachability.
- `127.0.0.1:6379` reachability if the script path needs Redis.
- API database target guard without printing the database URL.
- Marker/family/org/customer/actor membership.
- `INVOICE-000002` safe prefix `ddadfdd7`, status `FINALIZED`, total `1150.0000`, balance due `850.0000`, and absent reversal journal.
- `PAYMENT-000001` safe prefix `b39f4d38`, status `POSTED`, amount received `500.0000`, unapplied amount `200.0000`, posted journal present, and absent void reversal journal.
- Direct allocation count `1` for `300.0000` to `INVOICE-000002`.
- `CustomerPaymentUnappliedAllocation` count `0`.
- No `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, or `CUSTOMER_PAYMENT_VOIDED` audit action.
- `JOURNAL_ENTRY` count remains `4` for the fixture organization and sequence next remains `5`, if safely checkable.
- `INVOICE-000001` remains `VOIDED`.
- Generated documents, receipt/PDF/archive evidence, email records, ZATCA signed drafts, ZATCA submission logs, refunds, credit notes, and cleanup deletion remain at expected baselines.
- Exact Part 9 approval phrase is present in the prompt.

Stop before mutation if any preflight value differs.

## Planned Temporary Script Shape For Part 9

Use one temporary script under `apps/api/scripts`, for example:

```text
apps/api/scripts/dev07-ar-unapplied-payment-apply.temp.ts
```

Script requirements:

- Refuse non-local database targets before write-capable service use.
- Accept only marker `DEV03-AR-20260524T130000`.
- Accept only family `ar`.
- Resolve fixture organization, actor user, customer, `PAYMENT-000001`, and `INVOICE-000002` from marker-scoped/local fixture records.
- Verify `PAYMENT-000001` safe prefix `b39f4d38`.
- Verify `INVOICE-000002` safe prefix `ddadfdd7`.
- Verify payment and invoice belong to the same fixture customer.
- Verify payment status, amount received, unapplied amount, and absence of void reversal journal.
- Verify invoice status, total, balance due, and absence of reversal journal.
- Verify existing direct allocation and absence of unapplied allocation.
- Verify no forbidden side-effect records exist.
- Call `CustomerPaymentService.applyUnapplied(organizationId, actorUserId, paymentId, dto)` exactly once.
- DTO must contain only `invoiceId` and `amountApplied: "200.0000"`.
- Do not call payment create, reverse unapplied allocation, payment void, refund, credit note, invoice mutation, receipt/PDF/archive/generated-document/email/ZATCA/cleanup/migration/seed/reset/delete paths.
- Print safe summaries only:
  - payment number.
  - safe payment id prefix.
  - invoice number.
  - safe invoice id prefix.
  - unapplied amount before/after.
  - invoice balance before/after.
  - new unapplied allocation count and amount.
  - journal count/sequence unchanged.
  - audit action names.
  - forbidden side-effect counts.
- Remove the temporary script after execution.
- Do not stage the temporary script.
- Do not add root package scripts.

## Planned Post-Mutation Evidence Checks For Part 9

After the one approved mutation, Part 9 should verify read-only:

Payment:

- Exactly one DEV-07 payment exists.
- `PAYMENT-000001` remains `POSTED`.
- Safe payment id prefix starts with `b39f4d38`.
- `amountReceived` remains `500.0000`.
- `unappliedAmount` is `0.0000`.
- `journalEntryId` remains present.
- `voidReversalJournalEntryId` remains absent.
- `PAYMENT` sequence remains next `2`, if safely checkable.

Invoice:

- `INVOICE-000002` remains `FINALIZED`.
- Safe invoice id prefix starts with `ddadfdd7`.
- Total remains `1150.0000`.
- Balance due is `650.0000`.
- `reversalJournalEntryId` remains absent.
- `INVOICE-000001` remains `VOIDED` and unchanged.

Allocation:

- Direct `CustomerPaymentAllocation` remains exactly one for `300.0000`.
- `CustomerPaymentUnappliedAllocation` count is exactly one.
- The new unapplied allocation links `PAYMENT-000001` to `INVOICE-000002`.
- `amountApplied` is `200.0000`.
- The unapplied allocation is not reversed.
- No credit-note allocation exists.

Journal/accounting:

- No new journal entry exists.
- Fixture organization journal count remains `4`.
- `JOURNAL_ENTRY-000004` remains `POSTED`, reference `PAYMENT-000001`, balanced at debit `500.0000` and credit `500.0000`.
- `JOURNAL_ENTRY` sequence remains next `5`, if safely checkable.

Audit/output/non-effects:

- Raw `APPLY_UNAPPLIED` exists exactly once.
- `CUSTOMER_PAYMENT_CREATED` remains exactly once.
- No `REVERSE_UNAPPLIED_ALLOCATION`.
- No `CUSTOMER_PAYMENT_VOIDED`.
- No login/auth audit-writing browser flow.
- No receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, ZATCA signed draft, ZATCA submission log, refund, credit note, invoice void, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data action occurred.
- Temporary script is absent, unstaged, and untracked.

## Forbidden Actions

- Do not create customer payments.
- Do not create direct payment allocations.
- Do not apply more than `200.0000`.
- Do not apply to any invoice other than `INVOICE-000002`.
- Do not apply from any payment other than `PAYMENT-000001`.
- Do not reverse unapplied allocations.
- Do not void customer payments.
- Do not create, edit, finalize, or void invoices.
- Do not create refunds, credit notes, or credit-note allocations.
- Do not create/delete fixtures.
- Do not run cleanup deletion.
- Do not generate, export, download, archive, or inspect PDF/document bodies.
- Do not call receipt-data, receipt-pdf-data, receipt.pdf, or generate-receipt-pdf routes.
- Do not send email.
- Do not run ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- Do not run migrations, seed/reset/delete, E2E, smoke, full tests, full build, deploys, environment changes, provider changes, schema changes, production-hosting research, backup/restore, or login/browser audit-writing flows.
- Do not use production, beta, deployed, shared, or customer data.

## Risks And Blockers

- `applyUnapplied` will reject non-`POSTED` payments.
- `applyUnapplied` will reject invoices that are not `FINALIZED`.
- Payment and invoice must belong to the same customer.
- Applying more than payment `unappliedAmount` will be rejected.
- Applying more than invoice `balanceDue` will be rejected.
- Concurrent stale claims can fail because the service uses conditional `updateMany` guards for both payment unapplied amount and invoice balance.
- The new active unapplied allocation will block payment void until reversed.
- The matching operation has no fiscal posting-date guard in the inspected code/tests; Part 9 should document that as inspected behavior, not as a production accounting policy claim.
- Receipt/PDF/archive routes can write generated documents if called; they must remain out of scope.
- Cleanup deletion remains unapproved; local fixture data remains as evidence.
- Unrelated dirty/untracked web marketing and graphify files remain outside DEV-07 and must not be staged.

## Exact Approval Phrase Required Before Part 9

```text
I approve DEV-07 Part 9 local-only AR unapplied customer payment allocation mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001 and invoice INVOICE-000002. No production, no beta, no customer data.
```

Do not treat this plan as approval. The approval phrase must be provided in the Part 9 prompt before any unapplied allocation mutation.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse --short HEAD`.
- `git rev-parse --short origin/main`.
- Required documentation reads for DEV-07 Part 8.
- Read-only code inspection with `rg` and `Get-Content` across the code paths listed above.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- Local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- Local `apps/api/.env` database target guard without printing the database URL.
- Docker `psql` read-only `SELECT` query wrapped in `BEGIN READ ONLY` / `ROLLBACK` for current fixture, invoice, payment, allocation, journal, audit, ZATCA metadata, sequence, and side-effect evidence.

## Commands Skipped And Why

- Customer payment creation, direct payment allocation mutation, unapplied payment allocation mutation, unapplied allocation reversal, customer payment void, customer refund, and credit-note mutation: forbidden in Part 8.
- Invoice create, edit, finalize, void, and repeated void: forbidden in Part 8.
- Fixture creation/deletion and cleanup deletion: forbidden in Part 8.
- Receipt/PDF/archive/export/download, generated-document, email, and ZATCA XML/signing/QR/submission paths: forbidden output/network-sensitive paths.
- E2E, smoke, migrations, seed/reset/delete, deploys, environment changes, provider setting changes, schema changes, backup/restore, production-hosting research, full tests, and full build: outside scope or explicitly forbidden.

## Conclusion

DEV-07 Part 8 planned the unapplied payment allocation mutation only. The future approved Part 9 should apply exactly `200.0000` from `PAYMENT-000001` to `INVOICE-000002`, move payment `unappliedAmount` from `200.0000` to `0.0000`, move invoice balance due from `850.0000` to `650.0000`, create exactly one `CustomerPaymentUnappliedAllocation`, create raw audit action `APPLY_UNAPPLIED`, and create no new journal entry.

No mutation was performed in Part 8.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 9: approved local AR unapplied customer payment allocation mutation
```
