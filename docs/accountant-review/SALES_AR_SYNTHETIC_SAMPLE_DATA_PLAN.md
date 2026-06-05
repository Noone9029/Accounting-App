# Sales/AR Synthetic Sample Data Plan

Prepared: 2026-06-04

This file defines planned synthetic sample records for an accountant walkthrough. It is a plan only. Do not run seed, reset, delete, fixture creation, PDF generation, smoke, E2E, hosted, email, payment, VAT filing, or ZATCA workflows from this document.

## Safe Data Rules

- Use only fake customer names, fake document numbers, fake item names, fake notes, and fake route placeholders.
- Use placeholder tax identifiers only, such as `FAKE-VAT-REVIEW-001`; do not use real tax registration numbers.
- Use fake addresses only, such as `100 Sample Street, Demo District, Sample City`.
- Do not use real bank data, real emails, real customer records, real supplier records, production records, auth headers, cookies, tokens, DB URLs, PDF bodies, base64, signed XML, QR payloads, provider credentials, or secrets.
- Store screenshots, PDFs, and videos outside the repo if a reviewer needs them.

## Planned Sample Records

| Planned fake record | Purpose | Expected route | Expected accounting effect | Expected non-effect | Reviewer checkpoint |
| --- | --- | --- | --- | --- | --- |
| `LB-SAR-CUST-001 Sample Trading Co.` | Main customer for the walkthrough. | `/customers/[id]` | Customer balance reflects only real posting AR records. | Quotes, recurring templates, delivery notes, and collection cases do not change balance. | Customer summary, ledger, statement, and activity grouping use safe labels. |
| `LB-SAR-CUST-002 Example Retail Branch` | Secondary customer for dashboard top AR and quote review. | `/customers/[id]` | Balance reflects only posted invoices less real payments/credits/refunds. | No real customer data or production identifiers. | Dashboard and AR customer rows link safely. |
| `LB-SAR-SVC-001 Advisory service` | Service line for invoice and quote account coding. | `/sales/invoices/new`, `/sales/quotes/new` | Uses selected revenue account when posted through invoice finalization. | Does not imply inventory movement or COGS automation. | Line wording says revenue/account coding. |
| `LB-SAR-PROD-001 Demo product` | Optional product-style line if current local flow supports it safely. | `/sales/invoices/new`, `/sales/quotes/new` | Invoice posting follows existing sales invoice logic only. | Does not create stock issue or inventory movement from quote/invoice review alone. | If unavailable, skip without substituting real inventory data. |
| `4010 Sample sales revenue` | Revenue account selection. | Invoice and quote forms. | Posted invoice lines should code to selected revenue account where supported. | Does not imply COGS or inventory valuation review. | Account selector and invoice detail wording are understandable. |
| `TAX-SAR-15 15% VAT/tax example` | Review tax exclusive and inclusive examples. | Invoice and quote forms. | Posted taxable invoices feed existing operational VAT views. | Does not imply official filing, production ZATCA, or legal tax approval. | Tax mode and tax amount wording are clear. |
| `INV-SAR-TEX-001` | Tax exclusive invoice. | `/sales/invoices/[id]` | Finalization posts invoice through existing invoice logic and creates balance due. | Does not send email, create payment link, file VAT, or call ZATCA. | Subtotal, tax, total, balance due, PDF title, and status labels are clear. |
| `INV-SAR-TIN-001` | Tax inclusive invoice. | `/sales/invoices/[id]` | Finalization posts invoice through existing invoice logic with inclusive tax calculation. | Does not imply official tax filing or ZATCA clearance. | Inclusive-tax presentation is understandable. |
| `INV-SAR-NTX-001` | No-tax invoice. | `/sales/invoices/[id]` | Finalization posts invoice without tax amount where supported. | Does not create VAT payable. | No-tax wording is clear and not confused with exemption approval. |
| `SQ-SAR-AWAIT-001` | Quote awaiting acceptance. | `/sales/quotes/[id]` | No accounting effect. | Does not create AR, revenue, VAT filing, payment, email, or ZATCA behavior. | Quote status and non-posting wording are clear. |
| `SQ-SAR-ACCEPT-001` | Accepted quote for conversion review. | `/sales/quotes/[id]` | No accounting effect until a resulting invoice is finalized. | Acceptance does not post revenue or create AR by itself. | Accepted quote label appears only on accepted quote. |
| `INV-SAR-DRAFT-QUOTE-001` | Draft invoice converted from accepted quote. | `/sales/invoices/[id]` | No posting until separately finalized. | Conversion does not finalize invoice automatically. | Converted invoice link clearly says draft. |
| `REC-SAR-001` | Recurring invoice template due for manual generation. | `/sales/recurring-invoices/[id]` | No posting as a template. | No scheduler, email, payment, VAT filing, or ZATCA behavior. | Schedule preview, next run, last run, and manual-generation wording are safe. |
| `INV-SAR-REC-DRAFT-001` | Draft invoice generated from recurring template. | `/sales/invoices/[id]` | No posting until separately finalized. | Dashboard and template detail do not imply automatic finalization. | Generated draft invoice label is visible. |
| `DN-SAR-INV-001` | Delivery note sourced from invoice. | `/sales/delivery-notes/[id]` | No accounting effect. | Does not create AR, journals, VAT filing, ZATCA, payment, email, or inventory movement by itself. | Source invoice link and fulfillment wording are clear. |
| `DN-SAR-QUOTE-001` | Delivery note sourced from accepted quote. | `/sales/delivery-notes/[id]` | No accounting effect. | Does not convert quote, create invoice, or move inventory. | Source quote link and non-posting wording are clear. |
| `COL-SAR-OVERDUE-001` | Collection case linked to overdue invoice. | `/sales/collections/[id]` | No accounting effect. | Does not allocate payment, mark invoice paid, send email, create payment link, file VAT, call ZATCA, or start legal automation. | Case status, invoice balance, and follow-up wording are clear. |
| `ACT-SAR-PTP-001` | Promise-to-pay collection activity. | `/sales/collections/[id]` | No accounting effect. | Promise to pay does not mean payment received or allocated. | Activity timeline and promise amount/date wording are safe. |
| `COL-SAR-DISPUTE-001` | Disputed collection case. | `/sales/collections/[id]` | No accounting effect. | Does not imply legal escalation or court/debt-collection automation. | Dispute label and follow-up state are clear. |
| `PAY-SAR-001` | Customer payment applied to invoice. | Customer payment route or customer detail where exposed. | Payment affects invoice/customer balance through existing payment logic. | Does not imply bank reconciliation or email delivery. | Receipt/payment labels and allocation wording are clear. |
| `CN-SAR-001` | Credit note reducing customer balance. | Credit note route or customer detail where exposed. | Credit note reduces/adjusts balance through existing credit note logic. | Does not imply cash refund unless a separate refund exists. | Credit wording, original invoice reference, and applied/unapplied labels are clear. |
| `REF-SAR-001` | Refund scenario, only if already implemented safely. | Refund route or customer detail where exposed. | Refund follows existing refund posting behavior if available. | Does not imply payment gateway or bank transfer execution. | Refund wording distinguishes cash refund from credit note. |
| `AR-SAR-AGING-001` | AR Aging output for outstanding invoices. | `/reports/aged-receivables` | Uses outstanding sales invoices only. | Excludes quotes, recurring templates, delivery notes, and collection cases. | Aging buckets and outstanding-invoice wording are clear. |
| `VAT-SAR-SUMMARY-001` | VAT Summary sample. | `/reports/vat-summary` | Operational summary from existing posted taxable documents. | No official filing, tax authority submission, or ZATCA production claim. | Sales tax collected, purchase tax paid, and net payable/refundable labels are clear. |
| `VAT-SAR-RETURN-001` | VAT Return sample. | `/reports/vat-return` | Draft/operational return view only. | No official filing or submitted return claim. | Draft return and not-official-filing wording are visible. |
| `DASH-SAR-001` | Dashboard attention sample. | `/dashboard` | Read-only display of existing Sales/AR signals. | Does not mutate invoices, collections, quotes, recurring templates, delivery notes, VAT, ZATCA, payment, email, or inventory. | Attention rows link to the correct modules and use safe labels. |

