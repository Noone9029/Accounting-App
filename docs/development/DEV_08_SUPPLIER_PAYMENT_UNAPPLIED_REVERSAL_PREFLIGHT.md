# DEV-08 Supplier Payment Unapplied Allocation Reversal Preflight

## Purpose and scope

This is DEV-08 Part 9: a read-only preflight and mutation plan for reversing the active `SupplierPaymentUnappliedAllocation` created in DEV-08 Part 8.

No mutation was performed. `SupplierPaymentService.reverseUnappliedAllocation(...)` was not called.

Planned future mutation: reverse exactly the active `200.0000` supplier payment unapplied allocation linked to:

- Supplier payment: `PAY-000006`
- Purchase bill: `BILL-000007`
- Marker: `DEV08-AP-20260525T230000`
- Family: `ap`

Planned reversal reason:

```text
DEV-08 local-only reversal QA for supplier payment unapplied allocation
```

## Latest commit inspected

- `440cf3f6 Apply DEV-08 supplier payment unapplied amount`
- `HEAD` matched `origin/main`: `440cf3f63174d5188668711a32c345028345b002`
- Branch inspected: `main`

Unrelated untracked worktree entries remained present and untouched:

- `apps/graphify-out/`
- `apps/web/src/app/ar/`
- `apps/web/src/app/marketing.test.tsx`
- `apps/web/src/app/pricing/`
- `apps/web/src/app/product/`
- `apps/web/src/app/readiness/`
- `apps/web/src/app/resources/`
- `apps/web/src/app/workflows/`
- `apps/web/src/components/marketing/`
- `graphify-out/`

## Current payment, bill, and allocation evidence

Read-only local SQL confirmed the DEV-08 fixture state.

Supplier:

- Display label: `DEV08-AP-20260525T230000 Supplier`
- Safe id prefix: `0e36df97`
- Type: `SUPPLIER`
- Active: `true`
- Organization safe id prefix: `db69e5a8`

Supplier payment:

- Count: `1`
- Payment number: `PAY-000006`
- Safe id prefix: `622ad0b6`
- Status: `POSTED`
- Amount paid: `500.0000`
- Unapplied amount: `0.0000`
- Journal safe id prefix: `b77bd6f7`
- Void reversal journal: absent

Purchase bill:

- Count: `1`
- Bill number: `BILL-000007`
- Safe id prefix: `d81ddd60`
- Status: `FINALIZED`
- Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`
- Subtotal: `1000.0000`
- Tax total: `150.0000`
- Total: `1150.0000`
- Balance due: `650.0000`
- Reversal journal: absent

Direct supplier payment allocation:

- Count: `1`
- Safe id prefix: `6ec44d14`
- Amount applied: `300.0000`

Supplier payment unapplied allocation:

- Total count: `1`
- Active count: `1`
- Reversed count: `0`
- Active safe id prefix: `a8ee4e23`
- Active amount: `200.0000`
- `reversedAt`: absent
- `reversedById`: absent
- `reversalReason`: absent

## Local-only safety proof, redacted

- Docker engine was available locally: Linux engine, Docker `28.5.1`.
- Local containers were healthy:
  - `infra-postgres-1`, local port `5432`
  - `infra-redis-1`, local port `6379`
- The verification used `docker exec` into the local `infra-postgres-1` container and `BEGIN READ ONLY`.
- No database URL, credentials, tokens, cookies, auth headers, request/response bodies, vendor data, document bodies, signed XML, or QR payloads were printed.
- No hosted database target, production, beta, staging, user-testing, shared, or customer-data target was used.

## Code paths inspected

Files inspected:

- `apps/api/src/supplier-payments/supplier-payment.controller.ts`
- `apps/api/src/supplier-payments/supplier-payment.service.ts`
- `apps/api/src/supplier-payments/dto/reverse-unapplied-supplier-payment-allocation.dto.ts`
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`
- `apps/api/src/purchase-bills/purchase-bill.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/audit-log/audit-events.ts`

Controller behavior:

- Route: `POST /supplier-payments/:id/unapplied-allocations/:allocationId/reverse`
- Permission guard: `PERMISSIONS.supplierPayments.void`
- Calls:

```ts
this.supplierPaymentService.reverseUnappliedAllocation(organizationId, user.id, id, allocationId, dto);
```

DTO behavior:

```ts
export class ReverseUnappliedSupplierPaymentAllocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
```

Service behavior:

- Loads `SupplierPaymentUnappliedAllocation` scoped by `organizationId`, `paymentId`, and `allocationId`.
- Includes linked supplier payment and purchase bill.
- Rejects missing allocation.
- Rejects already reversed allocation.
- Requires supplier payment status `POSTED`.
- Requires purchase bill status `FINALIZED`.
- Verifies restoring payment unapplied amount will not exceed amount paid.
- Verifies restoring bill balance due will not exceed bill total.
- Marks the unapplied allocation reversed with `reversedAt`, `reversedById`, and optional `reversalReason`.
- Increments supplier payment `unappliedAmount` by the allocation amount.
- Increments purchase bill `balanceDue` by the allocation amount.
- Returns the updated supplier payment with the normal include shape.
- Does not create a journal entry; code comments describe this as matching-state restoration only.
- Logs audit action `REVERSE_UNAPPLIED_ALLOCATION` with entity type `SupplierPaymentUnappliedAllocation`.

