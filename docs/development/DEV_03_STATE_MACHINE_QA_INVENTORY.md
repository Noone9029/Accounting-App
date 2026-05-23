# DEV-03 State-Machine QA Inventory

## 1. Purpose And Scope

DEV-03 inventories high-risk LedgerByte workflows before any state-changing QA is executed. The goal is to identify state machines, routes, API surfaces, status fields, transition risks, coverage, missing tests, and safe QA batches.

This inventory is planning-only. QA status for every workflow is `Not executed`.

## DEV-03 Part 2 Policy Note

DEV-03 Part 2 created [DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md). It keeps future mutation QA local-disposable by default, requires explicit approval for login/audit-writing and every mutation category, requires marker-based fake fixtures, keeps seed/reset/delete forbidden by default, and leaves all state-machine workflows `Not executed` until a later approved batch.

Source evidence inspected for this pass:

- `CODEX_HANDOFF.md`
- `docs/development/DEV_02_FINAL_HANDOFF.md`
- `docs/development/DEV_01_FINAL_TRIAGE.md`
- `docs/development/DEV_01_ROUTE_QA_LOG.md`
- `docs/development/DEV_01_LOCAL_QA_RUNBOOK.md`
- `docs/development/DEVELOPMENT_COMPLETION_PLAN.md`
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`
- `BUG_AUDIT.md`
- `README.md`
- `apps/api/prisma/schema.prisma`
- API controllers/services/specs under `apps/api/src`
- Web routes/forms/helpers/tests under `apps/web/src`
- `tests/e2e` and smoke script names as reference only; none were run

## 2. Safety Rules For DEV-03

- Do not execute state-changing workflows until a later batch explicitly approves the safe fixture, login, audit-log, and cleanup scope defined by DEV-03 Part 2.
- Do not run migrations, seed/reset/delete commands, smoke, E2E, deployed checks, ZATCA, email, backup/restore, exports/downloads/PDF generation, or production checks by default.
- Do not create, finalize, approve, close, void, reverse, allocate, match, categorize, ignore, transfer, receive, issue, post, export, download, send, upload, delete, or migrate anything in DEV-03 Part 1.
- Do not use real customer data or production-like mutable records for state-machine QA.
- Default DEV-03 evidence remains code review, shell-safe route/API readiness only when already approved, and targeted non-mutating tests.
- Any mutation QA needs disposable local fixture data, an explicit audit-log policy, and a cleanup plan that avoids destructive reset/delete commands unless separately approved.

## 3. High-Risk Workflow Inventory

Each workflow row includes the workflow name, routes involved, API endpoints/controllers/services involved, status fields and visible transitions, mutation/accounting/audit impact, existing tests/smoke coverage, missing tests, QA priority, recommended QA method, login/audit approval need, fixture-data need, and `QA status: Not executed`.

### Sales/AR

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sales invoice draft/create/edit/finalize/void | `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]`, `/sales/invoices/[id]/edit` | `SalesInvoiceController`: `GET /sales-invoices`, `GET /sales-invoices/open`, `POST /sales-invoices`, `GET /sales-invoices/:id`, `PATCH /sales-invoices/:id`, `POST /sales-invoices/:id/finalize`, `POST /sales-invoices/:id/void`, `DELETE /sales-invoices/:id`, PDF data/generate endpoints. `SalesInvoiceService`: `create`, `update`, `finalize`, `void`, `delete`. | `SalesInvoice.status` defaults `DRAFT`. Visible transitions: `DRAFT -> FINALIZED`; `DRAFT -> VOIDED`; `FINALIZED -> VOIDED`. Edits/deletes are draft-only. Finalized void creates or reuses a reversal journal and marks original journal `REVERSED`. Void is blocked by active customer payments, unapplied allocations, and credit-note allocations. | Mutation risk: Critical. Accounting impact: AR, revenue/tax, balances, and reversal journals. Audit/logging: visible `auditLogService.log` on create/update/finalize/void/delete. | `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts`, `apps/web/src/components/forms/sales-invoice-form.test.tsx`, `apps/web/src/app/(app)/sales/invoices/[id]/page.test.tsx`, referenced `tests/e2e/sales-flow.spec.ts`, AR smoke references in docs. | End-to-end disposable fixture coverage for finalize/void blockers, reversal idempotency, PDF archive boundaries, period-lock interaction, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Customer payment allocation/void/reversal behavior | `/sales/customer-payments`, `/sales/customer-payments/new`, `/sales/customer-payments/[id]` | `CustomerPaymentController`: `POST /customer-payments`, `GET /customer-payments/:id`, `GET /:id/unapplied-allocations`, `POST /:id/apply-unapplied`, `POST /:id/unapplied-allocations/:allocationId/reverse`, `POST /:id/void`, receipt PDF endpoints, `DELETE /:id`. `CustomerPaymentService`: `create`, `applyUnapplied`, `reverseUnappliedAllocation`, `void`, `delete`. | `CustomerPayment.status` defaults `POSTED`. Visible transitions and side flows: create posted payment; create allocations to finalized invoices; apply unapplied amount to invoice; reverse unapplied allocation; `POSTED -> VOIDED`. Void is blocked by active unapplied allocations and posted refunds. | Mutation risk: Critical. Accounting impact: cash/bank, AR balances, invoice paid amounts, reversal journals. Audit/logging: visible logs for create/apply/reverse/void/delete. | `apps/api/src/customer-payments/customer-payment-rules.spec.ts`, `apps/web/src/lib/customer-payments.test.ts`, `apps/web/src/app/(app)/sales/customer-payments/[id]/page.test.tsx`, referenced sales E2E/smoke. | Disposable fixture coverage for partial allocations, over-allocation rejection, allocation reversal, refund blocker, void reversal journal and idempotency, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Customer refund creation/void behavior | `/sales/customer-refunds`, `/sales/customer-refunds/new`, `/sales/customer-refunds/[id]` | `CustomerRefundController`: `GET /customer-refunds`, `GET /customer-refunds/refundable-sources`, `POST /customer-refunds`, `GET /:id`, `POST /:id/void`, PDF data/generate endpoints, `DELETE /:id`. `CustomerRefundService`: `create`, `void`, `delete`. | `CustomerRefund.status` defaults `POSTED`. Visible transition: `POSTED -> VOIDED`. Refund source can be customer payment or credit note; void restores source unapplied amount and creates reversal accounting. | Mutation risk: High. Accounting impact: cash/bank, AR/refund clearing, source unapplied amount, reversal journal. Audit/logging: visible logs on create/void/delete. | `apps/api/src/customer-refunds/customer-refund-rules.spec.ts`, `apps/web/src/lib/customer-refunds.test.ts`, referenced sales E2E/smoke. | Browser/API fixture coverage for source selection, insufficient refundable amount, void restore behavior, period locks, and PDF/archive boundaries. | Priority: High. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Credit note create/edit/finalize/allocate/void | `/sales/credit-notes`, `/sales/credit-notes/new`, `/sales/credit-notes/[id]`, `/sales/credit-notes/[id]/edit` | `CreditNoteController`: `POST /credit-notes`, `PATCH /credit-notes/:id`, `POST /:id/finalize`, `POST /:id/apply`, `POST /:id/allocations/:allocationId/reverse`, `POST /:id/void`, PDF data/generate endpoints, `DELETE /:id`. `CreditNoteService`: `create`, `update`, `finalize`, `apply`, `reverseAllocation`, `void`, `delete`. | `CreditNote.status` defaults `DRAFT`. Visible transitions: `DRAFT -> FINALIZED`; `DRAFT -> VOIDED`; `FINALIZED -> VOIDED`. Allocation/reversal flows apply finalized credit notes to finalized invoices. Void is blocked by active allocations and posted refunds. | Mutation risk: Critical. Accounting impact: AR, tax/revenue reversals, invoice balances, credit unapplied amount, reversal journals. Audit/logging: visible logs on create/update/finalize/apply/reverse/void/delete. | `apps/api/src/credit-notes/credit-note-rules.spec.ts`, `apps/web/src/lib/credit-notes.test.ts`, referenced sales E2E/smoke. | End-to-end fixture coverage for allocation edge cases, invoice balance restoration, refund blocker, reversal idempotency, PDF/archive boundaries, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

### Purchases/AP

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Purchase order create/edit/approve/close/void | `/purchases/purchase-orders`, `/purchases/purchase-orders/new`, `/purchases/purchase-orders/[id]`, `/purchases/purchase-orders/[id]/edit` | `PurchaseOrderController`: `POST /purchase-orders`, `PATCH /:id`, `POST /:id/approve`, `POST /:id/mark-sent`, `POST /:id/close`, `POST /:id/void`, `POST /:id/convert-to-bill`, PDF endpoints, `DELETE /:id`. `PurchaseOrderService`: `create`, `update`, `approve`, `markSent`, `close`, `void`, `convertToBill`, `delete`. | `PurchaseOrder.status` defaults `DRAFT`. Visible transitions: `DRAFT -> APPROVED`; `APPROVED -> SENT`; `APPROVED|SENT|PARTIALLY_BILLED -> CLOSED`; `DRAFT|APPROVED|SENT -> VOIDED`; `APPROVED|SENT -> BILLED` through convert-to-bill. Edits/deletes are draft-only. | Mutation risk: High. Accounting impact: usually operational until converted, then creates a draft purchase bill and AP downstream risk. Audit/logging: visible logs on create/update/approve/mark-sent/close/void/convert/delete. | `apps/api/src/purchase-orders/purchase-order-rules.spec.ts`, `apps/web/src/lib/purchase-orders.test.ts`, referenced `tests/e2e/purchases-flow.spec.ts`. | Fixture coverage for convert-to-bill, void/close blockers after conversion/partial billing, PDF archive boundaries, and browser action visibility by status/permission. | Priority: High. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Purchase bill create/edit/finalize/void | `/purchases/bills`, `/purchases/bills/new`, `/purchases/bills/[id]`, `/purchases/bills/[id]/edit` | `PurchaseBillController`: `POST /purchase-bills`, `PATCH /:id`, `POST /:id/finalize`, `POST /:id/void`, accounting-preview/PDF endpoints, allocation lookup endpoints, `DELETE /:id`. `PurchaseBillService`: `create`, `update`, `finalize`, `void`, `delete`. | `PurchaseBill.status` defaults `DRAFT`. Visible transitions: `DRAFT -> FINALIZED`; `DRAFT -> VOIDED`; `FINALIZED -> VOIDED`. Finalization can validate inventory posting mode/clearing readiness and posts AP journal. Void is blocked by active supplier payment allocations, supplier payment unapplied allocations, and purchase debit-note allocations. | Mutation risk: Critical. Accounting impact: AP, tax/expense or inventory clearing, supplier balances, reversal journals. Audit/logging: visible logs on create/update/finalize/void/delete. | `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`, `apps/api/src/purchase-bills/purchase-bill.controller.spec.ts`, `apps/web/src/components/forms/purchase-bill-form.test.tsx`, `apps/web/src/lib/purchase-bills.test.ts`, referenced purchases E2E/smoke. | Fixture coverage for inventory clearing/finalization branches, allocation blockers, void reversal idempotency, period locks, PDF archive boundaries, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Supplier payment allocation/void behavior | `/purchases/supplier-payments`, `/purchases/supplier-payments/new`, `/purchases/supplier-payments/[id]` | `SupplierPaymentController`: `POST /supplier-payments`, `GET /:id/allocations`, `GET /:id/unapplied-allocations`, `POST /:id/apply-unapplied`, `POST /:id/unapplied-allocations/:allocationId/reverse`, receipt/PDF endpoints, `POST /:id/void`, `DELETE /:id`. `SupplierPaymentService`: `create`, `applyUnapplied`, `reverseUnappliedAllocation`, `void`, `delete`. | `SupplierPayment.status` defaults `POSTED`. Visible flows: posted payment creation, allocation to finalized bills, unapplied allocation application, allocation reversal, `POSTED -> VOIDED`. Void is blocked by active unapplied allocations and posted supplier refunds. | Mutation risk: Critical. Accounting impact: cash/bank, AP balances, bill paid amounts, reversal journals. Audit/logging: visible logs on create/apply/reverse/void/delete. | `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`, `apps/web/src/lib/supplier-payments.test.ts`, `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.test.tsx`, `apps/web/src/app/(app)/purchases/supplier-payments/new/page.test.tsx`, referenced purchases E2E/smoke. | Fixture coverage for partial allocations, over-allocation rejection, supplier refund blocker, void reversal idempotency, and browser status/permission gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Supplier refund creation/void behavior | `/purchases/supplier-refunds`, `/purchases/supplier-refunds/new`, `/purchases/supplier-refunds/[id]` | `SupplierRefundController`: `GET /supplier-refunds/refundable-sources`, `POST /supplier-refunds`, `GET /:id`, `POST /:id/void`, PDF endpoints, `DELETE /:id`. `SupplierRefundService`: `create`, `void`, `delete`. | `SupplierRefund.status` defaults `POSTED`. Visible transition: `POSTED -> VOIDED`. Refund source can be supplier payment or purchase debit note; void restores source unapplied amount and creates reversal accounting. | Mutation risk: High. Accounting impact: cash/bank, AP/refund clearing, source unapplied amount, reversal journal. Audit/logging: visible logs on create/void/delete. | `apps/api/src/supplier-refunds/supplier-refund-rules.spec.ts`, `apps/web/src/lib/supplier-refunds.test.ts`, referenced purchases E2E/smoke. | Fixture coverage for source selection, insufficient refundable amount, void restore behavior, period locks, and PDF/archive boundaries. | Priority: High. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Debit note create/edit/finalize/allocate/void | `/purchases/debit-notes`, `/purchases/debit-notes/new`, `/purchases/debit-notes/[id]`, `/purchases/debit-notes/[id]/edit` | `PurchaseDebitNoteController`: `POST /purchase-debit-notes`, `PATCH /:id`, `POST /:id/finalize`, `POST /:id/apply`, `POST /:id/allocations/:allocationId/reverse`, `POST /:id/void`, PDF endpoints, `DELETE /:id`. `PurchaseDebitNoteService`: `create`, `update`, `finalize`, `apply`, `reverseAllocation`, `void`, `delete`. | `PurchaseDebitNote.status` defaults `DRAFT`. Visible transitions: `DRAFT -> FINALIZED`; `DRAFT -> VOIDED`; `FINALIZED -> VOIDED`. Allocation/reversal flows apply finalized debit notes to finalized bills. Void is blocked by active allocations and posted supplier refunds. | Mutation risk: Critical. Accounting impact: AP, tax/expense/inventory clearing reversals, bill balances, debit-note unapplied amount, reversal journals. Audit/logging: visible logs on create/update/finalize/apply/reverse/void/delete. | `apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts`, `apps/web/src/lib/purchase-debit-notes.test.ts`, `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.test.tsx`, referenced purchases E2E/smoke. | End-to-end fixture coverage for allocation edge cases, bill balance restoration, refund blocker, reversal idempotency, PDF/archive boundaries, and permission naming question from DEV-01. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Cash expense create/void | `/purchases/cash-expenses`, `/purchases/cash-expenses/new`, `/purchases/cash-expenses/[id]` | `CashExpenseController`: `POST /cash-expenses`, `GET /cash-expenses/:id`, `POST /:id/void`, PDF endpoints, `DELETE /:id`. `CashExpenseService`: `create`, `void`, `delete`. | `CashExpense.status` defaults `POSTED`; enum includes `DRAFT`, `POSTED`, `VOIDED`. Visible transition: `POSTED -> VOIDED`; delete is draft/no-journal only. Create posts a journal and void creates a reversal journal. | Mutation risk: High. Accounting impact: cash/bank, expense/tax posting and reversal. Audit/logging: visible logs on create/void/delete. | `apps/api/src/cash-expenses/cash-expense-rules.spec.ts`, `apps/web/src/lib/cash-expenses.test.ts`, DEV-01 AP route QA references. | Fixture coverage for posting account validation, void reversal idempotency, period locks, PDF/archive boundaries, and browser gating. | Priority: High. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

### Banking/Reconciliation

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bank account create/edit | `/bank-accounts`, `/bank-accounts/new`, `/bank-accounts/[id]`, `/bank-accounts/[id]/edit` | `BankAccountController`: `POST /bank-accounts`, `PATCH /bank-accounts/:id`, `POST /:id/archive`, `POST /:id/reactivate`, `POST /:id/post-opening-balance`, `GET /:id/transactions`. `BankAccountService`: `create`, `update`, `archive`, `restore`, `postOpeningBalance`. | `BankAccountProfile.status` defaults `ACTIVE`. Visible transitions: `ACTIVE -> ARCHIVED`; `ARCHIVED -> ACTIVE`. Opening balance can be posted once and creates a posted journal. | Mutation risk: High. Accounting impact: chart/bank profile setup, opening-balance journal, ledger balances. Audit/logging: visible service specs and logs for profile/opening balance actions. | `apps/api/src/bank-accounts/bank-account.service.spec.ts`, `apps/api/src/bank-accounts/bank-account.controller.spec.ts`, `apps/web/src/lib/bank-accounts.test.ts`, `apps/web/src/app/(app)/bank-accounts/[id]/page.test.tsx`, referenced banking E2E. | Disposable fixture coverage for archive/reactivate blockers, opening balance idempotency, account link behavior, and browser permission gating. | Priority: High. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Bank transfer create/void | `/bank-transfers`, `/bank-transfers/new`, `/bank-transfers/[id]` | `BankTransferController`: `POST /bank-transfers`, `GET /:id`, `POST /:id/void`. `BankTransferService`: `create`, `void`. | `BankTransfer.status` defaults `POSTED`. Visible transition: `POSTED -> VOIDED`. Create posts source/destination bank journal; void creates reversal journal and marks original journal `REVERSED`. | Mutation risk: Critical. Accounting impact: bank ledger balances and reversal journals across two bank accounts. Audit/logging: visible logs and service/controller specs. | `apps/api/src/bank-transfers/bank-transfer.service.spec.ts`, `apps/api/src/bank-transfers/bank-transfer.controller.spec.ts`, `apps/web/src/app/(app)/bank-transfers/[id]/page.test.tsx`, referenced banking E2E. | Fixture coverage for same-account rejection, insufficient/negative constraints, period locks, void idempotency, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Statement import/parse/preview/import boundary | `/bank-accounts/[id]/statement-imports` | `BankAccountStatementController`: `GET /bank-accounts/:bankAccountProfileId/statement-imports`, `POST /statement-imports`, `POST /statement-imports/preview`. `BankStatementImportController`: `GET /bank-statement-imports/:id`, `POST /:id/void`. `BankStatementService`: `previewImport`, `importStatement`, `voidImport`. Parser supports CSV/OFX/MT940/CAMT fixtures. | `BankStatementImport.status` defaults `IMPORTED`; transitions include `IMPORTED -> VOIDED` when safe. Preview is intended parse-only; import creates import and `UNMATCHED` statement transactions. Void is blocked after matched/categorized activity. | Mutation risk: High. Accounting impact: no ledger posting on preview/import itself, but creates source transaction records for later matching/categorization and reconciliation. Audit/logging: visible logs on import/void. | `apps/api/src/bank-statements/bank-statement-import-parser.spec.ts`, `bank-statement.service.spec.ts`, `bank-statement.controller.spec.ts`, `apps/web/src/app/(app)/bank-accounts/[id]/statement-imports/page.test.tsx`, referenced banking E2E. | Explicit non-mutation preview assertion, duplicate import behavior, closed-period boundary, raw-file archive/storage policy, parser warning UI, and browser upload gating. | Priority: High. Method: parser unit plus API integration and future E2E with disposable files. Login/audit approval: Yes for import/void; preview still requires auth. Disposable fixture data: Yes. QA status: Not executed. |
| Statement transaction match/categorize/ignore | `/bank-accounts/[id]/statement-transactions`, `/bank-statement-transactions/[id]` | `BankStatementTransactionController`: `GET /bank-statement-transactions/:id`, `GET /:id/match-candidates`, `POST /:id/match`, `POST /:id/categorize`, `POST /:id/ignore`. `BankStatementService`: `matchCandidates`, `matchTransaction`, `categorizeTransaction`, `ignoreTransaction`. | `BankStatementTransaction.status` defaults `UNMATCHED`. Visible transitions: `UNMATCHED -> MATCHED`, `UNMATCHED -> CATEGORIZED`, `UNMATCHED -> IGNORED`; voided import can make transactions `VOIDED`. Matching links to posted journal lines; categorization creates a posted journal. Closed reconciliation period blocks changes. | Mutation risk: Critical. Accounting impact: bank reconciliation status, journal links, and categorized transaction journal posting. Audit/logging: visible logs on match/categorize/ignore. | `bank-statement.service.spec.ts`, `bank-statement.controller.spec.ts`, `apps/web/src/app/(app)/bank-statement-transactions/[id]/page.test.tsx`, `apps/web/src/lib/bank-statements.test.ts`, referenced banking E2E. | Fixture coverage for wrong direction/amount, already matched/categorized/ignored blockers, closed reconciliation blockers, auto-match claim boundaries, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Reconciliation draft/review/close/void | `/bank-accounts/[id]/reconciliation`, `/bank-accounts/[id]/reconciliations`, `/bank-accounts/[id]/reconciliations/new`, `/bank-reconciliations/[id]` | `BankReconciliationController`: `GET /bank-reconciliations/:id`, `POST /:id/submit`, `POST /:id/approve`, `POST /:id/reopen`, `POST /:id/close`, `POST /:id/void`, `GET /:id/items`, `GET /:id/review-events`, report CSV/PDF endpoints. `BankReconciliationService`: `create`, `submit`, `approve`, `reopen`, `close`, `void`. | `BankReconciliation.status` defaults `DRAFT`. Visible transitions: `DRAFT -> PENDING_APPROVAL`; `PENDING_APPROVAL -> APPROVED`; `PENDING_APPROVAL|APPROVED -> DRAFT` through reopen; `APPROVED -> CLOSED`; any active workflow can become `VOIDED` through void. Close requires zero difference/no unmatched conditions and creates reconciliation items. | Mutation risk: Critical. Accounting impact: does not post ledger directly but locks reconciliation status, transaction inclusion, and reporting period behavior. Audit/logging: visible logs and review events; report exports can generate documents. | `apps/api/src/bank-reconciliations/bank-reconciliation.service.spec.ts`, `bank-reconciliation.controller.spec.ts`, `apps/web/src/app/(app)/bank-reconciliations/[id]/page.test.tsx`, `apps/web/src/app/(app)/bank-accounts/[id]/reconciliation/page.test.tsx`, referenced banking E2E. | Fixture coverage for submit/approve separation, close blockers, reopen/void terminal behavior, closed-period statement transaction blockers, CSV/PDF export/archive gates, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

### Inventory

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inventory adjustment create/edit/approve/void | `/inventory/adjustments`, `/inventory/adjustments/new`, `/inventory/adjustments/[id]`, `/inventory/adjustments/[id]/edit` | `InventoryAdjustmentController`: `POST /inventory-adjustments`, `PATCH /:id`, `DELETE /:id`, `POST /:id/approve`, `POST /:id/void`. `InventoryAdjustmentService`: `create`, `update`, `delete`, `approve`, `void`. | `InventoryAdjustment.status` defaults `DRAFT`. Visible transitions: `DRAFT -> APPROVED`; `DRAFT -> VOIDED`; `APPROVED -> VOIDED`. Edits/deletes are draft-only. Approve creates stock movement; void may create reversing stock movement and blocks negative stock. | Mutation risk: Critical. Accounting impact: inventory quantities and cost values; accounting posting is not automatic here but downstream valuation/reporting changes. Audit/logging: visible logs on create/update/delete/approve/void. | `apps/api/src/inventory-adjustments/inventory-adjustment.service.spec.ts`, `inventory-adjustment.controller.spec.ts`, `apps/web/src/lib/inventory.test.ts`, referenced inventory E2E. | Disposable fixture coverage for no-negative-stock, draft void vs approved void, cost values, idempotency, permission naming, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Warehouse transfer create/void | `/inventory/transfers`, `/inventory/transfers/new`, `/inventory/transfers/[id]` | `WarehouseTransferController`: `POST /warehouse-transfers`, `GET /:id`, `POST /:id/void`. `WarehouseTransferService`: `create`, `void`. | `WarehouseTransfer.status` defaults `POSTED`. Visible transition: `POSTED -> VOIDED`. Create posts stock-out and stock-in movements; void creates reversal movements and blocks negative destination stock. | Mutation risk: Critical. Accounting impact: inventory quantities/cost by warehouse; no GL posting by default. Audit/logging: visible logs on create/void. | `apps/api/src/warehouse-transfers/warehouse-transfer.service.spec.ts`, `warehouse-transfer.controller.spec.ts`, `apps/web/src/lib/inventory.test.ts`, referenced inventory E2E. | Fixture coverage for same-warehouse rejection, no-negative-stock on create/void, reversal idempotency, and browser permission/status gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Purchase receipt create/void/posting preview | `/inventory/purchase-receipts`, `/inventory/purchase-receipts/new`, `/inventory/purchase-receipts/[id]` | `PurchaseReceiptController`: `POST /purchase-receipts`, `GET /:id/accounting-preview`, `POST /:id/post-inventory-asset`, `POST /:id/reverse-inventory-asset`, `POST /:id/void`. `PurchaseReceiptService`: `create`, `void`, `postInventoryAsset`, `reverseInventoryAsset`. | `PurchaseReceipt.status` defaults `POSTED`. Visible transition: `POSTED -> VOIDED`. Inventory asset posting creates a posted journal; reversal marks original journal `REVERSED`. Void is blocked until asset posting is reversed if already posted. | Mutation risk: Critical. Accounting impact: inventory quantities, inventory clearing/asset posting, reversal journals. Audit/logging: visible logs on create/post/reverse/void. | `apps/api/src/purchase-receipts/purchase-receipt.service.spec.ts`, `purchase-receipt.controller.spec.ts`, `apps/web/src/lib/inventory.test.ts`, referenced inventory E2E. | Fixture coverage for purchase-bill linkage, posting preview non-mutation assertion, asset-post/reverse idempotency, period locks, void blockers, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Sales stock issue create/void/COGS preview | `/inventory/sales-stock-issues`, `/inventory/sales-stock-issues/new`, `/inventory/sales-stock-issues/[id]` | `SalesStockIssueController`: `POST /sales-stock-issues`, `GET /:id/accounting-preview`, `POST /:id/post-cogs`, `POST /:id/reverse-cogs`, `POST /:id/void`. `SalesStockIssueService`: `create`, `void`, `postCogs`, `reverseCogs`. | `SalesStockIssue.status` defaults `POSTED`. Visible transition: `POSTED -> VOIDED`. COGS posting creates a posted journal; reversal marks original journal `REVERSED`. Void is blocked until COGS posting is reversed if already posted. | Mutation risk: Critical. Accounting impact: inventory quantities, estimated COGS posting, reversal journals. Audit/logging: visible logs on create/post/reverse/void. | `apps/api/src/sales-stock-issues/sales-stock-issue.service.spec.ts`, `sales-stock-issue.controller.spec.ts`, `apps/web/src/lib/inventory.test.ts`, referenced inventory E2E. | Fixture coverage for finalized-invoice dependency, no-negative-stock, COGS preview non-mutation assertion, post/reverse idempotency, period locks, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Variance proposal create/approve/post/reverse/void | `/inventory/variance-proposals`, `/inventory/variance-proposals/new`, `/inventory/variance-proposals/[id]`, `/inventory/reports/clearing-variance`, `/inventory/reports/clearing-reconciliation` | `InventoryVarianceProposalController`: `POST /inventory/variance-proposals`, `POST /from-clearing-variance`, `POST /:id/submit`, `POST /:id/approve`, `POST /:id/post`, `POST /:id/reverse`, `POST /:id/void`, `GET /:id/accounting-preview`, events. `InventoryVarianceProposalService`: `createManual`, `createFromClearingVariance`, `submit`, `approve`, `post`, `reverse`, `void`. | `InventoryVarianceProposal.status` defaults `DRAFT`. Visible transitions: `DRAFT -> PENDING_APPROVAL`; `PENDING_APPROVAL -> APPROVED`; `APPROVED -> POSTED`; `POSTED -> REVERSED`; non-posted/reversed rules can lead to `VOIDED` with blockers. Posting creates journal; reverse creates reversal journal and marks original `REVERSED`. | Mutation risk: Critical. Accounting impact: inventory clearing variance journal posting/reversal and report balances. Audit/logging: visible logs and events for create/submit/approve/post/reverse/void. | `apps/api/src/inventory/inventory-variance-proposal.service.spec.ts`, `inventory-accounting.service.spec.ts`, `inventory-clearing-report.service.spec.ts`, referenced inventory E2E. | Fixture coverage for approval separation, account mapping blockers, clearing source idempotency, post/reverse/void terminal states, report-to-proposal flow, and browser gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Item/warehouse operational changes affecting inventory workflows | `/items`, `/inventory/warehouses`, `/inventory/warehouses/[id]`, `/inventory/settings` | Inventory/item/warehouse controllers and services under `apps/api/src/inventory`, `apps/api/src/items`, and `apps/api/src/warehouses`; route QA found management dependencies on account/tax-rate fetches and inventory settings. | Item and warehouse status fields gate whether stock workflows can create movements. Exact state transitions need a focused code review before mutation execution. | Mutation risk: High. Accounting impact: can enable/disable stock movement eligibility and valuation/report behavior. Audit/logging: expected for setup changes but exact events need confirmation per service. | `apps/api/src/inventory/inventory.service.spec.ts`, `inventory.controller.spec.ts`, `apps/web/src/app/(app)/inventory/inventory-guidance.test.tsx`. | Status transition coverage, setup change audit assertions, and browser gating for management-only settings. | Priority: High. Method: targeted code review plus unit/API integration. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

### Journals/Accounting Periods

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Manual journal create/post/reverse | `/journal-entries`, `/journal-entries/new` | `AccountingController`: `POST /journal-entries`, `PATCH /journal-entries/:id`, `POST /:id/post`, `POST /:id/reverse`, `GET /:id`, `GET /count`. `AccountingService`: `create`, `update`, `post`, `reverse`. | `JournalEntry.status` defaults `DRAFT`. Visible transitions: `DRAFT -> POSTED`; `POSTED -> REVERSED` with a new reversing journal that is `POSTED`; draft-only update. Balanced lines and posting account constraints are enforced. | Mutation risk: Critical. Accounting impact: direct general ledger balances, reversal journals, period-lock interaction. Audit/logging: visible logs on create/update/post/reverse. | `apps/api/src/accounting/journal-rules.spec.ts`, route QA for `/journal-entries`, referenced reports/accounting flows. | Disposable fixture coverage for balanced validation, tax line behavior, source-linked journal restrictions, reversal idempotency, period locks, and browser action gating. | Priority: Critical. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Fiscal period/posting lock behavior | `/fiscal-periods` and every posting workflow using fiscal guards | `FiscalPeriodController`: `POST /fiscal-periods`, `PATCH /:id`, `POST /:id/close`, `POST /:id/reopen`, `POST /:id/lock`. `FiscalPeriodService`: `create`, `update`, `close`, `reopen`, `lock`. `FiscalPeriodGuardService`: posting-date validation. | `FiscalPeriod.status` defaults `OPEN`. Visible transitions: `OPEN -> CLOSED`; `CLOSED -> OPEN`; `OPEN|CLOSED -> LOCKED`; locked periods cannot be reopened or edited. Guard blocks posting outside open periods, in closed periods, and in locked periods. | Mutation risk: Critical. Accounting impact: gates every posting/finalization/reversal workflow by date. Audit/logging: visible logs on create/update/status changes. | `apps/api/src/fiscal-periods/fiscal-period.service.spec.ts`, `apps/web/src/lib/fiscal-periods.test.ts`, DEV plan references posting locks. | Cross-workflow integration coverage proving invoices, bills, payments, bank transfers, inventory postings, journals, and reversals honor locks consistently. | Priority: Critical. Method: targeted unit plus cross-module API integration. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

### Reports/Documents Output Gates

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Report export/download/PDF/archive gates | `/reports`, `/reports/general-ledger`, `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/vat-summary`, `/reports/aged-receivables`, `/reports/aged-payables`, bank reconciliation report links, inventory report CSV links | `ReportsController`: JSON/CSV/PDF endpoints for core reports; `BankReconciliationController`: `GET /:id/report.csv`, `GET /:id/report.pdf`; `ReportsService`: `coreReportCsvFile`, `coreReportPdf`; `GeneratedDocumentService`: `archivePdf`, `download`. | `GeneratedDocument.status` defaults `GENERATED`; enum includes `GENERATED`, `FAILED`, `SUPERSEDED`. Report JSON/CSV are output gates; PDF generation archives a generated document. | Mutation risk: High for PDF archive, Medium for CSV/JSON output. Accounting impact: no ledger mutation, but can expose official-looking financial output and archive documents. Audit/logging: generated-document archive logs are visible; report export permission checks exist. | `apps/api/src/reports/reports.service.spec.ts`, `reports.controller.spec.ts`, `report-csv.spec.ts`, `apps/api/src/report-pdf-renderers.spec.ts`, `apps/web/src/components/reports/report-pages.test.tsx`, visual/report E2E references. | Runtime fixture coverage for export permissions, PDF archive creation, download authorization, no false production/official claims, binary PDF validation, and browser download gating. | Priority: High. Method: unit plus manual local/future E2E with explicit output approval. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Documents archive/download gate | `/documents` | `GeneratedDocumentController`: `GET /generated-documents`, `GET /generated-documents/:id`, `GET /generated-documents/:id/download`. `GeneratedDocumentService`: `list`, `get`, `download`, `archivePdf`. | `GeneratedDocument.status` defaults `GENERATED`; downloads are scoped by organization. Archive creation is performed by upstream PDF generation flows, not by `/documents` list itself. | Mutation risk: Medium for archive creation through upstream flows; Low for list/detail/download reads. Accounting impact: no ledger mutation, but exposes generated financial documents. Audit/logging: archive logs visible; download logging needs confirmation. | `apps/api/src/generated-documents/generated-document-rules.spec.ts`, `apps/web/src/lib/documents.test.ts`, `apps/web/src/components/documents/document-guidance.test.tsx`, DEV-01 Part 7 docs QA. | Authenticated runtime coverage for download permissions, storage-provider wording, archive metadata integrity, large file behavior, and no production storage claims. | Priority: High. Method: targeted unit plus manual local/future E2E with output approval. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

### Admin/Roles/Audit Side Effects

| Workflow | Routes involved | API endpoints/controllers/services involved | Status/state fields and allowed transitions visible from code | Mutation risk, accounting impact, audit/logging impact | Existing tests/smoke coverage found | Missing tests | QA recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Role/team permission changes and invitations | `/settings/team`, `/settings/roles`, `/settings/roles/[id]` | `RoleController`: `POST /roles`, `PATCH /roles/:id`, `DELETE /roles/:id`. `OrganizationMemberController`: `POST /organization-members/invite`, `PATCH /organization-members/:id/role`, `PATCH /organization-members/:id/status`. `RoleService` and `OrganizationMemberService`. | Role permissions are stored in role records; member role/status changes affect future authorization. Invitation state lives in membership/invite models and may trigger email-adjacent behavior depending on implementation. | Mutation risk: High. Accounting impact: no ledger mutation, but can grant access to ledger/inventory/banking mutations. Audit/logging: role and member changes are expected audit-sensitive; exact events should be verified before execution. | `apps/api/src/roles/role.service.spec.ts`, `role.controller.spec.ts`, `apps/web/src/app/(app)/settings/roles/page.test.tsx`, DEV-01 Part 7 team/role QA. | Disposable org fixture coverage for least-privilege permission changes, self-demotion/admin lockout blockers, invite side effects without real email, audit assertions, and browser gating. | Priority: High. Method: API integration plus targeted unit and future E2E. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Audit log export, retention settings, and dry-run side effects | `/settings/audit-logs` | `AuditLogController`: `GET /audit-logs`, `GET /audit-logs/export.csv`, `GET /retention-settings`, `PATCH /retention-settings`, `GET /retention-preview`, `POST /retention-dry-run`. `AuditLogService`: `exportCsv`, `updateRetentionSettings`, `retentionPreview`. | `AuditLogRetentionSettings` has `retentionDays`, `autoPurgeEnabled`, and `exportBeforePurgeRequired`. Dry-run/preview explicitly do not delete logs. Settings patch mutates retention policy. | Mutation risk: High for retention settings, Medium for export, Low for preview/dry-run. Accounting impact: no ledger mutation, but audit evidence policy can affect compliance posture. Audit/logging: service specs confirm retention settings update writes an audit log and CSV export redacts sensitive fields. | `apps/api/src/audit-log/audit-log.service.spec.ts`, `audit-log.controller.spec.ts`, `apps/web/src/lib/audit-logs.test.ts`, DEV-01 Part 7 audit route QA. | Runtime coverage for export permissions, sensitive redaction, dry-run no-delete proof, retention update audit entry, and browser download gating. | Priority: High. Method: targeted unit plus manual local/future E2E with explicit output/settings approval. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |
| Document/storage/email/ZATCA settings readiness gates | `/settings/documents`, `/settings/storage`, `/settings/email-outbox`, `/settings/zatca`, `/settings/number-sequences` | `OrganizationDocumentSettingsController`, document settings service, storage/email/ZATCA/number-sequence services/controllers from DEV-01 route QA. | Settings mutate organization behavior and output numbering/readiness. ZATCA/email/storage production actions remain blocked/future unless separately approved. | Mutation risk: High for settings, Blocker-level if any real email/ZATCA/storage production action is triggered. Accounting impact: numbering/PDF/output compliance posture; no direct ledger mutation. Audit/logging: expected but must be confirmed per service before mutation execution. | Document settings rules spec, web document-settings tests, DEV-01 settings route QA, ZATCA/package tests referenced but not run in DEV-03. | Explicit non-production fixtures, blocked production wording tests, no-real-send/no-real-ZATCA assertions, number-sequence collision/idempotency tests, and audit assertions. | Priority: High. Method: targeted unit plus code review; manual local only after explicit approvals. Login/audit approval: Yes. Disposable fixture data: Yes. QA status: Not executed. |

## 4. Required Per-Workflow Fields

The inventory tables above use compact columns so the document stays usable. For every workflow, the row records:

- Workflow name.
- Routes involved.
- API endpoints/controllers/services involved.
- Status/state fields involved.
- Allowed transitions visible from code.
- Mutation risk.
- Accounting impact.
- Audit/logging impact if visible.
- Existing tests/smoke coverage if found.
- Missing tests.
- QA priority.
- Recommended QA method.
- Whether login/audit-writing approval is required.
- Whether disposable fixture data is required.
- QA status: `Not executed`.

## 5. Required Workflow Coverage Check

The required DEV-03 Part 1 workflows are included above:

- Sales invoice draft/create/edit/finalize/void
- Customer payment allocation/void/reversal behavior
- Customer refund creation/void behavior
- Credit note create/edit/finalize/allocate/void
- Purchase order create/edit/approve/close/void
- Purchase bill create/edit/finalize/void
- Supplier payment allocation/void behavior
- Supplier refund creation/void behavior
- Debit note create/edit/finalize/allocate/void
- Bank account create/edit
- Bank transfer create/void
- Statement import/parse/preview/import boundary
- Statement transaction match/categorize/ignore
- Reconciliation draft/review/close/void
- Inventory adjustment create/edit/approve/void
- Warehouse transfer create/void
- Purchase receipt create/void/posting preview
- Sales stock issue create/void/COGS preview
- Variance proposal create/approve/post/reverse/void
- Manual journal create/post/reverse
- Fiscal period/posting lock behavior
- Report export/download/PDF/archive gates

## 6. Risk Summary

### Workflows That Can Affect Ledger Balances

- Sales invoice finalization/voiding.
- Customer payment allocation, unapplied allocation reversal, voiding, and customer refunds.
- Credit note finalization, allocation/reversal, voiding, and refunds.
- Purchase bill finalization/voiding.
- Supplier payment allocation/reversal, voiding, and supplier refunds.
- Purchase debit note finalization, allocation/reversal, voiding, and refunds.
- Bank transfer create/void.
- Bank statement transaction categorization.
- Purchase receipt inventory asset post/reverse.
- Sales stock issue COGS post/reverse.
- Inventory variance proposal post/reverse.
- Manual journal post/reverse.
- Fiscal period close/reopen/lock because it gates posting eligibility.

### Workflows That Can Affect Inventory Quantities Or Costs

- Inventory adjustment approve/void.
- Warehouse transfer create/void.
- Purchase receipt create/void and inventory asset posting preview/post/reverse.
- Sales stock issue create/void and COGS preview/post/reverse.
- Inventory variance proposal create/submit/approve/post/reverse/void.
- Item, warehouse, and inventory settings changes that gate movement eligibility or valuation/report behavior.

### Workflows That Can Affect Bank Reconciliation Status

- Bank account archive/reactivate/opening balance posting.
- Bank transfer create/void.
- Statement import/void.
- Statement transaction match/categorize/ignore.
- Reconciliation submit/approve/reopen/close/void.
- Report CSV/PDF generation for reconciliation snapshots.

### Workflows That Can Generate Documents/PDFs

- Sales invoice PDF data/generate/download.
- Customer payment receipt PDF data/generate/download.
- Customer refund PDF data/generate/download.
- Credit note PDF data/generate/download.
- Purchase order PDF data/generate/download.
- Purchase bill PDF data/generate/download.
- Supplier payment receipt PDF data/generate/download.
- Supplier refund PDF data/generate/download.
- Purchase debit note PDF data/generate/download.
- Core report CSV/PDF output.
- Bank reconciliation report CSV/PDF output.
- Generated-document archive and download.
- Audit-log CSV export.

### Workflows That Write Audit Logs

- Most create/update/delete/finalize/void/post/reverse/approve/close/import/match/categorize/ignore actions show explicit `auditLogService.log` calls in services.
- Login-dependent QA remains deferred because login writes audit logs.
- Retention settings updates write audit logs.
- PDF archive creation logs generated-document events.
- Exports/downloads require follow-up to confirm whether they log access consistently.

## 7. Existing Coverage Summary

- API unit/spec coverage is broad for core state machines: AR, AP, banking, reconciliation, inventory adjustments, transfers, receipts, stock issues, variance proposals, fiscal periods, reports, generated documents, audit logs, and roles.
- Web unit/component/page coverage exists for many forms, detail pages, report pages, documents, settings roles, bank account/reconciliation/statement pages, supplier payments, purchase bills, sales invoices, and inventory guidance.
- Playwright E2E files exist for sales, purchases, banking, inventory, reports, permissions, attachments, storage, auth/navigation, email auth, ZATCA, and seeded demo workflows.
- Smoke scripts and E2E are reference-only for this inventory because they may require login, seeded data, services, or mutations.
- DEV-02 added non-mutating verification gates and PR CI, but those gates intentionally do not execute state-machine workflows.

## 8. Missing Coverage Summary

- A safe login/audit-writing policy is defined in [DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md), but no login approval or runtime proof exists yet.
- Disposable fixture policy is defined, but fixture implementation/execution strategy is still missing for mutation workflows.
- Cross-module accounting assertions are incomplete for finalization/void/reversal and period-lock behavior.
- Browser-runtime authenticated QA remains deferred due Browser Use local URL policy and login audit side effects.
- Mutation/state-machine browser flows remain deferred for AR, AP, banking/reconciliation, inventory, journals, reports, and admin settings.
- Output gates need explicit approval and fixtures for PDF generation, CSV export, generated-document archive, downloads, and audit exports.
- Smoke/E2E service-container design remains deferred.
- Permission-policy questions remain for several high-risk actions, especially update/void permissions, report/download permissions, and settings/admin access boundaries.

## 9. Proposed DEV-03 QA Batches

### Part 2: Safe Fixture Login Audit Policy Design

- Completed in [DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md).
- Local disposable fixture boundaries, login approval rules, audit-log handling, mutation limits, cleanup evidence, and secrets/data exposure rules are defined.
- Seed/reset/delete remain forbidden by default; fixture creation and state-machine mutation still require explicit future batch approval.

### Part 3: AR State-Machine QA

- Completed as a dry-run plan in [DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md).
- Sales invoices, customer payments, customer refunds, and credit notes were mapped to routes, API endpoints, status fields, permissions, audit side effects, ledger effects, output gates, fixture markers, and planned-only test cases.
- No login, fixture creation, runtime mutation, PDF/archive generation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, environment change, or production check was performed.
- Keep PDF/archive actions separate unless output approval exists.

### Part 4: AP State-Machine QA

- Completed as a dry-run plan in [DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md).
- Purchase orders, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and AP-visible purchase receipt/bill matching boundaries were mapped to routes, API endpoints, status fields, permissions, audit side effects, ledger effects, inventory effects, output gates, fixture markers, and planned-only test cases.
- Highest-risk AP transitions are purchase order approve/mark-sent/close/void/convert-to-bill, purchase bill finalize/void with inventory-clearing readiness and allocation blockers, supplier payment direct/unapplied allocation/reversal/void, supplier refund source claim/void restoration, purchase debit note finalize/apply/reverse/void with allocation/refund blockers, and cash expense immediate posting/void.
- No login, fixture creation, runtime mutation, PDF/archive generation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, environment change, or production check was performed.
- Keep purchase receipt posting and inventory asset journal behavior in the inventory batch unless a later local-disposable AP boundary run explicitly approves it.

### Part 5: Banking/Reconciliation State-Machine QA

- Bank accounts, bank transfers, statement import/preview/import/void, statement transaction match/categorize/ignore, and reconciliation submit/approve/reopen/close/void.
- Prioritize no-ledger mutation on preview, categorization journal creation, closed reconciliation blockers, and transfer reversal.

### Part 6: Inventory State-Machine QA

- Inventory adjustments, warehouse transfers, purchase receipts, sales stock issues, variance proposals, item/warehouse/settings gates.
- Prioritize no-negative-stock, post/reverse idempotency, valuation/COGS wording, and period-lock behavior.

### Part 7: Journals/Reports/Documents Output Gate QA

- Manual journals, fiscal periods, reports, generated documents, audit exports, and high-risk admin settings.
- Prioritize direct ledger entry controls, period lock cross-module behavior, output permissions, PDF/archive boundaries, and redaction.

### Part 8: DEV-03 Final Triage

- Consolidate failures/blockers/fixes.
- Separate defects from missing fixtures/policy.
- Recommend DEV-04 follow-up scope.

## 10. Open Questions

- Which exact local fixture execution strategy should future mutation QA use first: transactional Jest fixtures, API-created disposable org data, or a separate local QA database snapshot?
- For an approved future mutation batch, should audit-log assertions be mandatory for every state transition or only for externally visible lifecycle actions?
- Are PDF generation and generated-document archive writes allowed in a later DEV-03 output batch, or should they remain deferred until a dedicated document/output ticket?
- Should smoke/E2E scripts be decomposed into non-destructive plan modes before any browser automation is run?
- Which permission names are final for update/void actions that currently reuse create/manage permissions in some modules?
- Should report exports be treated as output-only or as audit-relevant events requiring access logging?
- Cash-expense state-machine QA was included in AP Part 4 because it is routed under Purchases/AP and creates immediate AP-adjacent cash/expense postings.

## 11. Recommended Next Step

Proceed with `DEV-03 Part 5: banking reconciliation state-machine QA dry-run plan`.

Part 5 should remain dry-run planning by default. It should convert Banking/Reconciliation workflows into a precise fixture graph, endpoint plan, assertion matrix, audit evidence checklist, and cleanup/stop rules before any local disposable banking mutation is approved.
