# DEV-08 Supplier Payment Unapplied Allocation Preflight

## Purpose And Scope

DEV-08 Part 7 performed a read-only preflight and mutation plan for applying the remaining unapplied amount on the DEV-08 supplier payment to `BILL-000007`.

No supplier payment unapplied allocation, supplier payment creation, allocation reversal, supplier payment void, purchase bill mutation, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA artifact, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.

## Latest Commit Inspected

- Branch: `main`.
- Local `HEAD`: `f80f5b4f5563b8087c7f2967ee094946cf51c34d`.
- `origin/main`: `f80f5b4f5563b8087c7f2967ee094946cf51c34d`.
- Latest commit: `f80f5b4f Verify DEV-08 supplier payment evidence`.
- Existing unrelated untracked files remained limited to web/marketing and graphify paths and were not staged or modified by this preflight.

## Current Payment And Bill Evidence

Marker: `DEV08-AP-20260525T230000`.

Family: `ap`.

Read-only SQL confirmed:

- Supplier count: `1`.
- Supplier display label: `DEV08-AP-20260525T230000 Supplier`.
- Supplier safe id prefix: `0e36df97`.
- Supplier type: `SUPPLIER`.
- Supplier active: `true`.
- Organization safe id prefix: `db69e5a8`.
- Supplier payment count: `1`.
- Supplier payment number: `PAY-000006`.
- Supplier payment safe id prefix: `622ad0b6`.
- Supplier payment status: `POSTED`.
- Amount paid: `500.0000`.
- Unapplied amount: `200.0000`.
- Paid-through account: `112`, safe id prefix `32ab6f4d`.
- Supplier payment journal: `JE-000050`, safe id prefix `b77bd6f7`.
- Supplier payment void reversal journal: absent.
- Purchase bill: `BILL-000007`, safe id prefix `d81ddd60`.
- Purchase bill status: `FINALIZED`.
- Purchase bill total: `1150.0000`.
- Purchase bill balance due: `850.0000`.
- Purchase bill reversal journal: absent.
- Payment and bill belong to the same supplier and organization.
- Direct `SupplierPaymentAllocation` count: `1`.
- Direct allocation safe id prefix: `6ec44d14`.
- Direct allocation amount: `300.0000`.
- `SupplierPaymentUnappliedAllocation` count for the fixture: `0`.
- Active `SupplierPaymentUnappliedAllocation` count for the fixture: `0`.
- `PurchaseDebitNoteAllocation` count for `BILL-000007`: `0`.

## Local-Only Safety Proof

- Docker engine reported Linux mode and server version `28.5.1`.
- Local compose services were healthy:
  - `infra-postgres-1` on local port `5432`.
  - `infra-redis-1` on local port `6379`.
- Preflight used only read-only SQL through the local compose Postgres container.
- No hosted database target, production, beta/user-testing, shared, or customer-data target was used.
- No database URL, token, cookie, auth header, request/response body, generated document body, signed XML, QR payload, or attachment body is recorded in this preflight.

## Code Paths Inspected

Inspected:

