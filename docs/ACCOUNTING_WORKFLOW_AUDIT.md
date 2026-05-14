# Accounting Workflow Audit

Audit date: 2026-05-15

This document maps implemented accounting workflows to their journal entries, balance fields, idempotency behavior, and gaps.

## Posting Date Locks

- API/UI: fiscal periods are managed through `GET/POST/PATCH /fiscal-periods` plus `close`, `reopen`, and `lock` actions on `/fiscal-periods`.
- Guard: `FiscalPeriodGuardService.assertPostingDateAllowed` is called before posted journals and reversal journals are created.
- Policy:
  - If no fiscal periods exist for an organization, posting remains allowed for MVP compatibility.
  - If periods exist, the posting date must fall inside an `OPEN` period.
  - `CLOSED` and `LOCKED` periods reject posting with clear 400-level business errors.
- Protected workflows:
  - Manual journal post and reversal.
  - Sales invoice finalization and finalized invoice void reversal.
  - Customer payment, customer refund, credit note, purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, bank transfer posting/void reversal, and bank opening-balance posting flows.
- Not protected:
  - Allocation and matching-only actions that create no journal entry, including payment allocations, credit note allocations, purchase debit note allocations, and their reversal/application variants.
- Gaps/risks:
  - Reversal posting date is current date only.
  - No admin unlock approval, fiscal year wizard, or retained earnings close process exists yet.

## Manual Journals

### Create

- API: `POST /journal-entries`
- Models: `JournalEntry`, `JournalLine`
- Status: draft journal creation is implemented.
- Validation:
  - At least two lines.
  - Exactly one side per line.
  - No negative amounts.
  - Debits equal credits.
  - Posting accounts must be active and tenant scoped.
- Accounting impact: none until posted.
- Gaps/risks:
  - Attachment entity support exists for manual journals at the API validation layer, but no manual-journal detail attachment panel is mounted yet.

### Post

- API: `POST /journal-entries/:id/post`
- Journal impact: status moves from `DRAFT` to `POSTED`; `postedAt` and `postedById` set.
- Balance fields affected: no subledger balance fields; GL impact exists through posted lines.
- Idempotency/concurrency:
  - Service claims/validates state before posting.
  - Posting date must fall inside an open fiscal period when periods are configured.
- Gaps/risks:
  - No approval workflow.

### Reverse

- API: `POST /journal-entries/:id/reverse`
- Journal impact:
  - Creates a posted reversal with each original debit/credit swapped.
  - Links through `reversalOfId`.
  - Marks original as `REVERSED`.
- Balance fields affected: GL only.
- Idempotency/concurrency:
  - Duplicate reversal attempts are guarded by unique relation and business errors.
  - Reversal posting date is guarded against closed/locked fiscal periods.
- Gaps/risks:
  - Manual reversal racing with workflow void should be load-tested.

## Bank Account Profiles

- API/UI: `/bank-accounts` lists cash/bank profiles; detail pages show posted transaction lines for the linked asset account.
- Model: `BankAccountProfile` links one profile to one active posting `ASSET` account.
- Journal impact:
  - No journal entry is created by profile create/update/archive/reactivate.
  - `POST /bank-accounts/:id/post-opening-balance` creates one posted opening-balance journal when amount/date metadata exists and has not already been posted.
  - Balances and transactions are read from posted `JournalLine` records for the linked account.
- Balance calculation:
  - For asset accounts, ledger balance is posted debits minus posted credits.
  - Draft journals are excluded.
  - Transaction running balance is calculated from posted journal lines ordered by journal date/number and line number.
  - Transaction source metadata now labels bank transfers, bank transfer reversals, and bank account opening-balance journals when the journal can be matched.
- Included workflows:
  - Customer payments debit bank/cash.
  - Supplier payments and cash expenses credit bank/cash.
  - Customer refunds credit bank/cash.
  - Supplier refunds debit bank/cash.
  - Bank transfers debit the destination profile account and credit the source profile account.
  - Bank transfer voids create one reversal journal and mark the transfer `VOIDED`.
  - Opening-balance posting debits the linked bank/cash account and credits Owner Equity account code `310` for positive balances; negative balances post the reverse.
  - Manual posted journals affect balances when they use the linked account.
