# DEV-03 AP State-Machine Dry-Run Plan

## 1. Purpose And Scope

This document converts the Purchases/AP state-machine inventory into a dry-run QA plan. It is planning only: no login, fixture creation, API mutation, PDF generation, archive creation, download, export, ZATCA action, email action, migration, seed, reset, delete, deploy, or environment change was performed.

Scope is limited to:

- Purchase order create/edit/approve/mark-sent/close/void/convert-to-bill behavior.
- Purchase bill create/edit/finalize/void behavior, including direct expense/asset and inventory-clearing modes.
- Supplier payment create/direct allocation/unapplied allocation/reversal/void behavior.
- Supplier refund create/void behavior from supplier-payment or purchase-debit-note sources.
- Purchase debit note create/edit/finalize/apply/reverse-allocation/void behavior.
- Cash expense create/void behavior as an AP-adjacent immediate posting flow.
- Purchase receipt and bill matching boundaries visible from AP routes and services.
- AP generated document, PDF, receipt, and archive gates as deferred output workflows.
- Visible permissions, audit-log side effects, accounting side effects, inventory side effects, and fixture requirements for a later approved local-only mutation run.

Source evidence inspected for this dry-run plan:

- [DEV-03 state-machine QA inventory](DEV_03_STATE_MACHINE_QA_INVENTORY.md)
- [DEV-03 safe fixture/login/audit policy](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md)
- [DEV-03 AR dry-run plan](DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md)
- `apps/api/prisma/schema.prisma`
- `apps/api/src/purchase-orders/*`
- `apps/api/src/purchase-bills/*`
- `apps/api/src/supplier-payments/*`
- `apps/api/src/supplier-refunds/*`
- `apps/api/src/purchase-debit-notes/*`
- `apps/api/src/cash-expenses/*`
- `apps/web/src/app/(app)/purchases/*`
- `apps/web/src/components/forms/purchase-bill-form.tsx`
- AP helper tests under `apps/web/src/lib/*`
- `tests/e2e/purchases-flow.spec.ts` as reference only; it was not run

## 2. Safety Rules For This AP Dry-Run Plan

- This plan is local-disposable only by default and does not approve mutation QA by itself.
- Do not use production, beta/user-testing, shared, or customer data.
- Do not login until a future batch explicitly approves login/audit-log writes.
- Do not create fixture records yet.
- Do not run seed/reset/delete, migrations, smoke, E2E, exports, downloads, PDF generation, ZATCA, email, backup/restore, deploys, or environment changes.
- Do not create, edit, approve, close, finalize, void, reverse, allocate, refund, export, download, send, upload, receive, post, delete, or migrate anything during this planning part.
- Every future fixture name, display label, memo, note, reference, or description must start with `DEV03-AP-` where the field accepts a human-readable marker.
- Any future evidence must avoid tokens, cookies, auth headers, DB URLs, request/response bodies containing customer/vendor data, signed XML, QR payloads, attachment bodies, generated PDF bodies, and real supplier/customer data.
- Deletion endpoints are visible in code for draft records, but delete testing remains out of scope unless a future cleanup policy explicitly approves it.
- Purchase receipt creation/posting is not approved by this AP plan; AP can only plan the boundary where purchase bills and purchase orders expose receipt matching or links into inventory workflows.

## 3. AP Workflow Map

### Purchase Orders

- Routes: `/purchases/purchase-orders`, `/purchases/purchase-orders/new`, `/purchases/purchase-orders/[id]`, `/purchases/purchase-orders/[id]/edit`.
- Web surfaces: `apps/web/src/app/(app)/purchases/purchase-orders/*` and `apps/web/src/lib/purchase-orders.ts`.
- API controller/service: `apps/api/src/purchase-orders/purchase-order.controller.ts` and `apps/api/src/purchase-orders/purchase-order.service.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /purchase-orders`
  - `PATCH /purchase-orders/:id`
  - `POST /purchase-orders/:id/approve`
  - `POST /purchase-orders/:id/mark-sent`
  - `POST /purchase-orders/:id/close`
  - `POST /purchase-orders/:id/void`
  - `POST /purchase-orders/:id/convert-to-bill`
  - `GET /purchase-orders/:id` and receipt matching reads as assertion endpoints.
- Output endpoints to keep deferred:
  - `GET /purchase-orders/:id/pdf-data`
  - `GET /purchase-orders/:id/pdf`
  - `POST /purchase-orders/:id/generate-pdf`
- State fields: `PurchaseOrder.status` (`DRAFT`, `APPROVED`, `SENT`, `PARTIALLY_BILLED`, `BILLED`, `CLOSED`, `VOIDED`), `approvedAt`, `sentAt`, `closedAt`, `voidedAt`, `convertedBillId`.
- Allowed transitions visible from code:
  - Create purchase order as `DRAFT`.
  - Edit/delete only while `DRAFT`.
  - Approve `DRAFT -> APPROVED`; repeated approve on `APPROVED` returns the existing order.
  - Mark sent `APPROVED -> SENT`; repeated mark-sent on `SENT` returns the existing order.
  - Close `APPROVED|SENT|PARTIALLY_BILLED -> CLOSED`; repeated close on `CLOSED` returns the existing order.
  - Void `DRAFT|APPROVED|SENT -> VOIDED`; repeated void on `VOIDED` returns the existing order.
  - Convert `APPROVED|SENT -> BILLED`, creates a draft purchase bill, links `convertedBillId`, and rejects repeat conversion.
- Permissions:
  - View/list/detail/PDF-data/PDF/generate-PDF: `purchaseOrders.view`.
  - Create: `purchaseOrders.create`.
  - Edit/close/delete draft: `purchaseOrders.update`.
  - Approve/mark-sent: `purchaseOrders.approve`.
  - Void: `purchaseOrders.void`.
  - Convert to bill: `purchaseOrders.convertToBill`.
