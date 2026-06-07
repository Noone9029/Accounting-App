# Dashboard Attention Threshold Review Sprint Closure

Date: 2026-06-04

## Scope

This sprint reviewed and hardened the Sales/AR dashboard attention thresholds, date windows, ordering rules, KPI definitions, empty states, and permission behavior introduced by the Dashboard Sales/AR Attention Links Sprint.

The dashboard remains read-only. This sprint did not add mutation buttons, automated reminders, recurring generation, payment links, payment collection, legal debt-collection automation, real email sending, official VAT filing, ZATCA behavior, inventory movement, production infrastructure, hosted/customer-data checks, or storage migration behavior.

## Thresholds Reviewed

- Overdue invoices: finalized sales invoices with positive balance due and due date, or issue date fallback, before the current UTC day.
- Collection follow-ups: open/actionable collection cases with due-today and overdue follow-up definitions based on `nextActionAt` or `followUpDate`.
- Quotes needing action: active sent quotes, seven-day expiring-soon window, and accepted-not-converted quotes.
- Recurring templates: active templates due soon or overdue for manual generation, plus recently generated draft invoices linked to recurring templates.
- Delivery notes: draft delivery notes, issued-not-delivered delivery notes, and overdue delivery dates.
- Top AR customers: finalized-invoice outstanding balance with overdue amount and open collection case count as workflow context.

## Policy Decisions Made

- Added `docs/development/DASHBOARD_SALES_AR_ATTENTION_THRESHOLD_POLICY.md`.
- Set a shared Sales/AR attention top item limit of 5.
- Set quote expiring-soon and recurring due-soon windows to 7 calendar days.
- Kept collection due-today and delivery overdue windows conservative at the current UTC day boundary.
- Excluded expired sent quotes from active awaiting-acceptance counts.
- Kept all dashboard attention items read-only workflow signals.
- Kept non-posting records out of AR totals.

## Empty States Added

The dashboard now uses these exact conservative empty states:

- No overdue invoices requiring attention.
- No collection follow-ups due.
- No quotes needing action.
- No recurring templates due for manual generation.
- No delivery notes awaiting action.
- No outstanding customer balances to show.

The empty states do not imply that all accounting, tax, customer payment, compliance, or ZATCA work is complete.

## Ordering Rules

- Overdue invoices: oldest due date first, then highest balance due, then invoice number.
- Collection cases: overdue follow-ups first, then due-today follow-ups, then future/no-date cases; within each group, priority `URGENT`, `HIGH`, `NORMAL`, `LOW`, then oldest follow-up date, then case number.
- Quotes: expiring-soon sent quotes first, then accepted-not-converted quotes, then remaining active sent quotes.
- Recurring templates: overdue templates first, then due-soon templates.
- Delivery notes: overdue delivery notes first, then issued delivery notes, then draft delivery notes.
- Top AR customers: outstanding balance descending.

## Permission Behavior

- `GET /dashboard/summary` still requires `dashboard.view`.
- Detailed Sales/AR attention data remains gated by `salesInvoices.view`.
- Customer rows link to `/customers/[id]` only when `contacts.view` is available.
- Users without `contacts.view` can still see permitted aggregate/customer labels as read-only text.
- No create/update/close/generate/deliver/payment/email actions were added.

## Safe Wording

The dashboard helper text remains:

> Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.

Labels remain accountant-safe: overdue invoices, collection follow-ups, quotes awaiting action, recurring templates due for manual generation, generated draft invoices, delivery notes awaiting delivery, and top customers by outstanding balance.

## What Remains Unreviewed

- Accountant/product sign-off on the documented threshold policy.
- Whether expired sent quotes should receive a separate dashboard panel.
- Whether top customer rows should include additional aging bucket context.
- Whether dashboard KPI/chart thresholds outside Sales/AR attention need their own policy.
- User-customizable dashboard widgets and saved dashboard preferences.
- Deployed E2E with safe seeded data.
- Hosted/customer-data proof and production hardening.

## Intentionally Skipped

- No production commands, hosted migrations, backup/restore jobs, customer-data checks, deployed E2E, real email sends, real reminders, real ZATCA calls, payment gateway work, payment links, official VAT filing, object-storage migration, or inventory movement were run or implemented.
- No broad dashboard redesign, custom widget system, or dashboard mutation actions were added.
- Unrelated untracked marketing files were not modified.

## Validation

- `corepack pnpm --filter @ledgerbyte/api test -- dashboard.service dashboard.controller`: passed, 2 suites and 12 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard`: passed after narrowing one test assertion, 2 suites and 17 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: blocked by unrelated untracked `src/app/marketing.test.tsx`:
  - line 35: `HomePage` has type `() => void`
  - line 65: `HomePage` has type `() => void`
- `git diff --check`: passed.

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

## Recommended Next Sprint

Run an accountant/product review of the documented dashboard Sales/AR threshold policy and record concrete findings. Implement only bounded threshold wording, window, ordering, or visibility changes that come from that review, while preserving the read-only dashboard boundary and avoiding email, scheduler, payment, ZATCA, VAT filing, inventory, or production infrastructure behavior.
