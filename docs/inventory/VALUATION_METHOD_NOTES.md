# Valuation Method Notes

Audit date: 2026-05-14

## Supported Methods

`InventorySettings.valuationMethod` supports:

- `MOVING_AVERAGE`
- `FIFO_PLACEHOLDER`

Only `MOVING_AVERAGE` is previewable for inventory accounting groundwork.

## Moving Average

Operational reports and COGS previews calculate estimated cost from inbound stock movements with cost data:

- opening balances
- adjustment increases
- transfer receipts
- purchase receipt placeholder movements

The estimate uses costed inbound quantity and value up to the relevant date. This remains operational and requires accountant review before financial posting.

## FIFO Placeholder

FIFO can be stored as a settings value for future planning, but no FIFO cost layers exist. FIFO is not previewable and cannot enable inventory accounting readiness.

Required FIFO work:

- cost layer table and layer consumption rules
- receipt layer creation
- issue layer depletion
- return and void restoration rules
- variance handling
- performance review for high-volume stock ledgers
- accountant-reviewed reports and reconciliation tooling

## Rounding And Precision

Inventory quantities and costs use decimal fields. Future posting work must define:

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
- Moving average is an operational estimate until accountant review is complete.