- Safeguards:
  - Transfer date and opening-balance date must pass the fiscal period posting guard.
  - Transfers require active profiles, different source/destination profiles, matching currencies, and positive amount.
  - Opening balance posting requires an active profile, non-zero amount, opening-balance date, and no existing opening-balance journal.
  - Opening balance amount/date cannot be changed after the opening balance has been posted.
- Gaps/risks:
  - No live feeds, external banking API, payment gateway, transfer fee, or multi-currency FX workflow exists yet.

## Bank Statement Import And Reconciliation

- API/UI: statement imports and reconciliation are accessed from bank account detail pages through `/bank-accounts/:id/statement-imports`, `/bank-accounts/:id/statement-transactions`, `/bank-statement-transactions/:id`, `/bank-accounts/:id/reconciliation`, `/bank-accounts/:id/reconciliations`, and `/bank-reconciliations/:id`.
- Models: `BankStatementImport` stores the local import batch; `BankStatementTransaction` stores imported rows and reconciliation links; `BankReconciliation` stores draft/pending/approved/closed/voided close records; `BankReconciliationItem` stores the statement row snapshot captured at close; `BankReconciliationReviewEvent` stores reviewer transition history.
- Import behavior:
  - Preview accepts pasted CSV text or JSON rows, detects common bank headers, validates rows, returns totals/invalid rows/warnings, and does not write records.
  - JSON/CSV-row imports require an active bank account profile.
  - Invalid rows reject the import unless `allowPartial=true`; exact duplicates in the same import are invalid and possible existing duplicates are warnings.
  - Imports that would create statement rows inside a closed reconciliation period are rejected; preview warns instead.
  - Importing rows creates statement records only; it does not create journal entries.
  - Statement `CREDIT` rows increase bank balance and statement `DEBIT` rows decrease bank balance.
- Match behavior:
  - Candidate lookup searches posted journal lines for the linked bank account within a seven-day date window.
  - Statement credits match bank-account debit lines; statement debits match bank-account credit lines.
  - Manual matching marks the statement row `MATCHED` and links the journal line without posting anything.
- Categorization behavior:
  - Categorizing an unmatched row creates a posted journal dated to the statement transaction date.
  - Credit rows post Dr bank / Cr selected account.
  - Debit rows post Dr selected account / Cr bank.
  - Fiscal period locks are enforced before posting.
- Summary behavior:
  - Reconciliation summary reports statement totals, matched/categorized/ignored/unmatched counts, ledger balance, latest statement closing balance, difference, latest closed reconciliation, open draft state, unreconciled count, closed-through date, and a status suggestion.
- Approval and close/lock behavior:
  - Draft reconciliation creation calculates ledger closing balance through the period end date and stores `statementClosingBalance - ledgerClosingBalance` as the difference.
  - Submit requires zero difference and no `UNMATCHED` statement transactions in the period, then moves the record to `PENDING_APPROVAL`.
  - Approval records reviewer notes and moves the record to `APPROVED`; same-submitter approval is blocked unless the actor has `admin.fullAccess`.
  - Pending/approved reconciliations can be reopened to `DRAFT`; closed reconciliations cannot be reopened in this MVP.
  - Closing requires `APPROVED`, zero difference, and no `UNMATCHED` statement transactions in the period.
  - Close snapshots `MATCHED`, `CATEGORIZED`, and `IGNORED` statement rows into reconciliation items and creates no journal entry.
  - Closed reconciliation periods block statement transaction match, categorize, ignore, overlapping import, and import void/status-changing operations.
  - Reconciliation report data, CSV, and PDF endpoints render the close snapshot and archive generated PDFs.
  - Voiding a draft, pending, approved, or closed reconciliation marks it `VOIDED`, keeps review history, unlocks the period, and does not reverse categorized journals.
- Gaps/risks:
  - Attachment panels exist on bank statement transaction and bank reconciliation detail pages, but there is no production-grade statement-file parser/storage workflow, OFX/CAMT/MT940 parser, automatic matching, bank feeds, email delivery, or full approval queue yet.

