# Sales/AR Local Walkthrough Data Plan

Date: 2026-06-04

Marker: `SALES-AR-WALKTHROUGH-20260604`

Execution mode: planned local-only marker data. No data was created in this sprint.

## Plan Rules

- Use synthetic local data only.
- Preserve records by default.
- Do not delete existing data.
- Do not reset the database.
- Do not run seed scripts without a separate approved local-only execute gate.
- Do not send email, create payment links, call ZATCA, file VAT, execute backups/restores, or use hosted/customer data.
- Do not print secrets, DB URLs, auth headers, cookies, tokens, PDF bodies, base64, signed XML, QR payloads, or provider credentials.

## Planned Records

| Fake identifier | Route to inspect | Expected posting effect | Expected non-effect | Expected review checkpoint | Cleanup policy |
| --- | --- | --- | --- | --- | --- |
| `ORG-SAR-WALKTHROUGH-20260604` | App organization context | Existing local demo organization or fake local organization only if safe. | No hosted or production organization. | Organization context is local and synthetic. | Preserve by default. |
| `CUST-SAR-WALKTHROUGH-001` | `/customers/[id]` | Customer balance reflects only real posting AR records created in local fixture. | Quotes, templates, delivery notes, and collection cases do not affect balance. | Customer summary, ledger, statement, and activity use safe grouping. | Preserve by default. |
| `SVC-SAR-WALKTHROUGH-001` | `/sales/invoices/new`, `/sales/quotes/new` | Invoice lines use selected revenue account when finalized. | No inventory or COGS behavior. | Service line account-coding wording is clear. | Preserve by default. |
| `PROD-SAR-WALKTHROUGH-001` | `/sales/invoices/new`, `/sales/quotes/new` | Only if current local product/item behavior supports a safe product-style line. | No delivery note stock movement or automatic inventory movement. | Product-style line does not imply stock moved. | Preserve by default. |
| `4010-SAR-WALKTHROUGH-REVENUE` | Invoice and quote forms | Revenue account coding for posted invoices. | No COGS or inventory valuation review. | Account selector labels are understandable. | Preserve by default. |
| `TAX-SAR-WALKTHROUGH-15` | Invoice and quote tax fields | Posted taxable invoices flow into existing operational VAT views. | No official VAT filing or ZATCA production claim. | Tax exclusive/inclusive labels are clear. | Preserve by default. |
| `INV-SAR-WALKTHROUGH-TEX-001` | `/sales/invoices/[id]` | Finalized invoice posts through existing invoice logic and creates balance due. | No email, payment link, VAT filing, ZATCA call, or inventory movement. | Tax exclusive totals, status, balance due, and PDF label are clear. | Preserve by default. |
| `INV-SAR-WALKTHROUGH-TIN-001` | `/sales/invoices/[id]` | Finalized invoice posts through existing invoice logic with inclusive tax calculation. | No official tax filing or ZATCA clearance. | Inclusive tax wording is understandable. | Preserve by default. |
| `INV-SAR-WALKTHROUGH-NTX-001` | `/sales/invoices/[id]` | Finalized invoice posts without tax amount where supported. | No VAT payable is created from no-tax invoice. | No-tax wording is clear and not framed as formal exemption approval. | Preserve by default. |
| `PAY-SAR-WALKTHROUGH-001` | Customer payment route or customer detail | Payment affects invoice/customer balance through existing payment logic. | Does not imply bank reconciliation or email delivery. | Receipt/payment labels and allocation wording are clear. | Preserve by default. |
| `CN-SAR-WALKTHROUGH-001` | Credit note route or customer detail | Credit note reduces/adjusts customer balance through existing credit note logic. | Does not imply cash refund without refund record. | Credit note wording and applied/unapplied labels are clear. | Preserve by default. |
| `REF-SAR-WALKTHROUGH-001` | Refund route or customer detail | Only if refund behavior is already available locally. | Does not imply gateway refund or bank transfer execution. | Refund wording distinguishes refund from credit note. | Preserve by default. |
| `SQ-SAR-WALKTHROUGH-AWAIT-001` | `/sales/quotes/[id]` | No posting effect. | No AR, revenue, VAT filing, payment, email, or ZATCA behavior. | Awaiting acceptance label and non-posting wording are clear. | Preserve by default. |
| `SQ-SAR-WALKTHROUGH-ACCEPT-001` | `/sales/quotes/[id]` | No posting effect until invoice is separately finalized. | Quote acceptance does not create AR by itself. | Accepted status is clear. | Preserve by default. |
| `INV-SAR-WALKTHROUGH-QUOTE-DRAFT-001` | `/sales/invoices/[id]` | No posting while draft. | Quote conversion does not finalize invoice. | Converted invoice link says draft. | Preserve by default. |
| `REC-SAR-WALKTHROUGH-001` | `/sales/recurring-invoices/[id]` | Template itself is non-posting. | No scheduler, email, payment, VAT filing, or ZATCA behavior. | Schedule preview and manual generation wording are safe. | Preserve by default. |
| `INV-SAR-WALKTHROUGH-REC-DRAFT-001` | `/sales/invoices/[id]` | No posting while draft. | Recurring generation does not finalize invoice automatically. | Generated draft invoice label is visible. | Preserve by default. |
| `DN-SAR-WALKTHROUGH-INV-001` | `/sales/delivery-notes/[id]` | No accounting effect. | No AR, journals, VAT filing, ZATCA, payment, email, or inventory movement by itself. | Source invoice link and fulfillment wording are clear. | Preserve by default. |
| `DN-SAR-WALKTHROUGH-QUOTE-001` | `/sales/delivery-notes/[id]` | No accounting effect. | Does not convert quote, create invoice, or move inventory. | Source quote link and non-posting wording are clear. | Preserve by default. |
| `COL-SAR-WALKTHROUGH-OVERDUE-001` | `/sales/collections/[id]` | No accounting effect. | No payment allocation, invoice paid state, email, payment link, VAT filing, ZATCA, or legal automation. | Case status, linked invoice, and follow-up wording are clear. | Preserve by default. |
| `ACT-SAR-WALKTHROUGH-PTP-001` | `/sales/collections/[id]` | No accounting effect. | Promise to pay does not mean payment received. | Promise amount/date wording is safe. | Preserve by default. |
| `COL-SAR-WALKTHROUGH-DISPUTE-001` | `/sales/collections/[id]` | No accounting effect. | Does not imply legal escalation automation. | Disputed status and next follow-up wording are clear. | Preserve by default. |
| `AR-SAR-WALKTHROUGH-AGING-001` | `/reports/aged-receivables` | Uses outstanding sales invoices only. | Excludes quotes, recurring templates, delivery notes, and collection cases. | Aging buckets and outstanding-invoice wording are clear. | Preserve by default. |
| `VAT-SAR-WALKTHROUGH-SUMMARY-001` | `/reports/vat-summary` | Operational summary from existing posted taxable documents. | No official filing or ZATCA production claim. | Sales tax collected, purchase tax paid, and net payable/refundable labels are clear. | Preserve by default. |
| `VAT-SAR-WALKTHROUGH-RETURN-001` | `/reports/vat-return` | Draft return view only. | No official filing or submitted return claim. | Draft/not-official-filing wording is visible. | Preserve by default. |
| `DASH-SAR-WALKTHROUGH-001` | `/dashboard` | Read-only display of existing Sales/AR signals. | No mutation of invoices, collections, quotes, recurring templates, delivery notes, payments, VAT, ZATCA, email, or inventory. | Dashboard rows link to correct modules and use safe labels. | Preserve by default. |

## Future Execution Shape

If a later sprint approves local execution, the preferred approach is:

1. Add or reuse a fixture helper with dry-run mode first.
2. Enforce local target guard.
3. Require the marker.
4. Print counts and fake identifiers only.
5. Execute only after explicit current-turn approval.
6. Preserve records by default.
7. Record evidence in `SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`.

No fixture script was added in this sprint because local services are unavailable and mutation gates did not pass.
