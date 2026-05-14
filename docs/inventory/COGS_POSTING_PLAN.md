# COGS Posting Plan

Audit date: 2026-05-14

## Current State

Sales stock issues create `SALES_ISSUE_PLACEHOLDER` stock movements and reduce operational inventory quantity. They do not auto-create COGS journals.

Manual COGS posting is now implemented through explicit accountant/user action:

- `GET /sales-stock-issues/:id/accounting-preview`
- Requires JWT auth, `x-organization-id`, and `inventory.view`.
- Returns moving-average COGS estimates, posting status, journal ids when present, and `canPost: true` only for eligible unposted issues.
- `POST /sales-stock-issues/:id/post-cogs`
- Requires `inventory.cogs.post`.
- Creates one posted journal after review: Dr COGS, Cr Inventory Asset.
- `POST /sales-stock-issues/:id/reverse-cogs`
- Requires `inventory.cogs.reverse`.
- Creates one reversal journal and links it to the source issue.

## Preview Journal

When account mappings and moving-average cost are available, the preview journal is:

- Dr COGS
- Cr Inventory Asset

The preview uses estimated moving-average cost from operational inbound stock movements up to the issue date.

## Posting Rules

- Inventory accounting must be enabled.
- Inventory asset and COGS account mappings must exist.
- Valuation method must be `MOVING_AVERAGE`.
- Source sales stock issue must be tenant-scoped, `POSTED`, not voided, and not already posted.
- Preview must have no blocking reasons and estimated COGS total must be greater than zero.
- Posting date is the sales stock issue `issueDate` and must pass fiscal-period guard.
- Posting is transactional and links `SalesStockIssue.cogsJournalEntryId`, `cogsPostedAt`, and `cogsPostedById`.
- Reversal date is the current date for MVP and must pass fiscal-period guard.
- Reversal links `cogsReversalJournalEntryId`, `cogsReversedAt`, and `cogsReversedById`.
- Voiding a sales stock issue is blocked while COGS is posted and not reversed.

## Risks

- Operational moving average is an estimate, not yet an accounting-grade cost layer.
- Existing invoices already post AR/revenue/VAT. COGS posting must be added separately without changing sales posting behavior.
- Returns, credit notes, and partial shipments need their own reversal or return workflow before production use.
- FIFO is placeholder-only and must not be used for COGS until cost layers exist.

## Current Hard Stops

- COGS is manual only; invoices and sales stock issues do not auto-post COGS.
- Purchase receipt inventory asset posting is manual-only for compatible finalized `INVENTORY_CLEARING` purchase bills.
- Inventory clearing settings, preview lines, bill/receipt matching visibility, explicit clearing-mode purchase bill finalization, explicit receipt asset posting, and read-only clearing reconciliation/variance reports now exist, but automatic receipt posting and automatic variance journals are not implemented.
- Purchase receipt posting readiness is advisory for automatic/broader rollout and remains no-go for direct-mode bills, historical migration, landed cost, and FIFO.
- FIFO, landed cost, serial tracking, batch tracking, returns, and credit-note inventory returns remain out of scope.