- Audit/log side effects: service logs `CREATE`, `UPDATE`, `APPROVE`, `MARK_SENT`, `CLOSE`, `VOID`, `CONVERT_TO_BILL`, and `DELETE` for `PurchaseOrder`.
- Accounting impact:
  - Purchase order approval/sent/close/void is operational and does not post GL entries.
  - Convert-to-bill creates a draft purchase bill with AP downstream risk but no journal at conversion time.
- Inventory impact:
  - Purchase order detail exposes receipt matching and links to `/inventory/purchase-receipts/new?sourceType=purchaseOrder&purchaseOrderId=...` when purchase receiving permission exists.
  - Future AP QA must not receive, post, or void inventory records unless the inventory batch separately approves it.
- Output/document impact:
  - PDF data is read-only from a document-body perspective.
  - PDF and generate-PDF endpoints call generated-document archive behavior and remain deferred.

### Purchase Bills

- Routes: `/purchases/bills`, `/purchases/bills/new`, `/purchases/bills/[id]`, `/purchases/bills/[id]/edit`.
- Web surfaces: `apps/web/src/app/(app)/purchases/bills/*`, `apps/web/src/components/forms/purchase-bill-form.tsx`, and `apps/web/src/lib/purchase-bills.ts`.
- API controller/service: `apps/api/src/purchase-bills/purchase-bill.controller.ts`, `apps/api/src/purchase-bills/purchase-bill.service.ts`, and `apps/api/src/purchase-bills/purchase-bill-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /purchase-bills`
  - `PATCH /purchase-bills/:id`
  - `POST /purchase-bills/:id/finalize`
  - `POST /purchase-bills/:id/void`
  - `GET /purchase-bills/:id`, `/open`, `/accounting-preview`, `/debit-notes`, `/debit-note-allocations`, `/supplier-payment-unapplied-allocations`, receipt matching reads, and inventory clearing report reads as assertion endpoints.
- Output endpoints to keep deferred:
  - `GET /purchase-bills/:id/pdf-data`
  - `GET /purchase-bills/:id/pdf`
  - `POST /purchase-bills/:id/generate-pdf`
- State fields: `PurchaseBill.status` (`DRAFT`, `FINALIZED`, `VOIDED`), `inventoryPostingMode` (`DIRECT_EXPENSE_OR_ASSET`, `INVENTORY_CLEARING`), `balanceDue`, `finalizedAt`, `journalEntryId`, `reversalJournalEntryId`, `purchaseOrderId`.
- Allowed transitions visible from code:
  - Create purchase bill as `DRAFT`.
  - Edit/delete only while `DRAFT`.
  - Finalize `DRAFT -> FINALIZED`; repeated finalize is idempotent only when a finalized bill already has a journal.
  - Reject finalize when `VOIDED`, when finalized without a journal, when totals/lines are not finalizable, or when fiscal period rules block posting.
  - For `INVENTORY_CLEARING`, reject finalize unless clearing readiness is satisfied, at least one inventory-tracked line exists, total is positive, inventory accounting is enabled, valuation is `MOVING_AVERAGE`, purchase receipt posting mode is `PREVIEW_ONLY`, and the clearing account is active/posting/organization-owned/not AP 210/not the inventory asset account.
  - Void `DRAFT -> VOIDED` with no reversal journal.
  - Void `FINALIZED -> VOIDED` with a reversal journal.
  - Reject finalized void when active supplier payment allocations, active supplier payment unapplied allocations, or active purchase debit-note allocations exist.
- Permissions:
  - View/list/open/detail/accounting-preview/PDF-data/PDF/generate-PDF/allocation reads: `purchaseBills.view`.
  - Create: `purchaseBills.create`.
  - Edit/delete draft: `purchaseBills.update`.
  - Finalize: `purchaseBills.finalize`.
  - Void: `purchaseBills.void`.
- Audit/log side effects: service logs `CREATE`, `UPDATE`, `FINALIZE`, `VOID`, and `DELETE` for `PurchaseBill`.
- Accounting impact:
  - Finalize posts AP journal lines: credit accounts payable, debit expense/asset accounts or inventory clearing for tracked lines in clearing mode, and debit VAT receivable when tax exists.
  - Finalized void creates or reuses one reversal journal and marks the original journal reversed.
  - Draft void changes state and balance only.
- Inventory impact:
  - `INVENTORY_CLEARING` mode links AP bills to inventory clearing reports and receipt asset posting boundaries.
  - AP finalization does not automatically post purchase receipt inventory asset journals.
  - Detail page exposes purchase receipt creation and matching status when `purchaseReceiving.create` permission exists.
- Output/document impact:
  - Accounting preview is a non-mutating planning read.
  - PDF endpoints are output-producing/archive-producing and remain deferred.

### Supplier Payments

- Routes: `/purchases/supplier-payments`, `/purchases/supplier-payments/new`, `/purchases/supplier-payments/[id]`.
- Web surfaces: `apps/web/src/app/(app)/purchases/supplier-payments/*` and `apps/web/src/lib/supplier-payments.ts`.
- API controller/service: `apps/api/src/supplier-payments/supplier-payment.controller.ts`, `apps/api/src/supplier-payments/supplier-payment.service.ts`, and `apps/api/src/supplier-payments/supplier-payment-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /supplier-payments`
  - `POST /supplier-payments/:id/apply-unapplied`
  - `POST /supplier-payments/:id/unapplied-allocations/:allocationId/reverse`
  - `POST /supplier-payments/:id/void`
  - `GET /supplier-payments/:id`, `/allocations`, `/unapplied-allocations`, and bill read endpoints as assertions.
