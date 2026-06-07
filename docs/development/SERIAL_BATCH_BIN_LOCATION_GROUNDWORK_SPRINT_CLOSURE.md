# Serial Batch Bin Location Groundwork Sprint Closure

Date: 2026-06-06

Product: LedgerByte

Sprint: Serial Batch Bin Location Groundwork Sprint

## Summary

LedgerByte now has inventory traceability groundwork for item tracking settings, warehouse bin/location setup, batch/lot setup, serial-number setup, optional movement tracking references, and read-only item traceability visibility.

The sprint keeps existing non-tracked inventory flows intact and conservative. It does not force existing items into serial, batch, expiry, or bin tracking, and it blocks advanced-tracked items in legacy movement flows that do not yet capture the required metadata.

## Schema And Migration

Added additive Prisma groundwork:

- `ItemTrackingMode`
- `InventoryBinLocationType`
- `InventoryBinLocationStatus`
- `InventoryBatchStatus`
- `InventorySerialNumberStatus`
- Item tracking fields:
  - `trackingMode`
  - `expiryTrackingEnabled`
  - `binTrackingEnabled`
- `InventoryBinLocation`
- `InventoryBatch`
- `InventorySerialNumber`
- Nullable stock movement references:
  - `batchId`
  - `serialNumberId`
  - `binLocationId`
  - `fromBinLocationId`
  - `toBinLocationId`

Migration:

- `apps/api/prisma/migrations/20260606143000_serial_batch_bin_location_groundwork/migration.sql`

The migration is additive. Existing items default to `NONE`. No historical movement backfill, quantity adjustment, valuation update, or accounting posting is performed.

## Backend API

Added read-only traceability and setup APIs under `/inventory`:

- `GET /inventory/traceability/items/:itemId`
- `GET /inventory/bin-locations`
- `GET /inventory/bin-locations/:id`
- `GET /inventory/batches`
- `GET /inventory/batches/:id`
- `GET /inventory/serial-numbers`
- `GET /inventory/serial-numbers/:id`

Added setup write APIs:

- `POST /inventory/bin-locations`
- `PATCH /inventory/bin-locations/:id`
- `POST /inventory/batches`
- `PATCH /inventory/batches/:id`
- `POST /inventory/serial-numbers`
- `PATCH /inventory/serial-numbers/:id`

Item create/update now accepts tracking settings. Tracking setting changes are blocked when an item already has stock movements.

## Frontend Routes

Added Inventory routes:

- `/inventory/bin-locations`
- `/inventory/bin-locations/new`
- `/inventory/bin-locations/[id]`
- `/inventory/batches`
- `/inventory/batches/new`
- `/inventory/batches/[id]`
- `/inventory/serial-numbers`
- `/inventory/serial-numbers/new`
- `/inventory/serial-numbers/[id]`
- `/inventory/traceability/items/[id]`

Added shared traceability setup UI in:

- `apps/web/src/components/inventory/traceability-setup-pages.tsx`

The item list/create/edit surface now shows tracking mode, expiry tracking, bin tracking, safe helper wording, and traceability links where permissions allow them.

## Tracking Settings Behavior

Existing items default to `NONE`.

New and existing non-tracked item flows continue to work for `NONE`.

Tracking setting changes are allowed only when the item has no stock movements. Items with existing movements are blocked until a future migration/backfill policy exists.

Expiry tracking is allowed only for batch-capable modes.

Tracking helper text states that tracking settings do not change historical inventory valuation, FIFO preview, COGS, journals, VAT, or financial statements.

## Bin And Location Behavior

Bin/location records are optional and warehouse-scoped.

Bin code is unique per organization and warehouse.

The location type list includes `IN_TRANSIT` for future transfer visibility, but this sprint does not implement a transfer state machine, carrier workflow, warehouse automation, or logistics integration.

## Batch And Lot Behavior

Batches are item-scoped setup records.

Batch number is unique per organization and item.

Expiry date is required only when the item has expiry tracking enabled.

Batch records do not create cost layers, valuation records, COGS entries, or journal entries.

## Serial Number Behavior

Serial numbers are item-scoped setup records.

Serial number is unique per organization and item.

Serial records can reference a batch, current warehouse, current bin/location, and last movement, but this sprint does not automate serial status transitions across all movement workflows.

## Movement Validation Behavior

Added validation helpers for batch, serial, bin/location, expiry, and current-flow tracked-item support.

Direct opening balance stock movement can carry optional batch, serial, and bin/location references when validation passes.

