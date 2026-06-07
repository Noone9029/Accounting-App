# FIFO Cost-Layer Groundwork Sprint Closure

Date: 2026-06-06

Product: LedgerByte

Sprint: FIFO Cost-Layer Groundwork Sprint

## Summary

This sprint added read-only FIFO cost-layer preview groundwork for inventory items and warehouses. Users can preview reconstructed layers, oldest-layer consumption, warning/blocker conditions, FIFO preview value, current operational valuation value when safely available, and the difference between the two.

LedgerByte remains controlled beta/user-testing only. This sprint does not implement active FIFO valuation, persistent cost layers, cost-layer posting, stock valuation updates, moving-average replacement, COGS posting, journal posting, AP/AR adjustment, VAT changes, ZATCA behavior, financial statement updates, landed-cost posting, production hosting, or hosted/customer-data proof.

## Implemented Scope

- Added an in-memory FIFO preview service that reconstructs layers from existing stock movements.
- Added read-only FIFO preview endpoints under Inventory.
- Added `/inventory/fifo-preview` frontend route.
- Added item, warehouse, and as-of date filters.
- Added summary metrics for on-hand quantity, FIFO preview value, current operational value, difference, warnings, and blockers.
- Added layer table with source movement and source document context.
- Added consumption preview table showing outbound movement layer consumption.
- Added structured warning and blocker codes.
- Added source links from inventory balances, stock valuation, stock movement ledger, warehouse detail, landed cost preview, and valuation variance preview.
- Added route permission mapping and sidebar navigation.
- Added FIFO preview policy documentation.

## API Endpoints

New read-only endpoints:

- `GET /inventory/fifo-preview`
- `GET /inventory/fifo-preview/items/:itemId`
- `GET /inventory/fifo-preview/warehouses/:warehouseId`
- `GET /inventory/fifo-preview/items/:itemId/warehouses/:warehouseId`

All endpoints require `inventory.view`, read organization-scoped inventory data, and return explicit non-effect flags.

## Frontend Routes And Components

New route:

- `/inventory/fifo-preview`

Updated surfaces:

- Inventory sidebar navigation.
- Route permission mapping.
- Inventory balances.
- Stock valuation report.
- Stock movement ledger.
- Warehouse detail.
- Landed cost preview.
- Inventory valuation variance preview.

## FIFO Layer Preview Behavior

- Movements are ordered by movement date, created time, and ID.
- Layers are computed separately for each item and warehouse.
- Inbound movements create preview layers.
- Unit cost is taken from movement `unitCost`, or derived from `totalCost / quantity` when safe.
- Missing cost data keeps the quantity layer visible but makes layer value unavailable and emits warnings.
- No cost layers are persisted.

## Consumption Behavior

- Outbound movements consume the oldest available layers first.
- Consumption rows list consumed layer IDs, quantities, unit costs when known, and estimated cost when safely calculable.
- If an outbound movement exceeds available layers, the preview emits insufficient and negative-layer blockers instead of failing the whole response.

## Return Handling

- Purchase returns use `PURCHASE_RETURN_OUT` movements and consume FIFO layers in the affected item/warehouse scope.
- If purchase return cost is not safely traceable from the movement, the preview emits `UNTRACEABLE_PURCHASE_RETURN_COST`.
- Sales returns use `SALES_RETURN_IN` movements and create inbound return layers.
- If sales return cost is not safely traceable from the movement, the preview emits `UNTRACEABLE_SALES_RETURN_COST` and `MISSING_UNIT_COST`.
- Return preview behavior does not create credits, refunds, AP/AR changes, COGS reversals, VAT changes, or journals.

## Warning And Blocker Behavior

Supported codes:

