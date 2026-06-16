# UI Report Drilldown Dense Entry Visual QA Sprint Closure

Date: 2026-06-16

Branch: `feature/ui-report-drilldown-dense-entry-visual-qa`

## Base And Merge Context

- PR `#58` (`Add refund collections banking visual polish`) was reverified and merged into `main` first.
- Latest `main` after PR `#58` merge: `643cc62dacb764d61e4f0acd7b99e51c4a43c502`.
- This branch was created fresh from updated `origin/main`.
- The original ZATCA request-body stash remained preserved and was not restored, dropped, overwritten, or mixed into this work.
- `codex/purchase-bill-seeded-uuid-validation` was left untouched.

## Scope

This was a frontend visual QA, fixture realism, and small route polish sprint only.

Changed scope:

- Local/test-only visual fixtures for report drilldowns, VAT review states, aged report rows, manual journals, statements, document archive rows, and audit-log rows.
- New authenticated Playwright visual QA matrix for report and dense-entry routes.
- Permission-gating polish for report export controls and report guide create/payment links.
- Status, readiness, roadmap, audit, handoff, and closure documentation.

Unchanged scope:

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed/reset/delete.
- No production auth provider changes.
- No payment/accounting/business logic changes.
- No report calculation logic changes.
- No journal posting logic changes.
- No UAE PINT-AE changes.
- No ZATCA changes.
- No provider integration changes.
- No hosted/customer-data mutation.
- No Vercel/Supabase commands.
- No production infrastructure commands.
- No production compliance claims.
- No fake automation, fake bank feed, fake AI, fake provider connectivity, fake report export success, or report certification claims.

## Fixture Approach

Report fixtures use existing app route contracts, labels, and report vocabulary only.

Profit & Loss checked:

- Multi-section income and expense hierarchy.
- Zero-value rows.
- Negative adjustment rows.
- Long account names.
- Large totals.

Balance Sheet checked:

- Assets, liabilities, and equity hierarchy.
- Negative balance rows.
- Long account names.
- Retained earnings and totals rows.

Trial Balance checked:

- Many account rows.
- Debit and credit columns.
- Zero-balance account.
- Long account code/name rows.
- Balanced totals.

General Ledger checked:

- Many transaction rows.
- Long descriptions.
- Debit, credit, and running balance columns.
- Opening balance and closing balance.
- Source reference style rows already supported by the UI.

VAT report routes checked:

- VAT Summary route for taxable sales, taxable purchases, input VAT, output VAT, adjustments, zero VAT rows, and conservative internal-review wording.
- VAT Return route for finalized source-document review, output/input VAT, net payable/refundable context, internal draft review CSV wording, and source-document rows.

Aged reports checked:

- Aged Receivables and Aged Payables current, `1-30`, `31-60`, `61-90`, and `90+` buckets.
- Large overdue amounts.
- Long customer and supplier names.
- Zero-balance customer and supplier rows.

Dense-entry fixtures checked:

- Manual journals with draft, posted, reversed, large amount, and zero-balance rows.
- Bank statement transaction review rows.
- Customer and supplier statement rows with opening balance, invoice/bill rows, payment rows, credit/debit note rows, and closing balances.
- Customer and supplier transaction workspace tables.
- Invoice and bill line-item/payment-allocation tables.
- Document archive rows.
- Audit log rows with long actors, timestamps, entity identifiers, and long descriptions.

## Routes Checked

Report routes:

- `/reports`
- `/reports/profit-and-loss`
- `/reports/balance-sheet`
- `/reports/trial-balance`
- `/reports/general-ledger`
- `/reports/vat-summary`
- `/reports/vat-return`
- `/reports/aged-receivables`
- `/reports/aged-payables`

Dense-entry routes:

- `/journal-entries`
- `/bank-accounts/bank-1/statement-transactions`
- `/customers/customer-long/statement`
- `/suppliers/supplier-long/statement`
- `/customers/customer-long`
- `/suppliers/supplier-long`
- `/sales/invoices/invoice-partially-paid`
- `/purchases/bills/bill-partially-paid`
- `/documents`
- `/settings/audit-logs`

Skipped routes because they do not exist:

- `/reports/vat`
- `/reports/cash-flow`
- `/reports/customer-statement`
- `/reports/supplier-statement`
- `/reports/audit-log`

Existing `/reports/vat-summary`, `/reports/vat-return`, customer/supplier statement routes, and `/settings/audit-logs` were covered instead.

## Roles And Viewports

Roles checked:

- `Owner`
- `Accountant`
- `Viewer`

Viewports checked:

- Desktop `1440x1000`
- Tablet `1024x768`
- Mobile `390x844`

## Findings Fixed

- Report export controls now require `reports.export`; document-download permission alone no longer exposes report export UI.
- VAT Return review create links now respect sales-invoice and purchase-bill create permissions.
- Aged report guide create/payment links now respect invoice, bill, customer-payment, and supplier-payment create permissions.
- The report unit-test permission mock now includes the existing `can` provider shape, matching the app permission contract.
- Visual fixture route ordering now handles audit-log retention endpoints before generic audit-log detail matching.
- Visual assertions now handle statement load buttons and routes with mixed table and empty-state surfaces without weakening document-overflow, table-readability, or forbidden-claim checks.

## Artifacts

- Screenshots and `visual-results.json` were generated under `artifacts/visual-qa/report-drilldown-dense-entry-visual-qa/`.
- Generated artifact contents: `147` PNG screenshots and `visual-results.json`.
- Screenshots and large visual artifacts are intentionally not committed because `artifacts/` is ignored.

## Verification

Passed:

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/report-drilldown-dense-entry-visual-qa.visual.spec.ts --reporter=line` - `147 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- sidebar` - `3 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard` - `22 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- invoices` - `12 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- bills` - `8 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- customer-payments` - `32 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- supplier-payments` - `12 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- financial-flow-scene` - `1 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- report-pages` - `13 passed` after the permission mock fix.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web build` - passed.
- `corepack pnpm verify:diff` - passed.
- `corepack pnpm verify:ci:local` - final run passed.

Notes:

- The first `verify:ci:local` run failed in `apps/web/src/components/reports/report-pages.test.tsx` because the report unit-test mock omitted `can`; the component already used the real provider contract. The mock was fixed and the final gate passed.
- Existing React `act(...)` warnings appeared in focused sidebar/report Jest output, but the suites passed.

## Forbidden-Claim Scan

The forbidden-claim scan over touched frontend source, fixture data, and generated `visual-results.json` must remain clean for:

- `FTA certified`
- `Peppol certified`
- `accredited ASP`
- `official UAE provider`
- `production compliant`
- `ZATCA certified`
- `real ASP validation`
- `FTA reporting enabled`
- `live bank feed connected`
- `automatic reconciliation enabled`
- `real bank sync enabled`
- `official VAT approval`
- `certified VAT report`

## Skipped Commands

- No hosted E2E.
- No smoke against hosted environments.
- No seed/reset/delete.
- No migrations.
- No real ASP calls.
- No real ZATCA calls.
- No real email.
- No Vercel/Supabase commands.
- No production infrastructure commands.

## Remaining Scope

- Secondary operational route polish and visual QA.
- Dense entry-form ergonomics beyond the checked report/ledger screens.
- Real report export implementation review only if real export behavior is implemented.
- Accountant sign-off on final report wording and table-density ergonomics.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
