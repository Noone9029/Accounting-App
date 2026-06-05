# Sales Quote / Proforma Workflow Sprint Closure

Date: 2026-06-03

LedgerByte remains controlled beta/user-testing only. Vercel remains beta/user-testing/staging only and is not final production hosting. This sprint did not enable production launch, production ZATCA, real email, online payments, hosted data operations, or official VAT filing submission.

## What Was Implemented

- Added tenant-scoped non-posting sales quote/proforma records with `SalesQuote` and `SalesQuoteLine`.
- Added quote numbering through the existing number-sequence service with `SALES_QUOTE` scope and `QUO-000001` style defaults.
- Added `/sales-quotes` API endpoints for list, next-number preview, detail, create, edit, lifecycle actions, and conversion to a draft sales invoice.
- Added Sales navigation and frontend routes for `/sales/quotes`, `/sales/quotes/new`, `/sales/quotes/[id]`, and `/sales/quotes/[id]/edit`.
- Added a quote form that reuses invoice-entry foundations: customer selection, visible read-only document number, line descriptions, item defaults, grouped searchable revenue-account selection, tax rates, tax mode, discounts, and totals preview.
- Added quote lifecycle states: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`, and `CONVERTED`.
- Added accepted-quote conversion into a new `DRAFT` sales invoice using the existing invoice number sequence.
- Added customer transaction-history visibility for sales quotes as separate non-posting sales-pipeline activity.

## Non-Posting Boundary

- Sales quotes do not create journal entries or journal lines.
- Sales quotes do not update AR balances, customer statement balances, invoice balances, inventory, revenue, VAT payable, VAT return values, P&L, Balance Sheet, AR aging, or dashboard financial totals.
- Sales quotes do not create ZATCA metadata and do not call ZATCA signing, CSID, clearance, reporting, PDF/A-3, or network behavior.
- Converted quotes create only a draft invoice; final posting still happens through the existing invoice finalization workflow.

## Permissions And Audit

- The sprint reuses existing sales invoice permissions instead of adding a new permission family:
  - `salesInvoices.view` for quote list/detail.
  - `salesInvoices.create` for quote creation and convert-to-invoice.
  - `salesInvoices.update` for quote edits and lifecycle transitions.
- New audit events cover quote create, update, mark sent, accept, reject, expire, cancel, and convert-to-invoice.
- Audit metadata stays compact and does not include PDF bodies, auth headers, tokens, secrets, or full customer-sensitive payload bodies.

## Tax Mode Behavior

- Quote totals use the same calculation behavior as sales invoices:
  - Tax exclusive: entered line values exclude tax and tax is added on top.
  - Tax inclusive: entered line values include tax and the tax portion is extracted.
  - No tax: line tax is cleared and no tax amount is calculated.
- Backend validation rejects invalid tax modes, invalid or cross-tenant tax rates, invalid/system/non-posting revenue accounts, empty lines, invalid quantities/prices, and expiry dates before issue dates.

## Conversion Behavior

- `ACCEPTED` quotes can convert into a draft sales invoice.
- Rejected, cancelled, expired, draft, sent, and already converted quotes cannot be converted.
- Conversion copies customer, branch, reference, currency, tax mode, notes, terms, line descriptions, item IDs, quantities, prices, discounts, selected revenue accounts, and tax rates.
- The draft invoice receives a new invoice number from the existing invoice sequence and is not finalized automatically.
- The quote becomes `CONVERTED` and stores the converted invoice reference.

## What Was Not Implemented

- Quote/proforma PDF rendering and generated-document archive were intentionally skipped because the safe minimum product flow can ship without exposing a broken or misleading download action.
- Real customer email sending, quote online acceptance, payment capture, recurring invoices, delivery notes, collections automation, live bank feeds, production hosting, object-storage migrations, real ZATCA, and official VAT filing were not implemented.

## Validation Results

- `corepack pnpm db:generate` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-quotes/sales-quote-rules.spec.ts src/sales-quotes/sales-quote.controller.spec.ts src/number-sequences/number-sequence.service.spec.ts src/contacts/contact.service.spec.ts` passed.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=sales-quote-form.test.tsx` passed from `apps/web`.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=quotes` passed from `apps/web`.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=permissions.test.ts` passed from `apps/web`.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=parties.test.ts` passed from `apps/web`.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=money.test.ts` passed from `apps/web`.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work in `apps/web/src/app/marketing.test.tsx`, where `HomePage` is currently typed as `() => void`.

## Remaining Gaps

- Follow-up 2026-06-04: quote/proforma PDF/export/archive was implemented in `docs/development/QUOTE_PDF_ARCHIVE_SPRINT_CLOSURE.md` with safe Sales Quote wording and generated-document archive support.
- Add broader browser QA for the quote workflow after the unrelated marketing typecheck blocker is resolved or separated.
- Add real customer email sending, online quote acceptance, delivery notes, recurring invoices, and payment collection only as separate reviewed sprints.
- Keep accountant review focused on quote wording, lifecycle policy, account coding defaults, and conversion behavior before widening beta claims.
