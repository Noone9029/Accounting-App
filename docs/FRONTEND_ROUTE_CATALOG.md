# Frontend Route Catalog

Audit date: 2026-05-15

Route source: `apps/web/src/app`

Browser smoke coverage: critical app routes now have Playwright smoke checks under `tests/e2e`. These checks validate route/form/readiness-panel stability and leave detailed accounting assertions to API smoke.

Route QA polish pass on 2026-05-15:

- Static app-route sweep covered 111 `page.tsx` route patterns and found no unmatched literal app links after the dashboard fix.
- Dashboard KPI and metric drill-downs now use the shared permission-aware drill-down map instead of hardcoded links.
- The stale dashboard link to `/bank-reconciliations` was replaced with the existing bank accounts review route.
- Older high-traffic list tables for accounts, contacts, branches, tax rates, fiscal periods, manual journals, and sales invoices now use horizontal overflow wrappers and stable minimum widths for narrow screens.

## Permission Behavior

- App routes are wrapped in a permission provider that loads `/auth/me` and the active organization membership.
- The sidebar filters top-level and child nav items by view permissions.
- Route protection shows an access-denied panel when a user lacks the page permission.
- High-risk buttons such as approve, convert, finalize, void, delete, apply/reverse allocation, bank account archive/reactivate, opening-balance posting, bank transfer voiding, statement import/match/categorize/ignore, reconciliation close/void, warehouse archive/reactivate, stock movement create, inventory adjustment approve/void, warehouse transfer void, fiscal period lock, number sequence save, ZATCA generate/check, attachment upload/download/delete/manage, and document settings save are hidden unless the active role has the matching permission.
- Dashboard navigation is gated by `dashboard.view`.
- Settings/Admin nav now includes Team Members for `users.view`, Roles & Permissions for `roles.view`, Document settings for `documentSettings.view`, Storage for `documentSettings.view` or `attachments.manage`, Email outbox/readiness for `emailOutbox.view`, Audit logs for `auditLogs.view`, and Number sequences for `numberSequences.view`; audit CSV export/retention controls and number-sequence editing are additionally gated by `auditLogs.export`, `auditLogs.manageRetention`, and `numberSequences.manage`.