- Output endpoints to keep deferred:
  - `GET /supplier-payments/:id/receipt-data`
  - `GET /supplier-payments/:id/receipt-pdf-data`
  - `GET /supplier-payments/:id/receipt.pdf`
  - `POST /supplier-payments/:id/generate-receipt-pdf`
- State fields: `SupplierPayment.status` (`DRAFT`, `POSTED`, `VOIDED`), `amountPaid`, `unappliedAmount`, `journalEntryId`, `voidReversalJournalEntryId`, `postedAt`, `voidedAt`, `SupplierPaymentAllocation`, and `SupplierPaymentUnappliedAllocation.reversedAt`.
- Allowed transitions visible from code:
  - Create a posted supplier payment; direct allocations reduce finalized bill balances.
  - Reject total allocations above amount paid, inactive/wrong supplier, non-asset paid-through accounts, non-finalized bills, wrong-supplier bills, over-allocation, and closed fiscal periods.
  - Overpayments remain on `unappliedAmount`.
  - Apply unapplied payment amount to a same-supplier finalized open bill without another journal.
  - Reverse an active unapplied allocation, marking it reversed and restoring payment and bill balances without another journal.
  - Void `POSTED -> VOIDED` with a reversal journal and direct allocation balance restoration.
  - Reject void when active unapplied allocations or posted supplier refunds exist.
- Permissions:
  - View/list/detail/receipt data/PDF/unapplied reads: `supplierPayments.view`.
  - Create and apply unapplied payment credit: `supplierPayments.create`.
  - Reverse unapplied allocation, void, and delete draft: `supplierPayments.void`.
