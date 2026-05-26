# DEV-08B Debit Note Allocation Reversal Preflight

## Purpose And Scope

DEV-08B Part 7 performed a read-only preflight and mutation plan for reversing the active DEV-08B `PurchaseDebitNoteAllocation` created in DEV-08B Part 5.

Planned future mutation only: reverse the active `250.0000` purchase debit note allocation that links `PDN-000003` to `BILL-000008`.

Mutation performed: no.

No debit-note allocation reversal, debit-note apply, debit-note void, supplier refund workflow, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow was run.

## Latest Commit Inspected

- `096af226 Verify DEV-08B debit note application evidence`.
- Local `HEAD` matched `origin/main` at `096af226cb0051d4a52f1f8bfa458a3800ba43e6`.
- Branch: `main`.

## Current Debit Note, Bill, And Allocation Evidence

Marker: `DEV08B-AP-20260526T060000`.

Supplier:

- Label: `DEV08B-AP-20260526T060000 Supplier`.
- Safe id prefix: `d11c76db`.
- Type: `SUPPLIER`.
- Active: `true`.
- Fake local AP-ready organization safe id prefix: `db69e5a8`.

Purchase bill:

- Bill number: `BILL-000008`.
- Safe id prefix: `4b8886bb`.
- Status: `FINALIZED`.
- Mode: `DIRECT_EXPENSE_OR_ASSET`.
- Subtotal: `1000.0000`.
- VAT: `150.0000`.
- Total: `1150.0000`.
- Balance due: `900.0000`.
- Reversal journal: absent.
- Purchase order link: absent.
- Supplier payment allocations: `0`.
- Supplier payment unapplied allocations: `0`.

Purchase debit note:

- Debit note number: `PDN-000003`.
- Safe id prefix: `b93f96ee`.
- Status: `FINALIZED`.
- Linked original bill: `BILL-000008`.
- Subtotal: `400.0000`.
- VAT: `60.0000`.
- Total: `460.0000`.
- Unapplied amount: `210.0000`.
- Reversal journal: absent.
- Supplier refunds: `0`.

Active allocation:

- Exactly one `PurchaseDebitNoteAllocation` exists.
- Safe id prefix: `7ec0dfb3`.
- Amount applied: `250.0000`.
- Links `PDN-000003` to `BILL-000008`.
- Active/unreversed: yes.
- `reversedAt`: absent.
- `reversedById`: absent.
- `reversalReason`: absent.

Current journal baseline:

- Purchase bill journal: `JE-000053`, safe id prefix `950b8a43`, `POSTED`, balanced with debit `111` `1000.0000`, debit `230` `150.0000`, and credit `210` `1150.0000`.
- Purchase debit note journal: `JE-000054`, safe id prefix `670f7dc0`, `POSTED`, balanced with debit `210` `460.0000`, credit `111` `400.0000`, and credit `230` `60.0000`.
- Organization journal count: `54`.
- `JOURNAL_ENTRY` sequence next number: `JE-000055`.

Current audit baseline:

- `Contact:CREATE`.
- `PurchaseBill:PURCHASE_BILL_CREATED`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`.
- `PurchaseDebitNote:APPLY`.
- Fixture-specific `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`: `0`.

## Local-Only Safety Proof

- Docker engine was available: Docker server `28.5.1`, OS type `linux`.
- Local containers were healthy:
  - `infra-postgres-1`, local port `5432`, healthy.
  - `infra-redis-1`, local port `6379`, healthy.
- `Test-NetConnection localhost:5432` returned `TcpTestSucceeded=True`.
- `Test-NetConnection localhost:6379` returned `TcpTestSucceeded=True`.
- The read-only inline Prisma preflight classified the database target before importing Prisma or opening a connection:
  - protocol: `postgresql`.
  - host: `localhost`.
  - port: `5432`.
  - database name: `accounting`.
  - accepted local-only target: yes.
- The script rejected hosted/prod/beta/shared/customer-data target patterns before connecting.
- No database URL, credential, token, cookie, auth header, request/response body, vendor/customer data, signed XML, QR payload, document body, or attachment body was printed.

## Code Paths Inspected

- `apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`.
- `apps/api/src/purchase-debit-notes/dto/apply-purchase-debit-note.dto.ts`.
- `apps/api/src/purchase-debit-notes/dto/reverse-purchase-debit-note-allocation.dto.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts`.
- `apps/api/src/purchase-bills/purchase-bill.service.ts`.
- `apps/api/src/audit-log/audit-events.ts`.
- `apps/api/src/audit-log/audit-log.service.ts`.
- `apps/api/prisma/schema.prisma`.
- `README.md`.
- `BUG_AUDIT.md`.

## Exact Planned Reversal

Future mutation target:

- Debit note: `PDN-000003`.
- Debit note safe id prefix: `b93f96ee`.
- Bill: `BILL-000008`.
- Bill safe id prefix: `4b8886bb`.
- Allocation safe id prefix: `7ec0dfb3`.
- Reversal amount: `250.0000`.
- Reversal reason: `DEV-08B local-only debit note allocation reversal QA`.

## Exact DTO And Service Call Shape

Controller route:

- `POST /purchase-debit-notes/:id/allocations/:allocationId/reverse`.
- Permission guard: `PERMISSIONS.purchaseDebitNotes.void`.

Service method:

```ts
PurchaseDebitNoteService.reverseAllocation(
  organizationId,
  actorUserId,
  debitNoteId,
  allocationId,
  { reason: "DEV-08B local-only debit note allocation reversal QA" },
);
```

DTO:

```ts
{
  reason?: string;
}
```

No `amount`, `amountApplied`, `billId`, `purchaseBillId`, `notes`, or UI-only field is supported by the reverse-allocation DTO.

## Preconditions Required Before Mutation

- Marker is exactly `DEV08B-AP-20260526T060000`.
- Database target is local-only `localhost:5432`, database `accounting`, with forbidden hosted/prod/beta/shared/customer-data patterns rejected before any write-capable service use.
- Supplier safe id prefix remains `d11c76db`, active `SUPPLIER`, in fake local AP-ready organization safe prefix `db69e5a8`.
- `PDN-000003` remains `FINALIZED`, total `460.0000`, unapplied amount `210.0000`, reversal journal absent, and supplier refunds `0`.
- `BILL-000008` remains `FINALIZED`, total `1150.0000`, balance due `900.0000`, reversal journal absent.
- Exactly one allocation exists, safe id prefix `7ec0dfb3`, amount applied `250.0000`, active/unreversed.
- `reversedAt`, `reversedById`, and `reversalReason` remain absent before mutation.
- No supplier refund exists.
- No forbidden fixture side effect has occurred since Part 6.

## Expected Debit Note Effect

- `PDN-000003` remains `FINALIZED`.
- Total remains `460.0000`.
- Unapplied amount increases from `210.0000` to `460.0000`.
- Reversal journal remains absent.

## Expected Bill Effect

- `BILL-000008` remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due increases from `900.0000` to `1150.0000`.
- Reversal journal remains absent.

## Expected Allocation Effect

- The existing `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` is marked reversed.
- `reversedAt` is set.
- `reversedById` is set.
- `reversalReason` is set to `DEV-08B local-only debit note allocation reversal QA`.
- No new `PurchaseDebitNoteAllocation` is created.
- No `SupplierPaymentAllocation` is created.
- No supplier refund is created.

## Expected Journal And Accounting Effect

- No new `JournalEntry` should be created because current code treats debit-note allocation reversal as matching-state restoration only.
- Purchase debit note journal `JE-000054` remains `POSTED` and unchanged.
- Purchase bill journal `JE-000053` remains `POSTED` and unchanged.
- Organization journal count should remain `54`.
- `JOURNAL_ENTRY` sequence should remain `JE-000055`.
- No debit note reversal journal, purchase bill reversal journal, supplier refund journal, or supplier payment journal is expected.

## Expected Audit Effect

- One audit action is expected for the reversal:
  - entity type: `PurchaseDebitNoteAllocation`.
  - action: `REVERSE_ALLOCATION`.
- Current audit mapping does not standardize `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`, so the expected stored action is raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`.
- No `PurchaseDebitNote:VOID`, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action is expected.

