# Supplier/AP Dashboard Attention Policy

Date: 2026-06-05

Product: LedgerByte

Status: Controlled beta/user-testing policy

## Purpose

The Supplier/AP Dashboard summarizes supplier-focused Purchases/AP attention items so accountants can review payables, matching, returns, and valuation variance preview work from one place.

The dashboard is read-only. It does not post journals, adjust AP balances, change bill balances, move inventory, send email, book variances, create debit notes, create supplier refunds, file VAT, call ZATCA, allocate landed cost, or change FIFO/cost layers.

## Attention Categories

The dashboard attention categories are:

- Bills overdue.
- Bills due soon.
- Purchase orders awaiting receipt.
- Purchase receipts awaiting bill.
- Bills awaiting receipt.
- Matching exceptions critical/high.
- Matching reviews open or waiting.
- Purchase returns awaiting approval/completion.
- Valuation variance previews needing review.

## Date Windows

- Overdue bills are finalized purchase bills with an unpaid balance and a due date before the current day.
- Due-soon bills are finalized purchase bills with an unpaid balance and a due date through the next 7 days.
- The default due-soon window is 7 days.
- The dashboard uses the current day as the comparison point for overdue and due-soon classification.

## Ordering Rules

- Critical/high matching and variance rows are ordered before lower-severity rows.
- Overdue and due-soon bills are ordered by due date, then bill date, then created date.
- Purchase returns awaiting action are ordered by submitted, approved, draft, then oldest return date.
- Recent supplier activity is ordered by latest activity date.
- Top supplier panels are ordered by the relevant amount, count, or highest severity.

## Top Row Limits

- Dashboard attention lists are capped at 5 rows by default.
- Top supplier panels are capped at 5 rows by default.
- The API can aggregate beyond the visible row cap, but visible attention lists stay compact for accountant review.

## Permission Behavior

- Existing permissions are reused. No new permission strings are introduced by this policy.
- `contacts.view` controls supplier links.
- `purchaseBills.view` controls bill visibility and bill links.
- `purchaseOrders.view` controls purchase order visibility and purchase order links.
- `purchaseReceiving.view` controls purchase receipt visibility and receipt links.
- Purchase matching visibility follows the existing purchase matching view policy: purchase order, bill, or receiving view permission can expose matching review/exception aggregates and allowed links.
- `inventory.view` controls valuation variance preview visibility and links.
- `supplierPayments.view`, `purchaseDebitNotes.view`, and `supplierRefunds.view` control those financial activity rows.
- If a user lacks permission for a source route, the dashboard may show safe aggregate counts but must hide sensitive row details and route links for that source.

## Posting Vs Non-Posting Activity

Financial posting activity includes:

- Purchase bills.
- Supplier payments.
- Purchase debit notes.
- Supplier refunds.

Operational/non-posting activity includes:

- Purchase orders.
- Purchase receipts.
- Purchase returns.
- Matching reviews.
- Valuation variance previews.

Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.

## Purchase Returns

Purchase returns remain operational/non-posting records.

The dashboard may count and link purchase returns awaiting action, but it must not:

- Create purchase returns automatically.
- Approve purchase returns automatically.
- Complete purchase returns automatically.
- Create debit notes automatically.
- Create supplier refunds automatically.
- Move inventory automatically.
- Post journals automatically.
- Change supplier payable balances automatically.

## Valuation Variance Previews

Valuation variance previews remain read-only review rows.

The dashboard may summarize variance preview counts and amounts, but it must not:

- Book variances.
- Change AP balances.
- Change bill balances.
- Change inventory quantities.
- Change inventory valuation.
- Allocate landed cost.
- Create FIFO/cost layers.
- Affect VAT reports or financial statements.

## Matching Reviews

Matching reviews classify exceptions only.

The dashboard may summarize open or waiting matching reviews, but it must not:

- Mutate source documents.
- Resolve reviews automatically.
- Create returns, debit notes, supplier refunds, journals, or inventory movement.
- Contact suppliers.

## Explicit Non-Goals

This policy does not implement:

- Variance posting.
- Automatic AP adjustment.
- Automatic inventory adjustment.
- Landed cost.
- FIFO.
- Automatic debit notes.
- Automatic supplier refunds.
- Supplier email.
- Supplier payment automation.
- Live bank feeds.
- Payment gateway behavior.
- Real ZATCA.
- PDF/A-3.
- Official VAT filing.
- Production hosting.