## Uploaded Supporting Attachments

- API/UI: attachments are managed through `POST /attachments`, `GET /attachments`, `GET /attachments/:id`, `GET /attachments/:id/download`, `PATCH /attachments/:id`, and `DELETE /attachments/:id`, with reusable `AttachmentPanel` instances mounted on key sales, purchase, banking, and inventory detail pages.
- Model: `Attachment` stores tenant-scoped metadata, sanitized filename, original filename, MIME type, size, SHA-256 content hash, storage provider marker, optional base64 content, soft-delete status, notes, and upload/delete actors.
- Storage behavior:
  - The active MVP provider is database/base64 storage behind an `AttachmentStorageService` abstraction.
  - `GET /storage/readiness` reports attachment and generated-document storage providers, max upload size, redacted S3 configuration checks, warnings, and blocking reasons without returning secret values.
  - `GET /storage/migration-plan` reports dry-run counts and byte totals for database-backed attachments and generated documents without copying, deleting, or rewriting content.
  - The S3-compatible attachment adapter is a readiness/stub implementation only; it reports not-ready configuration and throws a clear error if selected before a real object-storage adapter is implemented.
  - Future local/object storage provider markers exist, but no S3 dependency or external storage upload path is wired.
- Linked entity validation:
  - Upload verifies the linked entity exists in the active organization before writing metadata/content.
  - Supported entity types include invoices, payments, credit/debit notes, refunds, purchase orders/bills, cash expenses, bank statement transactions, bank reconciliations, purchase receipts, stock issues, inventory adjustments/transfers, inventory variance proposals, contacts, items, and manual journals.
- Accounting impact:
  - Attachment upload, metadata update, download, and soft delete create no journal entries and do not mutate source-document accounting state.
  - Storage readiness and migration-plan endpoints are read-only and create no journal entries or accounting state.
  - Attachments are evidence/supporting documents only; generated PDFs remain separate in `GeneratedDocument`.
- Gaps/risks:
  - Database/base64 storage is not production-scale.
  - No active S3/object-storage upload adapter or migration executor exists yet.
  - No virus scanning, OCR, retention policy, drag/drop polish, email attachment sending, or ZATCA attachment submission exists yet.

## Inventory Warehouse, Adjustment, Receipt, Issue, And Transfer Groundwork

- API/UI: inventory is accessed through `/inventory/warehouses`, `/inventory/warehouses/:id`, `/inventory/stock-movements`, `/inventory/stock-movements/new`, `/inventory/adjustments`, `/inventory/adjustments/new`, `/inventory/adjustments/:id`, `/inventory/transfers`, `/inventory/transfers/new`, `/inventory/transfers/:id`, `/inventory/purchase-receipts`, `/inventory/purchase-receipts/new`, `/inventory/purchase-receipts/:id`, `/purchase-receipts/:id/accounting-preview`, `/purchase-receipts/:id/post-inventory-asset`, `/purchase-receipts/:id/reverse-inventory-asset`, `/purchase-orders/:id/receipt-matching-status`, `/purchase-bills/:id/receipt-matching-status`, `/purchase-bills/:id/accounting-preview`, `/inventory/sales-stock-issues`, `/inventory/sales-stock-issues/new`, `/inventory/sales-stock-issues/:id`, `/sales-stock-issues/:id/accounting-preview`, `/sales-stock-issues/:id/post-cogs`, `/sales-stock-issues/:id/reverse-cogs`, `/inventory/balances`, `/inventory/settings`, `/inventory/accounting-settings`, `/inventory/purchase-receipt-posting-readiness`, `/inventory/reports/stock-valuation`, `/inventory/reports/movement-summary`, `/inventory/reports/low-stock`, `/inventory/reports/clearing-reconciliation`, `/inventory/reports/clearing-variance`, `/inventory/variance-proposals`, `/inventory/variance-proposals/new`, `/inventory/variance-proposals/:id`, and the item list quantity/reorder display.
- Models: `Warehouse` stores operational locations, `InventoryAdjustment` stores draft/approved/voided adjustment controls, `WarehouseTransfer` stores posted/voided transfers, `PurchaseReceipt`/`PurchaseReceiptLine` store posted/voided PO/bill/standalone receipt controls plus optional manual receipt asset journal links, `PurchaseBill.inventoryPostingMode` stores direct vs inventory-clearing compatibility mode, `SalesStockIssue`/`SalesStockIssueLine` store posted/voided invoice issue controls plus optional manual COGS journal links, `InventoryVarianceProposal` and `InventoryVarianceProposalEvent` store accountant-reviewed variance proposal lifecycle and posting audit state, `InventorySettings` stores reporting policy, manual COGS/receipt asset enable flag, purchase receipt posting mode, and account mappings including inventory clearing, `Item` stores optional reorder point/quantity, and `StockMovement` stores the operational stock ledger for inventory-tracked items.
- Warehouse behavior:
  - New and seeded organizations receive an active default `MAIN` warehouse.
  - Warehouse codes are unique per organization and normalized to uppercase.
  - Warehouses can be archived/reactivated, but the only active default warehouse cannot be archived.
  - Archived warehouses remain visible but cannot receive new stock movements.