Audit mapping finding:

- `audit-events.ts` standardizes `SupplierPayment:CREATE` and `SupplierPayment:VOID`.
- It does not currently standardize `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION`.
- Expected Part 10 audit effect is therefore one raw `REVERSE_UNAPPLIED_ALLOCATION` action unless the audit mapping is changed before then.

## Exact planned reversal

Future Part 10 should reverse only:

- Payment: `PAY-000006`, safe id prefix `622ad0b6`
- Bill: `BILL-000007`, safe id prefix `d81ddd60`
- Active unapplied allocation: safe id prefix `a8ee4e23`
- Amount: `200.0000`

Reason:

```text
DEV-08 local-only reversal QA for supplier payment unapplied allocation
```

Do not reverse the direct `300.0000` `SupplierPaymentAllocation`.
Do not void the supplier payment.
Do not mutate the purchase bill directly.

## Exact DTO and service call shape

Supported route payload:

```json
{
  "reason": "DEV-08 local-only reversal QA for supplier payment unapplied allocation"
}
```

Service call shape:

```ts
await supplierPaymentService.reverseUnappliedAllocation(
  organizationId,
  actorUserId,
  paymentId,
  allocationId,
  {
    reason: "DEV-08 local-only reversal QA for supplier payment unapplied allocation",
  },
);
```

Do not invent or send unsupported body fields such as `reversalReason`, `notes`, `amountApplied`, `billId`, or `paymentId`.

## Preconditions required before mutation

Part 10 must stop before mutation if any of these differ:

- Marker is exactly `DEV08-AP-20260525T230000`.
- Family is exactly `ap`.
- Supplier remains exactly one active `SUPPLIER`, safe id prefix `0e36df97`.
- `PAY-000006` remains exactly one supplier payment for the fixture.
- `PAY-000006` remains `POSTED`.
- `PAY-000006` amount paid remains `500.0000`.
- `PAY-000006` unapplied amount remains `0.0000`.
- `PAY-000006` journal remains `JE-000050`.
- `PAY-000006` void reversal journal remains absent.
- `BILL-000007` remains `FINALIZED`.
- `BILL-000007` total remains `1150.0000`.
- `BILL-000007` balance due remains `650.0000`.
- `BILL-000007` reversal journal remains absent.
- Exactly one direct `SupplierPaymentAllocation` remains for `300.0000`.
- Exactly one active `SupplierPaymentUnappliedAllocation` remains for `200.0000`, safe id prefix `a8ee4e23`.
- The active unapplied allocation still has no `reversedAt`, `reversedById`, or `reversalReason`.
- No supplier refund, purchase debit note, supplier payment void, purchase bill void, output, email, ZATCA, cleanup, migration, seed/reset/delete, deployment, environment/provider/schema, production, beta, shared-target, customer-data, or login/browser action occurred.

The read-only future-effect check passed:

- Payment is `POSTED`: `true`
- Bill is `FINALIZED`: `true`
- Same supplier: `true`
- Same organization: `true`
- Future unapplied amount after reversal: `200.0000`
- Future bill balance after reversal: `850.0000`
- Payment limit ok: `true`
- Bill limit ok: `true`

## Expected payment effect

If approved in Part 10:

- `PAY-000006` remains `POSTED`.
- Amount paid remains `500.0000`.
- Unapplied amount changes `0.0000 -> 200.0000`.
- `journalEntryId` remains unchanged (`JE-000050`).
- `voidReversalJournalEntryId` remains absent.

## Expected bill effect

If approved in Part 10:

- `BILL-000007` remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due changes `650.0000 -> 850.0000`.
- Reversal journal remains absent.

## Expected allocation effect

If approved in Part 10:

- Direct `SupplierPaymentAllocation` remains one historical allocation for `300.0000`.
- `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` is marked reversed.
- `reversedAt` is set.
- `reversedById` is set.
- `reversalReason` is set to `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- No new supplier payment allocation is created.
- No purchase debit note allocation is created.

## Expected journal and accounting effect

If approved in Part 10:

- No new `JournalEntry` is expected.
- Purchase bill journal `JE-000049` remains `POSTED` and unchanged.
- Supplier payment journal `JE-000050` remains `POSTED` and unchanged.
- Organization journal count should remain `50`, if safely checkable.
- `JOURNAL_ENTRY` sequence should remain next `51`, if safely checkable.
- `PAYMENT` sequence should remain next `7`, if safely checkable.

## Expected audit effect

If approved in Part 10:

- `SUPPLIER_PAYMENT_CREATED` remains once for `PAY-000006`.
- Raw `APPLY_UNAPPLIED` remains once for `PAY-000006`.
- One raw `REVERSE_UNAPPLIED_ALLOCATION` action is expected for the active `SupplierPaymentUnappliedAllocation`.
- No `SUPPLIER_PAYMENT_VOIDED` action is expected.
- No supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action is expected.

Current read-only audit counts:

- `SUPPLIER_PAYMENT_CREATED`: `1`
- Raw `APPLY_UNAPPLIED`: `1`
- Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`
- `SUPPLIER_PAYMENT_VOIDED`: `0`
- Refund/debit-note/bill-void audit actions for this fixture: `0`

