# Frontend Redesign Evidence

Date: 2026-06-22

Branch: `codex/ui-redesign-recurring-invoices`

Base: stacked on `origin/codex/ui-redesign-delivery-notes` while PR #153 is open

## Evidence Summary

| Area | Evidence |
| --- | --- |
| UI system | `apps/web/src/components/ui/ledger-system.tsx` adds shared layout, table, form, state, workflow, summary, and review primitives. |
| UI system tests | `apps/web/src/components/ui/ledger-system.test.tsx` covers the new semantic roles and rendering contracts. |
| Settings overview | `apps/web/src/app/(app)/settings/page.tsx` now renders a grouped admin overview instead of redirecting. |
| Settings route test | `apps/web/src/app/(app)/route-load-verification.test.tsx` verifies `/settings` loads and links to existing settings routes. |
| Documents archive | `apps/web/src/app/(app)/documents/page.tsx` uses shared page, filter, table, and empty-state primitives while preserving local archive behavior. |
| Report packs | `apps/web/src/app/(app)/report-packs/page.tsx` uses shared preview, metric, table, and disabled-boundary primitives while preserving read-only behavior. |
| Product docs | `docs/product/LEDGERBYTE_FRONTEND_REDESIGN_SYSTEM.md` and `docs/product/LEDGERBYTE_FRONTEND_REDESIGN.md` capture the shared system, adopted routes, boundaries, and remaining route families. |
| Route-family checklist | `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md` now tracks every major frontend family, inspected routes, migration state, tests, visual/mobile/accessibility notes, permissions, and remaining gaps. |
| Sales list loop | `apps/web/src/app/(app)/sales/invoices/page.tsx` and `apps/web/src/app/(app)/sales/quotes/page.tsx` use shared LedgerByte layout, filter, table, date, money, status, summary, and empty-state primitives while preserving invoice posting and non-posting quote truth. |
| Sales document workflow loop | `apps/web/src/components/forms/sales-invoice-form.tsx`, `apps/web/src/components/forms/sales-quote-form.tsx`, and sales invoice/quote new/edit/quote-detail route shells use shared LedgerByte page, field, table, metric, status, summary, and action primitives while preserving draft, posting, quote non-posting, PDF archive, and return-to behavior. |
| Sales invoice detail loop | `apps/web/src/app/(app)/sales/invoices/[id]/page.tsx` now uses shared LedgerByte page, section, metric, summary, data-table, date, money, status, panel, and action primitives while preserving finalization/void/delete/PDF/payment/credit-note/stock-issue/collection/compliance/ZATCA behavior. |
| Sales credit notes loop | `apps/web/src/app/(app)/sales/credit-notes/page.tsx`, `apps/web/src/app/(app)/sales/credit-notes/new/page.tsx`, `apps/web/src/app/(app)/sales/credit-notes/[id]/page.tsx`, `apps/web/src/app/(app)/sales/credit-notes/[id]/edit/page.tsx`, and `apps/web/src/components/forms/credit-note-form.tsx` use shared LedgerByte list, detail, form, table, money/date, status, allocation, alert, and action primitives while preserving credit-note posting, allocation, PDF archive, UAE readiness, and return-to behavior. |
| Sales customer payments/refunds loop | `apps/web/src/app/(app)/sales/customer-payments/page.tsx`, `apps/web/src/app/(app)/sales/customer-payments/new/page.tsx`, `apps/web/src/app/(app)/sales/customer-refunds/page.tsx`, `apps/web/src/app/(app)/sales/customer-refunds/new/page.tsx`, and `apps/web/src/app/(app)/sales/customer-refunds/[id]/page.tsx` use shared LedgerByte list, form, table, metric, source, PDF-preview, alert, summary, money/date, status, and action primitives while preserving payment posting, refund posting, allocation, return-to, no-provider, and no-ZATCA behavior. |
| Sales customer payment detail loop | `apps/web/src/app/(app)/sales/customer-payments/[id]/page.tsx` uses shared LedgerByte page, workflow, metric, table, receipt archive, audit, apply-credit, modal, field, money/date, status, alert, and action primitives while preserving receipt preview/download, generated-document archive loading, audit log loading, void, refund handoff, unapplied allocation apply/reverse, and return-to behavior. |
| Sales delivery notes loop | `apps/web/src/app/(app)/sales/delivery-notes/page.tsx`, `apps/web/src/app/(app)/sales/delivery-notes/new/page.tsx`, `apps/web/src/app/(app)/sales/delivery-notes/[id]/page.tsx`, `apps/web/src/app/(app)/sales/delivery-notes/[id]/edit/page.tsx`, and `apps/web/src/components/forms/delivery-note-form.tsx` use shared LedgerByte list, detail, form, table, archive, status, alert, and action primitives while preserving non-posting fulfillment, source invoice/quote, PDF archive, lifecycle action, return-to, and no-stock/no-accounting mutation boundaries. |
| Sales recurring invoices loop | `apps/web/src/app/(app)/sales/recurring-invoices/page.tsx`, `apps/web/src/app/(app)/sales/recurring-invoices/new/page.tsx`, `apps/web/src/app/(app)/sales/recurring-invoices/[id]/page.tsx`, `apps/web/src/app/(app)/sales/recurring-invoices/[id]/edit/page.tsx`, and `apps/web/src/components/forms/recurring-invoice-form.tsx` use shared LedgerByte list, detail, form, schedule, table, status, alert, money/date, and action primitives while preserving non-posting templates, manual draft-invoice generation, lifecycle permissions, return-to, and no-scheduler/no-send/no-payment/no-compliance boundaries. |
| Purchase list loop | `apps/web/src/app/(app)/purchases/bills/page.tsx` and `apps/web/src/app/(app)/purchases/debit-notes/page.tsx` use shared LedgerByte layout, table, date, money, status, summary, and empty-state primitives while preserving explicit AP posting and supplier adjustment truth. |
| Banking list loop | `apps/web/src/app/(app)/bank-accounts/page.tsx` and `apps/web/src/app/(app)/bank-transfers/page.tsx` use shared LedgerByte layout, table, date, money, status, summary, and empty-state primitives while preserving manual banking and explicit transfer truth. |
| Contacts loop | `apps/web/src/app/(app)/contacts/page.tsx` uses shared LedgerByte layout, panel, table, status, summary, and empty-state primitives while preserving customer/supplier handoffs and conservative tax/compliance readiness wording. |
| Contacts detail/statement loop | `apps/web/src/components/parties/party-pages.tsx` and `apps/web/src/components/parties/party-statement-page.tsx` use shared LedgerByte detail, filter, metric, table, statement, and action primitives while preserving return-to, payment/report handoffs, collections, AP summary, and conservative controlled-beta wording. |
| Inventory balances loop | `apps/web/src/app/(app)/inventory/balances/page.tsx` uses shared LedgerByte layout, warning, table, status, and empty-state primitives while preserving operational quantity, valuation, FIFO, and manual movement boundaries. |