## Expected Forbidden Side-Effect Non-Effects

The future mutation must still produce no:

- generated document.
- PDF/archive/export/download.
- email outbox row or provider event.
- ZATCA XML/signing/QR/submission artifact.
- supplier refund.
- supplier payment.
- purchase order.
- purchase receipt.
- stock movement.
- cash expense.
- cleanup deletion.
- migration.
- seed/reset/delete.
- deploy.
- environment/provider/schema change.
- production, beta, shared-target, or customer-data action.

Current fixture-specific side-effect counts are `0` for supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and fixture cleanup/delete audits. Organization-level local ZATCA baselines remain `1` signed artifact draft and `7` submission logs from existing AP-ready fixture data.

## Blockers Or Deviations

- No blocker was found for the planned reversal if the Part 8 preconditions remain unchanged.
- The audit action is raw/unstandardized because `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` is not mapped in `audit-events.ts`.
- A first read-only Part 7 audit query was too broad and surfaced an unrelated organization-level allocation reversal audit; it was rerun scoped to the exact DEV-08B entity ids and confirmed fixture-specific reverse-allocation audit count `0`.
- No database mutation was performed.

## Required Approval Phrase For Part 8

`I approve DEV-08B Part 8 local-only purchase debit note allocation reversal mutation under marker DEV08B-AP-20260526T060000 for the active 250.0000 debit note allocation. No production, no beta, no customer data.`

## Part 8 Evidence Note

- DEV-08B Part 8 approved local debit note allocation reversal mutation is recorded in [DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).
- Mutation performed in Part 8: yes, exactly one `PurchaseDebitNoteService.reverseAllocation(...)` call for allocation safe id prefix `7ec0dfb3`.
- `PDN-000003` remained `FINALIZED`; unapplied amount changed `210.0000 -> 460.0000`.
- `BILL-000008` remained `FINALIZED`; balance due changed `900.0000 -> 1150.0000`.
- Allocation `7ec0dfb3` was marked reversed with reversal reason `DEV-08B local-only debit note allocation reversal QA`.
- Journal count remained `54` and `JOURNAL_ENTRY` sequence remained `JE-000055`.
- Raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` audit was created.
- No output/email/ZATCA/refund/payment/purchase-order/inventory/cash-expense/cleanup side effect occurred.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08B evidence/preflight, purchase debit note, purchase bill, Prisma schema, audit events/service, README, and BUG_AUDIT paths.
- `docker info --format ...`.
- `docker ps --format ...`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- Read-only inline Prisma preflight scripts from `apps/api`.

## Commands Skipped

- Debit note allocation reversal mutation.
- Debit note apply.
- Debit note void.
- Supplier refund workflows.
- Supplier payment workflows.
- Purchase bill mutation.
- PDF/archive/export/download routes.
- Email.
- ZATCA.
- Full tests.
- Full build.
- E2E.
- Smoke.
- Migrations.
- Seed/reset/delete.
- Deploys.
- Environment changes.
- Login/browser flows.
- Backup/restore.
- Production-hosting research.

## Exact Next Prompt Title

`DEV-08B Part 8: approved local debit note allocation reversal mutation`
