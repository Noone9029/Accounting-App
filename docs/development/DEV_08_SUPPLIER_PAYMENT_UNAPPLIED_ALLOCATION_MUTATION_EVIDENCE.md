# DEV-08 Supplier Payment Unapplied Allocation Mutation Evidence

## Purpose And Scope

This document records DEV-08 Part 8: the approved local-only supplier payment unapplied allocation mutation for the AP fixture under marker `DEV08-AP-20260525T230000`.

The mutation applied exactly `200.0000` from the existing DEV-08 supplier payment unapplied amount to `BILL-000007`.

No supplier payment creation, second supplier payment, purchase bill creation, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA artifact, supplier payment void, allocation reversal, purchase bill void, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.

## Approval Phrase Received

`I approve DEV-08 Part 8 local-only supplier payment unapplied allocation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active supplier payment unapplied amount 200.0000. No production, no beta, no customer data.`

## Local-Only Target Proof

- Latest inspected commit before mutation: `2a62b2a9 Plan DEV-08 supplier payment unapplied allocation`.
- `HEAD` matched `origin/main`: `2a62b2a942adff7256beb9d5864a24d7add5fa36`.
- Branch: `main`.
- Docker engine: Linux engine available, server version `28.5.1`.
- Local containers: `infra-postgres-1` and `infra-redis-1` were healthy.
- Mutation script target classification: `host=localhost`, `port=5432`, `database=accounting`.
- The guarded script refused forbidden hosted/prod/beta target tokens before importing write-capable services.
- Database URL, credentials, tokens, cookies, request/response bodies, vendor/customer data, document bodies, signed XML, and QR payloads were not printed.

## Preflight Evidence

Marker: `DEV08-AP-20260525T230000`.

Family: `ap`.

Read-only preflight and guarded script checks confirmed:

- Supplier:
  - Exactly one supplier found.
  - Label: `DEV08-AP-20260525T230000 Supplier`.
  - Safe id prefix: `0e36df97`.
  - Type/status: `SUPPLIER`, active.
  - Organization safe id prefix: `db69e5a8`.
- Supplier payment before mutation:
  - Payment number: `PAY-000006`.
  - Safe id prefix: `622ad0b6`.
  - Status: `POSTED`.
  - Amount paid: `500.0000`.
  - Unapplied amount: `200.0000`.
  - Journal: `JE-000050`, safe id prefix `b77bd6f7`.
  - Void reversal journal: absent.
  - Actor safe id prefix: `09f892d4`.
- Purchase bill before mutation:
  - Bill number: `BILL-000007`.
  - Safe id prefix: `d81ddd60`.
  - Status: `FINALIZED`.
  - Total: `1150.0000`.
  - Balance due: `850.0000`.
  - Reversal journal: absent.
  - Same supplier and same organization as the payment.
- Allocation baseline:
  - Direct `SupplierPaymentAllocation` count: `1`.
  - Direct allocation safe id prefix: `6ec44d14`.
  - Direct allocation amount: `300.0000`.
  - `SupplierPaymentUnappliedAllocation` count for the fixture: `0`.
  - Active `SupplierPaymentUnappliedAllocation` count for the fixture: `0`.
  - `PurchaseDebitNoteAllocation` count for `BILL-000007`: `0`.
- Audit baseline:
  - `SUPPLIER_PAYMENT_CREATED` for `PAY-000006`: `1`.
  - Raw `APPLY_UNAPPLIED` for `PAY-000006`: `0`.
  - Supplier payment void audit: `0`.
  - Fixture unapplied reverse audit: `0`.
  - Supplier refund, purchase debit note, and purchase bill void audit counts: `0`.
- Sequence baseline:
  - `PAYMENT`: prefix `PAY-`, next number `7`, padding `6`.
  - `JOURNAL_ENTRY`: prefix `JE-`, next number `51`, padding `6`.

## Mutation Performed

The temporary guarded script called `SupplierPaymentService.applyUnapplied(...)` exactly once with this DTO shape:

```ts
await supplierPaymentService.applyUnapplied(organizationId, actorUserId, supplierPaymentId, {
  billId: "<BILL-000007 id>",
  amountApplied: "200.0000",
});
```

The successful call applied the full `200.0000` unapplied amount on `PAY-000006` to `BILL-000007`.

No supplier payment create, reverse, void, supplier refund, purchase debit note, purchase bill mutation, output/PDF/archive, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Payment Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Payment number | `PAY-000006` | `PAY-000006` |
| Safe id prefix | `622ad0b6` | `622ad0b6` |
| Status | `POSTED` | `POSTED` |
| Amount paid | `500.0000` | `500.0000` |
| Unapplied amount | `200.0000` | `0.0000` |
| Journal | `JE-000050` | `JE-000050` |
| Journal safe id prefix | `b77bd6f7` | `b77bd6f7` |
| Void reversal journal | absent | absent |

## Bill Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Bill number | `BILL-000007` | `BILL-000007` |
| Safe id prefix | `d81ddd60` | `d81ddd60` |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `1150.0000` | `1150.0000` |
| Balance due | `850.0000` | `650.0000` |
| Reversal journal | absent | absent |
| Purchase debit note allocations | `0` | `0` |

