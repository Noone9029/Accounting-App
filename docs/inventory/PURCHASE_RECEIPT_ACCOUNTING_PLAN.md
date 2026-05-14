# Purchase Receipt Accounting Plan

Audit date: 2026-05-14

## Current State

Purchase receipts are operational stock events. They create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements and update warehouse quantity only. They do not create `JournalEntry` records, do not debit inventory asset, and do not affect financial statements.

Purchase bills currently post directly to expense, COGS, or asset accounts by line, debit VAT Receivable when tax exists, and credit Accounts Payable. That behavior is intentionally unchanged in this phase for the default `DIRECT_EXPENSE_OR_ASSET` mode.

Purchase bills can now store `INVENTORY_CLEARING` mode for design review. That mode is preview-only: it shows Dr Inventory Clearing for inventory-tracked lines, but finalization is blocked until the clearing workflow is approved.

## Preview Groundwork

`GET /purchase-receipts/:id/accounting-preview` now returns a design-only preview with:

- `previewOnly: true`
- `canPost: false`
- `postingMode`
- receipt value
- matched bill value
- unmatched receipt value
- value difference
- matching summary
- Dr Inventory Asset / Cr Inventory Clearing preview lines when mappings and unit costs exist

The endpoint never creates a journal and never changes purchase bill accounting.

`GET /inventory/purchase-receipt-posting-readiness` now exposes an advisory go/no-go check for the future posting task. It checks inventory accounting, moving-average valuation, preview-only receipt mode, Inventory Asset, Inventory Clearing mappings, direct-mode bill count, and clearing-mode bill count. It does not create settings, journals, or accounting mutations and does not enable posting.

`GET /purchase-bills/:id/accounting-preview` shows the current direct AP posting preview or the future clearing-mode preview without creating journals.

## Proposed Future Journal

Future receipt posting under review:

- Dr Inventory Asset
- Cr Inventory Clearing

Future purchase bill clearing under review:

- Dr Inventory Clearing
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

This would replace or rework the current inventory-line bill behavior for tenants that enable accounting-grade inventory posting. Existing bills that already posted directly to expense/asset accounts need a migration or reclassification strategy before this can be enabled.

## Bill And Receipt Matching Risk

Receipt quantities and bill quantities can differ. Unit costs can differ. Bills can contain freight, discounts, service lines, non-inventory lines, and VAT. Posting receipt asset journals before matching rules are approved can duplicate AP, misstate inventory asset, or leave clearing balances unreconciled.

## Standalone And PO Receipts

Standalone receipts are not financially postable until the tenant selects a bill or clearing workflow. Purchase-order-only receipts warn that bill matching is unavailable until a purchase bill is linked. Purchase orders remain non-accounting documents.

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

Purchase receipt inventory asset posting is not implemented. The preview is review-only and remains non-postable.

The current audit recommendation remains no-go for receipt GL posting until purchase bill clearing-mode finalization, migration/exclusion rules, and variance handling are approved.
