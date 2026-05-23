# DEV-01 Route QA Log

Status: Part 3 sales/AR route QA completed
Date: 2026-05-23
Source state inspected: `690c4bc QA DEV-01 auth dashboard navigation routes`

## Scope And Rules

- DEV-01 is product-development QA only: inventory routes, batch runtime QA, record blockers, then fix only confirmed small frontend/runtime defects inside the active batch.
- Part 1 did not run app tests, browser E2E, smoke tests, migrations, seed/reset/delete commands, deploys, env changes, ZATCA execution, email sending, or production-hosting research.
- Part 2 used a local web dev server only on `http://127.0.0.1:3031`; Part 3 started only the local web app on `http://127.0.0.1:3032` and stopped it after browser access was blocked by the browser URL policy. No API/database/migration/seed/deploy/env/provider setting was started or changed.
- Route inventory is based on committed files from `git ls-files`, not local dirty/untracked marketing worktree files.
- Unrelated local web/marketing changes intentionally excluded from this inventory: `apps/web/src/app/page.tsx` working-tree edits and untracked `apps/web/src/app/ar/`, `pricing/`, `product/`, `readiness/`, `resources/`, `workflows/`, `apps/web/src/app/marketing.test.tsx`, and `apps/web/src/components/marketing/`.
- AWS remains future production direction only. Vercel remains beta/user-testing/staging only.

## Web App Surfaces Inspected