## Auth And Setup

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/` | Entry route. | Auth/local state. | Redirect/navigation into app. | Implemented | Marketing/landing page intentionally minimal. |
| `/login` | User login. | None before submit. | Login, store token, and navigate to password reset. | Implemented | MFA missing. |
| `/register` | User/org registration. | None before submit. | Register account. | Implemented | Invite acceptance is a separate route. |
| `/invite/accept` | Invitation acceptance. | Invite preview by token. | Set name/password, activate membership, store JWT, and select organization. | Implemented | Mock/local email only; no MFA. |
| `/password-reset` | Password reset request. | None before submit. | Submit email and show generic response. | Implemented | Real provider delivery and MFA are not implemented. |
| `/password-reset/confirm` | Password reset confirmation. | Token from URL. | Set new password with reset token. | Implemented | No session invalidation UI. |
| `/organization/setup` | Create/select organization setup. | Auth user/org state. | Create organization. | Implemented | Rich onboarding checklist missing. |

## Core App

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | Business overview dashboard. | `/dashboard/summary`. | Review KPI cards, lightweight trend/aging charts, AR/AP/banking/inventory/compliance sections, attention items, permission-aware drill-down links, and permission-gated quick actions. | Implemented | No customizable layout, advanced charting, saved widgets, or accountant-reviewed KPI definitions yet. |
| `/accounts` | Chart of accounts. | Accounts. | Create/update/delete accounts. | Implemented | Hierarchical drag/drop and COA templates missing. |
| `/bank-accounts` | Bank/cash account profile list. | Bank account profiles with linked accounts and ledger summaries. | View detail, create profile, archive/reactivate when allowed. | Implemented | No live feed, transfer fee, or FX workflow. |
| `/bank-accounts/new` | Link bank account profile. | Accounts and existing profiles. | Create profile for an unlinked active posting asset account. | Implemented | Cannot create chart account inline. |
| `/bank-accounts/[id]` | Bank account profile detail. | Profile summary and posted transaction rows when allowed. | Date filters, archive/reactivate, post opening balance when allowed, general-ledger link, statement import/transaction/reconciliation/reconciliations links. | Implemented | No bank statement import file attachment workflow or live bank feed. |
| `/bank-accounts/[id]/edit` | Edit bank/cash metadata. | Profile, accounts, existing profiles. | Update metadata only; opening balance fields are disabled after posting. | Implemented | Linked account cannot be changed. |
| `/bank-accounts/[id]/statement-imports` | Local statement import batches. | Bank profile, import batches, preview results. | Paste CSV text or JSON rows, preview validation/totals/warnings, import valid rows with optional partial import, void unmatched imports when allowed. | Implemented | No direct file upload or OFX/CAMT parser. |
| `/bank-accounts/[id]/statement-transactions` | Statement transaction list. | Imported statement rows with filters. | Filter by status/date and open review page. | Implemented | Bulk matching not present. |
| `/bank-accounts/[id]/reconciliation` | Reconciliation summary. | Statement totals, ledger balance, latest closing balance, difference, imports, latest closed reconciliation, open draft flag, unreconciled count, and closed-through date. | Date filtering, unmatched-row navigation, and links to reconciliation list/new draft when allowed. | Implemented | Report downloads live on the reconciliation detail page. |
| `/bank-accounts/[id]/reconciliations` | Reconciliation record list. | Bank profile and reconciliation records. | View draft/pending/approved/closed/voided records and create new draft when allowed. | Implemented | No dedicated approval queue. |
| `/bank-accounts/[id]/reconciliations/new` | Create draft reconciliation. | Bank profile ledger summary. | Enter period, statement balances, notes, and create draft. | Implemented | No pre-close preview endpoint; ledger/difference are calculated after save. |
| `/bank-reconciliations/[id]` | Reconciliation detail. | Reconciliation detail, approval metadata, review history, closed item snapshot, and linked attachments. | Submit ready drafts, approve/reopen, close approved records, void allowed records, review items, manage supporting attachments, and download CSV/PDF reports. | Implemented | No separate approval inbox or email delivery. |
| `/bank-statement-transactions/[id]` | Statement transaction review. | Statement row, match candidates, accounts, and linked attachments. | Manual match, categorize to journal, ignore when allowed and not locked by closed reconciliation, and manage supporting attachments. | Implemented | No auto-match or split categorization. |
| `/bank-transfers` | Bank transfer list. | Posted and voided transfers with from/to profiles and journal links. | Navigate/create/view transfers. | Implemented | No transfer fees, recurring transfers, reconciliation, or FX handling. |
| `/bank-transfers/new` | Create bank transfer. | Active bank account profiles. | Validate and post transfer between different active profiles. | Implemented | No scheduled transfer or fee line. |
| `/bank-transfers/[id]` | Bank transfer detail. | Transfer, profile/account links, journal links. | Void transfer when allowed. | Implemented | No edit/delete after posting by design. |
| `/tax-rates` | Tax rates. | Tax rates. | Create/update rates. | Implemented | VAT report linkage missing. |
| `/branches` | Branch management. | Branches. | Create/update branches. | Implemented | Default branch normalization still missing; branch create/update is now gated by organization update permission. |
| `/items` | Product/service catalog. | Items, accounts, tax rates, inventory balances when allowed. | Create/update/delete items, set inventory-tracking and reorder fields, and view quantity on hand for tracked items. | Partial | Item-specific stock detail/history page missing. |
| `/documents` | Generated document archive. | Generated documents, including operational and report PDFs. | Filter by document type/status and download archived PDFs; page notes that uploaded attachments are managed on source records. | Implemented | Generated archive and uploaded attachments remain separate; storage/provider status and filters could improve. |
| `/fiscal-periods` | Fiscal period management. | Fiscal periods. | Create, close, reopen, and lock periods. | Implemented | No unlock/admin approval or fiscal year wizard yet. |
| `/settings/documents` | Document PDF settings. | Organization document settings. | Update titles/colors/visibility. | Implemented | Template preview/designer missing. |
| `/settings/storage` | Storage readiness and migration planning. | `/storage/readiness` and `/storage/migration-plan`. | Review active providers, redacted S3 config checks, database/S3 readiness warnings, target provider, and dry-run migration counts. | Groundwork | Uploaded-attachment S3 adapter exists behind env config, but no migration executor, generated-document S3 storage, virus scanning, lifecycle/retention policy, or real-bucket validation is implemented. |
| `/settings/email-outbox` | Email provider readiness, test-send, and email outbox. | `/email/readiness`, `/email/test-send`, `/email/outbox`, selected detail, and optional `/auth/tokens/cleanup-expired`. | Review provider mode, redacted SMTP config booleans, warnings/blockers, mock/local/provider emails, send a provider test email when `users.manage` is present, and run expired-token cleanup when permitted. | Groundwork | SMTP adapter is opt-in; no retries, bounce handling, background queue, provider webhooks, or domain auth validation. |
| `/settings/audit-logs` | Audit log review. | `/audit-logs`, selected `/audit-logs/:id`, `/audit-logs/export.csv`, `/audit-logs/retention-settings`, and `/audit-logs/retention-preview`. | Filter by action, entity type, actor, date, and search; review timestamp, actor, action, entity, summary, sanitized before/after metadata, export the current filter as CSV when permitted, and manage retention settings/dry-run preview when permitted. | Implemented | No scheduled export, automatic purge job, immutable external store, alerting, or anomaly detection. |
| `/settings/number-sequences` | Number sequence settings. | `/number-sequences` and selected `/number-sequences/:id`. | Review scope labels, prefixes, next numbers, padding, example next numbers, and update future numbering settings when permitted. | Implemented | No reset workflow, per-branch numbering, document-template numbering rules, or historical renumbering. |
| `/settings/zatca` | ZATCA settings, readiness, checklist, SDK readiness, and hash-chain status. | Profile, EGS units, logs, adapter config, readiness, checklist, SDK readiness including execution flag, Java, required range, config/work-dir blockers, hash mode, and reset-plan dry-run summary. | Update profile, create/update EGS, CSR, mock CSID, dry-run/local SDK readiness visibility, and review no-mutation hash-chain reset risks. | Groundwork only | Real ZATCA onboarding/submission not present; official samples pass locally under Java 11, LedgerByte standard fixture passes global validation, simplified fixture still needs signing/QR/certificate work, SDK hash replacement is not active, and execution remains disabled by default. |
| `/settings/team` | Team member administration. | Members and roles. | Change member role/status, send rate-limited invites through the active email provider, and show local preview links in mock mode when available. | Implemented | No approval workflow, provider bounce handling, or domain-auth validation yet. |
| `/settings/roles` | Role list and custom role creation. | Roles and permission matrix. | Create custom roles when allowed. | Implemented | System roles are read-only; no bulk templates beyond seed roles. |
| `/settings/roles/[id]` | Role detail and permission matrix. | Role detail. | Edit/delete custom roles when allowed. | Implemented | No approval workflow for role changes. |
| `/[...placeholder]` | Placeholder fallback for unbuilt sections. | None. | Navigation. | Placeholder | Replace as modules are implemented. |

## Inventory

Inventory routes are operational by default and clearly warn that opening balances, adjustment approvals, warehouse transfers, purchase receipts, and sales stock issues do not auto-create journals. Sales stock issue detail exposes explicit manual COGS post/reverse actions only when settings, preview readiness, and user permissions allow it. Purchase receipt detail exposes explicit manual inventory asset post/reverse actions only for compatible finalized `INVENTORY_CLEARING` bills and authorized users. Purchase receipt, bill, and purchase order pages show clearing and receipt matching visibility. Purchase bill pages expose direct vs inventory-clearing preview visibility. Inventory settings includes a read-only purchase receipt posting readiness panel with bill-mode compatibility counts. Inventory variance proposal pages expose accountant review, approval, explicit posting, reversal, voiding, preview, and event history without auto-posting from reports.

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/inventory/warehouses` | Warehouse list and creation. | Warehouses. | Create warehouse, view detail, archive/reactivate when allowed. | Implemented | No bin/location hierarchy. |
| `/inventory/warehouses/[id]` | Warehouse detail. | Warehouse, balances for that warehouse, recent movements, adjustments, and transfers involving the warehouse. | Review warehouse metadata, quantities, recent stock ledger rows, and operational inventory activity. | Implemented | No edit form on the detail page yet. |
| `/inventory/stock-movements` | Stock movement ledger. | Stock movements with optional filters. | Filter by item, warehouse, date range, and type; review generated adjustment and transfer rows. | Implemented | No bulk import/export. |
| `/inventory/stock-movements/new` | Opening balance movement creation. | Inventory-tracked items and active warehouses. | Create `OPENING_BALANCE` with positive quantity and optional unit cost. | Implemented | Adjustments and transfers are created through controlled workflows. |
| `/inventory/adjustments` | Inventory adjustment list. | Adjustments with item and warehouse. | Review number, item, warehouse, type, quantity, status, and navigate to detail/create. | Implemented | No bulk approval inbox. |
| `/inventory/adjustments/new` | Draft inventory adjustment creation. | Inventory-tracked items and active warehouses. | Create draft increase/decrease adjustment with optional unit cost and reason. | Implemented | No reason-code catalog. |
| `/inventory/adjustments/[id]` | Inventory adjustment detail. | Adjustment, item, warehouse, creator/approver/voider, movement links, and linked attachments. | Approve, void, delete/edit draft when allowed, and manage supporting attachments. | Implemented | No audit timeline beyond core timestamps. |
| `/inventory/adjustments/[id]/edit` | Draft inventory adjustment edit. | Adjustment, inventory-tracked items, active warehouses. | Edit draft-only adjustment fields. | Implemented | Approved and voided adjustments are locked by design. |
| `/inventory/transfers` | Warehouse transfer list. | Transfers with item and source/destination warehouses. | Review number, item, warehouses, quantity, status, and navigate to detail/create. | Implemented | No in-transit status. |
| `/inventory/transfers/new` | Warehouse transfer creation. | Inventory-tracked items and active warehouses. | Create posted transfer between different active warehouses. | Implemented | No shipping document or bin/location support. |
| `/inventory/transfers/[id]` | Warehouse transfer detail. | Transfer, item, source/destination warehouses, movement links, and linked attachments. | Void transfer when allowed and manage supporting attachments. | Implemented | No edit/delete after posting by design. |
| `/inventory/purchase-receipts` | Purchase receipt list. | Receipts with supplier, source PO/bill, warehouse, and status. | Review posted/voided receipts and navigate to create/detail. | Groundwork | No supplier delivery document or landed-cost workflow. |
| `/inventory/purchase-receipts/new` | Purchase receipt creation. | Suppliers, purchase orders, purchase bills, active warehouses, and source receiving statuses. | Receive tracked source lines or standalone supplier lines into a warehouse. | Groundwork | No barcode/serial capture or automatic receipt from bills/POs. |
| `/inventory/purchase-receipts/[id]` | Purchase receipt detail. | Receipt, lines, source document, warehouse, movement links, enhanced accounting preview, clearing reconciliation filter, and linked attachments. | Review stock movement links, receipt value, linked bill mode, matched bill value, value difference, matching summary, preview Dr Inventory Asset / Cr Inventory Clearing lines, warnings/blockers, clearing reconciliation state, manually post inventory asset with `inventory.receipts.postAsset` when eligible, reverse asset posting with `inventory.receipts.reverseAsset`, void when allowed, and manage supporting attachments. | Partial | No edit after posting, no automatic posting, no direct-mode receipt posting, no automatic variance journals, and no landed-cost workflow. |
| `/inventory/sales-stock-issues` | Sales stock issue list. | Issues with customer, invoice, warehouse, and status. | Review posted/voided issues and navigate to create/detail. | Groundwork | No delivery note workflow. |
| `/inventory/sales-stock-issues/new` | Sales stock issue creation. | Finalized sales invoices, active warehouses, and invoice stock issue status. | Issue tracked invoice lines from warehouse stock. | Groundwork | No automatic issue from invoice finalization. |
| `/inventory/sales-stock-issues/[id]` | Sales stock issue detail. | Issue, lines, sales invoice, warehouse, movement links, COGS preview, posting status, linked COGS journal ids, and linked attachments. | Review stock movement links, estimated unit cost/COGS, Dr COGS / Cr Inventory Asset preview lines, warnings, manually post COGS with `inventory.cogs.post`, reverse COGS with `inventory.cogs.reverse`, void when allowed, and manage supporting attachments. | Partial | No automatic COGS posting, delivery note workflow, returns workflow, FIFO, landed cost, or serial/batch UX. |
| `/inventory/balances` | Inventory balance table. | Derived item/warehouse balances. | View quantity on hand, simple cost/value estimates, total quantity by item, and quick links to adjustments/transfers/reports. | Implemented | Valuation is not accounting-grade. |
| `/inventory/settings` | Inventory settings. | Inventory settings, inventory accounting settings, purchase receipt posting readiness, and accounts when allowed. | Review/update valuation method, negative-stock flag, inventory value tracking, inventory accounting enable flag, account mappings including inventory clearing, purchase receipt posting mode, readiness blockers/warnings, bill-mode compatibility counts, and manual COGS/receipt asset no-auto-post warnings. | Groundwork | Settings enable manual COGS and compatible manual receipt asset posting only; the readiness panel remains advisory for automatic/broader rollout. |
| `/inventory/reports/stock-valuation` | Stock valuation report. | Stock valuation report. | Review quantity, average cost, estimated value, warnings, and grand total. | Groundwork | Operational estimate only; not a financial statement value. |
| `/inventory/reports/movement-summary` | Movement summary report. | Movement summary report plus item/warehouse filter lists. | Filter by date/item/warehouse and review opening/inbound/outbound/closing with movement type breakdown. | Groundwork | No PDF export and no accountant-approved financial interpretation. |
| `/inventory/reports/low-stock` | Low-stock report. | Low-stock report. | See tracked items at or below reorder point with reorder quantity and status. | Groundwork | Reorder points are planning fields only; no purchase automation. |
| `/inventory/reports/clearing-reconciliation` | Clearing reconciliation report. | Inventory clearing reconciliation report. | Filter by date/status/bill/receipt, review bill clearing debit vs active receipt clearing credit, linked receipts, warnings, GL clearing balance, and download CSV. | Implemented | Review-only; no automatic variance or adjustment journals. |
| `/inventory/reports/clearing-variance` | Clearing variance report. | Inventory clearing variance report. | Filter variance rows, review variance amount/reason/recommended action, linked bill/receipt, warnings, download CSV, and create a draft variance proposal when permitted. | Implemented | Report remains read-only; proposal creation creates no journal, and no automatic variance posting or landed-cost treatment exists. |
| `/inventory/variance-proposals` | Inventory variance proposal list. | Inventory variance proposals. | Review proposal number, reason, amount, status, supplier, source bill/receipt, and journal links; navigate to new/detail. | Implemented | No bulk approval queue or duplicate proposal detection. |
| `/inventory/variance-proposals/new` | New inventory variance proposal. | Accounts and optional clearing variance source query params. | Create a manual proposal with explicit debit/credit accounts or draft from a clearing variance row; no journal is created. | Implemented | Source-based proposal amount/accounts are recomputed by the API; UI does not expose landed-cost allocation. |
| `/inventory/variance-proposals/[id]` | Inventory variance proposal detail. | Proposal, accounting preview, source bill/receipt, events, and linked attachments. | Submit, approve, explicitly post, reverse, or void based on status and permissions; review Dr/Cr preview, timeline, and supporting attachments. | Implemented | Posting remains manual only; no automatic report-driven posting. |

