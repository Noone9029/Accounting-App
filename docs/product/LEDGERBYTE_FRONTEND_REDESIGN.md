# LedgerByte Frontend Redesign

Date: 2026-06-22

This branch continues the full LedgerByte frontend redesign from the PR #151 sales customer-payments loop. It is intentionally stacked on `codex/ui-redesign-customer-payments` while that PR is open so the next pass stays reviewable.

## Scope Implemented In This Slice

- Expanded `apps/web/src/components/ui/ledger-system.tsx` with page body, metric grid, table, loading/error, form, workflow, summary, review, and breadcrumb primitives.
- Migrated `/settings` from a redirect-only root into a grouped administration overview using shared LedgerByte primitives and conservative controlled-beta wording.
- Migrated `/documents` onto shared page/header/filter/table/empty-state primitives while preserving existing generated-document archive behavior, filters, download wording, and local AP email outbox boundaries.
- Migrated `/report-packs` onto shared page/header/metric/table/workflow/disabled-boundary primitives while preserving read-only preview behavior and all disabled execution boundaries.
- Migrated `/purchases/bills` and `/purchases/debit-notes` list surfaces onto shared LedgerByte page/table/state primitives while preserving explicit AP posting and debit-note adjustment boundaries.
- Migrated `/bank-accounts` and `/bank-transfers` list surfaces onto shared LedgerByte page/table/state primitives while preserving manual banking and explicit transfer boundaries.
- Migrated `/contacts` list/create surface onto shared LedgerByte page/panel/table/state primitives while preserving customer/supplier handoff links and conservative readiness wording.
- Migrated customer/supplier detail workspaces and dedicated statement routes onto shared LedgerByte page/section/filter/metric/table/action primitives while preserving return-to handoffs, collections/AP summary, statement PDF behavior, and payment/report drilldown links.
- Migrated sales invoice and quote new/edit form workflows plus sales quote detail onto shared LedgerByte page/section/field/table/summary/action primitives while preserving draft, posting, non-posting quote, PDF archive, and return-to boundaries.
- Migrated sales invoice detail onto shared LedgerByte page/section/metric/table/summary/panel/action primitives while preserving posting actions, generated-document archive wording, payment/credit-note/stock/collection handoffs, and local UAE/ZATCA readiness boundaries.
- Migrated sales credit-note list, new/edit form workflow, detail, allocation, apply-credit, and shared credit-note form surfaces onto shared LedgerByte page/section/form/table/summary/status/action primitives while preserving credit-note posting, allocation, PDF archive, UAE readiness, ZATCA not-implemented, and return-to boundaries.
- Migrated customer payment list/new workflow and customer refund list/new/detail workflow onto shared LedgerByte page/section/form/table/summary/status/action primitives while preserving payment posting, refund posting, allocation, return-to, no-provider, no-bank-feed, and no-ZATCA boundaries.
- Migrated customer payment detail receipt/archive/audit/unapplied-allocation workflow onto shared LedgerByte page/workflow/section/table/modal/field/status/action primitives while preserving void, refund handoff, receipt preview/download, audit loading, apply/reverse allocation, and return-to behavior.
- Migrated `/inventory/balances` onto shared LedgerByte page/table/state primitives while preserving operational stock and valuation boundaries.
- Updated focused component and route-load tests for the shared system and settings overview route.

## Loop Engineering Progress

### 2026-06-22 Sales Workspace List Loop

- Added `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md` as the full-route tracking artifact for the ongoing redesign loop.
- Migrated `/sales/quotes` list layout, filters, status badges, date/money cells, action buttons, and empty states to shared LedgerByte primitives.
- Tightened `/sales/invoices` list layout around shared page/body, summary, data table, date/money cells, and empty states while preserving explicit finalize behavior.
- Preserved quote truth: quotes remain non-posting and do not create journals, VAT filings, inventory movements, payments, email delivery, or compliance submissions from the list view.
- Preserved invoice truth: invoice finalization remains the only explicit posting action on the list and keeps existing permission gates.

### 2026-06-22 Sales Document Workflow Loop

