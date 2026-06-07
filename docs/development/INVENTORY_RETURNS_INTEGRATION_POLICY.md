# Inventory Returns Integration Policy

Date: 2026-06-05

Product: LedgerByte

Sprint: Inventory Returns Integration Sprint

## Purpose

Define the controlled inventory movement behavior for returns while preserving accounting, AP/AR, VAT, valuation, ZATCA, email, and payment boundaries.

LedgerByte remains controlled beta/user-testing only. This policy is product behavior guidance, not production infrastructure guidance.

## Purchase Return Stock-Out Behavior

- Purchase returns remain operational supplier-return documents.
- A purchase return does not move stock automatically.
- Approved or completed purchase returns can post an explicit operational stock movement when every inventory-tracked line is linked to a posted purchase receipt line with an existing source stock movement.
- The posted movement type is `PURCHASE_RETURN_OUT`.
- The movement decreases on-hand stock for the source receipt warehouse.
- Non-tracked lines are skipped and do not create stock movements.
- If no inventory-tracked receipt-linked lines exist, posting is blocked.
- Posting is blocked when the return is not approved or completed, the source receipt line has no posted stock movement, the warehouse is missing or archived, or the projected on-hand quantity would become negative.

## Sales Return Stock-In Behavior

- Sales-side stock-in is deferred in this sprint.
- Existing credit notes contain item and quantity data but do not reliably identify returned-stock source, warehouse, delivery note line, or sales stock issue line for safe inventory receipt.
- The reserved movement type `SALES_RETURN_IN` exists for future explicit sales return documents.
- Future sales return stock-in should use a dedicated returned-goods document or a credit-note extension that safely captures warehouse, returned quantity, source issue/delivery/invoice line, and duplicate-prevention links.

## Status Rules

- `DRAFT` and `SUBMITTED` purchase returns cannot post inventory movement.
- `APPROVED` and `COMPLETED` purchase returns can post inventory movement if preview blockers are clear.
- `CANCELLED` and `VOIDED` purchase returns cannot post inventory movement.
- Purchase returns with posted inventory movement cannot be voided through the current purchase-return workflow because reversal is not supported yet.
- Correction of a mistaken return movement requires a separately approved inventory adjustment until a safe reversal workflow exists.

## Duplicate Prevention

- Purchase return header metadata stores `inventoryReturnPostedAt` and `inventoryReturnPostedByUserId`.
- Purchase return lines store a unique `stockMovementId`.
- Posting revalidates inside a transaction and claims only unposted approved/completed returns.
- Duplicate posting is blocked if the header is already posted or any return line has a linked movement.

## Accounting Boundary

Inventory return movement is operational stock movement only. It does not:

- Create accounting journals.
- Reverse accounting journals.
- Affect financial statements.
- Post inventory valuation adjustments.
- Create COGS or inventory asset entries.

## AP/AR Boundary

Inventory return movement does not:

- Change AP balances.
- Change AR balances.
- Change purchase bill balances.
- Change sales invoice balances.
- Create purchase debit notes.
- Create supplier refunds.
- Create customer refunds.
- Allocate payments.

Supplier credit/refund and customer credit/refund remain separate explicit workflows.

## VAT And ZATCA Boundary

Inventory return movement does not:

- Create VAT entries.
- Affect VAT reports.
- File official VAT.
- Generate tax invoices.
- Call ZATCA.
- Sign, clear, report, or archive ZATCA artifacts.

## Valuation Boundary

Inventory return movement does not:

- Post valuation variances.
- Update landed cost.
- Create FIFO layers.
- Change moving-average policy.
- Create automated accounting from valuation previews.

Valuation variance preview may show that a linked purchase return has posted operational stock-out, but `RETURN_PENDING_CREDIT` remains preview-only until accountant-reviewed accounting policy exists.

## Relationship To Future Landed Cost And FIFO

This sprint reserves only operational quantity movement behavior. Future landed cost, FIFO, cost-layer reversal, or inventory-accounting automation needs separate policy, accountant review, schema design, and tests.

## Accountant Review Needed

Accountant review is required before any automated accounting behavior is added for:

- Purchase return debit notes.
- Supplier refunds.
- Sales return stock-in tied to credit notes.
- Customer refunds.
- Inventory valuation postings.
- Landed cost.
- FIFO/cost layers.
- VAT reporting changes.
