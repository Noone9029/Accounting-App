# Frontend Route Catalog

Audit date: 2026-05-13

Route source: `apps/web/src/app`

## Permission Behavior

- App routes are wrapped in a permission provider that loads `/auth/me` and the active organization membership.
- The sidebar filters top-level and child nav items by view permissions.
- Route protection shows an access-denied panel when a user lacks the page permission.
- High-risk buttons such as approve, convert, finalize, void, delete, apply/reverse allocation, bank account archive/reactivate, opening-balance posting, bank transfer voiding, statement import/match/categorize/ignore, reconciliation close/void, fiscal period lock, ZATCA generate/check, and document settings save are hidden unless the active role has the matching permission.
- Settings/Admin nav now includes Team Members for `users.view` and Roles & Permissions for `roles.view`.

## Auth And Setup

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/` | Entry route. | Auth/local state. | Redirect/navigation into app. | Implemented | Marketing/landing page intentionally minimal. |
| `/login` | User login. | None before submit. | Login and store token. | Implemented | Password reset and MFA missing. |
| `/register` | User/org registration. | None before submit. | Register account. | Implemented | Invite flow missing. |
| `/organization/setup` | Create/select organization setup. | Auth user/org state. | Create organization. | Implemented | Rich onboarding checklist missing. |

## Core App

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | App dashboard shell. | Current org/user summary. | Navigation. | Partial | Real KPIs and reports missing. |
| `/accounts` | Chart of accounts. | Accounts. | Create/update/delete accounts. | Implemented | Hierarchical drag/drop and COA templates missing. |
| `/bank-accounts` | Bank/cash account profile list. | Bank account profiles with linked accounts and ledger summaries. | View detail, create profile, archive/reactivate when allowed. | Implemented | No live feed, transfer fee, or FX workflow. |
| `/bank-accounts/new` | Link bank account profile. | Accounts and existing profiles. | Create profile for an unlinked active posting asset account. | Implemented | Cannot create chart account inline. |
| `/bank-accounts/[id]` | Bank account profile detail. | Profile summary and posted transaction rows when allowed. | Date filters, archive/reactivate, post opening balance when allowed, general-ledger link, statement import/transaction/reconciliation/reconciliations links. | Implemented | No statement attachments or live bank feed. |
| `/bank-accounts/[id]/edit` | Edit bank/cash metadata. | Profile, accounts, existing profiles. | Update metadata only; opening balance fields are disabled after posting. | Implemented | Linked account cannot be changed. |
| `/bank-accounts/[id]/statement-imports` | Local statement import batches. | Bank profile, import batches, preview results. | Paste CSV text or JSON rows, preview validation/totals/warnings, import valid rows with optional partial import, void unmatched imports when allowed. | Implemented | No direct file upload or OFX/CAMT parser. |
| `/bank-accounts/[id]/statement-transactions` | Statement transaction list. | Imported statement rows with filters. | Filter by status/date and open review page. | Implemented | Bulk matching not present. |
| `/bank-accounts/[id]/reconciliation` | Reconciliation summary. | Statement totals, ledger balance, latest closing balance, difference, imports, latest closed reconciliation, open draft flag, unreconciled count, and closed-through date. | Date filtering, unmatched-row navigation, and links to reconciliation list/new draft when allowed. | Implemented | Report downloads live on the reconciliation detail page. |
| `/bank-accounts/[id]/reconciliations` | Reconciliation record list. | Bank profile and reconciliation records. | View draft/pending/approved/closed/voided records and create new draft when allowed. | Implemented | No dedicated approval queue. |
| `/bank-accounts/[id]/reconciliations/new` | Create draft reconciliation. | Bank profile ledger summary. | Enter period, statement balances, notes, and create draft. | Implemented | No pre-close preview endpoint; ledger/difference are calculated after save. |
| `/bank-reconciliations/[id]` | Reconciliation detail. | Reconciliation detail, approval metadata, review history, and closed item snapshot. | Submit ready drafts, approve/reopen, close approved records, void allowed records, review items, and download CSV/PDF reports. | Implemented | No separate approval inbox or email delivery. |
| `/bank-statement-transactions/[id]` | Statement transaction review. | Statement row, match candidates, accounts. | Manual match, categorize to journal, or ignore when allowed and not locked by closed reconciliation. | Implemented | No auto-match or split categorization. |
| `/bank-transfers` | Bank transfer list. | Posted and voided transfers with from/to profiles and journal links. | Navigate/create/view transfers. | Implemented | No transfer fees, recurring transfers, reconciliation, or FX handling. |
| `/bank-transfers/new` | Create bank transfer. | Active bank account profiles. | Validate and post transfer between different active profiles. | Implemented | No scheduled transfer or fee line. |
| `/bank-transfers/[id]` | Bank transfer detail. | Transfer, profile/account links, journal links. | Void transfer when allowed. | Implemented | No edit/delete after posting by design. |
| `/tax-rates` | Tax rates. | Tax rates. | Create/update rates. | Implemented | VAT report linkage missing. |
| `/branches` | Branch management. | Branches. | Create/update branches. | Implemented | Default branch normalization still missing; branch create/update is now gated by organization update permission. |
| `/items` | Product/service catalog. | Items, accounts, tax rates. | Create/update/delete items. | Partial | Inventory quantities and stock history missing. |
| `/documents` | Generated document archive. | Generated documents, including operational and report PDFs. | Filter by document type/status and download archived PDFs. | Implemented | Storage/provider status and filters could improve. |
| `/fiscal-periods` | Fiscal period management. | Fiscal periods. | Create, close, reopen, and lock periods. | Implemented | No unlock/admin approval or fiscal year wizard yet. |
| `/settings/documents` | Document PDF settings. | Organization document settings. | Update titles/colors/visibility. | Implemented | Template preview/designer missing. |
| `/settings/zatca` | ZATCA settings, readiness, checklist, SDK readiness. | Profile, EGS units, logs, adapter config, readiness, checklist, SDK readiness. | Update profile, create/update EGS, CSR, mock CSID, dry-run visibility. | Groundwork only | Real ZATCA onboarding/submission not present. |
| `/settings/team` | Team member administration. | Members and roles. | Change member role/status and create invite placeholders. | Implemented | No email invite delivery, password reset, or onboarding flow yet. |
| `/settings/roles` | Role list and custom role creation. | Roles and permission matrix. | Create custom roles when allowed. | Implemented | System roles are read-only; no bulk templates beyond seed roles. |
| `/settings/roles/[id]` | Role detail and permission matrix. | Role detail. | Edit/delete custom roles when allowed. | Implemented | No approval workflow for role changes. |
| `/[...placeholder]` | Placeholder fallback for unbuilt sections. | None. | Navigation. | Placeholder | Replace as modules are implemented. |

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
| `/sales/invoices/[id]` | Invoice detail. | Invoice, payments, credit notes, allocations, ZATCA metadata, PDFs. | Finalize, void, delete draft, PDF download, ZATCA local actions, create credit note. | Implemented | Browser E2E and more polished error recovery needed. |
| `/sales/invoices/[id]/edit` | Edit draft invoice. | Invoice and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |
| `/sales/customer-payments` | Customer payment list. | Payments. | Navigate/create. | Implemented | Filters/export missing. |
| `/sales/customer-payments/new` | Create customer payment. | Customers, accounts, optional bank account profiles, open invoices. | Allocate and post payment. | Implemented | Bank import/gateway capture missing. |
| `/sales/customer-payments/[id]` | Payment detail. | Payment, receipt data, unapplied allocations. | Void, PDF, apply/reverse unapplied allocations, refund link. | Implemented | Dedicated correction workflow missing. |
| `/sales/customer-refunds` | Customer refund list. | Refunds. | Navigate/create. | Implemented | Gateway status missing. |
| `/sales/customer-refunds/new` | Create manual refund. | Customers, refundable sources, accounts, optional bank account profiles. | Post refund. | Implemented | Bank/gateway integration missing. |
| `/sales/customer-refunds/[id]` | Refund detail. | Refund and PDF data. | Void and download PDF. | Implemented | Remittance/send workflow missing. |
| `/sales/credit-notes` | Credit note list. | Credit notes. | Navigate/create. | Implemented | Filters/export missing. |
| `/sales/credit-notes/new` | Create credit note. | Customers, optional invoice, accounts, tax rates, items. | Save draft. | Implemented | ZATCA credit note XML missing. |
| `/sales/credit-notes/[id]` | Credit note detail. | Credit note, allocations, open invoices, PDF data. | Finalize, void, delete draft, apply/reverse allocation, refund link, PDF. | Implemented | Dedicated audit timeline missing. |
| `/sales/credit-notes/[id]/edit` | Edit draft credit note. | Credit note and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |

## Purchases

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/purchases/purchase-orders` | Purchase order list. | Purchase orders. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/purchase-orders/new` | Create purchase order. | Suppliers, branches, accounts, tax rates, items. | Save draft non-posting PO. | Implemented | No supplier email/send workflow. |
| `/purchases/purchase-orders/[id]` | Purchase order detail. | Purchase order, lines, converted bill link. | PDF, approve, mark sent, close, void, delete draft, convert to bill. | Implemented | No partial receiving, partial billing, or approval chain. |
| `/purchases/purchase-orders/[id]/edit` | Edit draft purchase order. | PO and form dependencies. | Save draft changes. | Implemented | Not available after approval by design. |
| `/purchases/bills` | Purchase bill list. | Bills. | Navigate/create/finalize draft. | Implemented | Filters/export missing. |
| `/purchases/bills/new` | Create purchase bill. | Suppliers, branches, accounts, tax rates, items. | Save draft. | Implemented | Vendor attachments missing. |
| `/purchases/bills/[id]` | Purchase bill detail. | Bill, lines, allocations, PDF data, source PO link. | Finalize, void, delete draft, PDF, supplier ledger link. | Implemented | No multi-PO or partial matching view. |
| `/purchases/bills/[id]/edit` | Edit draft bill. | Bill and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |
| `/purchases/supplier-payments` | Supplier payment list. | Supplier payments. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/supplier-payments/new` | Create supplier payment. | Suppliers, open bills, paid-through accounts, optional bank account profiles. | Allocate and post payment. | Implemented | Bank reconciliation/import missing. |
| `/purchases/supplier-payments/[id]` | Supplier payment detail. | Payment, allocations, receipt data. | Void and receipt PDF. | Implemented | Remittance email/send missing. |
| `/purchases/supplier-refunds` | Supplier refund list. | Supplier refunds. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/supplier-refunds/new` | Create supplier refund. | Suppliers, refundable sources, accounts, optional bank account profiles. | Post refund. | Implemented | Bank reconciliation/import missing. |
| `/purchases/supplier-refunds/[id]` | Supplier refund detail. | Refund and PDF data. | Void and download PDF. | Implemented | Remittance/send workflow missing. |
| `/purchases/cash-expenses` | Cash expense list. | Cash expenses. | Navigate/create/void. | Implemented | Filters/export missing. |
| `/purchases/cash-expenses/new` | Create cash expense. | Suppliers, items, accounts, tax rates, branches, optional bank account profiles. | Post cash expense. | Implemented | Receipt attachment/OCR and import missing. |
| `/purchases/cash-expenses/[id]` | Cash expense detail. | Cash expense and PDF data. | Void and download PDF. | Implemented | Attachment view missing. |

## Route-Level Risks

- Most implemented routes use API helper errors, but full browser E2E coverage is not yet present.
- Supplier ledger/statement views use the same table component as customer ledgers; AP-specific wording should be refined.
- Settings and document routes are operational but not production-grade administration screens.
- Permission gating is MVP-grade UI hardening only; backend guards remain the source of truth.
- Placeholder route should be replaced as inventory, payroll, and other future modules are added.