- Stock movement behavior:
  - Direct MVP creation allows `OPENING_BALANCE` only.
  - Quantities are stored as positive numbers; direction is derived from movement type.
  - Movements require an active inventory-tracked item and an active warehouse in the same organization.
  - Duplicate opening balances for the same item/warehouse are rejected.
  - Adjustment, transfer, purchase receipt, and sales stock issue movement rows are generated by their workflow services.
- Adjustment behavior:
  - Adjustments start as `DRAFT`.
  - Draft adjustments can be edited, deleted, approved, or voided.
  - Approval creates `ADJUSTMENT_IN` for `INCREASE` or `ADJUSTMENT_OUT` for `DECREASE`.
  - Decrease approval is rejected when it would make item/warehouse quantity negative.
  - Approved adjustments can be voided once by creating the opposite adjustment movement.
- Transfer behavior:
  - Transfers post immediately as `POSTED` records.
  - Creation validates different active warehouses, tracked active item, positive quantity, and source availability.
  - Creation writes paired `TRANSFER_OUT` and `TRANSFER_IN` rows atomically.
  - Voiding writes paired reversal rows atomically and rejects repeated void attempts.
- Purchase receiving behavior:
  - Purchase receipts post immediately as `POSTED` records and may reference a purchase order, finalized purchase bill, or standalone supplier.
  - Source receipts validate supplier match, active warehouse, tracked active items, positive quantities, and remaining source quantity by line.
  - Creation writes `PURCHASE_RECEIPT_PLACEHOLDER` inbound rows, and voiding writes `ADJUSTMENT_OUT` reversal rows once.
  - Receipt void is blocked if it would make the warehouse stock negative.
  - Receipt void is also blocked while inventory asset posting is active and unreversed.
- Sales stock issue behavior:
  - Sales stock issues post immediately as `POSTED` records from finalized, non-voided sales invoices.
  - Creation validates customer match, active warehouse, tracked active items, positive quantities, invoice remaining quantity by line, and available stock.
  - Creation writes `SALES_ISSUE_PLACEHOLDER` outbound rows, and voiding writes `ADJUSTMENT_IN` reversal rows once.
  - If COGS has been posted and not reversed, voiding is blocked until the COGS journal is reversed.
- Source progress behavior:
  - `GET /purchase-orders/:id/receiving-status` and `GET /purchase-bills/:id/receiving-status` return NOT_STARTED/PARTIAL/COMPLETE plus ordered/billed, received, and remaining quantities.
  - `GET /purchase-orders/:id/receipt-matching-status` and `GET /purchase-bills/:id/receipt-matching-status` return operational receipt matching values, line differences, warnings, and NOT_RECEIVED/PARTIALLY_RECEIVED/FULLY_RECEIVED/OVER_RECEIVED_WARNING status without accounting mutation.
  - `GET /sales-invoices/:id/stock-issue-status` returns NOT_STARTED/PARTIAL/COMPLETE plus invoiced, issued, and remaining quantities.
- Balance behavior:
  - `GET /inventory/balances` derives quantity on hand by summing opening balance, adjustment, transfer, and placeholder receipt/issue movement directions by item and warehouse.
  - Average unit cost and inventory value are simple operational estimates from costed inbound movements when available.