## Reports

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/reports` | Reports index. | None. | Navigate to accounting reports. | Implemented | No custom report builder. |
| `/reports/general-ledger` | General Ledger. | Posted account activity by range/account. | Run filters, download CSV, download PDF. | Implemented | No saved filter presets. |
| `/reports/trial-balance` | Trial Balance. | Opening, period, and closing debit/credit columns. | Run filters, download CSV, download PDF. | Implemented | Needs accountant layout review. |
| `/reports/profit-and-loss` | Profit & Loss. | Revenue, cost of sales, expenses, and net profit. | Run filters, download CSV, download PDF. | Implemented | Needs accountant layout review. |
| `/reports/balance-sheet` | Balance Sheet. | Assets, liabilities, equity, retained earnings, and balance status. | Run as-of filter, download CSV, download PDF. | Implemented | Needs accountant layout review. |
| `/reports/vat-summary` | VAT Summary. | VAT payable/receivable activity from configured VAT accounts. | Run filters, download CSV, download PDF. | Implemented | Not an official VAT filing export. |
| `/reports/aged-receivables` | Aged Receivables. | Open finalized customer invoice balances by aging bucket. | Run as-of filter, download CSV, download PDF. | Implemented | No collection workflow. |
| `/reports/aged-payables` | Aged Payables. | Open finalized supplier bill balances by aging bucket. | Run as-of filter, download CSV, download PDF. | Implemented | No payment run workflow. |

## Contacts

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/contacts` | Customer/supplier list. | Contacts. | Create/update contacts. | Implemented | Import/export and duplicate management missing. |
| `/contacts/[id]` | Contact detail with ledgers/statements. | Contact, customer ledger/statement when applicable, supplier ledger/statement when applicable. | Load statements, download customer statement PDF, navigate source documents. | Implemented | Supplier statement PDF missing; supplier AP balance wording needs UX review. |