- Audit/log side effects: service logs `CREATE`, `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, `VOID`, and `DELETE`; reversal logs use `SupplierPaymentUnappliedAllocation` as the entity type.
- Accounting impact:
  - Payment create posts debit accounts payable and credit the paid-through asset account.
  - Direct payment allocation reduces bill `balanceDue`.
  - Unapplied application/reversal changes matching balances only and should not create journals.
  - Payment void creates or reuses one reversal journal and restores directly allocated bill balances.
- Inventory impact:
  - No direct stock quantity mutation.
  - AP payment state can affect whether inventory-clearing bills remain open but does not post inventory entries.
- Output/document impact:
  - Receipt data and receipt PDF endpoints are output-producing/archive-producing and remain deferred.

### Supplier Refunds

- Routes: `/purchases/supplier-refunds`, `/purchases/supplier-refunds/new`, `/purchases/supplier-refunds/[id]`.
- Web surfaces: `apps/web/src/app/(app)/purchases/supplier-refunds/*` and `apps/web/src/lib/supplier-refunds.ts`.
- API controller/service: `apps/api/src/supplier-refunds/supplier-refund.controller.ts`, `apps/api/src/supplier-refunds/supplier-refund.service.ts`, and `apps/api/src/supplier-refunds/supplier-refund-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `GET /supplier-refunds/refundable-sources`
  - `POST /supplier-refunds`
  - `POST /supplier-refunds/:id/void`
  - `GET /supplier-refunds/:id` and source payment/debit-note reads as assertions.
- Output endpoints to keep deferred:
  - `GET /supplier-refunds/:id/pdf-data`
  - `GET /supplier-refunds/:id/pdf`
  - `POST /supplier-refunds/:id/generate-pdf`
- State fields: `SupplierRefund.status` (`DRAFT`, `POSTED`, `VOIDED`), `sourceType` (`SUPPLIER_PAYMENT`, `PURCHASE_DEBIT_NOTE`), `sourcePaymentId`, `sourceDebitNoteId`, `amountRefunded`, `journalEntryId`, `voidReversalJournalEntryId`, `postedAt`, `voidedAt`.
- Allowed transitions visible from code:
  - Create posted refund from a posted supplier payment with unapplied balance.
  - Create posted refund from a finalized purchase debit note with unapplied balance.
  - Source claim reduces payment or debit-note `unappliedAmount`.
  - Void posted refund once, restoring the source unapplied amount and creating or reusing a reversal journal.
  - Reject refunds above source unapplied amount, invalid source shape, wrong-supplier sources, stale source claims, closed periods, or voided sources.
- Permissions:
  - View/list/refundable sources/detail/PDF-data/PDF/generate-PDF: `supplierRefunds.view`.
  - Create: `supplierRefunds.create`.
  - Void/delete draft: `supplierRefunds.void`.
- Audit/log side effects: service logs `CREATE`, `VOID`, and `DELETE` for `SupplierRefund`.
- Accounting impact:
  - Refund create posts debit received-into asset account and credit accounts payable.
  - Refund void creates or reuses one reversal journal and restores supplier payment or purchase debit-note source balance.
- Inventory impact:
  - No direct stock quantity mutation.
- Output/document impact:
  - Supplier refund PDF endpoints are output-producing/archive-producing and remain deferred.

### Purchase Debit Notes

- Routes: `/purchases/debit-notes`, `/purchases/debit-notes/new`, `/purchases/debit-notes/[id]`, `/purchases/debit-notes/[id]/edit`.
- Web surfaces: `apps/web/src/app/(app)/purchases/debit-notes/*` and `apps/web/src/lib/purchase-debit-notes.ts`.
- API controller/service: `apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts`, `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`, and `apps/api/src/purchase-debit-notes/purchase-debit-note-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /purchase-debit-notes`
  - `PATCH /purchase-debit-notes/:id`
  - `POST /purchase-debit-notes/:id/finalize`
  - `POST /purchase-debit-notes/:id/apply`
  - `POST /purchase-debit-notes/:id/allocations/:allocationId/reverse`
  - `POST /purchase-debit-notes/:id/void`
  - `GET /purchase-debit-notes/:id`, `/allocations`, and bill-side debit-note allocation reads as assertions.
- Output endpoints to keep deferred:
  - `GET /purchase-debit-notes/:id/pdf-data`
  - `GET /purchase-debit-notes/:id/pdf`
  - `POST /purchase-debit-notes/:id/generate-pdf`
- State fields: `PurchaseDebitNote.status` (`DRAFT`, `FINALIZED`, `VOIDED`), `originalBillId`, `unappliedAmount`, `finalizedAt`, `journalEntryId`, `reversalJournalEntryId`, `PurchaseDebitNoteAllocation.reversedAt`.
- Allowed transitions visible from code:
  - Create as `DRAFT`.
  - Edit/delete only while `DRAFT`.
  - Finalize `DRAFT -> FINALIZED`; repeated finalize is idempotent only when a finalized debit note already has a journal.
  - Reject finalize when voided, finalized without a journal, totals/lines are not finalizable, original bill does not belong to the supplier, original bill balance cannot support the note, or posting date is blocked.
  - Apply finalized debit note to a same-supplier finalized open bill without another journal.
  - Reverse an active debit-note allocation, restoring debit-note unapplied amount and bill balance without another journal.
  - Void `DRAFT -> VOIDED` without reversal journal.
  - Void `FINALIZED -> VOIDED` with a reversal journal.
  - Reject finalized void when active allocations or posted supplier refunds exist.
- Permissions:
  - View/list/detail/PDF-data/PDF/generate-PDF/allocation reads: `purchaseDebitNotes.view`.
  - Create: `purchaseDebitNotes.create`.
  - Edit/delete draft currently also require `purchaseDebitNotes.create`, which remains a permission-policy question because there is no dedicated `purchaseDebitNotes.update`.
  - Finalize and apply: `purchaseDebitNotes.finalize`.
  - Reverse allocation and void: `purchaseDebitNotes.void`.
- Audit/log side effects: service logs `CREATE`, `UPDATE`, `FINALIZE`, `APPLY`, `REVERSE_ALLOCATION`, `VOID`, and `DELETE`; reverse allocation logs use `PurchaseDebitNoteAllocation` as the entity type.
- Accounting impact:
  - Finalize posts debit accounts payable, credit expense/asset line accounts, and credit VAT receivable when tax exists.
  - Apply/reverse allocation changes matching balances only and should not create journals.
  - Finalized void creates or reuses one reversal journal and blocks until active allocations/refunds are cleared.
- Inventory impact:
  - No direct stock quantity mutation.
  - Debit notes against inventory-clearing bills may affect AP balances around clearing workflows and need coordination with inventory Part 6.
- Output/document impact:
  - Purchase debit note PDF endpoints are output-producing/archive-producing and remain deferred.

### Cash Expenses

- Routes: `/purchases/cash-expenses`, `/purchases/cash-expenses/new`, `/purchases/cash-expenses/[id]`.
- Web surfaces: `apps/web/src/app/(app)/purchases/cash-expenses/*` and `apps/web/src/lib/cash-expenses.ts`.
- API controller/service: `apps/api/src/cash-expenses/cash-expense.controller.ts`, `apps/api/src/cash-expenses/cash-expense.service.ts`, and `apps/api/src/cash-expenses/cash-expense-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /cash-expenses`
  - `POST /cash-expenses/:id/void`
  - `GET /cash-expenses/:id` as assertion endpoint.
- Output endpoints to keep deferred:
  - `GET /cash-expenses/:id/pdf-data`
  - `GET /cash-expenses/:id/pdf`
  - `POST /cash-expenses/:id/generate-pdf`
- State fields: `CashExpense.status` (`DRAFT`, `POSTED`, `VOIDED`), `paidThroughAccountId`, `journalEntryId`, `voidReversalJournalEntryId`, `postedAt`, `voidedAt`.
- Allowed transitions visible from code:
  - Create as `POSTED` with an immediate journal.
  - Void `POSTED -> VOIDED` with a reversal journal.
  - Reject create when paid-through account is not an active posting asset, contact is invalid for expense use, lines are not postable, or posting date is blocked.
  - Delete is draft/no-journal only, but normal UI create posts immediately, so delete remains cleanup-only and out of scope.
- Permissions:
  - View/list/detail/PDF-data/PDF/generate-PDF: `cashExpenses.view`.
  - Create: `cashExpenses.create`.
  - Void/delete draft: `cashExpenses.void`.
- Audit/log side effects: service logs `CREATE`, `VOID`, and `DELETE` for `CashExpense`.
- Accounting impact:
  - Create posts debit expense lines, debit VAT receivable when tax exists, and credit the paid-through asset account.
  - Void creates or reuses one reversal journal.
- Inventory impact:
  - No direct stock quantity mutation.
- Output/document impact:
  - Cash expense PDF endpoints are output-producing/archive-producing and remain deferred.

### Purchase Receipt And Bill Matching Boundary

- AP routes involved:
  - `/purchases/purchase-orders/[id]` links to purchase receipt creation from an order.
  - `/purchases/bills/[id]` links to purchase receipt creation from a bill, displays receipt matching status, displays clearing reconciliation rows, and links to inventory clearing reports.
- Inventory routes outside this AP mutation scope:
  - `/inventory/purchase-receipts/new`
  - `/inventory/purchase-receipts/[id]`
  - `/inventory/reports/clearing-reconciliation`
  - `/inventory/reports/clearing-variance`
- Boundary rule:
  - AP Part 4 plans only how AP workflows depend on receipt matching and inventory-clearing readiness.
  - Purchase receipt create/void/post/reverse behavior stays in inventory state-machine QA and is not approved here.

## 4. Proposed Local Disposable Fixtures

All names, labels, descriptions, notes, references, and document numbers that accept a human-readable marker should start with `DEV03-AP-`.

Required fixture markers for a later approved local-only mutation run:

- Organization marker: `DEV03-AP-ORG-<runId>`.
- User marker: `dev03.ap.<runId>@ledgerbyte.local.test`.
- Supplier marker: `DEV03-AP-SUPPLIER-<runId>`.
- Optional second supplier marker for wrong-supplier rejection tests: `DEV03-AP-SUPPLIER-ALT-<runId>`.
- Service item marker: `DEV03-AP-SERVICE-<runId>`.
- Optional inventory item marker for clearing-mode boundary tests: `DEV03-AP-INVENTORY-<runId>`.
- Expense account marker if created for fixture isolation: `DEV03-AP-EXPENSE-<runId>`.
- Asset/cash/bank account marker: `DEV03-AP-BANK-<runId>` or `DEV03-AP-CASH-<runId>`.
- Tax-rate marker if a non-zero VAT branch is approved: `DEV03-AP-TAX-<runId>`.
- Inventory clearing account marker if inventory-clearing branch is approved: `DEV03-AP-CLEARING-<runId>`.
- Purchase order marker: `DEV03-AP-PO-<runId>`.
- Purchase bill marker: `DEV03-AP-BILL-<runId>`.
- Supplier payment marker: `DEV03-AP-PAYMENT-<runId>`.
- Supplier refund marker: `DEV03-AP-REFUND-<runId>`.
- Purchase debit note marker: `DEV03-AP-DEBIT-NOTE-<runId>`.
- Cash expense marker: `DEV03-AP-CASH-EXPENSE-<runId>`.
- Optional purchase receipt marker, only if a later inventory/AP boundary run explicitly approves receipt fixture creation: `DEV03-AP-RECEIPT-<runId>`.

Fixture constraints:

- Use fake suppliers only; no real vendor, customer, staff, bank, tax, attachment, PDF, or statement data.
- Use small SAR amounts with simple decimal values.
- Use a local open fiscal period created or confirmed for the fixture run only after that future run approves fixture setup.
- Keep supplier, bill, payment, debit note, refund, and cash expense descriptions marker-bearing.
- Preserve audit logs as evidence; do not erase them through seed/reset/delete cleanup.

## 5. Dry-Run Test Matrix

| Workflow | Preconditions | Action to test in a later approved mutation run | Expected state before | Expected state after | Expected ledger/accounting effect | Expected inventory effect if any | Expected audit effect | Expected document/output effect | Rollback/cleanup expectation | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Purchase order create | Local `DEV03-AP-` org, user, supplier, item/account/tax fixtures approved | Create purchase order | No PO for marker | `DRAFT` PO exists with marker and totals | No journal | No stock movement | `CREATE PurchaseOrder` audit row | No PDF/archive | Later void/delete only if approved; otherwise leave marked draft | Planned only |
| Purchase order edit | Draft marked PO exists | Edit draft line/note/terms | `DRAFT` | `DRAFT` with updated fields/totals | No journal | No stock movement | `UPDATE PurchaseOrder` audit row | No PDF/archive | Leave marked draft or continue lifecycle | Planned only |
| Purchase order approve | Draft marked PO with positive total | Approve | `DRAFT` | `APPROVED`, `approvedAt` set | No journal | No stock movement | `APPROVE PurchaseOrder` audit row | No PDF/archive | Continue to sent/convert/void branch | Planned only |
| Purchase order mark sent | Approved marked PO | Mark sent | `APPROVED` | `SENT`, `sentAt` set | No journal | No stock movement | `MARK_SENT PurchaseOrder` audit row | No PDF/archive | Continue to convert/close/void branch | Planned only |
| Purchase order close | Approved, sent, or partially billed marked PO | Close | `APPROVED`, `SENT`, or `PARTIALLY_BILLED` | `CLOSED`, `closedAt` set | No journal | No stock movement | `CLOSE PurchaseOrder` audit row | No PDF/archive | Terminal marked PO remains as evidence | Planned only |
| Purchase order void | Draft/approved/sent marked PO | Void | `DRAFT`, `APPROVED`, or `SENT` | `VOIDED`, `voidedAt` set | No journal | No stock movement | `VOID PurchaseOrder` audit row | No PDF/archive | Terminal marked PO remains as evidence | Planned only |
| Purchase order convert to bill | Approved/sent marked PO with valid supplier and line accounts | Convert to bill | PO `APPROVED` or `SENT`, no `convertedBillId` | PO `BILLED`; linked draft purchase bill created | No journal until bill finalize | No stock movement; bill may expose receipt matching later | `CONVERT_TO_BILL PurchaseOrder` audit row | No PDF/archive | Continue bill lifecycle; do not delete unless approved | Planned only |
| Purchase bill create direct mode | Local supplier, posting accounts, line items, open period | Create direct expense/asset bill | No bill for marker | `DRAFT` bill with `DIRECT_EXPENSE_OR_ASSET` | No journal | No stock movement | `CREATE PurchaseBill` audit row | No PDF/archive | Continue finalize/void branches | Planned only |
| Purchase bill create inventory-clearing mode | Inventory clearing settings and tracked item are explicitly approved | Create clearing-mode bill | No bill for marker | `DRAFT` bill with `INVENTORY_CLEARING` | No journal | No stock movement; readiness warnings only | `CREATE PurchaseBill` audit row | No PDF/archive | Continue finalize boundary only if approved | Planned only |
| Purchase bill edit | Draft marked bill exists | Edit draft bill | `DRAFT` | `DRAFT` with updated fields/totals/mode | No journal | No stock movement | `UPDATE PurchaseBill` audit row | No PDF/archive | Continue lifecycle | Planned only |
| Purchase bill accounting preview | Draft marked bill exists | Read accounting preview | `DRAFT` | No state change | Preview only; no journal | Preview may show clearing account lines | No mutation audit expected | No PDF/archive | Read-only evidence only | Planned only |
| Purchase bill finalize direct mode | Draft direct-mode bill, open fiscal period, valid accounts | Finalize | `DRAFT`, `journalEntryId = null` | `FINALIZED`, `balanceDue = total`, `journalEntryId` set | Posted AP journal: Dr expense/asset/VAT receivable, Cr AP | No stock movement | `FINALIZE PurchaseBill` audit row | No PDF/archive | Later void only through normal app reversal if approved | Planned only |
| Purchase bill finalize clearing mode | Draft clearing-mode bill with valid clearing settings and tracked line | Finalize | `DRAFT`, readiness passing | `FINALIZED`, `journalEntryId` set | Posted AP journal uses inventory clearing for tracked lines | No receipt asset posting by bill finalization | `FINALIZE PurchaseBill` audit row | No PDF/archive | Coordinate with inventory Part 6 for receipt posting | Planned only |
| Purchase bill finalize blocked clearing mode | Draft clearing-mode bill with missing clearing settings or no tracked line | Attempt finalize | `DRAFT` | Still `DRAFT`; sanitized validation error | No journal | No stock movement | Error evidence only; audit write should not claim finalize | No PDF/archive | Fix fixture setup or document blocker | Planned only |
| Purchase bill void draft | Draft marked bill | Void | `DRAFT` | `VOIDED`, `balanceDue = 0` | No reversal journal | No stock movement | `VOID PurchaseBill` audit row | No PDF/archive | Terminal marked bill remains evidence | Planned only |
| Purchase bill void finalized | Finalized marked bill with no active allocations | Void | `FINALIZED`, journal exists | `VOIDED`, reversal journal set, `balanceDue = 0` | Reversal journal created or reused | No stock movement mutation | `VOID PurchaseBill` audit row | No PDF/archive | Terminal marked bill and journals retained | Planned only |
| Purchase bill void blocked by payment/debit allocations | Finalized bill has active supplier payment, unapplied allocation, or debit-note allocation | Attempt void | `FINALIZED` with active allocation | Still `FINALIZED`; sanitized blocker | No new reversal journal | No stock movement mutation | Error evidence only; no successful void audit expected | No PDF/archive | Reverse/void dependent fixture first in approved order | Planned only |
| Supplier payment create direct allocation | Finalized marked bill with balance due and paid-through asset account | Create supplier payment allocated to bill | No payment; bill open | Payment `POSTED`; bill balance reduced | Posted journal: Dr AP, Cr asset | No stock movement | `CREATE SupplierPayment` audit row | No receipt PDF/archive | Later void through normal app reversal if approved | Planned only |
| Supplier payment create unapplied | Supplier and paid-through asset account exist | Create overpayment or no allocation | No payment | Payment `POSTED` with `unappliedAmount > 0` | Posted journal: Dr AP, Cr asset | No stock movement | `CREATE SupplierPayment` audit row | No receipt PDF/archive | Use for supplier refund or apply-unapplied branch | Planned only |
| Supplier payment over-allocation rejection | Payment amount lower than requested allocations | Attempt create payment | No payment | No payment created; sanitized validation error | No journal | No stock movement | Error evidence only | No receipt PDF/archive | Correct fixture amount and retry only if approved | Planned only |
| Supplier payment apply unapplied | Posted marked payment has unapplied amount; same-supplier finalized bill open | Apply unapplied amount | Payment `POSTED`; bill open | Payment unapplied reduced; bill balance reduced; allocation record active | No new journal | No stock movement | `APPLY_UNAPPLIED SupplierPayment` audit row | No receipt PDF/archive | Reverse allocation if later cleanup requires | Planned only |
| Supplier payment reverse unapplied allocation | Active unapplied allocation exists | Reverse allocation | Allocation active | Allocation `reversedAt` set; payment and bill balances restored | No new journal | No stock movement | `REVERSE_UNAPPLIED_ALLOCATION SupplierPaymentUnappliedAllocation` audit row | No receipt PDF/archive | Reversed allocation remains evidence | Planned only |
| Supplier payment void | Posted payment with no active unapplied allocations or posted refunds | Void | `POSTED` | `VOIDED`, reversal journal set, direct bill allocations restored | Reversal journal created or reused | No stock movement | `VOID SupplierPayment` audit row | No receipt PDF/archive | Terminal payment retained | Planned only |
| Supplier payment void blocked | Posted payment has active unapplied allocation or posted supplier refund | Attempt void | `POSTED` with dependent records | Still `POSTED`; sanitized blocker | No reversal journal | No stock movement | Error evidence only | No receipt PDF/archive | Reverse allocations or void refunds first in approved order | Planned only |
| Supplier refund from payment | Posted supplier payment has unapplied amount | Create refund from payment | Source payment `POSTED`, unapplied available | Refund `POSTED`; source unapplied reduced | Posted journal: Dr received-into asset, Cr AP | No stock movement | `CREATE SupplierRefund` audit row | No refund PDF/archive | Void refund to restore source if approved | Planned only |
| Supplier refund from debit note | Finalized debit note has unapplied amount | Create refund from debit note | Source debit note `FINALIZED`, unapplied available | Refund `POSTED`; debit-note unapplied reduced | Posted journal: Dr received-into asset, Cr AP | No stock movement | `CREATE SupplierRefund` audit row | No refund PDF/archive | Void refund to restore source if approved | Planned only |
| Supplier refund void | Posted refund exists | Void refund | `POSTED` | `VOIDED`; source unapplied restored; reversal journal set | Reversal journal created or reused | No stock movement | `VOID SupplierRefund` audit row | No refund PDF/archive | Terminal refund retained | Planned only |
| Purchase debit note create | Supplier, optional original bill, line accounts, tax data approved | Create debit note | No debit note for marker | `DRAFT` debit note | No journal | No stock movement | `CREATE PurchaseDebitNote` audit row | No PDF/archive | Continue finalize/apply/void branch | Planned only |
| Purchase debit note edit | Draft marked debit note exists | Edit draft debit note | `DRAFT` | `DRAFT` with updated fields/totals | No journal | No stock movement | `UPDATE PurchaseDebitNote` audit row | No PDF/archive | Continue lifecycle | Planned only |
| Purchase debit note finalize | Draft marked debit note with valid supplier/original bill reference | Finalize | `DRAFT`, `journalEntryId = null` | `FINALIZED`, `unappliedAmount = total`, `journalEntryId` set | Posted AP reduction journal: Dr AP, Cr expense/asset/VAT receivable | No stock movement | `FINALIZE PurchaseDebitNote` audit row | No PDF/archive | Later apply/refund/void through normal transitions | Planned only |
| Purchase debit note apply | Finalized debit note and same-supplier finalized bill with balance due | Apply debit note to bill | Debit note unapplied available; bill open | Debit note unapplied reduced; bill balance reduced; allocation active | No new journal | No stock movement | `APPLY PurchaseDebitNote` audit row | No PDF/archive | Reverse allocation if cleanup requires | Planned only |
| Purchase debit note reverse allocation | Active debit-note allocation exists | Reverse allocation | Allocation active | Allocation `reversedAt` set; debit-note and bill balances restored | No new journal | No stock movement | `REVERSE_ALLOCATION PurchaseDebitNoteAllocation` audit row | No PDF/archive | Reversed allocation retained | Planned only |
| Purchase debit note void draft | Draft marked debit note | Void | `DRAFT` | `VOIDED` | No reversal journal | No stock movement | `VOID PurchaseDebitNote` audit row | No PDF/archive | Terminal note retained | Planned only |
| Purchase debit note void finalized | Finalized debit note with no active allocations/refunds | Void | `FINALIZED`, journal exists | `VOIDED`, reversal journal set | Reversal journal created or reused | No stock movement | `VOID PurchaseDebitNote` audit row | No PDF/archive | Terminal note retained | Planned only |
| Purchase debit note void blocked | Finalized debit note has active allocation or posted supplier refund | Attempt void | `FINALIZED` with dependent records | Still `FINALIZED`; sanitized blocker | No reversal journal | No stock movement | Error evidence only | No PDF/archive | Reverse allocations or void refunds first in approved order | Planned only |
| Cash expense create | Paid-through asset, expense line accounts, optional supplier contact, open period | Create cash expense | No cash expense for marker | `POSTED`, journal set | Posted journal: Dr expense/VAT receivable, Cr paid-through asset | No stock movement | `CREATE CashExpense` audit row | No receipt PDF/archive | Void through normal app reversal if approved | Planned only |
| Cash expense void | Posted marked cash expense exists | Void | `POSTED` | `VOIDED`, reversal journal set | Reversal journal created or reused | No stock movement | `VOID CashExpense` audit row | No receipt PDF/archive | Terminal expense retained | Planned only |
| AP PDF/archive gates | AP fixture records exist and output approval is separately granted | Generate or download PO/bill/payment/refund/debit-note/cash-expense PDF | Existing AP record | Generated document/archive/download result, if approved | No ledger change expected | No stock movement expected | Generated-document audit may be written | Output artifact created/downloaded | Deferred; not approved in Part 4 | Planned only |

## 6. Commands That May Be Needed Later But Must Not Be Run Now

These commands or flows may be useful in a future explicitly approved local-disposable mutation run, but they were not run for this planning part:

- Local service readiness:
  - `corepack pnpm verify:diff`
  - Safe API/web startup commands from [DEV-01 local QA runbook](DEV_01_LOCAL_QA_RUNBOOK.md)
  - `Invoke-WebRequest http://localhost:4000/health`
  - `Invoke-WebRequest http://localhost:4000/readiness`
- Future targeted non-mutating checks:
  - `corepack pnpm --filter @ledgerbyte/api typecheck`
  - `corepack pnpm --filter @ledgerbyte/web typecheck`
  - Targeted Jest specs for AP services and web helpers.
- Future approved mutation harness commands:
  - None are approved yet. A future Part 4.5 or execution ticket must define exact local-only fixture setup, login approval, state transitions, and cleanup evidence before any mutation command is run.

Commands that remain forbidden by default:

- `corepack pnpm smoke:*`
- Playwright E2E flows
- migrations
- seed/reset/delete
- deployed beta checks
- production checks
- env var changes
- ZATCA
- email
- backup/restore
- exports/downloads/PDF generation
- login/audit-writing flows without explicit approval

## 7. Existing Coverage Found

API coverage found:

- `apps/api/src/purchase-orders/purchase-order-rules.spec.ts`
  - Totals, tenant-scoped lookup, draft-only update, positive total requirement, approve, mark sent, close, void, convert-to-bill, and conversion rejection for closed/voided orders.
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`
  - Totals, AP journal balancing, idempotent finalize, finalized update rejection, finalization journal creation, accounting preview, direct versus inventory-clearing mode, clearing-mode blockers, closed period blocker, void blocker with active supplier payment allocations, inventory-clearing void reversal, and supplier ledger behavior.
- `apps/api/src/purchase-bills/purchase-bill.controller.spec.ts`
  - Permission coverage for accounting preview.
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`
  - AP-clearing payment journal lines, posted payment journal and bill balance reduction, closed-period blocker, unapplied payments, over-allocation rejection, void restoring bill balances, apply-unapplied without journal, and unapplied allocation reversal.
- `apps/api/src/supplier-refunds/supplier-refund-rules.spec.ts`
  - Supplier refund journal, refunds from payment and debit note sources, over-refund rejection, tenant-scoped lookup, void restoring payment/debit-note unapplied amounts, and generated supplier refund PDF archive support.
- `apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts`
  - Totals, AP reversal journal lines, idempotent finalize, finalized update rejection, tenant scope, finalization journal, apply without journal, draft/over-amount/balance rejections, original bill supplier match, allocation reversal, void blocker with active allocations, and supplier ledger rows.
- `apps/api/src/cash-expenses/cash-expense-rules.spec.ts`
  - Totals, balanced cash expense journal, posted cash expense with PDF archive support, closed-period blocker, contact validation, void reversal idempotency, and supplier ledger rows.

Web coverage found:

- `apps/web/src/lib/purchase-orders.test.ts`
  - Purchase order lifecycle helper states, labels, action visibility, and totals preview.
- `apps/web/src/lib/purchase-bills.test.ts`
  - Inventory posting mode labels, accounting preview formatting, and preview warning helpers.
- `apps/web/src/components/forms/purchase-bill-form.test.tsx`
  - New-bill supplier query string prefill.
- `apps/web/src/lib/supplier-payments.test.ts`
  - Unapplied allocation labels, active amount calculation, validation, and reverse eligibility.
- `apps/web/src/app/(app)/purchases/supplier-payments/new/page.test.tsx`
  - Supplier and bill allocation query string prefill.
- `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.test.tsx`
  - Supplier payment workflow guidance.
- `apps/web/src/lib/supplier-refunds.test.ts`
  - Status/source labels, refundable source labels, amount validation, and source links.
- `apps/web/src/lib/purchase-debit-notes.test.ts`
  - Status labels, badge classes, URLs, applied amount, allocation validation, reversal state, and active amount.
- `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.test.tsx`
  - Debit note workflow guidance.
- `apps/web/src/lib/cash-expenses.test.ts`
  - Status labels, void availability, paid-through labels, and API paths.
- `tests/e2e/purchases-flow.spec.ts`
  - Present as reference only; not run for this planning task because E2E/login/mutations remain out of scope.

## 8. Missing Coverage

- Disposable local fixture run proving the complete PO lifecycle, including convert-to-bill and terminal close/void branches.
- Authenticated runtime QA for AP pages and action gating after login/audit-writing is explicitly approved.
- API integration coverage across AP workflows using one marked supplier and multiple bills to prove direct allocation, unapplied allocation, reversal, refund blocker, and final void order.
- Runtime proof that purchase bill `INVENTORY_CLEARING` mode blocks unsafe settings and does not auto-post purchase receipt asset journals.
- Cross-workflow proof that purchase bill void is blocked by supplier payment allocations, supplier payment unapplied allocations, and debit-note allocations.
- Cross-workflow proof that supplier payment void is blocked by active unapplied allocations and posted supplier refunds.
- Cross-workflow proof that debit-note void is blocked by active allocations and posted supplier refunds.
- Runtime permission tests for debit-note edit/delete using `purchaseDebitNotes.create`, because no dedicated update permission exists.
- Output-producing PDF/archive/download coverage for purchase orders, bills, supplier payments, supplier refunds, purchase debit notes, and cash expenses.
- Manual browser confirmation of user-facing error/empty/success states once local browser policy and login/audit rules are approved.
- Cleanup evidence that preserves audit logs while leaving only marked local disposable records.

## 9. Risks And Blockers

- Login/audit-writing remains unapproved for this dry-run plan, so authenticated browser/runtime QA cannot be claimed.
- Fixture creation remains unapproved, so all AP state transitions remain planned only.
- Seed/reset/delete cleanup remains forbidden by default; future runs need marker-based cleanup or normal reversal/void terminal states.
- AP workflows are ledger-impacting. Bills, payments, refunds, debit notes, and cash expenses can create posted journals and reversal journals.
- Purchase bills can affect inventory-clearing balances without directly moving stock, so AP execution must coordinate with inventory QA before any receipt asset posting branch is run.
- Output endpoints can archive generated documents and may write generated-document audit evidence, so PDF/download checks require separate output approval.
- Debit-note edit/delete permission naming remains unresolved because both API and route mapping use `purchaseDebitNotes.create` for draft update/delete behavior.
- Cash expenses create as posted records immediately, so any future cash-expense create test must plan its reversal path first.
- Existing E2E/smoke coverage is not safe to run by default because it may require login, seeded data, services, and mutations.

## 10. Proposed Next Step

Proceed to:

- `DEV-03 Part 5: Banking/Reconciliation state-machine QA dry-run plan`

That keeps DEV-03 in planning mode while mapping the next high-risk state-machine area before any local-disposable login, fixture creation, or mutation approval is requested.

## 11. Open Questions

- Should LedgerByte add a dedicated `purchaseDebitNotes.update` permission, or is `purchaseDebitNotes.create` intentionally used for draft edit/delete?
- Should AP mutation QA include cash expenses in the same execution batch, or split them into a smaller immediate-posting batch because they create posted journals at creation time?
- Should purchase bill inventory-clearing execution wait until inventory Part 6, or should AP Part 4.5 include only finalization blockers with no receipt posting?
- Which non-destructive cleanup evidence format should be required before any AP mutation run is approved?
- Should PDF/archive checks be grouped with AP execution or deferred entirely to DEV-03 output gates?

## 12. Recommended Next Step

Run `DEV-03 Part 5: banking reconciliation state-machine QA dry-run plan` next. Do not execute AP mutations until a later prompt explicitly approves local disposable fixture creation, login/audit-writing, exact AP state transitions, and cleanup evidence.