- `MISSING_UNIT_COST`
- `NEGATIVE_LAYER_QUANTITY`
- `INSUFFICIENT_LAYER_QUANTITY`
- `UNSUPPORTED_TRANSFER_SHAPE`
- `UNTRACEABLE_PURCHASE_RETURN_COST`
- `UNTRACEABLE_SALES_RETURN_COST`
- `MIXED_WAREHOUSE_SCOPE`
- `NO_MOVEMENTS`
- `PREVIEW_ONLY_NOT_ACCOUNTING_METHOD`

Warnings keep the preview readable while making uncertainty explicit. Blockers identify movement histories that cannot support a reliable FIFO valuation answer.

## Permission Behavior

- `inventory.view` controls all FIFO preview endpoints and the frontend page.
- Source links reuse existing source permissions:
  - Purchase receipts: `purchaseReceiving.view`
  - Sales stock issues: `salesStockIssue.view`
  - Purchase returns: existing purchase visibility permissions
  - Sales inventory returns: `salesInvoices.view`
  - Adjustments: `inventoryAdjustments.view`
  - Transfers: `warehouseTransfers.view`

No new permission strings were added.

## Audit Behavior

No audit events were added. Ordinary FIFO previews are read-only calculations, not lifecycle or posting actions.

## Non-Effect Behavior

This sprint does not:

- Persist active FIFO layers.
- Switch valuation method.
- Update moving average.
- Update stock valuation.
- Create inventory movements.
- Mutate purchase, sales, return, adjustment, transfer, landed-cost, or valuation-variance records.
- Create COGS postings.
- Reverse COGS.
- Post journals.
- Affect AP or AR.
- Affect VAT.
- Affect ZATCA.
- Affect financial statements.
- Send email.
- Change production infrastructure, Vercel, Supabase, runtime DB roles, object storage, backup/restore, or customer-data handling.

## Schema And Migrations

No Prisma schema changes or migrations were added.

FIFO preview is computed from existing inventory movement data only.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- inventory-fifo-preview.service.spec.ts inventory.controller.spec.ts --runInBand` - passed, 2 suites / 21 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- fifo-preview/page.test.tsx inventory.test.ts permissions.test.ts --runInBand` - passed before source-link test prop follow-up, 3 suites / 29 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- inventory-guidance.test.tsx fifo-preview/page.test.tsx inventory.test.ts permissions.test.ts --runInBand` - passed after source-link test prop follow-up, 4 suites / 34 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - blocked only by unrelated `apps/web/src/app/marketing.test.tsx` `HomePage` JSX component errors at lines 35 and 65.
- `git diff --check` - passed; emitted line-ending warnings only.

## Known Blocker

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx` reports `HomePage` as `() => void` at lines 35 and 65.

Marketing files were not modified by this sprint.

## 2026-06-06 Traceability Follow-Up

The Serial Batch Bin Location Groundwork Sprint added optional stock movement references for batch, serial, and bin/location metadata plus item tracking setup records.

FIFO remains a read-only preview. The new traceability references are operational metadata only and do not activate FIFO, persist active FIFO layers, change moving-average valuation, update stock valuation, create COGS postings, post journals, or mutate historical inventory movements.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Remaining Gaps

- No active FIFO valuation method.
- No persistent cost-layer ledger.
- No migration/backfill of historical movements.
- No accountant-approved active FIFO policy.
- No landed-cost-to-FIFO layer capitalization.
- No COGS posting or reversal under FIFO.
- No return movement reversal.
- No negative-stock production policy.
- No broad browser workflow QA.
- No hosted/customer-data proof.
- No production readiness claim.

## Recommended Next Sprint

Recommended next sprint:

> Run a focused FIFO preview browser workflow and accountant policy review sprint for item/warehouse/as-of filtering, transfer rows, purchase-return rows, sales-return rows, missing-cost blockers, source-link permissions, and safe wording. Keep it read-only and do not implement active FIFO, persistent cost layers, stock valuation updates, COGS posting, journal posting, AP/AR adjustment, VAT effects, ZATCA behavior, production hosting, or landed-cost posting.
