# Recurring Invoices Sprint Closure

Date: 2026-06-04

## What Was Implemented

- Added non-posting recurring invoice template models and API support.
- Added visible recurring template numbering using the existing number-sequence architecture with `REC-000001` style defaults.
- Added recurring template create, edit, list, detail, schedule preview, lifecycle actions, and manual `generate-now` workflow.
- Added account-coded template lines using the same active posting revenue-account validation as sales invoices and sales quotes.
- Added tax exclusive, tax inclusive, and no-tax template totals using `calculateSalesInvoiceTotals`.
- Added customer ledger visibility for recurring templates as separate non-posting activity with zero AR balance impact.
- Added Sales navigation, global create/search entries, and customer transaction menu integration.
- Added targeted backend and frontend tests for recurring rules, permissions, calculations, schedule preview, generation, and UI behavior.

## Schedule / Frequency Behavior

- Supported MVP frequencies: weekly, monthly, quarterly, and yearly.
- Each template has an interval, start date, optional end date, next run date, last run date, and payment terms in days.
- Schedule preview returns the next invoice date, due date, period covered, blockers, and the next six occurrence dates when available.
- Month-end schedules clamp safely to the target month end.
- This sprint does not add a background scheduler, worker, queue, cron job, automatic generation, or automatic email delivery.

## Manual Generation Behavior

- Users must explicitly click `Generate invoice now`.
- Generation is allowed only for `ACTIVE` templates.
- Generation creates a `DRAFT` sales invoice only.
- The generated invoice uses the normal sales invoice number sequence.
- The generated invoice stores a source recurring template reference.
- A `RecurringInvoiceRun` row records run date, invoice date, due date, period covered, generated invoice ID, and actor.
- Duplicate generation for the same template run date is blocked.
- After generation, `lastRunDate` is updated and `nextRunDate` advances. If the next run would exceed `endDate`, the template is marked `ENDED`.

## Non-Posting Boundaries

Recurring invoice templates do not:

- Create journals or journal lines.
- Affect AR, revenue, VAT, inventory, customer statement balances, or aging reports.
- Generate PDFs or generated-document archive records.
- Send email.
- Create payment links or capture payments.
- Call ZATCA signing, clearance, reporting, PDF/A-3, or network flows.
- Claim official VAT filing readiness.

Generated draft invoices remain drafts until the existing sales invoice finalization workflow is used.

## Permissions

- View/list/detail/preview: `salesInvoices.view`.
- Create templates and manually generate draft invoices: `salesInvoices.create`.
- Edit/activate/pause/resume/end/cancel: `salesInvoices.update`.
- No new permission strings or role grants were added.

## Audit Behavior

Added standardized audit mappings for:

- `RecurringInvoiceTemplate:CREATE`
- `RecurringInvoiceTemplate:UPDATE`
- `RecurringInvoiceTemplate:ACTIVATE`
- `RecurringInvoiceTemplate:PAUSE`
- `RecurringInvoiceTemplate:RESUME`
- `RecurringInvoiceTemplate:END`
- `RecurringInvoiceTemplate:CANCEL`
- `RecurringInvoiceTemplate:GENERATE_INVOICE`

Manual generation audit metadata includes the template, generated draft invoice, run ID, previous run date, and next run date. It does not include full request bodies, secrets, auth headers, PDF/base64 content, ZATCA XML, QR payloads, or provider credentials.

## Validation Results

- `corepack pnpm db:generate` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- recurring-invoice number-sequence contact.service sales-invoice-rules` passed: 6 suites, 70 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- recurring-invoice permissions parties` passed: 5 suites, 25 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work: `apps/web/src/app/marketing.test.tsx` reports `HomePage` as `() => void`.

## Marketing Typecheck Blocker

The unrelated untracked marketing files remain present and were not modified. The recurring invoices sprint did not delete, rewrite, or mix marketing work into this feature branch.

## What Was Intentionally Skipped

- Automatic background invoice scheduler.
- BullMQ/Redis worker or cron automation.
- Customer email sending.
- Payment links or payment gateway capture.
- Delivery notes.
- Collections automation.
- Real ZATCA, PDF/A-3, clearance, reporting, or network calls.
- Official VAT filing submission.
- Production hosting, Vercel/Supabase environment changes, RLS/runtime DB role changes, object-storage migration execution, backup/restore execution, and hosted/customer-data checks.
- Broad browser E2E.

## Remaining Gaps

- No automatic recurring invoice scheduler.
- Focused mocked browser coverage for the base recurring template workflow was added in `docs/development/RECURRING_INVOICE_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`; broader deployed E2E with safe seeded data remains open.
- No email delivery, payment collection, or customer portal.
- No recurring invoice PDF output because templates are not customer-facing documents in this sprint.
- No delivery notes.
- No hosted/customer-data proof.
- Accountant review and production readiness remain open.

## Recommended Next Sprint

Run a Delivery Notes Sprint for the next bounded Sales/AR workflow, or an Accountant Wording Review Sprint across invoices, quotes, recurring templates, customer activity, and reports before broader beta use.
