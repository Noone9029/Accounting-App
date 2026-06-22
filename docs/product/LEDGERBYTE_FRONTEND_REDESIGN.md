# LedgerByte Frontend Redesign

Date: 2026-06-22

This branch continues the full LedgerByte frontend redesign from the PR #157 purchase document form loop. It is intentionally stacked on `codex/ui-redesign-purchase-documents` while that PR is open so the next pass stays reviewable.

## Scope Implemented In This Slice

- Expanded `apps/web/src/components/ui/ledger-system.tsx` with page body, metric grid, table, loading/error, form, workflow, summary, review, and breadcrumb primitives.
- Migrated `/settings` from a redirect-only root into a grouped administration overview using shared LedgerByte primitives and conservative controlled-beta wording.
- Migrated `/documents` onto shared page/header/filter/table/empty-state primitives while preserving existing generated-document archive behavior, filters, download wording, and local AP email outbox boundaries.
- Migrated `/report-packs` onto shared page/header/metric/table/workflow/disabled-boundary primitives while preserving read-only preview behavior and all disabled execution boundaries.
- Migrated `/purchases/bills` and `/purchases/debit-notes` list surfaces onto shared LedgerByte page/table/state primitives while preserving explicit AP posting and debit-note adjustment boundaries.
- Migrated purchase bill/debit-note new/edit route shells and shared purchase bill/debit-note forms onto shared LedgerByte page/form/field/table/summary/action primitives while preserving draft save/update payloads, return-to handoffs, inventory-clearing/accountant warnings, and no provider/payment/tax-authority/compliance behavior.
- Migrated purchase bill/debit-note detail workflows onto shared LedgerByte page/header/panel/section/table/status/action primitives while preserving AP actions, generated-document guidance, allocation controls, receiving/matching/clearing/valuation preview reads, return-to continuity, and no provider/payment-sending/tax-authority/compliance/valuation behavior changes.
- Migrated `/bank-accounts` and `/bank-transfers` list surfaces onto shared LedgerByte page/table/state primitives while preserving manual banking and explicit transfer boundaries.
- Migrated `/contacts` list/create surface onto shared LedgerByte page/panel/table/state primitives while preserving customer/supplier handoff links and conservative readiness wording.
- Migrated customer/supplier detail workspaces and dedicated statement routes onto shared LedgerByte page/section/filter/metric/table/action primitives while preserving return-to handoffs, collections/AP summary, statement PDF behavior, and payment/report drilldown links.
- Migrated sales invoice and quote new/edit form workflows plus sales quote detail onto shared LedgerByte page/section/field/table/summary/action primitives while preserving draft, posting, non-posting quote, PDF archive, and return-to boundaries.
- Migrated sales invoice detail onto shared LedgerByte page/section/metric/table/summary/panel/action primitives while preserving posting actions, generated-document archive wording, payment/credit-note/stock/collection handoffs, and local UAE/ZATCA readiness boundaries.
- Migrated sales credit-note list, new/edit form workflow, detail, allocation, apply-credit, and shared credit-note form surfaces onto shared LedgerByte page/section/form/table/summary/status/action primitives while preserving credit-note posting, allocation, PDF archive, UAE readiness, ZATCA not-implemented, and return-to boundaries.
- Migrated customer payment list/new workflow and customer refund list/new/detail workflow onto shared LedgerByte page/section/form/table/summary/status/action primitives while preserving payment posting, refund posting, allocation, return-to, no-provider, no-bank-feed, and no-ZATCA boundaries.
- Migrated customer payment detail receipt/archive/audit/unapplied-allocation workflow onto shared LedgerByte page/workflow/section/table/modal/field/status/action primitives while preserving void, refund handoff, receipt preview/download, audit loading, apply/reverse allocation, and return-to behavior.
- Migrated delivery-note list/new/detail/edit and shared delivery-note form workflows onto shared LedgerByte page/section/form/table/archive/status/action primitives while preserving non-posting fulfillment, source invoice/quote traceability, PDF archive, lifecycle actions, and no-stock/no-accounting mutation boundaries.
- Migrated recurring-invoice list/new/detail/edit and shared recurring-invoice form workflows onto shared LedgerByte page/section/form/schedule/table/status/action primitives while preserving non-posting templates, manual draft-invoice generation, lifecycle permissions, return-to behavior, and no-scheduler/no-send/no-payment/no-compliance boundaries.
- Migrated collections list/new/detail/edit and shared collection-case form workflows onto shared LedgerByte page/section/form/filter/summary/timeline/status/action primitives while preserving follow-up-only metadata, permission-gated actions, customer/invoice links, return-to behavior, and no-posting/no-allocation/no-send/no-payment-link/no-compliance boundaries.
- Migrated sales inventory return list/new/detail/edit and shared sales inventory return form workflows onto shared LedgerByte page/section/form/table/status/movement-preview/action primitives while preserving operational stock-return behavior, lifecycle permissions, return-to behavior, and no-credit-note/no-refund/no-journal/no-VAT/no-ZATCA/no-email/no-payment-link boundaries.
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