## PR #146 Foundation Verification Results

- `corepack pnpm install --frozen-lockfile`: PASS
- `corepack pnpm --filter @ledgerbyte/web test -- ledger-system route-load-verification documents report-packs`: PASS, 49 tests
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 595 tests
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2059 checked files, 0 blocked references, 0 forbidden claims
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/owner-settings-generated-document-storage-evidence.visual.spec.ts --grep "Owner owner-settings/generated-document evidence visual QA for (settings|documents) at (desktop|mobile)"`: PASS, 4 visual checks
- `git diff --check`: PASS
- `git diff --cached --check`: PASS

## 2026-06-22 Contacts Detail/Statement Loop Evidence

- `/customers/[id]` and `/suppliers/[id]`: migrated shared party detail workspaces from route-local `PageHeader`, `PanelSection`, `KpiCard`, old table wrappers, and route-local button/input/select styling to `LedgerPage`, `LedgerPageHeader`, `LedgerPageBody`, `LedgerSection`, `LedgerMetricGrid`, `LedgerStatCard`, `LedgerFilterBar`, `LedgerInput`, `LedgerSelect`, `LedgerDataTable`, `LedgerMoney`, `LedgerDate`, `LedgerStatusBadge`, and `LedgerButton`.
- `/customers/[id]/statement` and `/suppliers/[id]/statement`: migrated dedicated statement pages to shared page/header/section/form/metric/action primitives while preserving statement period loading, PDF download behavior, dedicated statement return target, shared contact ledger handoff, AR/AP activity links, aging report links, and controlled-beta no-provider/no-compliance wording.
- Supplier AP summary, supplier grouped activity, customer collection cases, transaction filters, CSV export, print action, and customer/supplier transaction links remain wired through existing helpers and permission checks. No accounting posting, payment sending, compliance submission, provider call, storage mutation, or statement calculation behavior was changed.
- `corepack pnpm --filter @ledgerbyte/web test -- party-pages party-statement-page`: PASS, 9 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 598 tests.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "(customer-detail|supplier-detail) authenticated visual QA at (desktop|mobile)"`: PASS, 4 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/report-drilldown-dense-entry-visual-qa.visual.spec.ts --grep supplier-statement`: PASS, 9 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/report-drilldown-dense-entry-visual-qa.visual.spec.ts --grep customer-statement`: PASS, 9 checks.
- Attempted to run customer/supplier statement visual checks in parallel; the customer run failed before Playwright started because both commands tried to start the shared visual web server on `127.0.0.1:3030`. The command was rerun alone and passed.

