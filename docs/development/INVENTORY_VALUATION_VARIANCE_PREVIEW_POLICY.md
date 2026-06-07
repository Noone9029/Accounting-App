# Inventory Valuation Variance Preview Policy

Date: 2026-06-05

Product: LedgerByte

## Purpose

Inventory valuation variance preview is a read-only workflow for comparing purchase receipts, purchase bills, purchase orders, purchase returns, and purchase matching reviews before any accountant-reviewed variance policy is applied.

This policy is intentionally conservative. The preview does not post journals, reverse journals, change AP balances, change purchase bill balances, change inventory quantities, change moving average valuation, create FIFO layers, create purchase returns, create debit notes, create supplier refunds, change landed cost, send email, call ZATCA, affect VAT reports, or affect financial statements.

## Variance Types

- `PRICE_VARIANCE`: Receipt unit cost and bill unit cost differ for matched quantity.
- `QUANTITY_VARIANCE`: Received quantity and billed quantity differ for the same source group.
- `RECEIPT_WITHOUT_BILL`: Receipt value exists with no linked or matched bill value.
- `BILL_WITHOUT_RECEIPT`: Bill value exists with no linked or matched receipt value.
- `OVER_RECEIVED_VALUE`: Received quantity/value exceeds expected purchase order quantity/value.
- `OVER_BILLED_VALUE`: Billed quantity/value exceeds expected purchase order quantity/value.
- `RETURN_PENDING_CREDIT`: A linked purchase return has return value that may need future supplier credit/refund/accountant review.
- `REVIEW_REQUIRED`: A matching review marked `NEEDS_VARIANCE_REVIEW` exists but no more specific preview row can be derived.

## Preview Statuses

- `PREVIEW_ONLY`: Informational row with no automatic action.
- `NEEDS_ACCOUNTANT_REVIEW`: Row needs accountant review before any variance policy decision.
- `NEEDS_MATCHING_REVIEW`: Row should be resolved through matching workflow before any posting decision.
- `NEEDS_RETURN_REVIEW`: Row is connected to return handling before any supplier credit/refund decision.
- `READY_FOR_POLICY_DECISION`: Row has enough source context for a future accountant-reviewed policy decision.

These statuses are preview statuses only. They do not mutate purchase matching reviews, source documents, AP, or inventory.

## Severity Rules

- `CRITICAL`: Over-received/over-billed value, or amount at or above the configured preview threshold of `5000.0000`.
- `HIGH`: Receipt-without-bill, bill-without-receipt, return-pending-credit, review-required, or amount at or above `1000.0000`.
- `MEDIUM`: Non-zero price or quantity variance below the high threshold.
- `LOW`: Zero-value fallback rows, normally only used for incomplete review context.

If a linked matching review already carries a severity, the preview may use that severity to preserve review context.

## Calculation Assumptions

- Calculations use existing purchase order, purchase bill, purchase receipt, purchase return, and purchase matching review data.
- Line matching is based on existing source line links first, then conservative local matching by sort order, item, or description where needed.
- Unit costs are weighted by quantity when multiple lines roll into the same source group.
- Expected value is purchase order quantity multiplied by purchase order unit price.
- Received value is receipt quantity multiplied by receipt unit cost.
- Billed value is bill quantity multiplied by bill unit price.
- Returned value is return quantity multiplied by return unit cost, falling back to linked receipt, bill, or order line cost where available.
- Variance quantity is the difference relevant to the variance type.
- Variance amount is signed: positive when receipt/over-received value is higher, negative when bill/return value is higher or pending credit reduces value.

## Price Variance

Price variance is calculated as:

`(weighted receipt unit cost - weighted bill unit cost) * matched quantity`

Price variance is previewed only when receipt and bill unit costs are both available and the matched quantity is greater than zero.

## Quantity Variance

Quantity variance is calculated from received quantity less billed quantity, multiplied by the best available unit cost for the source group.

Quantity variance is separate from over-received and over-billed value. A source group can produce more than one preview row when it has both bill/receipt mismatch and purchase order overage risk.

## Returns Treatment

Purchase returns are treated as non-posting context. A return-linked preview row shows returned quantity and returned value as `RETURN_PENDING_CREDIT` when a return exists without related supplier credit/refund context.

The preview does not create a purchase return, debit note, supplier refund, AP adjustment, journal entry, inventory movement, or variance posting.

## Missing Source Treatment

- Receipt-without-bill means received value exists but billed value is zero for the source group.
- Bill-without-receipt means billed value exists but received value is zero for the source group.
- These rows are timing/review signals only. They do not create AP, inventory, clearing, or variance accounting entries.

## Accounting Boundary

The preview never:

- Posts or reverses journals.
- Changes AP balances.
- Changes purchase bill balances.
- Books inventory variance journals.
- Creates debit notes.
- Creates supplier refunds.
- Affects VAT reports, financial statements, GL, Trial Balance, P&L, or Balance Sheet.

Any future posting workflow needs a separate accountant-reviewed policy, permission model, audit event set, and tests.

## Inventory Boundary

The preview never:

- Changes inventory quantities.
- Creates stock movements.
- Changes moving average valuation.
- Creates FIFO layers.
- Changes landed cost.
- Posts COGS.
- Posts inventory asset or inventory clearing entries.

Future FIFO, landed cost, or automatic inventory adjustment behavior must remain separate from this preview workflow.

## Permissions

- Viewing valuation variance preview requires `inventory.view`.
- Source document links are shown only when the user has the relevant source view permission.
- No mutation permissions are used because no mutation actions are available.

## Audit Behavior

Ordinary preview views are not lifecycle events and are not audited. A future explicit review-recording action would belong to the matching review workflow, not this preview workflow.

## Future Relationship To Landed Cost And FIFO

This preview may inform future accountant policy discussions, but it does not implement landed cost, FIFO, automatic cost-layer changes, or inventory valuation adjustments. Those features need separate policy, schema, posting, reconciliation, and accountant review work.
