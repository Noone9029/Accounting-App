# Inventory Accounting Design

Audit date: 2026-05-15

## Current Behavior

- Inventory operations are operational only.
- Warehouses, stock movements, adjustments, transfers, purchase receipts, and sales stock issues create inventory quantity movement records.
- Stock valuation reports use operational moving-average estimates from costed inbound stock movements.
- Stock movements, purchase receipt creation, and sales stock issue creation do not create `JournalEntry` records automatically.
- Financial statements do not consume stock movement data.

## Design Goal

This layer records accountant-reviewed settings, exposes journal previews, allows explicit manual COGS posting for reviewed sales stock issues, and allows explicit manual receipt asset posting for compatible purchase receipts. It still does not auto-post from inventory movements, invoices, purchase receipts, or sales stock issues.

## Settings

`InventorySettings` now includes:

- `enableInventoryAccounting`: default `false`.
- `inventoryAssetAccountId`: optional mapped inventory asset account.
- `cogsAccountId`: optional mapped COGS account.
- `inventoryClearingAccountId`: optional mapped clearing account for purchase receipt previews.
- `purchaseReceiptPostingMode`: `DISABLED` or `PREVIEW_ONLY`; manual receipt asset posting requires `PREVIEW_ONLY`, but neither value enables automatic receipt posting.
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

Even when `enableInventoryAccounting` is set true, current code does not post journals automatically from inventory activity. The flag allows reviewed users to manually post COGS for eligible sales stock issues.
It also allows reviewed users to manually post purchase receipt inventory asset journals only for receipts linked to finalized `INVENTORY_CLEARING` purchase bills.

The current sales issue COGS boundary is:

- `previewOnly: true`
- `canPost: true` only when settings, mappings, status, valuation method, and cost estimates are complete
- `POST /sales-stock-issues/:id/post-cogs` creates one reviewed Dr COGS / Cr Inventory Asset journal
- `POST /sales-stock-issues/:id/reverse-cogs` creates one reversal journal
- COGS active on a stock issue blocks voiding until reversed

Purchase receipt accounting is manual-only:

- purchase receipt previews return `canPost: true` only for posted receipts linked to finalized `INVENTORY_CLEARING` bills with complete settings/costs
- purchase receipt posting readiness is advisory for automatic/broader rollout, includes bill-mode compatibility counts, and creates no journals
- `POST /purchase-receipts/:id/post-inventory-asset` creates one reviewed Dr Inventory Asset / Cr Inventory Clearing journal
- `POST /purchase-receipts/:id/reverse-inventory-asset` creates one reversal journal
- active receipt asset posting blocks receipt voiding until reversed
- direct-mode, standalone, and PO-only receipts are blocked from receipt asset posting
- purchase receipt previews show receipt value, matched bill value, unmatched receipt value, value difference, and Dr Inventory Asset / Cr Inventory Clearing preview lines when mapped
- purchase bill direct-vs-clearing mode preview and clearing-mode finalization exist
- clearing reconciliation and variance reports show bill clearing debits, active receipt clearing credits, GL clearing balance, value differences, reversed postings, and direct-mode exclusions without posting journals
- purchase bill and purchase order matching endpoints expose operational receipt status, but do not mutate accounting

The integrity audit in `docs/inventory/INVENTORY_ACCOUNTING_INTEGRITY_AUDIT.md` found no code-level double-counting defect in the current manual posting paths and approved an accountant-reviewed variance proposal workflow, not automatic variance posting.

Inventory variance proposals are now implemented as a controlled review layer:

- Clearing variance report rows can create `DRAFT` proposals, but the service recomputes the amount and accounts from current reports/settings.
- Manual proposals can store accountant-selected debit and credit accounts.
- Lifecycle is `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `POSTED`, `REVERSED`, or `VOIDED`.
- Proposal creation, submission, approval, event review, and accounting preview create no journals.
- Explicit posting creates one fiscal-period-guarded journal, Dr proposal debit account and Cr proposal credit account.
- Explicit reversal creates one reversal journal.

## Proposed Accounting Model

The implementation separates operational inventory events from financial posting decisions:

- Purchase receipt preview/manual posting: Dr Inventory Asset, Cr Inventory Clearing for compatible clearing-mode bills.
- Bill matching: resolve whether receipt value clears against purchase bill lines and Inventory Clearing.
- Purchase bill clearing model: Dr Inventory Clearing and Dr VAT Receivable, Cr Accounts Payable, instead of direct expense/asset posting for inventory lines when `INVENTORY_CLEARING` is selected.
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

1. Review Inventory Clearing balances, variance proposal output, and posted/reversed proposal journals with an accountant.
2. Decide historical direct-mode exclusion/migration policy.
3. Keep automatic purchase receipt posting disabled until landed-cost, FIFO/cost-layer, and migration controls exist.
4. Add adjustment gain/loss posting with reason-code controls only if separate from clearing variance proposals.
5. Add financial inventory reports reviewed by accountants.
6. Add FIFO only after full cost-layer modeling is designed.
