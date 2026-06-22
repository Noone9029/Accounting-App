# Frontend Redesign Evidence

Date: 2026-06-22

Branch: `codex/ui-redesign-invoice-detail`

Base: stacked on `origin/codex/ui-redesign-sales-documents` while PR #148 is open

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