## Scenario Coverage Matrix

| Scenario | Required sample records |
| --- | --- |
| Tax exclusive invoice review | `LB-SAR-CUST-001`, `LB-SAR-SVC-001`, `4010 Sample sales revenue`, `TAX-SAR-15`, `INV-SAR-TEX-001` |
| Tax inclusive invoice review | `LB-SAR-CUST-001`, `LB-SAR-SVC-001`, `TAX-SAR-15`, `INV-SAR-TIN-001` |
| No-tax invoice review | `LB-SAR-CUST-001`, `LB-SAR-SVC-001`, `INV-SAR-NTX-001` |
| Quote to draft invoice review | `SQ-SAR-ACCEPT-001`, `INV-SAR-DRAFT-QUOTE-001` |
| Recurring template manual generation review | `REC-SAR-001`, `INV-SAR-REC-DRAFT-001` |
| Delivery note traceability review | `DN-SAR-INV-001`, `DN-SAR-QUOTE-001` |
| Collections follow-up review | `COL-SAR-OVERDUE-001`, `ACT-SAR-PTP-001`, `COL-SAR-DISPUTE-001` |
| Customer balance review | `PAY-SAR-001`, `CN-SAR-001`, optional `REF-SAR-001` |
| Reports/tax review | `AR-SAR-AGING-001`, `VAT-SAR-SUMMARY-001`, `VAT-SAR-RETURN-001` |
| Dashboard attention review | `DASH-SAR-001` plus overdue invoice, collection, quote, recurring, delivery, and customer-balance examples |

## Execution Boundary

This plan intentionally does not create data. A separate approved local-only setup task may translate this plan into fixture data later. That future task must include explicit safeguards for local-only execution, no real customer data, no seed/reset/delete on hosted/shared targets, no real email, no payment links, no ZATCA calls, no VAT filing, and no committed binary review artifacts.
