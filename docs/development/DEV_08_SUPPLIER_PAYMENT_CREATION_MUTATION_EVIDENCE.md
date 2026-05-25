# DEV-08 Supplier Payment Creation Mutation Evidence

## Purpose And Scope

This document records DEV-08 Part 5: the approved local-only supplier payment creation mutation for the AP fixture under marker `DEV08-AP-20260525T230000`.

The mutation created exactly one supplier payment against `BILL-000007`:

- Payment amount: `500.0000`.
- Direct allocation to `BILL-000007`: `300.0000`.
- Expected unapplied amount: `200.0000`.
- Paid-through account: `112 Bank Account`, safe id prefix `32ab6f4d`.
- No supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA artifact, void/reversal, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.

## Approval Phrase Received

`I approve DEV-08 Part 5 local-only supplier payment creation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 with payment amount 500.0000 and direct allocation 300.0000. No production, no beta, no customer data.`

## Local-Only Target Proof

- Latest inspected commit before mutation: `4ba66b05 Plan DEV-08 supplier payment creation`.
- `HEAD` matched `origin/main`: `4ba66b0500bb14e2bb2196e05a0b395a8846b421`.
- Branch: `main`.
- Docker engine: Linux engine available.
- Local containers: `infra-postgres-1` and `infra-redis-1` were healthy.
- Mutation script target classification: `host=localhost`, `port=5432`, `database=accounting`.
- The guarded script refused forbidden hosted/prod/beta target tokens before importing write-capable services.
- Database URL, credentials, tokens, cookies, request/response bodies, vendor/customer data, document bodies, signed XML, and QR payloads were not printed.

## Preflight Evidence

- Marker: `DEV08-AP-20260525T230000`.
- Family: `ap`.
- Supplier:
  - Exactly one supplier found.
  - Label: `DEV08-AP-20260525T230000 Supplier`.
  - Safe id prefix: `0e36df97`.
  - Type/status: `SUPPLIER`, active.
  - Organization safe id prefix: `db69e5a8`.
- Purchase bill before mutation:
  - Bill number: `BILL-000007`.
  - Safe id prefix: `d81ddd60`.
  - Status/mode: `FINALIZED` / `DIRECT_EXPENSE_OR_ASSET`.
  - Total: `1150.0000`.
  - Balance due: `1150.0000`.
  - Reversal journal: absent.
  - Supplier payment allocations: `0`.
  - Supplier payment unapplied allocation records: `0`.
  - Purchase debit note allocations: `0`.
- Accounts:
  - Paid-through account: `112 Bank Account`, `ASSET`, active, posting enabled, safe id prefix `32ab6f4d`.
  - Bank profile for account `112`: `ACTIVE`, currency `SAR`.
  - Accounts payable account: `210 Accounts Payable`, active, posting enabled, safe id prefix `883ea9a6`.
- Fiscal period:
  - `2026`, status `OPEN`, covered payment date `2026-05-25`.
- Sequences before mutation:
  - `PAYMENT`: `PAY-6`, padding `6`.
  - `JOURNAL_ENTRY`: `JE-50`, padding `6`.
- Accounting baseline:
  - Purchase bill journal: `JE-000049`, safe id prefix `3dfa0a86`, `POSTED`, debit `1150.0000`, credit `1150.0000`.
  - No supplier payment journal existed for this fixture.
- Audit baseline:
  - Supplier payment created audit for this fixture: `0`.
  - Supplier payment void audit for this fixture: `0`.
- Forbidden side-effect baseline:
  - Supplier payments for marker: `0`.
  - Supplier payment allocations for bill: `0`.
  - Supplier payment unapplied allocations for bill: `0`.
  - Supplier refunds for supplier: `0`.
  - Purchase debit notes for supplier or bill: `0`.
  - Purchase debit note allocations for bill: `0`.
  - Purchase orders for supplier: `0`.
  - Purchase receipts for supplier or bill: `0`.
  - Stock movements for marker or bill: `0`.
  - Cash expenses for supplier: `0`.
  - Generated documents for bill/marker: `0`.
  - Email outbox rows for marker/bill: `0`.
  - ZATCA signed artifact organization baseline: `1`.
  - ZATCA submission log organization baseline: `7`.

## Mutation Performed

The temporary guarded script called `SupplierPaymentService.create(...)` exactly once with this DTO shape:

```ts
{
  supplierId: "<DEV-08 supplier id>",
  paymentDate: "2026-05-25",
  currency: "SAR",
  amountPaid: "500.0000",
  accountId: "<account 112 id>",
  description: "DEV08-AP-20260525T230000 local-only supplier payment fixture",
  allocations: [{ billId: "<BILL-000007 id>", amountApplied: "300.0000" }]
}
```

No supplier refund, debit note, purchase bill void, output/PDF/archive, email, ZATCA, cleanup, migration, seed/reset/delete, deployment, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Supplier Payment Created