## Allocation Before And After

| Check | Before | After |
| --- | ---: | ---: |
| Direct supplier payment allocations | `1` | `1` |
| Direct allocation amount | `300.0000` | `300.0000` |
| Supplier payment unapplied allocations | `0` | `1` |
| New unapplied allocation safe prefix | n/a | `a8ee4e23` |
| New unapplied allocation amount | n/a | `200.0000` |
| Reversed metadata on new allocation | n/a | absent |
| Purchase debit note allocations | `0` | `0` |

The direct `SupplierPaymentAllocation` remains a historical allocation for `300.0000`. The new `SupplierPaymentUnappliedAllocation` links `PAY-000006` to `BILL-000007`, has amount `200.0000`, and has `reversedAt`, `reversedById`, and `reversalReason` absent.

## Journal And Accounting Non-Effect

The apply-unapplied path was confirmed as matching-only.

- Organization journal count: `50 -> 50`.
- `JOURNAL_ENTRY` sequence remained next `51`.
- `PAYMENT` sequence remained next `7`.
- Supplier payment journal `JE-000050` remained posted and unchanged.
- Purchase bill journal `JE-000049` remained posted and unchanged.
- No purchase bill reversal journal was created.
- No supplier payment void reversal journal was created.
- No stock movement or inventory journal was created.

## Audit Effect

Audit rows for the fixture after mutation:

| Entity type | Action | Count |
| --- | --- | ---: |
| `SupplierPayment` | `SUPPLIER_PAYMENT_CREATED` | `1` |
| `SupplierPayment` | `APPLY_UNAPPLIED` | `1` |
| `SupplierPayment` | `SUPPLIER_PAYMENT_VOIDED` | `0` |
| `SupplierPaymentUnappliedAllocation` | reverse action for fixture allocation | `0` |
| `PurchaseBill` | `PURCHASE_BILL_VOIDED` | `0` |

The apply action is raw `APPLY_UNAPPLIED`. `audit-events.ts` does not currently standardize `SupplierPayment:APPLY_UNAPPLIED`.

No supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing flow occurred.

## Forbidden Side-Effect Verification

Fixture-specific counts remained absent:

| Check | Before | After |
| --- | ---: | ---: |
| Supplier refunds | `0` | `0` |
| Purchase debit notes | `0` | `0` |
| Purchase debit note allocations | `0` | `0` |
| Purchase orders | `0` | `0` |
| Purchase receipts | `0` | `0` |
| Stock movements | `0` | `0` |
| Cash expenses | `0` | `0` |
| Generated documents for bill | `0` | `0` |
| Generated documents for payment | `0` | `0` |
| Email outbox rows for marker/bill/payment | `0` | `0` |
| Fixture cleanup/delete audit actions | `0` | `0` |

Organization-level existing local ZATCA baselines were unchanged:

- ZATCA signed artifact drafts: `1 -> 1`.
- ZATCA submission logs: `7 -> 7`.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`.
- `docker compose -f infra/docker-compose.yml ps`.
- `Test-Path apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts`.
- `git ls-files --stage apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08 evidence/preflight docs, supplier payment service/controller/DTO/spec paths, purchase bill service path, Prisma schema, audit events, README, and BUG_AUDIT.
- Read-only local SQL preflight through `docker exec -i infra-postgres-1 psql ...`.
- Temporary script execution:
  - `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev08-supplier-payment-apply-unapplied.tmp.ts --marker DEV08-AP-20260525T230000 --family ap --approval <exact approval phrase>`.
- Temporary script cleanup via `apply_patch` deletion.
- Temporary script absence proof:
  - `Test-Path apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts` returned `False`.
  - `git ls-files --stage apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts` returned no index entry.
- Read-only local SQL post-check through `docker exec -i infra-postgres-1 psql ...`.

One read-only preflight SQL query stopped on a UUID/text comparison in an audit-count SELECT after returning the core supplier/payment/bill/allocation checks. The corrected read-only audit/side-effect query completed successfully. No database write occurred during the failed SELECT-only query.

## Commands Skipped And Why

- `verify:repo`, `verify:ci:local`, full tests, full build, E2E, smoke, migrations, seed/reset/delete, deploys, environment/provider changes, login/browser flows, PDF/archive/export/download routes, ZATCA, email, backup/restore, and production-hosting research were skipped because they were explicitly out of scope.
- Targeted supplier-payment tests were skipped because no production code or test code was changed.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts`.
- It was removed immediately after the successful one-time mutation.
- `Test-Path apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts` returned `False`.
- `git ls-files --stage apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts` returned no index entry.
- `git status --short` did not show the temporary script as tracked, staged, or untracked after cleanup.

## Deviations Or Blockers

- No mutation blocker was found.
- The AP-ready local organization continues to have existing local-only ZATCA baseline records (`1` signed artifact draft and `7` submission logs). Those counts were unchanged by this supplier payment unapplied allocation mutation.
- Supplier payment apply-unapplied audit remains raw `APPLY_UNAPPLIED`; supplier AP allocation audit standardization remains a later code-hardening opportunity.

## Next Recommended Thread

`DEV-08 Part 9: supplier payment unapplied allocation reversal preflight`
