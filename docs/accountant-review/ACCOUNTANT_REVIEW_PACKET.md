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
- `SALES_AR_ACCOUNTANT_REVIEW_CHECKLIST.md`: focused Sales/AR checklist for invoices, payments, credit notes, refunds, ledgers, statements, quotes, recurring templates, delivery notes, collections, AR aging, and VAT wording.
- `SALES_AR_SAMPLE_REVIEW_INDEX.md`: safe Sales/AR route and output index for accountant review without real customer data or committed PDFs.
- `SALES_AR_WALKTHROUGH_PACK.md`: guided Sales/AR accountant walkthrough script for customer, quote, invoice, payment, credit/refund, recurring, delivery note, collections, reports, tax, and dashboard review.
- `SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`: planned fake Sales/AR sample records and expected accounting/non-effect checkpoints. This is a plan only and does not create data.
- `SALES_AR_EXPECTED_RESULTS_CHECKLIST.md`: expected results checklist for the Sales/AR walkthrough.
- `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`: empty findings log for walkthrough findings. No findings are approved or implemented until reviewed and converted into bounded tasks.
- `SALES_AR_ROUTE_REVIEW_CHECKLIST.md`: route-by-route Sales/AR review checklist.
- `SALES_AR_SAMPLE_OUTPUT_NAMING_GUIDE.md`: naming guide for screenshots/PDFs/videos stored outside the repo.
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXECUTION_PREFLIGHT.md`: local execution preflight. The 2026-06-04 run was blocked before data creation because local services were unavailable and mutation gates did not pass.
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`: local execution evidence status for the blocked walkthrough run.
- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_PREFLIGHT.md`: follow-up local services bring-up preflight. The target configuration remained local, but Docker, Postgres, Redis, API, and web runtime gates were unavailable.
- `docs/development/SALES_AR_WALKTHROUGH_FIXTURE_DRY_RUN_PLAN.md`: dry-run-only fixture plan for marker `SALES-AR-WALKTHROUGH-20260604`. No fixture script was added and no sample data was created.
- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_DRY_RUN_SPRINT_CLOSURE.md`: closure for the blocked local services bring-up and dry-run sprint.
- `SALES_AR_ACCOUNTANT_REVIEW_FINDINGS_TRIAGE.md`: current Sales/AR findings intake status and triage table; as of 2026-06-04 no completed accountant findings are recorded.
- `SALES_INVOICE_DOCUMENT_TITLE_POLICY.md`: pending Sales Invoice vs Tax Invoice title policy options for accountant, tax, and product decision.
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
| Sales quote | Quote detail and PDF | Non-posting quote wording, accepted/converted status, draft invoice conversion labels. |
| Recurring invoice template | Template detail and generation history | Schedule preview, manual generation, generated draft invoice labels, no scheduler/email/payment implication. |
| Delivery note | Delivery note detail and PDF | Fulfillment wording, source links, reference-only stock issue wording, no invoice/tax invoice implication. |
| Collections | Collection workspace and case detail | Planned email/reminder, promise-to-pay, payment received note, and no payment allocation/email/payment-link/legal automation implication. |
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
- The Sales/AR walkthrough pack is ready, but the actual accountant walkthrough has not been run or approved.
- The 2026-06-04 local walkthrough execution preflight was blocked before mutation; no sample data, PDFs, browser route evidence, or accountant findings were created.
- The 2026-06-04 local services bring-up follow-up remained blocked because Docker Desktop Linux engine, local Postgres, Redis, API, and web services were unavailable. The fixture dry-run plan exists, but no fixture script was added and no dry-run was executed.
- The Sales/AR findings triage has no completed accountant findings as of 2026-06-04; implementation remains blocked until concrete findings are recorded.
- Sales invoice document-title policy remains undecided; keep conservative `Sales Invoice` wording unless accountant/tax review approves a conditional `Tax Invoice` policy.
- Browser visual coverage is mocked and deterministic; it is not a substitute for authenticated real-account beta walkthroughs.
- Full smoke and full E2E remain pending unless explicitly run in a separate task.
- ZATCA production functionality remains blocked: no CSID execution, no clearance/reporting, no PDF/A-3, no real network, and no production compliance claim.
- Security hardening remains parked until a safe Vercel environment mutation path is available for runtime database role changes.
