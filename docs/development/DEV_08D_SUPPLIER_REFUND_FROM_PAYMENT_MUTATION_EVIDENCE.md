# DEV-08D Supplier Refund From Payment Mutation Evidence

## 1. Purpose And Scope

This document records DEV-08D Part 5: the approved local-only supplier refund creation sourced from the DEV-08D supplier payment source under marker `DEV08D-AP-20260526T000000`.

Approved mutation scope:

- Create exactly one supplier refund sourced from the DEV-08D posted supplier payment source.
- Use refund amount `150.0000`.
- Call `SupplierRefundService.create(...)` exactly once.
- Do not call `SupplierRefundService.void(...)`.
- Do not call `SupplierPaymentService.void(...)`.
- Do not create another supplier payment.
- Do not create purchase bills, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, generated documents, PDF/archive/export/download output, email, ZATCA metadata/submission artifacts, cleanup/delete records, migrations, seed/reset/delete, deploys, environment/provider/schema changes, login/browser flows, production, beta, shared-target, hosted-target, or customer-data actions.

## 2. Approval Phrase Received

`I approve DEV-08D Part 5 local-only supplier refund from supplier payment mutation under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier payment source with refund amount 150.0000. No production, no beta, no customer data.`

## 3. Local-Only Target Proof

- Latest commit inspected before mutation: `3148c371 Plan DEV-08D supplier refund from payment`.
- Local `HEAD` matched `origin/main`: `3148c371039ec823019dd8c17ca88c50c156367a`.
- Branch inspected: `main`.
- `apps/api/.env` database target was classified before write-capable service imports:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
  - classification: local.
- The temporary runner refused non-local, hosted, production, beta, and staging target patterns.
- Database URLs, credentials, tokens, cookies, auth headers, request/response bodies, customer/vendor data, document bodies, signed XML, QR payloads, attachment bodies, and email bodies were not printed.

## 4. Preflight Evidence

- Organization safe prefix: `db69e5a8`.
- Actor safe prefix: `09f892d4`.
- Supplier safe prefix: `a5d3ece3`.
- Source payment: `PAY-000007`, safe prefix `4b9c42b1`.
- Source status before mutation: `POSTED`.
- Source amount paid before mutation: `500.0000`.
- Source unapplied amount before mutation: `500.0000`.
- Supplier refunds sourced from payment before mutation: `0`.
- Direct supplier payment allocations before mutation: `0`.
- Active unapplied supplier payment allocations before mutation: `0`.
- Source payment journal before mutation: `JE-000058`, posted and balanced.
- Received-into account: `112`, safe prefix `32ab6f4d`.

## 5. Mutation Performed

The temporary guarded script under `apps/api/scripts/dev08d-supplier-refund-from-payment.tmp.ts` performed the approved local service-layer mutation:

| Service call | Count |
| --- | ---: |
| `SupplierRefundService.create(...)` | `1` |
| `SupplierRefundService.void(...)` | `0` |
| `SupplierPaymentService.void(...)` | `0` |

No other mutation service was called except construction dependencies required by `SupplierRefundService.create(...)`.

## 6. DTO Shape Used

```ts
{
  supplierId: "<DEV-08D supplier id>",
  sourceType: SupplierRefundSourceType.SUPPLIER_PAYMENT,
  sourcePaymentId: "<DEV-08D source supplier payment id>",
  refundDate: "2026-05-26T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "150.0000",
  accountId: "<account 112 id>",
  description: "DEV08D-AP-20260526T000000 local-only supplier refund from supplier payment"
}
```

`sourceDebitNoteId` was absent.

## 7. Supplier Refund Created

- Supplier refund number: `SRF-000004`.
- Safe id prefix: `dc8c4c9a`.
- Status: `POSTED`.
- Amount refunded: `150.0000`.
- Source type: `SUPPLIER_PAYMENT`.
- Source payment: `PAY-000007`, safe prefix `4b9c42b1`.
- Source debit note: absent.
- Journal: `JE-000059`, safe prefix `4439a2ff`.
- Void reversal journal: absent.

