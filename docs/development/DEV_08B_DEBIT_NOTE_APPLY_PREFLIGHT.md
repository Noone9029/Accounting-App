# DEV-08B Debit Note Apply-To-Bill Preflight

## Purpose And Scope

DEV-08B Part 4 is a read-only preflight and mutation plan for applying part of the finalized DEV-08B purchase debit note to the finalized DEV-08B purchase bill.

Planned future mutation: apply `250.0000` from `PDN-000003` to `BILL-000008`.

Mutation performed in this part: no.

No debit note apply, debit note reversal, debit note void, supplier refund, supplier payment, purchase bill mutation, purchase order, purchase receipt, stock movement, cash expense, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow was run.

## Latest Commit Inspected

- `41de087f Verify DEV-08B debit note fixture evidence`.
- Local `HEAD` matched `origin/main` at `41de087f8967bb33628552a798532eef2d82967c`.
- Branch: `main`.

## Current Supplier, Bill, And Debit Note Evidence

- Marker: `DEV08B-AP-20260526T060000`.
- Supplier: `DEV08B-AP-20260526T060000 Supplier`.
- Supplier safe id prefix: `d11c76db`.
- Supplier state: active `SUPPLIER`.
- Organization safe id prefix: `db69e5a8`.

Purchase bill:

