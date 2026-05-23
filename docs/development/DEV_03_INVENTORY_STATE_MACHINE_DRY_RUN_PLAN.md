# DEV-03 Inventory State-Machine QA Dry-Run Plan

## 1. Purpose And Scope

This DEV-03 Part 6 plan maps Inventory state-machine workflows before any local runtime mutation is approved. It covers item and warehouse setup gates, manual stock movement boundaries, adjustments, warehouse transfers, purchase receipts, sales stock issues, inventory reports/settings, clearing reports, and inventory variance proposals.

This pass is planning-only. No login, fixture creation, inventory mutation, accounting mutation, report export, download, PDF generation, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup/restore, or production check was performed.

Source evidence inspected:

- `CODEX_HANDOFF.md`
- `docs/development/DEV_03_STATE_MACHINE_QA_INVENTORY.md`
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`
- `docs/development/DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_02_FINAL_HANDOFF.md`
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`
- `docs/development/DEV_01_FINAL_TRIAGE.md`
- `docs/development/DEVELOPMENT_COMPLETION_PLAN.md`
- `BUG_AUDIT.md`
- `README.md`
- `apps/api/prisma/schema.prisma`
- Inventory-related API controllers, services, and specs under `apps/api/src`
- Inventory-related web routes, helpers, and tests under `apps/web/src`
- `tests/e2e/inventory-flow.spec.ts` as reference only; it was not run

## 2. Safety Rules For This Inventory Dry-Run Plan

- Keep DEV-03 Part 6 documentation-only.
- Do not login or run any flow that writes audit logs.
- Do not create fixture data yet.
- Do not create, edit, approve, void, transfer, receive, issue, post, reverse, propose variance, approve variance, export, download, upload, delete, or migrate anything.
- Do not run E2E, smoke, migrations, seed/reset/delete, ZATCA, email, backup/restore, exports, downloads, PDF generation, deployment, production checks, or environment changes.
- Future mutation QA must be local-disposable only, explicitly approved, and use `DEV03-INV-` fixture markers.
- Any output-producing inventory report CSV or accounting-document evidence remains deferred until an approved output-gate batch.
- Any posting-date or fiscal-period behavior remains planned-only here and must be tested later with disposable data.

## 3. Inventory Workflow Map

### Item Create/Edit Inventory-Tracked Boundaries

- Routes: `/items`.
- API endpoints/controllers/services: `ItemController` and `ItemService`; `GET /items`, `POST /items`, `GET /items/:id`, `PATCH /items/:id`, `DELETE /items/:id`.
- Status/state fields: `Item.status` defaults `ACTIVE`; `Item.inventoryTracking` gates stock workflows; item type/account/tax fields gate AR/AP form behavior.
- Allowed transitions visible from code: create active/inactive item, update status and inventory-tracking flag, delete only when unused by sales invoice lines.
- Permissions required: `items.view` for list/detail; `items.manage` for create/update/delete.
- Audit/log side effects: `CREATE`, `UPDATE`, and `DELETE` audit logs are written by `ItemService`.
- Accounting impact: no direct journal posting, but revenue, expense, tax, purchase cost, and inventory-tracking flags affect later AR/AP/inventory workflows.
- Inventory quantity/cost impact: enabling inventory tracking allows stock movements; disabling tracking on used inventory items needs future fixture QA because the current service allows update and downstream workflows require tracked active items.
- Output/document impact: none directly.
- QA priority: High.
- QA status: Planned only.

### Warehouse Create/Edit/Archive/Reactivate

- Routes: `/inventory/warehouses`, `/inventory/warehouses/[id]`.
- API endpoints/controllers/services: `WarehouseController` and `WarehouseService`; `GET /warehouses`, `POST /warehouses`, `GET /warehouses/:id`, `PATCH /warehouses/:id`, `POST /warehouses/:id/archive`, `POST /warehouses/:id/reactivate`.
- Status/state fields: `Warehouse.status` is `ACTIVE` or `ARCHIVED`; `isDefault` affects archive guard behavior.
- Allowed transitions visible from code: create active warehouse; update code/name/address/default marker; `ACTIVE -> ARCHIVED`; `ARCHIVED -> ACTIVE`. Archiving the only active default warehouse is blocked.
- Permissions required: `warehouses.view` for list/detail; `warehouses.manage` for create/update/archive/reactivate.
- Audit/log side effects: `CREATE`, `UPDATE`, `ARCHIVE`, and `REACTIVATE` audit logs are written by `WarehouseService`.
- Accounting impact: no direct journal posting.
- Inventory quantity/cost impact: archived warehouses cannot receive stock movements, adjustments, transfers, purchase receipts, or sales stock issues.
- Output/document impact: none directly.
- QA priority: High.
- QA status: Planned only.

