# Sales Inventory Returns Policy

Date: 2026-06-06

Product: LedgerByte

Scope: Sales Inventory Return Document Sprint

## Purpose

Sales inventory returns are dedicated operational stock documents for goods returned by customers.

They exist because credit notes and customer refunds are accounting and cash documents. They do not reliably prove that stock physically returned to a specific warehouse or source fulfillment path.

## Source Document Behavior

A sales inventory return can be created from:

- A customer directly.
- A sales invoice when line item and quantity detail exists.
- A credit note as accounting context and reference.
- A delivered delivery note when line detail exists.
- A posted sales stock issue when line, item, warehouse, and source movement can be resolved.

When a source line is selected, the return line quantity must not exceed the source quantity still available for non-cancelled, non-voided sales inventory returns.

## Credit Note Relationship

Credit notes remain separate Sales/AR accounting documents.

Linking a credit note to a sales inventory return:

- Provides traceability only.
- Does not create, finalize, void, allocate, or reverse a credit note.
- Does not prove a warehouse/source movement path by itself.
- Requires explicit return lines and a validated warehouse before operational stock-in can post.

## Refund Relationship

Customer refunds remain separate cash/payment documents.

Sales inventory returns do not create customer refunds, pay money, create payment links, change unapplied amounts, or change customer balance by themselves.

## Warehouse Validation

Operational stock-in movement requires an active warehouse for each inventory-tracked line.

Warehouse can be:

- Explicitly selected on the return line.
- Safely derived from a posted sales stock issue source.

If no active warehouse can be resolved, the preview blocks posting.

## Stock-In Behavior

Posting inventory return movement is explicit and user-triggered.

Rules:

- Only `APPROVED` or `RECEIVED` sales inventory returns can post stock-in.
- Posting creates `SALES_RETURN_IN` stock movements for inventory-tracked postable lines.
- Posting increases operational stock quantity in the selected or derived warehouse.
- Non-inventory-tracked lines are skipped.
- Posted movements are linked back to sales inventory return lines.
- Header posted metadata records posting user and timestamp.

## Duplicate Prevention

Duplicate posting is blocked by:

- Sales inventory return header `inventoryReturnPostedAt`.
- Per-line `stockMovementId` link.
- Transactional claim during post.
- Preview blockers when movement already exists.

## Status Rules

Lifecycle:

- `DRAFT` can be edited and submitted.
- `SUBMITTED` can be approved or cancelled.
- `APPROVED` can be received, voided, or stock-in posted.
- `RECEIVED` can be voided only if stock-in has not been posted, and can stock-in post if not already posted.
- `CANCELLED` and `VOIDED` are terminal.

Once stock-in movement has posted, reversal is not supported by this workflow. Corrections require a separately approved inventory adjustment until a dedicated reversal policy is implemented.

## Accounting Boundary

Sales inventory returns do not:

- Create accounting journals.
- Reverse accounting journals.
- Change revenue.
- Reverse revenue.
- Change COGS.
- Reverse COGS.
- Affect financial statements.

Accountant review is required before any future automated revenue/COGS/accounting behavior is designed.

## AR And VAT Boundary

Sales inventory returns do not:

- Change AR balances.
- Change invoice balances.
- Create or allocate credit notes.
- Create refunds.
- Affect VAT reports.
- Create official VAT filing output.

Any customer credit, invoice balance adjustment, VAT effect, or refund must be handled through the existing separate Sales/AR documents and reviewed posting workflows.

## ZATCA Boundary

Sales inventory returns do not:

- Generate ZATCA XML.
- Sign invoices or credit notes.
- Clear, report, or submit to ZATCA.
- Create PDF/A-3 artifacts.

## Future COGS Reversal Policy

This sprint does not implement COGS reversal.

Future COGS reversal requires accountant-approved policy for:

- Source sale/stock issue matching.
- Cost basis.
- Partial returns.
- Returned goods condition and write-downs.
- Period locks.
- Audit evidence.
- Interaction with future FIFO/cost layers.

## Future Landed Cost And FIFO

This workflow does not update landed cost, FIFO layers, or cost layers.

`SALES_RETURN_IN` can carry source unit cost where safe, but that remains operational movement metadata and must not be treated as complete FIFO/landed-cost accounting.

## Future Customer Portal, Email, And Payment Boundaries

Sales inventory returns do not send customer email, expose a customer portal, create return labels, automate logistics, or create payment links.

Those areas require separate product, security, and provider review before implementation.