- Reporting behavior:
  - `GET /inventory/settings` defaults to `MOVING_AVERAGE`, negative stock blocked, and value tracking enabled.
  - `GET /inventory/accounting-settings` defaults inventory accounting to disabled and returns mapping readiness, warnings, `previewOnly: true`, and no automatic posting state.
  - `PATCH /inventory/accounting-settings` validates tenant-owned active posting account mappings, including inventory clearing account type/separation rules, and blocks enabling unless inventory asset and COGS accounts exist with `MOVING_AVERAGE`.
  - `GET /inventory/purchase-receipt-posting-readiness` returns an advisory readiness audit for automatic/broader receipt asset posting, including Inventory Asset and Inventory Clearing mappings, direct-mode bill count, clearing-mode bill count, blockers, warnings, and a recommended next step. It does not mutate accounting and remains no-go for automatic posting, direct-mode posting, and historical migration.
  - `FIFO_PLACEHOLDER` can be saved, but reports still calculate moving-average estimates.
  - `GET /inventory/reports/stock-valuation` derives quantity, average unit cost, estimated value, item totals, and grand total from stock movements, with missing-cost warnings.
  - `GET /inventory/reports/movement-summary` derives opening, inbound, outbound, closing, movement count, and movement-type breakdown by item/warehouse.
  - `GET /inventory/reports/low-stock` lists tracked items at or below reorder point.
  - `GET /inventory/reports/clearing-reconciliation` compares finalized `INVENTORY_CLEARING` purchase bill clearing debits with active linked purchase receipt asset posting credits, includes clearing account GL activity, supports CSV, and creates no journals.
  - `GET /inventory/reports/clearing-variance` returns only clearing rows requiring accountant review, including partial receipts, value differences, reversed receipt asset postings, and receipts without compatible clearing bills; it supports CSV and creates no variance journals.
  - `GET /inventory/variance-proposals/:id/accounting-preview` returns reviewed Dr debit account / Cr credit account preview lines, blockers, warnings, source links, and `canPost`; it creates no journal.
  - `docs/inventory/INVENTORY_ACCOUNTING_INTEGRITY_AUDIT.md` records the 2026-05-15 integrity audit and found no code-level double-counting defect in direct-mode blocking, clearing-mode receipt posting, COGS posting, reversals, void protection, or read-only report paths.
- Preview behavior:
  - Purchase receipt detail/API can show receipt value, linked bill mode/status, matched bill value, value difference, matching summary, posting status, journal ids, and Dr Inventory Asset / Cr Inventory Clearing lines when unit costs and mappings exist.
  - Purchase receipt preview returns `canPost: true` only for eligible receipts linked to finalized `INVENTORY_CLEARING` bills.
  - Purchase bill detail/API can show preview-only direct AP posting lines or Inventory Clearing lines. Direct mode can finalize under existing rules; inventory-clearing mode can finalize only when selected explicitly and inventory clearing settings pass validation.
  - Inventory settings shows the same purchase receipt posting readiness without exposing a post button.
  - Sales stock issue detail/API can show Dr COGS / Cr Inventory Asset preview lines using operational moving-average estimates.
  - Sales issue preview returns `canPost: true` only when inventory accounting is enabled, mappings are complete, the issue is posted/unvoided, COGS has not already been posted, and no preview blocking reasons exist.
- Manual COGS posting behavior:
  - `POST /sales-stock-issues/:id/post-cogs` requires `inventory.cogs.post`.
  - The posting date is the sales stock issue date and must pass fiscal-period guard.
  - The journal is Dr mapped COGS and Cr mapped Inventory Asset, linked to `SalesStockIssue.cogsJournalEntryId`.
  - Repeated posting is rejected.
  - `POST /sales-stock-issues/:id/reverse-cogs` requires `inventory.cogs.reverse`, creates a reversal journal dated today for the MVP, and links `cogsReversalJournalEntryId`.
