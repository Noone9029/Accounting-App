# Quote PDF / Archive Sprint Closure

Date: 2026-06-04

LedgerByte remains controlled beta/user-testing only. Vercel remains beta/user-testing/staging only and is not final production hosting. This sprint did not enable production launch, production ZATCA, real email, online payments, hosted data operations, customer-data movement, PDF/A-3, or official VAT filing submission.

## What Was Implemented

- Added `DocumentType.SALES_QUOTE` for generated-document archive records.
- Added a safe `renderSalesQuotePdf` renderer in `@ledgerbyte/pdf-core`.
- Added quote PDF data, generate/download, and archive behavior to the Sales Quote API.
- Added `GET /sales-quotes/:id/pdf-data`, `GET /sales-quotes/:id/pdf`, and `POST /sales-quotes/:id/generate-pdf`.
- Updated the quote detail page with a permission-aware "Download sales quote PDF" action and a sales quote PDF archive panel.
- Added archive metadata visibility for generated sales quote PDFs where the user has generated-document view permission.
- Added targeted backend and frontend tests for quote PDF generation, archive behavior, permissions, tenant scoping, no side effects, PDF labels, and UI wording.

## PDF Title And Wording Policy

- The PDF title is always `Sales Quote`.
- The PDF does not use `Tax Invoice`, `Posted invoice`, `Finalized invoice`, `VAT filed`, `ZATCA compliant`, `Cleared`, `Reported`, `PDF/A-3`, `Email sent`, `Customer paid`, or AR-balance language.
- The PDF includes this safe wording:
  - `This sales quote is non-posting and does not create accounting journals, accounts receivable, VAT filing, or ZATCA submission.`
- Quote metadata includes quote number, status, issue date, expiry date, reference, currency, tax mode, customer details, line items, subtotal, tax, total, notes, terms, and converted draft invoice reference when applicable.

## Archive Behavior

- Direct quote PDF generation/download archives a generated-document row with:
  - `documentType=SALES_QUOTE`
  - `sourceType=SalesQuote`
  - `sourceId=<quote id>`
  - `documentNumber=<quote number>`
- This follows the existing append-only generated-document generation pattern used by operational PDFs.
- Downloading an already archived generated-document row through `/generated-documents/:id/download` does not create another archive row.
- PDF bodies/base64 are not logged or printed by tests.

## Permission Behavior

- Quote PDF data requires quote view permission through `salesInvoices.view`.
- Quote PDF generation/download requires quote view permission plus the existing generated-document download permission.
- Generated-document archive metadata uses the existing generated-document view permission.
- No restricted mutation access was added.

## Audit Behavior

- Added `SALES_QUOTE_PDF_GENERATED`.
- Quote PDF generation logs compact metadata: quote ID, quote number, status, generated document ID, filename, content type, and converted invoice ID when applicable.
- Existing generated-document archive creation still logs the generated-document create event.
- No PDF body, base64, auth header, token, secret, customer-sensitive payload body, signed XML, or QR payload is included in audit metadata.

## What Does Not Happen

- No journal entries or journal lines are created.
- No AR balance, invoice balance, customer statement balance, or aging balance is changed.
- No VAT filing, VAT Return, or VAT Summary value is changed.
- No ZATCA metadata, CSID, signing, clearance, reporting, PDF/A-3, or network call is created.
- No inventory movement, email delivery, payment link, payment capture, or online acceptance is created.

## Validation Results

- `corepack pnpm db:generate` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-quotes/sales-quote-rules.spec.ts src/sales-quotes/sales-quote.controller.spec.ts src/generated-documents/generated-document-rules.spec.ts src/generated-documents/generated-document-permissions.spec.ts` passed.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=pdf-download.test.ts` passed from `apps/web`.
- `corepack pnpm exec jest --config jest.config.cjs --testPathPatterns=quotes` passed from `apps/web`.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work in `apps/web/src/app/marketing.test.tsx`, where `HomePage` is currently typed as `() => void`.

## Remaining Gaps

- Follow-up on 2026-06-04: focused mocked browser coverage for quote PDF generation/download/archive visibility is now captured in `docs/development/QUOTE_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`. Broader deployed E2E, full visual coverage, and accountant review remain open.
- Online quote acceptance, customer email sending, delivery notes, recurring invoices, collections automation, payment links, and payment gateway capture remain separate sprints.
- Generated-document object storage, signed URLs, lifecycle policy, legal hold, malware scanning, backup/restore proof, and production storage validation remain production-foundation work.
- Accountant review should still inspect final quote PDF wording and layout before widening beta claims.

## Recommended Next Sprint

Run a focused Accountant Browser QA Sprint for sales quote and invoice workflows:

- Quote PDF generation/download and archive visibility.
- Quote lifecycle and conversion to draft invoice.
- Invoice create/edit tax modes and account coding.
- Restricted-role quote, invoice, and generated-document gates.
- Customer ledger non-posting quote activity.
