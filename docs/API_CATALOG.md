# API Catalog

Audit date: 2026-05-15

Most business endpoints require JWT auth and `x-organization-id`. Auth endpoints and `GET /health` are exceptions. Status values here describe implementation maturity, not runtime health.

## Authorization And Permissions

- Tenant-scoped business endpoints use JWT authentication, active organization membership, and route-level permission checks.
- Permissions are shared dotted strings from `packages/shared/src/permissions.ts`.
- `admin.fullAccess` and legacy `*` permissions allow all guarded actions.
- Missing permissions return HTTP 403 with `You do not have permission to perform this action.`
- `GET /auth/me` exposes active memberships with role id/name/permissions so the frontend can filter routes and actions.

## Auth

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/register` | Register user and organization context | No | No | Implemented | MVP registration. |
| POST | `/auth/login` | Login and receive JWT | No | No | Implemented | Uses configured JWT secret. |
| GET | `/auth/me` | Current authenticated user | Yes | No | Implemented | Does not require org context; returns active memberships with role permissions. |
| GET | `/auth/invitations/:token/preview` | Invitation preview | No | No | Implemented | Validates hashed invite token lookup without consuming it; returns organization/role context when valid. |
| POST | `/auth/invitations/:token/accept` | Accept organization invitation | No | No | Implemented | Sets password, activates invited membership, consumes token, and returns login response. |
| POST | `/auth/password-reset/request` | Request password reset | No | No | Implemented | Always returns a generic success response; creates mock email only if account exists and DB-backed rate limits allow delivery. |
| POST | `/auth/password-reset/confirm` | Confirm password reset | No | No | Implemented | Validates one-hour token, updates password, and consumes token. |
| POST | `/auth/tokens/cleanup-expired` | Cleanup expired auth tokens | Yes | Yes | Implemented | Requires `users.manage`; deletes expired unconsumed tokens older than 30 days for the active organization. |

## Health

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | API liveness check | No | No | Implemented | Used for local readiness checks. |

## Organizations

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/organizations` | Create organization | Yes | No | Implemented | Creates tenant context. |
| GET | `/organizations` | List organizations for user | Yes | No | Implemented | Membership scoped. |
| GET | `/organizations/:id` | Get one organization | Yes | No | Implemented | Membership scoped; requires `organization.view` for that org. |
| PATCH | `/organizations/:id` | Update organization | Yes | No | Implemented | Membership scoped; requires `organization.update` for that org. |

## Roles

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/roles` | List organization roles | Yes | Yes | Implemented | Requires `roles.view`; tenant scoped. |
| GET | `/roles/:id` | Role detail | Yes | Yes | Implemented | Requires `roles.view`; tenant scoped. |
| POST | `/roles` | Create custom role | Yes | Yes | Implemented | Requires `roles.manage`; rejects unknown permission strings. |
| PATCH | `/roles/:id` | Update custom role | Yes | Yes | Implemented | Requires `roles.manage`; system roles are protected. |
| DELETE | `/roles/:id` | Delete custom role | Yes | Yes | Implemented | Requires `roles.manage`; rejects system roles and roles assigned to active members. |

## Organization Members

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/organization-members` | List organization members | Yes | Yes | Implemented | Requires `users.view`; tenant scoped. |
| GET | `/organization-members/:id` | Member detail | Yes | Yes | Implemented | Requires `users.view`; tenant scoped. |
| PATCH | `/organization-members/:id/role` | Change member role | Yes | Yes | Implemented | Requires `users.manage`; blocks last full-access/user-manager lockout. |
| PATCH | `/organization-members/:id/status` | Change member status | Yes | Yes | Implemented | Requires `users.manage`; supports `ACTIVE`, `INVITED`, `SUSPENDED`. |
| POST | `/organization-members/invite` | Invite organization member | Yes | Yes | Implemented | Requires `users.invite`; creates invited user/member if needed, hashed invite token, and mock outbox email after invite rate-limit checks. |

## Email

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/email/readiness` | Email provider readiness | Yes | Yes | Implemented | Requires `emailOutbox.view` or `users.manage`; reports provider readiness, SMTP config booleans, warnings, and blockers without exposing secrets. |
| GET | `/email/outbox` | List mock/local email records | Yes | Yes | Implemented | Requires `emailOutbox.view`; tenant scoped; no raw token field. |
| GET | `/email/outbox/:id` | Email outbox detail | Yes | Yes | Implemented | Requires `emailOutbox.view`; includes mock body text for local inspection. |

## Branches

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/branches` | List branches | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/branches` | Create branch | Yes | Yes | Implemented | Basic branch data. |
| PATCH | `/branches/:id` | Update branch | Yes | Yes | Implemented | Tenant scoped. |

## Contacts And Ledgers

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/contacts` | List contacts | Yes | Yes | Implemented | Customer/supplier/BOTH. |
| POST | `/contacts` | Create contact | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/contacts/:id` | Contact detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/contacts/:id` | Update contact | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/contacts/:id/ledger` | Customer AR ledger | Yes | Yes | Implemented | Customer/BOTH only. |
| GET | `/contacts/:id/statement` | Customer statement JSON | Yes | Yes | Implemented | `from`/`to` query optional. |
| GET | `/contacts/:id/statement-pdf-data` | Customer statement PDF data | Yes | Yes | Implemented | Template data. |
| GET | `/contacts/:id/statement.pdf` | Customer statement PDF | Yes | Yes | Implemented | Archives PDF on download. |
| POST | `/contacts/:id/generate-statement-pdf` | Generate/archive statement PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/contacts/:id/supplier-ledger` | Supplier AP ledger | Yes | Yes | Implemented | Supplier/BOTH only. |
| GET | `/contacts/:id/supplier-statement` | Supplier statement JSON | Yes | Yes | Implemented | No supplier statement PDF yet. |

