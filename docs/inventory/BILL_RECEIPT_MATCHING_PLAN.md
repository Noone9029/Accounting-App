# Bill Receipt Matching Plan

Audit date: 2026-05-14

## Current State

Purchase receipt matching is operational visibility only. It compares receipt lines to purchase bill or purchase order source lines and reports quantities, values, differences, linked receipts, and warnings. It does not create journals, allocations, bill adjustments, or clearing entries.

The API surface is:

- `GET /purchase-bills/:id/receipt-matching-status`
- `GET /purchase-bills/:id/accounting-preview`
- `GET /purchase-orders/:id/receipt-matching-status`
- `GET /purchase-receipts/:id/accounting-preview`
- `POST /purchase-receipts/:id/post-inventory-asset`
- `POST /purchase-receipts/:id/reverse-inventory-asset`
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

Bill/receipt matching is now used by the preview to decide whether a receipt is linked to a finalized `INVENTORY_CLEARING` bill and can be manually posted Dr Inventory Asset / Cr Inventory Clearing. The clearing reconciliation and variance reports compare active receipt asset postings with clearing-mode bills, but price and quantity differences still require manual accountant review before any variance posting is enabled.

## Deferred Work

- Durable many-to-many matching records, if required beyond source-line links.
- Variance accounts and approval workflow.
- Partial billing against multiple receipts.
- Landed cost allocation.
- Supplier returns and debit-note inventory effects.
- FIFO cost layer creation from receipts.

## Current Hard Stop

Matching status is visibility only. It is not an accounting subledger and does not post or reverse any GL entries.

Manual receipt asset posting is available only from the receipt action path for compatible clearing-mode bills. Matching status itself remains non-posting, reconciliation/variance reports are read-only, and automatic posting, direct-mode posting, automatic variance journals, and migration/exclusion for current finalized direct-mode bills remain out of scope.