- Payment number: `PAY-000006`.
- Safe id prefix: `622ad0b6`.
- Status: `POSTED`.
- Amount paid: `500.0000`.
- Unapplied amount: `200.0000`.
- Void reversal journal: absent.
- Supplier refund records: `0`.

## Bill Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `1150.0000` | `1150.0000` |
| Balance due | `1150.0000` | `850.0000` |
| Reversal journal | absent | absent |
| Direct supplier payment allocations | `0` | `1` |
| Purchase debit note allocations | `0` | `0` |

## Allocation Evidence

- Exactly one `SupplierPaymentAllocation` was created for `PAY-000006` and `BILL-000007`.
- Allocation safe id prefix: `6ec44d14`.
- Amount applied: `300.0000`.
- No `SupplierPaymentUnappliedAllocation` record was created during payment creation.
- The remaining unapplied amount is stored on `SupplierPayment.unappliedAmount` as `200.0000`.

## Journal And Accounting Result

- One supplier payment journal was created:
  - Journal number: `JE-000050`.
  - Safe id prefix: `b77bd6f7`.
  - Status: `POSTED`.
  - Total debit: `500.0000`.
  - Total credit: `500.0000`.
- Journal lines:
  - Debit account `210` for `500.0000`.
  - Credit account `112` for `500.0000`.
- The journal is balanced.
- Purchase bill journal `JE-000049` remains the original posted bill journal.
- No purchase bill reversal journal was created.
- No supplier payment void reversal journal was created.
- Sequences after mutation:
  - `PAYMENT`: `PAY-7`, padding `6`.
  - `JOURNAL_ENTRY`: `JE-51`, padding `6`.

## Audit Result

- One supplier payment creation audit action exists:
  - Entity type: `SupplierPayment`.
  - Action: `SUPPLIER_PAYMENT_CREATED`.
  - Count for `PAY-000006`: `1`.
- Supplier payment void audit for `PAY-000006`: `0`.
- Fixture-specific cleanup/delete audit count remained `0`.
- No supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action was created by this mutation.

## Forbidden Side-Effect Verification

Post-mutation fixture-specific counts:

| Check | Count |
| --- | ---: |
| Supplier refunds | `0` |
| Purchase debit notes | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Generated documents | `0` |
| Email outbox rows | `0` |
| Fixture cleanup/delete audit actions | `0` |

Organization-level existing ZATCA baselines were unchanged:

- ZATCA signed artifact drafts: `1 -> 1`.
- ZATCA submission logs: `7 -> 7`.

The guarded script also asserted that auth-token count, generated-document count, email count, ZATCA counts, supplier refund count, purchase debit note count, purchase order count, purchase receipt count, stock movement count, cash expense count, and cleanup/delete audit count did not change unexpectedly.

## Commands Run

- `git fetch origin main`
- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`
- `docker compose -f infra/docker-compose.yml ps`
- Read-only source/doc inspection with `Get-Content` and `rg`.
- Read-only local SQL preflight using `docker exec -i infra-postgres-1 psql ...`.
- Temporary script execution:
  - `corepack pnpm exec tsx scripts/dev08-supplier-payment-create.tmp.ts --marker DEV08-AP-20260525T230000 --family ap --approval <exact approval phrase>`
- Temporary script cleanup:
  - `Remove-Item -LiteralPath apps/api/scripts/dev08-supplier-payment-create.tmp.ts`
- Temporary script absence proof:
  - `Test-Path apps/api/scripts/dev08-supplier-payment-create.tmp.ts` returned `False`.
- Read-only local SQL post-check using `docker exec -i infra-postgres-1 psql ...`.

Two read-only SQL query attempts failed due to result-formatting typos before returning evidence; both were SELECT-only and performed no database writes.

## Commands Skipped

- `verify:repo`, `verify:ci:local`, full tests, full build, E2E, smoke, migrations, seed/reset/delete, deploys, environment/provider changes, login/browser flows, PDF/archive/export/download routes, ZATCA, email, backup/restore, and production-hosting research were skipped because they were explicitly out of scope.
- Targeted supplier-payment and purchase-bill tests were skipped because no production code or test code was changed.

## Temporary Script Cleanup Proof

- The temporary script path was `apps/api/scripts/dev08-supplier-payment-create.tmp.ts`.
- It was removed immediately after the successful one-time mutation.
- `Test-Path apps/api/scripts/dev08-supplier-payment-create.tmp.ts` returned `False`.
- `git status --short` did not show the temporary script as tracked, staged, or untracked after cleanup.

## Deviations Or Blockers

- No mutation blocker was found.
- The AP-ready local organization continues to have existing local-only ZATCA baseline records (`1` signed artifact draft and `7` submission logs). Those counts were unchanged by this supplier payment mutation.
- The organization has an existing non-fixture cleanup/delete audit baseline, so evidence uses fixture-specific cleanup/delete checks and the guarded script asserted no unexpected cleanup/delete count change.

## Next Recommended Thread

`DEV-08 Part 6: supplier payment evidence verification`
