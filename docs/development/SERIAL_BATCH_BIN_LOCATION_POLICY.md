# Serial, Batch, Bin, And Location Tracking Policy

Date: 2026-06-06

Product: LedgerByte

Sprint: Serial Batch Bin Location Groundwork Sprint

## Scope

This policy defines operational traceability groundwork for inventory items, bin/location setup, batch/lot setup, serial-number setup, expiry tracking, and read-only item traceability visibility.

This sprint is groundwork only. It does not change historical stock quantities, inventory valuation, moving average, FIFO preview status, COGS, journals, AP, AR, VAT, ZATCA, financial statements, landed cost, or production infrastructure.

## Tracking Modes

Item tracking mode is tenant-scoped and stored on inventory items:

- `NONE`: default for existing and new items unless explicitly changed.
- `SERIAL`: individual serial numbers can be configured for the item.
- `BATCH`: batch or lot records can be configured for the item.
- `SERIAL_AND_BATCH`: serial numbers can be linked to configured batches.

Additional flags:

- `expiryTrackingEnabled`: batch expiry date is required for batch-capable tracked items.
- `binTrackingEnabled`: bin/location metadata can be required by tracked movement validation paths.

Tracking settings are operational traceability settings only. They are not an inventory valuation method.

## Enabling Tracking

Tracking can be enabled directly only when the item has no stock movements.

If an item has existing stock movements, tracking setting changes are blocked until a reviewed migration/backfill policy exists. This prevents a partially tracked history from being presented as complete traceability.

Existing items default to `NONE`. Existing non-tracked item flows must continue to behave as before.

## Serial Number Rules

Serial numbers are unique per organization and item.

Serial statuses:

- `AVAILABLE`
- `RESERVED`
- `ISSUED`
- `RETURNED`
- `QUARANTINED`
- `LOST`
- `SCRAPPED`

Serial setup records can optionally reference a batch, current warehouse, current bin/location, and last movement. This sprint does not automate serial status transitions across every movement workflow.

Serial-tracked movement validation requires integer movement quantities and a serial count matching the movement quantity only in flows that explicitly capture serial metadata.

## Batch And Lot Rules

Batches are unique per organization and item by batch number.

Batch fields:

- Batch number is required.
- Lot number is optional.
- Manufacture date is optional.
- Expiry date is optional unless the item has expiry tracking enabled.
- Notes are setup metadata only.

Batch statuses:

- `ACTIVE`
- `EXPIRED`
- `QUARANTINED`
- `CLOSED`

Batch setup records are not cost layers and are not valuation records.

## Expiry Rules

Expiry tracking applies only to batch-capable tracking modes: `BATCH` and `SERIAL_AND_BATCH`.

When expiry tracking is enabled for an item, creating or updating a batch for that item requires an expiry date.

Expiry status automation, expiry stock blocking, FEFO picking, and expiry accounting adjustments are not implemented in this sprint.

## Bin And Location Rules

Bin/location records are optional tenant-scoped setup records under a warehouse.

Bin code is unique per organization and warehouse.

Location types:

- `BIN`
- `SHELF`
- `ZONE`
- `STAGING`
- `RECEIVING`
- `SHIPPING`
- `IN_TRANSIT`
- `RETURNS`
- `QUARANTINE`
- `OTHER`

Statuses:

- `ACTIVE`
- `INACTIVE`

Existing warehouse behavior remains unchanged if no bin/location records are used.

## In-Transit Concept

`IN_TRANSIT` is available as a location type for future transfer workflows and visibility.

This sprint does not implement a transfer state machine, carrier/logistics integration, shipment milestones, route planning, warehouse automation, or automatic in-transit quantity accounting.

## Movement Validation Boundaries

Validation helpers exist for future movement flows:

- Batch required validation.
- Serial count validation.
- Bin/location required validation.
- Expiry required validation.
- Current-flow tracked-item support validation.

Direct opening balance stock movement can carry optional batch, serial, and bin/location references where validation is satisfied.

Legacy movement flows that do not yet capture tracking metadata must block advanced-tracked items rather than silently accepting incomplete traceability. Non-tracked items continue through the existing movement flows.

Purchase-return and sales-return inventory posting previews surface blockers for advanced-tracked items when tracking metadata is not captured by the current flow.

## Traceability View

The item traceability view is read-only. It can show:

- Item tracking settings.
- Configured batches.
- Configured serial numbers.
- Warehouses and bin/location records connected by current serial location or movement metadata.
- Stock movements with available batch, serial, and bin/location references.
- Warnings when movement metadata is missing for tracked items.

The traceability view does not repair history, infer missing serials, infer missing batches, or mutate movements.

## Migration And Backfill

No historical movement migration or backfill is implemented in this sprint.

Before active tracking can be enforced across existing stock, LedgerByte needs:

- Accountant and operational review of partial-history rules.
- A migration plan for current on-hand quantities.
- A backfill plan for open serials, batches, and bins.
- Reconciliation evidence that tracked on-hand equals operational on-hand.
- Duplicate and negative-stock handling rules.
- User approval and rollback policy for tenant-specific migration execution.

## Accounting And Valuation Boundary

This sprint does not:

- Activate FIFO.
- Persist active cost layers.
- Change moving average.
- Update inventory valuation.
- Create COGS postings.
- Reverse COGS.
- Post journals.
- Change AP or AR.
- Affect VAT.
- Affect ZATCA.
- Affect financial statements.
- Post landed cost.
- Post valuation variances.

Tracking setup records are operational metadata only.

## Accountant Review Requirements

Before tracked inventory becomes an enforced operational workflow or affects accounting policy, LedgerByte needs accountant and operations review of:

- Serial and batch cutover policy.
- Partial-history warning wording.
- Expiry handling and quarantine rules.
- Return handling for tracked goods.
- Movement reversal behavior.
- Inventory valuation interactions.
- FIFO and landed-cost interactions.
- COGS reversal policy for returned tracked goods.

## Future Work

Future tracked-inventory work should implement:

- Full tracked movement capture for purchase receipts, sales stock issues, adjustments, transfers, purchase returns, and sales inventory returns.
- Serial status automation.
- Batch status automation.
- Bin-to-bin transfer workflow.
- In-transit transfer workflow.
- Reservation and picking support.
- Expiry review and quarantine workflows.
- Traceability reports and exports.
- Historical migration and reconciliation tooling.
- Accountant-reviewed accounting boundaries before any valuation or COGS automation.
