# Sales/AR Expected Results Checklist

Prepared: 2026-06-04

Use this checklist while running the Sales/AR accountant walkthrough with synthetic sample data. Do not mark any item accountant-approved from this checklist alone.

## 1. Sales Invoice

- [ ] Draft invoice is clearly draft and editable before finalization.
- [ ] Finalized/posted invoice state appears only after the existing finalization workflow runs.
- [ ] Invoice number is visible and understandable.
- [ ] Revenue/account coding is visible and does not imply COGS or inventory movement.
- [ ] Tax exclusive invoice shows subtotal, tax, total, amount paid, amount credited, and balance due clearly.
- [ ] Tax inclusive invoice shows inclusive tax treatment clearly.
- [ ] No-tax invoice shows no-tax treatment without implying formal exemption approval.
- [ ] Balance due changes only through existing payment, credit note, refund, or void/reversal logic.
- [ ] PDF/download/archive label matches current invoice title policy and does not imply unsupported email, payment link, official VAT filing, PDF/A-3, or production ZATCA behavior.

## 2. Quote

- [ ] Sales quote is clearly non-posting.
- [ ] Accepted status appears only on accepted quotes.
- [ ] Conversion creates or links to a draft sales invoice only.
- [ ] Converted invoice link clearly indicates draft state where that is the actual state.
- [ ] Quote PDF title says `Sales Quote`.
- [ ] Quote PDF does not say `Tax Invoice`.
- [ ] Quote workflow does not create AR, revenue, VAT payable, payment, email delivery, or ZATCA behavior.

## 3. Recurring Invoice Template

- [ ] Recurring record is labeled `Recurring invoice template`.
- [ ] Template is non-posting.
- [ ] Schedule preview is visible and understandable.
- [ ] Manual generate-now creates a draft invoice only.
- [ ] Generated draft invoice link is visible where exposed.
- [ ] Wording does not imply automatic scheduler, email, payment collection, posting, VAT filing, or ZATCA behavior.

## 4. Delivery Note

- [ ] Delivery note is labeled `Delivery Note`.
- [ ] Delivery note is described as a fulfillment or operational document.
- [ ] Source invoice visibility is clear when linked.
- [ ] Source quote visibility is clear when linked.
- [ ] PDF title says `Delivery Note`.
- [ ] PDF/archive labels do not say invoice or tax invoice.
- [ ] Delivery note does not create AR, journals, VAT filing, ZATCA submission, payment, email, or inventory movement by itself.

## 5. Collections

- [ ] Collection case links to the intended customer and invoice.
- [ ] Invoice outstanding balance is displayed from existing invoice/customer logic.
- [ ] Activity timeline shows notes safely.
- [ ] Promise-to-pay wording does not imply payment was received.
- [ ] Planned email and planned reminder wording does not imply email/reminder sent or a scheduler.
- [ ] Payment received note, if present, is note-only and does not imply payment allocation or posting.
- [ ] Collection case does not send email, create payment link, allocate payment, change invoice balance, file VAT, call ZATCA, or start legal automation.

## 6. Customer Ledger And Activity

- [ ] Sales invoices, payments, credit notes, refunds, and reversals are grouped as posting financial records where applicable.
- [ ] Quotes and recurring templates remain non-posting sales pipeline records.
- [ ] Delivery notes remain fulfillment records.
- [ ] Collection cases remain follow-up records.
- [ ] Statement balance excludes quotes, recurring templates, delivery notes, and collection cases.
- [ ] Outstanding balance reflects real AR logic only.

## 7. Reports And Tax

- [ ] AR Aging uses outstanding sales invoices only.
- [ ] AR Aging excludes quotes, recurring templates, delivery notes, and collection cases.
- [ ] VAT Summary is labeled operational.
- [ ] VAT Return is labeled draft or not official filing.
- [ ] Tax workspace does not imply tax authority submission, production compliance, or ZATCA clearance/reporting.

## 8. Dashboard

- [ ] Dashboard shows overdue invoice attention where synthetic overdue invoices exist.
- [ ] Dashboard shows collection follow-ups where synthetic cases are due or overdue.
- [ ] Dashboard shows quotes needing action without treating quotes as invoices.
- [ ] Dashboard shows recurring templates due for manual generation without implying scheduler behavior.
- [ ] Dashboard shows generated recurring draft invoices as drafts.
- [ ] Dashboard shows delivery notes awaiting delivery without implying inventory movement or carrier integration.
- [ ] Dashboard shows top AR customers by outstanding balance based on real AR logic only.
- [ ] Dashboard attention items are read-only and do not mutate invoices, collections, quotes, recurring templates, delivery notes, payments, VAT, ZATCA, or inventory.

## Unsupported Claim Check

- [ ] No production ZATCA compliance claim.
- [ ] No PDF/A-3 claim.
- [ ] No official VAT filing claim.
- [ ] No real email sent claim.
- [ ] No payment gateway or payment link claim.
- [ ] No automatic reminder claim.
- [ ] No automatic recurring scheduler claim.
- [ ] No automatic inventory movement claim from delivery notes.
- [ ] No legal debt collection automation claim.
- [ ] No hosted/customer-data proof claim.
