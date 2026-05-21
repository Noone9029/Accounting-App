# LedgerByte Accountant Review Packet

Prepared: 2026-05-22

This packet prepares LedgerByte beta flows for review by a qualified accountant. It is not evidence that an accountant has reviewed or approved the product.

## Purpose

Use this packet to review whether LedgerByte's document wording, report labels, statement layout, and workflow explanations are understandable and accountant-appropriate for controlled beta users.

The review should focus on:

- Whether document titles, status labels, and totals are understandable.
- Whether AR/AP statement wording explains the balance movement correctly.
- Whether report terminology matches expectations for an SME accounting SaaS.
- Whether bank reconciliation and inventory report screens make operational sense.
- Whether the UI avoids unsupported compliance claims.

## Current Beta Support To Review

LedgerByte currently has polished beta UX and PDF/report output paths for:

- Sales invoices, customer receipts, credit notes, customer statements, AR aging, and customer ledger drill-downs.
- Purchase bills, supplier payment receipts, purchase debit notes, supplier statements, AP aging, and supplier ledger drill-downs.
- General ledger, trial balance, profit and loss, balance sheet, VAT summary, and report CSV/PDF exports.
- Manual bank statement import, statement transaction review, transfer drill-downs, reconciliation close/readiness screens, and bank reconciliation PDF reports.
- Inventory items, warehouses, receipts, stock issues, adjustments, transfers, stock movement reports, low-stock reports, and stock valuation reports.
- Generated PDF archive tracking for invoices, receipts, credit notes, purchase bills, supplier payment receipts, purchase debit notes, customer statements, supplier statements, and report PDFs where the source flow creates an archive row.

## Intentionally Out Of Scope

These items must not be treated as reviewed or production-ready from this packet:

- Legal, tax, or audit certification.
- ZATCA production approval, clearance, reporting, CSID execution, signing, or real network submission.
- PDF/A-3 generation or embedded XML compliance.
- Email delivery, customer email sending, or statement email workflows.
- Supabase RLS policy readiness or least-privilege runtime role rollout.
- Full smoke, full browser E2E, production monitoring, backup, or restore validation.
- Production accounting policy approval for inventory valuation, COGS automation, landed cost, FIFO, returns, or serial/batch handling.

## Review Materials

Use these files together:

- `ACCOUNTANT_REVIEW_CHECKLIST.md`: area-by-area checklist for document, statement, report, inventory, banking, VAT, and ZATCA wording review.
- `ACCOUNTANT_REVIEW_FINDINGS_TEMPLATE.md`: template for recording issues and production blockers.
- `SAMPLE_OUTPUT_INDEX.md`: safe index of routes, endpoint patterns, local test fixtures, and visual snapshots that can be used to collect sample evidence without committing sensitive PDFs.

## Document And Report Inventory

| Area | Current output/screen | Review focus |
| --- | --- | --- |
| Sales invoice | Invoice detail and PDF | Title, status, VAT/tax labels, subtotal/discount/tax/total/balance labels, payment allocation wording. |
| Customer receipt | Payment receipt detail and PDF | Receipt wording, allocation table labels, unapplied credit wording, paid/partial state clarity. |
| Credit note | Credit note detail and PDF | Original invoice reference, credit amount wording, applied/unapplied labels, reversal/void wording. |
| Customer statement | Contact statement tab and PDF | Opening balance, closing balance, debit/credit help, AR balance wording, period clarity. |
| Purchase bill | Bill detail and PDF | Bill status, AP posting wording, totals, payable balance labels, supplier identity block. |
| Supplier payment receipt | Supplier payment detail and PDF | Remittance/receipt wording, bill allocation labels, supplier credit wording. |
| Purchase debit note | Debit note detail and PDF | Supplier balance reduction wording, related bill reference, applied/unapplied labels. |
| Supplier statement | Supplier statement tab and PDF | Payable balance wording, debit/credit convention, period and running balance clarity. |
| AR aging | Aged receivables report | Bucket labels, customer/invoice drill-downs, paid invoice absence explanation. |
| AP aging | Aged payables report | Bucket labels, supplier/bill drill-downs, debit-note/payment effect explanation. |
| GL and financial reports | GL, trial balance, P&L, balance sheet, VAT summary | Account labels, natural balance wording, date filter clarity, export labels. |
| Inventory reports | Movement, valuation, low stock, balance reports | Operational valuation wording, quantity in/out labels, warehouse/item drill-down clarity. |
| Bank reconciliation | Bank account, statement transactions, reconciliation detail, PDF report | Statement vs ledger balance wording, matched/unmatched labels, lock/close readiness wording. |
| Document archive | `/documents` generated PDF archive | Source type labels, archive status labels, download guidance, non-posting wording. |

## Reviewer Notes

Reviewer:

Date:

Scope reviewed:

Overall verdict:

Key must-fix items before beta:

Key must-fix items before production:

Open questions for product/accounting team:

## Known Limitations

- Accountant review is pending; this packet only prepares the review.
- Browser visual coverage is mocked and deterministic; it is not a substitute for authenticated real-account beta walkthroughs.
- Full smoke and full E2E remain pending unless explicitly run in a separate task.
- ZATCA production functionality remains blocked: no CSID execution, no clearance/reporting, no PDF/A-3, no real network, and no production compliance claim.
- Security hardening remains parked until a safe Vercel environment mutation path is available for runtime database role changes.
