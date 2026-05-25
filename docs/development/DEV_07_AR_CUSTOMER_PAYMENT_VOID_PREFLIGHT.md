# DEV-07 Part 12: AR Customer Payment Void/Reversal Preflight

## Purpose And Scope

DEV-07 Part 12 performs read-only preflight and planning for a future local-only void/reversal of `PAYMENT-000001` after the Part 11 unapplied allocation reversal completed.

Mutation performed in Part 12: no.

No `CustomerPaymentService.void(...)` call was made. No customer payment, invoice, allocation, refund, credit note, generated document, receipt/PDF/archive, email, ZATCA, cleanup deletion, migration, seed/reset/delete, deployment, environment, provider, production, beta, shared-target, customer-data, or login/browser audit-writing action was run.

## Current Fixture State

Read-only local checks verified:

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture context rows: `1`.
- Fixture organization safe id prefix: `bceae558`.
- Fixture customer safe id prefix: `76fb1dcb`.
- Fixture actor safe id prefix: `11ef6aa9`.
- Active fixture actor membership count: `1`.
- Payment and invoice belong to the same fixture organization and customer.
- `PAYMENT-000001` safe id prefix: `b39f4d38`.
- `PAYMENT-000001` status: `POSTED`.
- Payment amount received: `500.0000`.
- Payment unapplied amount: `200.0000`.
- Payment journal: `JOURNAL_ENTRY-000004`.
- Payment `journalEntryId` present: `true`.
- Payment `voidReversalJournalEntryId` present: `false`.
- Payment `voidedAt` present: `false`.
- `INVOICE-000002` safe id prefix: `ddadfdd7`.
- Invoice status: `FINALIZED`.
- Invoice total: `1150.0000`.
- Invoice balance due: `850.0000`.
- Invoice `reversalJournalEntryId` present: `false`.
- Direct `CustomerPaymentAllocation` count: `1`.
- Direct allocation amount: `300.0000`.
- `CustomerPaymentUnappliedAllocation` count: `1`.
- Active unapplied allocation count: `0`.
- Reversed unapplied allocation count: `1`.
- Reversed unapplied allocation safe id prefix: `8bc99925`.
- Reversed unapplied allocation amount: `200.0000`.
- Reversed unapplied allocation `reversedAt` present: `true`.
- Reversed unapplied allocation `reversedById` present: `true`.
- Reversed unapplied allocation reason: `DEV-07 local-only reversal QA for unapplied allocation`.

## Local-Only Safety Proof

- Latest commit inspected before this preflight: `6ed699db Reverse DEV-07 unapplied allocation`.
- `HEAD` matched `origin/main` at `6ed699db43b6c22d14a24345372613be50763ee8`.
- Docker Desktop/Linux engine was available: server `linux 28.5.1`.
- The repo-local `postgres` and `redis` compose services were started only for read-only evidence because they were stopped at the beginning of the run.
- Local containers after startup:
  - `infra-postgres-1`, image `postgres:16-alpine`, healthy, mapped to `0.0.0.0:5432`.
  - `infra-redis-1`, image `redis:7-alpine`, healthy, mapped to `0.0.0.0:6379`.
- Database target proof, redacted: scheme `postgresql`, host `localhost`, port `5432`, database `accounting`.
- The target check found only local `localhost:5432` database URLs in `.env` and `apps/api/.env`.
- The SQL evidence query was wrapped in `BEGIN READ ONLY` and `ROLLBACK`.
- Existing unrelated web/marketing and graphify worktree files remained untouched and unstaged.

## Code Paths Inspected

- `apps/api/src/customer-payments/customer-payment.controller.ts`
  - `CustomerPaymentController.void`
  - `POST /customer-payments/:id/void`
  - `PERMISSIONS.customerPayments.void`
- `apps/api/src/customer-payments/customer-payment.service.ts`
  - `CustomerPaymentService.void`
  - `CustomerPaymentService.createReversalJournal`
  - `CustomerPaymentService.reverseUnappliedAllocation` as prior-state reference only.
  - Receipt/PDF methods as forbidden output boundaries only.
- `apps/api/src/customer-payments/dto/*`
  - No separate void DTO exists; the void route accepts only route params plus auth/org context.
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts`
- `apps/api/src/sales-invoices/sales-invoice.service.ts`
  - Invoice void blocker behavior was inspected as the related AR reversal path.
- `apps/api/src/fiscal-periods/fiscal-period-guard.service.ts`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/prisma/schema.prisma`
  - `CustomerPayment`
  - `CustomerPaymentAllocation`
  - `CustomerPaymentUnappliedAllocation`
  - `SalesInvoice`
  - `JournalEntry`
  - `AuditLog`
  - `NumberSequence`
  - output/email/ZATCA/refund/credit-note models used for side-effect counts.
- DEV-07 evidence docs, `README.md`, and `BUG_AUDIT.md`.

## Payment Void Route, Service, DTO, And Guard Behavior

Normal API route:

```text
POST /customer-payments/:id/void
```

Controller behavior:

