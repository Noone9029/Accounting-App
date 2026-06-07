# Purchase Returns Policy

Date: 2026-06-05

Product: LedgerByte

## Purpose

Purchase returns are operational supplier-return documents. They help users record that goods or services are being returned or disputed, link the return to supplier/source context, and track document status before any separate accounting or inventory workflow is performed.

This policy is intentionally conservative. Purchase returns do not post journals, adjust AP balances, create supplier credits/refunds, move inventory, book variances, send email, call ZATCA, or affect VAT by themselves.

## Statuses

- `DRAFT`: Editable return saved for review.
- `SUBMITTED`: Return submitted for operational approval.
- `APPROVED`: Return approved as an operational document.
- `COMPLETED`: Operational return process completed. Accounting, supplier refund, and stock effects still require separate explicit workflows.
- `VOIDED`: Approved return voided as a document state. No journal reversal is required because the return itself posts no journal.
- `CANCELLED`: Draft or submitted return cancelled and closed.

## Lifecycle Rules

- Draft returns can be edited.
- Draft returns can be submitted.
- Submitted returns can be approved or cancelled.
- Approved returns can be completed or voided.
- Completed, voided, and cancelled returns cannot be edited through the draft update path.
- Completed returns are final as operational documents only.

## Source Document Behavior

Purchase returns may be created from:

- Supplier directly.
- Purchase bill.
- Purchase order.
- Purchase receipt.
- Purchase matching review when the review status is `NEEDS_RETURN_REVIEW`.

Source links are references and validation anchors. Creating a purchase return does not change purchase order, purchase bill, purchase receipt, or purchase matching review status.

## Quantity Rules

- Return lines must be non-empty.
- Return quantities must be positive.
- If a return line references a purchase bill line, purchase order line, or purchase receipt line, total active returned quantity for that source line must not exceed the source line quantity.
- Cancelled and voided returns do not count against source-line returned quantity.
- Manual supplier-direct lines are allowed when no source line is available.

## Accounting Boundary

Purchase returns do not:

- Create journal entries.
- Reverse journal entries.
- Change AP balances.
- Change purchase bill balances.
- Create purchase debit notes.
- Create supplier refunds.
- Affect VAT reports.
- Affect financial statements.

If supplier credit accounting is required, create a purchase debit note separately. If money is returned, record a supplier refund separately.

## Inventory Boundary

Purchase returns do not:

- Change inventory quantities.
- Create stock movements.
- Reverse purchase receipt movements.
- Change landed cost.
- Change FIFO or valuation layers.
- Book inventory variances.

Any future inventory impact needs a separate accountant-reviewed policy and explicit workflow.

## Matching Review Relationship

Purchase matching reviews can point users toward return review with `NEEDS_RETURN_REVIEW`. A purchase return can link back to that review. Return creation does not resolve the review automatically.

## Intentionally Not Automated

This version intentionally does not automate:

- Purchase debit note creation.
- Supplier refund creation.
- Stock return movements.
- Inventory valuation corrections.
- Variance posting.
- Landed cost.
- Supplier email or supplier portal messages.
- ZATCA or VAT filing behavior.

## Review Needed Before Automation

Before adding posting, debit-note automation, refund automation, stock movements, or variance treatment, LedgerByte needs accountant review of:

- Return reason codes.
- Quantity tolerance rules.
- Supplier credit timing.
- VAT handling.
- Inventory valuation treatment.
- Audit and approval policy.
