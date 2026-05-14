# Inventory Clearing Account Plan

Audit date: 2026-05-14

## Current State

Purchase receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements and increase operational inventory quantity. Purchase bills post AP, tax, and either selected line accounts or Inventory Clearing depending on `inventoryPostingMode`. Receipts do not automatically create inventory asset journals.

Inventory accounting settings now include:

- `inventoryClearingAccountId`
- `purchaseReceiptPostingMode`

Purchase bills now include:

- `inventoryPostingMode`

`DIRECT_EXPENSE_OR_ASSET` is the default and keeps current AP posting behavior. `INVENTORY_CLEARING` is explicit accountant-reviewed posting behavior for tracked inventory lines; it can be finalized only when inventory accounting and clearing account settings pass validation.

`inventoryClearingAccountId` must belong to the organization, be active, allow posting, use an `ASSET` or `LIABILITY` account type, be separate from the inventory asset account, and not be Accounts Payable code `210`. The recommended MVP account is code `240` Inventory Clearing with type `LIABILITY`.

`purchaseReceiptPostingMode` is currently `DISABLED` or `PREVIEW_ONLY`. Manual receipt asset posting is allowed only under `PREVIEW_ONLY` after explicit user action and eligibility review; neither value enables automatic receipt posting.

The preview endpoint is:

- `GET /purchase-receipts/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns `previewOnly: true`, posting status, blockers/warnings, linked bill mode/status, journal ids, and `canPost`.
- `canPost` is true only for compatible posted receipts linked to finalized `INVENTORY_CLEARING` bills.

The readiness endpoint is:

- `GET /inventory/purchase-receipt-posting-readiness`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns account readiness, direct-mode bill count, clearing-mode bill count, blockers, warnings, and the recommended next step.
- Creates no journals and does not enable automatic purchase receipt posting.

Purchase bill preview endpoint:

- `GET /purchase-bills/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `purchaseBills.view`.
- Direct mode previews the current Dr line accounts / Dr VAT / Cr AP posting.
- Inventory Clearing mode previews Dr Inventory Clearing for tracked lines, Dr normal accounts for non-inventory lines, Dr VAT, and Cr AP.
- Creates no journals.

Purchase bill finalization now uses the same journal shape for explicit `INVENTORY_CLEARING` bills:

- Dr Inventory Clearing for inventory-tracked bill lines.
- Dr selected line accounts for non-inventory lines.
- Dr VAT Receivable, when applicable.
- Cr Accounts Payable.

This posting is limited to purchase bills. Receipt asset journals are created only by the explicit `POST /purchase-receipts/:id/post-inventory-asset` action and do not mutate stock movements.

Read-only clearing review endpoints now exist:

- `GET /inventory/reports/clearing-reconciliation`
- `GET /inventory/reports/clearing-variance`

They compare finalized `INVENTORY_CLEARING` purchase bill clearing debits with active linked purchase receipt asset posting credits, include clearing account GL activity summaries, support CSV export, and never create journals.

## Preview Journal

When cost and asset mapping are available, the preview journal is:

- Dr Inventory Asset
- Cr Inventory Clearing

This is postable only when the receipt is linked to a finalized `INVENTORY_CLEARING` bill and all settings/costs pass validation. Direct-mode bills, standalone receipts, and PO-only receipts remain blocked.

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

## Required Before Automatic Posting Or Broader Rollout

- Decide whether Inventory Clearing is a liability-style or asset-style account per tenant.
- Add durable receipt-to-bill matching records if preview-derived matching is not enough.
- Decide how standalone receipts are handled.
- Decide variance handling for price, quantity, tax, and non-inventory costs.
- Extend idempotency and fiscal-period coverage beyond the manual MVP where needed.
- Use clearing reconciliation and variance reports to review open differences.
- Add accountant-approved correction and variance posting workflow if needed.
- Add tests that prove purchase bill AP is not duplicated.
- Plan migration or reclassification behavior for existing purchase bills that posted directly to expense/asset accounts.

## Current Hard Stop

Automatic purchase receipt accounting posting remains disabled. Inventory Clearing bill finalization is available for explicitly selected compatible bills, compatible receipts can be manually posted Dr Inventory Asset / Cr Inventory Clearing after review, and clearing differences can be reviewed through reconciliation/variance reports.

The current readiness audit remains no-go for automatic receipt posting and for any direct-mode or historical migration behavior until migration/exclusion, variance posting, VAT, and landed-cost rules are approved.
