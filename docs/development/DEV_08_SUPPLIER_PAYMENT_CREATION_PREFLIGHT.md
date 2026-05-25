# DEV-08 Supplier Payment Creation Preflight

## Purpose And Scope

DEV-08 Part 4 performed a read-only preflight and mutation plan for creating one local-only supplier payment against `BILL-000007`.

No supplier payment, allocation, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, email, ZATCA artifact, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.

## Latest Commit Inspected

- Branch: `main`.
- Local `HEAD`: `c99732d1b16c936b00c21f85c00d55945fb3fabd`.
- `origin/main`: `c99732d1b16c936b00c21f85c00d55945fb3fabd`.
- Latest commit: `c99732d1 Verify DEV-08 AP fixture evidence`.
- Existing unrelated untracked files remained limited to web/marketing and graphify paths and were not staged or modified by this preflight.

## Current Fixture Evidence

Marker: `DEV08-AP-20260525T230000`.

Family: `ap`.

Read-only SQL confirmed:

- Supplier count: `1`.
- Supplier safe id prefix: `0e36df97`.
- Supplier display label: `DEV08-AP-20260525T230000 Supplier`.
- Supplier type: `SUPPLIER`.
- Supplier active: `true`.
- Organization safe id prefix: `db69e5a8`.
- Purchase bill count: `1`.
- Bill number: `BILL-000007`.
- Bill safe id prefix: `d81ddd60`.
- Bill status: `FINALIZED`.
- Bill inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`.
- Bill subtotal: `1000.0000`.
- Bill tax total: `150.0000`.
- Bill total: `1150.0000`.
- Bill balance due: `1150.0000`.
- Bill reversal journal: absent.
- Supplier payment allocations for the bill: `0`.
- Purchase debit-note allocations for the bill: `0`.
- Purchase bill journal: `JE-000049`, safe id prefix `3dfa0a86`, status `POSTED`, reference `BILL-000007`.

## Local-Only Safety Proof

- Docker engine reported Linux mode and server version `28.5.1`.
- Local compose services were healthy:
  - `infra-postgres-1` on local port `5432`.
  - `infra-redis-1` on local port `6379`.
- Preflight used only read-only SQL through the local compose Postgres container.
- No hosted database target, production, beta/user-testing, shared, or customer-data target was used.
- No database URL, token, cookie, auth header, request/response body, generated document body, signed XML, QR payload, or attachment body is recorded in this preflight.

## Supplier Payment Code Paths Inspected

Inspected:

- `apps/api/src/supplier-payments/supplier-payment.controller.ts`.
- `apps/api/src/supplier-payments/supplier-payment.service.ts`.
- `apps/api/src/supplier-payments/supplier-payment-accounting.ts`.
- `apps/api/src/supplier-payments/dto/create-supplier-payment.dto.ts`.
- `apps/api/src/supplier-payments/dto/supplier-payment-allocation.dto.ts`.
- `apps/api/src/supplier-payments/dto/apply-unapplied-supplier-payment.dto.ts`.
- `apps/api/src/supplier-payments/dto/reverse-unapplied-supplier-payment-allocation.dto.ts`.
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`.
- `apps/api/src/purchase-bills/purchase-bill.service.ts`.
- `apps/api/src/purchase-bills/purchase-bill-accounting.ts`.
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`.
- `apps/api/src/contacts/contact.service.ts`.
- `apps/api/prisma/schema.prisma`.
- `apps/api/src/audit-log/audit-events.ts`.

Observed supplier payment creation behavior:

- `POST /supplier-payments` calls `SupplierPaymentService.create(...)`.
- Route permission: `PERMISSIONS.supplierPayments.create`.
- The service validates positive `amountPaid` and positive allocation amounts.
- Total allocations cannot exceed amount paid.
- Supplier must be an active supplier contact in the same organization.
- Paid-through account must be an active posting `ASSET` account in the same organization.
- Allocated bills must belong to the organization, belong to the same supplier, be `FINALIZED`, and have sufficient `balanceDue`.
- Creation posts one supplier payment journal.
- Direct allocation decrements `PurchaseBill.balanceDue`.
- Overpayment remains on `SupplierPayment.unappliedAmount`.
- Receipt/PDF/archive logic is isolated in receipt data/PDF routes and is not called by `create(...)`.

Observed purchase bill blocker behavior:

- A finalized bill with active supplier payment allocations cannot be voided until payments are voided first.
- This means Part 5 will intentionally move `BILL-000007` into a state that blocks purchase bill void until the supplier payment chain is reversed/voided later in DEV-08.

## Exact Planned Payment

Future Part 5 should create exactly one supplier payment for the DEV-08 supplier and `BILL-000007`:

- Payment date: `2026-05-25`.
- Currency: `SAR`.
- Amount paid: `500.0000`.
- Direct bill allocation: `300.0000` to `BILL-000007`.
- Expected unapplied amount: `200.0000`.
- Paid-through account: account code `112 Bank Account`.
- Description: include marker `DEV08-AP-20260525T230000` so the fixture remains searchable.
- No supplier refund.
- No purchase debit note.
- No purchase bill void.
- No output/PDF/archive.
- No email.
- No ZATCA.

## Exact DTO And Service Call Shape

Do not invent unsupported DTO fields. Current `CreateSupplierPaymentDto` supports:

```ts
await supplierPaymentService.create(organizationId, actorUserId, {
  supplierId: "<DEV-08 supplier id resolved at mutation time; safe prefix 0e36df97>",
  paymentDate: "2026-05-25",
  currency: "SAR",
  amountPaid: "500.0000",
  accountId: "<paid-through account id resolved at mutation time; safe prefix 32ab6f4d>",
  description: "DEV08-AP-20260525T230000 supplier payment fixture",
  allocations: [
    {
      billId: "<BILL-000007 id resolved at mutation time; safe prefix d81ddd60>",
      amountApplied: "300.0000",
    },
  ],
});
```

Required field mapping:

- `supplierId`: DEV-08 supplier id.
- `paymentDate`: ISO date/date string accepted by the service, planned as `2026-05-25`.
- `currency`: `SAR`.
- `amountPaid`: `500.0000`.
- `accountId`: paid-through asset account id for account `112`.
- `description`: marker-bearing local fixture description.
- `allocations[0].billId`: `BILL-000007` id.
- `allocations[0].amountApplied`: `300.0000`.

Unsupported or unnecessary fields for this DTO:

- `reference`.
- `notes`.
- `branchId`.
- `paidThroughAccountId`.
- UI-only payment amount aliases.

## Selected Paid-Through Account

Selected account:

- Account safe id prefix: `32ab6f4d`.
- Code: `112`.
- Name: `Bank Account`.
- Type: `ASSET`.
- Active: `true`.
- Allow posting: `true`.
- Bank profile status: `ACTIVE`.
- Currency: `SAR`.
- Organization safe id prefix: `db69e5a8`.

Reason this is the safest current paid-through account:

- It belongs to the same fake local AP-ready organization as the DEV-08 supplier and bill.
- It is an active posting asset account, matching `SupplierPaymentService.create(...)` validation.
- It has an active bank account profile and SAR currency.
- It avoids reusing account `111 Cash`, which was already used as the direct bill line account in Part 2.

Required AP account:

- Account safe id prefix: `883ea9a6`.
- Code: `210`.
- Name: `Accounts Payable`.
- Type: `LIABILITY`.
- Active: `true`.
- Allow posting: `true`.

## Preconditions Required Before Mutation

Part 5 must stop before mutation if any of these differ:

- Exact approval phrase is present.
- Marker is exactly `DEV08-AP-20260525T230000`.
- Family is exactly `ap`.
- Database target is proven local-only before importing write-capable services.
- Supplier `0e36df97` exists, is active, and is type `SUPPLIER`.
- `BILL-000007` safe prefix `d81ddd60` exists for the same supplier and organization.
- `BILL-000007` remains `FINALIZED`.
- `BILL-000007` balance due remains `1150.0000`.
- `BILL-000007` has no reversal journal.
- No supplier payment allocations exist for `BILL-000007`.
- No supplier payment unapplied allocations exist for `BILL-000007`.
- No purchase debit-note allocations exist for `BILL-000007`.
- Account `112` safe prefix `32ab6f4d` remains an active posting asset account in the same organization.
- Account `210` safe prefix `883ea9a6` remains active and posting.
- Fiscal period covering `2026-05-25` remains `OPEN`.
- No existing DEV-08 supplier payment exists for the marker or supplier.
- No forbidden side-effect rows are linked to the fixture.

Current read-only sequence state:

- `PAYMENT` sequence: prefix `PAY-`, next number `6`, padding `6`.
- Expected payment number if unchanged: `PAY-000006`.
- `JOURNAL_ENTRY` sequence: prefix `JE-`, next number `50`, padding `6`.
- Expected supplier payment journal if unchanged: `JE-000050`.

## Expected Payment Effect

If Part 5 is approved and the preconditions still match:

- Exactly one supplier payment is created.
- Payment number should be `PAY-000006` if the sequence remains unchanged.
- Payment status should be `POSTED`.
- Amount paid should be `500.0000`.
- Direct allocation to `BILL-000007` should be `300.0000`.
- Unapplied amount should be `200.0000`.
- Paid-through account should be account `112`.
- Payment void reversal journal should be absent.
- No supplier refund should exist.

## Expected Bill Effect

Expected `BILL-000007` state after Part 5:

- Status remains `FINALIZED`.
- Subtotal remains `1000.0000`.
- Tax total remains `150.0000`.
- Total remains `1150.0000`.
- Balance due changes `1150.0000 -> 850.0000`.
- Purchase bill finalization journal `JE-000049` remains unchanged.
- Reversal journal remains absent.
- One direct `SupplierPaymentAllocation` exists for `300.0000`.
- No supplier payment unapplied allocation exists yet.
- No purchase debit-note allocation exists.

## Expected Journal And Accounting Effect

Expected supplier payment journal:

- One new `JournalEntry` is created.
- Expected journal number if sequence remains unchanged: `JE-000050`.
- Status: `POSTED`.
- Reference: supplier payment number, expected `PAY-000006`.
- Total debit: `500.0000`.
- Total credit: `500.0000`.
- Debit account `210 Accounts Payable` for `500.0000`.
- Credit paid-through account `112 Bank Account` for `500.0000`.
- Journal is balanced.
- No purchase bill reversal journal is created.
- No supplier payment void reversal journal is created.
- No stock movement or inventory journal is created.

## Expected Audit Effect

Current audit mapping includes:

- `SupplierPayment:CREATE` -> `SUPPLIER_PAYMENT_CREATED`.
- `SupplierPayment:VOID` -> `SUPPLIER_PAYMENT_VOIDED`.

Expected Part 5 audit effect:

- One `SUPPLIER_PAYMENT_CREATED` audit action for the new supplier payment.
- No supplier payment void audit.
- No supplier refund audit.
- No purchase debit note audit.
- No purchase bill void audit.
- No login/browser audit-writing flow.

## Expected Forbidden Side-Effect Non-Effects

Part 5 must verify no:

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
| Existing DEV-08 supplier payments | `0` |
| Supplier payment allocations for bill | `0` |
| Supplier payment unapplied allocations for bill | `0` |
| Supplier refunds for supplier | `0` |
| Purchase debit notes for supplier or bill | `0` |
| Purchase debit-note allocations for bill | `0` |
| Purchase orders for supplier | `0` |
| Purchase receipts for supplier or bill | `0` |
| Stock movements for bill marker or id | `0` |
| Cash expenses for supplier | `0` |
| Generated documents for bill | `0` |
| Email outbox rows for marker or bill | `0` |
| Cleanup/delete audit actions for fixture | `0` |

Current organization-level baseline rows remain non-zero for existing local AP/ZATCA/output data:

- ZATCA signed artifact drafts: `1`.
- ZATCA submission logs: `7`.

Future Part 5 evidence must compare before/after counts carefully because the selected fake local AP-ready organization is not a zero-baseline organization.

## Blockers Or Deviations

- No blocker was found for the planned supplier payment creation.
- The selected organization still has existing local AP/ZATCA/output baseline rows, so mutation evidence must compare fixture-specific rows and before/after organization counts.
- Creating the supplier payment will intentionally create an active supplier payment allocation against `BILL-000007`; purchase bill void must remain blocked until the later supplier payment void/reversal chain clears that allocation.

## Required Approval Phrase For Part 5

`I approve DEV-08 Part 5 local-only supplier payment creation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 with payment amount 500.0000 and direct allocation 300.0000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08 Part 5: approved local supplier payment creation mutation`

## Part 5 Mutation Evidence Note

DEV-08 Part 5 completed the approved local-only supplier payment creation mutation. Evidence is recorded in [DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md).

- Mutation performed: yes.
- Supplier payment created: `PAY-000006`, safe id prefix `622ad0b6`, status `POSTED`.
- Payment amount/allocation/unapplied result: amount paid `500.0000`, direct allocation `300.0000` to `BILL-000007`, unapplied amount `200.0000`.
- Bill result: `BILL-000007` remained `FINALIZED`, total remained `1150.0000`, balance due changed `1150.0000 -> 850.0000`, reversal journal remained absent.
- Journal result: `JE-000050`, safe id prefix `b77bd6f7`, `POSTED`, debit `210` for `500.0000`, credit `112` for `500.0000`.
- Audit result: one `SUPPLIER_PAYMENT_CREATED` action for `PAY-000006`; no supplier payment void audit.
- Forbidden side effects: no generated document, PDF/archive/export/download, email, ZATCA change, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, fixture cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.
- Exact next prompt title: `DEV-08 Part 6: supplier payment evidence verification`.