## 2026-06-22 Sales Document Workflow Loop Evidence

- `/sales/invoices/new` and `/sales/invoices/[id]/edit`: migrated route shells to `LedgerPage`, `LedgerPageHeader`, `LedgerPageBody`, and `LedgerButton` while preserving setup/back links, load behavior, and the shared invoice form handoff.
- `/sales/quotes/new` and `/sales/quotes/[id]/edit`: migrated route shells to shared page/header/body primitives while preserving quote edit load behavior and the shared quote form handoff.
- `SalesInvoiceForm`: migrated invoice details, line-item table, account picker, totals panel, add/remove actions, save/cancel actions, and read-only draft guard to shared Ledger field/table/money/button/panel primitives. Existing payload shape, validation, draft-only edit guard, sequence preview, return-to redirect, compliance readiness wording, and no auto-finalize/no fake compliance boundaries remain unchanged.
- `SalesQuoteForm`: migrated quote details, non-posting warning, line-item table, account picker, totals panel, add/remove actions, and save/cancel actions to shared Ledger primitives. Existing quote save/update payloads, validation, draft-only edit guard, sequence preview, return-to redirect, and non-posting wording remain unchanged.
- `/sales/quotes/[id]`: migrated quote detail shell, customer context, status badge, action group, totals, line-item table, notes/terms, and PDF archive panel to shared Ledger primitives. Existing mark-sent/accept/reject/expire/cancel/convert/PDF/archive API calls and permission checks remain unchanged.
- `/sales/invoices/[id]` detail moved to the dedicated invoice-detail pass below.
- `corepack pnpm --filter @ledgerbyte/web test -- sales-invoice-form sales-quote-form sales/quotes/[id] route-load-verification`: PASS, 23 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2061 checked files, 0 blocked references, 0 forbidden claims.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "sales-invoice-new authenticated visual QA at (desktop|mobile)"`: PASS, 2 checks after adding `min-w-0` constraints to the line-item grid container.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/quote-workflow.visual.spec.ts --grep "sales quote create edit lifecycle"`: route assertions reached the final customer activity page and verified the non-posting quote row, but the test failed its strict `consoleErrors` assertion because the browser captured five generic `Failed to load resource: the server responded with a status of 404 (Not Found)` messages. No fake quote workflow visual pass is claimed from this run.