## Expected forbidden side-effect non-effects

Fixture-specific read-only side-effect counts were all `0`:

- Supplier refunds
- Purchase debit notes
- Purchase debit note allocations
- Purchase orders
- Purchase receipts
- Stock movements
- Cash expenses
- Generated documents
- Email outbox records

Organization baseline counts remained unchanged and must be compared before/after in Part 10:

- Journal entries: `50`
- ZATCA signed artifact drafts: `1`
- ZATCA submission logs: `7`
- `JOURNAL_ENTRY` sequence next: `51`
- `PAYMENT` sequence next: `7`

Expected Part 10 non-effects:

- No generated document
- No receipt/PDF/archive/export/download
- No email
- No ZATCA XML/signing/QR/submission artifact
- No supplier refund
- No purchase debit note
- No purchase order
- No purchase receipt
- No stock movement
- No cash expense
- No cleanup deletion
- No migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser action

## Blockers or deviations

- No blocker found for the planned reversal.
- Audit action is expected to remain raw `REVERSE_UNAPPLIED_ALLOCATION` for supplier payment unapplied allocation reversal, because the current audit mapping does not standardize the supplier payment unapplied reverse action.
- The AP-ready local organization has non-zero local ZATCA baselines (`1` signed artifact draft and `7` submission logs). This is baseline data and must be compared before/after in Part 10 rather than interpreted as a new side effect.

## Required approval phrase for Part 10

```text
I approve DEV-08 Part 10 local-only supplier payment unapplied allocation reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active 200.0000 supplier payment unapplied allocation. No production, no beta, no customer data.
```

## Exact next prompt title

```text
DEV-08 Part 10: approved local supplier payment unapplied allocation reversal mutation
```

## Commands run

- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git branch --show-current`
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`
- `docker compose -f infra/docker-compose.yml ps`
- Read-only SQL using `docker exec -i infra-postgres-1 psql ...` with `BEGIN READ ONLY`
- Code/document inspection commands for the supplier payment reverse route, service, DTO, tests, schema, audit mapping, and handoff

## Commands skipped and why

- Supplier payment unapplied allocation reversal: skipped because Part 9 is preflight only.
- Supplier payment creation and apply-unapplied: skipped because those Part 5 and Part 8 mutations are already complete.
- Supplier payment void, purchase bill mutation, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, and ZATCA routes: skipped by safety limits.
- Full tests, full build, smoke, E2E, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, backup/restore, and production-hosting research: skipped by task scope.

## Remaining DEV-08 risks

- Part 10 still needs an approval-gated local mutation and after-state evidence.
- Supplier payment void/reversal remains unproven after the unapplied reversal.
- Supplier refunds and purchase debit note interactions remain unproven.
- Output/PDF/archive, email, and ZATCA flows remain deliberately outside this AP payment allocation chain.

## Part 10 Mutation Evidence Note

DEV-08 Part 10 completed the approved local-only supplier payment unapplied allocation reversal mutation. Evidence is recorded in [DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md).

- Mutation performed: yes. `SupplierPaymentService.reverseUnappliedAllocation(...)` was called exactly once for `PAY-000006` and active allocation `a8ee4e23`.
- Payment result: `PAY-000006` remained `POSTED`, safe id prefix `622ad0b6`, amount paid remained `500.0000`, unapplied amount changed `0.0000 -> 200.0000`, journal remained `JE-000050`, and void reversal journal remained absent.
- Bill result: `BILL-000007` remained `FINALIZED`, safe id prefix `d81ddd60`, total remained `1150.0000`, balance due changed `650.0000 -> 850.0000`, and reversal journal remained absent.
- Allocation result: the direct `SupplierPaymentAllocation` remained one historical allocation for `300.0000`; the `SupplierPaymentUnappliedAllocation` `a8ee4e23` was marked reversed for `200.0000` with reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- Accounting result: no new journal was created, `JE-000049` and `JE-000050` remained posted and unchanged, `JOURNAL_ENTRY` sequence remained next `51`, and `PAYMENT` sequence remained next `7`.
- Audit result: raw `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION` exists once; no supplier payment void, supplier refund, purchase debit note, or purchase bill void audit was created.
- Forbidden side effects: no generated document, PDF/archive/export/download, email, ZATCA change, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, fixture cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.
- Exact next prompt title: `DEV-08 Part 11: supplier payment void/reversal preflight`.
