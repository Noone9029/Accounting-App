# UI Detail States Accountant Mobile Table Review Sprint Closure

Date: 2026-06-16

Branch: `feature/ui-detail-states-accountant-mobile-table-review`

Base: `origin/main` at `2467a195951a351db0c5b238eab5880ff8da2971` after PR `#56` (`Add role-filtered UI visual QA route polish`) was merged.

## Scope

- Added local authenticated visual QA for realistic detail-page states.
- Added accountant role mobile/table visual review for dense operational screens.
- Kept the branch frontend/test/docs only.
- Did not redesign the app or add production features.

## Safety Boundaries

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed, reset, delete, or hosted/customer-data mutation.
- No real auth provider changes.
- No payment, accounting, posting, allocation, tax, or business logic changes.
- No UAE PINT-AE changes.
- No ZATCA changes.
- No provider integration changes.
- No real ASP calls.
- No real email.
- No Vercel or Supabase commands.
- No production infrastructure commands.
- No production compliance claims.
- No fake automation, fake bank feeds, fake AI, or fake provider connectivity.

## Fixture Approach

The visual fixture remains local/test-only and read-only. It uses mocked API responses to exercise existing frontend routes and supported labels without real auth, database, hosted data, provider, ASP, email, UAE PINT-AE, or ZATCA calls.

Checked detail states:

- Sales invoice: draft, finalized/awaiting payment, partially paid, paid, overdue, voided.
- Purchase bill: draft, finalized/awaiting payment, partially paid, paid, overdue, voided.
- Customer payment: allocated, partially allocated, unallocated/overpayment.
- Supplier payment: allocated, partially allocated, unallocated/overpayment.
- Credit note: draft, finalized, applied, unapplied.
- Debit note: draft, finalized, applied, unapplied.
- Customer detail: active with open balance, active with no transactions, inactive/archived, long name/address/contact fields.
- Supplier detail: active with open balance, active with no transactions, inactive/archived, long name/address/contact fields.

Skipped or modeled carefully:

- A separate cancelled invoice/bill state was skipped because the current frontend status vocabulary supports `VOIDED`; no new production status was invented.
- Paid, overdue, awaiting-payment, and partial states are modeled with existing status, balance, due-date, and allocation fields rather than new backend behavior.

## Accountant Mobile Table Review

Checked dense accountant surfaces:

- Invoice line items table.
- Bill line items table.
- Customer payment allocation table.
- Supplier payment allocation table.
- Customer transactions table.
- Supplier transactions table.
- Aged receivables report.
- Aged payables report.
- General Ledger report.
- Trial Balance report.
- Bank transactions table.
- Documents table.

Mobile `390x844` checks verify no document-level horizontal overflow, readable table/card conversion, visible money/status values, accessible document links, visible totals or clear empty states, usable filters, and non-overlapping actions.

Tablet `1024x768` checks verify usable tables, accessible filters, non-overlapping summary areas, and stable action bars.

## Roles And Routes

Role profiles covered by this branch:

- `Owner` for the detail-state matrix.
- `Accountant` for accountant mobile/table and role route review.

PR `#56` already established role-filtered baseline coverage for `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer` create-menu behavior and `Owner`/`Viewer` route access.

Accountant routes checked:

- `/dashboard`
- `/sales/invoices`
- `/sales/invoices/new`
- `/purchases/bills`
- `/purchases/bills/new`
- `/customers/customer-1`
- `/suppliers/supplier-1`
- `/sales/customer-payments`
- `/purchases/supplier-payments`
- `/sales/credit-notes`
- `/purchases/debit-notes`
- `/reports`
- `/bank-accounts`
- `/documents`

Detail routes checked:

- `/sales/invoices/invoice-draft`
- `/sales/invoices/invoice-awaiting-payment`
- `/sales/invoices/invoice-partially-paid`
- `/sales/invoices/invoice-paid`
- `/sales/invoices/invoice-overdue`
- `/sales/invoices/invoice-voided`
- `/purchases/bills/bill-draft`
- `/purchases/bills/bill-awaiting-payment`
- `/purchases/bills/bill-partially-paid`
- `/purchases/bills/bill-paid`
- `/purchases/bills/bill-overdue`
- `/purchases/bills/bill-voided`
- `/sales/customer-payments/payment-allocated`
- `/sales/customer-payments/payment-partially-allocated`
- `/sales/customer-payments/payment-unallocated`
- `/purchases/supplier-payments/supplier-payment-allocated`
- `/purchases/supplier-payments/supplier-payment-partially-allocated`
- `/purchases/supplier-payments/supplier-payment-unallocated`
- `/sales/credit-notes/credit-note-draft`
- `/sales/credit-notes/credit-note-finalized`
- `/sales/credit-notes/credit-note-applied`
- `/sales/credit-notes/credit-note-unapplied`
- `/purchases/debit-notes/debit-note-draft`
- `/purchases/debit-notes/debit-note-finalized`
- `/purchases/debit-notes/debit-note-applied`
- `/purchases/debit-notes/debit-note-unapplied`
- `/customers/customer-1`
- `/customers/customer-empty`
- `/customers/customer-inactive`
- `/customers/customer-long`
- `/suppliers/supplier-1`
- `/suppliers/supplier-empty`
- `/suppliers/supplier-inactive`
- `/suppliers/supplier-long`

## Viewports

- Detail states: desktop `1440x1000`, tablet `1024x768`, mobile `390x844`.
- Accountant table review: tablet `1024x768`, mobile `390x844`.
- Accountant role review: tablet `1024x768`, mobile `390x844`.

## Visual Artifacts

- Artifact directory: `artifacts/visual-qa/detail-states-accountant-mobile-table-review/`.
- Screenshots: 154 PNG files.
- Report: `artifacts/visual-qa/detail-states-accountant-mobile-table-review/visual-results.json`.
- Screenshots and report output are intentionally not committed because `artifacts/` is ignored.

## Issues Found And Fixed

- Added ID-aware local fixture detail records so detail pages render the intended state instead of a single static record.
- Kept `/sales-invoices/open` and `/purchase-bills/open` list fixtures ahead of dynamic detail matchers.
- Corrected aged receivable/payable bucket keys to the frontend-supported report bucket enum.
- Added read-only General Ledger and Trial Balance report fixtures for accountant table review.
- Removed duplicate visual payment IDs from local payment list fixtures.
- Calibrated table readability assertions to the current mix of table, card, and empty-state surfaces.
- No app UI source layout or permission defect required a frontend source change after the matrix passed.

## Verification

Primary visual command:

```powershell
corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/detail-states-accountant-mobile-table-review.visual.spec.ts --reporter=line
```

Result: `154 passed`.

Final branch verification commands are recorded in the PR and handoff after the full verification pass.

## Evidence Limits

- Provider evidence is still unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- This work does not prove production readiness, hosted/customer-data behavior, legal compliance, provider connectivity, UAE PINT-AE production behavior, or ZATCA production behavior.

## Remaining Scope

- Refund, collections, and banking detail visual polish.
- Report drilldown and export-readability review.
- Dense entry-form accountant review.
- Secondary operational route migration and mobile edge-state checks.
