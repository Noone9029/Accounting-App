# DEV-07 AR Unapplied Allocation Reversal Preflight

## Purpose And Scope

DEV-07 Part 10 performs read-only preflight and planning for a future local-only reversal of the active `CustomerPaymentUnappliedAllocation` created under marker `DEV03-AR-20260524T130000`, family `ar`.

The future reversal target is the one active unapplied allocation for `200.0000` linked to `PAYMENT-000001` and `INVOICE-000002`.

Mutation performed in Part 10: no.

No `CustomerPaymentService.reverseUnappliedAllocation(...)` call was made. No invoice, payment, allocation, refund, credit note, generated document, receipt/PDF/archive, email, ZATCA, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, production, beta, shared-target, customer-data, or login/browser audit-writing action was run.

## Current Fixture State

Read-only local checks verified:

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture organization count: `1`.
- Active fixture actor membership count: `1`.
- Fixture customer count: `1`, type `CUSTOMER`, active `true`.
- `PAYMENT-000001` count: `1`.
- Payment safe id prefix: `b39f4d38`.
- Payment status: `POSTED`.
- Payment amount received: `500.0000`.
- Payment unapplied amount: `0.0000`.
- Payment journal number: `JOURNAL_ENTRY-000004`.
- Payment void reversal journal present: `false`.
- `INVOICE-000002` count: `1`.
- Invoice safe id prefix: `ddadfdd7`.
- Invoice status: `FINALIZED`.
- Invoice total: `1150.0000`.
- Invoice balance due: `650.0000`.
- Invoice reversal journal present: `false`.
- Payment and invoice same customer: `true`.
- `INVOICE-000001` remains `VOIDED`.

## Local-Only Safety Proof

- Latest commit inspected before this preflight: `c71b0809 Apply DEV-07 unapplied payment allocation`.
- Docker Desktop Linux engine was available: server `linux 28.5.1`.
- The repo-local `postgres` and `redis` compose services were started only for read-only evidence because they were stopped at the beginning of the run.
- Local containers after startup:
  - `infra-postgres-1`, image `postgres:16-alpine`, healthy, mapped to `0.0.0.0:5432`.
  - `infra-redis-1`, image `redis:7-alpine`, healthy, mapped to `0.0.0.0:6379`.
- `127.0.0.1:5432` and `127.0.0.1:6379` were reachable.
- The API database target guard parsed the configured database host as `localhost`, port `5432`.
- The target guard found no hosted, production, beta, user-testing, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, or Neon target pattern.
- The SQL evidence query was wrapped in `BEGIN READ ONLY` and `ROLLBACK`.
- Existing unrelated web/marketing and graphify worktree changes remained untouched and unstaged.

## Code Paths Inspected

- `apps/api/src/customer-payments/customer-payment.controller.ts`
  - `CustomerPaymentController.reverseUnappliedAllocation`
  - `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`
  - `PERMISSIONS.customerPayments.reverseUnappliedAllocation`
- `apps/api/src/customer-payments/customer-payment.service.ts`
  - `CustomerPaymentService.reverseUnappliedAllocation`
  - `CustomerPaymentService.applyUnapplied` as prior-state reference only.
  - Receipt/PDF routes as forbidden output boundaries only.
