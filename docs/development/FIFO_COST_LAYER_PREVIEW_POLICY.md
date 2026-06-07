# FIFO Cost-Layer Preview Policy

Date: 2026-06-06

Product: LedgerByte

## Purpose

FIFO cost-layer preview is a read-only inventory review workflow. It reconstructs possible FIFO layers from existing stock movements so users can inspect how oldest-cost consumption would look before any active FIFO valuation method exists.

The preview is not an accounting method, not a cost-layer subledger, not a stock valuation update, and not a posting workflow.

## Preview-Only Scope

The preview may:

- Read existing inventory-tracked items.
- Read existing warehouses.
- Read existing stock movements up to an as-of date.
- Compute temporary layer and consumption rows in memory.
- Return warnings and blockers when movement data is incomplete.

The preview never:

- Persists active FIFO layers.
- Switches inventory valuation method.
- Updates moving average.
- Updates stock valuation.
- Creates stock movements.
- Changes purchase, sales, return, adjustment, transfer, landed-cost, or valuation-variance records.
- Posts journals, COGS, AP, AR, VAT, ZATCA, or financial statement effects.

## Movement Ordering

Within each item and warehouse scope, movements are ordered by:

1. `movementDate`
2. `createdAt`
3. `id`

FIFO layers are reconstructed separately for each item and warehouse. A mixed-warehouse preview can be requested, but each warehouse is still calculated independently and returns a warning that the scope spans multiple warehouses.

## Inbound Layer Rules

Inbound movement types create preview layers:

- `OPENING_BALANCE`
- `ADJUSTMENT_IN`
- `TRANSFER_IN`
- `PURCHASE_RECEIPT_PLACEHOLDER`
- `SALES_RETURN_IN`

Layer unit cost is read from `unitCost` when present. If `unitCost` is missing and `totalCost` plus quantity can safely derive a unit cost, the preview uses that derived unit cost. If neither is available, the preview keeps the layer quantity but marks the layer value unavailable and emits `MISSING_UNIT_COST`.

## Outbound Consumption Rules

Outbound movement types consume the oldest remaining preview layers first:

- `ADJUSTMENT_OUT`
- `TRANSFER_OUT`
- `SALES_ISSUE_PLACEHOLDER`
- `PURCHASE_RETURN_OUT`

Consumption rows show the outbound movement, consumed source layer IDs, consumed quantity, unit cost when known, and estimated cost when every consumed layer has cost data.

If an outbound movement exceeds available preview layer quantity, the row emits `INSUFFICIENT_LAYER_QUANTITY` and `NEGATIVE_LAYER_QUANTITY` blockers. The preview still returns the rest of the response so users can inspect the data problem.

## Transfer Handling

Transfers are supported only when existing movement rows clearly separate source and destination warehouses:

- `TRANSFER_OUT` consumes layers in the source warehouse.
- `TRANSFER_IN` creates a layer in the destination warehouse.

The current movement model records separate transfer in/out movements linked to warehouse transfer references, so the preview can read those rows. If a transfer movement is not clearly linked to a warehouse transfer record, the preview emits `UNSUPPORTED_TRANSFER_SHAPE`.

## Purchase Return Handling

`PURCHASE_RETURN_OUT` consumes the oldest remaining layers in the affected item and warehouse. When the movement has a directly traceable unit cost, that cost remains visible as movement metadata. When it does not, the preview emits `UNTRACEABLE_PURCHASE_RETURN_COST` and relies on FIFO layer consumption for estimated preview cost.

This does not create supplier credits, refunds, AP changes, inventory valuation updates, or accounting evidence.

## Sales Return Handling

`SALES_RETURN_IN` creates an inbound return layer when the movement carries source cost. If source cost is not available, the preview creates a quantity layer with unavailable value and emits both:

- `MISSING_UNIT_COST`
- `UNTRACEABLE_SALES_RETURN_COST`

This does not reverse COGS, revenue, AR, VAT, or financial statements.

## Warning And Blocker Types

Supported warning/blocker codes:

- `MISSING_UNIT_COST`
- `NEGATIVE_LAYER_QUANTITY`
- `INSUFFICIENT_LAYER_QUANTITY`
- `UNSUPPORTED_TRANSFER_SHAPE`
- `UNTRACEABLE_PURCHASE_RETURN_COST`
- `UNTRACEABLE_SALES_RETURN_COST`
- `MIXED_WAREHOUSE_SCOPE`
- `NO_MOVEMENTS`
- `PREVIEW_ONLY_NOT_ACCOUNTING_METHOD`

Warnings mean the preview remains readable but should not be treated as precise. Blockers mean the selected item/warehouse movement history cannot support a reliable FIFO valuation answer.

## Why This Is Not Active Valuation

Active FIFO requires a persistent cost-layer ledger, posting lifecycle, migration policy, reconciliation behavior, audit events, permissions, and accountant-approved edge-case rules. This sprint intentionally avoids those changes.

The active operational valuation remains moving-average style. FIFO preview output must not be used as financial-statement value, COGS, VAT, ZATCA, AP, AR, or inventory asset evidence.

## Future Requirements Before Active FIFO

Before FIFO can become the active valuation method, LedgerByte needs:

- Accountant-approved FIFO policy for opening stock, receipts, adjustments, transfers, purchase returns, sales returns, negative stock, landed cost, voids, and reversals.
- Additive persistent cost-layer schema designed as a real source-of-truth ledger.
- Migration/backfill plan for historical movements and direct-mode inventory history.
- Reconciliation between movement history, current on-hand, operational valuation reports, and financial statements.
- Posting rules for COGS and receipt asset value, including reversal behavior.
- Permission model for activation, migration, posting, reversal, and review.
- Audit events for activation, backfill, posting, reversal, and manual layer adjustment.
- Targeted API, UI, smoke, browser, and accountant-review evidence.
- Hosted/customer-data validation before any production readiness claim.

## Permissions

Existing permissions are reused:

- `inventory.view` is required for FIFO preview API and page access.
- Source document links are shown only when the user has the relevant existing source permission.

No new permission strings were added.

## Audit Behavior

Ordinary FIFO preview reads are not audit-logged because they are read-only calculations.

Future active FIFO activation, backfill, posting, reversal, or manual layer adjustment would require explicit audit events.
