# Frontend Route Catalog

Audit date: 2026-05-13

Route source: `apps/web/src/app`

## Permission Behavior

- App routes are wrapped in a permission provider that loads `/auth/me` and the active organization membership.
- The sidebar filters top-level and child nav items by view permissions.
- Route protection shows an access-denied panel when a user lacks the page permission.
- High-risk buttons such as finalize, void, delete, apply/reverse allocation, fiscal period lock, ZATCA generate/check, and document settings save are hidden unless the active role has the matching permission.
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
| `/tax-rates` | Tax rates. | Tax rates. | Create/update rates. | Implemented | VAT report linkage missing. |
| `/branches` | Branch management. | Branches. | Create/update branches. | Implemented | Default branch normalization still missing; branch create/update is now gated by organization update permission. |
| `/items` | Product/service catalog. | Items, accounts, tax rates. | Create/update/delete items. | Partial | Inventory quantities and stock history missing. |
| `/documents` | Generated document archive. | Generated documents. | Download archived PDFs. | Implemented | Storage/provider status and filters could improve. |
| `/fiscal-periods` | Fiscal period management. | Fiscal periods. | Create, close, reopen, and lock periods. | Implemented | No unlock/admin approval or fiscal year wizard yet. |
| `/settings/documents` | Document PDF settings. | Organization document settings. | Update titles/colors/visibility. | Implemented | Template preview/designer missing. |
| `/settings/zatca` | ZATCA settings, readiness, checklist, SDK readiness. | Profile, EGS units, logs, adapter config, readiness, checklist, SDK readiness. | Update profile, create/update EGS, CSR, mock CSID, dry-run visibility. | Groundwork only | Real ZATCA onboarding/submission not present. |
| `/settings/team` | Team member administration. | Members and roles. | Change member role/status and create invite placeholders. | Implemented | No email invite delivery, password reset, or onboarding flow yet. |
| `/settings/roles` | Role list and custom role creation. | Roles and permission matrix. | Create custom roles when allowed. | Implemented | System roles are read-only; no bulk templates beyond seed roles. |
| `/settings/roles/[id]` | Role detail and permission matrix. | Role detail. | Edit/delete custom roles when allowed. | Implemented | No approval workflow for role changes. |
| `/[...placeholder]` | Placeholder fallback for unbuilt sections. | None. | Navigation. | Placeholder | Replace as modules are implemented. |

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
| `/sales/customer-payments/new` | Create customer payment. | Customers, accounts, open invoices. | Allocate and post payment. | Implemented | Bank import/gateway capture missing. |
| `/sales/customer-payments/[id]` | Payment detail. | Payment, receipt data, unapplied allocations. | Void, PDF, apply/reverse unapplied allocations, refund link. | Implemented | Dedicated correction workflow missing. |
| `/sales/customer-refunds` | Customer refund list. | Refunds. | Navigate/create. | Implemented | Gateway status missing. |
| `/sales/customer-refunds/new` | Create manual refund. | Customers, refundable sources, accounts. | Post refund. | Implemented | Bank/gateway integration missing. |
| `/sales/customer-refunds/[id]` | Refund detail. | Refund and PDF data. | Void and download PDF. | Implemented | Remittance/send workflow missing. |
| `/sales/credit-notes` | Credit note list. | Credit notes. | Navigate/create. | Implemented | Filters/export missing. |
| `/sales/credit-notes/new` | Create credit note. | Customers, optional invoice, accounts, tax rates, items. | Save draft. | Implemented | ZATCA credit note XML missing. |
| `/sales/credit-notes/[id]` | Credit note detail. | Credit note, allocations, open invoices, PDF data. | Finalize, void, delete draft, apply/reverse allocation, refund link, PDF. | Implemented | Dedicated audit timeline missing. |
| `/sales/credit-notes/[id]/edit` | Edit draft credit note. | Credit note and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |

## Purchases

| Route | Purpose | Data fetched | Actions | Status | Missing UX pieces |
| --- | --- | --- | --- | --- | --- |
| `/purchases/bills` | Purchase bill list. | Bills. | Navigate/create/finalize draft. | Implemented | Filters/export missing. |
| `/purchases/bills/new` | Create purchase bill. | Suppliers, branches, accounts, tax rates, items. | Save draft. | Implemented | Purchase order matching and vendor attachments missing. |
| `/purchases/bills/[id]` | Purchase bill detail. | Bill, lines, allocations, PDF data. | Finalize, void, delete draft, PDF, supplier ledger link. | Implemented | Debit note workflow missing. |
| `/purchases/bills/[id]/edit` | Edit draft bill. | Bill and form dependencies. | Save draft changes. | Implemented | Not available after finalize by design. |
| `/purchases/supplier-payments` | Supplier payment list. | Supplier payments. | Navigate/create. | Implemented | Filters/export missing. |
| `/purchases/supplier-payments/new` | Create supplier payment. | Suppliers, open bills, paid-through accounts. | Allocate and post payment. | Implemented | Bank reconciliation/import missing. |
| `/purchases/supplier-payments/[id]` | Supplier payment detail. | Payment, allocations, receipt data. | Void and receipt PDF. | Implemented | Remittance email/send missing. |

## Route-Level Risks

- Most implemented routes use API helper errors, but full browser E2E coverage is not yet present.
- Supplier ledger/statement views use the same table component as customer ledgers; AP-specific wording should be refined.
- Settings and document routes are operational but not production-grade administration screens.
- Permission gating is MVP-grade UI hardening only; backend guards remain the source of truth.
- Placeholder route should be replaced as reports, inventory, payroll, and bank modules are added.