- Migrated `/sales/invoices/new`, `/sales/invoices/[id]/edit`, `/sales/quotes/new`, and `/sales/quotes/[id]/edit` route shells to shared page/header/body/action primitives.
- Migrated `SalesInvoiceForm` and `SalesQuoteForm` details, line items, account picker, totals, and action areas to shared field/table/money/button/panel primitives.
- Migrated `/sales/quotes/[id]` to shared page, summary, status, action, table, notes, totals, and PDF archive primitives.
- Preserved invoice truth: draft invoices are still saved first, edit remains draft-only, form submission payloads and return-to redirects are unchanged, and no auto-finalize/posting behavior was added.
- Preserved quote truth: quotes remain non-posting, quote actions call the existing endpoints, conversion creates a draft invoice only through the existing action, and PDF archive wording avoids tax invoice/compliance/payment claims.
- `/sales/invoices/[id]` detail moved to the dedicated invoice-detail loop below.

### 2026-06-22 Sales Invoice Detail Loop

- Migrated `/sales/invoices/[id]` to shared page/header/body, status, workflow, metric, summary, data table, panel, money/date, and action primitives.
- Preserved invoice truth: finalize remains the explicit posting action, draft edit/delete and void visibility stay permission-gated, PDF downloads still create archive records, and payment, credit-note, stock-issue, collection, delivery-note, customer-ledger, report, and return-to links keep their existing href behavior.
- Preserved compliance truth: UAE eInvoicing/PINT-AE readiness and local ZATCA readiness remain local/readiness-only surfaces with no ASP/FTA/ZATCA production submission or provider claim.
- Constrained the invoice detail header action group so tablet visual QA has no document-level horizontal overflow.

### 2026-06-22 Sales Credit Notes Loop

- Migrated `/sales/credit-notes` list layout, filters, status badges, money/date cells, action buttons, and empty states to shared LedgerByte primitives.
- Migrated `/sales/credit-notes/new`, `/sales/credit-notes/[id]/edit`, and `CreditNoteForm` details, original-invoice selector, line-item table, revenue/tax pickers, totals, add/remove actions, save/cancel actions, and draft-only edit guard to shared Ledger form/table/action primitives.
- Migrated `/sales/credit-notes/[id]` to shared page/header/body, status, metric, metadata, data table, summary, allocation, apply-credit, warning, and action primitives.
- Preserved credit-note truth: finalization and void/delete remain explicit permission-gated actions, credit allocation only matches the existing AR reduction and creates no new journal, PDF downloads still create archive records, UAE readiness remains local-only, and ZATCA credit-note XML/signing/PDF-A3/clearance/reporting remain intentionally not implemented.
- Constrained the mobile destructive `Void` action so it remains visually subordinate in credit-note detail visual QA.

### 2026-06-22 Sales Customer Payments And Refunds Loop

- Migrated `/sales/customer-payments` to shared page/header/body, empty-state, table, date, money, status, and action primitives while preserving customer workspace filtering, return-to handoffs, record-payment links, detail links, and void permission gates.
- Migrated `/sales/customer-payments/new` to shared page/header/body, form, table, summary, alert, and action primitives while preserving setup-data loads, query prefill, invoice allocation preview, validation, POST payload, fixed `SAR` behavior, and return-to redirect.
- Migrated `/sales/customer-refunds`, `/sales/customer-refunds/new`, and `/sales/customer-refunds/[id]` to shared Ledger list, form, source, metric, PDF-preview, warning, status, money/date, and action primitives.
- Preserved payment/refund truth: customer payment posting remains explicit, customer refunds remain manual accounting refunds, refund creation does not call payment gateways, bank feeds, or ZATCA services, and refund detail does not imply bank reconciliation or compliance submission.

### 2026-06-22 Sales Customer Payment Detail Loop

- Migrated `/sales/customer-payments/[id]` to shared page/header/body, workflow, metric, receipt archive, audit, data table, modal, field, summary, money/date, status, alert, and action primitives.
- Preserved payment truth: voiding remains explicit and permission-gated, receipt preview and PDF download remain explicit actions, generated receipt archive rows are only loaded after existing permission checks, and payment posting/allocation/reversal actions do not imply automatic receipt generation.
- Preserved allocation truth: direct invoice allocations, unapplied payment applications, apply-unapplied validation, reverse-allocation confirmation, and no-extra-journal wording remain tied to the existing helpers and endpoints.
- Preserved route continuity: Back, invoice, customer workspace, AR report, dashboard, and refund-unapplied handoffs keep the existing return-to behavior.

### 2026-06-22 Purchase Workspace List Loop

- Migrated `/purchases/bills` list layout, status badges, date/money cells, action buttons, summary wording, and empty states to shared LedgerByte primitives.
- Migrated `/purchases/debit-notes` list layout, status badges, amount/date cells, action buttons, and empty states to the same shared system.
- Preserved AP truth: bill finalization remains an explicit posting action, debit notes remain explicit supplier adjustments, and these list views do not send payments, execute provider approvals, move storage, or alter supplier balance math outside existing actions.

