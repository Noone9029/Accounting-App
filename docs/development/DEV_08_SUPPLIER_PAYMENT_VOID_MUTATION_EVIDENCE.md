# DEV-08 Supplier Payment Void Mutation Evidence

## Purpose And Scope

This document records DEV-08 Part 12: the approved local-only supplier payment void/reversal mutation.

The mutation voided the single DEV-08 supplier payment linked to:

- Marker: `DEV08-AP-20260525T230000`
- Family: `ap`
- Supplier payment: `PAY-000006`
- Purchase bill: `BILL-000007`

No supplier payment creation, purchase bill creation, supplier payment apply-unapplied, supplier payment reverse-unapplied, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA artifact, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.

## Approval Phrase Received

```text
I approve DEV-08 Part 12 local-only supplier payment void/reversal mutation under marker DEV08-AP-20260525T230000 for the DEV-08 supplier payment linked to BILL-000007. No production, no beta, no customer data.
```

## Local-Only Target Proof

- Latest inspected commit before mutation: `dc93b7ae Plan DEV-08 supplier payment void`.
- `HEAD` matched `origin/main`: `dc93b7ae27c1b171e6faeff674558572c9776123`.
- Branch: `main`.
- Docker engine: Linux engine available, server version `28.5.1`.
- Local containers: `infra-postgres-1` and `infra-redis-1` were healthy.
- Read-only preflight used local compose Postgres through `docker exec`.
- The guarded script target classification was local-only:
  - protocol: `postgresql`
  - host: `localhost`
  - port: `5432`
  - database: `accounting`
- The guarded script refused forbidden hosted/prod/beta target tokens before dynamically importing write-capable services.
- Database URL, credentials, tokens, cookies, auth headers, request/response bodies, vendor/customer data, document bodies, signed XML, and QR payloads were not printed.

## Preflight Evidence

Read-only preflight and guarded script checks confirmed:

- Supplier:
  - Count: `1`
  - Display label: `DEV08-AP-20260525T230000 Supplier`
  - Safe id prefix: `0e36df97`
  - Type/status: `SUPPLIER`, active
  - Organization count: `1`
- Actor membership:
  - Count: `1`
  - Actor safe id prefix: `09f892d4`
  - Membership status: `ACTIVE`
- Supplier payment:
  - Payment number: `PAY-000006`
  - Safe id prefix: `622ad0b6`
  - Status: `POSTED`
  - Amount paid: `500.0000`
  - Unapplied amount: `200.0000`
  - Original journal: `JE-000050`
  - Original journal safe id prefix: `b77bd6f7`
  - Void reversal journal: absent
  - Voided at: absent