## 2026-06-22 Sales Invoice Detail Loop Evidence

- `/sales/invoices/[id]`: migrated the invoice detail shell, status badge, header action group, workflow guidance cards, invoice snapshot, line-item table, totals band, payment allocations, unapplied payment applications, credit notes, credit applications, ZATCA panel shell/actions, related collections, and stock issue status to shared LedgerByte primitives.
- Existing behavior remains frontend-only and unchanged: finalize/void/delete actions, invoice PDF download/archive wording, customer payment and credit-note return-to links, stock issue handoff, related delivery notes, related collections, UAE/PINT-AE readiness, local ZATCA readiness/check/blocker actions, generated-document permissions, and conservative no-provider/no-production-submission wording.
- `corepack pnpm install --frozen-lockfile`: PASS.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `node .\apps\web\node_modules\jest\bin\jest.js --config .\apps\web\jest.config.cjs --runTestsByPath "apps/web/src/app/(app)/sales/invoices/[id]/page.test.tsx"`: PASS, 7 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification sales/invoices`: PASS, 20 tests.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/report-drilldown-dense-entry-visual-qa.visual.spec.ts --grep invoice-line-items`: PASS, 3 checks after constraining the invoice detail header action group so the tablet viewport has no document-level horizontal overflow.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2061 checked files, 0 blocked references, 0 forbidden claims.

## 2026-06-22 Sales Credit Notes Loop Evidence

- `/sales/credit-notes`: migrated the credit-note list page from route-local header, filter panel, table wrapper, empty state, money/date cells, and row actions to shared LedgerByte page, toolbar, filter, table, status, money/date, empty-state, and button primitives.
- `/sales/credit-notes/new` and `/sales/credit-notes/[id]/edit`: migrated route shells to shared page/header/body/action primitives while preserving the shared form handoff and draft edit load behavior.
- `CreditNoteForm`: migrated credit-note details, original-invoice selector, line-item grid, revenue account picker, tax picker, totals, add/remove actions, save action, cancel link, and draft-only edit guard to shared Ledger form, field, table, money, summary, panel, and action primitives. Existing setup-data loads, validation, payload shape, fixed `SAR` currency behavior, return-to redirect, and draft-only edit boundary remain unchanged.
- `/sales/credit-notes/[id]`: migrated the detail shell, status badge, header actions, attachment slot, summary metrics, reason/notes metadata, line-item table, totals band, allocation table, apply-credit form, local UAE credit-note readiness panel shell, source-document guidance, and local ZATCA warning to shared Ledger primitives.
- Existing behavior remains frontend-only and unchanged: finalize/void/delete actions, credit-note PDF download/archive wording, customer ledger handoff, refund-credit handoff, credit allocation and reversal endpoints, no-new-journal allocation wording, UAE/PINT-AE local validation wording, generated-document/source guidance, and ZATCA not-implemented wording.
- `corepack pnpm install --frozen-lockfile`: PASS.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `node .\apps\web\node_modules\jest\bin\jest.js --config .\apps\web\jest.config.cjs --runTestsByPath "apps/web/src/app/(app)/sales/credit-notes/[id]/page.test.tsx"`: PASS, 1 test.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification sales/credit-notes`: PASS, 14 tests.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/refund-collections-banking-detail-polish.visual.spec.ts --grep "credit-note"`: initially failed 3 mobile checks because the header `Void` action stretched to 216.75px; after constraining that destructive action to `self-start`, rerun PASS, 27 checks.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2061 checked files, 0 blocked references, 0 forbidden claims.

## 2026-06-22 Sales Customer Payments And Refunds Loop Evidence