### 2026-06-22 Banking Workspace List Loop

- Migrated `/bank-accounts` list layout, status badges, date/money cells, action buttons, summary wording, and empty states to shared LedgerByte primitives.
- Migrated `/bank-transfers` list layout, posted/voided status badges, amount/date cells, action button, summary wording, and empty states to the same shared system.
- Preserved manual-banking truth: these list views do not connect to live feeds, move provider money, auto-reconcile, import statements, or match/categorize statement rows.

### 2026-06-22 Contacts Workspace Loop

- Migrated `/contacts` page layout, create panel, readiness summary, table, active/inactive status badges, action buttons, and empty state to shared LedgerByte primitives.
- Preserved contact truth: readiness fields remain local profile data and do not send eInvoices, validate Peppol endpoints, submit ZATCA data, or contact external providers.
- Customer and supplier list routes continue through the shared party module.

### 2026-06-22 Contacts Detail And Statement Loop

- Migrated `/customers/[id]` and `/suppliers/[id]` detail workspace shells, summary metrics, transaction filters, transaction tables, supplier AP panels, activity cards, customer collections, details tab, and notes tab to shared LedgerByte primitives.
- Migrated `/customers/[id]/statement` and `/suppliers/[id]/statement` to shared LedgerByte page, section, field, metric, summary, and action primitives.
- Preserved return-to behavior, shared contact ledger handoffs, AR/AP payment links, aging report links, statement period loading, statement PDF download behavior, CSV export, print action, collections wording, supplier AP non-posting wording, and all existing permission gates.
- Shared `/contacts/[id]` detail/ledger/statement tabs remain deferred because they are a larger contact-ledger surface and export statement helper components used by the dedicated statement routes.

### 2026-06-22 Inventory Balances Loop

- Migrated `/inventory/balances` page layout, action buttons, operational warning, table, warehouse status badges, and empty state to shared LedgerByte primitives.
- Preserved inventory truth: this pass does not move stock, change valuation math, post COGS, alter FIFO links, post adjustments/transfers, or change receipt/variance behavior.
- Item catalog forms, warehouse/detail, stock movement, adjustment, transfer, receipt, issue, FIFO, landed cost, valuation variance, and inventory report routes remain deferred for dedicated inventory loops.

## Product Boundaries Preserved

- No hosted migration, Supabase mutation, Vercel mutation, provider call, ZATCA/UAE/Peppol/ASP action, banking execution, reconciliation execution, object-storage operation, signed URL operation, generated-document storage mutation, seed/reset/delete command, or shutdown action was added.
- Report packs remain read-only manifest preview only. Generation, export, download, scheduling, email sending, archive writes, object storage, provider calls, and compliance submission remain disabled.
- Generated documents remain bounded by the existing archive and download API behavior. This branch does not claim object-storage or signed URL readiness.
- Settings surfaces remain admin/review/configuration entry points. They do not execute provider or compliance operations.

## Remaining Frontend Route Families

- Sales, Purchase, Banking, Contacts, and Inventory detail/form/supporting flows need systematic conversion to `LedgerPage`, `LedgerToolbar`, `LedgerDataTable`, and shared form primitives.
- Sales now has list surfaces, invoice/quote new/edit forms, invoice detail, quote detail, credit-note list/detail/form coverage, customer payment list/new/detail coverage, and customer refund list/new/detail coverage; recurring invoices, delivery notes, collections, and sales inventory returns remain.
- Contacts now has customer/supplier detail and dedicated statement coverage; shared contact ledger tabs and visual QA remain.
- Banking detail, statement import/review, rule review, deposit, cheque, clearing, and reconciliation-support routes need a dedicated manual-banking redesign slice that preserves non-live wording.
- Reports and report drilldowns need a dense accounting-table redesign pass beyond the report-pack preview.
- Existing settings subroutes need gradual migration to shared panels/forms while preserving each route's permission and mutation behavior.
- Setup/onboarding and dashboard surfaces need final alignment with the ledger-system primitives after typed onboarding work settles.
- Auth and marketing-adjacent entry screens were not included in this operational app-shell slice.

## Recommended Next Goal

Continue the sales workflow wave with delivery-note/collection supporting routes or recurring invoices, then run the corresponding visual fixtures.