- `apps/api/src/customer-payments/dto/reverse-unapplied-payment-allocation.dto.ts`
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts`
- `apps/api/prisma/schema.prisma`
  - `CustomerPayment`
  - `CustomerPaymentAllocation`
  - `CustomerPaymentUnappliedAllocation`
  - `SalesInvoice`
  - `JournalEntry`
  - `AuditLog`
- `apps/api/src/audit-log/audit-events.ts`
- DEV-07 fixture/evidence docs and current handoff.

The prompt referenced `docs/development/DEV_07_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE.md`, which is not present in this checkout. The current matching evidence source is [DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md).

## Reverse-Unapplied Route, Controller, Service, And DTO Behavior

Normal API route:

```text
POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse
```

Controller behavior:

- Requires JWT auth, organization context, and permission guard.
- Requires `PERMISSIONS.customerPayments.reverseUnappliedAllocation`.
- Passes `organizationId`, `actorUserId`, payment id, allocation id, and DTO to `CustomerPaymentService.reverseUnappliedAllocation(...)`.

DTO shape:

```ts
{
  reason?: string;
}
```

No amount field is supported. The service reverses the allocation amount from the allocation record.

Service behavior:

- Finds the unapplied allocation by allocation id, payment id, and organization id.
- Rejects missing allocations.
- Rejects already reversed allocations.
- Rejects voided payments or payments with `voidReversalJournalEntryId`.
- Requires payment status `POSTED`.
- Requires invoice status `FINALIZED`.
- Computes amount from `allocation.amountApplied`.
- Marks the allocation reversed with `reversedAt`, `reversedById`, and cleaned optional `reversalReason`.
- Restores payment `unappliedAmount` by incrementing the allocation amount.
- Restores invoice `balanceDue` by incrementing the allocation amount.
- Uses conditional guards so payment unapplied amount cannot exceed amount received and invoice balance due cannot exceed invoice total.
- Does not create, update, delete, or reverse any `JournalEntry`.
- Logs audit action `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` on entity type `CustomerPaymentUnappliedAllocation`.

## Preconditions Required Before Mutation

Future Part 11 must verify all of these before any write-capable service call:

- Exact approval phrase is present.
- Local disposable database target only.
- Marker is exactly `DEV03-AR-20260524T130000`.
- Family is exactly `ar`.
- Fixture organization, actor membership, and customer still exist.
- `PAYMENT-000001` exists under the fixture organization/customer.
- Payment safe id prefix starts with `b39f4d38`.
- Payment status is `POSTED`.
- Payment amount received is `500.0000`.
- Payment unapplied amount is exactly `0.0000`.
- Payment journal is `JOURNAL_ENTRY-000004`.
- Payment `voidReversalJournalEntryId` is absent.
- `INVOICE-000002` exists under the same fixture organization/customer.
- Invoice safe id prefix starts with `ddadfdd7`.
- Invoice status is `FINALIZED`.
- Invoice total is `1150.0000`.
- Invoice balance due is exactly `650.0000`.
- Invoice `reversalJournalEntryId` is absent.
- Direct `CustomerPaymentAllocation` count remains `1` for `300.0000`.
- Exactly one active `CustomerPaymentUnappliedAllocation` exists.
- Active unapplied allocation amount is `200.0000`.
- Active unapplied allocation links `PAYMENT-000001` and `INVOICE-000002`.
- Active unapplied allocation `reversedAt`, `reversedById`, and `reversalReason` are absent.
- No reverse-unapplied audit action exists yet.
- No forbidden output/email/ZATCA/refund/credit-note/void/cleanup side-effect exists.

Stop before mutation if any expected value differs.

## Exact Allocation To Reverse

Future Part 11 should reverse only:

- Payment: `PAYMENT-000001`.
- Invoice: `INVOICE-000002`.
- Active unapplied allocation safe id prefix: `8bc99925`.
- Amount applied on allocation: `200.0000`.
- Reversal reason: `DEV-07 local-only reversal QA for unapplied allocation`.

Future service call shape:

```ts
await customerPaymentService.reverseUnappliedAllocation(
  organizationId,
  actorUserId,
  paymentId,
  allocationId,
  { reason: "DEV-07 local-only reversal QA for unapplied allocation" },
);
```

Do not reverse the direct `300.0000` allocation. Do not void the payment. Do not mutate the invoice directly.

## Expected Payment Impact

After the future approved reversal:

- `PAYMENT-000001` remains `POSTED`.
- Safe payment id prefix remains `b39f4d38`.
- Amount received remains `500.0000`.
- Unapplied amount changes from `0.0000` to `200.0000`.
- `journalEntryId` remains linked to `JOURNAL_ENTRY-000004`.
- `voidReversalJournalEntryId` remains absent.
- `PAYMENT` sequence remains next `2`, if safely checkable.

## Expected Invoice Impact

After the future approved reversal:

- `INVOICE-000002` remains `FINALIZED`.
- Safe invoice id prefix remains `ddadfdd7`.
- Total remains `1150.0000`.
- Balance due changes from `650.0000` to `850.0000`.
- `reversalJournalEntryId` remains absent.
- `INVOICE-000001` remains `VOIDED` and excluded.

## Expected Allocation Impact

After the future approved reversal:

- Direct `CustomerPaymentAllocation` remains exactly one record for `300.0000`.
- The active `CustomerPaymentUnappliedAllocation` is marked reversed.
- `reversedAt` is set.
- `reversedById` is set to the fixture actor.
- `reversalReason` is set to `DEV-07 local-only reversal QA for unapplied allocation`.
- No new direct allocation is created.
- No credit-note allocation is created.

## Expected Journal And Accounting Impact

Reversing an unapplied allocation restores matching state only.

Expected future accounting result:

- No new `JournalEntry`.
- No journal entry update or delete.
- `JOURNAL_ENTRY-000004` remains `POSTED`, reference `PAYMENT-000001`.
- `JOURNAL_ENTRY-000004` remains balanced at debit `500.0000` and credit `500.0000`.
- Journal lines remain Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.
- Fixture organization journal count remains `4`.
- `JOURNAL_ENTRY` sequence remains next `5`, if safely checkable.

## Expected Audit Impact

Current code uses standardized audit events.

Expected future audit result:

- `CUSTOMER_PAYMENT_CREATED` remains exactly once.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED` remains exactly once.
- One `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` audit action is created.
- The reverse audit row uses entity type `CustomerPaymentUnappliedAllocation` and the active allocation id.
- Raw `APPLY_UNAPPLIED` remains `0`.
- Raw `REVERSE_UNAPPLIED_ALLOCATION` remains `0` unless future code changes intentionally alter audit standardization.
- No `CUSTOMER_PAYMENT_VOIDED`.
- No login/auth audit-writing browser flow.