### 2026-06-22 Sales Delivery Notes Loop

- Migrated `/sales/delivery-notes`, `/sales/delivery-notes/new`, `/sales/delivery-notes/[id]`, `/sales/delivery-notes/[id]/edit`, and `DeliveryNoteForm` to shared page/header/body, toolbar, form, field, table, panel, archive, status, alert, and action primitives.
- Preserved delivery-note truth: delivery notes remain operational fulfillment documents only; issue, mark-delivered, cancel, void, PDF download, and archived download actions call existing endpoints and permission gates.
- Preserved source and inventory truth: source invoice/quote links stay traceability-only, line copy remains form-local, and this pass adds no accounting journal, AR, VAT filing, ZATCA, payment, email, stock movement, COGS, or inventory valuation behavior.

### 2026-06-22 Sales Recurring Invoices Loop

- Migrated `/sales/recurring-invoices`, `/sales/recurring-invoices/new`, `/sales/recurring-invoices/[id]`, `/sales/recurring-invoices/[id]/edit`, and `RecurringInvoiceForm` to shared page/header/body, toolbar, form, field, schedule, table, panel, status, money/date, alert, and action primitives.
- Preserved recurring-template truth: templates remain non-posting, generated invoices are drafts only, and activate, pause, resume, end, cancel, and generate-now actions call the existing endpoints behind existing permissions.
- Preserved automation/compliance truth: this pass adds no scheduler, email sending, payment collection, automatic posting, VAT filing, ZATCA submission, provider call, or generated-document behavior.

### 2026-06-22 Sales Collections Loop

- Migrated `/sales/collections`, `/sales/collections/new`, `/sales/collections/[id]`, `/sales/collections/[id]/edit`, and `CollectionCaseForm` to shared page/header/body, toolbar, form, field, summary, timeline, panel, status, money/date, alert, and action primitives.
- Preserved collections truth: collection cases remain follow-up metadata only, lifecycle and activity actions call the existing endpoints behind existing permissions, and customer/invoice links keep existing href behavior.
- Preserved accounting/compliance truth: this pass adds no journal posting, payment allocation, credit note, refund, email/reminder sending, payment link, VAT filing, ZATCA call, invoice-balance change, provider call, or storage behavior.

### 2026-06-22 Sales Inventory Returns Loop

- Migrated `/sales/inventory-returns`, `/sales/inventory-returns/new`, `/sales/inventory-returns/[id]`, `/sales/inventory-returns/[id]/edit`, and `SalesInventoryReturnForm` to shared page/header/body, form, field, table, panel, status, alert, date, and action primitives.
- Preserved inventory-return truth: sales inventory returns remain operational customer stock returns only, lifecycle actions and explicit stock-in movement posting call existing endpoints behind existing permissions, and draft-only edit/restricted viewer states remain unchanged.
- Preserved accounting/compliance truth: this pass adds no credit-note creation, refund, journal, AR adjustment, VAT filing, ZATCA submission, email, payment link, valuation change, COGS posting, provider call, or storage behavior.

### 2026-06-22 Purchase Workspace List Loop

- Migrated `/purchases/bills` list layout, status badges, date/money cells, action buttons, summary wording, and empty states to shared LedgerByte primitives.
- Migrated `/purchases/debit-notes` list layout, status badges, amount/date cells, action buttons, and empty states to the same shared system.
- Preserved AP truth: bill finalization remains an explicit posting action, debit notes remain explicit supplier adjustments, and these list views do not send payments, execute provider approvals, move storage, or alter supplier balance math outside existing actions.

### 2026-06-22 Purchase Document Form Loop

- Migrated `/purchases/bills/new`, `/purchases/bills/[id]/edit`, and `PurchaseBillForm` to shared page/header/body, form, field, panel, input/select, alert, money, table, summary, and action primitives.
- Migrated `/purchases/debit-notes/new`, `/purchases/debit-notes/[id]/edit`, and `PurchaseDebitNoteForm` to the same shared LedgerByte form language.
- Preserved AP draft truth: bill and debit-note forms still create/update drafts only; finalization, supplier payment, AP allocation, purchase receiving, inventory movement, tax-authority reporting, ZATCA/UAE/Peppol submission, provider calls, generated-document archive writes, valuation, and COGS behavior remain outside the form save flow.
- Purchase bill/debit-note detail pages remain a separate pass because they include AP actions, generated-document download/archive surfaces, allocations, receiving, matching, clearing reconciliation, and valuation variance panels.