- Purchase bill:
  - Bill number: `BILL-000007`
  - Safe id prefix: `d81ddd60`
  - Status: `FINALIZED`
  - Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`
  - Total: `1150.0000`
  - Balance due: `850.0000`
  - Purchase order link: absent
  - Purchase bill reversal journal: absent
  - Purchase bill journal: `JE-000049`
- Allocation baseline:
  - Direct `SupplierPaymentAllocation` count: `1`
  - Direct allocation safe id prefix: `6ec44d14`
  - Direct allocation amount: `300.0000`
  - `SupplierPaymentUnappliedAllocation` total count: `1`
  - Active `SupplierPaymentUnappliedAllocation` count: `0`
  - Reversed `SupplierPaymentUnappliedAllocation` count: `1`
  - Reversed unapplied allocation safe id prefix: `a8ee4e23`
  - Reversed unapplied allocation amount: `200.0000`
  - Reversal reason: `DEV-08 local-only reversal QA for supplier payment unapplied allocation`
- Blocker checks:
  - Posted supplier refunds sourced from `PAY-000006`: `0`
  - Fiscal period covering the reversal posting date: `2026:OPEN`
  - Original payment journal reversal count before mutation: `0`
  - Purchase bill journal reversal count before mutation: `0`
- Audit baseline:
  - `SupplierPayment:SUPPLIER_PAYMENT_CREATED`: `1`
  - `SupplierPayment:APPLY_UNAPPLIED`: `1`
  - `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION`: `1`
  - `SupplierPayment:SUPPLIER_PAYMENT_VOIDED`: `0`
  - `PurchaseBill:PURCHASE_BILL_VOIDED`: `0`
- Sequence and organization baseline:
  - Organization journal entries: `50`
  - `JOURNAL_ENTRY` sequence next: `51`
  - `PAYMENT` sequence next: `7`
  - ZATCA signed artifact drafts: `1`
  - ZATCA submission logs: `7`
- Forbidden side-effect baseline:
  - Generated documents for the payment or bill: `0`
  - Email outbox rows containing the DEV-08 marker: `0`
  - ZATCA signed artifact drafts since payment creation: `0`
  - ZATCA submission logs since payment creation: `0`
  - Supplier refunds: `0`
  - Purchase debit notes: `0`
  - Purchase orders: `0`
  - Purchase receipts: `0`
  - Cash expenses: `0`
  - Stock movements since bill creation: `0`
  - Auth tokens since payment creation: `0`
  - Purchase bill void audit: `0`

## Mutation Performed

The temporary guarded script called `SupplierPaymentService.void(...)` exactly once:

```ts
await supplierPaymentService.void(organizationId, actorUserId, supplierPaymentId);
```

There was no void DTO/body in the current controller/service contract and no void reason was supplied or persisted.

No supplier payment create, supplier payment apply-unapplied, supplier payment reverse-unapplied, supplier refund, purchase debit note, purchase bill void, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Payment Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Payment number | `PAY-000006` | `PAY-000006` |
| Safe id prefix | `622ad0b6` | `622ad0b6` |
| Status | `POSTED` | `VOIDED` |
| Amount paid | `500.0000` | `500.0000` |
| Unapplied amount | `200.0000` | `200.0000` |
| `voidedAt` | absent | set |
| Original journal | `JE-000050` | `JE-000050` |
| Original journal safe id prefix | `b77bd6f7` | `b77bd6f7` |
| Void reversal journal | absent | `JE-000051` |
| Void reversal journal safe id prefix | n/a | `ebc58c26` |

Current code does not set `voidedById` and does not store a void reason for supplier payments.

## Bill Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Bill number | `BILL-000007` | `BILL-000007` |
| Safe id prefix | `d81ddd60` | `d81ddd60` |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `1150.0000` | `1150.0000` |
| Balance due | `850.0000` | `1150.0000` |
| Purchase bill journal | `JE-000049` | `JE-000049` |
| Purchase bill journal status | `POSTED` | `POSTED` |
| Purchase bill reversal journal | absent | absent |

The balance due was restored by the active direct supplier payment allocation amount `300.0000`.

## Allocation Before And After

| Check | Before | After |
| --- | ---: | ---: |
| Direct supplier payment allocations | `1` | `1` |
| Direct allocation safe prefix | `6ec44d14` | `6ec44d14` |
| Direct allocation amount | `300.0000` | `300.0000` |
| Supplier payment unapplied allocations | `1` | `1` |
| Active unapplied allocations | `0` | `0` |
| Reversed unapplied allocations | `1` | `1` |
| Unapplied allocation safe prefix | `a8ee4e23` | `a8ee4e23` |
| Unapplied allocation amount | `200.0000` | `200.0000` |
| Unapplied allocation reversal reason | set | unchanged |
| Purchase debit note allocations | `0` | `0` |

The direct `SupplierPaymentAllocation` remains a historical record. Current schema does not mark direct allocations reversed; the bill balance restoration and reversal journal are the void effects.

## Journal And Accounting Result

Original supplier payment journal:

- Journal number: `JE-000050`
- Safe id prefix: `b77bd6f7`
- Status before: `POSTED`
- Status after: `REVERSED`
- Total debit: `500.0000`
- Total credit: `500.0000`
- Original lines remained:
  - Debit AP account `210 Accounts Payable` for `500.0000`
  - Credit paid-through account `112 Bank Account` for `500.0000`

Supplier payment reversal journal:

- Journal number: `JE-000051`
- Safe id prefix: `ebc58c26`
- Status: `POSTED`
- Reverses: `JE-000050`
- Total debit: `500.0000`
- Total credit: `500.0000`
- Lines:
  - Debit paid-through account `112 Bank Account` for `500.0000`
  - Credit AP account `210 Accounts Payable` for `500.0000`

Other accounting effects:

- Purchase bill journal `JE-000049` remained `POSTED` and unchanged.
- Purchase bill reversal journal remained absent.
- Organization journal entry count changed `50 -> 51`.
- `JOURNAL_ENTRY` sequence changed next `51 -> 52`.
- `PAYMENT` sequence remained next `7`.
- No stock movement or inventory journal was created.

## Audit Result

Audit rows for the fixture after mutation:

| Entity type | Action | Count |
| --- | --- | ---: |
| `SupplierPayment` | `SUPPLIER_PAYMENT_CREATED` | `1` |
| `SupplierPayment` | `APPLY_UNAPPLIED` | `1` |
| `SupplierPayment` | `SUPPLIER_PAYMENT_VOIDED` | `1` |
| `SupplierPaymentUnappliedAllocation` | `REVERSE_UNAPPLIED_ALLOCATION` | `1` |
| `PurchaseBill` | `PURCHASE_BILL_VOIDED` | `0` |

The void audit action is standardized as `SUPPLIER_PAYMENT_VOIDED` by the current audit mapping.

No supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing flow occurred.

## Forbidden Side-Effect Verification

Fixture-specific counts after mutation:

| Check | Count |
| --- | ---: |
| Generated documents for payment or bill | `0` |
| Email outbox rows for marker | `0` |
| ZATCA signed artifact drafts since payment creation | `0` |
| ZATCA submission logs since payment creation | `0` |
| Supplier refunds | `0` |
| Purchase debit notes | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements since bill creation | `0` |
| Cash expenses | `0` |
| Auth tokens since payment creation | `0` |
| Purchase bill void audit | `0` |

Organization-level existing local ZATCA baselines were unchanged:

- ZATCA signed artifact drafts: `1 -> 1`
- ZATCA submission logs: `7 -> 7`

## Commands Run

- `git fetch origin main`
- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git branch --show-current`
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`
- `docker compose -f infra/docker-compose.yml ps`
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08 evidence/preflight docs, supplier payment service/controller/accounting/DTO/spec paths, purchase bill service path, Prisma schema, README, and BUG_AUDIT.
- Read-only local SQL preflight through `docker exec -i infra-postgres-1 psql ...`.
- Temporary guarded script execution:
  - `corepack pnpm exec tsx scripts/dev08-supplier-payment-void.tmp.ts --marker DEV08-AP-20260525T230000 --family ap --approval <exact approval phrase>`
- Temporary script cleanup via `apply_patch` deletion.
- Temporary script absence proof:
  - `Test-Path apps/api/scripts/dev08-supplier-payment-void.tmp.ts` returned `False`.
  - `git ls-files --stage apps/api/scripts/dev08-supplier-payment-void.tmp.ts` returned no index entry.
- Read-only local SQL post-check through `docker exec -i infra-postgres-1 psql ...`.

## Commands Skipped And Why

- Supplier payment creation, supplier payment apply-unapplied, supplier payment reverse-unapplied, purchase bill mutation, purchase bill void, supplier refund/debit-note workflows, PDF/archive/export/download routes, email, ZATCA, migrations, seed/reset/delete, deploys, environment/provider changes, login/browser flows, backup/restore, and production-hosting research were skipped because they were explicitly out of scope.
- `verify:repo`, `verify:ci:local`, full tests, full build, E2E, and smoke were skipped because the task required only `verify:diff` plus diff whitespace checks after documentation updates.
- Targeted supplier-payment tests were skipped because no production code or test code was changed.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08-supplier-payment-void.tmp.ts`.
- It was removed immediately after the successful one-time mutation.
- `Test-Path apps/api/scripts/dev08-supplier-payment-void.tmp.ts` returned `False`.
- `git ls-files --stage apps/api/scripts/dev08-supplier-payment-void.tmp.ts` returned no index entry.
- `git status --short` did not show the temporary script as tracked, staged, or untracked after cleanup.