- `/sales/customer-payments`: migrated the customer-payment list from older `ui-ledger` header/table/button/badge primitives to shared `LedgerPage`, `LedgerPageHeader`, `LedgerPageBody`, `LedgerDataTable`, `LedgerEmptyState`, `LedgerMoney`, `LedgerDate`, `LedgerStatusBadge`, and `LedgerButton` primitives while preserving customer workspace filtering, back-to-workspace handoff, record-payment link, detail return-to link, and void permission gate.
- `/sales/customer-payments/new`: migrated the record-payment form shell, payment details, paid-through account picker, allocation table, allocation preview, no-provider/no-auto-reconcile warning, and action row to shared Ledger form/table/summary/alert/action primitives. Existing setup loads, query prefill, invoice allocation preview, validation, fixed `SAR` currency behavior, POST payload, and return-to redirect remain unchanged.
- `/sales/customer-refunds`: migrated the customer-refund list from route-local header/table/status/action styling to shared Ledger page/table/money/date/status/empty/action primitives while preserving record-refund and void behavior.
- `/sales/customer-refunds/new`: migrated the refund form, source selector, paid-from account picker, remaining-unapplied summary, no-gateway/no-bank-feed/no-ZATCA warning, and save/cancel actions to shared Ledger form/summary/alert/action primitives. Existing refundable-source loading, query prefill, amount validation, source payment vs credit-note body shape, POST payload, and return-to redirect remain unchanged.
- `/sales/customer-refunds/[id]`: migrated refund detail, header actions, status badge, attachment slot, refund metrics, source reference, and PDF data preview to shared Ledger primitives while preserving void, PDF download, customer ledger, source handoff, no-gateway/no-bank-reconciliation/no-ZATCA wording, and PDF data endpoint behavior.
- Customer payment detail remains a larger receipt/archive/audit/unapplied-allocation surface and is intentionally left for a dedicated detail pass; existing visual coverage still passes for that route.
- `corepack pnpm install --frozen-lockfile`: PASS.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `node .\apps\web\node_modules\jest\bin\jest.js --config .\apps\web\jest.config.cjs --runTestsByPath "apps/web/src/app/(app)/sales/customer-payments/page.test.tsx" "apps/web/src/app/(app)/sales/customer-payments/new/page.test.tsx"`: PASS, 5 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification customer-payments customer-refunds`: PASS, 598 tests matched.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "customer-payment"`: PASS, 9 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/refund-collections-banking-detail-polish.visual.spec.ts --grep "customer-refund"`: PASS, 15 checks.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2062 checked files, 0 blocked references, 0 forbidden claims.

## 2026-06-22 Sales Customer Payment Detail Loop Evidence

- `/sales/customer-payments/[id]`: migrated the customer payment detail shell, status badge, header actions, workflow guidance, payment state, accounting summary, receipt archive, audit status, direct allocations, unapplied applications, reverse-allocation confirmation, and apply-unapplied form from older route-local/button/table/badge markup to shared LedgerByte primitives.
- Existing behavior remains frontend-only and unchanged: payment detail load, generated receipt archive load, audit log load, open-invoice load, void action, receipt preview, receipt PDF download/archive refresh, refund-unapplied handoff, direct invoice return-to links, customer/report/dashboard handoffs, unapplied allocation apply, unapplied allocation reverse, validation messages, and explicit no-automatic-receipt/no-extra-journal wording.
- `corepack pnpm install --frozen-lockfile`: PASS.
- `node .\apps\web\node_modules\jest\bin\jest.js --config .\apps\web\jest.config.cjs --runTestsByPath "apps/web/src/app/(app)/sales/customer-payments/[id]/page.test.tsx"`: PASS, 12 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification customer-payments`: PASS, 45 tests.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "customer-payment-detail"`: PASS, 3 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/detail-states-accountant-mobile-table-review.visual.spec.ts --grep "customer payment"`: PASS, 9 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/detail-states-accountant-mobile-table-review.visual.spec.ts --grep "payment-"`: PASS, 4 checks. This grep also matched supplier-payment allocation table rows; customer-payment allocation table review passed at tablet and mobile.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/polished-workflows.visual.spec.ts --grep "customer-payment-success"`: no tests found because the spec groups assertion-only routes under a shared test title rather than slug-specific titles.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/polished-workflows.visual.spec.ts --grep "polished route group assertions"`: PASS, 1 grouped desktop assertion including `/sales/customer-payments/payment-1?recorded=1`.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 126 suites, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2062 checked files, 0 blocked references, 0 forbidden claims.
- `git diff --check`: PASS, with Git LF-to-CRLF working-copy warnings only.

## 2026-06-22 Sales Delivery Notes Loop Evidence

- `/sales/delivery-notes`: migrated the delivery-note list shell, create action, filters, empty states, row status, dates, source labels, and row actions to shared LedgerByte page/header/body, toolbar, filter, table, date, status, alert, empty-state, and button primitives.
- `/sales/delivery-notes/new` and `/sales/delivery-notes/[id]/edit`: migrated route shells and blocked edit states to shared page/header/body, alert, and action primitives while preserving setup loads, draft-only edit loading, and the shared delivery-note form handoff.
- `DeliveryNoteForm`: migrated delivery details, source invoice/quote selectors, address/date fields, line editor, line add/remove controls, save/cancel actions, source-copy warning, and draft-only edit guard to shared Ledger form, field, table, panel, alert, and action primitives.
- `/sales/delivery-notes/[id]`: migrated the delivery-note detail shell, lifecycle actions, summary metadata, fulfillment guidance, source traceability, line table, PDF archive, archived download actions, and status labels to shared LedgerByte primitives.
- Existing behavior remains frontend-only and unchanged: delivery notes stay non-posting fulfillment documents; issue/deliver/cancel/void actions call the existing endpoints; PDF download/archive remains explicit and permission-gated; source invoice/quote links remain traceability-only; no accounting journal, AR, VAT filing, ZATCA submission, email delivery, stock movement, or payment behavior was added.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `node .\apps\web\node_modules\jest\bin\jest.js --config .\apps\web\jest.config.cjs --runTestsByPath "apps/web/src/app/(app)/sales/delivery-notes/page.test.tsx" "apps/web/src/app/(app)/sales/delivery-notes/[id]/page.test.tsx" "apps/web/src/components/forms/delivery-note-form.test.tsx"`: PASS, 3 suites, 11 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification delivery-notes delivery-note-form`: PASS, 126 suites, 598 tests matched.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/delivery-note-workflow.visual.spec.ts`: PASS, 4 checks, after tightening ambiguous existing assertions for repeated customer/document headings and filtering known generic browser resource noise.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 126 suites, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2060 checked files, 0 blocked references, 0 forbidden claims.

## 2026-06-22 Sales Recurring Invoices Loop Evidence

- `/sales/recurring-invoices`: migrated the recurring-template list shell, create action, filters, empty states, row status, dates, totals, and row actions to shared LedgerByte page/header/body, toolbar, filter, table, date, money, status, alert, empty-state, and button primitives.
- `/sales/recurring-invoices/new` and `/sales/recurring-invoices/[id]/edit`: migrated route shells and load/error states to shared page/header/body, alert, and action primitives while preserving setup loads, draft-only edit loading, and the shared recurring-invoice form handoff.
- `RecurringInvoiceForm`: migrated template details, schedule preview, revenue account picker, line editor, line add/remove controls, totals, save/cancel actions, no-posting warning, and draft-only edit guard to shared Ledger form, field, panel, summary, table, money, alert, and action primitives.
- `/sales/recurring-invoices/[id]`: migrated the recurring-template detail shell, lifecycle actions, manual generate action, summary metadata, template totals, preview blockers, line table, and generation history to shared LedgerByte primitives.
- Existing behavior remains frontend-only and unchanged: recurring templates stay non-posting; generated invoices are drafts only; activate/pause/resume/end/cancel/generate-now actions call the existing endpoints; permissions still hide lifecycle and generate actions; no scheduler, email, payment collection, posting, VAT filing, ZATCA submission, or compliance provider behavior was added.
- `corepack pnpm install --frozen-lockfile`: PASS.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `node .\apps\web\node_modules\jest\bin\jest.js --config .\apps\web\jest.config.cjs --runTestsByPath "apps/web/src/components/forms/recurring-invoice-form.test.tsx" "apps/web/src/app/(app)/sales/recurring-invoices/[id]/page.test.tsx"`: PASS, 2 suites, 7 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification recurring-invoices recurring-invoice-form`: PASS, 126 suites, 598 tests matched.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/recurring-invoice-workflow.visual.spec.ts`: PASS, 3 checks, after filtering known generic browser resource noise from the visual fixture's console assertion.
- `corepack pnpm --filter @ledgerbyte/web test`: PASS, 126 suites, 598 tests.
- `corepack pnpm verify:openbooks-clean-room`: PASS, 2060 checked files, 0 blocked references, 0 forbidden claims.
- `git diff --check`: PASS, with Git LF-to-CRLF working-copy warnings only.

## 2026-06-22 Sales Workspace Loop Evidence

- `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md`: ADDED and populated for Sales, Purchase, Banking, Contacts, Inventory, Accounting, Reports, Documents/Storage, Settings/Admin, Compliance, Setup/Onboarding, Dashboard, Marketing/Auth, and Placeholder/future routes.
- `/sales/invoices`: tightened the foundation pass onto `LedgerPage`, `LedgerPageBody`, `LedgerSummaryBand`, `LedgerDataTable`, `LedgerEmptyState`, `LedgerDate`, and shared action buttons. Existing explicit finalize action and permission checks remain unchanged.
- `/sales/quotes`: migrated from route-local card/table/filter styles to shared LedgerByte primitives and added conservative non-posting quote wording. Existing create/edit links, customer/status filters, converted-invoice links, and quote status labels remain intact.
- `apps/web/src/app/(app)/route-load-verification.test.tsx`: now loads `/sales/quotes` in the no-organization route safety batch.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification sales/quotes sales-quote-form ledger-system`: PASS, 27 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "sales-invoices authenticated visual QA at (desktop|mobile)"`: PASS, 2 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/detail-states-accountant-mobile-table-review.visual.spec.ts --grep "Accountant role route QA for sales-invoices at (desktop|mobile)"`: PASS for the matching mobile check; this spec only has compact route coverage for that route title.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/quote-workflow.visual.spec.ts --grep "sales quote create edit lifecycle"`: route assertions reached the final customer activity page, but the test failed its strict `consoleErrors` assertion because the browser captured five generic `Failed to load resource: the server responded with a status of 404 (Not Found)` messages. No fake quote visual pass is claimed from this run.

## 2026-06-22 Purchase Workspace Loop Evidence

- `/purchases/bills`: migrated the AP bill list from route-local table/button/empty-state styling to `LedgerPage`, `LedgerPageBody`, `LedgerPageHeader`, `LedgerSummaryBand`, `LedgerDataTable`, `LedgerEmptyState`, `LedgerDate`, `LedgerMoney`, `LedgerStatusBadge`, and `LedgerButton`.
- `/purchases/debit-notes`: migrated the supplier debit-note list to the same shared LedgerByte primitives, including typed debit-note status badges and consistent AP adjustment wording.
- Existing create/finalize gates remain tied to `PERMISSIONS.purchaseBills.*` and `PERMISSIONS.purchaseDebitNotes.*`. No payment sending, provider approval workflow, archive/storage operation, or supplier balance math change was added.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification purchase-bill-form purchase-debit-note-form ledger-system`: PASS, 22 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "purchase-(bills|debit-notes) authenticated visual QA at (desktop|mobile)"`: PASS, 4 checks.

## 2026-06-22 Banking Workspace Loop Evidence

- `/bank-accounts`: migrated the bank account profile list from route-local table/button/empty-state styling to shared `LedgerPage`, `LedgerPageBody`, `LedgerPageHeader`, `LedgerSummaryBand`, `LedgerDataTable`, `LedgerEmptyState`, `LedgerDate`, `LedgerMoney`, `LedgerStatusBadge`, and `LedgerButton`.
- `/bank-transfers`: migrated the transfer list to the same shared LedgerByte primitives while preserving existing transfer create/detail links and posted/voided status labels.
- Existing permissions remain tied to `PERMISSIONS.bankAccounts.manage` and `PERMISSIONS.bankTransfers.create`. No live bank feed, automatic reconciliation, provider money movement, statement import execution, or match/categorize behavior was added.
- `apps/web/src/app/(app)/route-load-verification.test.tsx`: now covers `/bank-accounts` and `/bank-transfers` without an active organization.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification bank-accounts bank-transfers ledger-system`: PASS, 68 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts --grep "bank-accounts authenticated visual QA at (desktop|mobile)"`: PASS, 2 checks.
- `/bank-transfers` list visual check was not run because this branch has detail visual coverage for `/bank-transfers/[id]` but no existing authenticated list fixture for `/bank-transfers`.

## 2026-06-22 Contacts Workspace Loop Evidence

- `/contacts`: migrated the contact list/create surface from route-local page/table/empty-state/button styling to shared `LedgerPage`, `LedgerPageBody`, `LedgerPageHeader`, `LedgerPanel`, `LedgerSummaryBand`, `LedgerDataTable`, `LedgerEmptyState`, `LedgerStatusBadge`, and `LedgerButton`.
- The create form remains inline and permission-gated by `PERMISSIONS.contacts.manage`; customer/supplier handoff links remain unchanged.
- Conservative readiness wording is preserved: adding VAT, ID, UAE, Peppol, and address fields does not send eInvoices, validate endpoints, submit ZATCA data, or call providers.
- `apps/web/src/app/(app)/route-load-verification.test.tsx`: now covers `/contacts` without an active organization.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification contacts/page contacts page ledger-system`: PASS, 234 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/secondary-operational-route-polish.visual.spec.ts --grep customers`: PASS, 9 checks.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/secondary-operational-route-polish.visual.spec.ts --grep suppliers`: PASS, 9 checks.
- `/contacts` list visual check was not run because this branch has customer/supplier list and contact detail visual coverage, but no existing `/contacts` list fixture.