### 2026-06-22 Purchase Document Detail Loop

- Migrated `/purchases/bills/[id]` to shared page/header/body, status, workflow, panel, section, table, money/date, alert, and action primitives across the AP workflow summary, bill details, line items, totals, supplier payment allocations, debit-note allocations, receiving status, accounting preview, and clearing reconciliation surfaces.
- Migrated `/purchases/debit-notes/[id]` to shared page/header/body, status, workflow, panel, section, table, field, money/date, alert, and action primitives across AP adjustment details, line items, totals, allocations, apply-debit controls, source-document guidance, and local ZATCA/readiness warnings.
- Preserved purchase detail truth: finalization, void, delete, PDF download, debit-note apply/reverse, receiving/matching/clearing/valuation preview reads, generated-document guidance, permissions, and return-to links keep existing endpoint behavior.
- Preserved AP/compliance/inventory truth: this pass adds no payment sending, provider call, tax-authority submission, generated-document storage mutation beyond existing explicit downloads, valuation math, COGS posting, AP allocation math, stock movement, hosted mutation, or compliance behavior.
- Tightened shared `LedgerPageHeader` action wrapping and detail header action sizing so tablet/mobile visual QA does not create document-level overflow or oversized destructive actions.

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

### 2026-06-22 Setup And Onboarding Loop

- Migrated `/setup`, setup wizard panels, first accounting workflow prompts, typed onboarding preview cards, and `/organization/setup` to shared LedgerByte page, panel, summary, field, input, select, alert, status, and action primitives.
- Preserved setup truth: the checklist remains read-only and evidence-backed, typed profile selection still loads/saves/recomputes through the existing API helpers, and planned or blocked capabilities remain non-actionable.
- Preserved organization setup behavior: the form still posts to `/organizations`, stores the active organization id, and redirects to `/dashboard` without adding provider, compliance, storage, or tax-authority behavior.

## Product Boundaries Preserved

- No hosted migration, Supabase mutation, Vercel mutation, provider call, ZATCA/UAE/Peppol/ASP action, banking execution, reconciliation execution, object-storage operation, signed URL operation, generated-document storage mutation, seed/reset/delete command, or shutdown action was added.
- Report packs remain read-only manifest preview only. Generation, export, download, scheduling, email sending, archive writes, object storage, provider calls, and compliance submission remain disabled.
- Generated documents remain bounded by the existing archive and download API behavior. This branch does not claim object-storage or signed URL readiness.
- Settings surfaces remain admin/review/configuration entry points. They do not execute provider or compliance operations.

## Remaining Frontend Route Families

- Purchase supporting flows, Banking, Contacts, and Inventory detail/supporting flows need systematic conversion to `LedgerPage`, `LedgerToolbar`, `LedgerDataTable`, and shared form primitives.
- Sales now has list surfaces, invoice/quote new/edit forms, invoice detail, quote detail, credit-note list/detail/form coverage, customer payment list/new/detail coverage, customer refund list/new/detail coverage, delivery-note list/new/detail/edit/form coverage, recurring-invoice list/new/detail/edit/form coverage, collections list/new/detail/edit/form coverage, and inventory-return list/new/detail/edit/form coverage.
- Contacts now has customer/supplier detail and dedicated statement coverage; shared contact ledger tabs and visual QA remain.
- Purchase orders, supplier payments/refunds, cash expenses, matching, AP dashboard, and purchase returns remain in the purchase family. Banking detail, statement import/review, rule review, deposit, cheque, clearing, and reconciliation-support routes need a dedicated manual-banking redesign slice that preserves non-live wording.
- Reports and report drilldowns need a dense accounting-table redesign pass beyond the report-pack preview.
- Existing settings subroutes are migrated in the stacked settings/admin loop; they still need refreshed visual fixture coverage.
- Setup/onboarding is migrated in the stacked onboarding loop; dashboard surfaces still need final attention queue, cash, AR/AP, banking, storage, and compliance snapshot alignment.
- Auth and marketing-adjacent entry screens were not included in this operational app-shell slice.

## Recommended Next Goal

Continue through dashboard, public/auth polish, placeholder/future-route styling, and refreshed visual fixture coverage for the migrated route families.
