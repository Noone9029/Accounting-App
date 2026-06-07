# Focused Recurring Invoice Browser Workflow Sprint Closure

Date: 2026-06-04

## What Browser Workflow Was Covered

- Added focused mocked Playwright browser coverage for `/sales/recurring-invoices`, `/sales/recurring-invoices/new`, `/sales/recurring-invoices/:id`, `/sales/recurring-invoices/:id/edit`, generated draft invoice detail, and customer recurring-template activity.
- Covered the positive path: list, global create/search exposure, new template, customer selection, account-coded line, tax exclusive/inclusive/no-tax totals, weekly/monthly/quarterly/yearly schedule preview, save draft, edit draft, activate, pause, resume, generate now, generated draft invoice link, generation history, updated run dates, and customer non-posting activity.
- Covered restricted-role behavior for create, edit, lifecycle actions, and manual generation.
- Covered blocked states for draft, paused, ended, cancelled, and duplicate generation for the same run date.

## Defects Found And Fixed

- The recurring invoice form did not give enough browser-visible schedule confidence while accountants were entering dates. Added a frontend schedule-preview panel that shows next invoice date, due date, period covered, next occurrences, and blockers without mutating data.
- The recurring invoice detail page did not surface `lastRunDate` clearly after manual generation. Added a visible `Last run` summary field.
- No backend lifecycle, generation, tenant-scoping, permission, posting, VAT, AR, email, payment, or ZATCA defects were found in this browser sprint.

## What Was Verified

- Recurring templates remain non-posting.
- Manual generation creates a linked `DRAFT` sales invoice only.
- Generated invoices are not finalized or posted automatically.
- Duplicate generate-now attempts for the same run date are blocked.
- Customer recurring-template activity is displayed separately as non-posting and does not increase outstanding AR.
- Global create/search labels say recurring invoice template/workflow, not posted invoice or automatic scheduler.
- UI copy does not imply automatic scheduling, email sending, payment collection, journal posting, VAT filing, ZATCA clearance/reporting, or PDF/A-3.

## Permission Behavior

- Users with `salesInvoices.view` can view recurring templates.
- Users without `salesInvoices.create` cannot create templates or generate draft invoices.
- Users without `salesInvoices.update` cannot edit or run lifecycle actions.
- Global create hides the recurring invoice template link when invoice-create permission is missing.
- Global search hides recurring invoice results when invoice-view permission is missing.

## Schedule And Calculation Behavior

- Browser coverage verifies monthly, weekly, quarterly, and yearly schedule preview display.
- Payment terms due-date preview is visible.
- Next-run and last-run display updates after manual generation.
- UI-level calculations cover tax exclusive with 15% VAT, tax inclusive with 15% VAT, and no-tax mode.
- Account selection remains visible and persisted after save/edit.
- Generated draft invoice totals match the template preview path in the mocked browser flow.

## What Was Intentionally Skipped

- Automatic background scheduler, cron, BullMQ, Redis worker, or queue processing.
- Customer email sending, payment links, payment capture, collections automation, online acceptance, or delivery notes.
- Real ZATCA, PDF/A-3, official VAT filing, customer-data checks, hosted checks, production infrastructure, Vercel/Supabase changes, RLS/runtime DB role changes, object-storage migration, backup/restore, seed/reset/delete, or deployed E2E.

## Validation Results

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/recurring-invoice-workflow.visual.spec.ts` passed with a fresh local dev server: 3 tests passed.
- `corepack pnpm --filter @ledgerbyte/web test -- recurring-invoice global-create-menu global-search permissions parties` passed: 8 suites, 41 tests.
- `corepack pnpm --filter @ledgerbyte/api test -- recurring-invoice sales-invoice-rules` passed: 3 suites, 49 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work: `apps/web/src/app/marketing.test.tsx` reports `HomePage` as `() => void`.

## Marketing Typecheck Blocker

- `apps/web/src/app/marketing.test.tsx` is still untracked and unrelated to recurring invoices.
- The marketing files were not modified, deleted, staged, or mixed into this sprint.

## Remaining Recurring Invoice Gaps

- No automatic scheduler or worker.
- No customer email delivery or payment collection.
- No delivery notes.
- No deployed E2E with safe seeded data.
- No hosted/customer-data proof.
- Accountant review and production readiness remain open.

## Recommended Next Sprint

Run a Delivery Notes Sprint for Sales/Inventory handoff, or an Accountant Wording Review Sprint across invoices, quotes, recurring templates, customer activity, and reports before broader beta use.