- Requires JWT auth, organization context, and permission guard.
- Requires `PERMISSIONS.customerPayments.void`.
- Passes `organizationId`, `actorUserId`, and payment id to `CustomerPaymentService.void(...)`.

DTO behavior:

- No void DTO is defined or consumed.
- There is no request body shape for Part 13.

Service behavior:

- Reads the current payment through `get(...)`.
- Returns existing voided payment idempotently if it is already `VOIDED`.
- Requires status `POSTED` and a payment `journalEntryId`.
- Opens a transaction and re-reads the payment with direct allocations and original journal lines.
- Blocks posted customer refunds sourced from the payment.
- Blocks active, unreversed `CustomerPaymentUnappliedAllocation` records.
- Does not block reversed unapplied allocations.
- Does not block direct `CustomerPaymentAllocation` records.
- Requires the current reversal posting date to pass the fiscal-period guard.
- Claims the payment by updating status `POSTED -> VOIDED` and setting `voidedAt`.
- Creates or reuses one reversal journal for the original payment journal.
- Marks the original payment journal status `REVERSED` after creating the reversal journal.
- Restores finalized invoice balances by incrementing each direct allocation amount.
- Sets `voidReversalJournalEntryId` on the payment.
- Logs audit action `CUSTOMER_PAYMENT_VOIDED` on entity type `CustomerPayment`.
- Does not call receipt/PDF/archive/generated-document, email, ZATCA, refund, credit-note, invoice-void, migration, seed/reset/delete, deploy, or cleanup paths.

Fiscal-period behavior:

- `CustomerPaymentService.void(...)` calls `assertPostingDateAllowed(...)` with the current reversal date.
- `FiscalPeriodGuardService` allows posting if the organization has no fiscal periods.
- Current fixture fiscal period count is `0`, so the future local void is not blocked by fiscal-period state.

## Direct And Unapplied Allocation Blocker Result

Void is safe by current code and fixture state.

Active direct allocations do not block customer payment void. The service uses direct `CustomerPaymentAllocation` records to restore finalized invoice balances during void. The direct allocation row remains as a historical allocation record because the schema has no reversal/status fields on `CustomerPaymentAllocation` and the service does not delete it.

Reversed unapplied allocations do not block customer payment void. Only active unapplied allocations with `reversedAt: null` block the void path. Current active unapplied allocation count is `0`.

Current blockers checked:

- Posted refunds sourced from `PAYMENT-000001`: `0`.
- Active unapplied allocations for `PAYMENT-000001`: `0`.
- Fiscal period count for the fixture organization: `0`.
- Current date fiscal period status: `NO_PERIODS`.

## Preconditions Required Before Part 13 Mutation

Future Part 13 must verify all of these before any write-capable service call:

- Exact approval phrase is present.
- Local disposable database target only.
- Marker is exactly `DEV03-AR-20260524T130000`.
- Family is exactly `ar`.
- Fixture organization, actor membership, and customer still exist.
- `PAYMENT-000001` exists under the fixture organization/customer.
- Payment safe id prefix starts with `b39f4d38`.
- Payment status is `POSTED`.
- Payment amount received is `500.0000`.
- Payment unapplied amount is `200.0000`.
- Payment journal is `JOURNAL_ENTRY-000004`.
- Payment `voidReversalJournalEntryId` is absent.
- Payment `voidedAt` is absent.
- `INVOICE-000002` exists under the same fixture organization/customer.
- Invoice safe id prefix starts with `ddadfdd7`.
- Invoice status is `FINALIZED`.
- Invoice total is `1150.0000`.
- Invoice balance due is exactly `850.0000`.
- Invoice `reversalJournalEntryId` is absent.
- Direct `CustomerPaymentAllocation` count remains `1` for `300.0000`.
- `CustomerPaymentUnappliedAllocation` count remains `1`.
- Active unapplied allocation count remains `0`.
- Reversed unapplied allocation count remains `1`.
- Reversed unapplied allocation safe id prefix starts with `8bc99925`.
- Reversed unapplied allocation reason remains `DEV-07 local-only reversal QA for unapplied allocation`.
- Posted customer refunds sourced from the payment remain `0`.
- `CUSTOMER_PAYMENT_VOIDED` audit action remains `0`.
- No forbidden output/email/ZATCA/refund/credit-note/cleanup side-effect exists.

Stop before mutation if any expected value differs.

## Exact Payment To Void

Future Part 13 should void only:

- Payment: `PAYMENT-000001`.
- Safe payment id prefix: `b39f4d38`.
- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.

Future service call shape:

```ts
await customerPaymentService.void(organizationId, actorUserId, paymentId);
```

Do not call payment creation, apply-unapplied, reverse-unapplied allocation, direct invoice mutation, invoice void, refund, credit-note, receipt/PDF/archive/generated-document, email, ZATCA, cleanup, migration, seed/reset/delete, deployment, or environment/provider paths.

## Expected Payment Impact

After the future approved void:

