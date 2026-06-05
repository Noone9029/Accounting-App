# Purchase Matching Review Policy

Date: 2026-06-05

Product: LedgerByte

Scope: Purchase order, purchase bill, and purchase receipt matching exceptions.

## Purpose

Purchase matching reviews let users classify and track PO-to-bill-to-receipt exceptions for follow-up. The review workflow is operational tracking only. It does not correct accounting automatically, post variances, change AP balances, change inventory quantities, create purchase returns, or contact suppliers.

LedgerByte remains controlled beta/user-testing only. This policy is not accountant approval, production readiness, or an automated variance/returns policy.

## Review Statuses

- `OPEN`: An exception has been captured or reviewed enough to track, but active triage has not started.
- `IN_REVIEW`: A user is actively checking the exception against purchase documents, receipts, or supplier communication.
- `WAITING_FOR_SUPPLIER`: Follow-up depends on supplier clarification, corrected supplier documents, or supplier confirmation.
- `WAITING_FOR_RECEIPT`: A bill or order is present, but receipt evidence is still pending.
- `WAITING_FOR_BILL`: A receipt or order is present, but supplier bill evidence is still pending.
- `ACCEPTED_AS_TIMING_DIFFERENCE`: The mismatch is being treated as temporary timing, not as accountant approval, variance booking, or return authorization.
- `NEEDS_VARIANCE_REVIEW`: The mismatch may require future variance review, but no variance is booked by this workflow.
- `NEEDS_RETURN_REVIEW`: The mismatch may require future purchase return review, but no purchase return is created by this workflow.
- `RESOLVED`: The review is closed because the user determined the exception no longer requires follow-up or the underlying documents were corrected through normal workflows.
- `CANCELLED`: The review is closed because it was duplicate, mistaken, or no longer relevant.

Resolved and cancelled reviews are terminal in this sprint. Reopening is out of scope.

## Reason Codes

- `QUANTITY_MISMATCH`: Ordered, billed, or received quantities do not align.
- `PRICE_MISMATCH`: Amount or unit price comparison needs review.
- `RECEIPT_MISSING`: A bill or order needs matching receipt evidence.
- `BILL_MISSING`: A receipt or order needs matching bill evidence.
- `OVER_RECEIVED`: Received quantity exceeds the expected ordered or billed quantity.
- `OVER_BILLED`: Billed quantity exceeds the expected ordered or received quantity.
- `SUPPLIER_DISPUTE`: Supplier clarification or dispute handling is needed.
- `TIMING_DIFFERENCE`: The mismatch is expected to clear when a bill or receipt arrives.
- `DATA_ENTRY_REVIEW`: A user should inspect document entry or linkage.
- `OTHER`: A safe fallback reason when none of the named reason codes fit.

## Timing Difference Guidance

Use `ACCEPTED_AS_TIMING_DIFFERENCE` when the mismatch appears temporary and no immediate accounting or inventory correction is justified. Examples include a receipt that arrived before the supplier bill, or a supplier bill that arrived before goods receipt confirmation.

This status does not approve variance posting, purchase returns, AP adjustment, supplier payment, or stock adjustment.

## Variance Review Guidance

Use `NEEDS_VARIANCE_REVIEW` when quantities or values may require a future variance decision. This status is a flag only. It does not create or post a variance proposal, journal entry, AP adjustment, or inventory valuation change.

Accountant review is required before any automated variance policy or posting workflow is added.

## Return Review Guidance

Use `NEEDS_RETURN_REVIEW` when over-received, over-billed, damaged, rejected, or disputed goods may need a future purchase return or supplier debit note workflow.

This status does not create purchase returns, supplier debit notes, supplier refunds, stock adjustments, or landed-cost changes.

## Resolved Guidance

Use `RESOLVED` only when the review no longer needs follow-up. Resolution can come from normal document workflow corrections or a user decision that the exception is no longer relevant. The review workflow itself does not mutate source purchase orders, purchase bills, purchase receipts, AP balances, inventory quantities, or accounting entries.

## Non-Effect Boundaries

This workflow does not:

- Create or reverse journal entries.
- Post variances.
- Change purchase bill, purchase order, or purchase receipt status.
- Change AP balances.
- Change inventory quantities.
- Create purchase returns.
- Create debit notes.
- Create supplier refunds.
- Change landed cost.
- Change FIFO or valuation layers.
- Send supplier email.
- Contact suppliers.
- Call ZATCA.
- File VAT.
- Run production, hosted, beta, customer-data, backup/restore, seed, reset, delete, cleanup, or OS power workflows.

## Future Policy Work

Before variance automation, return automation, tolerance thresholds, or production matching claims are added, LedgerByte still needs accountant review of:

- Matching tolerance thresholds.
- Multi-PO and partial bill matching policy.
- Variance review and posting policy.
- Purchase return and supplier debit note linkage policy.
- AP/inventory reporting wording.
- Hosted/beta/customer-data behavior.
