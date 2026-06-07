# Sales/AR Accountant Review Checklist

Prepared: 2026-06-04

Use this checklist for a focused accountant review of LedgerByte Sales/AR wording, document labels, status labels, non-posting boundaries, and unsupported-claim safety. This checklist is review preparation only; it is not accountant approval, tax certification, ZATCA approval, or production readiness evidence.

## Companion Walkthrough Materials

Use these docs together for the guided Sales/AR walkthrough:

- `SALES_AR_WALKTHROUGH_PACK.md`: guided walkthrough script.
- `SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`: planned fake sample records only.
- `SALES_AR_EXPECTED_RESULTS_CHECKLIST.md`: expected workflow and accounting checkpoints.
- `SALES_AR_ROUTE_REVIEW_CHECKLIST.md`: route-by-route review checklist.
- `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`: empty findings log for real reviewer observations.
- `SALES_AR_SAMPLE_OUTPUT_NAMING_GUIDE.md`: external screenshot/PDF/video naming guidance.

## 1. Sales Invoice Review

- [ ] Sales invoice list, create, edit, and detail screens use `Sales Invoice` or `Invoice` consistently.
- [ ] Draft invoices are clearly draft and editable before finalization.
- [ ] Finalized invoices clearly show posted accounting only when the backend has actually finalized/posted the invoice.
- [ ] Detail screens show balance due, amount paid, and credit-note allocation wording clearly where those values are available.
- [ ] Invoice line account coding is described as revenue/account coding, not COGS, inventory movement, or stock issue automation.
- [ ] Tax mode wording is clear: tax exclusive, tax inclusive, or no tax.
- [ ] Invoice PDF/download/archive actions do not imply email delivery, payment links, official VAT filing, PDF/A-3, or production ZATCA submission.

## 2. Customer Payment Receipt Review

- [ ] Customer payment screens use payment/receipt wording only for real customer payment records.
- [ ] Draft payment wording does not imply posted cash movement or allocation.
- [ ] Posted payment wording clearly separates payment receipt from invoice creation.
- [ ] Receipt PDF/archive actions do not imply customer email delivery unless a separate email workflow is explicitly performed.

## 3. Credit Note Review

- [ ] Credit note screens label original invoice references, credit totals, applied amounts, and unapplied amounts clearly.
- [ ] Draft, posted/finalized, void, and reversal wording matches the actual credit-note lifecycle.
- [ ] Credit note wording does not imply cash refund unless a real refund record exists.

## 4. Customer Refund Review

- [ ] Customer refund screens distinguish refunds from credit notes and customer payments.
- [ ] Refund status labels match the actual refund posting lifecycle.
- [ ] Refund wording does not imply a payment gateway, payment link, or bank-feed confirmation.

## 5. Customer Ledger Review

- [ ] Customer ledger rows clearly separate invoices, payments, credit notes, refunds, and reversals.
- [ ] Running balance wording is understandable and tied to real AR records.
- [ ] Non-posting documents do not affect outstanding AR.

## 6. Customer Statement Review

- [ ] Customer statement titles and PDF titles say `Customer Statement`.
- [ ] Opening balance, activity, closing balance, debit/credit, and running-balance labels are clear.
- [ ] Quotes, recurring templates, delivery notes, and collection cases are not treated as invoices or AR balance rows.

## 7. AR Aging Review

- [ ] AR Aging wording says it is based on outstanding sales invoices.
- [ ] Payments, credit notes, and refunds are described only where they affect invoice balances through existing AR logic.
- [ ] Quotes, recurring templates, delivery notes, and collection cases are not treated as aging documents.
- [ ] The report does not imply payment automation, collection automation, official filing, or payment gateway behavior.

## 8. Sales Quote Review

- [ ] Quote pages say `Sales Quote` and non-posting where needed.
- [ ] Accepted quote wording appears only for accepted quotes.
- [ ] Converted quote wording says converted to a draft sales invoice when that is the actual generated state.
- [ ] Quote actions do not imply tax invoice status, AR balance, revenue posting, VAT payable, payment due as receivable, email delivery, ZATCA submission, or PDF/A-3.

## 9. Quote PDF Review

- [ ] Quote PDF title says `Sales Quote`.
- [ ] Quote PDF helper text says the PDF is non-posting.
- [ ] Quote PDF/archive wording does not say `Tax Invoice` or imply posting, VAT filing, email delivery, payment collection, or ZATCA submission.

## 10. Recurring Invoice Template Review

- [ ] Recurring pages say `Recurring invoice template`.
- [ ] Schedule wording says preview, next run, last run, and manual generation.
- [ ] Generation wording says generated draft invoice.
- [ ] The UI does not imply a background scheduler, automatic email, automatic payment collection, automatic posting, automatic VAT filing, or automatic ZATCA submission.

## 11. Delivery Note Review

- [ ] Delivery note pages say `Delivery Note`.
- [ ] Wording describes delivery notes as fulfillment or operational documents.
- [ ] Source invoice/quote links are traceability links only.
- [ ] Reference-only stock issue wording is clear when a stock issue link is present.
- [ ] Delivery notes do not imply invoice status, tax invoice status, AR balance, revenue, VAT filing, ZATCA, payment, email delivery, or automatic inventory movement.

## 12. Delivery Note PDF Review

- [ ] Delivery note PDF title says `Delivery Note`.
- [ ] Delivery note PDF/archive labels do not say invoice or tax invoice.
- [ ] Download/archive actions do not imply email/send, payment, VAT filing, ZATCA submission, or inventory movement.

## 13. Collections Workflow Review

- [ ] Collections pages use `Collection case` and `Collection follow-up`.
- [ ] Planned email and planned reminder labels do not imply sent email, scheduler, or automated reminder behavior.
- [ ] Promise to pay wording does not imply payment was received.
- [ ] Payment received note wording is clearly note-only and does not imply payment posting or allocation.
- [ ] Collection cases do not imply legal debt collection automation.
- [ ] Collection cases do not change invoice balance, allocate payment, create credit notes/refunds, post journals, file VAT, call ZATCA, or create payment links.

## 14. Customer Activity Review

- [ ] Customer activity separates posting financial documents from non-posting sales pipeline, fulfillment, and follow-up records.
- [ ] Sales quotes and recurring templates are non-posting sales pipeline records.
- [ ] Delivery notes are fulfillment records.
- [ ] Collection cases are follow-up records.
- [ ] Outstanding balance reflects real AR logic only.

## 15. Tax/VAT Wording Review

- [ ] VAT Summary wording says operational VAT summary.
- [ ] VAT Return wording says draft VAT return view.
- [ ] VAT screens say they are not an official filing workflow.
- [ ] Sales tax collected, purchase tax paid, and net payable/refundable labels are understandable.
- [ ] Tax/VAT screens do not imply tax authority submission, production compliance, or ZATCA clearance/reporting.

## 16. Unsupported Claims Checklist

- [ ] No ZATCA production compliance claim.
- [ ] No PDF/A-3 claim.
- [ ] No official VAT filing claim.
- [ ] No real email sent claim.
- [ ] No payment gateway or payment link claim.
- [ ] No automatic reminder claim.
- [ ] No automatic scheduler claim for recurring invoices.
- [ ] No automatic inventory movement claim from delivery notes.
- [ ] No legal debt collection automation claim.
