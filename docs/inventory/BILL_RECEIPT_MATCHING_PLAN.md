# Bill Receipt Matching Plan

Audit date: 2026-05-14

## Current State

Purchase receipt matching is operational visibility only. It compares receipt lines to purchase bill or purchase order source lines and reports quantities, values, differences, linked receipts, and warnings. It does not create journals, allocations, bill adjustments, or clearing entries.

The API surface is:

- `GET /purchase-bills/:id/receipt-matching-status`
- `GET /purchase-bills/:id/accounting-preview`
- `GET /purchase-orders/:id/receipt-matching-status`
- `GET /purchase-receipts/:id/accounting-preview`
- `GET /inventory/purchase-receipt-posting-readiness`

## Matching Statuses

- `NOT_RECEIVED`: tracked source lines have no active receipt quantity.
- `PARTIALLY_RECEIVED`: at least one tracked source line is received and at least one tracked quantity remains.
- `FULLY_RECEIVED`: tracked source lines are received with no remaining tracked quantity.
- `OVER_RECEIVED_WARNING`: active receipt quantity exceeds source quantity on at least one tracked line.

## Purchase Bill Matching

Bill matching returns supplier, bill total, receipt count, receipt value, status, warnings, and per-line quantities and values. Inventory-tracked bill lines using non-asset accounts are warned because future clearing workflows need accountant review.

The endpoint does not change AP, VAT, inventory asset, or supplier ledger balances.

Purchase bill accounting preview now shows whether the bill is in direct mode or inventory-clearing mode. Direct mode mirrors current AP finalization. Inventory-clearing mode previews and finalizes as Dr Inventory Clearing for tracked lines while keeping non-inventory lines on their selected accounts.

## Purchase Order Matching

Purchase order matching returns the operational receipt value estimate, converted bill when available, linked bill list, per-line receipt values, and warnings. The PO itself remains non-accounting, and PO-only receipts warn that bill matching is unavailable until a purchase bill exists.

## Future Accounting Use

Bill/receipt matching will be used to decide when a future receipt posting can debit inventory asset and credit clearing, and when a purchase bill should debit clearing and credit AP. Price and quantity differences must be handled before posting is enabled.

## Deferred Work

- Durable many-to-many matching records, if required beyond source-line links.
- Variance accounts and approval workflow.
- Partial billing against multiple receipts.
- Landed cost allocation.
- Supplier returns and debit-note inventory effects.
- FIFO cost layer creation from receipts.

## Current Hard Stop

Matching status is visibility only. It is not an accounting subledger and does not post or reverse any GL entries.

The readiness audit confirms that matching visibility and clearing-mode bill finalization are still not enough to enable receipt posting. Receipt posting fields/endpoints, reversal rules, variance policy, and a migration/exclusion rule for current finalized direct-mode bills are still required first.