## Deviations Or Blockers

- No mutation blocker was found.
- Current code does not support a supplier payment void DTO, void reason, or `voidedById`.
- Current code leaves `SupplierPayment.unappliedAmount` unchanged at `200.0000` after void.
- Direct supplier payment allocations remain historical records after void; bill balance restoration and the reversal journal are the accounting effects.
- The AP-ready local organization continues to have existing local-only ZATCA baseline records (`1` signed artifact draft and `7` submission logs). Those counts were unchanged by this supplier payment void mutation.

## Part 13 Purchase Bill Void Preflight Note

DEV-08 Part 13 completed a read-only purchase bill void/reversal preflight after the supplier payment void. The preflight is recorded in [DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md](DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md).

- Mutation performed: no.
- `BILL-000007` remains `FINALIZED`, total `1150.0000`, balance due `1150.0000`, and purchase bill reversal journal absent.
- `PAY-000006` remains `VOIDED`; original payment journal `JE-000050` remains `REVERSED`; supplier payment reversal journal `JE-000051` remains `POSTED`.
- The historical direct supplier payment allocation `6ec44d14` remains for `300.0000`, but current purchase bill void blocker logic ignores it because the linked payment is `VOIDED`.
- Active direct allocation blocker count, active supplier payment unapplied allocation blocker count, and active purchase debit note allocation blocker count are all `0`.
- Purchase bill void is safe to plan for Part 14 if preflight values remain unchanged.

## Next Recommended Thread

`DEV-08 Part 14: approved local purchase bill void/reversal mutation`