### Stock Movement Create/Manual Movement Boundaries

- Routes: `/inventory/stock-movements`, `/inventory/stock-movements/new`.
- API endpoints/controllers/services: `StockMovementController` and `StockMovementService`; `GET /stock-movements`, `POST /stock-movements`, `GET /stock-movements/:id`.
- Status/state fields: no separate status field. `StockMovement.type` includes `OPENING_BALANCE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `PURCHASE_RECEIPT_PLACEHOLDER`, and `SALES_ISSUE_PLACEHOLDER`.
- Allowed transitions visible from code: direct create is limited to `OPENING_BALANCE`; direct adjustment movements are rejected so adjustments own that lifecycle. Duplicate opening balance for the same item/warehouse is blocked.
- Permissions required: `stockMovements.view` for list/detail; `stockMovements.create` for manual opening-balance creation.
- Audit/log side effects: direct create writes a `CREATE` audit log.
- Accounting impact: no direct journal posting.
- Inventory quantity/cost impact: inbound and outbound directions drive quantity-on-hand and moving-average report calculations. Direct create requires active inventory-tracked item and active warehouse.
- Output/document impact: stock movement lists and reports consume these rows.
- QA priority: High.
- QA status: Planned only.

### Inventory Adjustment Create/Edit/Approve/Void

- Routes: `/inventory/adjustments`, `/inventory/adjustments/new`, `/inventory/adjustments/[id]`, `/inventory/adjustments/[id]/edit`.
- API endpoints/controllers/services: `InventoryAdjustmentController` and `InventoryAdjustmentService`; `GET /inventory-adjustments`, `POST /inventory-adjustments`, `GET /inventory-adjustments/:id`, `PATCH /inventory-adjustments/:id`, `DELETE /inventory-adjustments/:id`, `POST /inventory-adjustments/:id/approve`, `POST /inventory-adjustments/:id/void`.
- Status/state fields: `InventoryAdjustment.status` is `DRAFT`, `APPROVED`, or `VOIDED`; type is `INCREASE` or `DECREASE`.
- Allowed transitions visible from code: create `DRAFT`; edit/delete only `DRAFT`; approve `DRAFT -> APPROVED`; void `DRAFT -> VOIDED`; void `APPROVED -> VOIDED` with reversing movement. Approving a decrease and voiding an approved increase are blocked if they would make stock negative.
- Permissions required: `inventoryAdjustments.view`, `inventoryAdjustments.create`, `inventoryAdjustments.approve`, and `inventoryAdjustments.void`.
- Audit/log side effects: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, and `VOID` audit logs are written by `InventoryAdjustmentService`.
- Accounting impact: no direct journal posting.
- Inventory quantity/cost impact: approval creates `ADJUSTMENT_IN` or `ADJUSTMENT_OUT`; void of approved adjustments creates reversing movements.
- Output/document impact: inventory balances, movement summary, stock valuation, and low-stock reports consume the movements.
- QA priority: Critical.
- QA status: Planned only.

### Warehouse Transfer Create/Void

- Routes: `/inventory/transfers`, `/inventory/transfers/new`, `/inventory/transfers/[id]`.
- API endpoints/controllers/services: `WarehouseTransferController` and `WarehouseTransferService`; `GET /warehouse-transfers`, `POST /warehouse-transfers`, `GET /warehouse-transfers/:id`, `POST /warehouse-transfers/:id/void`.
- Status/state fields: `WarehouseTransfer.status` is `POSTED` or `VOIDED`.
- Allowed transitions visible from code: create immediate `POSTED`; void `POSTED -> VOIDED`; duplicate void is blocked. Source and destination warehouses must differ. Create is blocked if source stock would go negative; void is blocked if destination stock would go negative.
- Permissions required: `warehouseTransfers.view`, `warehouseTransfers.create`, and `warehouseTransfers.void`.
- Audit/log side effects: `CREATE` and `VOID` audit logs are written by `WarehouseTransferService`.
- Accounting impact: no direct journal posting.
- Inventory quantity/cost impact: create writes paired `TRANSFER_OUT` and `TRANSFER_IN`; void writes paired reversal movements.
- Output/document impact: inventory movement reports and balances consume the paired movements.
- QA priority: Critical.
- QA status: Planned only.

### Purchase Receipt Create/Void/Posting Preview

- Routes: `/inventory/purchase-receipts`, `/inventory/purchase-receipts/new`, `/inventory/purchase-receipts/[id]`.
- API endpoints/controllers/services: `PurchaseReceiptController`, `PurchaseReceivingStatusController`, and `PurchaseReceiptService`; `GET /purchase-receipts`, `POST /purchase-receipts`, `GET /purchase-receipts/:id`, `GET /purchase-receipts/:id/accounting-preview`, `POST /purchase-receipts/:id/post-inventory-asset`, `POST /purchase-receipts/:id/reverse-inventory-asset`, `POST /purchase-receipts/:id/void`, source receiving/matching status endpoints for purchase orders and purchase bills.
- Status/state fields: `PurchaseReceipt.status` is `POSTED` or `VOIDED`; receipt lines link to stock movements and optional void movements; receipt asset journal fields track manual accounting post/reverse lifecycle.
- Allowed transitions visible from code: create immediate `POSTED`; preview is read-only; post inventory asset once when settings, linked finalized inventory-clearing bill, unit costs, positive value, and fiscal-period checks allow it; reverse asset posting once; void `POSTED -> VOIDED` after active asset posting is reversed. Void is blocked if it would make stock negative.
- Permissions required: `purchaseReceiving.view`, `purchaseReceiving.create`, `inventory.view`, `inventory.receipts.postAsset`, and `inventory.receipts.reverseAsset`.
- Audit/log side effects: `CREATE`, `POST_INVENTORY_ASSET`, `REVERSE_INVENTORY_ASSET`, and `VOID` audit logs are written by `PurchaseReceiptService`.
- Accounting impact: create/void are operational stock only; `post-inventory-asset` creates a posted journal; reverse creates a reversal journal and marks the original journal `REVERSED`.
- Inventory quantity/cost impact: create writes inbound `PURCHASE_RECEIPT_PLACEHOLDER` movements; void writes outbound reversal movements. Moving-average report cost depends on costed inbound movements.
- Output/document impact: accounting preview and clearing reports expose financial-output-like evidence; CSV/report output remains deferred.
- QA priority: Critical.
- QA status: Planned only.

### Sales Stock Issue Create/Void/COGS Preview

- Routes: `/inventory/sales-stock-issues`, `/inventory/sales-stock-issues/new`, `/inventory/sales-stock-issues/[id]`.
- API endpoints/controllers/services: `SalesStockIssueController`, `SalesStockIssueStatusController`, and `SalesStockIssueService`; `GET /sales-stock-issues`, `POST /sales-stock-issues`, `GET /sales-stock-issues/:id`, `GET /sales-stock-issues/:id/accounting-preview`, `POST /sales-stock-issues/:id/post-cogs`, `POST /sales-stock-issues/:id/reverse-cogs`, `POST /sales-stock-issues/:id/void`, and `GET /sales-invoices/:id/stock-issue-status`.
- Status/state fields: `SalesStockIssue.status` is `POSTED` or `VOIDED`; COGS journal fields track manual post/reverse lifecycle.
- Allowed transitions visible from code: create immediate `POSTED` from finalized sales invoice inventory-tracked lines; preview is read-only; post COGS once when inventory accounting/settings and fiscal-period checks allow it; reverse COGS once; void `POSTED -> VOIDED` after active COGS posting is reversed. Create rejects draft/voided invoices, over-issue, and insufficient stock.
- Permissions required: `salesStockIssue.view`, `salesStockIssue.create`, `inventory.view`, `inventory.cogs.post`, and `inventory.cogs.reverse`.
- Audit/log side effects: `CREATE`, `POST_COGS`, `REVERSE_COGS`, and `VOID` audit logs are written by `SalesStockIssueService`.
- Accounting impact: create/void are operational stock only; `post-cogs` creates a posted COGS journal; reverse creates a reversal journal and marks the original journal `REVERSED`.
- Inventory quantity/cost impact: create writes outbound `SALES_ISSUE_PLACEHOLDER` movements; void writes inbound reversal movements; COGS preview uses moving-average cost.
- Output/document impact: accounting preview exposes financial-output-like evidence; generated documents are not part of this workflow.
- QA priority: Critical.
- QA status: Planned only.

### Inventory Balances, Valuation, And Operational Reports

- Routes: `/inventory/balances`, `/inventory/reports/stock-valuation`, `/inventory/reports/movement-summary`, `/inventory/reports/low-stock`.
- API endpoints/controllers/services: `InventoryController` and `InventoryService`; `GET /inventory/balances`, `GET /inventory/reports/stock-valuation`, `GET /inventory/reports/movement-summary`, `GET /inventory/reports/low-stock`; report endpoints can return JSON or CSV through `format=csv`.
- Status/state fields: read-only report outputs summarize item, warehouse, stock movement, valuation method, and reorder-point state.
- Allowed transitions visible from code: no business-state transition; reports are read/output gates.
- Permissions required: `inventory.view` on the API. DEV-01 noted web CSV buttons are hidden unless export/download permissions are present, while API report export permission policy remains a follow-up question.
- Audit/log side effects: none visible for JSON/CSV report reads in this pass.
- Accounting impact: no ledger mutation, but stock valuation output can affect financial review and must avoid false certainty because FIFO is placeholder-only and moving-average estimates depend on available cost data.
- Inventory quantity/cost impact: balances and reports depend on stock movement directions and costed inbound movements.
- Output/document impact: CSV output is an output gate and remains deferred.
- QA priority: High.
- QA status: Planned only.

### Inventory Settings And Valuation Policy Boundaries

- Routes: `/inventory/settings`.
- API endpoints/controllers/services: `InventoryController`, `InventoryService`, and `InventoryAccountingService`; `GET /inventory/settings`, `PATCH /inventory/settings`, `GET /inventory/accounting-settings`, `PATCH /inventory/accounting-settings`, `GET /inventory/purchase-receipt-posting-readiness`.
- Status/state fields: `InventorySettings.valuationMethod` is `MOVING_AVERAGE` or `FIFO_PLACEHOLDER`; `allowNegativeStock`; `trackInventoryValue`; `enableInventoryAccounting`; account mappings; `purchaseReceiptPostingMode` is `DISABLED` or `PREVIEW_ONLY`.
- Allowed transitions visible from code: settings can be patched; accounting settings can be enabled only with required active posting account mappings; automatic purchase receipt posting stays disabled/preview-only in current tests.
- Permissions required: `inventory.view` for reads/readiness; `inventory.manage` for settings changes.
- Audit/log side effects: settings mutation audit behavior should be confirmed in the future batch before any runtime change.
- Accounting impact: settings gate manual receipt asset posting, manual COGS posting, and variance proposal posting readiness.
- Inventory quantity/cost impact: `allowNegativeStock` and valuation method affect interpretation; current operational services still perform no-negative-stock checks in key state machines.
- Output/document impact: setting labels and warnings affect report trust boundaries.
- QA priority: Critical.
- QA status: Planned only.

### Clearing Reconciliation And Variance Reports

- Routes: `/inventory/reports/clearing-reconciliation`, `/inventory/reports/clearing-variance`.
- API endpoints/controllers/services: `InventoryController` and `InventoryClearingReportService`; `GET /inventory/reports/clearing-reconciliation`, `GET /inventory/reports/clearing-variance`; both support CSV via `format=csv`.
- Status/state fields: report rows derive from finalized inventory-clearing purchase bills, posted/voided receipts, active/reversed receipt asset journals, and variance status labels.
- Allowed transitions visible from code: no direct transition; reports identify clearing differences that can feed variance proposal creation.
- Permissions required: `inventory.view` on the API; DEV-01 noted web CSV button export permission gating and an API permission-policy follow-up.
- Audit/log side effects: none visible for report reads in this pass.
- Accounting impact: read-only, but output can drive later variance proposal journals.
- Inventory quantity/cost impact: reflects receipt and bill matching/cost variance.
- Output/document impact: CSV output remains deferred.
- QA priority: High.
- QA status: Planned only.

### Variance Proposal Create/Submit/Approve/Post/Reverse/Void

- Routes: `/inventory/variance-proposals`, `/inventory/variance-proposals/new`, `/inventory/variance-proposals/[id]`.
- API endpoints/controllers/services: `InventoryVarianceProposalController` and `InventoryVarianceProposalService`; `GET /inventory/variance-proposals`, `POST /inventory/variance-proposals`, `POST /inventory/variance-proposals/from-clearing-variance`, `GET /inventory/variance-proposals/:id`, `GET /inventory/variance-proposals/:id/events`, `GET /inventory/variance-proposals/:id/accounting-preview`, `POST /inventory/variance-proposals/:id/submit`, `POST /inventory/variance-proposals/:id/approve`, `POST /inventory/variance-proposals/:id/post`, `POST /inventory/variance-proposals/:id/reverse`, `POST /inventory/variance-proposals/:id/void`.
- Status/state fields: `InventoryVarianceProposal.status` is `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `POSTED`, `REVERSED`, or `VOIDED`; proposal source is `CLEARING_VARIANCE` or `MANUAL`; events record lifecycle actions.
- Allowed transitions visible from code: create `DRAFT`; `DRAFT -> PENDING_APPROVAL`; `PENDING_APPROVAL -> APPROVED`; `APPROVED -> POSTED`; `POSTED -> REVERSED`; `DRAFT|PENDING_APPROVAL|APPROVED -> VOIDED`. Posted proposals must be reversed before void and reversed proposals are terminal.
- Permissions required: `inventory.varianceProposals.view`, `.create`, `.approve`, `.post`, `.reverse`, and `.void`.
- Audit/log side effects: `CREATE`, `SUBMIT`, `APPROVE`, `POST`, `REVERSE`, and `VOID` audit logs are written; proposal event rows are also created for lifecycle actions.
- Accounting impact: post creates a balanced journal; reverse creates a reversal journal and marks original journal `REVERSED`. Preview is read-only.
- Inventory quantity/cost impact: no direct stock movement mutation, but proposals resolve inventory clearing/cost variance.
- Output/document impact: accounting preview is a financial-output gate; no PDF generation in this flow.
- QA priority: Critical.
- QA status: Planned only.