- `PAYMENT-000001` becomes `VOIDED`.
- Safe payment id prefix remains `b39f4d38`.
- Amount received remains historically `500.0000`.
- Unapplied amount remains `200.0000` by current service code because `void(...)` does not update `unappliedAmount`.
- `journalEntryId` remains linked to `JOURNAL_ENTRY-000004`.
- `voidReversalJournalEntryId` is set to the new reversal journal.
- `voidedAt` is set.
- `PAYMENT` sequence should remain next `2`, if safely checkable.

## Expected Invoice Impact

After the future approved void:

- `INVOICE-000002` remains `FINALIZED`.
- Safe invoice id prefix remains `ddadfdd7`.
- Total remains `1150.0000`.
- Balance due changes from `850.0000` to `1150.0000`, because the active direct allocation amount `300.0000` is restored.
- `reversalJournalEntryId` remains absent.
- No invoice void occurs.

## Expected Direct And Unapplied Allocation Impact

After the future approved void:

- Direct `CustomerPaymentAllocation` remains exactly one historical record for `300.0000`.
- The direct allocation row is not deleted, reversed, or marked inactive by current schema/service design.
- The payment status becomes `VOIDED`, which prevents the direct allocation from representing an active posted payment in downstream reads that join payment status.
- The `CustomerPaymentUnappliedAllocation` remains one record for `200.0000`.
- The unapplied allocation remains reversed.
- No new direct allocation is created.
- No new unapplied allocation is created.
- No credit-note allocation is created.

## Expected Journal And Accounting Impact

After the future approved void:

- One new reversal `JournalEntry` is created unless `JOURNAL_ENTRY-000004` already has a linked reversal.
- Current sequence predicts the new reversal journal number: `JOURNAL_ENTRY-000005`.
- New reversal journal status is `POSTED`.
- New reversal journal reference is `PAYMENT-000001`.
- New reversal journal `reversalOfId` points to `JOURNAL_ENTRY-000004`.
- The reversal journal reverses the original payment journal lines.
- `JOURNAL_ENTRY-000004` remains linked to `PAYMENT-000001` but status changes from `POSTED` to `REVERSED`.
- Fixture organization journal count should change from `4` to `5`.
- `JOURNAL_ENTRY` sequence next should change from `5` to `6`, if safely checkable.
- No invoice reversal journal is created.

## Expected Audit Impact

After the future approved void:

- `CUSTOMER_PAYMENT_CREATED` remains `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED` remains `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` remains `1`.
- `CUSTOMER_PAYMENT_VOIDED` changes from `0` to `1`.
- Raw `APPLY_UNAPPLIED` remains `0`.
- Raw `REVERSE_UNAPPLIED_ALLOCATION` remains `0`.
- No login/auth browser audit-writing flow occurs.

## Expected Output, Email, ZATCA, Refund, Credit Note, And Cleanup Non-Effects

Current side-effect baseline:

- Generated documents: `0`.
- Customer payment generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA metadata count for `INVOICE-000002`: `1`.
- ZATCA XML body present: `false`.
- ZATCA QR body present: `false`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Cleanup/delete audit actions: `0`.

Expected future non-effects:

- No generated document.
- No customer payment receipt PDF/archive.
- No email outbox or provider event.
- No ZATCA XML/signing/QR/submission artifact.
- No refund.
- No credit note.
- No invoice void.
- No cleanup deletion.
- No migration.
- No seed/reset/delete.
- No deployment.
- No environment/provider/schema change.
- No production, beta, shared, or customer-data action.

## Blockers

No blocker was found for Part 13 if the current state still matches this preflight at mutation time.

The only explicit service blockers to re-check are:

- Payment is no longer `POSTED`.
- Payment already has `voidReversalJournalEntryId`.
- Posted refunds sourced from the payment exist.
- Active unapplied allocations exist.
- The current reversal date is blocked by fiscal-period state.
- The original payment journal is missing or already has a competing reversal not linked through the payment.

## Required Approval Phrase For Part 13

Use this exact phrase before any local-only void mutation:

```text
I approve DEV-07 Part 13 local-only AR customer payment void/reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001. No production, no beta, no customer data.
```

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- Required documentation and code reads.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- Redacted local database target check.
- `docker compose -f infra/docker-compose.yml up -d postgres redis`.
- `docker compose -f infra/docker-compose.yml ps postgres redis`.
- Read-only SQL evidence query wrapped in `BEGIN READ ONLY` and `ROLLBACK`.

## Commands Skipped And Why

- `CustomerPaymentService.void`: forbidden by Part 12.
- Payment creation: forbidden and out of scope.
- Apply-unapplied and reverse-unapplied allocation mutations: forbidden and out of scope.
- Invoice mutation and invoice void: forbidden and out of scope.
- Refund and credit-note workflows: forbidden and out of scope.
- Receipt/PDF/archive/generated-document routes: forbidden output-producing paths.
- Email and ZATCA paths: forbidden and out of scope.
- Cleanup/migration/seed/reset/delete/deploy/env/provider paths: forbidden by prompt.
- Smoke, E2E, full tests, full build, login/browser flows, and production-hosting research: explicitly excluded.

## Next Prompt Title

```text
DEV-07 Part 13: approved local AR customer payment void/reversal mutation
```
