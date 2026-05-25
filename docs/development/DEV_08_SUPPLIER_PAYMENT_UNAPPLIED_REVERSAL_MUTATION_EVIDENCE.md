# DEV-08 Supplier Payment Unapplied Reversal Mutation Evidence

## Purpose And Scope

This document records DEV-08 Part 10: the approved local-only supplier payment unapplied allocation reversal mutation.

The mutation reversed exactly the active `200.0000` `SupplierPaymentUnappliedAllocation` linked to:

- Supplier payment: `PAY-000006`
- Purchase bill: `BILL-000007`
- Marker: `DEV08-AP-20260525T230000`
- Family: `ap`

No supplier payment creation, second supplier payment, purchase bill creation, additional apply-unapplied allocation, supplier payment void, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA artifact, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.

## Approval Phrase Received

```text
I approve DEV-08 Part 10 local-only supplier payment unapplied allocation reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active 200.0000 supplier payment unapplied allocation. No production, no beta, no customer data.
```

Reversal reason used:

```text
DEV-08 local-only reversal QA for supplier payment unapplied allocation
```

## Local-Only Target Proof

- Latest inspected commit before mutation: `8226f909 Plan DEV-08 supplier payment unapplied reversal`.
- `HEAD` matched `origin/main`: `8226f90960fdcb987e00a3ce0c74010f556ac386`.
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

Read-only preflight confirmed:

- Supplier:
  - Count: `1`
  - Display label: `DEV08-AP-20260525T230000 Supplier`
  - Safe id prefix: `0e36df97`
  - Type/status: `SUPPLIER`, active
  - Organization safe id prefix: `db69e5a8`
- Actor membership:
  - Count: `1`
  - Actor safe id prefix: `09f892d4`
  - Membership status: `ACTIVE`
- Supplier payment:
  - Count: `1`
  - Payment number: `PAY-000006`
  - Safe id prefix: `622ad0b6`
  - Status: `POSTED`
  - Amount paid: `500.0000`
  - Unapplied amount: `0.0000`
  - Journal safe id prefix: `b77bd6f7`
  - Void reversal journal: absent
- Purchase bill:
  - Count: `1`
  - Bill number: `BILL-000007`
  - Safe id prefix: `d81ddd60`
  - Status: `FINALIZED`
  - Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`
  - Total: `1150.0000`
  - Balance due: `650.0000`
  - Reversal journal: absent
- Allocation baseline:
  - Direct `SupplierPaymentAllocation` count: `1`
  - Direct allocation safe id prefix: `6ec44d14`
  - Direct allocation amount: `300.0000`
  - `SupplierPaymentUnappliedAllocation` total count: `1`
  - Active `SupplierPaymentUnappliedAllocation` count: `1`
  - Active unapplied allocation safe id prefix: `a8ee4e23`
  - Active unapplied allocation amount: `200.0000`
  - Reversed metadata count on active allocation: `0`
- Future-effect guard:
  - Payment was `POSTED`: `true`
  - Bill was `FINALIZED`: `true`
  - Same supplier: `true`
  - Same organization: `true`
  - Future payment unapplied amount: `200.0000`
  - Future bill balance due: `850.0000`
  - Payment amount limit: `true`
  - Bill balance limit: `true`
- Audit baseline:
  - `SUPPLIER_PAYMENT_CREATED`: `1`
  - Raw `APPLY_UNAPPLIED`: `1`
  - Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`
  - `SUPPLIER_PAYMENT_VOIDED`: `0`
  - Refund/debit-note/bill-void actions for the fixture: `0`
- Side-effect baseline:
  - Supplier refunds: `0`
  - Purchase debit notes: `0`
  - Purchase debit note allocations: `0`
  - Purchase orders: `0`
  - Purchase receipts: `0`
  - Stock movements: `0`
  - Cash expenses: `0`
  - Generated documents: `0`
  - Email outbox records: `0`
- Organization baseline:
  - Journal entries: `50`
  - ZATCA signed artifact drafts: `1`
  - ZATCA submission logs: `7`
  - `JOURNAL_ENTRY` sequence next: `51`
  - `PAYMENT` sequence next: `7`

## Mutation Performed

The temporary guarded script called `SupplierPaymentService.reverseUnappliedAllocation(...)` exactly once with the DTO shape confirmed in Part 9:

```ts
await supplierPaymentService.reverseUnappliedAllocation(
  organizationId,
  actorUserId,
  supplierPaymentId,
  supplierPaymentUnappliedAllocationId,
  {
    reason: "DEV-08 local-only reversal QA for supplier payment unapplied allocation",
  },
);
```

The successful call reversed only the active `200.0000` `SupplierPaymentUnappliedAllocation` safe id prefix `a8ee4e23`.