- `apps/api/src/supplier-payments/supplier-payment.controller.ts`.
- `apps/api/src/supplier-payments/supplier-payment.service.ts`.
- `apps/api/src/supplier-payments/dto/apply-unapplied-supplier-payment.dto.ts`.
- `apps/api/src/supplier-payments/dto/reverse-unapplied-supplier-payment-allocation.dto.ts`.
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`.
- `apps/api/src/purchase-bills/purchase-bill.service.ts`.
- `apps/api/prisma/schema.prisma`.
- `apps/api/src/audit-log/audit-events.ts`.
- `README.md`.
- `BUG_AUDIT.md`.

Observed route and permission:

- `POST /supplier-payments/:id/apply-unapplied`.
- Controller method: `SupplierPaymentController.applyUnapplied(...)`.
- Required permission: `PERMISSIONS.supplierPayments.create`.
- Service method: `SupplierPaymentService.applyUnapplied(organizationId, actorUserId, id, dto)`.

Observed DTO:

```ts
export class ApplyUnappliedSupplierPaymentDto {
  billId!: string;
  amountApplied!: string;
}
```

Validation decorators require:

- `billId`: UUID.
- `amountApplied`: decimal string with up to 4 decimal places.

Observed service behavior:

- `amountApplied` must be positive.
- Supplier payment must exist in the same organization.
- Supplier payment must be `POSTED`.
- `amountApplied` cannot exceed `SupplierPayment.unappliedAmount`.
- Purchase bill must exist in the same organization.
- Purchase bill must belong to the same supplier as the supplier payment.
- Purchase bill must be `FINALIZED`.
- `amountApplied` cannot exceed `PurchaseBill.balanceDue`.
- The service decrements `SupplierPayment.unappliedAmount`.
- The service decrements `PurchaseBill.balanceDue`.
- The service creates one `SupplierPaymentUnappliedAllocation`.
- The service does not create a `JournalEntry`; the code comment states the apply-unapplied path is matching-only because the original supplier payment already posted Dr AP / Cr cash-bank.
- The service logs audit action `APPLY_UNAPPLIED` with entity type `SupplierPayment`.

Audit mapping finding:

- `audit-events.ts` maps `SupplierPayment:CREATE` to `SUPPLIER_PAYMENT_CREATED`.
- `audit-events.ts` maps `SupplierPayment:VOID` to `SUPPLIER_PAYMENT_VOIDED`.
- `audit-events.ts` does not currently map `SupplierPayment:APPLY_UNAPPLIED`.
- Expected Part 8 audit action is therefore raw `APPLY_UNAPPLIED` unless code changes before mutation.

## Exact Planned Allocation

Future Part 8 should apply exactly `200.0000` from the existing supplier payment unapplied amount to `BILL-000007`.

Planned target records:

- Supplier payment: `PAY-000006`, safe id prefix `622ad0b6`.
- Purchase bill: `BILL-000007`, safe id prefix `d81ddd60`.
- Amount applied: `200.0000`.

Do not create a second supplier payment, reverse an allocation, void a payment, void a bill, create a supplier refund, create a purchase debit note, create output, send email, create ZATCA artifacts, or mutate the invoice/bill directly.

## Exact DTO And Service Call Shape

Do not invent unsupported fields. Current service call shape:

```ts
await supplierPaymentService.applyUnapplied(organizationId, actorUserId, supplierPaymentId, {
  billId: "<BILL-000007 id resolved at mutation time; safe prefix d81ddd60>",
  amountApplied: "200.0000",
});
```

Equivalent API route:

```http
POST /supplier-payments/:id/apply-unapplied
Content-Type: application/json

