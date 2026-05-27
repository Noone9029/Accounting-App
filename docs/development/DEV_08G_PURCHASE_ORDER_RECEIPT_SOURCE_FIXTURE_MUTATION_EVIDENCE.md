# DEV-08G Purchase Order Receipt Source Fixture Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 2: the approved local-only purchase order receipt source fixture mutation.

- Task: `DEV-08G Part 2: approved local purchase order receipt source fixture mutation`.
- Latest commit inspected before mutation: `39a2c7f6 Plan DEV-08G purchase receipt inventory hardening`.
- Local `HEAD` matched `origin/main`: `39a2c7f674a213a88f7309e00eb78375af0b6e77`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- This mutation created one fake local supplier, one fake local inventory-tracked item, and one approved purchase order source fixture ready for receipt testing.
- This mutation did not create a purchase receipt, purchase bill, stock movement, journal, generated document, PDF/archive/export/download, email, ZATCA artifact, supplier payment, supplier refund, purchase debit note, cash expense, cleanup/delete action, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production target, beta target, hosted/shared target, or customer data.

## Approval Phrase Status

Exact approval phrase received and checked before mutation:

```text
I approve DEV-08G Part 2 local-only purchase order receipt source fixture mutation under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.
```

## Local-Only Target Proof

- Docker `infra-postgres-1` was running and healthy on local port `5432`.
- Docker `infra-redis-1` was running and healthy on local port `6379`.
- TCP listeners for Postgres and Redis were local.
- `apps/api/.env` classified as approved local database target:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- The mutation runner refused non-local database targets before dynamically importing write-capable services.
- No production, beta, hosted, shared, Supabase pooler, Vercel, provider, or customer-data target was used.

## Pre-Mutation Readiness

- Approved fake local AP-ready organization safe prefix: `db69e5a8`.
- Active organization memberships available: `2`.
- Active posting revenue accounts available: `1`.
- Active posting accounts available: `17`.
- AP account `210`: present.
- VAT receivable account `230`: present.
- Inventory asset account `130`: present.
- Inventory clearing account `240`: present.
- Active purchase tax rate `15.0000`: present.
- Active warehouses available: `2`.
- Open fiscal period covering `2026-05-27`: present.
- Existing DEV-08G marker records before mutation:
  - contacts: `0`.
  - items: `0`.
  - warehouses: `0`.
  - purchase orders: `0`.
  - purchase bills: `0`.
  - purchase receipts: `0`.
  - stock movements: `0`.
  - journal entries: `0`.
  - generated documents: `0`.
  - email outbox rows: `0`.
  - email provider events: `0`.
  - supplier payments: `0`.
  - supplier refunds: `0`.
  - purchase debit notes: `0`.
  - cash expenses: `0`.

## Service Calls Made

The final guarded runner instantiated the real LedgerByte services directly after the local-target guard and used these service methods:

- `ContactService.create(...)`: `1`.
- `ItemService.create(...)`: `1`.
- `PurchaseOrderService.create(...)`: `1`.
- `PurchaseOrderService.approve(...)`: `1`.

No `WarehouseService.create(...)` call was made because an existing active local warehouse was reused.

No `PurchaseOrderService.markSent(...)` call was made because Part 1 proved an `APPROVED` purchase order is sufficient for receipt creation.

## Fixture Created

Supplier:

- Safe prefix: `f5deec9a`.
- Type: `SUPPLIER`.
- Active: `true`.

Item:

- Safe prefix: `3b8d7650`.
- Status: `ACTIVE`.
- Inventory tracking: `true`.
- Purchase cost used for deterministic receipt planning: `100.0000`.

Warehouse:

- Safe prefix: `197fac56`.
- Code: `MAIN`.
- Status: `ACTIVE`.
- Reused existing local active warehouse: `true`.

Purchase order:

- Purchase order number: `PO-000003`.
- Safe prefix: `a3efc2e4`.
- Final status: `APPROVED`.
- Converted bill: absent.
- Subtotal: `1000.0000`.
- Tax total: `150.0000`.
- Total: `1150.0000`.

Purchase order line:

- Safe prefix: `22f17076`.
- Item safe prefix: `3b8d7650`.
- Quantity: `10.0000`.
- Unit price: `100.0000`.
- Tax rate: `15.0000`.
- Tax scope: `PURCHASES`.

Fiscal period:

- Safe prefix: `3211c06e`.
- Name: `2026`.
- Status: `OPEN`.

## Audit Evidence

Fixture-scoped audit actions observed after the mutation:

- `Contact` `CREATE`: `1`.
- `Item` `CREATE`: `1`.
- `PurchaseOrder` `PURCHASE_ORDER_CREATED`: `1`.
- `PurchaseOrder` `PURCHASE_ORDER_APPROVED`: `1`.

No login/browser audit-writing flow was run.

## Forbidden Side-Effect Results

Marker/source-scoped counts after mutation:

- Purchase receipts: `0`.
- Stock movements: `0`.
- Journal entries: `0`.
- Purchase bills: `0`.
- Generated documents: `0`.
- Email outbox rows: `0`.
- Email provider events: `0`.
- Supplier payments: `0`.
- Supplier refunds: `0`.
- Purchase debit notes: `0`.
- Cash expenses: `0`.

Marker-scoped records after mutation:

- Contacts: `1`.
- Items: `1`.
- Warehouses: `0` because the active local warehouse was reused.
- Purchase orders: `1`.
- Purchase bills: `0`.
- Purchase receipts: `0`.
- Stock movements: `0`.
- Journal entries: `0`.
- Generated documents: `0`.
- Email outbox rows: `0`.
- Email provider events: `0`.
- Supplier payments: `0`.
- Supplier refunds: `0`.
- Purchase debit notes: `0`.
- Cash expenses: `0`.

## Runner Notes And Cleanup

- A temporary script path was used: `apps/api/scripts/dev08g-part2-runner.ts`.
- The initial full Nest application-context runner exited before service calls; read-only marker counts after that attempt confirmed no DEV-08G records were created.
- The final runner used direct service instantiation after the local-target guard, called the exact service methods listed above, and completed successfully.
- The temporary script was removed after execution.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git status --short --branch`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `docker ps --format "{{.Names}}|{{.Status}}|{{.Ports}}"`.
- Local `DATABASE_URL` classification script, without printing the URL.
- `Get-NetTCPConnection -LocalPort 5432,6379 -State Listen`.
- Read-only Prisma readiness and marker-count checks.
- `corepack pnpm exec tsx scripts/dev08g-part2-runner.ts` with exact approval supplied through `DEV08G_PART2_APPROVAL`.
- Read-only post-attempt marker-count check after the initial non-mutating runner failure.

## Commands Skipped

- Purchase receipt creation.
- Purchase bill creation/conversion/finalization.
- Stock movement creation outside the allowed item/PO fixture path.
- Journal posting.
- Generated document, PDF/archive/export/download output.
- Email and ZATCA commands.
- Login/browser audit-writing flows.
- Migrations, seed/reset/delete, cleanup/delete, deploys, environment/provider/schema changes, production checks, beta checks, hosted/shared-target checks, customer-data checks, E2E, smoke, full tests, full build, `verify:repo`, and actual `verify:ci:local`.

## Exact Next Prompt Title

`DEV-08G Part 3: purchase order receipt source fixture evidence verification`