## 4. Proposed Local Disposable Fixtures

All future fixture names must start with `DEV03-INV-` and must be local-disposable only.

- Organization marker: `DEV03-INV-ORG`.
- User marker: `DEV03-INV-USER-admin` with only the inventory permissions needed for the approved batch.
- Item marker: `DEV03-INV-ITEM-TRACKED` with `inventoryTracking=true`, fake SKU, purchase cost, reorder point, revenue/expense mappings, and active tax/account references as required.
- Service/non-tracked item marker: `DEV03-INV-ITEM-SERVICE` to prove stock workflows reject non-tracked items.
- Warehouse markers: `DEV03-INV-WH-A` and `DEV03-INV-WH-B`, both active; optional archived warehouse `DEV03-INV-WH-ARCHIVED`.
- Stock movement marker: `DEV03-INV-OPENING-BALANCE` for the one allowed direct movement per item/warehouse.
- Adjustment markers: `DEV03-INV-ADJ-IN-DRAFT`, `DEV03-INV-ADJ-OUT-DRAFT`, and approved/void candidates.
- Transfer marker: `DEV03-INV-XFER-A-B` with source/destination quantities arranged for no-negative-stock and void-blocker cases.
- Purchase receipt marker: `DEV03-INV-RECEIPT` linked to approved purchase order or finalized inventory-clearing purchase bill when the approved batch needs matching/posting assertions.
- Sales stock issue marker: `DEV03-INV-ISSUE` linked to finalized sales invoice inventory-tracked lines when the approved batch needs stock issue or COGS assertions.
- Variance proposal marker: `DEV03-INV-VAR-MANUAL` and, separately, `DEV03-INV-VAR-CLEARING` from a controlled clearing variance.
- Chart/account markers if required: `DEV03-INV-ACCOUNT-ASSET`, `DEV03-INV-ACCOUNT-COGS`, `DEV03-INV-ACCOUNT-CLEARING`, `DEV03-INV-ACCOUNT-VAR-GAIN`, and `DEV03-INV-ACCOUNT-VAR-LOSS`.
- Supplier/customer markers if required by receipt/issue flows: `DEV03-INV-SUPPLIER` and `DEV03-INV-CUSTOMER`.

