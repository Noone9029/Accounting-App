# DEV-08 Part 14 - Purchase Bill Void/Reversal Mutation Evidence

## Purpose And Scope

This document records the approved local-only DEV-08 Part 14 AP mutation that voided/reversed the finalized direct-mode purchase bill `BILL-000007` after the related DEV-08 supplier payment had already been voided.

- Marker: `DEV08-AP-20260525T230000`
- Family: `ap`
- Mutation target: `BILL-000007`
- Mutation performed: yes, exactly one `PurchaseBillService.void(organizationId, actorUserId, billId)` service call.
- Production, beta, hosted, shared, or customer data: not used.

## Approval Phrase Received

`I approve DEV-08 Part 14 local-only purchase bill void/reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 after supplier payment void/reversal completed. No production, no beta, no customer data.`

## Local-Only Target Proof

- `git log -1 --oneline` inspected latest commit before mutation: `ef811bad Plan DEV-08 purchase bill void`.
- Docker engine check returned Linux engine version `28.5.1`.
- `docker compose -f infra/docker-compose.yml ps` showed local `infra-postgres-1` and `infra-redis-1` containers healthy.
- The temporary script classified the database target before importing write-capable services:
  - protocol: PostgreSQL
  - host: local host only
  - database: local `accounting`
  - hosted/prod/beta/shared target patterns: refused by guard
- Database URL, credentials, request bodies, vendor/customer data, document bodies, signed XML, QR payloads, tokens, and cookies were not printed.

## Preflight Evidence

The mutation script verified these preconditions before the service call:

- Supplier: exactly one fake local `DEV08-AP-20260525T230000 Supplier`, safe id prefix `0e36df97`, active `SUPPLIER`.
- Actor: active local fixture member safe id prefix `09f892d4`.
- Purchase bill before mutation:
  - Bill number: `BILL-000007`
  - Safe id prefix: `d81ddd60`
  - Status: `FINALIZED`
  - Mode: `DIRECT_EXPENSE_OR_ASSET`
  - Subtotal: `1000.0000`
  - Tax: `150.0000`
  - Total: `1150.0000`
  - Balance due: `1150.0000`
  - Purchase order link: absent
  - Reversal journal: absent
- Purchase bill journal before mutation:
  - Original journal: `JE-000049`
  - Safe id prefix: `3dfa0a86`
  - Status: `POSTED`
  - Debit account `111` for `1000.0000`
  - Debit account `230` for `150.0000`
  - Credit account `210` for `1150.0000`
- Supplier payment chain before mutation:
  - Payment: `PAY-000006`, safe id prefix `622ad0b6`
  - Status: `VOIDED`
  - Amount paid: `500.0000`
  - Unapplied amount: `200.0000`
  - Original payment journal `JE-000050` was already `REVERSED`
  - Payment void reversal journal `JE-000051` was already `POSTED`
- Allocation before mutation:
  - Direct `SupplierPaymentAllocation` count: `1`
  - Direct allocation safe id prefix: `6ec44d14`
  - Direct allocation amount: `300.0000`
  - Active payment allocation blockers: `0`
  - `SupplierPaymentUnappliedAllocation` safe id prefix `a8ee4e23` remained reversed for `200.0000`
  - Active unapplied allocation blockers: `0`
  - Active purchase debit note allocation blockers: `0`
- Audit baseline before mutation:
  - `PurchaseBill:PURCHASE_BILL_CREATED`: `1`
  - `PurchaseBill:PURCHASE_BILL_FINALIZED`: `1`
  - `PurchaseBill:PURCHASE_BILL_VOIDED`: `0`
  - `SupplierPayment:SUPPLIER_PAYMENT_VOIDED`: `1`
- `JOURNAL_ENTRY` sequence was next `52`.

## Mutation Performed

The temporary guarded local script called `PurchaseBillService.void(...)` exactly once for `BILL-000007`.

Current code does not support a purchase bill void DTO, reason, `voidedAt`, or `voidedById`, so no unsupported reason field was supplied.

## Bill Before/After

| Field | Before | After |
| --- | --- | --- |
| Bill number | `BILL-000007` | `BILL-000007` |
| Safe id prefix | `d81ddd60` | `d81ddd60` |
| Status | `FINALIZED` | `VOIDED` |
| Mode | `DIRECT_EXPENSE_OR_ASSET` | `DIRECT_EXPENSE_OR_ASSET` |
| Subtotal | `1000.0000` | `1000.0000` |
| Tax | `150.0000` | `150.0000` |
| Total | `1150.0000` | `1150.0000` |
| Balance due | `1150.0000` | `0.0000` |
| Purchase order link | absent | absent |
| Reversal journal | absent | `JE-000052` |

## Supplier Payment State Before/After

The supplier payment was not voided again and was not otherwise mutated by Part 14.

| Field | Before | After |
| --- | --- | --- |
| Payment number | `PAY-000006` | `PAY-000006` |
| Safe id prefix | `622ad0b6` | `622ad0b6` |
| Status | `VOIDED` | `VOIDED` |
| Amount paid | `500.0000` | `500.0000` |
| Unapplied amount | `200.0000` | `200.0000` |
| Original journal | `JE-000050`, `REVERSED` | `JE-000050`, `REVERSED` |
| Void reversal journal | `JE-000051`, `POSTED` | `JE-000051`, `POSTED` |