## Accounts

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/accounts` | List chart of accounts | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/accounts` | Create account | Yes | Yes | Implemented | Validates parent/org. |
| GET | `/accounts/:id` | Account detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/accounts/:id` | Update account | Yes | Yes | Implemented | System account restrictions. |
| DELETE | `/accounts/:id` | Delete account | Yes | Yes | Implemented | Blocks referenced/system accounts. |

## Bank Accounts

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/bank-accounts` | List cash/bank account profiles | Yes | Yes | Implemented | Requires `bankAccounts.view`; returns linked account, posted ledger balance, latest date, and transaction count. |
| POST | `/bank-accounts` | Link a profile to a posting asset account | Yes | Yes | Implemented | Requires `bankAccounts.manage`; rejects non-asset, inactive, non-posting, and duplicate account links. |
| GET | `/bank-accounts/:id` | Bank account profile detail | Yes | Yes | Implemented | Requires `bankAccounts.view`; tenant scoped. |
| PATCH | `/bank-accounts/:id` | Update profile metadata | Yes | Yes | Implemented | Requires `bankAccounts.manage`; does not change the linked account. |
| POST | `/bank-accounts/:id/archive` | Archive profile | Yes | Yes | Implemented | Requires `bankAccounts.manage`; leaves the chart account untouched. |
| POST | `/bank-accounts/:id/reactivate` | Reactivate profile | Yes | Yes | Implemented | Requires `bankAccounts.manage`; validates the linked account is still active/posting/asset. |
| POST | `/bank-accounts/:id/post-opening-balance` | Post one-time opening balance journal | Yes | Yes | Implemented | Requires `bankAccounts.openingBalance.post`; validates active profile, non-zero amount, opening date, fiscal period, and duplicate-post guard. |
| GET | `/bank-accounts/:id/transactions` | Posted transaction lines | Yes | Yes | Implemented | Requires `bankAccounts.transactions.view`; supports optional `from`/`to` date filters, running balance, transfer source labels, and opening-balance source labels. |

## Bank Transfers

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/bank-transfers` | List posted/voided transfers | Yes | Yes | Implemented | Requires `bankTransfers.view`; includes from/to profiles and journal links. |
| POST | `/bank-transfers` | Create and post bank transfer | Yes | Yes | Implemented | Requires `bankTransfers.create`; posts Dr destination bank/cash, Cr source bank/cash after profile, currency, amount, tenant, and fiscal-period checks. |
| GET | `/bank-transfers/:id` | Transfer detail | Yes | Yes | Implemented | Requires `bankTransfers.view`; tenant scoped. |
| POST | `/bank-transfers/:id/void` | Void transfer | Yes | Yes | Implemented | Requires `bankTransfers.void`; creates or reuses one reversal journal and does not double-reverse repeated requests. |

## Bank Statement Import And Reconciliation

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/bank-accounts/:id/statement-imports` | List statement import batches for a bank profile | Yes | Yes | Implemented | Requires `bankStatements.view`; tenant scoped. |
| POST | `/bank-accounts/:id/statement-imports/preview` | Preview local statement rows | Yes | Yes | Implemented | Requires `bankStatements.previewImport`; accepts pasted CSV text or JSON rows, validates rows, returns totals/warnings, and does not write records. |
| POST | `/bank-accounts/:id/statement-imports` | Import local statement rows | Yes | Yes | Implemented | Requires `bankStatements.import`; accepts CSV text or JSON rows, rejects invalid rows unless `allowPartial=true`, creates no journals, and rejects rows inside closed reconciliation periods. |
| GET | `/bank-statement-imports/:id` | Import batch detail | Yes | Yes | Implemented | Requires `bankStatements.view`; includes imported statement transactions. |
| POST | `/bank-statement-imports/:id/void` | Void an import batch | Yes | Yes | Implemented | Requires `bankStatements.manage`; rejected after rows are matched/categorized or belong to a closed reconciliation period. |
| GET | `/bank-accounts/:id/statement-transactions` | List statement rows | Yes | Yes | Implemented | Requires `bankStatements.view`; supports `status`, `from`, and `to` filters. |
| GET | `/bank-statement-transactions/:id` | Statement row detail | Yes | Yes | Implemented | Requires `bankStatements.view`; tenant scoped. |
| GET | `/bank-statement-transactions/:id/match-candidates` | Posted bank journal candidates | Yes | Yes | Implemented | Requires `bankStatements.reconcile`; searches same bank account, amount/direction, and seven-day window. |
| POST | `/bank-statement-transactions/:id/match` | Manually match to existing journal line | Yes | Yes | Implemented | Requires `bankStatements.reconcile`; creates no journal entry and is blocked in closed reconciliation periods. |
| POST | `/bank-statement-transactions/:id/categorize` | Categorize unmatched row to a posting account | Yes | Yes | Implemented | Requires `bankStatements.reconcile`; creates a posted balanced journal guarded by fiscal periods and is blocked in closed reconciliation periods. |
| POST | `/bank-statement-transactions/:id/ignore` | Ignore unmatched row | Yes | Yes | Implemented | Requires `bankStatements.reconcile`; creates no journal entry and is blocked in closed reconciliation periods. |
| GET | `/bank-accounts/:id/reconciliation-summary` | Reconciliation totals and difference | Yes | Yes | Implemented | Requires `bankStatements.view`; returns statement totals, ledger balance, latest closing balance, difference, status suggestion, latest closed reconciliation, open draft flag, unreconciled count, and closed-through date. |
| GET | `/bank-accounts/:id/reconciliations` | List reconciliation records | Yes | Yes | Implemented | Requires `bankReconciliations.view`; tenant scoped by bank profile. |
| POST | `/bank-accounts/:id/reconciliations` | Create draft reconciliation | Yes | Yes | Implemented | Requires `bankReconciliations.create`; rejects inactive profiles, invalid ranges, and overlap with closed reconciliations. |
| GET | `/bank-reconciliations/:id` | Reconciliation detail | Yes | Yes | Implemented | Requires `bankReconciliations.view`; includes bank profile, workflow actors, difference, and unmatched count. |
| POST | `/bank-reconciliations/:id/submit` | Submit draft reconciliation | Yes | Yes | Implemented | Requires `bankReconciliations.close`; requires zero difference and no unmatched statement rows, then records a review event and moves to `PENDING_APPROVAL`. |
| POST | `/bank-reconciliations/:id/approve` | Approve submitted reconciliation | Yes | Yes | Implemented | Requires `bankReconciliations.approve`; records approval notes and blocks same submitter approval unless `admin.fullAccess`. |
| POST | `/bank-reconciliations/:id/reopen` | Reopen submitted/approved reconciliation | Yes | Yes | Implemented | Requires `bankReconciliations.reopen`; moves `PENDING_APPROVAL` or `APPROVED` records back to `DRAFT` and records reason/history. |
| POST | `/bank-reconciliations/:id/close` | Close reconciliation | Yes | Yes | Implemented | Requires `bankReconciliations.close`; requires `APPROVED`, zero difference, and no unmatched rows, then snapshots items and locks the period. |
| POST | `/bank-reconciliations/:id/void` | Void reconciliation | Yes | Yes | Implemented | Requires `bankReconciliations.void`; marks draft/submitted/approved/closed records voided without changing journals or statement rows and unlocks the period. |
| GET | `/bank-reconciliations/:id/items` | Reconciliation item snapshot | Yes | Yes | Implemented | Requires `bankReconciliations.view`; returns the statement row snapshot captured at close. |
| GET | `/bank-reconciliations/:id/review-events` | Reconciliation review history | Yes | Yes | Implemented | Requires `bankReconciliations.view`; returns submit/approve/reopen/close/void review events. |
| GET | `/bank-reconciliations/:id/report-data` | Reconciliation report data | Yes | Yes | Implemented | Requires `bankReconciliations.view`; includes period, status, balances, approval/close/void actors, item snapshots, and summary totals. |
| GET | `/bank-reconciliations/:id/report.csv` | Reconciliation report CSV | Yes | Yes | Implemented | Requires `bankReconciliations.view` plus `reports.export` or `generatedDocuments.download`; returns `text/csv`. |
| GET | `/bank-reconciliations/:id/report.pdf` | Reconciliation report PDF | Yes | Yes | Implemented | Requires `bankReconciliations.view` plus `reports.export` or `generatedDocuments.download`; returns `application/pdf` and archives the PDF. |