Fixture records must not use real customer/vendor names, real SKUs, real bank/account details, real tax identifiers, production-like invoices, real attachments, or signed/official output.

## 5. Dry-Run Test Matrix

| Workflow | Preconditions | Action to test in later approved mutation run | Expected state before | Expected state after | Expected ledger/accounting effect | Expected inventory quantity/cost effect | Expected audit effect | Expected document/output effect | Rollback/cleanup expectation | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Item inventory-tracked setup | `DEV03-INV-ITEM-TRACKED`, active posting/tax references, isolated org/user. | Create/update tracked item and attempt invalid non-tracked stock workflow. | No fixture item or active fixture item. | Item active with tracking; invalid non-tracked movement rejected. | No journal entry. | Enables later stock movement eligibility. | Item create/update audit log expected. | None. | Mark item inactive or leave marker for batch cleanup evidence. | Planned only |
| Warehouse lifecycle | Two active warehouses plus optional archived warehouse. | Create, update, archive, reactivate, and attempt archive of only active default warehouse. | Warehouses active. | Valid archive/reactivate transitions; only-active-default archive blocked. | No journal entry. | Archived warehouse rejected by movement workflows. | Warehouse create/update/archive/reactivate audit logs expected. | None. | Reactivate or leave markers for cleanup evidence. | Planned only |
| Opening balance movement | Active tracked item, active warehouse, no prior opening balance for pair. | Create `OPENING_BALANCE`; attempt duplicate; attempt direct `ADJUSTMENT_OUT`. | Quantity zero. | Opening balance row created; duplicate/direct adjustment rejected. | No journal entry. | Quantity increases; moving average may use unit cost. | Stock movement create audit log expected. | Affects balance/report reads only. | Leave marker and reverse through approved adjustment only if explicitly approved later. | Planned only |
| Inventory adjustment increase | Draft increase adjustment with active tracked item/warehouse. | Create, edit, approve, then void approved increase. | `DRAFT`; quantity unchanged. | `APPROVED` creates inbound movement; `VOIDED` creates outbound reversal if stock available. | No journal entry. | Quantity up then back down; cost reflected in movement reports. | Create/update/approve/void audit logs expected. | Report rows update; no export/download. | Void the approved adjustment or document open marker. | Planned only |
| Inventory adjustment decrease | Existing positive quantity above decrease amount. | Create decrease, approve, then test over-decrease blocker. | `DRAFT`; stock sufficient for valid case. | Valid `APPROVED` creates outbound movement; over-decrease blocked. | No journal entry. | Quantity decreases without going negative. | Create/approve audit logs expected; blocker error should not create movement. | Report rows update; no export/download. | Void approved adjustment if explicitly approved and stock permits. | Planned only |
| Warehouse transfer | Source warehouse has sufficient quantity; destination active. | Create transfer A to B; attempt same-warehouse; attempt insufficient source; void transfer. | Source has stock; destination has known quantity. | `POSTED` transfer with paired movements; invalid cases blocked; `VOIDED` creates paired reversals. | No journal entry. | Source down/destination up, then reversed; no negative stock. | Create/void audit logs expected. | Report rows update; no export/download. | Void transfer or leave marker with documented state. | Planned only |
| Purchase receipt operational receiving | Approved PO or finalized bill with inventory-tracked lines, supplier, active warehouse. | Create receipt; test over-receipt; void receipt; test void when stock would go negative. | No receipt or source has remaining receivable quantity. | `POSTED` receipt with inbound movements; `VOIDED` creates outbound reversals; blockers do not mutate. | No journal entry from create/void. | Quantity increases and can reverse if stock remains available. | Create/void audit logs expected. | Receiving/matching status updates; no CSV/PDF/download. | Void receipt after any required posting reversal, or document marker. | Planned only |
| Purchase receipt asset posting | Posted receipt linked to finalized inventory-clearing bill, unit costs, enabled settings, valid accounts, open fiscal period. | Run accounting preview, post inventory asset once, reject double post, reverse once, reject double reverse. | Receipt `POSTED` with no active asset journal. | Asset journal posted then reversed; original journal `REVERSED`; receipt fields link both journals. | Dr inventory asset / Cr inventory clearing; reversal mirrors original. | Stock movements unchanged by accounting post/reverse. | Post/reverse audit logs expected. | Accounting preview is output evidence; no export/download. | Reverse active asset posting before any receipt void. | Planned only |
| Sales stock issue operational issue | Finalized sales invoice with tracked item lines, active warehouse, sufficient quantity. | Create issue; test draft/voided invoice rejection; test over-issue/insufficient stock; void issue. | Invoice finalized; stock sufficient. | `POSTED` issue with outbound movements; `VOIDED` creates inbound reversals; blockers do not mutate. | No journal entry from create/void. | Quantity decreases and can reverse. | Create/void audit logs expected. | Issue status updates; no PDF/download. | Void issue after any required COGS reversal, or document marker. | Planned only |
| Sales stock issue COGS posting | Posted issue, enabled inventory accounting, mapped accounts, open fiscal period, moving-average cost. | Run COGS preview, post once, reject double post, reverse once, reject double reverse. | Issue `POSTED` with no COGS journal. | COGS journal posted then reversed; original journal `REVERSED`; issue fields link both journals. | Dr COGS / Cr inventory asset; reversal mirrors original. | Stock movements unchanged by accounting post/reverse. | Post/reverse audit logs expected. | Accounting preview is output evidence; no export/download. | Reverse active COGS before any issue void. | Planned only |
| Inventory balances and reports | Known item/warehouse/movement fixture graph. | Read balances, valuation, movement summary, and low-stock JSON; export checks only with later approval. | Fixture movements exist. | JSON reflects movement directions, costs, warnings, and reorder status. | No journal mutation. | Reported quantities/costs match fixture graph. | No audit log expected for JSON reads unless code changes later. | CSV output deferred. | No cleanup from reads; fixture cleanup handled by owning mutation batch. | Planned only |
| Inventory settings/accounting readiness | Active account mapping fixtures and settings defaults. | Read settings/readiness; later approved run may patch settings in isolated org only. | Defaults: moving average, negative stock false, accounting disabled, posting disabled/preview-only. | Settings/readiness reflect account mapping and preview-only posture. | Can enable manual posting gates; no auto-posting expected. | Valuation/report wording affected; operational no-negative-stock checks remain critical. | Settings mutation audit must be confirmed before execution. | Warnings/readiness output only. | Restore prior settings or document marker-specific settings. | Planned only |
| Clearing reconciliation and variance reports | Controlled finalized clearing bill, posted receipt, active/reversed receipt asset journal scenarios. | Read report JSON; later approved output run may check CSV. | Fixture bills/receipts/journals exist. | Rows classify matched, missing, reversed, direct-mode, and price/quantity variance cases. | No journal mutation. | No stock mutation; report reflects receipt/bill differences. | No audit log expected for JSON reads unless code changes later. | CSV output deferred. | No cleanup from reads; fixture cleanup handled by owning mutation batch. | Planned only |
| Variance proposal lifecycle | Manual or clearing-variance source, active debit/credit accounts, open fiscal period. | Create, submit, approve, preview, post, reject double post, reverse, reject void reversed; separately void non-posted proposal. | `DRAFT` proposal with valid accounts. | `PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED`; allowed non-posted void to `VOIDED`. | Posting creates balanced journal; reverse marks original `REVERSED`. | No direct stock quantity mutation. | Proposal audit logs and proposal event rows expected for lifecycle actions. | Accounting preview only; no export/download. | Reverse any posted proposal; leave terminal markers documented. | Planned only |

