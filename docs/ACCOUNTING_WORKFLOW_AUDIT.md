# Accounting Workflow Audit

Audit date: 2026-05-12

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
  - Customer payment, customer refund, credit note, purchase bill, supplier payment, supplier refund, purchase debit note, and cash expense posting/void reversal flows.
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
  - No attachment support.

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
  - No approval workflow, partial receiving, partial billing, stock receipt, or supplier email sending.

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
  - Purchase order conversion exists, but there is no partial matching or receiving.
  - No inventory receiving or stock valuation.

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
  - No supplier debit note or supplier refund workflow.
  - No bank reconciliation.

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