## Allocation Before/After

- Historical direct `SupplierPaymentAllocation` remained exactly one record, safe id prefix `6ec44d14`, amount `300.0000`.
- Active direct allocation blocker count remained `0` because the linked supplier payment is `VOIDED`.
- `SupplierPaymentUnappliedAllocation` remained exactly one record, safe id prefix `a8ee4e23`, amount `200.0000`, already reversed.
- Active unapplied allocation blocker count remained `0`.
- No new `SupplierPaymentAllocation`, `SupplierPaymentUnappliedAllocation`, or `PurchaseDebitNoteAllocation` was created.

## Journal/Accounting Result

- Original purchase bill journal `JE-000049`, safe id prefix `3dfa0a86`, changed from `POSTED` to `REVERSED`.
- New purchase bill reversal journal `JE-000052`, safe id prefix `b243cab0`, was created and posted.
- Reversal journal total debit: `1150.0000`.
- Reversal journal total credit: `1150.0000`.
- Reversal journal lines:
  - Debit account `210 Accounts Payable` for `1150.0000`
  - Credit account `230 VAT Receivable` for `150.0000`
  - Credit account `111 Cash` for `1000.0000`
- `JOURNAL_ENTRY` sequence changed from next `52` to next `53`.
- Supplier payment journals remained unchanged from Part 12:
  - `JE-000050` remained `REVERSED`
  - `JE-000051` remained `POSTED`
- No supplier payment, supplier refund, debit note, purchase order, cash expense, inventory, output, or ZATCA journal was created.

## Audit Result

Fixture-scoped audit counts after mutation:

- `Contact:CREATE`: `1`
- `PurchaseBill:PURCHASE_BILL_CREATED`: `1`
- `PurchaseBill:PURCHASE_BILL_FINALIZED`: `1`
- `PurchaseBill:PURCHASE_BILL_VOIDED`: `1`
- `SupplierPayment:SUPPLIER_PAYMENT_CREATED`: `1`
- `SupplierPayment:APPLY_UNAPPLIED`: `1`
- `SupplierPayment:SUPPLIER_PAYMENT_VOIDED`: `1`
- `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION`: `1`

No duplicate purchase bill finalization audit was created. No second supplier payment void audit was created.

## Forbidden Side-Effect Verification

Read-only fixture checks after mutation confirmed:

- Generated documents for the bill/payment: `0`
- Supplier refunds for the fixture supplier: `0`
- Purchase debit notes for the fixture supplier: `0`
- Purchase orders for the fixture supplier: `0`
- Purchase receipts linked to the bill: `0`
- Stock movements linked to the bill: `0`
- Cash expenses linked to the fixture supplier: `0`
- Inventory variance proposals linked to the bill: `0`
- Marker email outbox rows: `0`
- Fixture-specific cleanup/delete audits: `0`
- Organization-level ZATCA baseline remained the known AP-ready local baseline: `1` signed artifact draft and `7` submission logs.

No PDF/archive/export/download, email provider event, ZATCA XML/signing/QR/submission artifact, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow occurred.

## Commands Run

- `git fetch origin main`
- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git branch --show-current`
- `Get-Content` / `rg` reads for the requested DEV-08 evidence docs, handoff, purchase bill service/controller/accounting/DTO/spec paths, supplier payment service/spec paths, Prisma schema, README, and BUG_AUDIT.
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`
- `docker compose -f infra/docker-compose.yml ps`
- Temporary guarded script execution:
  - `corepack pnpm exec tsx scripts/dev08-purchase-bill-void.tmp.ts --marker DEV08-AP-20260525T230000 --family ap --approval "<approved phrase>"`
- Read-only verification through local `infra-postgres-1` with `SET default_transaction_read_only=on` and `BEGIN READ ONLY`.

## Commands Skipped And Why

- Supplier payment void was skipped because Part 12 already completed it and Part 14 must not rerun it.
- Supplier payment creation, supplier payment apply/reverse-unapplied, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider changes, production-hosting research, backup/restore, and login/browser flows were skipped because they are explicitly out of scope.
- Targeted purchase-bill tests are skipped unless code changes are made; this task only changes documentation after the local DB mutation.
- Full tests, full build, smoke, E2E, `verify:repo`, and `verify:ci:local actual` are skipped by instruction.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08-purchase-bill-void.tmp.ts`
- The script was removed after execution.
- `Test-Path apps/api/scripts/dev08-purchase-bill-void.tmp.ts` returned `False`.
- The temporary script was not staged and was not left untracked.

## Deviations Or Blockers

- The service mutation completed. The temporary script then failed during a post-mutation assertion because one organization-level supplier refund audit count was too broad for the AP-ready local organization baseline. The mutation was not rerun.
- Follow-up read-only SQL verified the exact fixture-scoped bill, supplier payment, allocation, journal, audit, and side-effect state.
- No remaining Part 14 blocker is open.

## Next Recommended Thread

`DEV-08 Part 15: AP state-machine closure and evidence consolidation`