Legacy movement flows that do not capture serial, batch, expiry, or bin metadata block advanced-tracked items. This includes adjustment, transfer, purchase receipt, sales stock issue, purchase-return stock-out, and sales-return stock-in paths where full tracking capture is not implemented.

Non-tracked item movement compatibility is preserved.

## Traceability View Behavior

The item traceability view is read-only and shows:

- Item tracking settings.
- Batches.
- Serial numbers.
- Warehouses related through serial location or movement metadata.
- Bin/location records related through serial location or movement metadata.
- Movements with available batch, serial, and bin/location references.
- Warnings for missing metadata on tracked items.

The view does not mutate movements, infer missing historical tracking, or repair partially tracked data.

## Source Integration

Added safe traceability links from:

- Item list actions.
- Warehouse detail.
- Stock valuation report rows.
- Stock movement ledger rows.
- Valuation variance preview item context.

Landed cost preview wording now notes that FIFO remains preview-only.

## Permissions

Existing permissions are reused:

- `inventory.view` for traceability, list, and detail routes.
- `inventory.manage` for bin, batch, serial, and item tracking setup writes.

No new permission strings were added.

## Audit Behavior

Added audit events for:

- Bin location created.
- Bin location updated.
- Batch created.
- Batch updated.
- Serial number created.
- Serial number updated.
- Item tracking settings updated.

Audit metadata is compact and ID-focused. Full setup payload bodies, notes, and document bodies are not logged.

## Non-Effect Behavior

This sprint does not:

- Change stock quantities unexpectedly.
- Force tracking on existing items.
- Mutate historical movements.
- Run historical tracking backfill.
- Update inventory valuation.
- Activate FIFO.
- Create active FIFO cost layers.
- Create COGS postings.
- Reverse COGS.
- Post journals.
- Change AP or AR.
- Affect VAT.
- Affect ZATCA.
- Change landed cost behavior.
- Affect financial statements.
- Run production commands.
- Change Vercel, Supabase, runtime DB roles, object storage, backup/restore, or customer-data handling.

## Validation

Commands run:

- `corepack pnpm db:generate` - passed; Prisma Client generated. Prisma emitted the existing `package.json#prisma` deprecation warning for Prisma 7 migration planning.
- `corepack pnpm --filter @ledgerbyte/api test -- inventory-traceability.service.spec.ts item.service.spec.ts stock-movement.service.spec.ts inventory.controller.spec.ts inventory-tracking-validation.spec.ts --runInBand` - passed, 5 suites / 32 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=traceability-setup-pages.test.tsx` - passed, 1 suite / 4 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=items/page.test.tsx` - passed, 1 suite / 1 test.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=inventory.test.ts` - passed, 1 suite / 16 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=permissions.test.ts` - passed, 1 suite / 10 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=landed-cost/page.test.tsx` - passed, 1 suite / 5 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=fifo-preview/page.test.tsx` - passed, 1 suite / 4 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - blocked only by unrelated `apps/web/src/app/marketing.test.tsx` `HomePage` JSX component errors at lines 35 and 65.
- `git diff --check` - passed; emitted line-ending warnings only.

## Marketing Typecheck Blocker

Repo-wide web typecheck is expected to remain blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- `HomePage` is reported as `() => void` at lines 35 and 65.

Marketing files were not modified.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Skipped Scope

Skipped by sprint boundary:

- Full tracked movement workflow capture for every movement source.
- Serial status automation.
- Batch expiry automation.
- Bin transfer state machine.
- Carrier/logistics integration.
- Historical movement migration/backfill.
- Active FIFO valuation.
- Inventory valuation updates.
- COGS or journal posting.
- Broad E2E or hosted/customer-data checks.

## Remaining Gaps

- Purchase receipts, sales stock issues, adjustments, transfers, purchase returns, and sales inventory returns still need full tracked metadata capture before advanced-tracked items can move through those flows.
- Serial status transitions are setup/read-model only.
- Batch expiry review/quarantine workflows are not implemented.
- In-transit location is a setup concept only.
- No historical backfill/reconciliation tooling exists.
- No accountant-approved full tracking migration policy exists.
- No hosted/customer-data proof or broad E2E coverage was added.

## Recommended Next Sprint

Recommended next sprint:

> Implement a Tracked Inventory Movement Capture Sprint for purchase receipts, sales stock issues, adjustments, transfers, purchase returns, and sales inventory returns. Add serial, batch, expiry, bin, and in-transit capture where each flow can validate metadata safely, preserve non-tracked item compatibility, and keep valuation, FIFO, COGS, journals, AP, AR, VAT, ZATCA, landed cost, hosted infrastructure, and historical backfill out of scope unless separately approved.