## Inventory

Inventory endpoints remain operational by default. They do not auto-post journals; only explicit sales stock issue COGS, compatible purchase receipt asset posting, and approved inventory variance proposal posting actions write accounting journals after review.

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/warehouses` | List warehouses | Yes | Yes | Implemented | Requires `warehouses.view`; tenant scoped. |
| POST | `/warehouses` | Create warehouse | Yes | Yes | Implemented | Requires `warehouses.manage`; code is unique per organization and normalized uppercase. |
| GET | `/warehouses/:id` | Warehouse detail | Yes | Yes | Implemented | Requires `warehouses.view`; tenant scoped. |
| PATCH | `/warehouses/:id` | Update warehouse metadata | Yes | Yes | Implemented | Requires `warehouses.manage`; archived records can still be viewed. |
| POST | `/warehouses/:id/archive` | Archive warehouse | Yes | Yes | Implemented | Requires `warehouses.manage`; cannot archive the only active default warehouse. |
| POST | `/warehouses/:id/reactivate` | Reactivate warehouse | Yes | Yes | Implemented | Requires `warehouses.manage`. |
| GET | `/stock-movements` | List stock movements | Yes | Yes | Implemented | Requires `stockMovements.view`; supports `itemId`, `warehouseId`, `from`, `to`, and `type` filters. |
| POST | `/stock-movements` | Create manual stock movement | Yes | Yes | Implemented | Requires `stockMovements.create`; allows `OPENING_BALANCE` only. Adjustment, transfer, receipt, and issue rows are generated by controlled workflows. |
| GET | `/stock-movements/:id` | Stock movement detail | Yes | Yes | Implemented | Requires `stockMovements.view`; tenant scoped. |
| GET | `/inventory-adjustments` | List inventory adjustments | Yes | Yes | Implemented | Requires `inventoryAdjustments.view`; includes item, warehouse, creator, approver, voider, and stock movement links. |
| POST | `/inventory-adjustments` | Create draft inventory adjustment | Yes | Yes | Implemented | Requires `inventoryAdjustments.create`; validates tracked active item, active warehouse, positive quantity, date, and optional unit cost. |
| GET | `/inventory-adjustments/:id` | Inventory adjustment detail | Yes | Yes | Implemented | Requires `inventoryAdjustments.view`; tenant scoped. |
| PATCH | `/inventory-adjustments/:id` | Update draft inventory adjustment | Yes | Yes | Implemented | Requires `inventoryAdjustments.create`; draft-only. Approved and voided adjustments are locked. |
| DELETE | `/inventory-adjustments/:id` | Delete draft inventory adjustment | Yes | Yes | Implemented | Requires `inventoryAdjustments.create`; draft-only. |
| POST | `/inventory-adjustments/:id/approve` | Approve inventory adjustment | Yes | Yes | Implemented | Requires `inventoryAdjustments.approve`; creates `ADJUSTMENT_IN` or `ADJUSTMENT_OUT`; decrease approval rejects negative stock; no journal entry. |
| POST | `/inventory-adjustments/:id/void` | Void inventory adjustment | Yes | Yes | Implemented | Requires `inventoryAdjustments.void`; draft void marks voided, approved void creates one reversing adjustment movement; repeated void is rejected. |
| GET | `/warehouse-transfers` | List warehouse transfers | Yes | Yes | Implemented | Requires `warehouseTransfers.view`; includes item, from/to warehouses, creator, and movement links. |
| POST | `/warehouse-transfers` | Create posted warehouse transfer | Yes | Yes | Implemented | Requires `warehouseTransfers.create`; validates active tracked item, different active warehouses, positive quantity, source availability, and creates paired `TRANSFER_OUT`/`TRANSFER_IN` rows atomically. |
| GET | `/warehouse-transfers/:id` | Warehouse transfer detail | Yes | Yes | Implemented | Requires `warehouseTransfers.view`; tenant scoped. |
| POST | `/warehouse-transfers/:id/void` | Void warehouse transfer | Yes | Yes | Implemented | Requires `warehouseTransfers.void`; creates paired reversal movements once and rejects repeated voids. |
| GET | `/purchase-receipts` | List purchase receipts | Yes | Yes | Implemented | Requires `purchaseReceiving.view`; includes supplier, source PO/bill, warehouse, lines, and movement links. |
| POST | `/purchase-receipts` | Create posted purchase receipt | Yes | Yes | Implemented | Requires `purchaseReceiving.create`; supports PO, purchase bill, or standalone supplier receipts; creates `PURCHASE_RECEIPT_PLACEHOLDER` stock movements only. |
| GET | `/purchase-receipts/:id` | Purchase receipt detail | Yes | Yes | Implemented | Requires `purchaseReceiving.view`; tenant scoped with linked stock movements. |
| GET | `/purchase-receipts/:id/accounting-preview` | Purchase receipt accounting preview | Yes | Yes | Implemented | Requires `inventory.view`; tenant scoped; returns receipt value, linked bill mode/status, matched bill value, unmatched receipt value, value difference, matching summary, Dr Inventory Asset / Cr Inventory Clearing preview lines, posting status, journal ids, blocking reasons, warnings, `previewOnly: true`, and `canPost: true` only for eligible compatible clearing-mode receipts; creates no journal. |
| POST | `/purchase-receipts/:id/post-inventory-asset` | Manually post purchase receipt inventory asset | Yes | Yes | Implemented | Requires `inventory.receipts.postAsset`; requires posted/unvoided receipt, finalized non-voided linked `INVENTORY_CLEARING` purchase bill, enabled inventory accounting, mapped active posting Inventory Asset and Inventory Clearing accounts, `MOVING_AVERAGE`, complete unit costs, positive receipt value, open fiscal period on receipt date, and no existing asset journal; creates one posted Dr Inventory Asset / Cr Inventory Clearing journal and links it to the receipt. |
| POST | `/purchase-receipts/:id/reverse-inventory-asset` | Reverse purchase receipt inventory asset posting | Yes | Yes | Implemented | Requires `inventory.receipts.reverseAsset`; requires existing unreversed receipt asset journal and open fiscal period on current date; creates one reversal journal and links it to the receipt without voiding the receipt. |
| POST | `/purchase-receipts/:id/void` | Void purchase receipt | Yes | Yes | Implemented | Requires `purchaseReceiving.create`; creates `ADJUSTMENT_OUT` reversal movements once, rejects repeated voids, blocks negative stock, and blocks voiding while inventory asset posting is active and unreversed. |
| GET | `/purchase-orders/:id/receiving-status` | Purchase order receiving status | Yes | Yes | Implemented | Requires `purchaseReceiving.view`; returns NOT_STARTED/PARTIAL/COMPLETE and line-level ordered/received/remaining quantities. |
| GET | `/purchase-orders/:id/receipt-matching-status` | Purchase order receipt/bill matching status | Yes | Yes | Groundwork | Requires `purchaseOrders.view`; returns operational receipt value estimate, converted bill if present, linked bill visibility, warnings, and NOT_RECEIVED/PARTIALLY_RECEIVED/FULLY_RECEIVED/OVER_RECEIVED_WARNING matching status; creates no journal. |
| GET | `/purchase-bills/:id/receiving-status` | Purchase bill receiving status | Yes | Yes | Implemented | Requires `purchaseReceiving.view`; returns NOT_STARTED/PARTIAL/COMPLETE and line-level billed/received/remaining quantities. |
| GET | `/purchase-bills/:id/receipt-matching-status` | Purchase bill receipt matching status | Yes | Yes | Groundwork | Requires `purchaseBills.view`; returns bill total, receipt count/value, per-line matched and unmatched quantities/values, warnings, and NOT_RECEIVED/PARTIALLY_RECEIVED/FULLY_RECEIVED/OVER_RECEIVED_WARNING status; creates no accounting mutation. |
| GET | `/sales-stock-issues` | List sales stock issues | Yes | Yes | Implemented | Requires `salesStockIssue.view`; includes customer, invoice, warehouse, lines, and movement links. |
| POST | `/sales-stock-issues` | Create posted sales stock issue | Yes | Yes | Implemented | Requires `salesStockIssue.create`; finalized invoice only, validates stock availability, and creates `SALES_ISSUE_PLACEHOLDER` stock movements only. |
| GET | `/sales-stock-issues/:id` | Sales stock issue detail | Yes | Yes | Implemented | Requires `salesStockIssue.view`; tenant scoped with linked stock movements. |
| GET | `/sales-stock-issues/:id/accounting-preview` | Sales stock issue COGS preview | Yes | Yes | Implemented | Requires `inventory.view`; tenant scoped; returns moving-average estimated COGS, Dr COGS / Cr Inventory Asset preview lines, warnings, posting status, COGS journal ids when present, `previewOnly: true`, and `canPost: true` only for eligible unposted issues; creates no journal. |
| POST | `/sales-stock-issues/:id/post-cogs` | Manually post sales stock issue COGS | Yes | Yes | Implemented | Requires `inventory.cogs.post`; requires enabled inventory accounting, mapped inventory asset and COGS accounts, `MOVING_AVERAGE`, posted/unvoided issue, open fiscal period on issue date, and no existing COGS journal; creates one posted Dr COGS / Cr Inventory Asset journal and links it to the stock issue. |
| POST | `/sales-stock-issues/:id/reverse-cogs` | Reverse sales stock issue COGS | Yes | Yes | Implemented | Requires `inventory.cogs.reverse`; requires existing unreversed COGS journal and open fiscal period on current date; creates one reversal journal and links it to the stock issue without voiding the stock issue. |
| POST | `/sales-stock-issues/:id/void` | Void sales stock issue | Yes | Yes | Implemented | Requires `salesStockIssue.create`; creates `ADJUSTMENT_IN` reversal movements once and rejects repeated voids; blocks voiding while COGS is posted and not reversed. |
| GET | `/sales-invoices/:id/stock-issue-status` | Sales invoice stock issue status | Yes | Yes | Implemented | Requires `salesStockIssue.view`; returns NOT_STARTED/PARTIAL/COMPLETE and line-level invoiced/issued/remaining quantities. |
| GET | `/inventory/balances` | Derived inventory balances | Yes | Yes | Implemented | Requires `inventory.view`; optional `itemId` and `warehouseId`; quantity is authoritative for the operational MVP while value fields are estimates. |
| GET | `/inventory/settings` | Inventory valuation/report settings | Yes | Yes | Implemented | Requires `inventory.view`; creates default settings on first read with `MOVING_AVERAGE`, negative stock blocked, and value tracking enabled. |
| PATCH | `/inventory/settings` | Update inventory settings | Yes | Yes | Implemented | Requires `inventory.manage`; can save `MOVING_AVERAGE` or `FIFO_PLACEHOLDER`, `allowNegativeStock`, and `trackInventoryValue`; no accounting posting is enabled. |
| GET | `/inventory/accounting-settings` | Inventory accounting settings and readiness | Yes | Yes | Implemented | Requires `inventory.view`; returns default-disabled accounting flag, account mappings including inventory clearing, purchase receipt posting mode, validation readiness, warnings, `previewOnly: true`, manual COGS readiness, and no automatic posting state. |
| PATCH | `/inventory/accounting-settings` | Update inventory accounting mappings | Yes | Yes | Implemented | Requires `inventory.manage`; validates mapped accounts belong to the tenant, are active/posting, and have approved account types; inventory clearing can be `LIABILITY` or `ASSET` but cannot equal inventory asset or AP code `210`; blocks enabling without inventory asset/COGS mappings or with FIFO; enabling allows manual COGS and compatible receipt asset posting only. |
| GET | `/inventory/purchase-receipt-posting-readiness` | Purchase receipt posting readiness audit | Yes | Yes | Implemented | Requires `inventory.view`; returns advisory no-auto-posting flags, blockers, warnings, Inventory Asset and Inventory Clearing account mappings, direct-mode bill count, clearing-mode bill count, and recommended next step; creates no settings, journals, or accounting mutations and does not enable automatic purchase receipt GL posting. |
| GET | `/inventory/reports/stock-valuation` | Operational stock valuation report | Yes | Yes | Implemented | Requires `inventory.view`; optional `itemId`, `warehouseId`, and `format=csv`; derives moving-average estimated values from costed inbound stock movements and warns when cost data is missing. |
| GET | `/inventory/reports/movement-summary` | Inventory movement summary report | Yes | Yes | Implemented | Requires `inventory.view`; optional `from`, `to`, `itemId`, `warehouseId`, and `format=csv`; returns opening, inbound, outbound, closing, count, and type breakdown by item/warehouse. |
| GET | `/inventory/reports/low-stock` | Low-stock report | Yes | Yes | Implemented | Requires `inventory.view`; optional `format=csv`; returns tracked items at or below `Item.reorderPoint`. |
| GET | `/inventory/reports/clearing-reconciliation` | Inventory clearing reconciliation | Yes | Yes | Implemented | Requires `inventory.view`; optional `from`, `to`, `supplierId`, `purchaseBillId`, `purchaseReceiptId`, `status`, and `format=csv`; compares finalized `INVENTORY_CLEARING` bill debits against active linked receipt asset posting credits and returns clearing account GL summary. Creates no journals. |
| GET | `/inventory/reports/clearing-variance` | Inventory clearing variance review | Yes | Yes | Implemented | Requires `inventory.view`; optional `from`, `to`, `supplierId`, `purchaseBillId`, `purchaseReceiptId`, `status`, and `format=csv`; returns only clearing rows needing review, including reversed receipt asset postings and receipts without compatible clearing bills. Creates no variance journals. |
| GET | `/inventory/variance-proposals` | List inventory variance proposals | Yes | Yes | Implemented | Requires `inventory.varianceProposals.view`; supports status/source/reason/source document/date filters; tenant scoped. |
| POST | `/inventory/variance-proposals` | Create manual variance proposal | Yes | Yes | Implemented | Requires `inventory.varianceProposals.create`; validates positive amount and active posting debit/credit accounts; creates a `DRAFT` proposal and event only. |
| POST | `/inventory/variance-proposals/from-clearing-variance` | Create proposal from clearing variance | Yes | Yes | Implemented | Requires `inventory.varianceProposals.create`; recomputes clearing variance server-side, chooses clearing/gain/loss accounts from settings, creates `DRAFT` proposal and event only; no journal. |
| GET | `/inventory/variance-proposals/:id` | Variance proposal detail | Yes | Yes | Implemented | Requires `inventory.varianceProposals.view`; tenant scoped with accounts, source bill/receipt, supplier, and journal links. |
| GET | `/inventory/variance-proposals/:id/events` | Variance proposal events | Yes | Yes | Implemented | Requires `inventory.varianceProposals.view`; returns CREATE/SUBMIT/APPROVE/POST/REVERSE/VOID timeline. |
| GET | `/inventory/variance-proposals/:id/accounting-preview` | Variance proposal accounting preview | Yes | Yes | Implemented | Requires `inventory.varianceProposals.view`; returns Dr debit account / Cr credit account preview, blockers, warnings, and `canPost`; creates no journal. |
| POST | `/inventory/variance-proposals/:id/submit` | Submit variance proposal | Yes | Yes | Implemented | Requires `inventory.varianceProposals.create`; moves `DRAFT` to `PENDING_APPROVAL`; creates event only. |
| POST | `/inventory/variance-proposals/:id/approve` | Approve variance proposal | Yes | Yes | Implemented | Requires `inventory.varianceProposals.approve`; moves `PENDING_APPROVAL` to `APPROVED`; creates event only. |
| POST | `/inventory/variance-proposals/:id/post` | Post variance proposal journal | Yes | Yes | Implemented | Requires `inventory.varianceProposals.post`; requires `APPROVED`, no existing journal, open fiscal period on proposal date, and valid accounts; creates one posted Dr debit / Cr credit journal. |
| POST | `/inventory/variance-proposals/:id/reverse` | Reverse variance proposal journal | Yes | Yes | Implemented | Requires `inventory.varianceProposals.reverse`; requires posted unreversed proposal and open fiscal period on current date; creates one reversal journal. |
| POST | `/inventory/variance-proposals/:id/void` | Void variance proposal | Yes | Yes | Implemented | Requires `inventory.varianceProposals.void`; allowed before posting only; posted proposals must be reversed instead. |

## Fiscal Periods

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/fiscal-periods` | List fiscal periods | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/fiscal-periods` | Create fiscal period | Yes | Yes | Implemented | Rejects invalid ranges and overlaps. |
| GET | `/fiscal-periods/:id` | Fiscal period detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/fiscal-periods/:id` | Update fiscal period | Yes | Yes | Implemented | Locked periods cannot be edited. |
| POST | `/fiscal-periods/:id/close` | Close open period | Yes | Yes | Implemented | Closed periods block postings. |
| POST | `/fiscal-periods/:id/reopen` | Reopen closed period | Yes | Yes | Implemented | Locked periods cannot reopen. |
| POST | `/fiscal-periods/:id/lock` | Lock open/closed period | Yes | Yes | Implemented | Irreversible in MVP. |

