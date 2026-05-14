# Purchase Receipt Accounting Plan

Audit date: 2026-05-14

## Current State

Purchase receipts are operational stock events by default. They create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements and update warehouse quantity. They do not automatically create `JournalEntry` records.

Purchase bills in the default `DIRECT_EXPENSE_OR_ASSET` mode keep the existing behavior: Dr selected line accounts, Dr VAT Receivable when applicable, Cr Accounts Payable.

Purchase bills in `INVENTORY_CLEARING` mode can be explicitly finalized after accountant review. Inventory-tracked bill lines debit Inventory Clearing, non-inventory lines stay on their selected accounts, VAT posts as usual, and AP is credited.

Compatible purchase receipts linked to finalized `INVENTORY_CLEARING` bills can now be manually posted after preview/accountant review. The posting is explicit only; no receipt auto-posting exists.

## Preview And Posting

`GET /purchase-receipts/:id/accounting-preview` returns:

- `previewOnly: true`
- `canPost`
- posting status and receipt asset journal ids
- linked bill mode/status
- `postingMode`
- receipt value
- matched bill value
- unmatched receipt value
- value difference
- matching summary
- Dr Inventory Asset / Cr Inventory Clearing preview lines when mappings and unit costs exist

The endpoint never creates a journal and never changes purchase bill accounting. It returns `canPost: true` only when the receipt is posted, linked to a finalized non-voided `INVENTORY_CLEARING` purchase bill, has complete unit costs, and inventory accounting mappings are valid.

`POST /purchase-receipts/:id/post-inventory-asset` creates one reviewed receipt asset journal:

- Dr Inventory Asset
- Cr Inventory Clearing

`POST /purchase-receipts/:id/reverse-inventory-asset` creates the reversal journal. Voiding a receipt is blocked while the asset journal is active and unreversed.

`GET /inventory/purchase-receipt-posting-readiness` remains an advisory no-auto-posting check. It does not create settings, journals, or accounting mutations.

`GET /purchase-bills/:id/accounting-preview` shows the current direct AP posting preview or clearing-mode preview without creating journals.

## Direct Mode Risk

Receipt quantities and bill quantities can differ. Unit costs can differ. Bills can contain freight, discounts, service lines, non-inventory lines, and VAT. Posting receipt asset journals against direct-mode bills can duplicate expense/asset activity or leave clearing balances unreconciled, so direct-mode receipt posting is blocked.

Existing finalized direct-mode bills are not migrated or retroactively changed.

## Standalone And PO Receipts

Standalone receipts are not financially postable until the tenant selects a bill or approved clearing workflow. Purchase-order-only receipts warn that bill matching is unavailable until a purchase bill is linked. Purchase orders remain non-accounting documents.

## Deferred Work

Landed cost is deferred because freight, duty, allocation bases, supplier charges, and variance treatment must be designed before receipt cost becomes accounting-grade. FIFO is deferred until cost layers exist. Serial and batch tracking are deferred until warehouse identity tracking exists.

## Accountant Review Checklist

- Confirm Inventory Clearing account type, code, and financial statement presentation.
- Confirm whether inventory purchase bills should post to clearing instead of expense/asset lines.
- Confirm partial receipt, over-receipt, and price variance treatment.
- Confirm VAT timing and tax report effects.
- Confirm fiscal-period dates for receipt posting and bill clearing.
- Confirm migration approach for existing purchase bills and receipts.

## Current Hard Stop

Automatic purchase receipt inventory asset posting is not implemented. Direct-mode receipt posting, historical migration, landed cost, FIFO, and automatic variance posting remain out of scope. Clearing reconciliation and variance reporting are available as read-only review tools.
