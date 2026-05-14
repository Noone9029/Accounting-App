# Valuation Method Notes

Audit date: 2026-05-14

## Supported Methods

`InventorySettings.valuationMethod` supports:

- `MOVING_AVERAGE`
- `FIFO_PLACEHOLDER`

Only `MOVING_AVERAGE` is previewable and postable for the current manual COGS workflow.

## Moving Average

Operational reports and COGS previews calculate estimated cost from inbound stock movements with cost data:

- opening balances
- adjustment increases
- transfer receipts
- purchase receipt placeholder movements

The estimate uses costed inbound quantity and value up to the relevant date. Manual sales issue COGS posting uses this estimate after user/accountant review and writes only the reviewed Dr COGS / Cr Inventory Asset journal.

Purchase receipt accounting previews use receipt line unit costs for design-only Dr Inventory Asset / Cr Inventory Clearing previews. Those receipt values are not accounting-grade until bill/receipt matching, clearing, VAT, landed cost, and variance rules are approved.

Purchase receipt posting readiness requires `MOVING_AVERAGE` because FIFO cost layers do not exist and receipt posting must use the same conservative valuation boundary as the current preview layer.

## FIFO Placeholder

FIFO can be stored as a settings value for future planning, but no FIFO cost layers exist. FIFO is not previewable, cannot enable inventory accounting readiness, and cannot post COGS.

Required FIFO work:

- cost layer table and layer consumption rules
- receipt layer creation
- issue layer depletion
- return and void restoration rules
- variance handling
- performance review for high-volume stock ledgers
- accountant-reviewed reports and reconciliation tooling

## Rounding And Precision

Inventory quantities and costs use decimal fields. Future posting work beyond manual moving-average COGS must define:

- line rounding
- journal total rounding
- currency precision
- multi-currency behavior
- variance account handling

## Limitations

- No accounting-grade inventory financial reports exist yet.
- No landed cost allocation exists.
- No serial or batch valuation exists.
- No automatic GL posting is enabled.
- Purchase receipt inventory asset posting is implemented only as an explicit manual action for compatible finalized `INVENTORY_CLEARING` purchase bills.
- Purchase receipt posting readiness is advisory and creates no journals.
- Inventory clearing settings, previews, explicit clearing-mode purchase bill journals, manual receipt asset posting, and read-only clearing reconciliation/variance reports exist, but automatic receipt posting and automatic variance journals are not implemented.
- Moving average is still an operational estimate and requires accountant review before each manual COGS post.
