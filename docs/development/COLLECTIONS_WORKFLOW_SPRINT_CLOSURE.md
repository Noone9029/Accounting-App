# Collections Workflow Sprint Closure

Date: 2026-06-04

Product: LedgerByte

Sprint: Collections Workflow Sprint

## Scope

This sprint added a controlled Sales/AR collections workflow for accountants and business users to track overdue invoice follow-up, collection status, activities, disputes, holds, and promises to pay.

This is a non-payment-gateway workflow. It does not send customer email, create payment links, run scheduled reminders, allocate payments, change invoice accounting, file VAT, call ZATCA, or implement legal debt-collection tooling.

## What Was Implemented

- Added tenant-scoped `CollectionCase` and `CollectionActivity` models with `COL-` numbering.
- Added collections API endpoints for workspace lists, summary metrics, detail, create, edit, lifecycle actions, activities, customer-scoped cases, and invoice-scoped cases.
- Added the Sales > Collections workspace at `/sales/collections`.
- Added collection case create, detail, and edit routes.
- Added invoice-level collection visibility on sales invoice detail pages.
- Added customer-level collection visibility on customer detail pages.
- Added global create support for `Collection case`.
- Added global search exposure for collection cases.
- Added audit events for collection case lifecycle and activity changes.
- Added targeted backend and frontend tests for collections behavior and impacted integrations.

## Collection Lifecycle Behavior

Supported statuses:

- `OPEN`
- `IN_PROGRESS`
- `PROMISED_TO_PAY`
- `PAID`
- `ON_HOLD`
- `DISPUTED`
- `CLOSED`
- `CANCELLED`

Supported lifecycle actions:

- Start case.
- Mark promised to pay.
- Mark disputed.
- Put on hold.
- Close.
- Cancel.
- Add activities.

Supported activity types:

- `NOTE`
- `CALL`
- `EMAIL_PLANNED`
- `REMINDER_PLANNED`
- `PROMISE_TO_PAY`
- `DISPUTE`
- `ESCALATION`
- `PAYMENT_RECEIVED_NOTE`
- `CLOSED_NOTE`

`EMAIL_PLANNED` and `REMINDER_PLANNED` are planning/status records only. They do not send email, enqueue email, schedule background work, or call an email provider.

`PAYMENT_RECEIVED_NOTE` and `PAID` are collection tracking states only. They do not allocate payment, create payment records, or alter invoice balances.

## Invoice And Customer Integration

- Collection cases can link to a customer and optionally to a finalized sales invoice with an outstanding balance.
- The backend validates that the customer belongs to the active organization.
- The backend validates that a linked invoice belongs to the same organization and customer.
- Duplicate open collection cases for the same invoice are blocked.
- Sales invoice detail pages show related collection cases, status, priority, next follow-up, promise-to-pay details, latest activity, and a link to the collection case.
- The create-from-invoice action appears only when the invoice has an outstanding balance, the user has create permission, and no open case exists.
- Customer detail pages show open collection cases, linked invoice numbers, outstanding balance from existing invoice data, latest activity, next follow-up, and promise-to-pay details.
- Customer statements, invoice balances, payments, credit notes, and refunds are not changed by collection records.

## Summary Behavior

The collections workspace summary includes:

- Total overdue amount.
- Number of overdue invoices.
- Number of open collection cases.
- Cases due today.
- Cases overdue for follow-up.
- Promised-to-pay total.
- Disputed total.
- Top customers by overdue amount.
- Aging buckets based on finalized invoices with outstanding balances.

The summary reads invoice/customer balance data but does not change report math, invoice balances, customer ledgers, VAT totals, P&L, Balance Sheet, or AR Aging calculations.

## Non-Posting Boundaries

Collections records remain operational follow-up records only.

They do not:

- Post journals.
- Allocate payments.
- Create customer payments.
- Create credit notes or refunds.
- Change invoice totals.
- Change invoice balances.
- Change customer statement balances.
- Affect VAT Summary or VAT Return.
- Affect P&L or Balance Sheet.
- Send email.
- Create payment links.
- Call a payment gateway.
- Call ZATCA.
- Move inventory.

## Permission Behavior

This sprint reused the existing Sales/AR permission boundary to avoid unnecessary permission churn:

- View collections: `salesInvoices.view`.
- Create collection cases and preview the next case number: `salesInvoices.create`.
- Edit cases, add activities, and run lifecycle actions: `salesInvoices.update`.

Restricted users without update permission do not see collection mutation actions in the collection detail UI. Users without create permission do not see the global create action or create-from-invoice action.

## Audit Behavior

Audit events were added for:

- Collection case created.
- Collection case updated.
- Started/in progress.
- Marked promised to pay.
- Marked disputed.
- Put on hold.
- Closed.
- Cancelled.
- Activity added.

Audit metadata stores IDs, status/priority changes, dates, and promise metadata. Activity note bodies are not logged; audit metadata records only whether a note exists and its length.

## Validation

Commands run:

- `corepack pnpm db:generate`
  - Passed.
- `corepack pnpm --filter @ledgerbyte/api test -- collections number-sequences search app-bootstrap`
  - Passed: 7 test suites, 29 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- collections collection-case-form customer-collections-panel global-search global-create-menu permissions sales/invoices`
  - Passed: 9 test suites, 38 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck`
  - Passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`
  - Blocked by unrelated untracked marketing work at `apps/web/src/app/marketing.test.tsx`.

Marketing typecheck blocker details:

- `apps/web/src/app/marketing.test.tsx(35,13): 'HomePage' cannot be used as a JSX component. Its type '() => void' is not a valid JSX element type.`
- `apps/web/src/app/marketing.test.tsx(65,10): 'HomePage' cannot be used as a JSX component. Its type '() => void' is not a valid JSX element type.`

The marketing files were not modified.

## Intentionally Skipped

- Real email sending.
- Automated reminders.
- Background scheduler.
- Payment links.
- Payment gateway capture.
- Stripe or billing behavior.
- Legal debt collection tooling.
- Customer portal behavior.
- Dashboard financial-total changes.
- AR Aging math changes.
- Official collections report pack.
- Production hosting or infrastructure changes.
- Hosted/customer-data checks.
- Real ZATCA behavior.

## Remaining Collections Gaps

- No scheduled reminder worker.
- No real email delivery.
- No customer portal collection view.
- No payment-link or payment-gateway integration.
- No legal debt collection workflow.
- No dashboard attention-item integration yet.
- No deployed E2E with safe seeded collections data.
- No accountant sign-off on collections terminology and workflow policy.

## Recommended Next Sprint

Run a focused Collections Browser Workflow Sprint covering:

- List to create to detail to edit.
- Link overdue invoice.
- Add note/call/planned reminder activity.
- Mark promised to pay.
- Mark disputed.
- Put on hold.
- Close/cancel.
- Invoice detail collection panel.
- Customer detail collection panel.
- Restricted-role behavior.
- Global create/search behavior.
- Safe wording checks for no payment, email, VAT, ZATCA, or accounting mutation implications.

## Follow-Up

2026-06-04: The focused Collections Browser Workflow Sprint was completed in `docs/development/COLLECTIONS_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`. It added mocked Playwright coverage for the collections list/new/detail/edit/lifecycle/activity/customer/invoice/global-create/global-search path and fixed UI-only confidence gaps without changing backend accounting, payment, email, VAT, ZATCA, or inventory behavior.
