# DEV-08D Supplier Payment Refund Source Fixture Mutation Evidence

## 1. Purpose And Scope

This document records DEV-08D Part 2: the approved local-only supplier payment refund source fixture mutation under marker `DEV08D-AP-20260526T000000`.

Approved mutation scope:

- Create one fake local supplier.
- Create one posted supplier payment source fixture.
- Leave the full payment amount unapplied for a later supplier refund.
- Do not create a supplier refund yet.
- Do not create purchase bills, purchase orders, purchase receipts, stock movements, purchase debit notes, cash expenses, generated documents, PDF/archive/export/download output, email, ZATCA metadata/submission artifacts, cleanup/delete records, migrations, seed/reset/delete, deploys, environment/provider/schema changes, login/browser flows, production, beta, shared-target, hosted-target, or customer-data actions.

## 2. Approval Phrase Received

`I approve DEV-08D Part 2 local-only supplier payment refund source fixture mutation under marker DEV08D-AP-20260526T000000. No production, no beta, no customer data.`

## 3. Local-Only Target Proof

- Latest commit inspected before mutation: `da413807 Plan DEV-08D supplier refund from supplier payment`.
- Local `HEAD` matched `origin/main`: `da413807c8963c6fcb63fdb9dba34da6f6e69610`.
- Branch inspected: `main`.
- `apps/api/.env` database target was classified before write-capable service imports:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
  - classification: local.
- The temporary runner refused non-local, hosted, production, beta, and staging target patterns.
- Database URLs, credentials, tokens, cookies, auth headers, request/response bodies, customer/vendor data, document bodies, signed XML, QR payloads, attachment bodies, and email bodies were not printed.

## 4. Pre-Mutation Evidence

- Marker: `DEV08D-AP-20260526T000000`.
- Existing DEV-08D contacts: `0`.
- Existing DEV-08D supplier payments: `0`.
- Existing DEV-08D supplier refunds: `0`.
- Existing DEV-08D temporary scripts under `apps/api/scripts`: `0`.
- Selected fake local AP-ready organization safe prefix: `db69e5a8`.
- Actor safe prefix: `09f892d4`.
- Paid-through account: `112`, active posting asset account, safe prefix `32ab6f4d`.
- AP account: `210`, active posting account, safe prefix `883ea9a6`.
- Matching fiscal period for `2026-05-26`: open.

## 5. Mutation Performed

The temporary guarded script under `apps/api/scripts/dev08d-supplier-payment-source.tmp.ts` performed the approved local service-layer mutation:

| Service call | Count |
| --- | ---: |
| `ContactService.create(...)` | `1` |
| `SupplierPaymentService.create(...)` | `1` |

`SupplierPaymentService.create(...)` was called with:

```ts
{
  supplierId: "<DEV-08D supplier id>",
  paymentDate: "2026-05-26T00:00:00.000Z",
  currency: "SAR",
  amountPaid: "500.0000",
  accountId: "<account 112 id>",
  description: "DEV08D-AP-20260526T000000 local-only supplier payment refund source fixture",
  allocations: []
}
```

No supplier refund service, supplier payment void service, purchase bill/order/receipt/inventory/cash expense/debit note mutation, output/PDF/archive, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted-target, or customer-data path was called.

## 6. Supplier Evidence

- Supplier safe id prefix: `a5d3ece3`.
- Type: `SUPPLIER`.
- Active: yes.
- Display label includes marker `DEV08D-AP-20260526T000000`.
- Organization safe prefix: `db69e5a8`.
- Supplier was created through `ContactService.create(...)`.

## 7. Supplier Payment Evidence

- Supplier payment number: `PAY-000007`.
- Safe id prefix: `4b9c42b1`.
- Status: `POSTED`.
- Amount paid: `500.0000`.
- Unapplied amount: `500.0000`.
- Currency: `SAR`.
- Paid-through account: `112`, safe prefix `32ab6f4d`.
- Void reversal journal: absent.
- Direct supplier payment allocation count: `0`.
- Supplier payment unapplied allocation count: `0`.
- Supplier refund count for source payment: `0`.

