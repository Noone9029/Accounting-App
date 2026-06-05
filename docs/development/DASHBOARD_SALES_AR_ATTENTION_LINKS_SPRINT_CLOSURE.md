# Dashboard Sales/AR Attention Links Sprint Closure

Date: 2026-06-04

## Scope

This sprint added read-only dashboard attention visibility for the completed Sales/AR workflows. It did not add mutation actions, production infrastructure, email sending, payment links, recurring schedulers, legal debt-collection automation, official VAT filing, ZATCA production behavior, or inventory movement.

## Dashboard Attention Sections Added

- Overdue invoices: count, total outstanding overdue balance, top invoice rows, and links to sales invoice detail pages.
- Collection follow-ups: open case count, due-today and overdue follow-up counts, promised-to-pay total, disputed count, and links to collection case detail pages.
- Quotes awaiting action: sent quotes awaiting acceptance, quotes expiring soon, accepted quotes not converted, and links to quote detail pages.
- Recurring templates due for manual generation: active templates due soon or overdue, plus recently generated draft invoices from recurring templates.
- Delivery notes awaiting delivery: draft delivery notes, issued-not-delivered delivery notes, overdue delivery dates, and delivery-note detail links.
- Top customers by outstanding balance: top customers by finalized-invoice AR, overdue amount, open collection case count, and customer detail links when `contacts.view` allows them.

## Data Sources

- Sales invoices: finalized invoices with positive `balanceDue`; voided and draft invoices are excluded from overdue AR.
- Collections: open follow-up statuses only: `OPEN`, `IN_PROGRESS`, `PROMISED_TO_PAY`, `ON_HOLD`, and `DISPUTED`.
- Sales quotes: `SENT` and `ACCEPTED` quotes, with accepted-not-converted based on the converted invoice link.
- Recurring invoices: active templates with `nextRunDate` due soon or overdue, plus recently generated draft sales invoices linked to recurring templates.
- Delivery notes: `DRAFT` and `ISSUED` delivery notes only.
- Customers: outstanding AR is calculated from finalized sales invoice balances, with open collection case counts added as workflow context.

## Permission Behavior

- `GET /dashboard/summary` still requires `dashboard.view`.
- Detailed Sales/AR attention data is included only when the active role has `salesInvoices.view`.
- The frontend hides the Sales/AR attention panels when the user lacks the Sales/AR view boundary.
- Customer rows link to `/customers/[id]` only when the user also has `contacts.view`; otherwise they remain read-only rows.
- No create/update/generate/close/deliver/payment actions were added to the dashboard.

## Safe Wording

Dashboard copy explicitly states:

> Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.

Labels use accountant-safe wording such as `Collection follow-ups`, `Quotes awaiting action`, `Recurring templates due for manual generation`, `Draft invoices generated from recurring templates`, `Delivery notes awaiting delivery`, and `Top customers by outstanding balance`.

## What This Does Not Do

- Does not send emails or reminders.
- Does not create payment links or collect payments.
- Does not post journals.
- Does not allocate customer payments.
- Does not mutate invoice balances or statuses.
- Does not convert quotes.
- Does not generate recurring invoices automatically.
- Does not issue or deliver delivery notes.
- Does not move inventory or create stock issues.
- Does not file VAT or call ZATCA.
- Does not change dashboard financial totals, AR Aging math, ledgers, statements, or report calculations.

## Validation

- `corepack pnpm --filter @ledgerbyte/api test -- dashboard.service dashboard.controller`: passed, 2 suites and 11 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: passed.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard`: passed after tightening row link accessibility labels, 2 suites and 15 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: blocked by unrelated untracked `src/app/marketing.test.tsx`:
  - line 35: `HomePage` has type `() => void`
  - line 65: `HomePage` has type `() => void`
- `git diff --check`: passed with line-ending warnings only.

Repo-wide `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build` were not run because the web typecheck remains blocked by unrelated untracked marketing work.

## Marketing Typecheck Blocker

The unrelated untracked marketing blocker still exists:

- `apps/web/src/app/marketing.test.tsx`
- `apps/web/src/app/pricing/`
- `apps/web/src/app/product/`
- `apps/web/src/app/readiness/`
- `apps/web/src/app/resources/`
- `apps/web/src/app/workflows/`
- `apps/web/src/components/marketing/`

Those files were not deleted, modified, or mixed into this sprint.

## Remaining Dashboard and Sales/AR Gaps

- Accountant/product review of dashboard KPI and attention thresholds.
- Optional stock-issue source UI for delivery notes remains deferred and reference-only.
- Automatic recurring scheduler remains out of scope.
- Scheduled collection reminders remain out of scope.
- Real customer email sending remains out of scope.
- Payment links/payment gateway behavior remains out of scope.
- Online quote acceptance remains out of scope.
- Deployed E2E with safe seeded data remains pending.
- Hosted/customer-data proof and production hardening remain pending.
- Accountant sign-off remains pending.

## Recommended Next Sprint

Run a focused dashboard/accountant threshold review sprint: review Sales/AR attention thresholds, date windows, top-row ordering, KPI wording, and empty states with accountant/product input, then implement only bounded dashboard definition changes without adding email, scheduler, payment, ZATCA, inventory, or production infrastructure behavior.
