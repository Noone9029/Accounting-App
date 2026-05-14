# Inventory Clearing Account Plan

Audit date: 2026-05-14

## Current State

Purchase receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements and increase operational inventory quantity. Purchase bills already post AP, tax, and the selected expense or asset account. Receipts do not create inventory asset journals.

Inventory accounting settings now include:

- `inventoryClearingAccountId`
- `purchaseReceiptPostingMode`

Purchase bills now include:

- `inventoryPostingMode`

`DIRECT_EXPENSE_OR_ASSET` is the default and keeps current AP posting behavior. `INVENTORY_CLEARING` is explicit preview groundwork for tracked inventory lines, but finalization in that mode is blocked in this phase.

`inventoryClearingAccountId` must belong to the organization, be active, allow posting, use an `ASSET` or `LIABILITY` account type, be separate from the inventory asset account, and not be Accounts Payable code `210`. The recommended MVP account is code `240` Inventory Clearing with type `LIABILITY`.

`purchaseReceiptPostingMode` is currently `DISABLED` or `PREVIEW_ONLY`. Neither value enables purchase receipt GL posting.

The preview endpoint is:

- `GET /purchase-receipts/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns `previewOnly: true`, `postingStatus: DESIGN_ONLY`, and `canPost: false`.

The readiness endpoint is:

- `GET /inventory/purchase-receipt-posting-readiness`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns account readiness, direct-mode bill count, clearing-mode bill count, blockers, warnings, and the recommended next step.
- Creates no journals and does not enable purchase receipt posting.

Purchase bill preview endpoint:

- `GET /purchase-bills/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `purchaseBills.view`.
- Direct mode previews the current Dr line accounts / Dr VAT / Cr AP posting.
- Inventory Clearing mode previews Dr Inventory Clearing for tracked lines, Dr normal accounts for non-inventory lines, Dr VAT, and Cr AP.
- Creates no journals.

## Preview Journal

When cost and asset mapping are available, the preview journal is:

- Dr Inventory Asset
- Cr Inventory Clearing

This is intentionally not postable because bill/receipt matching, clearing, VAT, variances, and current purchase bill posting behavior still need accountant approval.

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

- Decide whether Inventory Clearing is a liability-style or asset-style account per tenant.
- Add durable receipt-to-bill matching records if preview-derived matching is not enough.
- Decide how standalone receipts are handled.
- Decide variance handling for price, quantity, tax, and non-inventory costs.
- Add idempotency and fiscal-period guards.
- Add void and correction workflow.
- Add tests that prove purchase bill AP is not duplicated.
- Plan migration or reclassification behavior for existing purchase bills that posted directly to expense/asset accounts.

## Current Hard Stop

Purchase receipt accounting preview remains `DESIGN_ONLY`. No purchase receipt journal posting is enabled. Inventory Clearing bill mode is also preview-only; it cannot be finalized yet.

The current readiness audit is no-go for real receipt posting until clearing-mode bill finalization, migration/exclusion, variance, VAT, and reversal rules are approved.