## 8. Accounting And Journal Evidence

- Supplier payment journal number: `JE-000058`.
- Journal safe id prefix: `da62af82`.
- Journal status: `POSTED`.
- Total debit: `500.0000`.
- Total credit: `500.0000`.
- Journal is balanced.

Journal lines:

| Account | Debit | Credit |
| --- | ---: | ---: |
| `210` | `500.0000` | `0.0000` |
| `112` | `0.0000` | `500.0000` |

No supplier refund journal exists for the DEV-08D marker.

## 9. Audit Evidence

- `Contact:CREATE`: `1`.
- `SupplierPayment:SUPPLIER_PAYMENT_CREATED`: `1`.
- `SupplierPayment` void audit for the source payment: `0`.
- `SupplierRefund` audit for the DEV-08D marker: `0`.
- Cleanup/delete audit for the DEV-08D marker: `0`.
- No login/browser audit-writing flow was run.

## 10. Forbidden Side-Effect Verification

Post-mutation marker-scoped counts:

| Check | Count |
| --- | ---: |
| Supplier refunds | `0` |
| Purchase bills | `0` |
| Purchase orders | `0` |
| Purchase debit notes | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Generated documents | `0` |
| Email outbox rows | `0` |
| Email provider events | `0` |
| Cleanup/delete audits | `0` |

ZATCA behavior was not invoked. The fixture is AP-only and no sales invoice/ZATCA metadata path is reachable from the approved supplier payment source mutation.

## 11. Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08d-supplier-payment-source.tmp.ts`.
- The first execution attempt stopped after local-target proof and before mutation evidence; marker counts remained `0` for contacts, supplier payments, and supplier refunds.
- The script was patched to instantiate the needed services directly after the local-target guard.
- The successful execution ran once and performed the approved service calls.
- The script was removed immediately after the successful run.
- `Test-Path -LiteralPath 'E:\Accounting App\apps\api\scripts\dev08d-supplier-payment-source.tmp.ts'` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08d*'` returned no files.
- The temporary script was not staged.

## 12. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git branch --show-current`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08d*'`.
- Targeted source/doc reads for Part 2 and prior DEV-08/08B/08C evidence.
- Read-only local SQL checks through `docker exec -i infra-postgres-1 psql ...`.
- Temporary runner execution:
  - `corepack pnpm exec tsx scripts/dev08d-supplier-payment-source.tmp.ts --marker=DEV08D-AP-20260526T000000 '--approval=...'` from `apps/api`.
- Temporary script cleanup:
  - `Remove-Item -LiteralPath 'E:\Accounting App\apps\api\scripts\dev08d-supplier-payment-source.tmp.ts'`.
- Temporary script absence proof:
  - `Test-Path -LiteralPath 'E:\Accounting App\apps\api\scripts\dev08d-supplier-payment-source.tmp.ts'`.
  - `Get-ChildItem apps/api/scripts -Filter '*dev08d*'`.

## 13. Commands Skipped

- Supplier refund creation: explicitly reserved for a later approved mutation.
- Supplier payment void: explicitly forbidden for this part.
- Purchase bill mutation: not selected by Part 1 and forbidden here.
- Purchase order, purchase receipt, inventory, cash expense, and purchase debit note mutations: forbidden.
- Login/browser flows: skipped because they can write audit logs.
- Output/PDF/archive/export/download generation: forbidden.
- ZATCA and email commands: forbidden.
- Migrations, seed/reset/delete, cleanup, deploys, environment/provider/schema changes, backup/restore, production-hosting research, production, beta, shared-target, hosted-target, and customer-data checks: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope.

## 14. Deviations Or Blockers

- No mutation blocker remains.
- The first temporary runner attempt stopped after local-target proof and before mutation; read-only counts confirmed no partial DEV-08D contact, supplier payment, or supplier refund was created by that failed attempt.
- The successful mutation used the existing fake local AP-ready organization with safe prefix `db69e5a8`, consistent with prior AP local evidence patterns.

## 15. Next Recommended Thread

`DEV-08D Part 3: supplier payment refund source fixture evidence verification`