## Expected Output, Email, And ZATCA Non-Effects

Future Part 11 must not run output or network-sensitive paths.

Expected non-effects:

- No receipt data route call.
- No receipt PDF/archive.
- No generated document.
- No email outbox record.
- No email provider event.
- No ZATCA XML generation.
- No ZATCA signing.
- No QR generation.
- No ZATCA submission, clearance, or reporting.
- No ZATCA signed artifact draft.
- No ZATCA submission log.
- Existing local `ZatcaInvoiceMetadata` for `INVOICE-000002` remains `NOT_SUBMITTED` with no XML body and no QR body.
- No refund.
- No credit note.
- No invoice void.
- No payment void.
- No cleanup deletion.

## Read-Only Preflight Evidence

Current local read-only checks:

- Direct allocation count: `1`.
- Direct allocation amount sum: `300.0000`.
- Unapplied allocation count: `1`.
- Active unapplied allocation count: `1`.
- Active unapplied allocation amount: `200.0000`.
- Active unapplied allocation safe id prefix: `8bc99925`.
- Active unapplied allocation `reversedAt` present: `false`.
- Active unapplied allocation `reversedById` present: `false`.
- Active unapplied allocation `reversalReason` present: `false`.
- Fixture organization journal count: `4`.
- `JOURNAL_ENTRY-000004` count: `1`.
- `JOURNAL_ENTRY-000004` status: `POSTED`.
- `JOURNAL_ENTRY-000004` reference: `PAYMENT-000001`.
- `JOURNAL_ENTRY-000004` debit/credit: `500.0000` / `500.0000`.
- `JOURNAL_ENTRY` sequence next: `5`.
- `PAYMENT` sequence next: `2`.
- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- Raw `APPLY_UNAPPLIED`: `0`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `0`.
- Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.
- Generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Credit note allocations: `0`.

## Blockers

No blocker exists for planning. Future Part 11 must still rerun the local-only and fixture-state preflight immediately before any mutation.

## Required Approval Phrase For Part 11

```text
I approve DEV-07 Part 11 local-only AR unapplied allocation reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001, invoice INVOICE-000002, and the active 200.0000 unapplied allocation. No production, no beta, no customer data.
```

Do not treat this preflight plan as approval.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- Required documentation reads for DEV-07 Part 10.
- Read-only code inspection with `Get-Content` and `rg`.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- Local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- `docker compose -f infra/docker-compose.yml up -d postgres redis`.
- Local `apps/api/.env` database target guard without printing the database URL.
- Docker `psql` read-only query wrapped in `BEGIN READ ONLY` / `ROLLBACK` for current fixture, payment, invoice, allocation, journal, audit, sequence, ZATCA metadata, and forbidden side-effect evidence.

## Commands Skipped And Why

- `CustomerPaymentService.reverseUnappliedAllocation(...)`: forbidden in Part 10; planned only for a future approved mutation.
- Payment void, invoice mutation, customer payment creation, direct allocation creation, apply unapplied, refund, credit note, receipt/PDF/archive/generated-document/email/ZATCA paths, cleanup deletion, migration, seed/reset/delete, deploy, environment changes, provider changes, production-hosting research, smoke, E2E, and login/browser audit-writing flows: forbidden or out of scope.
- Tests and typecheck: no production code or test code changed in this preflight.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 11: approved local AR unapplied allocation reversal mutation
```

## Part 11 Evidence Note

DEV-07 Part 11 was completed after receiving the required approval phrase. Evidence is recorded in [DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).

Result summary:

- `CustomerPaymentService.reverseUnappliedAllocation(...)` was called exactly once.
- `PAYMENT-000001` remained `POSTED`; unapplied amount changed `0.0000 -> 200.0000`.
- `INVOICE-000002` remained `FINALIZED`; balance due changed `650.0000 -> 850.0000`.
- The `8bc99925` unapplied allocation was marked reversed with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- No new `JournalEntry`, generated document, receipt/PDF/archive, email, ZATCA XML/signing/QR/submission, refund, credit note, invoice void, payment void, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing flow occurred.

Next prompt title:

```text
DEV-07 Part 12: AR customer payment void/reversal preflight
```