{
  "billId": "<BILL-000007 id>",
  "amountApplied": "200.0000"
}
```

Unsupported or unnecessary fields for this DTO:

- `purchaseBillId`.
- `amount`.
- `reason`.
- `notes`.
- `reference`.
- `branchId`.

## Preconditions Required Before Mutation

Part 8 must stop before mutation if any of these differ:

- Exact approval phrase is present.
- Marker is exactly `DEV08-AP-20260525T230000`.
- Family is exactly `ap`.
- Database target is proven local-only before importing write-capable services.
- Supplier `0e36df97` exists, is active, and is type `SUPPLIER`.
- Supplier payment `PAY-000006`, safe prefix `622ad0b6`, exists in the same local organization.
- Supplier payment status is `POSTED`.
- Supplier payment amount paid is `500.0000`.
- Supplier payment unapplied amount is `200.0000`.
- Supplier payment journal remains `JE-000050`.
- Supplier payment void reversal journal is absent.
- `BILL-000007`, safe prefix `d81ddd60`, exists for the same supplier and organization.
- `BILL-000007` remains `FINALIZED`.
- `BILL-000007` total remains `1150.0000`.
- `BILL-000007` balance due remains `850.0000`.
- `BILL-000007` reversal journal remains absent.
- One direct `SupplierPaymentAllocation` remains for `300.0000`.
- No active or historical `SupplierPaymentUnappliedAllocation` exists yet for this fixture.
- No `PurchaseDebitNoteAllocation` exists for `BILL-000007`.
- Amount `200.0000` does not exceed supplier payment unapplied amount.
- Amount `200.0000` does not exceed bill balance due.
- No forbidden side-effect rows are linked to the fixture.

Current read-only sequence state:

- `PAYMENT` sequence: prefix `PAY-`, next number `7`, padding `6`.
- `JOURNAL_ENTRY` sequence: prefix `JE-`, next number `51`, padding `6`.
- Because the apply-unapplied path is matching-only, Part 8 should not advance either sequence.

## Expected Payment Effect

If Part 8 is approved and the preconditions still match:

- `PAY-000006` remains `POSTED`.
- Amount paid remains `500.0000`.
- Unapplied amount changes `200.0000 -> 0.0000`.
- Paid-through account remains `112`.
- Journal remains `JE-000050`.
- Void reversal journal remains absent.
- No supplier refund source claim is created.

## Expected Bill Effect

Expected `BILL-000007` state after Part 8:

- Status remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due changes `850.0000 -> 650.0000`.
- Purchase bill finalization journal `JE-000049` remains unchanged.
- Reversal journal remains absent.
- One direct `SupplierPaymentAllocation` remains for `300.0000`.
- One new `SupplierPaymentUnappliedAllocation` exists for `200.0000`.
- No purchase debit-note allocation exists.

## Expected Allocation Effect

Expected allocation state:

- Direct `SupplierPaymentAllocation` `6ec44d14` remains historical and unchanged for `300.0000`.
- Exactly one `SupplierPaymentUnappliedAllocation` is created for `200.0000`.
- The new unapplied allocation links `PAY-000006` to `BILL-000007`.
- `reversedAt` is absent.
- `reversedById` is absent.
- `reversalReason` is absent.
- No purchase debit-note allocation is created.

## Expected Journal And Accounting Effect

Expected accounting result:

- No new `JournalEntry` is created.
- `JE-000049` remains `POSTED`, reference `BILL-000007`, and remains balanced with debit `111` `1000.0000`, debit `230` `150.0000`, and credit `210` `1150.0000`.
- `JE-000050` remains `POSTED`, reference `PAY-000006`, and remains balanced with debit `210` `500.0000` and credit `112` `500.0000`.
- No purchase bill reversal journal is created.
- No supplier payment void reversal journal is created.
- `JOURNAL_ENTRY` sequence should remain next `51` if safely checkable after mutation.

## Expected Audit Effect

Expected Part 8 audit result:

- One raw `APPLY_UNAPPLIED` audit action for entity type `SupplierPayment` and entity id `PAY-000006`.
- Existing `SUPPLIER_PAYMENT_CREATED` remains exactly once for `PAY-000006`.
- No standardized supplier-payment apply-unapplied audit mapping exists yet.
- No `SUPPLIER_PAYMENT_VOIDED` audit.
- No reverse-unapplied audit for the new allocation.
- No supplier refund audit.
- No purchase debit note audit.
- No purchase bill void audit.
- No login/browser audit-writing flow.

Note: the selected fake local AP-ready organization has unrelated baseline AP data. Part 7 read-only SQL saw an organization-level `SupplierPaymentUnappliedAllocation` reverse audit row unrelated to this fixture. Fixture-specific evidence remains clean because no `SupplierPaymentUnappliedAllocation` exists for `PAY-000006` and `BILL-000007` yet.

## Expected Forbidden Side-Effect Non-Effects

Part 8 must verify no:

- Generated document.
- Supplier payment receipt PDF/archive.
- Export/download.
- Email outbox/provider event.
- ZATCA XML/signing/QR/submission artifact.
- Supplier refund.
- Purchase debit note.
- Purchase order.
- Purchase receipt.
- Stock movement.
- Cash expense.
- Cleanup deletion.
- Migration.
- Seed/reset/delete.
- Deploy.
- Environment/provider/schema change.
- Production/beta/shared/customer-data action.

## Current Forbidden Side-Effect Baseline

Fixture-specific read-only counts are currently:

| Check | Count |
| --- | ---: |
| Supplier refunds for supplier | `0` |
| Purchase debit notes for supplier or bill | `0` |
| Purchase debit-note allocations for bill | `0` |
| Purchase orders for supplier | `0` |
| Purchase receipts for supplier or bill | `0` |
| Stock movements for bill/payment marker or ids | `0` |
| Cash expenses for supplier | `0` |
| Generated documents for bill | `0` |
| Generated documents for payment | `0` |
| Email outbox rows for marker, bill, or payment | `0` |
| Cleanup/delete audit actions for fixture | `0` |

Current organization-level baseline rows remain non-zero for existing local AP/ZATCA data:

- ZATCA signed artifact drafts: `1`.
- ZATCA submission logs: `7`.

Future Part 8 evidence must compare before/after counts carefully because the selected fake local AP-ready organization is not a zero-baseline organization.

## Blockers Or Deviations

- No blocker was found for the planned supplier payment unapplied allocation.
- The apply-unapplied audit action is raw `APPLY_UNAPPLIED`, not standardized, under the current audit mapping.
- The selected fake local AP-ready organization has existing unrelated local AP/ZATCA baseline rows, so mutation evidence must compare fixture-specific rows and before/after organization baseline counts.

## Required Approval Phrase For Part 8

`I approve DEV-08 Part 8 local-only supplier payment unapplied allocation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active supplier payment unapplied amount 200.0000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08 Part 8: approved local supplier payment unapplied allocation mutation`

## Part 8 Mutation Evidence Note

DEV-08 Part 8 completed the approved local-only supplier payment unapplied allocation mutation. Evidence is recorded in [DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md).

- Mutation performed: yes. `SupplierPaymentService.applyUnapplied(...)` was called exactly once for `PAY-000006`.
- Payment result: `PAY-000006` remained `POSTED`, safe id prefix `622ad0b6`, amount paid remained `500.0000`, unapplied amount changed `200.0000 -> 0.0000`, journal remained `JE-000050`, and void reversal journal remained absent.
- Bill result: `BILL-000007` remained `FINALIZED`, safe id prefix `d81ddd60`, total remained `1150.0000`, balance due changed `850.0000 -> 650.0000`, and reversal journal remained absent.
- Allocation result: the direct `SupplierPaymentAllocation` remained one historical allocation for `300.0000`; one `SupplierPaymentUnappliedAllocation` was created for `200.0000`, safe id prefix `a8ee4e23`, with reversal metadata absent.
- Accounting result: no new journal was created, `JE-000049` and `JE-000050` remained posted and unchanged, `JOURNAL_ENTRY` sequence remained next `51`, and `PAYMENT` sequence remained next `7`.
- Audit result: raw `SupplierPayment:APPLY_UNAPPLIED` exists once; no supplier payment void, fixture unapplied reverse, supplier refund, purchase debit note, or purchase bill void audit was created.
- Forbidden side effects: no generated document, PDF/archive/export/download, email, ZATCA change, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, fixture cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.
- Exact next prompt title: `DEV-08 Part 9: supplier payment unapplied allocation reversal preflight`.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` and `rg` reads for the requested DEV-08 evidence, preflight, handoff, README, BUG_AUDIT, supplier payment, purchase bill, audit, and Prisma schema paths.
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`.
- `docker compose -f infra/docker-compose.yml ps`.
- Local compose Postgres read-only SQL verification through `psql`.

## Commands Skipped And Why

- Supplier payment unapplied allocation mutation, supplier payment creation, allocation reversal, supplier payment void, purchase bill mutation, purchase bill void, supplier refund/debit-note workflows, PDF/archive/export/download routes, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, backup/restore, and production-hosting research: explicitly out of scope.
- Full tests, full build, smoke, and E2E: explicitly out of scope for this read-only preflight.
- API/package typecheck and targeted tests: skipped because no production code or tests changed.