## Tax Rates, Items, Journals, Audit

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/tax-rates` | List tax rates | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/tax-rates` | Create tax rate | Yes | Yes | Implemented | Validates non-negative rates. |
| PATCH | `/tax-rates/:id` | Update tax rate | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/items` | List items | Yes | Yes | Implemented | Product/service records. |
| POST | `/items` | Create item | Yes | Yes | Implemented | Revenue account required. |
| GET | `/items/:id` | Item detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/items/:id` | Update item | Yes | Yes | Implemented | Tenant scoped. |
| DELETE | `/items/:id` | Delete item | Yes | Yes | Implemented | Blocks referenced items. |
| GET | `/journal-entries` | List journals | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/journal-entries` | Create draft journal | Yes | Yes | Implemented | Balanced lines required. |
| GET | `/journal-entries/:id` | Journal detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/journal-entries/:id` | Edit draft journal | Yes | Yes | Implemented | Draft only. |
| POST | `/journal-entries/:id/post` | Post journal | Yes | Yes | Implemented | Idempotency guarded. |
| POST | `/journal-entries/:id/reverse` | Reverse journal | Yes | Yes | Implemented | Creates opposite posted journal. |
| GET | `/audit-logs` | List audit logs | Yes | Yes | Implemented | Tenant scoped. |