## 8. Source Payment Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Status | `POSTED` | `POSTED` |
| Amount paid | `500.0000` | `500.0000` |
| Unapplied amount | `500.0000` | `350.0000` |
| Direct allocations | `0` | `0` |
| Active unapplied allocations | `0` | `0` |
| Posted supplier refunds sourced from payment | `0` | `1` |

The source payment unapplied amount decreased exactly by `150.0000`.

## 9. Allocation State

- Direct supplier payment allocations after mutation: `0`.
- Active unapplied supplier payment allocations after mutation: `0`.
- No bill balance was changed by this supplier-payment-sourced refund.

## 10. Journal And Accounting Result

- Supplier refund journal: `JE-000059`.
- Journal safe id prefix: `4439a2ff`.
- Journal status: `POSTED`.
- Total debit: `150.0000`.
- Total credit: `150.0000`.
- Source payment journal `JE-000058` remained `POSTED` and unreversed.

Journal lines:

| Account | Debit | Credit |
| --- | ---: | ---: |
| `112` | `150.0000` | `0.0000` |
| `210` | `0.0000` | `150.0000` |

## 11. Audit Result

- `SupplierRefund:SUPPLIER_REFUND_CREATED`: `1`.
- Supplier refund void audit: `0`.
- Supplier payment void audit: `0`.
- Cleanup/delete audit for the source payment/refund: `0`.
- No login/browser audit-writing flow was run.

## 12. Forbidden Side-Effect Verification

Marker/source-scoped counts after mutation:

| Check | Count |
| --- | ---: |
| Generated documents | `0` |
| Email outbox rows | `0` |
| Email provider events | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Purchase debit notes | `0` |
| Cleanup/delete audits | `0` |

ZATCA behavior was not invoked. The mutation did not touch sales invoices or any ZATCA metadata/submission path.

## 13. Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08d-supplier-refund-from-payment.tmp.ts`.
- The script was removed immediately after the successful run.
- `Test-Path -LiteralPath 'E:\Accounting App\apps\api\scripts\dev08d-supplier-refund-from-payment.tmp.ts'` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08d*'` returned no files.
- The temporary script was not staged.

## 14. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08d*'`.
- Targeted prompt, handoff, Part 4 preflight, Part 3 evidence, DTO, service, and dependency reads.
- Temporary runner execution:
  - `corepack pnpm exec tsx scripts/dev08d-supplier-refund-from-payment.tmp.ts --marker=DEV08D-AP-20260526T000000 '--approval=...'` from `apps/api`.
- Temporary script cleanup:
  - `Remove-Item -LiteralPath 'E:\Accounting App\apps\api\scripts\dev08d-supplier-refund-from-payment.tmp.ts'`.
- Temporary script absence proof:
  - `Test-Path -LiteralPath 'E:\Accounting App\apps\api\scripts\dev08d-supplier-refund-from-payment.tmp.ts'`.
  - `Get-ChildItem apps/api/scripts -Filter '*dev08d*'`.
- Read-only post-mutation SQL through `docker exec -i infra-postgres-1 psql -U accounting -d accounting -v ON_ERROR_STOP=1 -At`.

## 15. Commands Skipped

- Supplier refund void: explicitly forbidden for Part 5.
- Supplier payment void: explicitly forbidden for Part 5.
- Supplier payment creation: not part of the approved mutation.
- Purchase bill, purchase order, purchase receipt, stock movement, cash expense, and purchase debit note mutations: forbidden.
- Login/browser flows: skipped because they can write audit logs.
- Output/PDF/archive/export/download generation: forbidden.
- ZATCA and email commands: forbidden.
- Migrations, seed/reset/delete, cleanup, deploys, environment/provider/schema changes, backup/restore, production-hosting research, production, beta, shared-target, hosted-target, and customer-data checks: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope.

## 16. Deviations Or Blockers

- No mutation blocker remains.
- A first post-mutation read-only SQL verification printed the main evidence rows, then exited nonzero because a follow-up journal-line select reused a CTE outside its SQL statement scope. The corrected read-only SQL was rerun and exited cleanly.

## 17. Next Recommended Thread

`DEV-08D Part 6: supplier refund from supplier payment evidence verification`