- Committed route tree: `apps/web/src/app`, with 113 committed `page.tsx` routes including root, auth routes, app routes, and one catch-all placeholder route.
- App package/config: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/jest.config.cjs`, `apps/web/tsconfig.json`, Tailwind/PostCSS configs.
- Root scripts: `package.json` includes `build`, `test`, `typecheck`, `e2e`, `test:visual`, smoke scripts, and database/ZATCA scripts that were not run in this thread.
- E2E/visual setup: `playwright.config.ts`, `playwright.visual.config.ts`, `tests/e2e/*`, `tests/visual/*`, and `.github/workflows/deployed-e2e.yml`.
- Auth/session helpers: `apps/web/src/lib/api.ts`, `components/forms/auth-form.tsx`, `components/permissions/permission-provider.tsx`, and `components/permissions/permission-boundary.tsx`.
- Navigation/sidebar/menu config: `apps/web/src/lib/sidebar-nav.ts`, `components/app-shell/sidebar.tsx`, and route permission mapping in `apps/web/src/lib/permissions.ts`.
- Placeholder behavior: `apps/web/src/app/(app)/[...placeholder]/page.tsx` renders static "Module not implemented yet" scaffolding for future modules.
- API base URL: `NEXT_PUBLIC_API_URL` with fallback `http://localhost:4000`; `apiRequest` sends bearer token from `localStorage`, `x-organization-id`, and no-store headers by default.

## Route Inventory

Routes not included in completed DEV-01 batches remain `Not tested`.

### Auth/Public

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `apps/web/src/app/page.tsx` | Redirects root traffic to dashboard | Next redirect to `/dashboard` | Redirect target requires `dashboard.view` | Critical | Code-reviewed only |
| `/login` | `apps/web/src/app/(auth)/login/page.tsx` | Login form and session bootstrap | `POST /auth/login`, `GET /auth/me` | Public route; auth API call uses `auth: false` | Critical | Blocked |
| `/register` | `apps/web/src/app/(auth)/register/page.tsx` | Account registration and setup handoff | `POST /auth/register` | Public route; auth API call uses `auth: false` | Critical | Blocked |
| `/password-reset` | `apps/web/src/app/(auth)/password-reset/page.tsx` | Password reset request | `POST /auth/password-reset/request` | Public route; API call uses `auth: false` | Medium | Blocked |
| `/password-reset/confirm` | `apps/web/src/app/(auth)/password-reset/confirm/page.tsx` | Password reset token confirmation | `POST /auth/password-reset/confirm` | Public route; API call uses `auth: false` | Medium | Passed |
| `/invite/accept` | `apps/web/src/app/(auth)/invite/accept/page.tsx` | Invite preview and acceptance | `GET /auth/invitations/:token/preview`, `POST /auth/invitations/:token/accept` | Public route; API calls use `auth: false` | Critical | Blocked |

### Dashboard/Onboarding

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `apps/web/src/app/(app)/dashboard/page.tsx` | KPI dashboard, attention items, quick actions | `GET /dashboard/summary`, `GET /dashboard/onboarding-checklist` | Authenticated; `dashboard.view` | Critical | Blocked |
| `/setup` | `apps/web/src/app/(app)/setup/page.tsx` | Guided read-only first-workflow checklist | `GET /dashboard/onboarding-checklist` | Authenticated; `dashboard.view` | Critical | Blocked |
| `/organization/setup` | `apps/web/src/app/(app)/organization/setup/page.tsx` | Create first organization and tenant foundation data | `POST /organizations` | Authenticated app-shell route; no role permission so a logged-in user without memberships can create the first organization | Critical | Blocked |

### Sales/AR

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/contacts` | `apps/web/src/app/(app)/contacts/page.tsx` | Customer/supplier contact list and create | Contacts API | Authenticated; `contacts.view` | High | Blocked |
| `/contacts/[id]` | `apps/web/src/app/(app)/contacts/[id]/page.tsx` | Contact detail, ledgers, customer/supplier statements | Contacts, ledgers/statements, PDFs, attachments | Authenticated; `contacts.view` | High | Blocked |
| `/sales/invoices` | `apps/web/src/app/(app)/sales/invoices/page.tsx` | Sales invoice list | Sales invoices API | Authenticated; `salesInvoices.view` | High | Blocked |
| `/sales/invoices/new` | `apps/web/src/app/(app)/sales/invoices/new/page.tsx` | Create draft sales invoice | Sales invoices, contacts, items, taxes | Authenticated; `salesInvoices.create` | Critical | Blocked |
| `/sales/invoices/[id]` | `apps/web/src/app/(app)/sales/invoices/[id]/page.tsx` | Invoice detail, finalize/void/PDF/attachments | Sales invoices, PDF/archive, attachments, ZATCA metadata | Authenticated; `salesInvoices.view` | Critical | Blocked |
| `/sales/invoices/[id]/edit` | `apps/web/src/app/(app)/sales/invoices/[id]/edit/page.tsx` | Edit draft sales invoice | Sales invoices, contacts, items, taxes | Authenticated; `salesInvoices.update` | Critical | Blocked |
| `/sales/customer-payments` | `apps/web/src/app/(app)/sales/customer-payments/page.tsx` | Customer payment list | Customer payments API | Authenticated; `customerPayments.view` | High | Blocked |
| `/sales/customer-payments/new` | `apps/web/src/app/(app)/sales/customer-payments/new/page.tsx` | Record customer payment | Customer payments, invoices, bank accounts | Authenticated; `customerPayments.create` | Critical | Blocked |
| `/sales/customer-payments/[id]` | `apps/web/src/app/(app)/sales/customer-payments/[id]/page.tsx` | Payment detail, receipt/PDF/void | Customer payments, allocations, generated documents | Authenticated; `customerPayments.view` | Critical | Blocked |
| `/sales/customer-refunds` | `apps/web/src/app/(app)/sales/customer-refunds/page.tsx` | Customer refund list | Customer refunds API | Authenticated; `customerRefunds.view` | High | Blocked |
| `/sales/customer-refunds/new` | `apps/web/src/app/(app)/sales/customer-refunds/new/page.tsx` | Create customer refund | Customer refunds, unapplied payments/credits, bank accounts | Authenticated; `customerRefunds.create` | Critical | Blocked |
| `/sales/customer-refunds/[id]` | `apps/web/src/app/(app)/sales/customer-refunds/[id]/page.tsx` | Customer refund detail/PDF/void | Customer refunds and generated documents | Authenticated; `customerRefunds.view` | Critical | Blocked |
| `/sales/credit-notes` | `apps/web/src/app/(app)/sales/credit-notes/page.tsx` | Credit note list | Credit notes API | Authenticated; `creditNotes.view` | High | Blocked |
| `/sales/credit-notes/new` | `apps/web/src/app/(app)/sales/credit-notes/new/page.tsx` | Create credit note | Credit notes, contacts, invoices, items, taxes | Authenticated; `creditNotes.create` | Critical | Blocked |
| `/sales/credit-notes/[id]` | `apps/web/src/app/(app)/sales/credit-notes/[id]/page.tsx` | Credit note detail, allocation/PDF/void | Credit notes, allocations, PDF/archive | Authenticated; `creditNotes.view` | Critical | Blocked |
| `/sales/credit-notes/[id]/edit` | `apps/web/src/app/(app)/sales/credit-notes/[id]/edit/page.tsx` | Edit draft credit note | Credit notes, contacts, invoices, items, taxes | Authenticated; `creditNotes.create` | Critical | Blocked |

### Purchases/AP

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/purchases/purchase-orders` | `apps/web/src/app/(app)/purchases/purchase-orders/page.tsx` | Purchase order list | Purchase orders API | Authenticated; `purchaseOrders.view` | High | Not tested |
| `/purchases/purchase-orders/new` | `apps/web/src/app/(app)/purchases/purchase-orders/new/page.tsx` | Create purchase order | Purchase orders, suppliers, items, taxes | Authenticated; `purchaseOrders.create` | Critical | Not tested |
| `/purchases/purchase-orders/[id]` | `apps/web/src/app/(app)/purchases/purchase-orders/[id]/page.tsx` | Purchase order detail, approve/send/close/void/PDF | Purchase orders, PDF/archive, receipt/matching status | Authenticated; `purchaseOrders.view` | Critical | Not tested |
| `/purchases/purchase-orders/[id]/edit` | `apps/web/src/app/(app)/purchases/purchase-orders/[id]/edit/page.tsx` | Edit purchase order | Purchase orders, suppliers, items, taxes | Authenticated; `purchaseOrders.update` | Critical | Not tested |
| `/purchases/bills` | `apps/web/src/app/(app)/purchases/bills/page.tsx` | Purchase bill list | Purchase bills API | Authenticated; `purchaseBills.view` | High | Not tested |
| `/purchases/bills/new` | `apps/web/src/app/(app)/purchases/bills/new/page.tsx` | Create purchase bill | Purchase bills, suppliers, accounts, items, taxes | Authenticated; `purchaseBills.create` | Critical | Not tested |
| `/purchases/bills/[id]` | `apps/web/src/app/(app)/purchases/bills/[id]/page.tsx` | Purchase bill detail, finalize/void/PDF/attachments | Purchase bills, PDF/archive, attachments, inventory matching | Authenticated; `purchaseBills.view` | Critical | Not tested |
| `/purchases/bills/[id]/edit` | `apps/web/src/app/(app)/purchases/bills/[id]/edit/page.tsx` | Edit draft purchase bill | Purchase bills, suppliers, accounts, items, taxes | Authenticated; `purchaseBills.update` | Critical | Not tested |
| `/purchases/supplier-payments` | `apps/web/src/app/(app)/purchases/supplier-payments/page.tsx` | Supplier payment list | Supplier payments API | Authenticated; `supplierPayments.view` | High | Not tested |
| `/purchases/supplier-payments/new` | `apps/web/src/app/(app)/purchases/supplier-payments/new/page.tsx` | Record supplier payment | Supplier payments, bills, bank accounts | Authenticated; `supplierPayments.create` | Critical | Not tested |
| `/purchases/supplier-payments/[id]` | `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.tsx` | Supplier payment detail/receipt/void | Supplier payments, allocations, generated documents | Authenticated; `supplierPayments.view` | Critical | Not tested |
| `/purchases/supplier-refunds` | `apps/web/src/app/(app)/purchases/supplier-refunds/page.tsx` | Supplier refund list | Supplier refunds API | Authenticated; `supplierRefunds.view` | High | Not tested |
| `/purchases/supplier-refunds/new` | `apps/web/src/app/(app)/purchases/supplier-refunds/new/page.tsx` | Create supplier refund | Supplier refunds, supplier credits/payments, bank accounts | Authenticated; `supplierRefunds.create` | Critical | Not tested |
| `/purchases/supplier-refunds/[id]` | `apps/web/src/app/(app)/purchases/supplier-refunds/[id]/page.tsx` | Supplier refund detail/void | Supplier refunds API | Authenticated; `supplierRefunds.view` | Critical | Not tested |
| `/purchases/cash-expenses` | `apps/web/src/app/(app)/purchases/cash-expenses/page.tsx` | Cash expense list | Cash expenses API | Authenticated; `cashExpenses.view` | High | Not tested |
| `/purchases/cash-expenses/new` | `apps/web/src/app/(app)/purchases/cash-expenses/new/page.tsx` | Create cash expense | Cash expenses, contacts, accounts, tax rates, bank accounts | Authenticated; `cashExpenses.create` | Critical | Not tested |
| `/purchases/cash-expenses/[id]` | `apps/web/src/app/(app)/purchases/cash-expenses/[id]/page.tsx` | Cash expense detail/void | Cash expenses API | Authenticated; `cashExpenses.view` | Critical | Not tested |
| `/purchases/debit-notes` | `apps/web/src/app/(app)/purchases/debit-notes/page.tsx` | Purchase debit note list | Purchase debit notes API | Authenticated; `purchaseDebitNotes.view` | High | Not tested |
| `/purchases/debit-notes/new` | `apps/web/src/app/(app)/purchases/debit-notes/new/page.tsx` | Create purchase debit note | Purchase debit notes, suppliers, bills, items, taxes | Authenticated; `purchaseDebitNotes.create` | Critical | Not tested |
| `/purchases/debit-notes/[id]` | `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.tsx` | Debit note detail, allocation/PDF/void | Purchase debit notes, allocations, PDF/archive | Authenticated; `purchaseDebitNotes.view` | Critical | Not tested |
| `/purchases/debit-notes/[id]/edit` | `apps/web/src/app/(app)/purchases/debit-notes/[id]/edit/page.tsx` | Edit draft purchase debit note | Purchase debit notes, suppliers, bills, items, taxes | Authenticated; `purchaseDebitNotes.create` | Critical | Not tested |

### Banking/Reconciliation

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/bank-accounts` | `apps/web/src/app/(app)/bank-accounts/page.tsx` | Bank/cash profile list | Bank account profiles API | Authenticated; `bankAccounts.view` | High | Not tested |
| `/bank-accounts/new` | `apps/web/src/app/(app)/bank-accounts/new/page.tsx` | Create bank/cash profile | Bank accounts, chart of accounts | Authenticated; `bankAccounts.manage` | Critical | Not tested |
| `/bank-accounts/[id]` | `apps/web/src/app/(app)/bank-accounts/[id]/page.tsx` | Bank account detail, ledger, statements, reconciliation links | Bank accounts, journal lines, statements, reconciliations | Authenticated; `bankAccounts.view` | Critical | Not tested |
| `/bank-accounts/[id]/edit` | `apps/web/src/app/(app)/bank-accounts/[id]/edit/page.tsx` | Edit bank/cash profile | Bank accounts, chart of accounts | Authenticated; `bankAccounts.manage` | Critical | Not tested |
| `/bank-accounts/[id]/reconciliation` | `apps/web/src/app/(app)/bank-accounts/[id]/reconciliation/page.tsx` | Single-account reconciliation summary/legacy view | Bank statement and reconciliation summary APIs | Authenticated; `bankStatements.view` | Critical | Not tested |
| `/bank-accounts/[id]/reconciliations` | `apps/web/src/app/(app)/bank-accounts/[id]/reconciliations/page.tsx` | Account reconciliation list | Bank reconciliations API | Authenticated; `bankReconciliations.view` | Critical | Not tested |
| `/bank-accounts/[id]/reconciliations/new` | `apps/web/src/app/(app)/bank-accounts/[id]/reconciliations/new/page.tsx` | Create draft reconciliation | Bank reconciliations, bank accounts, statement transactions | Authenticated; `bankReconciliations.view` | Critical | Not tested |
| `/bank-accounts/[id]/statement-imports` | `apps/web/src/app/(app)/bank-accounts/[id]/statement-imports/page.tsx` | Manual statement import and preview | Bank statement preview/import APIs | Authenticated; `bankStatements.view` | Critical | Not tested |
| `/bank-accounts/[id]/statement-transactions` | `apps/web/src/app/(app)/bank-accounts/[id]/statement-transactions/page.tsx` | Statement transaction list for account | Bank statement transactions API | Authenticated; `bankStatements.view` | Critical | Not tested |
| `/bank-reconciliations/[id]` | `apps/web/src/app/(app)/bank-reconciliations/[id]/page.tsx` | Reconciliation detail, review/close/void | Bank reconciliations, review events, item snapshots | Authenticated; `bankReconciliations.view` | Critical | Not tested |
| `/bank-statement-transactions/[id]` | `apps/web/src/app/(app)/bank-statement-transactions/[id]/page.tsx` | Statement row detail, match/categorize/ignore | Statement transactions, matching/categorization APIs | Authenticated; `bankStatements.view` | Critical | Not tested |
| `/bank-transfers` | `apps/web/src/app/(app)/bank-transfers/page.tsx` | Bank transfer list | Bank transfers API | Authenticated; `bankTransfers.view` | High | Not tested |
| `/bank-transfers/new` | `apps/web/src/app/(app)/bank-transfers/new/page.tsx` | Create bank transfer | Bank transfers, bank account profiles | Authenticated; `bankTransfers.create` | Critical | Not tested |
| `/bank-transfers/[id]` | `apps/web/src/app/(app)/bank-transfers/[id]/page.tsx` | Bank transfer detail/void | Bank transfers API | Authenticated; `bankTransfers.view` | Critical | Not tested |

### Inventory

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/items` | `apps/web/src/app/(app)/items/page.tsx` | Products/services and inventory-tracked item list | Items, accounts, tax rates, inventory balances | Authenticated; `items.view` | High | Not tested |
| `/inventory/warehouses` | `apps/web/src/app/(app)/inventory/warehouses/page.tsx` | Warehouse list/manage | Warehouses API | Authenticated; `warehouses.view` | High | Not tested |
| `/inventory/warehouses/[id]` | `apps/web/src/app/(app)/inventory/warehouses/[id]/page.tsx` | Warehouse detail and stock movement drilldown | Warehouses, stock movements, balances | Authenticated; `warehouses.view` | Critical | Not tested |
| `/inventory/stock-movements` | `apps/web/src/app/(app)/inventory/stock-movements/page.tsx` | Stock movement ledger | Stock movements, warehouses, items | Authenticated; `stockMovements.view` | High | Not tested |
| `/inventory/stock-movements/new` | `apps/web/src/app/(app)/inventory/stock-movements/new/page.tsx` | Create manual stock movement | Stock movements, warehouses, items | Authenticated; `stockMovements.create` | Critical | Not tested |
| `/inventory/adjustments` | `apps/web/src/app/(app)/inventory/adjustments/page.tsx` | Inventory adjustment list | Inventory adjustments API | Authenticated; `inventoryAdjustments.view` | High | Not tested |
| `/inventory/adjustments/new` | `apps/web/src/app/(app)/inventory/adjustments/new/page.tsx` | Create inventory adjustment | Adjustments, warehouses, items | Authenticated; `inventoryAdjustments.create` | Critical | Not tested |
| `/inventory/adjustments/[id]` | `apps/web/src/app/(app)/inventory/adjustments/[id]/page.tsx` | Adjustment detail, approve/void | Adjustments, stock movements | Authenticated; `inventoryAdjustments.view` | Critical | Not tested |
| `/inventory/adjustments/[id]/edit` | `apps/web/src/app/(app)/inventory/adjustments/[id]/edit/page.tsx` | Edit draft inventory adjustment | Adjustments, warehouses, items | Authenticated; `inventoryAdjustments.create` | Critical | Not tested |
| `/inventory/transfers` | `apps/web/src/app/(app)/inventory/transfers/page.tsx` | Warehouse transfer list | Warehouse transfers API | Authenticated; `warehouseTransfers.view` | High | Not tested |
| `/inventory/transfers/new` | `apps/web/src/app/(app)/inventory/transfers/new/page.tsx` | Create warehouse transfer | Transfers, warehouses, items | Authenticated; `warehouseTransfers.create` | Critical | Not tested |
| `/inventory/transfers/[id]` | `apps/web/src/app/(app)/inventory/transfers/[id]/page.tsx` | Warehouse transfer detail/void | Transfers, stock movements | Authenticated; `warehouseTransfers.view` | Critical | Not tested |
| `/inventory/purchase-receipts` | `apps/web/src/app/(app)/inventory/purchase-receipts/page.tsx` | Purchase receipt list | Purchase receipts API | Authenticated; `purchaseReceiving.view` | High | Not tested |
| `/inventory/purchase-receipts/new` | `apps/web/src/app/(app)/inventory/purchase-receipts/new/page.tsx` | Create manual purchase receipt | Receipts, purchase orders/bills, warehouses, items | Authenticated; `purchaseReceiving.create` | Critical | Not tested |
| `/inventory/purchase-receipts/[id]` | `apps/web/src/app/(app)/inventory/purchase-receipts/[id]/page.tsx` | Purchase receipt detail/void/posting preview | Receipts, stock movements, receipt asset posting APIs | Authenticated; `purchaseReceiving.view` | Critical | Not tested |
| `/inventory/sales-stock-issues` | `apps/web/src/app/(app)/inventory/sales-stock-issues/page.tsx` | Sales stock issue list | Sales stock issues API | Authenticated; `salesStockIssue.view` | High | Not tested |
| `/inventory/sales-stock-issues/new` | `apps/web/src/app/(app)/inventory/sales-stock-issues/new/page.tsx` | Create manual sales stock issue | Sales stock issues, invoices, warehouses, items | Authenticated; `salesStockIssue.create` | Critical | Not tested |
| `/inventory/sales-stock-issues/[id]` | `apps/web/src/app/(app)/inventory/sales-stock-issues/[id]/page.tsx` | Sales stock issue detail/void/COGS preview | Sales stock issues, stock movements, COGS APIs | Authenticated; `salesStockIssue.view` | Critical | Not tested |
| `/inventory/balances` | `apps/web/src/app/(app)/inventory/balances/page.tsx` | Derived inventory quantity/cost balance view | `GET /inventory/balances` | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/settings` | `apps/web/src/app/(app)/inventory/settings/page.tsx` | Inventory accounting/valuation settings | Inventory accounting settings APIs | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/reports/stock-valuation` | `apps/web/src/app/(app)/inventory/reports/stock-valuation/page.tsx` | Operational stock valuation report | Inventory report endpoints | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/reports/movement-summary` | `apps/web/src/app/(app)/inventory/reports/movement-summary/page.tsx` | Inventory movement summary report | Inventory report endpoints | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/reports/low-stock` | `apps/web/src/app/(app)/inventory/reports/low-stock/page.tsx` | Low-stock report | Inventory report endpoints | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/reports/clearing-reconciliation` | `apps/web/src/app/(app)/inventory/reports/clearing-reconciliation/page.tsx` | Inventory clearing reconciliation report | Inventory report endpoints | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/reports/clearing-variance` | `apps/web/src/app/(app)/inventory/reports/clearing-variance/page.tsx` | Inventory clearing variance report | Inventory report endpoints | Authenticated; `inventory.view` | High | Not tested |
| `/inventory/variance-proposals` | `apps/web/src/app/(app)/inventory/variance-proposals/page.tsx` | Variance proposal list | Variance proposal APIs | Authenticated; `inventory.varianceProposalsView` | High | Not tested |
| `/inventory/variance-proposals/new` | `apps/web/src/app/(app)/inventory/variance-proposals/new/page.tsx` | Create variance proposal | Variance proposals, clearing variance/accounting APIs | Authenticated; `inventory.varianceProposalsCreate` | Critical | Not tested |
| `/inventory/variance-proposals/[id]` | `apps/web/src/app/(app)/inventory/variance-proposals/[id]/page.tsx` | Variance proposal detail, approve/post/reverse/void | Variance proposal and accounting APIs | Authenticated; `inventory.varianceProposalsView` | Critical | Not tested |

### Reports/Documents

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/reports` | `apps/web/src/app/(app)/reports/page.tsx` | Reports landing page | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/general-ledger` | `apps/web/src/app/(app)/reports/general-ledger/page.tsx` | General ledger report | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/trial-balance` | `apps/web/src/app/(app)/reports/trial-balance/page.tsx` | Trial balance report | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/profit-and-loss` | `apps/web/src/app/(app)/reports/profit-and-loss/page.tsx` | Profit and loss report | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/balance-sheet` | `apps/web/src/app/(app)/reports/balance-sheet/page.tsx` | Balance sheet report | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/vat-summary` | `apps/web/src/app/(app)/reports/vat-summary/page.tsx` | VAT summary report, not official filing | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/aged-receivables` | `apps/web/src/app/(app)/reports/aged-receivables/page.tsx` | AR aging report | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/reports/aged-payables` | `apps/web/src/app/(app)/reports/aged-payables/page.tsx` | AP aging report | Reports JSON/CSV/PDF endpoints | Authenticated; `reports.view` | High | Not tested |
| `/documents` | `apps/web/src/app/(app)/documents/page.tsx` | Generated document archive | Generated-document archive and download endpoints | Authenticated; `generatedDocuments.view` OR `documents.view` | High | Not tested |

### Settings/Admin/Audit

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/accounts` | `apps/web/src/app/(app)/accounts/page.tsx` | Chart of accounts | Accounts API | Authenticated; `accounts.view` | High | Not tested |
| `/journal-entries` | `apps/web/src/app/(app)/journal-entries/page.tsx` | Manual journal list/post/reverse | Journal entries and accounts | Authenticated; `journals.view` | High | Not tested |
| `/journal-entries/new` | `apps/web/src/app/(app)/journal-entries/new/page.tsx` | Create manual journal | Journal entries and accounts | Authenticated; `journals.create` | Critical | Not tested |
| `/tax-rates` | `apps/web/src/app/(app)/tax-rates/page.tsx` | Tax rates | Tax rates API | Authenticated; `taxRates.view` | High | Not tested |
| `/fiscal-periods` | `apps/web/src/app/(app)/fiscal-periods/page.tsx` | Fiscal periods and posting locks | Fiscal periods API | Authenticated; `fiscalPeriods.view` | High | Not tested |
| `/branches` | `apps/web/src/app/(app)/branches/page.tsx` | Organization branch list | Organization/branches APIs | Authenticated; `organization.view` | High | Not tested |
| `/settings/team` | `apps/web/src/app/(app)/settings/team/page.tsx` | Organization members and invites | Organization members, roles, invites | Authenticated; `users.view` | Critical | Not tested |
| `/settings/roles` | `apps/web/src/app/(app)/settings/roles/page.tsx` | Roles and permissions list | Roles and permissions APIs | Authenticated; `roles.view` | Critical | Not tested |
| `/settings/roles/[id]` | `apps/web/src/app/(app)/settings/roles/[id]/page.tsx` | Role detail and permission matrix | Roles and permissions APIs | Authenticated; `roles.view` | Critical | Not tested |
| `/settings/documents` | `apps/web/src/app/(app)/settings/documents/page.tsx` | Document/PDF settings | Document settings API | Authenticated; `documentSettings.view` | Medium | Not tested |
| `/settings/storage` | `apps/web/src/app/(app)/settings/storage/page.tsx` | Storage, backup, restore readiness | Storage readiness, backup readiness/evidence, migration plans | Authenticated; `documentSettings.view` OR `attachments.manage` | High | Not tested |
| `/settings/email-outbox` | `apps/web/src/app/(app)/settings/email-outbox/page.tsx` | Email readiness, outbox, diagnostics, suppressions | Email readiness/outbox/diagnostics/events/suppressions APIs | Authenticated; `emailOutbox.view` | High | Not tested |
| `/settings/audit-logs` | `apps/web/src/app/(app)/settings/audit-logs/page.tsx` | Audit log search/export and retention preview | Audit logs, retention settings, CSV export | Authenticated; `auditLogs.view` | High | Not tested |
| `/settings/number-sequences` | `apps/web/src/app/(app)/settings/number-sequences/page.tsx` | Document numbering settings | Number sequences API | Authenticated; `numberSequences.view` | High | Not tested |
| `/settings/zatca` | `apps/web/src/app/(app)/settings/zatca/page.tsx` | Local/mock ZATCA readiness and EGS controls | ZATCA profile/readiness/EGS/CSR/hash/custody APIs | Authenticated; `zatca.view` | High | Not tested |

### Placeholder/Unimplemented Routes

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/[...placeholder]` | `apps/web/src/app/(app)/[...placeholder]/page.tsx` | Catch-all scaffold for unimplemented modules | No module API; static placeholder from `titleMap` | Authenticated app-shell route; unmatched paths default to `dashboard.view` | Low | Blocked |

Known titleMap placeholder keys in code: `/get-started`, `/inbox`, `/reports`, `/sales`, `/sales/quotes`, `/sales/invoices`, `/sales/customer-payments`, `/sales/recurring-invoices`, `/sales/credit-notes`, `/sales/cash-invoices`, `/sales/delivery-notes`, `/sales/api-invoices`, `/purchases`, `/purchases/bills`, `/purchases/supplier-payments`, `/purchases/cash-expenses`, `/purchases/debit-notes`, `/purchases/purchase-orders`, `/beneficiaries`, `/payroll`, `/products`, `/accounting`, `/bank-accounts`, `/fixed-assets`, `/cost-centers`, `/projects`, `/branches`, `/developer`, `/developer/api-keys`, `/integrations`, and `/document-templates`.

Some of those paths now have real committed pages and therefore do not hit the catch-all. The risk is highest for future-module paths that are not real files, such as `/sales/quotes`, `/sales/recurring-invoices`, `/fixed-assets`, `/payroll`, `/developer/api-keys`, `/integrations`, and `/document-templates`.

## DEV-01 Part 2 Summary

- Latest pushed state inspected: `a64b0cb Start DEV-01 route QA inventory`; `HEAD...origin/main` was `0 0` after fetching `origin/main`.
- Local worktree warning: unrelated edits remained in `apps/web/src/app/page.tsx` and untracked marketing/web files; they were not edited, staged, or used as evidence for the committed root route.
- Runtime method: started only `@ledgerbyte/web` with Next dev on `http://127.0.0.1:3031` and used browser runtime checks for the Part 2 routes.
- API blocker: `http://localhost:4000/health` was not reachable within the configured local timeout, so API-backed success flows and authenticated seeded-user flows were blocked instead of treated as passed.
- Small frontend fix applied: app-shell routes now require a loaded user before rendering child content, `/setup` explicitly requires `dashboard.view`, and unmatched app-shell placeholder routes default to `dashboard.view`.
- No accounting logic, API behavior, schema, migrations, seed/reset/delete, deploys, environment variables, ZATCA behavior, email behavior, customer data, production docs, Vercel/Supabase settings, or hosting research changed.

### Part 2 Route Results

| Route path | QA status | QA method | Actual result | Defects found | Severity | Fix applied | Remaining follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Code-reviewed only | Code review | Committed `apps/web/src/app/page.tsx` redirects to `/dashboard`. Browser runtime was not used because the working tree has unrelated root-page edits. | No committed-route defect found. | Low | None | Re-run runtime root redirect after unrelated `page.tsx` changes are resolved or from a clean worktree. |
| `/login` | Blocked | Browser runtime and code review | Page loaded with `Log in` heading, required email/password controls, register link, and reset link. | Login submit/success path could not be safely completed because local API was unreachable. | Blocker | None | Re-test with already-running local API/database and documented non-production credentials. |
| `/register` | Blocked | Browser runtime and code review | Page loaded with `Create account` heading, required name/email/password controls, and login link. | Registration success and handoff to `/organization/setup` could not be safely completed because local API was unreachable. | Blocker | None | Re-test registration once API/database are safely available without migrations or seed in this thread. |
| `/password-reset` | Blocked | Browser runtime and code review | Page loaded with reset form, email input, login link, and explicit mock/local email notice. | Password reset request response could not be verified because local API was unreachable. | Blocker | None | Re-test request success/error copy with safe local API. |
| `/password-reset/confirm` | Passed | Browser runtime | Page loaded with `Set new password`; missing-token error was visible and submit was disabled without a token. | No defect found in missing-token state. | Low | None | Token-backed success/error flow still needs API-backed QA. |
| `/invite/accept` | Blocked | Browser runtime and code review | Page loaded with `Accept invitation`; missing-token error and login link were visible. | Invite preview and acceptance could not be verified because local API was unreachable and no safe invite token was available. | Blocker | None | Re-test with a safe non-production invite token from an already-available local/API setup. |
| `/dashboard` | Blocked | Browser runtime | Unauthenticated route showed access denied with a login action after the guard fix. | Authenticated dashboard summary/checklist could not be verified because local API was unreachable. | Blocker | App-shell unauthenticated guard now blocks workspace content before route render. | Re-test authenticated dashboard data, quick actions, empty/error states, and sidebar behavior with safe credentials. |
| `/setup` | Blocked | Browser runtime | Before fix, unauthenticated users saw the guided-setup app-shell message. After fix, unauthenticated users see access denied with a login action. | Missing explicit route permission for `/setup`. | Medium | Added `dashboard.view` route permission and app-shell auth guard. | Re-test authenticated checklist load/error/empty states with API available. |
| `/organization/setup` | Blocked | Browser runtime | Before fix, unauthenticated users could see the organization setup form. After fix, the form is hidden behind access denied with a login action. | App-shell route rendered sensitive setup form without a loaded user. | High | Added app-shell auth guard while preserving no role-permission requirement for logged-in users without memberships. | Re-test logged-in no-membership first-organization flow with safe API. |
| `/sales/quotes` | Blocked | Browser runtime | Before fix, unauthenticated users saw `Module not implemented yet`. After fix, placeholder content is hidden behind access denied with a login action. | Unmatched app-shell placeholder was reachable without a loaded user and no default permission. | Medium | Unmatched app-shell routes now default to `dashboard.view`; app-shell auth guard blocks unauthenticated access. | Re-test authenticated placeholder visibility and decide whether future modules should be hidden from nav/route access in beta. |
| `/fixed-assets` | Blocked | Browser runtime | Before fix, unauthenticated users saw `Module not implemented yet`. After fix, placeholder content is hidden behind access denied with a login action. | Unmatched app-shell placeholder was reachable without a loaded user and no default permission. | Medium | Unmatched app-shell routes now default to `dashboard.view`; app-shell auth guard blocks unauthenticated access. | Re-test authenticated placeholder visibility and decide whether fixed-assets placeholder should be hidden/guarded before beta. |

### First-Batch Blockers

- Local API was not reachable at `http://localhost:4000/health`; no database, migration, seed, reset, or API startup was attempted in this thread.
- Authenticated route handling, seeded-admin login, organization creation, dashboard data, setup checklist data, invite acceptance, and password-reset token confirmation remain blocked until a safe local API/database state is already available.
- Root `/` browser runtime QA is blocked by unrelated local edits in `apps/web/src/app/page.tsx`; committed root behavior was code-reviewed only.

### Routes Fixed In This Thread

- `/setup`: explicit `dashboard.view` permission added and unauthenticated app-shell rendering blocked.
- `/organization/setup`: unauthenticated form exposure blocked while keeping the route available to a logged-in user who has not created/joined an organization yet.
- `/sales/quotes`, `/fixed-assets`, and other unmatched app-shell placeholder routes: unauthenticated placeholder exposure blocked and default permission set to `dashboard.view`.

### Routes Deferred And Why

- Authenticated `/dashboard`, `/setup`, `/organization/setup`, `/sales/quotes`, and `/fixed-assets`: deferred because local API/database was not safely available.
- Auth API submit flows for `/login`, `/register`, `/password-reset`, `/password-reset/confirm?token=...`, and `/invite/accept?token=...`: deferred because local API was unreachable and no safe live token/invite fixture was available.
- Placeholder/future-module beta policy: deferred to a later placeholder sweep after authenticated navigation and role behavior can be checked.

### Recommended Next QA Batch

Recommended next thread: `DEV-01 Part 3: sales and AR route QA`.

Focus on `/contacts`, `/contacts/[id]`, and the `/sales/*` invoice, payment, refund, and credit-note list/new/detail/edit routes. Start by confirming a safe authenticated local API state; if it is unavailable, record the blocker and do code-level QA without migrations, seeds, resets, deploys, or env changes.

## DEV-01 Part 3 Summary

- Latest pushed state inspected before Part 3: `690c4bc QA DEV-01 auth dashboard navigation routes`.
- `apps/web/next-env.d.ts` was not present in the Part 2 commit diff. The prior transient Next metadata change was harmless generated local metadata and was not accidentally committed.
- Local worktree warning: unrelated edits remained in `apps/web/src/app/page.tsx` and untracked marketing/web files; they were not edited, staged, or used as evidence for Sales/AR QA.
- Runtime attempt: started only `@ledgerbyte/web` with Next dev on `http://127.0.0.1:3032`, then stopped it. The in-app browser refused local route visits under its URL policy, so browser route assertions were blocked by tooling instead of worked around.
- API blocker: `http://localhost:4000/health` was not reachable within the configured local timeout, so authenticated list, create, edit, detail, PDF/archive, attachment, action, and invalid-id behavior could not be runtime-tested safely.
- Code-level QA covered route sources, API dependencies, permission mappings, sidebar visibility, query-parameter handoffs, loading/error/empty states, unsafe wording, and action guards for the 16 Sales/AR routes.
- Small frontend fix applied: `/sales/invoices/new` now honors `?customerId=...`, matching contact-ledger links that already passed a customer id and matching existing customer-payment/refund/credit-note query-prefill behavior.
- No accounting logic, API behavior, schema, migrations, seed/reset/delete, deploys, environment variables, ZATCA behavior, email behavior, customer data, production docs, Vercel/Supabase settings, or hosting research changed.

### Part 3 Route Results

| Route path | QA status | QA method | Actual result | Defects found | Severity | Fix applied | Remaining follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/contacts` | Blocked | Code review; browser runtime attempted | Route source loads `/contacts`, shows loading/error/empty states, gates create UI behind `contacts.manage`, and links rows to detail pages. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test list rendering, create validation, search/filter expectations, and restricted-role behavior with safe API data. |
| `/contacts/[id]` | Blocked | Code review; browser runtime attempted | Route source loads contact profile plus customer/supplier ledgers/statements, PDF downloads, document guidance, and AR/AP drill-down links. Browser route visit was blocked by tooling and API health was unavailable. | Customer-ledger `Create invoice` links passed `?customerId=...`, but the invoice form ignored that query parameter. | Blocker; Medium route-link defect | Fixed invoice form customer prefill from query string. | Re-test detail invalid-id/not-found behavior, ledger rows, statement load/PDF archive, attachment guidance, and permission-restricted edit controls with safe API data. |
| `/sales/invoices` | Blocked | Code review; browser runtime attempted | Route source loads `/sales-invoices`, exposes list filters and create/detail actions, and gates create/finalize actions by invoice permissions. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test list loading/empty/error, filters, create/detail links, and list finalize visibility with safe API data. |
| `/sales/invoices/new` | Blocked | Code review; targeted test; browser runtime attempted | Route source renders `SalesInvoiceForm`, which loads customers, items, revenue accounts, tax rates, and branches, validates draft lines, and posts `/sales-invoices`. Browser route visit was blocked by tooling and API health was unavailable. | New-invoice form ignored `?customerId=...` from contact-ledger links. | Blocker; Medium route-link defect | Fixed query prefill and added targeted Jest coverage. | Re-test full form dropdown loading, validation, cancel link, save success/error, and customer prefill in browser with safe API data. |
| `/sales/invoices/[id]` | Blocked | Code review; browser runtime attempted | Route source loads invoice detail, stock issue status, ZATCA readiness metadata, PDF/XML downloads, attachments, allocations, credit notes, and permission-gated finalize/void/delete/payment/credit-note actions. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source; high surface area remains untested. | Blocker | None | Re-test invalid/missing id, action visibility, PDF/archive, attachments, local-only ZATCA wording, and finalized/draft/voided states with safe API data. |
| `/sales/invoices/[id]/edit` | Blocked | Code review; browser runtime attempted | Route source fetches `/sales-invoices/:id`, shows loading/error states, and renders `SalesInvoiceForm` for draft edit. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test draft-only edit behavior, non-draft error state, cancel/back link, validation, and save error/success with safe API data. |
| `/sales/customer-payments` | Blocked | Code review; browser runtime attempted | Route source loads `/customer-payments`, shows loading/error/empty states, gates create/void actions by payment permissions, and links to details. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test list filters/search expectations, empty/error states, detail links, and void visibility with safe API data. |
| `/sales/customer-payments/new` | Blocked | Code review; browser runtime attempted | Route source honors `customerId` and `invoiceId` query params, loads contacts/accounts/bank profiles/open invoices, validates allocations, and posts `/customer-payments`. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test setup loading, query prefill, open-invoice empty state, allocation validation, cancel link, and submit error/success with safe API data. |
| `/sales/customer-payments/[id]` | Blocked | Code review; browser runtime attempted | Route source loads payment detail and receipt data, supports unapplied allocation actions, receipt PDF, refund link, archive guidance, and permission-gated void. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test invalid/missing id, receipt preview/PDF archive, allocation/reversal visibility, refund link, attachments, and void state with safe API data. |
| `/sales/customer-refunds` | Blocked | Code review; browser runtime attempted | Route source loads `/customer-refunds`, shows loading/error/empty states, gates create/void actions, and links to refund detail. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test list filters/search expectations, empty/error states, detail links, and void visibility with safe API data. |
| `/sales/customer-refunds/new` | Blocked | Code review; browser runtime attempted | Route source honors customer/source query params, loads contacts/accounts/bank profiles/refundable sources, validates refund amount, and explicitly says no payment gateway, bank feed, or ZATCA service is called. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test query prefill, source switching, no-source empty state, validation, cancel link, and submit error/success with safe API data. |
| `/sales/customer-refunds/[id]` | Blocked | Code review; browser runtime attempted | Route source loads refund detail and PDF data, links back to customer/source records, supports PDF download, attachments, and permission-gated void. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test invalid/missing id, PDF data preview/download/archive, source link behavior, attachments, and void state with safe API data. |
| `/sales/credit-notes` | Blocked | Code review; browser runtime attempted | Route source loads `/credit-notes`, exposes customer/status filters, loading/error/empty states, create/detail links, and permission-gated finalize. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test filters, empty/error states, create/detail links, finalize visibility, and restricted-role behavior with safe API data. |
| `/sales/credit-notes/new` | Blocked | Code review; browser runtime attempted | Route source renders `CreditNoteForm`, which honors `customerId` and `invoiceId` query params and loads contacts/invoices/items/accounts/taxes/branches. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source. | Blocker | None | Re-test query prefill, original-invoice filtering, validation, cancel link, and submit error/success with safe API data. |
| `/sales/credit-notes/[id]` | Blocked | Code review; browser runtime attempted | Route source loads credit note detail, open invoices, allocations, PDF download, refund link, local ZATCA-not-implemented wording, and permission-gated finalize/void/apply actions. Browser route visit was blocked by tooling and API health was unavailable. | No code-level defect found in committed route source; detail page has high action-surface risk. | Blocker | None | Re-test invalid/missing id, PDF/archive, allocation actions, refund link, safe ZATCA wording, and draft/finalized/voided states with safe API data. |
| `/sales/credit-notes/[id]/edit` | Blocked | Code review; browser runtime attempted | Route source fetches `/credit-notes/:id`, shows loading/error states, and renders `CreditNoteForm` for draft edit. Browser route visit was blocked by tooling and API health was unavailable. | Risk note: route permission mapping uses `creditNotes.create` for edit because no separate `creditNotes.update` permission exists. This may be intentional, but should be confirmed before role QA is considered passed. | Blocker; Medium permission-model risk | None | Re-test draft-only edit behavior, non-draft error state, permission intent, cancel/back link, validation, and save error/success with safe API data. |

### Part 3 Blocker List

- Browser route visits were blocked by the in-app browser URL policy for `http://127.0.0.1:3032`; no alternate browser surface was used.
- Local API health was not reachable at `http://localhost:4000/health`; no API startup, database startup, migration, seed, reset, or data mutation was attempted.
- Authenticated Sales/AR list, create, edit, detail, PDF/archive, attachment, action, invalid-id, and restricted-role flows remain blocked until a safe local API/database state and non-production credentials are already available.
- Credit-note edit authorization needs product/security confirmation because the visible route gate uses `creditNotes.create` rather than a dedicated update permission.

### Routes Fixed In This Thread

- `/sales/invoices/new`: fixed customer prefill from `?customerId=...`, which unblocks the existing contact-ledger `Create invoice` handoff once authenticated runtime data is available.

### Routes Deferred And Why

- All 16 Sales/AR routes remain deferred for authenticated browser/runtime QA because browser visits were blocked by tooling and the local API was unavailable.
- State-changing Sales/AR actions such as finalize, void, delete, apply allocation, reverse allocation, refund, PDF/archive download, attachment upload, and ZATCA local checks were not executed because safe API data and credentials were unavailable and the thread forbade risky data/accounting/ZATCA changes.

### Recommended Next QA Batch After Part 3

Recommended next thread: `DEV-01 Part 4: purchases and AP route QA`.

Focus on purchase orders, bills, supplier payments, supplier refunds, cash expenses, and debit notes. Start by re-checking safe local API availability; if unavailable, keep the same blocker discipline and code-review the AP routes without migrations, seeds, resets, deploys, env changes, or accounting/ZATCA/email behavior changes.

## DEV-01 Part 3.5 - Local QA Runtime Blocker Triage

- Latest pushed state inspected before Part 3.5: `e977376 QA DEV-01 sales AR routes`.
- Package/config finding: the web app expects `localhost:3000`, the API expects `localhost:4000`, local PostgreSQL is expected on `localhost:5432`, and Redis is expected on `localhost:6379`.
- API health result: `http://localhost:4000/health` was not reachable because `@ledgerbyte/api` failed during Prisma startup before listening on port `4000`.
- API root cause: Prisma reported `P1001` while trying to reach the configured local database at `localhost:5432`; no listener was present on `5432`, and Docker Desktop/Engine was unavailable for local infra inspection.
- Readiness result: `http://localhost:4000/readiness` was also unreachable because API startup failed before the health/readiness controllers were exposed. If `/health` later passes but `/readiness` fails, authenticated data-backed QA should still remain blocked.
- Web route visit result: `@ledgerbyte/web` started with the existing `corepack pnpm --filter @ledgerbyte/web dev` script on `localhost:3000`; shell HTTP checks returned `200` for `/login` and `/dashboard`.
- Browser URL policy finding: the in-app Browser route visits in Part 3 were blocked by the Browser Use URL policy for local URLs. This was a tool policy block, not an app route failure.
- Future route QA mode: mixed. Public web route serving can be checked with shell HTTP, route behavior can be code-reviewed, and authenticated browser/runtime QA remains blocked until local API/database readiness and an allowed browser/runtime method are available.
- Remaining blocked: authenticated data flows, role/session behavior, list/create/edit/detail API-backed states, PDF/archive/attachment flows, restricted-role checks, and state-changing actions.
- Runbook added: [DEV_01_LOCAL_QA_RUNBOOK.md](DEV_01_LOCAL_QA_RUNBOOK.md).
- Safe next thread: `DEV-01 Part 4: purchases and AP route QA`.

## Placeholder, Duplicate, Risky, Hidden Route Notes

- Placeholder-only: the committed catch-all route renders "Module not implemented yet" for any unmatched app-shell path. Part 2 added a baseline `dashboard.view` route permission and unauthenticated app-shell guard; restricted-role and authenticated placeholder behavior still need QA.
- Scaffold-only/future modules: quotes/proformas, recurring invoices, cash invoices, delivery notes, API invoices, beneficiaries, payroll, fixed assets, cost centers, projects, developer/API keys, integrations, and document templates are titleMap entries only unless a real page exists.
- Duplicate/overlap risk: `/bank-accounts/[id]/reconciliation` and `/bank-accounts/[id]/reconciliations`/`new` overlap conceptually and should be tested for navigation clarity and stale links.
- Risky auth mapping: Part 2 fixed the unauthenticated visibility gap for `/setup`, `/organization/setup`, and placeholder catch-all routes. Part 3 identified that `/sales/credit-notes/[id]/edit` is gated by `creditNotes.create` because no dedicated `creditNotes.update` permission exists. Authenticated and restricted-role behavior remains blocked until a safe local API/database state is available.
- Hidden expected routes: detail/new/edit routes are generally not sidebar children and are reached through lists/actions. That is expected, but QA should confirm every hidden route has a discoverable path from an authorized workflow.
- Committed route vs placeholder conflict: some placeholder `titleMap` keys duplicate real routes (`/reports`, `/sales/invoices`, `/bank-accounts`, `/branches`); real files should win for exact committed pages.

## Proposed DEV-01 QA Batches

Each batch stays at or below 20 routes.

1. Auth, dashboard, and navigation - 10 routes: `/`, `/login`, `/register`, `/password-reset`, `/password-reset/confirm`, `/invite/accept`, `/dashboard`, `/setup`, `/organization/setup`, `/[...placeholder]`.
2. Sales/AR - 16 routes: `/contacts`, `/contacts/[id]`, and all `/sales/*` invoice, payment, refund, and credit-note list/new/detail/edit routes.
3. Purchases/AP - 21 routes if run together, so split into 2 batches:
   - 3a Purchase orders and bills - 8 routes.
   - 3b Supplier payments/refunds, cash expenses, debit notes - 13 routes.
4. Banking/reconciliation - 14 routes: bank accounts, statement imports, statement rows, reconciliations, bank transfers.
5. Inventory operations - 16 routes: items, warehouses, stock movements, adjustments, transfers, purchase receipts, sales stock issues.
6. Inventory reports/settings/variance - 12 routes: balances, settings, five inventory reports, variance proposal list/new/detail.
7. Reports/documents - 9 routes: reports index, seven core reports, generated documents archive.
8. Settings/admin/accounting - 15 routes: accounts, journals, tax rates, fiscal periods, branches, team, roles, documents, storage, email, audit logs, number sequences, ZATCA.
9. Placeholder/future-module sweep - 10 to 15 selected unmatched titleMap paths, with priority on visible or linked future modules.

## Recommended Next Actual QA Batch

Recommended next thread: `DEV-01 Part 4: purchases and AP route QA`.

Run Purchases/AP next because Sales/AR is now inventoried, code-reviewed, and documented with the current runtime blockers. Keep the batch split small enough to avoid mixing purchase-order/bill defects with supplier payment/refund/debit-note defects if runtime access becomes available.

Routes to include in the first AP pass:

- `/purchases/purchase-orders`
- `/purchases/purchase-orders/new`
- `/purchases/purchase-orders/[id]`
- `/purchases/purchase-orders/[id]/edit`
- `/purchases/bills`
- `/purchases/bills/new`
- `/purchases/bills/[id]`
- `/purchases/bills/[id]/edit`