## Sales Invoices

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/sales-invoices` | List invoices | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/sales-invoices/open` | Open invoices by customer | Yes | Yes | Implemented | Query `customerId`. |
| POST | `/sales-invoices` | Create draft invoice | Yes | Yes | Implemented | Server-side totals. |
| GET | `/sales-invoices/:id` | Invoice detail | Yes | Yes | Implemented | Includes lines/relations. |
| PATCH | `/sales-invoices/:id` | Edit draft invoice | Yes | Yes | Implemented | Draft only. |
| DELETE | `/sales-invoices/:id` | Delete draft invoice | Yes | Yes | Implemented | Draft only. |
| POST | `/sales-invoices/:id/finalize` | Finalize and post AR | Yes | Yes | Implemented | Idempotent. |
| POST | `/sales-invoices/:id/void` | Void invoice | Yes | Yes | Implemented | Blocks active allocations/payments. |
| GET | `/sales-invoices/:id/pdf-data` | Invoice PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/sales-invoices/:id/pdf` | Invoice PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/sales-invoices/:id/generate-pdf` | Generate/archive invoice PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/sales-invoices/:id/credit-notes` | Linked credit notes | Yes | Yes | Implemented | Invoice detail support. |
| GET | `/sales-invoices/:id/credit-note-allocations` | Credit allocation history | Yes | Yes | Implemented | Active/reversed rows. |
| GET | `/sales-invoices/:id/customer-payment-unapplied-allocations` | Overpayment allocation history | Yes | Yes | Implemented | Active/reversed rows. |

## Customer Payments, Credit Notes, Refunds

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/customer-payments` | List customer payments | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/customer-payments` | Create posted payment | Yes | Yes | Implemented | Allocations optional. |
| GET | `/customer-payments/:id` | Payment detail | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/customer-payments/:id/receipt-data` | Receipt data | Yes | Yes | Implemented | Legacy/structured data. |
| GET | `/customer-payments/:id/receipt-pdf-data` | Receipt PDF data | Yes | Yes | Implemented | Template data. |
| GET | `/customer-payments/:id/receipt.pdf` | Receipt PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/customer-payments/:id/generate-receipt-pdf` | Generate receipt PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/customer-payments/:id/unapplied-allocations` | Later overpayment allocations | Yes | Yes | Implemented | Active/reversed rows. |
| POST | `/customer-payments/:id/apply-unapplied` | Apply overpayment to invoice | Yes | Yes | Implemented | No journal entry. |
| POST | `/customer-payments/:id/unapplied-allocations/:allocationId/reverse` | Reverse overpayment allocation | Yes | Yes | Implemented | Restores balances. |
| POST | `/customer-payments/:id/void` | Void payment | Yes | Yes | Implemented | Restores invoice balances; blocks active later allocations/refunds. |
| DELETE | `/customer-payments/:id` | Delete draft payment | Yes | Yes | Partial | Draft exists in enum but MVP posts immediately. |
| GET | `/credit-notes` | List credit notes | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/credit-notes` | Create draft credit note | Yes | Yes | Implemented | Server-side totals. |
| GET | `/credit-notes/:id` | Credit note detail | Yes | Yes | Implemented | Includes lines/relations. |
| PATCH | `/credit-notes/:id` | Edit draft credit note | Yes | Yes | Implemented | Draft only. |
| DELETE | `/credit-notes/:id` | Delete draft credit note | Yes | Yes | Implemented | Draft only. |
| POST | `/credit-notes/:id/finalize` | Finalize and post AR reduction | Yes | Yes | Implemented | Idempotent. |
| POST | `/credit-notes/:id/void` | Void credit note | Yes | Yes | Implemented | Blocks active allocations/refunds. |
| GET | `/credit-notes/:id/allocations` | Credit allocations | Yes | Yes | Implemented | Includes reversed rows. |
| POST | `/credit-notes/:id/apply` | Apply credit note to invoice | Yes | Yes | Implemented | No journal entry. |
| POST | `/credit-notes/:id/allocations/:allocationId/reverse` | Reverse credit allocation | Yes | Yes | Implemented | Restores balances. |
| GET | `/credit-notes/:id/pdf-data` | Credit note PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/credit-notes/:id/pdf` | Credit note PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/credit-notes/:id/generate-pdf` | Generate credit note PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/customer-refunds` | List refunds | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/customer-refunds/refundable-sources` | Refundable payment/credit sources | Yes | Yes | Implemented | Query `customerId`. |
| POST | `/customer-refunds` | Create posted manual refund | Yes | Yes | Implemented | Payment gateway not involved. |
| GET | `/customer-refunds/:id` | Refund detail | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/customer-refunds/:id/void` | Void refund | Yes | Yes | Implemented | Restores source unapplied amount. |
| DELETE | `/customer-refunds/:id` | Delete draft refund | Yes | Yes | Partial | Draft exists in enum but MVP posts immediately. |
| GET | `/customer-refunds/:id/pdf-data` | Refund PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/customer-refunds/:id/pdf` | Refund PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/customer-refunds/:id/generate-pdf` | Generate refund PDF | Yes | Yes | Implemented | Explicit archive action. |

