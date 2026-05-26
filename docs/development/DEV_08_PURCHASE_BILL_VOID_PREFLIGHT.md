# DEV-08 Part 13 - Purchase Bill Void/Reversal Preflight

## Purpose And Scope

This is a read-only preflight and mutation plan for voiding/reversing `BILL-000007` after the DEV-08 supplier payment void completed. No purchase bill void, supplier payment void, allocation mutation, refund, debit note, output, email, ZATCA, migration, seed/reset/delete, deployment, environment change, or login/browser flow was run.

- Repository commit inspected: `144fca26 Void DEV-08 supplier payment`
- Local HEAD and `origin/main`: `144fca269e5ed08e900128178cf46a2ce0dbd9ef`
- Marker: `DEV08-AP-20260525T230000`
- Family: `ap`
- Target bill: `BILL-000007`
- Target supplier payment chain: `PAY-000006`

## Current Fixture Evidence

Read-only local SQL ran inside the local Docker Postgres container with `default_transaction_read_only = on` and `BEGIN READ ONLY`. The database target was classified as local Docker Postgres only:

- Docker engine: Linux, available.
- Local containers: `infra-postgres-1` and `infra-redis-1` healthy.
- Database: local container database `accounting`.
- No hosted, production, beta, shared, or customer-data target was used or printed.
- No database URL, tokens, cookies, auth headers, request/response bodies, vendor/customer data, signed XML, QR payloads, or document bodies were printed.

Supplier:

- Display label: `DEV08-AP-20260525T230000 Supplier`
- Safe id prefix: `0e36df97`
- Organization safe id prefix: `db69e5a8`
- Type: `SUPPLIER`
- Active: yes
- Supplier count for marker: `1`

Purchase bill:

- Bill number: `BILL-000007`
- Safe id prefix: `d81ddd60`
- Status: `FINALIZED`
- Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`
- Subtotal: `1000.0000`
- Tax: `150.0000`
- Total: `1150.0000`
- Balance due: `1150.0000`
- Purchase order link: absent
- Purchase bill reversal journal: absent

Purchase bill journal:

- Journal number: `JE-000049`
- Safe id prefix: `3dfa0a86`
- Status: `POSTED`
- Total debit: `1150.0000`
- Total credit: `1150.0000`
- Lines:
  - Debit account `111 Cash` for `1000.0000`
  - Debit account `230 VAT Receivable` for `150.0000`
  - Credit account `210 Accounts Payable` for `1150.0000`

Supplier payment:

- Payment number: `PAY-000006`
- Safe id prefix: `622ad0b6`
- Status: `VOIDED`
- Amount paid: `500.0000`
- Unapplied amount: `200.0000`
- `voidedAt`: set
- Original payment journal: `JE-000050`, safe id prefix `b77bd6f7`, status `REVERSED`
- Void reversal journal: `JE-000051`, safe id prefix `ebc58c26`, status `POSTED`
- Void reversal journal lines:
  - Debit account `112 Bank Account` for `500.0000`
  - Credit account `210 Accounts Payable` for `500.0000`

Allocations:

- Direct `SupplierPaymentAllocation`: count `1`, safe id prefix `6ec44d14`, amount `300.0000`
- Active direct allocation blocker count under purchase bill void code: `0`
- `SupplierPaymentUnappliedAllocation`: total count `1`, active count `0`, reversed count `1`, safe id prefix `a8ee4e23`, amount `200.0000`
- Active unapplied allocation blocker count under purchase bill void code: `0`
- Active purchase debit note allocation blocker count: `0`
- Supplier refunds sourced from `PAY-000006`: `0`
- Purchase debit notes for supplier: `0`

Other current checks:

- Purchase bill reversal count for `JE-000049`: `0`
- Fiscal period for current posting date: `2026`, status `OPEN`
- `JOURNAL_ENTRY` sequence: prefix `JE-`, next `52`
- `PAYMENT` sequence: prefix `PAY-`, next `7`

## Code Paths Inspected

- `apps/api/src/purchase-bills/purchase-bill.controller.ts`
  - `POST /purchase-bills/:id/void`
  - Requires `PERMISSIONS.purchaseBills.void`
  - Calls `purchaseBillService.void(organizationId, user.id, id)`
  - No request body or void DTO is used.
- `apps/api/src/purchase-bills/purchase-bill.service.ts`
  - `PurchaseBillService.void(organizationId, actorUserId, id)`
  - `assertPostingDateAllowed(...)`
  - `createOrReuseReversalJournal(...)`
- `apps/api/src/purchase-bills/purchase-bill-accounting.ts`
  - Confirmed original direct-mode bill posting direction.
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`
  - Confirms active supplier payment allocation blocker.
  - Confirms finalized bill void creates a reversal journal.
  - Confirms inventory-clearing void does not mutate stock movements.