No supplier payment create, supplier payment apply-unapplied, supplier payment void, supplier refund, purchase debit note, purchase bill mutation, purchase bill void, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Payment Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Payment number | `PAY-000006` | `PAY-000006` |
| Safe id prefix | `622ad0b6` | `622ad0b6` |
| Status | `POSTED` | `POSTED` |
| Amount paid | `500.0000` | `500.0000` |
| Unapplied amount | `0.0000` | `200.0000` |
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
| Balance due | `650.0000` | `850.0000` |
| Reversal journal | absent | absent |

## Allocation Before And After

| Check | Before | After |
| --- | ---: | ---: |
| Direct supplier payment allocations | `1` | `1` |
| Direct allocation safe prefix | `6ec44d14` | `6ec44d14` |
| Direct allocation amount | `300.0000` | `300.0000` |
| Supplier payment unapplied allocations | `1` | `1` |
| Active unapplied allocations | `1` | `0` |
| Reversed unapplied allocations | `0` | `1` |
| Unapplied allocation safe prefix | `a8ee4e23` | `a8ee4e23` |
| Unapplied allocation amount | `200.0000` | `200.0000` |
| `reversedAt` | absent | set |
| `reversedById` | absent | safe prefix `09f892d4` |
| `reversalReason` | absent | `DEV-08 local-only reversal QA for supplier payment unapplied allocation` |
| Purchase debit note allocations | `0` | `0` |

The direct `SupplierPaymentAllocation` remains a historical allocation for `300.0000`. No new allocation was created.

## Journal And Accounting Non-Effect

The reverse-unapplied path was confirmed as matching-only.

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
| `SupplierPaymentUnappliedAllocation` | `REVERSE_UNAPPLIED_ALLOCATION` | `1` |
| `SupplierPayment` | `SUPPLIER_PAYMENT_VOIDED` | `0` |
| refund/debit-note/bill-void actions | any | `0` |

The reverse action is raw `REVERSE_UNAPPLIED_ALLOCATION`. `audit-events.ts` does not currently standardize `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION`.

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
| Generated documents | `0` | `0` |
| Email outbox rows | `0` | `0` |
| Cleanup/delete audit actions | `0` | `0` |

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
- `Test-Path apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts`.
- `git ls-files --stage apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08 evidence/preflight docs, supplier payment service/controller/DTO/spec paths, purchase bill service path, Prisma schema, audit events, README, and BUG_AUDIT.
- Read-only local SQL preflight through `docker exec -i infra-postgres-1 psql ...`.
- Temporary guarded script execution:
  - First attempt: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts ...`.
  - Successful attempt: `corepack pnpm exec tsx scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts ...` from `apps/api`.
- Read-only local SQL check after the stopped first attempt.
- Temporary script cleanup via `apply_patch` deletion.
- Temporary script absence proof:
  - `Test-Path apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts` returned `False`.
  - `git ls-files --stage apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts` returned no index entry.
- Read-only local SQL post-check through `docker exec -i infra-postgres-1 psql ...`.

## Commands Skipped And Why

- `verify:repo`, `verify:ci:local`, full tests, full build, E2E, smoke, migrations, seed/reset/delete, deploys, environment/provider changes, login/browser flows, PDF/archive/export/download routes, ZATCA, email, backup/restore, and production-hosting research were skipped because they were explicitly out of scope.
- Targeted supplier-payment tests were skipped because no production code or test code was changed.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts`.
- It was removed immediately after the successful one-time mutation.
- `Test-Path apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts` returned `False`.
- `git ls-files --stage apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts` returned no index entry.
- `git status --short` did not show the temporary script as tracked, staged, or untracked after cleanup.

## Deviations Or Blockers

- No mutation blocker was found.
- The first guarded script attempt stopped before the service call because the temporary precondition formatter compared Prisma Decimal values as `500` instead of `500.0000`. A read-only check confirmed the fixture remained unchanged, the formatter was corrected, and the script was rerun once successfully.
- The first shell invocation also used the root filter form and emitted a `tsx` workspace resolution warning. The successful invocation ran from `apps/api` with `corepack pnpm exec tsx ...`.
- Supplier payment unapplied reversal audit remains raw `REVERSE_UNAPPLIED_ALLOCATION`; supplier AP allocation audit standardization remains a later code-hardening opportunity.
- The AP-ready local organization continues to have existing local-only ZATCA baseline records (`1` signed artifact draft and `7` submission logs). Those counts were unchanged by this mutation.

## Next Recommended Thread

`DEV-08 Part 11: supplier payment void/reversal preflight`