## Manual Journals

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/journal-entries` | Journal list. | Journal entries. | View/post/reverse navigation. | Implemented | Filters and GL drill-down missing. |
| `/journal-entries/new` | Create manual journal. | Accounts, tax rates. | Create draft journal. | Implemented | Recurring journal templates missing. |

## Sales

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/sales/invoices` | Invoice list. | Sales invoices. | Create, navigate detail. | Implemented | Bulk actions and filters limited. |
| `/sales/invoices/new` | Create invoice. | Customers, branches, accounts, tax rates, items. | Save draft. | Implemented | Quote/order conversion missing. |
| `/sales/invoices/[id]` | Invoice detail. | Invoice, payments, credit notes, allocations, stock issue status, ZATCA metadata, local SDK validation/hash comparison results, PDFs, and linked attachments. | Finalize, void, delete draft, PDF download, ZATCA local actions, SDK dry-run/local validation, no-mutation SDK hash comparison, create credit note, issue stock for remaining tracked finalized lines when allowed, and manage supporting attachments. | Implemented | ZATCA actions remain local/mock only; no production compliance, metadata hash replacement, or live official SDK execution by default. |
| `/sales/invoices/[id]/edit` | Edit draft invoice. | Invoice and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |
| `/sales/customer-payments` | Customer payment list. | Payments. | Navigate/create. | Implemented | Filters/export missing. |
| `/sales/customer-payments/new` | Create customer payment. | Customers, accounts, optional bank account profiles, open invoices. | Allocate and post payment. | Implemented | Bank import/gateway capture missing. |
| `/sales/customer-payments/[id]` | Payment detail. | Payment, receipt data, unapplied allocations, and linked attachments. | Void, PDF, apply/reverse unapplied allocations, refund link, and manage supporting attachments. | Implemented | Dedicated correction workflow missing. |
| `/sales/customer-refunds` | Customer refund list. | Refunds. | Navigate/create. | Implemented | Gateway status missing. |
| `/sales/customer-refunds/new` | Create manual refund. | Customers, refundable sources, accounts, optional bank account profiles. | Post refund. | Implemented | Bank/gateway integration missing. |
| `/sales/customer-refunds/[id]` | Refund detail. | Refund, PDF data, and linked attachments. | Void, download PDF, and manage supporting attachments. | Implemented | Remittance/send workflow missing. |
| `/sales/credit-notes` | Credit note list. | Credit notes. | Navigate/create. | Implemented | Filters/export missing. |
| `/sales/credit-notes/new` | Create credit note. | Customers, optional invoice, accounts, tax rates, items. | Save draft. | Implemented | ZATCA credit note XML missing. |
| `/sales/credit-notes/[id]` | Credit note detail. | Credit note, allocations, open invoices, PDF data, and linked attachments. | Finalize, void, delete draft, apply/reverse allocation, refund link, PDF, and manage supporting attachments. | Implemented | Dedicated audit timeline missing. |
| `/sales/credit-notes/[id]/edit` | Edit draft credit note. | Credit note and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |

## Purchases

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/purchases/purchase-orders` | Purchase order list. | Purchase orders. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/purchase-orders/new` | Create purchase order. | Suppliers, branches, accounts, tax rates, items. | Save draft non-posting PO. | Implemented | No supplier email/send workflow. |
| `/purchases/purchase-orders/[id]` | Purchase order detail. | Purchase order, lines, converted bill link, receiving status, receipt/bill matching status, and linked attachments. | PDF, approve, mark sent, close, void, delete draft, convert to bill, receive remaining tracked lines when allowed, review receipt value estimate plus matching warnings, and manage supporting attachments. | Implemented | No partial billing or approval chain. |
| `/purchases/purchase-orders/[id]/edit` | Edit draft purchase order. | PO and form dependencies. | Save draft changes. | Implemented | Not available after approval by design. |
| `/purchases/bills` | Purchase bill list. | Bills. | Navigate/create/finalize draft. | Implemented | Filters/export missing. |
| `/purchases/bills/new` | Create purchase bill. | Suppliers, branches, accounts, tax rates, items, and inventory posting mode. | Save draft in direct mode by default or select inventory-clearing mode after accountant review. | Implemented | Automatic receipt GL posting remains disabled. |
| `/purchases/bills/[id]` | Purchase bill detail. | Bill, lines, allocations, PDF data, source PO link, receiving status, receipt matching status, accounting preview, clearing reconciliation filter, and linked attachments. | Finalize direct-mode or compatible clearing-mode drafts, void, delete draft, PDF, supplier ledger link, receive remaining tracked finalized lines when allowed, review matched quantity/value warnings, receipt asset posted/reversed status, unposted clearing-mode receipt warning, clearing reconciliation mini-panel, direct vs clearing-mode preview journal lines, and manage supporting attachments. | Implemented | No multi-PO clearing workflow, direct-mode receipt posting, automatic variance journals, or accounting mutation from matching. |
| `/purchases/bills/[id]/edit` | Edit draft bill. | Bill and form dependencies, including inventory posting mode. | Save draft changes and choose direct or clearing mode. | Implemented | Not available after finalize by design; automatic receipt GL posting remains disabled. |
| `/purchases/supplier-payments` | Supplier payment list. | Supplier payments. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/supplier-payments/new` | Create supplier payment. | Suppliers, open bills, paid-through accounts, optional bank account profiles. | Allocate and post payment. | Implemented | Bank reconciliation/import missing. |
| `/purchases/supplier-payments/[id]` | Supplier payment detail. | Payment, allocations, receipt data, and linked attachments. | Void, receipt PDF, and manage supporting attachments. | Implemented | Remittance email/send missing. |
| `/purchases/supplier-refunds` | Supplier refund list. | Supplier refunds. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/supplier-refunds/new` | Create supplier refund. | Suppliers, refundable sources, accounts, optional bank account profiles. | Post refund. | Implemented | Bank reconciliation/import missing. |
| `/purchases/supplier-refunds/[id]` | Supplier refund detail. | Refund, PDF data, and linked attachments. | Void, download PDF, and manage supporting attachments. | Implemented | Remittance/send workflow missing. |
| `/purchases/cash-expenses` | Cash expense list. | Cash expenses. | Navigate/create/void. | Implemented | Filters/export missing. |
| `/purchases/cash-expenses/new` | Create cash expense. | Suppliers, items, accounts, tax rates, branches, optional bank account profiles. | Post cash expense. | Implemented | Receipt OCR and import missing. |
| `/purchases/cash-expenses/[id]` | Cash expense detail. | Cash expense, PDF data, and linked attachments. | Void, download PDF, and manage supporting attachments. | Implemented | OCR/import workflow missing. |

## Route-Level Risks

- Most implemented routes use API helper errors and smoke-level Playwright coverage, but this is not full visual regression testing.
- Supplier ledger/statement views use the same table component as customer ledgers; AP-specific wording should be refined.
- Settings and document routes are operational but not production-grade administration screens.
- Permission gating is MVP-grade UI hardening only; backend guards remain the source of truth.
- Placeholder route should be replaced as inventory, payroll, and other future modules are added.