- Bill number: `BILL-000008`.
- Bill safe id prefix: `4b8886bb`.
- Status: `FINALIZED`.
- Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`.
- Total: `1150.0000`.
- Current balance due: `1150.0000`.
- Reversal journal: absent.
- Supplier payment allocations: `0`.
- Supplier payment unapplied allocations: `0`.
- Purchase debit note allocations: `0`.

Purchase debit note:

- Debit note number: `PDN-000003`.
- Debit note safe id prefix: `b93f96ee`.
- Status: `FINALIZED`.
- Linked original bill: `BILL-000008`.
- Total: `460.0000`.
- Current unapplied amount: `460.0000`.
- Reversal journal: absent.
- Allocations: `0`.
- Supplier refunds: `0`.

## Local-Only Safety Proof

- Docker engine was available: Docker server `28.5.1`, OS type `linux`.
- Local containers were healthy:
  - `infra-postgres-1`, local port `5432`, healthy.
  - `infra-redis-1`, local port `6379`, healthy.
- `Test-NetConnection localhost:5432` returned `TcpTestSucceeded=True`.
- `Test-NetConnection localhost:6379` returned `TcpTestSucceeded=True`.
- The read-only Node/Prisma preflight script classified the database target before opening a connection:
  - protocol: `postgresql`.
  - host: `localhost`.
  - port: `5432`.
  - accepted local-only target: yes.
- The script rejected hosted/prod/beta/shared/customer-data target patterns before connecting.
- No database URL, credential, token, cookie, auth header, request/response body, vendor/customer data, signed XML, QR payload, document body, or attachment body was printed.

## Code Paths Inspected

- Controller: [purchase-debit-note.controller.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts)
  - `POST /purchase-debit-notes/:id/apply` calls `PurchaseDebitNoteService.apply(...)`.
  - The route requires `purchaseDebitNotes.finalize` permission.
- DTO: [apply-purchase-debit-note.dto.ts](../../apps/api/src/purchase-debit-notes/dto/apply-purchase-debit-note.dto.ts)
  - Required fields: `billId`, `amountApplied`.
  - No reason, notes, or alternate amount field is supported.
- Service: [purchase-debit-note.service.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts)
  - Validates positive `amountApplied`.
  - Requires the debit note to be `FINALIZED`.
  - Requires the target bill to belong to the same organization and supplier.
  - Requires the bill to be `FINALIZED`.
  - Rejects amounts above debit note unapplied amount or bill balance due.
  - Decrements debit note `unappliedAmount`.
  - Decrements bill `balanceDue`.
  - Creates one `PurchaseDebitNoteAllocation`.
  - Logs `action: "APPLY"` on `entityType: "PurchaseDebitNote"`.
- Schema: [schema.prisma](../../apps/api/prisma/schema.prisma)
  - `PurchaseDebitNoteAllocation` stores `organizationId`, `debitNoteId`, `billId`, `amountApplied`, `reversedAt`, `reversedById`, and `reversalReason`.
- Rules/spec: [purchase-debit-note-rules.spec.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts)
  - Covers successful apply without creating a journal.
  - Covers draft debit-note blocker.
  - Covers over-unapplied and over-balance blockers.
  - Covers same-supplier original bill validation and allocation reversal behavior.

## Exact Planned Application

- Debit note: `PDN-000003`, safe id prefix `b93f96ee`.
- Purchase bill: `BILL-000008`, safe id prefix `4b8886bb`.
- Amount to apply: `250.0000`.
- Reason for partial amount: leaves `210.0000` of debit-note unapplied amount for supplier refund branch testing.

## Exact DTO And Service Call Shape

Future Part 5 should call the service once with the current service shape:

```ts
await purchaseDebitNoteService.apply(organizationId, actorUserId, debitNoteId, {
  billId: "<BILL-000008 id>",
  amountApplied: "250.0000",
});
```

No `reason`, `notes`, `purchaseBillId`, `amount`, or UI-only field is supported by the apply DTO.

## Preconditions Required Before Mutation

The read-only preflight confirmed:

- Marker is `DEV08B-AP-20260526T060000`.
- Supplier is active `SUPPLIER`.
- Bill `BILL-000008` is `FINALIZED`.
- Debit note `PDN-000003` is `FINALIZED`.
- Bill and debit note are in the same organization.
- Bill and debit note belong to the same supplier.
- Planned amount `250.0000` is less than or equal to debit note unapplied amount `460.0000`.
- Planned amount `250.0000` is less than or equal to bill balance due `1150.0000`.
- Active `PurchaseDebitNoteAllocation` count for the fixture is `0`.
- Supplier refund count for the fixture is `0`.
- Supplier payment count for the fixture is `0`.
- Fixture-specific generated document, email, ZATCA/output, purchase order, purchase receipt, stock movement, cash expense, and cleanup side effects remain absent.

## Expected Debit Note Effect

If Part 5 is approved and the state remains unchanged:

- `PDN-000003` remains `FINALIZED`.
- Total remains `460.0000`.
- Unapplied amount changes from `460.0000` to `210.0000`.
- Reversal journal remains absent.

## Expected Bill Effect

If Part 5 is approved and the state remains unchanged:

- `BILL-000008` remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due changes from `1150.0000` to `900.0000`.
- Reversal journal remains absent.

## Expected Allocation Effect

If Part 5 is approved and the state remains unchanged:

- Exactly one `PurchaseDebitNoteAllocation` is created for `250.0000`.
- The allocation links `PDN-000003` to `BILL-000008`.
- `reversedAt` remains absent.
- `reversedById` remains absent.
- `reversalReason` remains absent.
- No supplier payment allocation is created.
- No supplier refund is created.

## Expected Journal And Accounting Effect

Current code treats debit-note apply as matching-only:

- No new journal entry is expected.
- Purchase bill journal `JE-000053` remains unchanged and `POSTED`.
- Purchase debit note journal `JE-000054` remains unchanged and `POSTED`.
- No debit-note reversal journal is expected.
- No supplier refund or supplier payment journal is expected.
- Current organization journal count is `54`.
- `JOURNAL_ENTRY` sequence next value is `JE-000055`; it should remain unchanged by the apply mutation if the code path remains matching-only.

## Expected Audit Effect

Current code logs:

- `entityType: "PurchaseDebitNote"`.
- `action: "APPLY"`.
- `entityId: <PDN-000003 id>`.

The audit standardization map does not include `PurchaseDebitNote:APPLY`, so the expected current stored action is raw `APPLY`.

Expected absent audit side effects:

- no debit note reverse-allocation audit.
- no debit note void audit.
- no supplier refund audit.
- no supplier payment audit.
- no purchase bill void audit.
- no login/browser audit-writing flow.

## Expected Forbidden Side-Effect Non-Effects

Expected fixture-specific non-effects for Part 5:

- no generated document.
- no PDF/archive/export/download.
- no email outbox or provider event.
- no ZATCA signed artifact draft or submission log for this fixture.
- no supplier refund.
- no supplier payment.
- no purchase order.
- no purchase receipt.
- no stock movement.
- no cash expense.
- no cleanup deletion.
- no migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action.

## Blockers Or Deviations

- No blocker was found for applying `250.0000`.
- Current DEV-08B debit note total is `460.0000`, not the earlier Part 1 VAT-inclusive candidate `400.0000`; this Part 4 plan uses the exact Part 2/3 VAT-path evidence.
- Existing organization-level historical audit rows for supplier payments/refunds and cleanup are local baseline data from earlier fixture work. Fixture-scoped counts for this DEV-08B supplier, bill, and debit note remain zero.

## Required Approval Phrase For Part 5

`I approve DEV-08B Part 5 local-only purchase debit note apply-to-bill mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B debit note and purchase bill with amount 250.0000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08B Part 5: approved local debit note apply-to-bill mutation`