- `apps/api/src/supplier-payments/supplier-payment.service.ts`
  - Confirmed Part 12 supplier payment void left direct allocation historical and restored bill balance.
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`
  - Confirms supplier payment void reverses payment journal and restores bill balances once.
- `apps/api/src/audit-log/audit-events.ts`
  - `PurchaseBill:VOID` maps to standardized `PURCHASE_BILL_VOIDED`.
- `apps/api/prisma/schema.prisma`
  - `PurchaseBill` supports `reversalJournalEntryId`; it does not store `voidedAt`, `voidedById`, or a void reason.
  - `SupplierPaymentAllocation` is historical and has no reversed flag.
  - `SupplierPaymentUnappliedAllocation` has `reversedAt`, `reversedById`, and `reversalReason`.

## Exact Blocker Analysis

Current `PurchaseBillService.void(...)` checks these blockers before voiding a finalized bill:

- Active direct supplier payment allocation blocker:
  - Counts `SupplierPaymentAllocation` rows where the linked payment status is not `VOIDED`.
  - Current count for `BILL-000007`: `0`.
  - The historical direct allocation `6ec44d14` is linked to `PAY-000006`, which is already `VOIDED`, so it does not block under current code.
- Active purchase debit note allocation blocker:
  - Counts unreversed `PurchaseDebitNoteAllocation` rows linked to finalized debit notes.
  - Current count for `BILL-000007`: `0`.
- Active supplier payment unapplied allocation blocker:
  - Counts unreversed `SupplierPaymentUnappliedAllocation` rows linked to posted supplier payments.
  - Current count for `BILL-000007`: `0`.
  - The only supplier payment unapplied allocation `a8ee4e23` is already reversed, so it does not block.
- Fiscal period blocker:
  - The service checks the void reversal posting date.
  - Current fiscal period for today is `2026:OPEN`.
- Supplier refunds:
  - `PurchaseBillService.void(...)` does not directly check supplier refunds.
  - Current fixture has no supplier refund sourced from `PAY-000006`.

Safety result: `BILL-000007` is safe to plan for Part 14 if these preflight values remain unchanged.

## Planned Part 14 Void

Exact service call shape:

```ts
await purchaseBillService.void(organizationId, actorUserId, billId);
```

DTO/body shape:

- None. Current controller and service do not accept a void DTO, reason, notes, `voidReason`, or `reversalReason`.
- The actor user id is supplied by the authenticated user context in the controller or resolved fixture actor in a guarded local script.

Target:

- Void only `BILL-000007`.
- Do not void or mutate `PAY-000006` again.
- Do not mutate allocations directly.
- Do not create supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA artifact, migration, seed/reset/delete, deployment, environment/provider/schema change, or cleanup deletion.

Required preconditions before mutation:

- Exact approval phrase is present.
- Marker is exactly `DEV08-AP-20260525T230000`.
- Family is exactly `ap`.
- Database target is confirmed local-only before importing write-capable services.
- Supplier `0e36df97` exists once, active `SUPPLIER`.
- `BILL-000007` safe prefix `d81ddd60` remains `FINALIZED`, total `1150.0000`, balance due `1150.0000`, reversal journal absent.
- `PAY-000006` safe prefix `622ad0b6` remains `VOIDED`, original journal `JE-000050` remains `REVERSED`, reversal journal `JE-000051` remains `POSTED`.
- Active direct supplier payment allocation blocker count remains `0`.
- Active supplier payment unapplied allocation blocker count remains `0`.
- Active purchase debit note allocation blocker count remains `0`.
- Supplier refund count remains `0`.
- Purchase bill void audit count for `BILL-000007` remains `0`.
- Fiscal period for the reversal date is open.

## Expected Future Effects If Approved

Purchase bill:

- `BILL-000007` changes from `FINALIZED` to `VOIDED`.
- Total remains historically `1150.0000`.
- Balance due changes from `1150.0000` to `0.0000` under current service behavior.
- `reversalJournalEntryId` is created and linked.
- Current schema does not store purchase bill `voidedAt`, `voidedById`, or void reason.
- Purchase order link remains absent.
- No generated document is created.

Allocation:

- No new `SupplierPaymentAllocation` is created.
- Historical direct `SupplierPaymentAllocation` `6ec44d14` remains historical for `300.0000`.
- Reversed `SupplierPaymentUnappliedAllocation` `a8ee4e23` remains reversed.
- No `PurchaseDebitNoteAllocation` is created.

Journal/accounting:

- Original purchase bill journal `JE-000049` is marked `REVERSED`.
- Expected new reversal journal is `JE-000052` if the sequence remains unchanged.
- Reversal journal reverses the original bill journal:
  - Debit account `210 Accounts Payable` for `1150.0000`
  - Credit account `111 Cash` for `1000.0000`
  - Credit account `230 VAT Receivable` for `150.0000`
- Reversal journal is balanced and `POSTED`.
- Supplier payment journal `JE-000050` remains `REVERSED`.
- Supplier payment void reversal journal `JE-000051` remains `POSTED`.
- No new supplier payment, supplier refund, debit note, purchase order, purchase receipt, stock movement, cash expense, or output journal is created.
- `JOURNAL_ENTRY` sequence is expected to move from next `52` to next `53` if unchanged at mutation time.

Audit:

- One standardized `PURCHASE_BILL_VOIDED` audit action is expected for `BILL-000007`.
- No additional `SUPPLIER_PAYMENT_VOIDED` audit is expected.
- No supplier refund, purchase debit note, cash expense, purchase order, cleanup/delete, or login/browser audit-writing action is expected.
- Note: the AP-ready local organization has older organization-level audit baseline rows. Fixture-specific audit counts must be checked by target entity id.

Forbidden side-effect non-effects:

- Generated documents for the payment or bill remain `0`.
- Email outbox rows and provider events for the marker remain `0`.
- Organization-level ZATCA baselines should remain unchanged from current local-only values: `1` signed artifact draft and `7` submission logs.
- Fixture-specific supplier refunds, purchase debit notes, purchase orders, purchase receipts, linked stock movements, cash expenses, inventory variance proposals, and cleanup/delete audit actions remain `0`.

## Commands Run

- `git fetch origin main`
- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git branch --show-current`
- `Get-Content` and `rg` reads for requested DEV-08 evidence docs, handoff, purchase bill service/controller/accounting/DTO/spec paths, supplier payment service/spec paths, audit mapping, Prisma schema, README, and BUG_AUDIT.
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`
- `docker compose -f infra/docker-compose.yml ps`
- Read-only local SQL checks through `docker exec -i infra-postgres-1 psql ...` with `default_transaction_read_only = on` and `BEGIN READ ONLY`.

## Commands Skipped And Why

- `PurchaseBillService.void(...)` was skipped because this task is read-only preflight only.
- Supplier payment void, supplier payment creation, supplier payment apply/reverse-unapplied, purchase bill mutation, supplier refund/debit-note workflows, PDF/archive/export/download routes, email, ZATCA, migrations, seed/reset/delete, deploys, environment/provider changes, backup/restore, login/browser flows, smoke, E2E, full tests, and full build were skipped because they are explicitly out of scope.

## Blockers Or Deviations

- No current mutation blocker was found for `BILL-000007`.
- Current code does not support a purchase bill void DTO, reason, `voidedAt`, or `voidedById`.
- Historical direct supplier payment allocations remain records; current purchase bill void code ignores them only when their linked payment is already `VOIDED`.
- The AP-ready local organization has existing local-only ZATCA and audit baseline rows, so future evidence should use fixture-specific counts and entity-id checks.

## Required Approval Phrase For Part 14

`I approve DEV-08 Part 14 local-only purchase bill void/reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 after supplier payment void/reversal completed. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08 Part 14: approved local purchase bill void/reversal mutation`

## Part 14 Evidence Note

DEV-08 Part 14 approved local purchase bill void/reversal mutation completed. Evidence is recorded in [docs/development/DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).

- Mutation performed: yes, exactly one `PurchaseBillService.void(...)` call for `BILL-000007`.
- Result: `BILL-000007` changed from `FINALIZED` to `VOIDED`, balance due changed `1150.0000 -> 0.0000`, original bill journal `JE-000049` changed to `REVERSED`, and reversal journal `JE-000052` posted.
- Supplier payment chain remained unchanged from Part 12: `PAY-000006` remained `VOIDED`, `JE-000050` remained `REVERSED`, and `JE-000051` remained `POSTED`.
- No output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup side effect occurred for the fixture.
