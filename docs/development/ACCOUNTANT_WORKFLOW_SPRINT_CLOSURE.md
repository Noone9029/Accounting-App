# Accountant Workflow Sprint Closure

Date: 2026-06-03

This sprint implemented accountant-feedback workflow improvements for LedgerByte controlled beta/user-testing. It is product development for the local/beta accounting workflow surface, not production infrastructure work.

## Implemented

- Consolidated sidebar navigation into Dashboard, Sales, Purchases, Banking, Accounting, Inventory, Tax, Reports, and Settings.
- Grouped Reports navigation and the Reports landing page into financial statements, tax reports, aging, and inventory reports.
- Added a dedicated Tax workspace at `/tax` using existing VAT Return report logic for reporting-period review.
- Added a frontend VAT Return report route at `/reports/vat-return`.
- Enhanced customer and supplier detail views with ledger visibility cards, outstanding/overdue balances, transaction counts, full transaction history, and workflow/report links.
- Added purchase orders to supplier transaction history and supplier last-activity calculation without treating purchase orders as payable balances.
- Added invoice tax mode support: tax exclusive, tax inclusive, and no tax.
- Added `SalesInvoice.taxMode` with a non-destructive Prisma migration and default `TAX_EXCLUSIVE`.
- Added visible invoice-number preview for draft invoice creation using a non-reserving sequence preview endpoint.
- Kept invoice-number override disabled because the current backend numbering policy assigns numbers at draft create time and does not expose a safe override contract.
- Added searchable/grouped revenue-account selection on sales invoice lines.
- Preserved item default revenue-account and tax-rate prefill, with no-tax mode clearing tax rates.
- Added backend invoice-line account validation to reject non-tenant, inactive, non-posting, or non-revenue accounts.
- Added Chart of Accounts next-code preview by account type, auto-generated code on create, duplicate prevention, manual override validation, and manual override audit logging.

## New Or Changed API Endpoints

- `GET /sales-invoices/next-number`
  - Permission: `salesInvoices.create`.
  - Returns a non-reserving invoice-number preview and read-only policy copy.
- `GET /accounts/next-code?type=...`
  - Permission: `accounts.view`.
  - Returns the next suggested account code for the selected account type.
- Existing `POST /sales-invoices` and `PATCH /sales-invoices/:id`
  - Now accept `taxMode`.
- Existing `POST /accounts`
  - `code` is now optional; when omitted, the backend generates the next suggested code.
- Existing supplier contact detail API now includes purchase-order activity in supplier transaction history.

## New Or Changed Frontend Routes

- New `/tax`.
- New `/reports/vat-return`.
- Updated `/reports`.
- Updated `/sales/invoices/new` and sales invoice edit form.
- Updated `/accounts`.
- Updated `/customers`, `/customers/:id`, `/suppliers`, and `/suppliers/:id`.

## Migration

- `apps/api/prisma/migrations/20260603090000_accountant_workflow_sprint/migration.sql`
  - Creates `SalesInvoiceTaxMode`.
  - Adds `SalesInvoice.taxMode` with default `TAX_EXCLUSIVE`.

## Permissions And Audit

- Tax workspace uses `reports.view`.
- Tax rates remain gated by `taxRates.view/manage`.
- Account code preview uses `accounts.view`; account creation/manual override remains gated by `accounts.manage`.
- Manual Chart of Accounts code override logs `ACCOUNT_CODE_MANUAL_OVERRIDE`.
- Invoice number override was not enabled, so no invoice-number override audit event is emitted.
- Invoice line account changes remain captured in existing invoice create/update audit payloads.

## Validation

- Passed: `corepack pnpm db:generate`.
- Passed: targeted API tests for sales invoices, chart of accounts, contacts, and reports.
- Passed: targeted frontend tests for money calculations, parties, permissions/sidebar filtering, sales invoice form, and purchase-order helpers.
- Partial: `corepack pnpm typecheck` completed package and API typecheck, then failed in unrelated web marketing test files (`src/app/marketing.test.tsx`) that treat `HomePage` as `() => void`. Those unrelated dirty worktree files were not modified.

## Intentionally Skipped

- Recurring invoices.
- Quotes/proformas.
- Delivery notes.
- Live bank feeds.
- Payment gateway capture.
- Real email sending, production email scheduler, and production billing/Stripe.
- Real ZATCA CSID, signing, clearance/reporting, PDF/A-3, or network calls.
- Production hosting, Vercel/Supabase environment changes, RLS/database role changes, backup/restore, object-storage migration, or customer-data movement.
- Official VAT filing submission or external tax authority integration.

## Remaining Gaps

- Accountant browser QA is still needed across invoice create/edit, customer ledger, supplier ledger, Tax, and Reports navigation.
- Sales invoice account coding currently validates revenue posting accounts only because the posting engine credits the selected line account. Cost-of-sales posting remains part of inventory/COGS workflows, not sales invoice revenue posting.
- Supplier/customer views now surface ledger-style summaries, but statement drill-downs and row-type browser QA should be improved.
- Chart of Accounts suggestions follow current seeded ranges; accountant-reviewed templates and stronger approval rules are still needed.
- VAT Summary and VAT Return remain operational/draft views and are not official VAT filing readiness.

## Recommended Next Sprint

Run an Accountant Browser QA Sprint focused on:

- Sales invoice create/edit usability with tax modes and account coding.
- Customer and supplier ledger row-type navigation.
- Tax workspace period behavior and draft VAT wording.
- Restricted-role navigation and mutation gates.
- Chart of Accounts create/manual override flows and audit-log visibility.