## 6. Commands That May Be Needed Later, But Must Not Be Run Now

Candidate commands for a future approved inventory mutation QA batch:

- `corepack pnpm --filter @ledgerbyte/api test -- inventory-adjustment.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/api test -- warehouse-transfer.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/api test -- purchase-receipt.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/api test -- sales-stock-issue.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/api test -- inventory-variance-proposal.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- inventory`
- Local API health/readiness checks only after services are explicitly approved for the batch.
- Authenticated API/browser calls only after login/audit-writing approval and disposable fixture data approval.

Commands still forbidden by default:

- Full E2E, full smoke, migrations, seed/reset/delete, deploys, environment changes, real ZATCA, real email, backup/restore, production-hosting research, login/audit-writing flows, fixture creation, inventory mutations, report exports/downloads, and PDF generation.

## 7. Existing Coverage Found

- API specs cover inventory adjustments, warehouse transfers, purchase receipts, sales stock issues, stock movements, warehouses, inventory settings/accounting readiness, reports, clearing reports, variance proposals, and controller permission guards.
- Important covered cases visible from test names include no-negative-stock blockers, draft-only edit/delete for adjustments, double void blockers, receipt asset preview/post/reverse, COGS preview/post/reverse, variance proposal submit/approve/post/reverse/void, account mapping validation, tenant isolation, and report classification.
- Web tests cover inventory helper labels/warnings/action visibility, inventory accounting warnings, manual COGS and receipt asset posting status helpers, clearing report helper behavior, variance proposal helper behavior, and inventory workflow guidance copy.
- `tests/e2e/inventory-flow.spec.ts` exists, but it was only referenced by file name because E2E is out of scope for this dry-run planning pass.

