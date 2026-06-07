# Focused Collections Browser Workflow Sprint Closure

Date: 2026-06-04

Product: LedgerByte

Sprint: Focused Collections Browser Workflow Sprint

## Browser Workflow Covered

Added focused mocked Playwright browser coverage in `tests/visual/collections-workflow.visual.spec.ts`.

Covered routes:

- `/sales/collections`
- `/sales/collections/new`
- `/sales/collections/[id]`
- `/sales/collections/[id]/edit`
- `/sales/invoices/[id]` related collection cases panel
- `/customers/[id]` customer collections panel
- global create menu
- global search results

Covered positive workflow:

- Open Collections workspace.
- Verify summary cards, top overdue customers, and aging buckets.
- Start a new collection case.
- Select a customer.
- Select an outstanding invoice.
- Verify invoice number, due date, outstanding balance, and aging bucket context.
- Set priority, follow-up dates, and promise-to-pay details.
- Save the case.
- Open collection case detail.
- Edit the case.
- Add note and call activities.
- Mark promised to pay.
- Mark disputed.
- Put on hold.
- Move back to in progress.
- Close the case.
- Verify activity timeline visibility.
- Verify invoice balance remains unchanged.
- Verify no payment, email, payment-link, ZATCA, invoice mutation, or inventory behavior is called.
- Verify invoice detail shows the linked collection case.
- Verify customer detail shows the collection case without changing AR.
- Verify global create and search labels/routes.

Covered negative workflow:

- Restricted users do not see create, edit, lifecycle, or add-activity actions.
- Restricted users do not see the global create `Collection case` link.
- Invoice detail hides `Create collection case` when an open case already exists.
- Closed and cancelled cases hide mutation actions.
- Closed and cancelled cases show a locked edit message on the edit route.
- Safe wording assertions reject sent-email, sent-reminder, posted-payment, payment-link, journal, VAT, ZATCA, and legal-action implications.

## Collection Defects Found And Fixed

- Collections workspace loaded full summary data from the API but did not expose overdue invoice count, overdue follow-up count, top overdue customers, or aging buckets. The workspace now displays those summary fields.
- The new/edit form showed invoice number and outstanding balance but not due date or aging bucket context. The selected invoice summary now shows due date and aging bucket while keeping the no-balance-mutation wording.
- Cases could be put on hold, but the UI did not expose the backend-supported `start` action to move an on-hold case back to in progress. The detail page now shows `Start` for open and on-hold cases.
- Activity helper text explained planned email/reminder behavior but did not explicitly explain `Payment received note`. It now states that a payment received note is internal note-only and does not allocate or post payment.
- Invoice and customer related collection panels showed raw activity enum values. They now use accountant-readable activity labels.

No backend defects were found in this sprint, and no backend code was changed.

## What Was Verified

- Collection case list/new/detail/edit works through UI-level browser coverage.
- Summary cards and supporting summary sections render with mocked overdue data.
- Lifecycle actions work for promised, disputed, hold, start, and close states.
- Activity timeline renders note, call, planned email, planned reminder, promise, dispute, escalation, payment received note, and closed note labels safely.
- Restricted-role behavior hides create/update/lifecycle/activity actions.
- Invoice detail related collection cases panel links to the collection case and hides duplicate open-case creation.
- Customer detail collections panel shows the case, linked invoice, outstanding balance from existing invoice data, latest activity, next follow-up, and promise details.
- Global create exposes `Collection case` only when permitted.
- Global search exposes collection cases as `Collection case` and opens `/sales/collections/[id]`.
- Collections remain non-posting and do not alter invoice balance, customer AR, payment allocation, VAT/report math, email state, payment links, ZATCA state, or inventory.

## Intentionally Skipped

- Real email sending.
- Automated reminders.
- Background scheduler or workers.
- Payment links.
- Payment gateway capture.
- Stripe or billing.
- Legal debt collection automation.
- Customer portal.
- AR Aging math changes.
- Dashboard financial-total changes.
- Production infrastructure.
- Hosted/customer-data checks.
- Real ZATCA behavior.

## Validation

Commands run:

- `corepack pnpm test:visual -- collections-workflow.visual.spec.ts`
  - First run failed as expected on missing summary exposure and planned/note-only activity assertions.
  - Final run passed: 3 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- collections collection-case-form customer-collections-panel global-search global-create-menu permissions sales/invoices`
  - First run exposed one stale unit assertion after the summary section intentionally duplicated the customer name.
  - Final run passed: 9 test suites, 38 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck`
  - Passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`
  - Failed only on unrelated untracked marketing work at `apps/web/src/app/marketing.test.tsx`.

## Marketing Typecheck Blocker

`apps/web/src/app/marketing.test.tsx` remains an unrelated untracked file. It is not part of this sprint and was not modified.

The known blocker is:

- `apps/web/src/app/marketing.test.tsx(35,13): 'HomePage' cannot be used as a JSX component. Its type '() => void' is not a valid JSX element type.`
- `apps/web/src/app/marketing.test.tsx(65,10): 'HomePage' cannot be used as a JSX component. Its type '() => void' is not a valid JSX element type.`

## Remaining Collections Gaps

- No scheduled reminder worker.
- No real email delivery.
- No customer portal collection view.
- No payment-link or payment-gateway integration.
- No legal debt collection workflow.
- No dashboard attention-item integration.
- No deployed E2E with safe seeded collections data.
- No accountant sign-off on collections terminology and workflow policy.

## Recommended Next Sprint

Run an Accountant Sales/AR Wording And Review Sprint covering invoices, quotes, recurring invoices, delivery notes, collections, customer activity, statements, and AR reports before designing any reminder/email/payment automation.