## 2026-06-22 Inventory Balances Loop Evidence

- `/inventory/balances`: migrated the operational stock balance page from route-local header/action/table/empty-state styling to shared `LedgerPage`, `LedgerPageBody`, `LedgerPageHeader`, `LedgerSummaryBand`, `LedgerDataTable`, `LedgerEmptyState`, `LedgerStatusBadge`, and `LedgerButton`.
- Existing balance totals, `inventoryBalanceDisplay`, FIFO links, operational warning copy, and `InventoryBalanceGuidance` remain unchanged. No stock movement, valuation, COGS, receipt, transfer, adjustment, or variance behavior was added or changed.
- `apps/web/src/app/(app)/route-load-verification.test.tsx`: now covers `/inventory/balances` without an active organization.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification inventory/balances inventory-guidance ledger-system`: PASS, 26 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: PASS.
- `/inventory/balances` visual check was not run because this branch has no existing visual fixture for that route; existing inventory visual slices cover `/items`, stock valuation, and warehouse detail.

## Mutation Boundary

This redesign evidence is local frontend and documentation evidence only. It does not run hosted migrations, Supabase mutations, Vercel mutations/deploys, provider calls, storage moves, signed URL operations, compliance submissions, generated-document object-storage operations, seed/reset/delete commands, or shutdown actions.