## 8. Missing Coverage

- No approved runtime login/audit-writing proof exists for inventory workflows.
- No disposable `DEV03-INV-` fixture graph exists yet.
- No browser-runtime proof exists for authenticated inventory action gating because Browser Use local URL policy and login/audit-writing remained deferred.
- No approved mutation-run evidence exists for item tracking changes against already-used items.
- No approved end-to-end fixture proof exists for purchase receipt asset posting plus later receipt void cleanup.
- No approved end-to-end fixture proof exists for sales stock issue COGS posting plus later issue void cleanup.
- No approved end-to-end fixture proof exists for variance proposal event rows, audit logs, posting-date locks, and reverse/void terminal states.
- Inventory report CSV/export permission policy remains a follow-up because the API report endpoints require `inventory.view` while DEV-01 web buttons added export/download visibility gating.
- Output-producing report CSV checks remain deferred.

## 9. Risks And Blockers

- Critical: purchase receipt asset posting and sales stock issue COGS posting create real journal entries in local data and require fiscal-period/account mapping fixture control.
- Critical: variance proposal posting/reversal creates real journals and has terminal-state behavior that must be isolated to disposable local fixtures.
- Critical: no-negative-stock checks need controlled quantity fixtures, especially transfer void and purchase receipt void cases.
- High: inventory settings can change future accounting/valuation behavior and should not be mutated without a restore plan.
- High: CSV report output can look official and should remain behind explicit output-gate approval.
- High: item `inventoryTracking` updates on already-used items need careful QA before product guidance claims are made.
- Medium: direct stock movements are intentionally limited to opening balances, but future UX should make that boundary obvious in runtime QA.
- Blocker: login/audit-writing approval and local disposable fixture creation are still not approved in this planning thread.

## 10. Proposed Next Step

Proceed with `DEV-03 Part 7: journals reports documents output gate dry-run plan`.

Part 7 should remain planning-only by default and should map manual journals, fiscal periods, reports, generated documents, audit exports, and high-risk admin output/settings gates before any output-producing or state-changing QA is approved.

## 11. Open Questions

- Should a future inventory mutation batch first create fixture data through API calls, targeted tests, or a manually prepared local disposable organization?
- Should item `inventoryTracking` become immutable once stock movements exist, or is current update behavior intentional?
- Should API inventory CSV endpoints require a dedicated export/download permission instead of only `inventory.view`?
- Should inventory settings patch operations write audit logs, and should that be asserted before mutation QA?
- Should purchase receipt asset posting and sales stock issue COGS posting be tested in Inventory Part 6 execution, or split into a dedicated inventory-accounting posting ticket?
- Should FIFO placeholder behavior be hidden from runtime users until actual FIFO layers exist?

## 12. Recommended Next Step

Use this dry-run plan as the input to a later approved local-disposable inventory mutation run only after login/audit-writing approval, fixture creation approval, and cleanup evidence rules are explicitly accepted.
