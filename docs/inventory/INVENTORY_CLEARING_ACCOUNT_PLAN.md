# Inventory Clearing Account Plan

Audit date: 2026-05-14

## Current State

Purchase receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements and increase operational inventory quantity. Purchase bills already post AP, tax, and the selected expense or asset account. Receipts do not create inventory asset journals.

The preview endpoint is:

- `GET /purchase-receipts/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns `previewOnly: true`, `postingStatus: DESIGN_ONLY`, and `canPost: false`.

## Preview Journal

When cost and asset mapping are available, the preview journal is:

- Dr Inventory Asset
- Cr Inventory Clearing / Accounts Payable placeholder

This is intentionally not production-ready because bill/receipt matching and clearing are not finalized.

## Why Clearing Is Needed

Receipt timing and bill timing are different:

- Goods may be received before the supplier bill is posted.
- A bill may be posted before all goods are received.
- Bills can include VAT, service lines, freight, discounts, and non-inventory lines.
- Partial receipts and partial bills can create quantity and value mismatches.

Without an inventory clearing design, directly crediting AP from receipt posting could double-count liabilities when the bill also credits AP.

## Options To Review

### Option 1: Receipt To Clearing, Bill To Clearing

- Receipt: Dr Inventory Asset, Cr Inventory Clearing.
- Bill inventory line: Dr Inventory Clearing, Dr VAT, Cr AP.
- Variances are handled when received cost differs from billed cost.

### Option 2: Bill Posts Expense/Asset, Receipt Adjusts Later

- Keep bill posting as-is.
- Receipt preview identifies what would move from expense/asset to inventory.
- Requires reclassification journals and matching logic.

### Option 3: No Receipt Posting Until Bill Match

- Receipt stays operational only.
- Posting happens only when receipt and bill are matched.
- Simplest for avoiding duplicates but delays inventory asset recognition.

## Required Before Real Posting

- Add a mapped inventory clearing account type or documented account selection.
- Add receipt-to-bill matching records.
- Decide how standalone receipts are handled.
- Decide variance handling for price, quantity, tax, and non-inventory costs.
- Add idempotency and fiscal-period guards.
- Add void and correction workflow.
- Add tests that prove purchase bill AP is not duplicated.

## Current Hard Stop

Purchase receipt accounting preview remains `DESIGN_ONLY`. No purchase receipt journal posting is enabled.
