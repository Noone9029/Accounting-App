# Dashboard Sales/AR Attention Threshold Policy

Date: 2026-06-04

This policy defines the conservative Sales/AR attention thresholds used by the LedgerByte dashboard. Dashboard attention items are read-only workflow signals. They do not send email, collect payments, post journals, file VAT, call ZATCA, generate invoices, convert quotes, issue delivery notes, close collection cases, or move inventory.

## Shared Defaults

- Top item limit: 5 rows per Sales/AR attention panel.
- Quote expiring-soon window: 7 calendar days, inclusive of the current UTC day.
- Recurring template due-soon window: 7 calendar days, inclusive of the current UTC day.
- Collection due-today window: current UTC day only.
- Delivery overdue window: delivery date before the current UTC day.
- Dashboard data remains tenant-scoped through the active organization.

## Overdue Invoices

- An invoice becomes overdue when its due date is before the current UTC day.
- If an invoice has no due date, the issue date is used as the due basis.
- Included statuses: `FINALIZED`.
- Included balances: positive `balanceDue` only.
- Excluded statuses and records: draft invoices, voided invoices, paid or zero-balance invoices, quotes, recurring templates, delivery notes, collection cases, and customer activity rows that are non-posting.
- Sort order: oldest due date first, then highest outstanding balance, then invoice number.
- Top item limit: 5.
- KPI definition: count and total use outstanding finalized sales invoices only. This does not change AR Aging or customer ledger math.

## Collection Follow-Ups

- Due today means `nextActionAt`, or `followUpDate` when `nextActionAt` is absent, falls within the current UTC day.
- Overdue follow-up means that same follow-up date is before the current UTC day.
- Open/actionable statuses: `OPEN`, `IN_PROGRESS`, `PROMISED_TO_PAY`, `ON_HOLD`, and `DISPUTED`.
- Excluded statuses: `PAID`, `CLOSED`, and `CANCELLED`.
- Promise-to-pay total includes `promisedAmount` only for cases in `PROMISED_TO_PAY` status. It is not a payment received amount.
- Disputed count includes cases in `DISPUTED` status. It is not a legal escalation claim.
- Sort order: overdue follow-ups first, then due-today follow-ups, then future/no-date cases; within each group sort by priority `URGENT`, `HIGH`, `NORMAL`, `LOW`, then oldest follow-up date, then case number.
- Top item limit: 5.

## Quotes Awaiting Action

- Awaiting acceptance means `SENT` quotes that have no expiry date or have an expiry date on or after the current UTC day.
- Expiring soon means an active sent quote expires within the 7-day expiring-soon window.
- Accepted not converted means an `ACCEPTED` quote has no converted sales invoice link.
- Expired sent quotes are not counted as active awaiting acceptance. They should be reviewed in the quote workspace if a future expired-quote panel is added.
- Excluded statuses and records: converted accepted quotes, cancelled quotes, rejected quotes, invoices, recurring templates, delivery notes, collection cases, and AR balance records.
- Sort order: expiring-soon sent quotes first, then accepted-not-converted quotes, then remaining active sent quotes, with duplicates removed.
- Top item limit: 5.
- Quotes remain non-posting and do not contribute to AR totals.

## Recurring Invoice Templates

- Due soon means an `ACTIVE` template has `nextRunDate` from the current UTC day through the 7-day due-soon window.
- Overdue for generation means an `ACTIVE` template has `nextRunDate` before the current UTC day.
- Active-only behavior: due-generation counts and top rows include `ACTIVE` templates only.
- Excluded statuses: `DRAFT`, `PAUSED`, `ENDED`, and `CANCELLED`.
- Generated draft invoice visibility includes recently generated `DRAFT` sales invoices linked to a recurring template.
- Sort order: overdue templates first, then due-soon templates, ordered by oldest `nextRunDate`; generated draft invoices use newest created rows from the existing draft-invoice query.
- Top item limit: 5 templates and 5 generated draft invoices.
- The dashboard does not run a scheduler, generate invoices, finalize invoices, post journals, send email, collect payment, or call ZATCA.

## Delivery Notes

- Draft delivery notes are `DRAFT` delivery notes needing review or issue action.
- Issued-not-delivered delivery notes are `ISSUED` delivery notes awaiting delivery completion.
- Overdue delivery means a delivery note has `deliveryDate` before the current UTC day and is not delivered, cancelled, or voided.
- Active attention statuses: `DRAFT` and `ISSUED`.
- Excluded statuses: `DELIVERED`, `CANCELLED`, and `VOIDED`.
- Sort order: overdue delivery notes first, then issued delivery notes, then draft delivery notes, with duplicates removed.
- Top item limit: 5.
- Delivery notes are fulfillment documents. Dashboard visibility does not move inventory, create stock issues, send delivery email, imply carrier integration, or affect AR/VAT.

## Top AR Customers

- Balance basis: positive outstanding balances from finalized sales invoices.
- Overdue amount is shown separately from total outstanding balance.
- Open collection case count is shown as workflow context when collection data is available.
- Excluded from AR balance: quotes, recurring templates, delivery notes, collection cases, and other non-posting activity.
- Sort order: outstanding balance descending.
- Top item limit: 5.
- This does not change customer ledger, customer statement, or AR Aging math.

## Empty States

When a panel has no attention rows, the dashboard uses these exact safe empty states:

- No overdue invoices requiring attention.
- No collection follow-ups due.
- No quotes needing action.
- No recurring templates due for manual generation.
- No delivery notes awaiting action.
- No outstanding customer balances to show.

Empty states must not imply all accounting, tax, compliance, customer payment, or ZATCA work is complete.

## Permission Visibility

- `dashboard.view` is required for the dashboard route and summary endpoint.
- `salesInvoices.view` is required for the detailed Sales/AR attention section.
- `contacts.view` is required for clickable customer links. Without it, customer rows remain read-only text.
- View-only users may see read-only attention data where the existing permission policy allows it.
- Restricted users should not see module rows they cannot view.
- Dashboard attention panels do not expose create, edit, close, generate, deliver, payment, email, or other mutation actions.

## Safety Boundaries

The dashboard attention policy does not implement:

- Email sending or automated reminders.
- Background scheduling or recurring invoice generation.
- Payment collection, payment links, or gateway capture.
- Journal posting, payment allocation, invoice balance mutation, credit note creation, or refund creation.
- Official VAT filing.
- Real ZATCA signing, clearance, reporting, PDF/A-3, or production compliance.
- Inventory movement, stock issue creation, shipment routing, or carrier logistics.
- Production hosting, infrastructure, storage migration, backup/restore execution, or hosted/customer-data checks.