## Purchases And Supplier Payments

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/purchase-orders` | List purchase orders | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/purchase-orders` | Create draft purchase order | Yes | Yes | Implemented | Non-posting; server-side totals. |
| GET | `/purchase-orders/:id` | Purchase order detail | Yes | Yes | Implemented | Includes lines and converted bill link. |
| PATCH | `/purchase-orders/:id` | Edit draft purchase order | Yes | Yes | Implemented | Draft only. |
| DELETE | `/purchase-orders/:id` | Delete draft purchase order | Yes | Yes | Implemented | Draft only. |
| POST | `/purchase-orders/:id/approve` | Approve purchase order | Yes | Yes | Implemented | Requires positive total. |
| POST | `/purchase-orders/:id/mark-sent` | Mark purchase order sent | Yes | Yes | Implemented | Approved only. |
| POST | `/purchase-orders/:id/close` | Close purchase order | Yes | Yes | Implemented | Approved/sent/partial only. |
| POST | `/purchase-orders/:id/void` | Void purchase order | Yes | Yes | Implemented | Draft/approved/sent only. |
| POST | `/purchase-orders/:id/convert-to-bill` | Convert to draft bill | Yes | Yes | Implemented | Creates no journal entry. |
| GET | `/purchase-orders/:id/pdf-data` | Purchase order PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/purchase-orders/:id/pdf` | Purchase order PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/purchase-orders/:id/generate-pdf` | Generate purchase order PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/purchase-bills` | List purchase bills | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/purchase-bills/open` | Open bills by supplier | Yes | Yes | Implemented | Query `supplierId`. |
| POST | `/purchase-bills` | Create draft bill | Yes | Yes | Implemented | Server-side totals. |
| GET | `/purchase-bills/:id` | Bill detail | Yes | Yes | Implemented | Includes lines/allocations. |
| GET | `/purchase-bills/:id/accounting-preview` | Purchase bill accounting preview | Yes | Yes | Implemented | Requires `purchaseBills.view`; returns preview-only direct vs inventory-clearing journal shape, tracked/direct line counts, AP/VAT/Clearing account visibility, warnings, blockers, and finalization readiness; creates no journal. Clearing-mode preview can be finalizable when settings are valid. |
| PATCH | `/purchase-bills/:id` | Edit draft bill | Yes | Yes | Implemented | Draft only. |
| DELETE | `/purchase-bills/:id` | Delete draft bill | Yes | Yes | Implemented | Draft only. |
| POST | `/purchase-bills/:id/finalize` | Finalize and post AP | Yes | Yes | Implemented | Idempotent. Direct mode posts Dr line accounts / Dr VAT / Cr AP. Explicit Inventory Clearing mode posts Dr Inventory Clearing for tracked lines, Dr selected accounts for non-inventory lines, Dr VAT, and Cr AP after settings validation. |
| POST | `/purchase-bills/:id/void` | Void bill | Yes | Yes | Implemented | Blocks active supplier payment allocations. |
| GET | `/purchase-bills/:id/pdf-data` | Purchase bill PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/purchase-bills/:id/pdf` | Purchase bill PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/purchase-bills/:id/generate-pdf` | Generate purchase bill PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/supplier-payments` | List supplier payments | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/supplier-payments` | Create posted supplier payment | Yes | Yes | Implemented | Allocations optional. |
| GET | `/supplier-payments/:id` | Supplier payment detail | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/supplier-payments/:id/allocations` | Payment allocations | Yes | Yes | Implemented | Bill allocations. |
| POST | `/supplier-payments/:id/void` | Void supplier payment | Yes | Yes | Implemented | Restores bill balances. |
| DELETE | `/supplier-payments/:id` | Delete draft supplier payment | Yes | Yes | Partial | Draft exists in enum but MVP posts immediately. |
| GET | `/supplier-payments/:id/receipt-data` | Supplier receipt data | Yes | Yes | Implemented | Structured data. |
| GET | `/supplier-payments/:id/receipt-pdf-data` | Supplier receipt PDF data | Yes | Yes | Implemented | Template data. |
| GET | `/supplier-payments/:id/receipt.pdf` | Supplier receipt PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/supplier-payments/:id/generate-receipt-pdf` | Generate supplier receipt PDF | Yes | Yes | Implemented | Explicit archive action. |

