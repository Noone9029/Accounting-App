# DEV-01 Route QA Log

Status: Part 1 route inventory completed
Date: 2026-05-23
Source state inspected: `9afe888 Document development completion plan`

## Scope And Rules

- DEV-01 is product-development QA only: inventory routes, batch runtime QA, record blockers, then fix only defects confirmed in later parts.
- This Part 1 pass did not run app tests, browser E2E, smoke tests, migrations, seed/reset/delete commands, deploys, env changes, ZATCA execution, email sending, or production-hosting research.
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

All QA statuses are `Not tested`.

### Auth/Public

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `apps/web/src/app/page.tsx` | Redirects root traffic to dashboard | Next redirect to `/dashboard` | Redirect target requires `dashboard.view` | Critical | Not tested |
| `/login` | `apps/web/src/app/(auth)/login/page.tsx` | Login form and session bootstrap | `POST /auth/login`, `GET /auth/me` | Public route; auth API call uses `auth: false` | Critical | Not tested |
| `/register` | `apps/web/src/app/(auth)/register/page.tsx` | Account registration and setup handoff | `POST /auth/register` | Public route; auth API call uses `auth: false` | Critical | Not tested |
| `/password-reset` | `apps/web/src/app/(auth)/password-reset/page.tsx` | Password reset request | `POST /auth/password-reset/request` | Public route; API call uses `auth: false` | Medium | Not tested |
| `/password-reset/confirm` | `apps/web/src/app/(auth)/password-reset/confirm/page.tsx` | Password reset token confirmation | `POST /auth/password-reset/confirm` | Public route; API call uses `auth: false` | Medium | Not tested |
| `/invite/accept` | `apps/web/src/app/(auth)/invite/accept/page.tsx` | Invite preview and acceptance | `GET /auth/invitations/:token/preview`, `POST /auth/invitations/:token/accept` | Public route; API calls use `auth: false` | Critical | Not tested |

### Dashboard/Onboarding

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `apps/web/src/app/(app)/dashboard/page.tsx` | KPI dashboard, attention items, quick actions | `GET /dashboard/summary`, `GET /dashboard/onboarding-checklist` | Authenticated; `dashboard.view` | Critical | Not tested |
| `/setup` | `apps/web/src/app/(app)/setup/page.tsx` | Guided read-only first-workflow checklist | `GET /dashboard/onboarding-checklist` | Sidebar expects `dashboard.view`; route permission map currently returns none | Critical | Not tested |
| `/organization/setup` | `apps/web/src/app/(app)/organization/setup/page.tsx` | Create first organization and tenant foundation data | `POST /organizations` | App shell route; route permission map currently returns none | Critical | Not tested |

### Sales/AR

