# COGS Posting Plan

Audit date: 2026-05-14

## Current State

Sales stock issues create `SALES_ISSUE_PLACEHOLDER` stock movements and reduce operational inventory quantity. They do not create COGS journals and do not change financial reports.

The preview endpoint is:

- `GET /sales-stock-issues/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns `previewOnly: true`, `postingStatus: DESIGN_ONLY`, and `canPost: false`.

## Preview Journal

When account mappings and moving-average cost are available, the preview journal is:

- Dr COGS
- Cr Inventory Asset

The preview uses estimated moving-average cost from operational inbound stock movements up to the issue date.

## Required Before Real Posting

- Accountant approval of the COGS account mapping.
- Explicit decision on using `issueDate`, invoice date, or shipment/delivery date as the posting date.
- Fiscal-period guard on the chosen posting date.
- Idempotency key or source uniqueness so a stock issue cannot post COGS twice.
- Void/reversal rules for stock issue voids.
- Negative stock policy and missing cost blocking.
- Report audit showing the generated COGS journal and inventory asset movement.

## Risks

- Operational moving average is an estimate, not yet an accounting-grade cost layer.
- Existing invoices already post AR/revenue/VAT. COGS posting must be added separately without changing sales posting behavior.
- Returns, credit notes, and partial shipments need their own reversal or return workflow before production use.
- FIFO is placeholder-only and must not be used for COGS until cost layers exist.

## Future COGS Posting Flow

1. Validate inventory accounting is enabled and mappings are complete.
2. Validate valuation method is `MOVING_AVERAGE`.
3. Validate issue belongs to tenant and has not already posted COGS.
4. Calculate line-level estimated COGS with accountant-approved rounding.
5. Create one balanced posted journal:
   - Dr mapped COGS
   - Cr mapped Inventory Asset
6. Store the journal link on the source stock issue or a dedicated inventory posting table.
7. Add reversal behavior for voids.
8. Add smoke coverage proving idempotency and financial report impact.

## Current Hard Stop

Automatic COGS posting remains disabled. No UI post button is exposed.