- Manual purchase receipt asset posting behavior:
  - `POST /purchase-receipts/:id/post-inventory-asset` requires `inventory.receipts.postAsset`.
  - The posting date is the purchase receipt date and must pass fiscal-period guard.
  - The journal is Dr mapped Inventory Asset and Cr mapped Inventory Clearing, linked to `PurchaseReceipt.inventoryAssetJournalEntryId`.
  - Posting is blocked for direct-mode bills, standalone receipts, PO-only receipts, unfinalized bills, missing unit costs, inactive/missing mappings, duplicate posting, and disabled inventory accounting.
  - `POST /purchase-receipts/:id/reverse-inventory-asset` requires `inventory.receipts.reverseAsset`, creates a reversal journal dated today for the MVP, and links `inventoryAssetReversalJournalEntryId`.
- Inventory variance proposal behavior:
  - `POST /inventory/variance-proposals/from-clearing-variance` requires `inventory.varianceProposals.create`, recomputes the selected variance row, stores positive amount and debit/credit accounts, and creates no journal.
  - `POST /inventory/variance-proposals` creates manual draft proposals with accountant-selected posting accounts and creates no journal.
  - Submit and approve create events only.
  - `POST /inventory/variance-proposals/:id/post` requires `inventory.varianceProposals.post`, an `APPROVED` proposal, valid accounts, and an open fiscal period on proposal date; it creates one posted Dr debit account / Cr credit account journal.
  - `POST /inventory/variance-proposals/:id/reverse` requires `inventory.varianceProposals.reverse`, creates one reversal journal dated today for the MVP, and marks the proposal `REVERSED`.
  - Posted proposals cannot be voided until reversed; draft, pending, and approved proposals can be voided explicitly.
- Accounting impact:
  - No journal entries are created automatically by warehouses, stock movements, inventory adjustments, warehouse transfers, purchase receipts, or sales stock issues.
  - Manual COGS posting affects financial reports through posted journal lines.
  - Manual compatible receipt asset posting affects financial reports through posted journal lines.
  - Bill/receipt matching status, purchase bill accounting preview, purchase receipt accounting preview, clearing reconciliation reports, clearing variance reports, proposal creation, proposal submission, proposal approval, event reads, and proposal accounting previews do not post inventory clearing, AP-clearing, variance, or adjustment entries.
  - Explicit variance proposal posting affects financial reports through posted journal lines and explicit reversal nets those lines through the normal journal reversal strategy.
  - Inventory accounting settings, readiness, and preview endpoints do not affect GL, COGS, inventory asset balances, VAT, or financial statements by themselves.
- Gaps/risks:
  - No automatic COGS posting, automatic purchase receipt inventory asset posting, direct-mode receipt posting, automatic variance posting, automatic purchase receipt/automatic sales issue, landed cost, serial/batch tracking, delivery documents, or accounting-grade inventory financial report exists yet.
  - The next recommended inventory accounting phase is accountant review of variance proposal outputs, then landed-cost and historical direct-mode migration/exclusion policy.

## Sales Workflows

### Sales Invoice Finalization

- API: `POST /sales-invoices/:id/finalize`
- Models: `SalesInvoice`, `SalesInvoiceLine`, `JournalEntry`, `JournalLine`.
- Journal:
  - Dr account code `120` Accounts Receivable for invoice total.
  - Cr revenue accounts grouped by invoice line account for taxable amounts.
  - Cr account code `220` VAT Payable when tax total is positive.
- Balance fields:
  - `SalesInvoice.balanceDue = total` at finalization.
  - `journalEntryId` set.
- Idempotency/concurrency:
  - Finalizing an already finalized invoice returns existing invoice and does not double-post.
  - Draft row is claimed before journal creation.
- Void/reversal:
  - Draft void marks `VOIDED`.
  - Finalized void creates/reuses reversal journal and sets `reversalJournalEntryId`.
  - Active customer payment, credit note, or later unapplied payment allocations block voiding.
  - Finalization and finalized void reversal dates are fiscal-period guarded.
- Gaps/risks:
  - No recurring invoice engine.

### Customer Payment Posting

- API: `POST /customer-payments`
- Models: `CustomerPayment`, `CustomerPaymentAllocation`, `SalesInvoice`, `JournalEntry`.
- Journal:
  - Dr selected bank/cash asset account for `amountReceived`.
  - Cr account code `120` Accounts Receivable for `amountReceived`.
