# LedgerByte Accountant Review Checklist

Prepared: 2026-05-22

Use this checklist to review terminology, layout, readability, and accountant usability. Do not mark an item approved unless a qualified reviewer has inspected the relevant screen or output.

## Sales Invoice

- [ ] The title clearly identifies the document as a sales invoice or tax invoice when applicable.
- [ ] Draft, finalized/posted, partially paid, paid, and voided statuses are understandable.
- [ ] Customer block, invoice date, due date, currency, and invoice number labels are clear.
- [ ] Line item columns are readable and use expected labels for quantity, price, discount, taxable amount, VAT/tax, and total.
- [ ] Subtotal, discount, taxable total, VAT/tax, total, and balance due labels are clear.
- [ ] Payment allocation wording explains how payments affect the invoice balance.
- [ ] PDF/download/archive copy does not imply email sending or external submission.

## Customer Receipt

- [ ] Receipt title and payment date are clear.
- [ ] Payment method/reference wording is understandable.
- [ ] Applied invoice table clearly shows invoice total, amount applied, and remaining balance due.
- [ ] Unapplied credit wording is understandable when a payment is not fully allocated.
- [ ] Reversal/void status wording is clear if present.
- [ ] The receipt does not imply customer email delivery unless a send action is explicitly performed elsewhere.

## Credit Note

- [ ] Credit note title and status are clear.
- [ ] The original invoice reference is easy to find when linked.
- [ ] Reason, line totals, VAT/tax, total credit, applied amount, and unapplied amount labels are clear.
- [ ] The document explains that a credit note reduces or adjusts the customer balance.
- [ ] Void/reversal wording is understandable if shown.

## Customer Statement

- [ ] The title says "Customer Statement".
- [ ] Statement period, opening customer balance, period movement, and closing customer balance are clear.
- [ ] Debit and credit columns are explained in AR terms.
- [ ] The running balance column communicates amount due after each row.
- [ ] Invoice, customer payment, credit note, refund, and reversal rows are labeled in plain language.
- [ ] Empty statement wording is useful and does not look like a broken report.
- [ ] PDF layout is readable on A4 and long descriptions wrap acceptably.

## Purchase Bill

- [ ] The title and supplier block clearly identify a purchase bill.
- [ ] Draft, finalized/posted, partially paid, paid, and voided statuses are understandable.
- [ ] Bill date, due date, bill number, currency, and supplier reference labels are clear.
- [ ] Line item and totals labels match AP expectations.
- [ ] Payment/debit-note allocation wording explains how payable balances change.
- [ ] PDF/download/archive copy is understandable.

## Supplier Payment Receipt

- [ ] Supplier payment receipt title and payment date are clear.
- [ ] Payment method/reference wording is understandable.
- [ ] Applied bill table clearly shows bill total, amount applied, and remaining balance due.
- [ ] Unapplied supplier credit wording is understandable.
- [ ] The receipt does not imply email delivery or external remittance sending.

## Purchase Debit Note

- [ ] Debit note title and supplier context are clear.
- [ ] Related purchase bill reference is visible when present.
- [ ] Reason, line totals, VAT/tax, total debit, applied amount, and unapplied amount labels are clear.
- [ ] The document explains that a debit note reduces or adjusts supplier payable balance.
- [ ] Void/reversal/blocked action wording is understandable if shown.

## Supplier Statement

- [ ] The title says "Supplier Statement".
- [ ] Statement period, opening supplier payable, period movement, and closing supplier payable are clear.
- [ ] Debit and credit columns are explained in AP terms.
- [ ] The running balance column communicates payable balance after each row.
- [ ] Purchase bill, supplier payment, purchase debit note, refund, and reversal rows are labeled in plain language.
- [ ] Empty statement wording is useful and does not look like a broken report.
- [ ] PDF layout is readable on A4 and long descriptions wrap acceptably.

## AR Aging

- [ ] The report title and date/filter labels are clear.
- [ ] Bucket labels are understandable.
- [ ] Open invoice amounts match the intended meaning after payments, credit notes, and refunds.
- [ ] Customer and invoice drill-down labels are understandable.
- [ ] Empty state explains how invoices enter the report.

## AP Aging

- [ ] The report title and date/filter labels are clear.
- [ ] Bucket labels are understandable.
- [ ] Open bill amounts match the intended meaning after supplier payments and debit notes.
- [ ] Supplier and bill drill-down labels are understandable.
- [ ] Empty state explains how bills enter the report.

## General Ledger And Report Terminology

- [ ] General ledger date range and account labels are clear.
- [ ] Trial balance debit/credit columns and balanced state are clear.
- [ ] Profit and loss section labels are understandable.
- [ ] Balance sheet section labels are understandable.
- [ ] VAT summary labels do not imply official filing.
- [ ] CSV/PDF export labels are clear and do not imply external submission.

## Inventory Reports

- [ ] Movement report labels clearly distinguish inbound, outbound, and closing quantity.
- [ ] Stock valuation wording is explicitly operational if formal costing policy is not final.
- [ ] Low-stock report wording is planning-focused.
- [ ] Item and warehouse drill-down labels are clear.
- [ ] The UI does not imply unsupported FIFO, landed cost, serial/batch, or automatic valuation accounting.

## Bank Reconciliation

- [ ] Bank account screen distinguishes bank/statement activity from accounting ledger balance.
- [ ] Matched, unmatched, categorized, ignored, and reconciled statuses are understandable.
- [ ] Reconciliation close readiness explains zero-difference and unmatched-row blockers.
- [ ] Locked-period wording is understandable.
- [ ] Bank reconciliation PDF/report labels are clear.
- [ ] Statement import copy clearly says manual import, not live bank feed integration.

## VAT And ZATCA Wording Safety

- [ ] VAT/tax labels are readable and consistent across invoice, bill, credit note, debit note, and reports.
- [ ] No screen or PDF claims ZATCA production compliance.
- [ ] No screen or PDF claims real ZATCA network submission, CSID execution, clearance, or reporting.
- [ ] No screen or PDF claims PDF/A-3 generation.
- [ ] Any ZATCA wording is framed as local/readiness-only unless later approved in a separate compliance task.

## Overall Accountant Usability

- [ ] A new reviewer can trace invoice to receipt to customer statement to AR aging.
- [ ] A new reviewer can trace purchase bill to supplier payment/debit note to supplier statement to AP aging.
- [ ] A new reviewer can understand how bank statement rows relate to reconciliation.
- [ ] A new reviewer can understand the operational inventory reports and current costing limitations.
- [ ] Any accountant-facing blockers are recorded in `ACCOUNTANT_REVIEW_FINDINGS_TEMPLATE.md`.