| Route path | Source file | Expected purpose | Likely data/API dependency | Auth/role assumption visible from code | QA priority | QA status |
| --- | --- | --- | --- | --- | --- | --- |
| `/contacts` | `apps/web/src/app/(app)/contacts/page.tsx` | Customer/supplier contact list and create | Contacts API | Authenticated; `contacts.view` | High | Not tested |
| `/contacts/[id]` | `apps/web/src/app/(app)/contacts/[id]/page.tsx` | Contact detail, ledgers, customer/supplier statements | Contacts, ledgers/statements, PDFs, attachments | Authenticated; `contacts.view` | High | Not tested |
| `/sales/invoices` | `apps/web/src/app/(app)/sales/invoices/page.tsx` | Sales invoice list | Sales invoices API | Authenticated; `salesInvoices.view` | High | Not tested |
| `/sales/invoices/new` | `apps/web/src/app/(app)/sales/invoices/new/page.tsx` | Create draft sales invoice | Sales invoices, contacts, items, taxes | Authenticated; `salesInvoices.create` | Critical | Not tested |
| `/sales/invoices/[id]` | `apps/web/src/app/(app)/sales/invoices/[id]/page.tsx` | Invoice detail, finalize/void/PDF/attachments | Sales invoices, PDF/archive, attachments, ZATCA metadata | Authenticated; `salesInvoices.view` | Critical | Not tested |
| `/sales/invoices/[id]/edit` | `apps/web/src/app/(app)/sales/invoices/[id]/edit/page.tsx` | Edit draft sales invoice | Sales invoices, contacts, items, taxes | Authenticated; `salesInvoices.update` | Critical | Not tested |
| `/sales/customer-payments` | `apps/web/src/app/(app)/sales/customer-payments/page.tsx` | Customer payment list | Customer payments API | Authenticated; `customerPayments.view` | High | Not tested |
| `/sales/customer-payments/new` | `apps/web/src/app/(app)/sales/customer-payments/new/page.tsx` | Record customer payment | Customer payments, invoices, bank accounts | Authenticated; `customerPayments.create` | Critical | Not tested |
| `/sales/customer-payments/[id]` | `apps/web/src/app/(app)/sales/customer-payments/[id]/page.tsx` | Payment detail, receipt/PDF/void | Customer payments, allocations, generated documents | Authenticated; `customerPayments.view` | Critical | Not tested |
| `/sales/customer-refunds` | `apps/web/src/app/(app)/sales/customer-refunds/page.tsx` | Customer refund list | Customer refunds API | Authenticated; `customerRefunds.view` | High | Not tested |
| `/sales/customer-refunds/new` | `apps/web/src/app/(app)/sales/customer-refunds/new/page.tsx` | Create customer refund | Customer refunds, unapplied payments/credits, bank accounts | Authenticated; `customerRefunds.create` | Critical | Not tested |
| `/sales/customer-refunds/[id]` | `apps/web/src/app/(app)/sales/customer-refunds/[id]/page.tsx` | Customer refund detail/PDF/void | Customer refunds and generated documents | Authenticated; `customerRefunds.view` | Critical | Not tested |
| `/sales/credit-notes` | `apps/web/src/app/(app)/sales/credit-notes/page.tsx` | Credit note list | Credit notes API | Authenticated; `creditNotes.view` | High | Not tested |
| `/sales/credit-notes/new` | `apps/web/src/app/(app)/sales/credit-notes/new/page.tsx` | Create credit note | Credit notes, contacts, invoices, items, taxes | Authenticated; `creditNotes.create` | Critical | Not tested |
| `/sales/credit-notes/[id]` | `apps/web/src/app/(app)/sales/credit-notes/[id]/page.tsx` | Credit note detail, allocation/PDF/void | Credit notes, allocations, PDF/archive | Authenticated; `creditNotes.view` | Critical | Not tested |
| `/sales/credit-notes/[id]/edit` | `apps/web/src/app/(app)/sales/credit-notes/[id]/edit/page.tsx` | Edit draft credit note | Credit notes, contacts, invoices, items, taxes | Authenticated; `creditNotes.create` | Critical | Not tested |

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
| `/[...placeholder]` | `apps/web/src/app/(app)/[...placeholder]/page.tsx` | Catch-all scaffold for unimplemented modules | No module API; static placeholder from `titleMap` | App shell; route permission map returns none for placeholder paths | Low | Not tested |

Known titleMap placeholder keys in code: `/get-started`, `/inbox`, `/reports`, `/sales`, `/sales/quotes`, `/sales/invoices`, `/sales/customer-payments`, `/sales/recurring-invoices`, `/sales/credit-notes`, `/sales/cash-invoices`, `/sales/delivery-notes`, `/sales/api-invoices`, `/purchases`, `/purchases/bills`, `/purchases/supplier-payments`, `/purchases/cash-expenses`, `/purchases/debit-notes`, `/purchases/purchase-orders`, `/beneficiaries`, `/payroll`, `/products`, `/accounting`, `/bank-accounts`, `/fixed-assets`, `/cost-centers`, `/projects`, `/branches`, `/developer`, `/developer/api-keys`, `/integrations`, and `/document-templates`.

Some of those paths now have real committed pages and therefore do not hit the catch-all. The risk is highest for future-module paths that are not real files, such as `/sales/quotes`, `/sales/recurring-invoices`, `/fixed-assets`, `/payroll`, `/developer/api-keys`, `/integrations`, and `/document-templates`.

## Placeholder, Duplicate, Risky, Hidden Route Notes

- Placeholder-only: the committed catch-all route renders "Module not implemented yet" for any unmatched app-shell path. It has no route permission mapping and should be verified unauthenticated, restricted-role, and authenticated.
- Scaffold-only/future modules: quotes/proformas, recurring invoices, cash invoices, delivery notes, API invoices, beneficiaries, payroll, fixed assets, cost centers, projects, developer/API keys, integrations, and document templates are titleMap entries only unless a real page exists.
- Duplicate/overlap risk: `/bank-accounts/[id]/reconciliation` and `/bank-accounts/[id]/reconciliations`/`new` overlap conceptually and should be tested for navigation clarity and stale links.
- Risky auth mapping: `/setup`, `/organization/setup`, and the placeholder catch-all return no explicit route permissions from `getRequiredPermissionsForPathname`; the UI/API may still block mutations, but runtime QA should verify visible access behavior.
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

## Recommended First Actual QA Batch

Recommended next thread: `DEV-01 Part 2: auth, dashboard, and navigation QA`.

Run the first batch first because it validates the session model, active organization selection, permission loading, root redirect, sidebar/mobile navigation, explicit access-denied state, and the risky no-permission routes before deeper workflow QA depends on them.

Routes to include:

- `/`
- `/login`
- `/register`
- `/password-reset`
- `/password-reset/confirm`
- `/invite/accept`
- `/dashboard`
- `/setup`
- `/organization/setup`
- `/[...placeholder]`

Do not fix code in Part 2 unless that next prompt explicitly allows fixes.