- Balance fields:
  - Allocated invoice `balanceDue` decreases by allocation amount.
  - Payment `unappliedAmount = amountReceived - allocatedAmount`.
  - `journalEntryId` set.
- Idempotency/concurrency:
  - Invoice updates use guarded balance conditions to avoid over-allocation.
  - Failed allocation rolls back payment and journal.
  - Payment date is fiscal-period guarded before posting.
- Void/reversal:
  - Posted payment void creates/reuses reversal journal.
  - Restores invoice balances for active direct allocations.
  - Blocks void while posted refunds or active later unapplied allocations exist.
  - Void reversal date is fiscal-period guarded.
- Gaps/risks:
  - No bank import/reconciliation or gateway settlement matching.

### Direct Payment Allocation

- Created with payment posting through `CustomerPaymentAllocation`.
- Accounting impact:
  - No separate journal beyond the payment journal.
- Balance fields:
  - Invoice `balanceDue` decreases.
- Reversal:
  - No standalone reversal endpoint; payment void restores allocation effects.

### Unapplied Payment Application

- API: `POST /customer-payments/:id/apply-unapplied`
- Model: `CustomerPaymentUnappliedAllocation`.
- Journal:
  - No journal entry. The original payment already posted Dr bank/cash, Cr AR.
- Balance fields:
  - `SalesInvoice.balanceDue` decreases.
  - `CustomerPayment.unappliedAmount` decreases.
- Idempotency/concurrency:
  - Conditional updates guard payment unapplied amount and invoice balance.
- Reversal:
  - `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`.
  - Marks allocation reversed, restores invoice balance and payment unapplied amount.
  - No journal entry.
- Gaps/risks:
  - No automatic open-invoice matching suggestions.

### Customer Refund Posting

- API: `POST /customer-refunds`
- Model: `CustomerRefund`.
- Sources: posted customer payment unapplied amount or finalized credit note unapplied amount.
- Journal:
  - Dr account code `120` Accounts Receivable for refunded amount.
  - Cr selected bank/cash asset account for refunded amount.
- Balance fields:
  - Source `unappliedAmount` decreases.
  - Refund `journalEntryId` set.
- Idempotency/concurrency:
  - Source balance update is guarded in the transaction.
  - Refund date is fiscal-period guarded before posting.
- Void/reversal:
  - `POST /customer-refunds/:id/void` creates/reuses reversal journal.
  - Restores source unapplied amount once.
  - Void reversal date is fiscal-period guarded.
- Gaps/risks:
  - No payment gateway refund or bank reconciliation.

### Credit Note Finalization

- API: `POST /credit-notes/:id/finalize`
- Models: `CreditNote`, `CreditNoteLine`, `JournalEntry`.
- Journal:
  - Dr revenue accounts grouped by credit note line account for taxable amounts.
  - Dr account code `220` VAT Payable when tax total is positive.
  - Cr account code `120` Accounts Receivable for credit note total.
- Balance fields:
  - `CreditNote.unappliedAmount = total`.
  - `journalEntryId` set.
- Idempotency/concurrency:
  - Finalizing an already finalized credit note returns existing record without double-posting.
  - Linked invoice total checks prevent over-crediting linked original invoice at creation/finalization.
  - Issue date is fiscal-period guarded before finalization posting.
- Void/reversal:
  - Draft void marks `VOIDED`.
  - Finalized void creates/reuses reversal journal.
  - Active allocations and posted refunds block voiding.
  - Void reversal date is fiscal-period guarded.
- Gaps/risks:
  - No inventory returns.
  - No ZATCA credit note XML/signing/submission.

### Credit Note Allocation

- API: `POST /credit-notes/:id/apply`
- Model: `CreditNoteAllocation`.
- Journal:
  - No journal entry. Credit note finalization already reduced AR.
- Balance fields:
  - `SalesInvoice.balanceDue` decreases.
  - `CreditNote.unappliedAmount` decreases.
- Idempotency/concurrency:
  - Conditional updates guard both balances.
