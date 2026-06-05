# Sales/AR Sample Review Index

Prepared: 2026-06-04

This index lists safe route patterns and sample outputs for accountant review. Use local or mocked sample data only. Do not paste real customer data, PDF bodies, base64, tokens, cookies, signed XML, QR payloads, or provider credentials into review notes.

## Companion Walkthrough Docs

- `SALES_AR_WALKTHROUGH_PACK.md`: guided review script for the full Sales/AR flow.
- `SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`: fake sample-data plan; do not run seed/reset/delete from it.
- `SALES_AR_EXPECTED_RESULTS_CHECKLIST.md`: expected checkpoints for invoices, quotes, recurring templates, delivery notes, collections, ledgers, reports, tax, and dashboard.
- `SALES_AR_ROUTE_REVIEW_CHECKLIST.md`: route checklist with limitation wording to verify.
- `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`: empty findings log.
- `SALES_AR_SAMPLE_OUTPUT_NAMING_GUIDE.md`: naming guide for review artifacts stored outside the repo.

## Core Sales/AR Routes

| Area | Route or output | Sample data guidance | Review focus |
| --- | --- | --- | --- |
| Sales invoice list | `/sales/invoices` | Fake invoice numbers and fake customers | List labels, draft/finalized/void wording, balance due. |
| Sales invoice detail | `/sales/invoices/[id]` | Fake finalized and draft invoices | Status, balance due, payment/credit allocations, local ZATCA readiness wording. |
| Invoice PDF | Sales invoice PDF download | Fake invoice with tax mode and payment summary | Title, totals, tax labels, payment summary, no email/payment-link/ZATCA production claim. |
| Sales quote list | `/sales/quotes` | Fake draft, sent, accepted, converted quotes | Non-posting quote wording, conversion status. |
| Sales quote detail | `/sales/quotes/[id]` | Fake accepted quote linked to draft invoice | Accepted/converted wording, draft invoice link, no AR/revenue/VAT/ZATCA claim. |
| Quote PDF | Sales quote PDF download | Fake quote lines and tax mode | `Sales Quote` title, non-posting helper text, no tax invoice claim. |
| Recurring invoice templates | `/sales/recurring-invoices` | Fake draft/active/paused templates | Template wording, schedule preview, manual generation. |
| Recurring invoice detail | `/sales/recurring-invoices/[id]` | Fake generated draft invoice run | Last run, next run, generated draft invoice link, no scheduler/email/payment claim. |
| Delivery note list | `/sales/delivery-notes` | Fake draft/issued/delivered notes | Delivery Note labels and fulfillment wording. |
| Delivery note detail | `/sales/delivery-notes/[id]` | Fake linked invoice/quote and optional stock issue | Source cards, reference-only stock issue wording, no AR/VAT/payment/inventory movement claim. |
| Delivery note PDF | Delivery note PDF download | Fake delivered note and fake delivery address | `Delivery Note` title, operational fulfillment wording, no invoice/tax invoice claim. |
| Collections workspace | `/sales/collections` | Fake overdue invoices and collection cases | Summary labels, promised/disputed/follow-up wording. |
| Collection case detail | `/sales/collections/[id]` | Fake activities and promise-to-pay details | Planned email/reminder wording, payment received note wording, no payment allocation claim. |
| Customer detail | `/customers/[id]` | Fake customer with invoices, quotes, delivery notes, collections | Customer activity grouping and AR balance non-effects. |
| AR Aging | `/reports/aged-receivables` | Fake open and paid invoices | Outstanding invoice wording and exclusion of non-posting records. |
| Tax workspace | `/tax` | Fake posted invoice/bill VAT data | Operational VAT summary, draft VAT view, not official filing workflow. |
| VAT Summary | `/reports/vat-summary` | Fake posted VAT accounts | Sales tax collected, purchase tax paid, net payable labels. |
| VAT Return | `/reports/vat-return` | Fake finalized sales/purchase documents | Draft return wording and no authority submission claim. |

## Archive And Search Checks

| Area | Route or output | Review focus |
| --- | --- | --- |
| Generated document archive | `/documents` | Document type labels for Sales Invoice, Sales Quote, Delivery Note, receipt, credit note, statement, and reports. |
| Global create menu | App shell create menu | Sales Quote, Recurring invoice template, Delivery Note, and Collection case labels. |
| Global search | App shell search | Search result labels open the correct routes and do not imply invoice/payment/email/ZATCA behavior for non-posting records. |

## Sample Output Rules

- Use fake customer names, fake invoice numbers, fake quote numbers, fake delivery-note numbers, and fake collection notes.
- Do not commit binary PDFs for review. Record the route/output and the visible wording issue instead.
- Do not include real beta customer data or hosted/customer-data evidence.
- Do not treat screenshots or mocked browser specs as accountant approval.