## Reports

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/reports/general-ledger` | General Ledger JSON or CSV | Yes | Yes | Implemented | Requires `reports.view`; `format=csv` also requires `reports.export` or `generatedDocuments.download`. |
| GET | `/reports/general-ledger/pdf` | General Ledger PDF | Yes | Yes | Implemented | Requires `reports.view` plus export/download permission; archives generated PDF. |
| GET | `/reports/trial-balance` | Trial Balance JSON or CSV | Yes | Yes | Implemented | Requires `reports.view`; `format=csv` also requires export/download permission. |
| GET | `/reports/trial-balance/pdf` | Trial Balance PDF | Yes | Yes | Implemented | Archives generated PDF. |
| GET | `/reports/profit-and-loss` | Profit & Loss JSON or CSV | Yes | Yes | Implemented | Requires `reports.view`; `format=csv` also requires export/download permission. |
| GET | `/reports/profit-and-loss/pdf` | Profit & Loss PDF | Yes | Yes | Implemented | Archives generated PDF. |
| GET | `/reports/balance-sheet` | Balance Sheet JSON or CSV | Yes | Yes | Implemented | Supports `asOf`; `format=csv` returns `text/csv`. |
| GET | `/reports/balance-sheet/pdf` | Balance Sheet PDF | Yes | Yes | Implemented | Archives generated PDF. |
| GET | `/reports/vat-summary` | VAT Summary JSON or CSV | Yes | Yes | Implemented | VAT Summary is not an official filing export. |
| GET | `/reports/vat-summary/pdf` | VAT Summary PDF | Yes | Yes | Implemented | Includes non-filing warning note and archives generated PDF. |
| GET | `/reports/aged-receivables` | Aged Receivables JSON or CSV | Yes | Yes | Implemented | Supports `asOf`; CSV is basic. |
| GET | `/reports/aged-receivables/pdf` | Aged Receivables PDF | Yes | Yes | Implemented | Archives generated PDF. |
| GET | `/reports/aged-payables` | Aged Payables JSON or CSV | Yes | Yes | Implemented | Supports `asOf`; CSV is basic. |
| GET | `/reports/aged-payables/pdf` | Aged Payables PDF | Yes | Yes | Implemented | Archives generated PDF. |

## Documents

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/organization-document-settings` | Read document settings | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/organization-document-settings` | Update document settings | Yes | Yes | Implemented | Basic templates/colors. |
| GET | `/generated-documents` | List archive | Yes | Yes | Implemented | Excludes base64 payload. |
| GET | `/generated-documents/:id` | Archive detail | Yes | Yes | Implemented | Excludes base64 payload. |
| GET | `/generated-documents/:id/download` | Download archived PDF | Yes | Yes | Implemented | Streams stored PDF. |
| POST | `/attachments` | Upload linked supporting file | Yes | Yes | Implemented | Requires `attachments.upload`; JSON/base64 MVP upload; validates MIME type, size, base64, tenant-owned linked entity, and stores metadata/content hash. |
| GET | `/attachments` | List attachment metadata | Yes | Yes | Implemented | Requires `attachments.view`; supports `linkedEntityType`, `linkedEntityId`, and `status`; excludes base64 content. |
| GET | `/attachments/:id` | Attachment detail metadata | Yes | Yes | Implemented | Requires `attachments.view`; tenant scoped and excludes base64 content. |
| GET | `/attachments/:id/download` | Download uploaded attachment | Yes | Yes | Implemented | Requires `attachments.download`; streams original MIME type and sanitized filename; deleted attachments are not downloadable. |
| PATCH | `/attachments/:id` | Update attachment notes | Yes | Yes | Implemented | Requires `attachments.manage`; active attachments only. |
| DELETE | `/attachments/:id` | Soft-delete attachment | Yes | Yes | Implemented | Requires `attachments.delete`; marks `DELETED` and preserves metadata. |
| GET | `/storage/readiness` | Storage provider readiness | Yes | Yes | Implemented | Requires `documentSettings.view` or `attachments.manage`; reports active attachment/generated-document providers, database warnings, max upload size, S3 config booleans, and no secret values. |
| GET | `/storage/migration-plan` | Storage migration dry-run plan | Yes | Yes | Implemented | Requires `documentSettings.view` or `attachments.manage`; counts attachment/generated-document records and bytes by storage domain; does not copy, delete, or rewrite content. |

## ZATCA And SDK

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/zatca/profile` | ZATCA seller profile | Yes | Yes | Implemented | Local readiness only. |
| PATCH | `/zatca/profile` | Update profile | Yes | Yes | Implemented | No official validation. |
| GET | `/zatca/adapter-config` | Safe adapter config summary | Yes | Yes | Implemented | Real network disabled by default. |
| GET | `/zatca/compliance-checklist` | Static compliance checklist | Yes | Yes | Implemented | Not legal certification. |
| GET | `/zatca/xml-field-mapping` | Local XML mapping | Yes | Yes | Implemented | Not official validation. |
| GET | `/zatca/readiness` | Local readiness booleans | Yes | Yes | Implemented | `productionReady=false`. |
| GET | `/zatca/egs-units` | List EGS units | Yes | Yes | Implemented | Private key redacted. |
| POST | `/zatca/egs-units` | Create EGS unit | Yes | Yes | Implemented | Local/dev data. |
| GET | `/zatca/egs-units/:id` | EGS detail | Yes | Yes | Implemented | Private key redacted. |
| PATCH | `/zatca/egs-units/:id` | Update EGS unit | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/zatca/egs-units/:id/activate-dev` | Activate dev EGS | Yes | Yes | Implemented | Local-only helper. |
| POST | `/zatca/egs-units/:id/generate-csr` | Generate local CSR | Yes | Yes | Partial | CSR fields need official verification. |
| GET | `/zatca/egs-units/:id/csr` | CSR PEM | Yes | Yes | Implemented | CSR only, no private key. |
| GET | `/zatca/egs-units/:id/csr/download` | CSR download | Yes | Yes | Implemented | CSR only. |
| POST | `/zatca/egs-units/:id/request-compliance-csid` | Mock/safe compliance CSID | Yes | Yes | Mock/Scaffold | Mock by default, real disabled. |
| POST | `/zatca/egs-units/:id/request-production-csid` | Production CSID placeholder | Yes | Yes | Placeholder | Not implemented for production. |
| GET | `/sales-invoices/:id/zatca` | Invoice ZATCA metadata | Yes | Yes | Implemented | Local metadata only. |
| POST | `/sales-invoices/:id/zatca/generate` | Generate local XML/QR/hash | Yes | Yes | Groundwork | Not official XML/signing. |
| POST | `/sales-invoices/:id/zatca/compliance-check` | Mock/local compliance check | Yes | Yes | Mock | Logs local success only. |
| POST | `/sales-invoices/:id/zatca/clearance` | Clearance endpoint | Yes | Yes | Safe blocked | No production clearance. |
| POST | `/sales-invoices/:id/zatca/reporting` | Reporting endpoint | Yes | Yes | Safe blocked | No production reporting. |
| GET | `/sales-invoices/:id/zatca/xml` | Local XML download | Yes | Yes | Groundwork | Not official ZATCA XML. |
| GET | `/sales-invoices/:id/zatca/xml-validation` | Local XML validation | Yes | Yes | Groundwork | `officialValidation=false`. |
| GET | `/sales-invoices/:id/zatca/qr` | Local QR payload | Yes | Yes | Groundwork | Phase 2 QR incomplete. |
| GET | `/zatca/submissions` | Submission/onboarding logs | Yes | Yes | Implemented | Includes mock/safe blocked logs. |
| GET | `/zatca-sdk/readiness` | Local SDK readiness | Yes | Yes | Groundwork | Does not run SDK. |
| POST | `/zatca-sdk/validate-xml-dry-run` | SDK validation dry-run plan | Yes | Yes | Groundwork | Does not execute SDK. |
| POST | `/zatca-sdk/validate-xml-local` | Local SDK execution gate | Yes | Yes | Disabled placeholder | Disabled and not command-verified. |