- Reversal:
  - `POST /credit-notes/:id/allocations/:allocationId/reverse`.
  - Restores invoice balance and credit note unapplied amount.
  - No journal entry.
- Gaps/risks:
  - No automatic allocation recommendations.

## Purchase Workflows

### Purchase Order Lifecycle

- API: `POST /purchase-orders`, `POST /purchase-orders/:id/approve`, `POST /purchase-orders/:id/mark-sent`, `POST /purchase-orders/:id/convert-to-bill`.
- Models: `PurchaseOrder`, `PurchaseOrderLine`, optional source link on `PurchaseBill`.
- Journal:
  - No journal entry is created by PO create, approve, sent, close, void, PDF generation, or conversion.
  - The converted bill remains `DRAFT`; AP posting still happens only when the purchase bill is finalized.
- Balance fields:
  - PO totals are calculated server-side using purchase bill semantics.
  - Conversion copies PO totals into the draft bill and sets `PurchaseOrder.status = BILLED` plus `convertedBillId`.
- Idempotency/concurrency:
  - Draft-only edit/delete rules prevent mutation after approval.
  - Conversion blocks closed, voided, billed, and already converted POs.
- Gaps/risks:
  - No approval workflow, partial billing, automatic stock receipt, supplier delivery document, or supplier email sending.

### Purchase Bill Finalization

- API: `POST /purchase-bills/:id/finalize`
- Models: `PurchaseBill`, `PurchaseBillLine`, `JournalEntry`.
- Journal:
  - Dr purchase expense, cost-of-sales, or asset accounts grouped by bill line account for taxable amounts.
  - Dr account code `230` VAT Receivable when tax total is positive.
  - Cr account code `210` Accounts Payable for bill total.
- Balance fields:
  - `PurchaseBill.balanceDue = total`.
  - `journalEntryId` set.
- Idempotency/concurrency:
  - Finalizing an already finalized bill returns existing record without double-posting.
  - Draft row is claimed before posting.
- Void/reversal:
  - Draft void marks `VOIDED`.
  - Finalized void creates/reuses reversal journal.
  - Active supplier payment allocations block voiding.
  - Finalization and finalized void reversal dates are fiscal-period guarded.
- Gaps/risks:
  - Purchase order conversion and manual operational receiving exist, but there is no partial matching, landed cost, or automatic receiving.
  - No inventory asset posting or accounting-grade stock valuation.

### Supplier Payment Posting

- API: `POST /supplier-payments`
- Models: `SupplierPayment`, `SupplierPaymentAllocation`, `PurchaseBill`, `JournalEntry`.
- Journal:
  - Dr account code `210` Accounts Payable for `amountPaid`.
  - Cr selected bank/cash asset account for `amountPaid`.
- Balance fields:
  - Allocated bill `balanceDue` decreases.
  - Payment `unappliedAmount = amountPaid - allocatedAmount`.
  - `journalEntryId` set.
- Idempotency/concurrency:
  - Bill balance updates are guarded so allocations cannot exceed `balanceDue`.
  - Failed allocation rolls back payment and journal.
  - Payment date is fiscal-period guarded before posting.
- Void/reversal:
  - `POST /supplier-payments/:id/void` creates/reuses reversal journal.
  - Restores allocated bill balances once and marks payment `VOIDED`.
  - Void reversal date is fiscal-period guarded.
- Gaps/risks:
  - No supplier payment allocation reversal separate from payment void.
  - No automatic bank statement matching or gateway settlement workflow.

## Ledger Behavior

### Customer Ledger

- Invoice rows: debit invoice total.
- Payment rows: credit payment amount.
- Credit note rows: credit credit note total.
- Refund rows: debit refund amount.
- Void rows reverse visible effect.
- Allocation/reversal rows are neutral debit/credit zero informational rows.

### Supplier Ledger

- Purchase bill rows: credit bill total.
- Supplier payment rows: debit payment amount.
- Voided supplier payment rows: credit payment amount.
- Voided purchase bill rows: debit bill total.
- Running balance is credit minus debit and represents amount payable.
- UI risk: contact detail currently uses the generic ledger balance helper; AP-specific payable labels should be refined.
