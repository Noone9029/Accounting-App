# Inventory Accounting Design

Audit date: 2026-05-14

## Current Behavior

- Inventory operations are operational only.
- Warehouses, stock movements, adjustments, transfers, purchase receipts, and sales stock issues create inventory quantity movement records.
- Stock valuation reports use operational moving-average estimates from costed inbound stock movements.
- Stock movements, purchase receipts, and sales stock issues do not create `JournalEntry` records.
- Financial statements do not consume stock movement data.

## Design Goal

This layer records accountant-reviewed settings and exposes journal previews before any financial inventory posting is enabled. It is deliberately preview-only so accountants can review account mappings, valuation method behavior, receipt/bill matching risk, and COGS timing before production posting is added.

## Settings

`InventorySettings` now includes:

- `enableInventoryAccounting`: default `false`.
- `inventoryAssetAccountId`: optional mapped inventory asset account.
- `cogsAccountId`: optional mapped COGS account.
- `inventoryAdjustmentGainAccountId`: optional mapped adjustment gain account.
- `inventoryAdjustmentLossAccountId`: optional mapped adjustment loss account.
- `valuationMethod`: existing `MOVING_AVERAGE` or `FIFO_PLACEHOLDER`.

The API exposes:

- `GET /inventory/accounting-settings` with `inventory.view`.
- `PATCH /inventory/accounting-settings` with `inventory.manage`.

## Account Mapping Rules

- Inventory asset must be an active posting `ASSET` account in the same organization.
- COGS must be an active posting `COST_OF_SALES` or `EXPENSE` account in the same organization.
- Adjustment gain must be an active posting `REVENUE` account in the same organization. The current account enum has no `OTHER_INCOME` type, so other income cannot be separately mapped yet.
- Adjustment loss must be an active posting `EXPENSE` or `COST_OF_SALES` account in the same organization.

## Posting Boundary

Even when `enableInventoryAccounting` is set true, current code still does not post journals from inventory activity. The flag is a readiness marker for future explicit posting work, not a posting switch.

The current preview boundary is:

- `previewOnly: true`
- `postingStatus: DESIGN_ONLY`
- `canPost: false`
- no `JournalEntry` writes

## Proposed Accounting Model

Future implementation should separate operational inventory events from financial posting decisions:

- Purchase receipt preview: Dr Inventory Asset, Cr Inventory Clearing or AP placeholder.
- Bill matching: resolve whether receipt value should clear against purchase bill lines, a clearing account, or direct AP.
- Sales issue COGS preview: Dr COGS, Cr Inventory Asset.
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

1. Finalize inventory clearing account model.
2. Add bill/receipt matching and variance handling.
3. Add explicit, guarded purchase receipt asset posting.
4. Add explicit, guarded sales issue COGS posting.
5. Add adjustment gain/loss posting with reason-code controls.
6. Add financial inventory reports reviewed by accountants.
7. Add FIFO only after full cost-layer modeling is designed.
