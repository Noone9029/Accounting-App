# Inventory Accounting Design

Audit date: 2026-05-14

## Current Behavior

- Inventory operations are operational only.
- Warehouses, stock movements, adjustments, transfers, purchase receipts, and sales stock issues create inventory quantity movement records.
- Stock valuation reports use operational moving-average estimates from costed inbound stock movements.
- Stock movements, purchase receipts, and sales stock issues do not create `JournalEntry` records.
- Financial statements do not consume stock movement data.

## Design Goal

This layer records accountant-reviewed settings, exposes journal previews, and now allows explicit manual COGS posting for reviewed sales stock issues. It still does not auto-post from inventory movements, invoices, purchase receipts, or sales stock issues.

## Settings

`InventorySettings` now includes:

- `enableInventoryAccounting`: default `false`.
- `inventoryAssetAccountId`: optional mapped inventory asset account.
- `cogsAccountId`: optional mapped COGS account.
- `inventoryClearingAccountId`: optional mapped clearing account for purchase receipt previews.
- `purchaseReceiptPostingMode`: `DISABLED` or `PREVIEW_ONLY`; no purchase receipt posting mode posts journals yet.
- `inventoryAdjustmentGainAccountId`: optional mapped adjustment gain account.
- `inventoryAdjustmentLossAccountId`: optional mapped adjustment loss account.
- `valuationMethod`: existing `MOVING_AVERAGE` or `FIFO_PLACEHOLDER`.

The API exposes:

- `GET /inventory/accounting-settings` with `inventory.view`.
- `PATCH /inventory/accounting-settings` with `inventory.manage`.
- `GET /inventory/purchase-receipt-posting-readiness` with `inventory.view`.
- `GET /purchase-bills/:id/accounting-preview` with `purchaseBills.view`.

## Account Mapping Rules

- Inventory asset must be an active posting `ASSET` account in the same organization.
- COGS must be an active posting `COST_OF_SALES` or `EXPENSE` account in the same organization.
- Inventory clearing must be an active posting `LIABILITY` or `ASSET` account in the same organization. The recommended MVP setup is a separate liability-style Inventory Clearing account, not Accounts Payable code `210`, and not the same account as inventory asset.
- Adjustment gain must be an active posting `REVENUE` account in the same organization. The current account enum has no `OTHER_INCOME` type, so other income cannot be separately mapped yet.
- Adjustment loss must be an active posting `EXPENSE` or `COST_OF_SALES` account in the same organization.

## Posting Boundary

Even when `enableInventoryAccounting` is set true, current code does not post journals automatically from inventory activity. The flag allows reviewed users to manually post COGS for eligible sales stock issues only.

The current sales issue COGS boundary is:

- `previewOnly: true`
- `canPost: true` only when settings, mappings, status, valuation method, and cost estimates are complete
- `POST /sales-stock-issues/:id/post-cogs` creates one reviewed Dr COGS / Cr Inventory Asset journal
- `POST /sales-stock-issues/:id/reverse-cogs` creates one reversal journal
- COGS active on a stock issue blocks voiding until reversed

Purchase receipt accounting remains design-only:

- purchase receipt previews always return `canPost: false`
- purchase receipt posting readiness is advisory only, remains no-go, includes bill-mode compatibility counts, and creates no journals
- no inventory asset posting exists
- no inventory clearing journal workflow exists
- purchase receipt previews can now show receipt value, matched bill value, unmatched receipt value, value difference, and Dr Inventory Asset / Cr Inventory Clearing preview lines when mapped
- purchase bill direct-vs-clearing mode preview exists, but clearing-mode bill finalization is blocked
- purchase bill and purchase order matching endpoints expose operational receipt status, but do not mutate accounting

## Proposed Accounting Model

The implementation separates operational inventory events from financial posting decisions:

- Purchase receipt preview: Dr Inventory Asset, Cr Inventory Clearing or AP placeholder.
- Bill matching: resolve whether receipt value should clear against purchase bill lines, a clearing account, or direct AP.
- Future purchase bill posting model under review: Dr Inventory Clearing and Dr VAT Receivable, Cr Accounts Payable, instead of direct expense/asset posting for inventory lines.
- Sales issue COGS preview and manual posting: Dr COGS, Cr Inventory Asset.
- Adjustments: Dr/Cr Inventory Asset against adjustment gain/loss accounts after reason-code and approval design.

## Accountant Review Checklist

- Confirm chart account types and names for inventory asset, COGS, gains, and losses.
- Confirm whether COGS belongs in `COST_OF_SALES` or an `EXPENSE` account for the tenant.
- Confirm inventory clearing workflow and bill/receipt matching policy.
- Confirm moving-average valuation timing and rounding policy.
- Confirm negative stock behavior before COGS posting is enabled.
- Confirm fiscal-period lock behavior for inventory posting dates.
- Confirm void/reversal accounting for receipts, issues, transfers, and adjustments.
- Confirm report presentation for inventory asset and COGS balances.

## Future Implementation Order

1. Harden manual COGS posting review UX and audit reporting.
2. Review the new inventory clearing account, purchase bill clearing-mode preview, and bill/receipt matching preview with an accountant.
3. Finalize inventory clearing account posting model, purchase bill clearing-mode finalization, migration/exclusion policy, and variance handling.
4. Use `PURCHASE_RECEIPT_POSTING_READINESS_AUDIT.md` and `PURCHASE_RECEIPT_GL_POSTING_DESIGN.md` as the gate for receipt posting implementation.
5. Add explicit, guarded purchase receipt asset posting only after bill clearing and migration rules are approved.
6. Add adjustment gain/loss posting with reason-code controls.
7. Add financial inventory reports reviewed by accountants.
8. Add FIFO only after full cost-layer modeling is designed.
