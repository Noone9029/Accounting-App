# Quote Browser Workflow Sprint Closure

Date: 2026-06-04

LedgerByte remains controlled beta/user-testing only. Vercel remains beta/user-testing/staging only and is not final production hosting. This sprint did not enable production launch, production ZATCA, real email, online payments, hosted data operations, customer-data movement, PDF/A-3, or official VAT filing submission.

## What Browser Workflow Was Covered

- Added focused mocked Playwright browser coverage at `tests/visual/quote-workflow.visual.spec.ts`.
- Covered `/sales/quotes`, `/sales/quotes/new`, `/sales/quotes/[id]`, `/sales/quotes/[id]/edit`, the converted draft sales invoice detail route, customer quote activity, and generated-document archive metadata/download paths.
- Used fake customer, item, revenue account, tax-rate, quote, invoice, PDF, and generated-document data only.
- Used the existing visual test server and mocked API pattern instead of mutating local, hosted, beta, or production data.

## Positive Quote Workflow Verified

- Open quote list and start a new quote.
- Select a customer and item.
- Confirm item defaults prefill description, revenue account, and tax rate.
- Search and select a valid posting revenue account.
- Verify tax exclusive, tax inclusive, and no-tax totals in the UI.
- Save a draft quote.
- Open quote detail, edit the draft, mark sent, and accept.
- Generate/download a Sales Quote PDF and verify safe response metadata without printing PDF content.
- Show generated-document archive metadata and download the archived PDF without creating a duplicate archive row.
- Convert the accepted quote into a draft sales invoice.
- Confirm the converted quote links to the draft invoice and the invoice remains draft.
- Confirm the customer detail page shows the quote as non-posting sales activity without increasing outstanding AR balance.

## Negative And Permission Coverage

- Restricted users without create/update/download permissions do not see create, edit, convert, or quote PDF download actions.
- Restricted users with generated-document view but without download permission can see safe archive metadata but cannot download the quote PDF.
- DRAFT, SENT, REJECTED, EXPIRED, CANCELLED, and CONVERTED states do not expose conversion when backend rules would block it.
- Terminal statuses hide normal edit and lifecycle mutation actions.
- Quote UI text is asserted to avoid unsafe claims such as tax invoice, posted invoice, finalized invoice, ZATCA compliant, PDF/A-3, email sent, or customer paid.

## Calculation Behavior Verified

- Tax exclusive with 15% VAT displays VAT on top of the entered line amount.
- Tax inclusive with 15% VAT extracts the VAT portion from the entered amount.
- No tax mode disables the tax-rate selector and displays zero tax.
- Account selection remains visible on create, detail, and edit paths in the mocked workflow.
- Detail totals remain consistent with the saved quote payload.

## Quote Defects Found And Fixed

- No product code defects were found in the focused mocked browser workflow.
- Test-only hardening was needed for selectors and safe-label assertions:
  - The account label matched both the visible selected value and the search input, so the browser test now uses an exact label assertion for the selected account.
  - The safe-label assertion now allows explicit negative wording such as "not tax invoices" while still rejecting unsafe positive claims.
  - Customer activity assertions now target the visible heading and table cell precisely.

## PDF And Archive Behavior Verified

- The quote PDF action uses Sales Quote wording, not invoice wording.
- Direct quote PDF download returns `application/pdf` with nonzero content length in the mocked browser path.
- Generated-document archive metadata displays `sales-quote-QUO-BRW-001.pdf` with a Sales Quote label.
- Downloading the archived generated document uses the generated-document path and does not create a duplicate archive row in the mocked policy.
- No PDF body, base64, auth header, cookie, token, secret, signed XML, QR payload, or customer-sensitive body is printed by the test.

## What Remains Non-Posting

- Quote create, PDF generation, archive download, and conversion browser checks do not create journal entries or journal lines.
- Quotes remain outside AR balances, customer statement balances, aging, VAT Summary, VAT Return, dashboard financial totals, inventory movements, email delivery, payment capture, and ZATCA behavior.
- Conversion creates a draft invoice only; it does not finalize, post, submit, clear, report, email, or collect payment.

## Validation Results

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/quote-workflow.visual.spec.ts` passed: 3 tests.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=sales-quote-form.test.tsx` passed from `apps/web`: 5 tests.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=quotes` passed from `apps/web`: 3 tests.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=pdf-download.test.ts` passed from `apps/web`: 5 tests.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-quotes/sales-quote-rules.spec.ts src/sales-quotes/sales-quote.controller.spec.ts` passed: 14 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work in `apps/web/src/app/marketing.test.tsx`, where `HomePage` is currently typed as `() => void`.

## Marketing Typecheck Blocker

- `apps/web/src/app/marketing.test.tsx` remains untracked and unrelated to this quote sprint.
- The file was not modified or deleted.
- Repo-wide web typecheck remains blocked by the unrelated marketing test until that work is corrected or removed by its owner.

## What Was Intentionally Skipped

- No production commands, hosted/beta migrations, seed/reset/delete, deployed E2E, real email, real ZATCA, backup/restore, object-storage migration, payment gateway, live bank feed, or customer-data checks were run.
- No online quote acceptance, customer email sending, payment link, delivery note, recurring invoice, PDF/A-3, or official VAT filing behavior was added.
- No broad navigation redesign, marketing work, dashboard/report/settings polish, or global route QA was included.
- No live database browser E2E was run because this sprint used mocked browser fixtures to keep the workflow focused and avoid data mutation.

## Remaining Quote/Proforma Gaps

- Broader deployed/non-production E2E with safe seeded data remains open.
- Accountant review of final quote PDF wording and quote workflow terminology remains open.
- Online quote acceptance, customer email delivery, reminders, payment links, delivery notes, recurring invoices, and collections automation remain separate future sprints.
- Generated-document object storage, signed URLs, lifecycle policy, legal hold, malware scanning, backup/restore proof, and production storage validation remain production-foundation work.

## Recommended Next Sprint

Run a bounded Sales/AR accountant review or recurring invoice sprint:

- If prioritizing readiness, run an accountant-reviewed quote/invoice wording and workflow review using sanitized browser recordings and sample PDFs.
- If prioritizing product capability, add recurring invoices as a separate non-email, draft-generation workflow with explicit posting and approval rules.
