# Sales/AR Local Walkthrough Expected Results Status

Date: 2026-06-05

Marker planned: `SALES-AR-WALKTHROUGH-20260604`

Execution mode: local runtime activation, fixture dry-run, local schema readiness, fixture prerequisite hardening, idempotent local execute completion, and metadata-only local route walkthrough.

Status values:

- not run
- pass
- fail
- blocked
- needs accountant review
- needs tax review
- needs product decision

## Current Expected-results Status

The fixture execute completed and metadata-only local route checks were run.

Technical metadata checkpoints are marked `pass` only where verified by dry-run, execute output, marker scan, or status-only local route checks. UI wording/layout, accountant acceptance, PDF output, VAT filing/title policy, and accounting interpretation checkpoints remain `needs accountant review`, `needs tax review`, `needs product decision`, or `not run` as appropriate.

No checkpoint was reviewed or approved by an accountant.

## Sales Invoice

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Draft invoice is clearly draft and editable before finalization. | needs accountant review | Metadata confirmed two generated draft invoices; UI clarity/editability still needs walkthrough review. |
| Finalized/posted invoice state appears only after the existing finalization workflow runs. | pass | Fixture execute finalized three synthetic invoices through existing local invoice finalization paths. |
| Invoice number is visible and understandable. | pass | Execute output recorded fake invoice numbers `INV-000345` through `INV-000349`. |
| Revenue/account coding is visible and does not imply COGS or inventory movement. | needs accountant review | Fixture selected active posting revenue account `411`; UI wording/visibility still needs review. |
| Tax exclusive invoice shows subtotal, tax, total, amount paid, amount credited, and balance due clearly. | needs tax review | Synthetic tax-exclusive invoice exists; tax math and presentation still need tax/accountant review. |
| Tax inclusive invoice shows inclusive tax treatment clearly. | needs tax review | Synthetic tax-inclusive invoice exists; tax treatment presentation still needs tax review. |
| No-tax invoice shows no-tax treatment without implying formal exemption approval. | needs tax review | Synthetic no-tax invoice exists; exemption/no-tax wording still needs tax review. |
| Balance due changes only through existing payment, credit note, refund, or void/reversal logic. | needs accountant review | Payment, credit-note allocation, and refund metadata exists; accountant review of balance presentation remains pending. |
| PDF/download/archive label matches current invoice title policy and avoids unsupported claims. | not run | PDF generation was not performed. |

## Quote

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Sales quote is clearly non-posting. | needs accountant review | Two synthetic quotes exist; UI wording still needs accountant review. |
| Accepted status appears only on accepted quotes. | pass | Metadata confirmed one accepted marker quote and one sent/awaiting marker quote. |
| Conversion creates or links to a draft sales invoice only. | pass | Metadata confirmed one quote conversion and one converted draft invoice. |
| Converted invoice link clearly indicates draft state where that is the actual state. | needs accountant review | Converted draft invoice exists; UI clarity still needs walkthrough review. |
| Quote PDF title says `Sales Quote`. | not run | PDF generation was not performed. |
| Quote PDF does not say `Tax Invoice`. | not run | PDF generation was not performed. |
| Quote workflow does not create AR, revenue, VAT payable, payment, email delivery, or ZATCA behavior. | needs accountant review | Fixture non-effects recorded no email/payment/ZATCA; accounting interpretation still needs review. |

## Recurring Invoice Template

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Recurring record is labeled `Recurring invoice template`. | needs accountant review | Marker recurring template exists; UI label still needs review. |
| Template is non-posting. | needs accountant review | Fixture created the template through existing non-posting workflow; accountant review remains pending. |
| Schedule preview is visible and understandable. | needs accountant review | Route is reachable; preview clarity was not manually reviewed. |
| Manual generate-now creates a draft invoice only. | pass | Metadata confirmed one recurring template and one generated recurring draft invoice. |
| Generated draft invoice link is visible where exposed. | needs accountant review | Generated draft invoice exists; UI link visibility still needs review. |
| Wording does not imply automatic scheduler, email, payment collection, posting, VAT filing, or ZATCA behavior. | needs accountant review | Fixture non-effects confirmed no scheduler/email/payment/ZATCA action; wording review remains pending. |

## Delivery Note

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Delivery note is labeled `Delivery Note`. | needs accountant review | Two marker delivery notes exist; UI/PDF labels still need review. |
| Delivery note is described as a fulfillment or operational document. | needs accountant review | Route is reachable; wording still needs accountant review. |
| Source invoice visibility is clear when linked. | pass | Metadata confirmed one invoice-sourced delivery note. |
| Source quote visibility is clear when linked. | pass | Metadata confirmed one quote-sourced delivery note. |
| PDF title says `Delivery Note`. | not run | PDF generation was not performed. |
| PDF/archive labels do not say invoice or tax invoice. | not run | PDF/archive route was not reviewed. |
| Delivery note does not create AR, journals, VAT filing, ZATCA submission, payment, email, or inventory movement by itself. | needs accountant review | Fixture non-effects confirmed no email/payment/ZATCA/PDF actions; accounting review remains pending. |

## Collections

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Collection case links to the intended customer and invoice. | pass | Metadata confirmed two marker collection cases reachable by API and web route. |
| Invoice outstanding balance is displayed from existing invoice/customer logic. | needs accountant review | Collection routes are reachable; balance presentation needs review. |
| Activity timeline shows notes safely. | pass | Metadata confirmed four marker collection activities. |
| Promise-to-pay wording does not imply payment was received. | needs accountant review | Promise-to-pay activity exists; wording still needs review. |
| Planned email and planned reminder wording does not imply email/reminder sent or a scheduler. | needs accountant review | No email/scheduler ran; wording still needs review. |
| Payment received note, if present, is note-only and does not imply payment allocation or posting. | needs accountant review | Activity handling exists; wording still needs review. |
| Collection case does not send email, create payment link, allocate payment, change invoice balance, file VAT, call ZATCA, or start legal automation. | needs accountant review | Fixture non-effects confirmed no email/payment/ZATCA action; accounting interpretation remains pending. |

## Customer Ledger And Activity

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Sales invoices, payments, credit notes, refunds, and reversals are grouped as posting financial records where applicable. | needs accountant review | Marker posting records exist; customer ledger presentation still needs review. |
| Quotes and recurring templates remain non-posting sales pipeline records. | needs accountant review | Marker quote and recurring records exist; customer activity wording still needs review. |
| Delivery notes remain fulfillment records. | needs accountant review | Marker delivery notes exist; customer activity wording still needs review. |
| Collection cases remain follow-up records. | needs accountant review | Marker collection cases exist; customer activity wording still needs review. |
| Statement balance excludes quotes, recurring templates, delivery notes, and collection cases. | needs accountant review | Requires statement review with completed synthetic data. |
| Outstanding balance reflects real AR logic only. | needs accountant review | Requires accountant review of ledger/report balances. |

## Reports And Tax

| Checkpoint | Status | Notes |
| --- | --- | --- |
| AR Aging uses outstanding sales invoices only. | needs accountant review | `/reports/aged-receivables` web/API returned `200`; report body and accountant definition review remain pending. |
| AR Aging excludes quotes, recurring templates, delivery notes, and collection cases. | needs accountant review | Non-posting records exist; report exclusion review remains pending. |
| VAT Summary is labeled operational. | needs tax review | `/reports/vat-summary` web/API returned `200`; wording review remains pending. |
| VAT Return is labeled draft or not official filing. | needs tax review | `/reports/vat-return` web/API returned `200`; wording review remains pending. |
| Tax workspace does not imply tax authority submission, production compliance, or ZATCA clearance/reporting. | needs tax review | `/tax` returned `200`; wording review remains pending. |

## Dashboard

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Dashboard shows overdue invoice attention where synthetic overdue invoices exist. | needs accountant review | `/dashboard` web and `/dashboard/summary` API returned `200`; dashboard body review remains pending. |
| Dashboard shows collection follow-ups where synthetic cases are due or overdue. | needs accountant review | Marker collection cases exist; dashboard attention review remains pending. |
| Dashboard shows quotes needing action without treating quotes as invoices. | needs accountant review | Marker quotes exist; dashboard wording review remains pending. |
| Dashboard shows recurring templates due for manual generation without implying scheduler behavior. | needs accountant review | Marker recurring template exists; dashboard wording review remains pending. |
| Dashboard shows generated recurring draft invoices as drafts. | needs accountant review | Generated draft invoice exists; dashboard presentation review remains pending. |
| Dashboard shows delivery notes awaiting delivery without implying inventory movement or carrier integration. | needs accountant review | Marker delivery notes exist; dashboard wording review remains pending. |
| Dashboard shows top AR customers by outstanding balance based on real AR logic only. | needs accountant review | Marker AR data exists; top-customer definition review remains pending. |
| Dashboard attention items are read-only and do not mutate invoices, collections, quotes, recurring templates, delivery notes, payments, VAT, ZATCA, or inventory. | needs accountant review | Metadata pass performed no mutations from dashboard; route-level state comparison remains pending. |

## Unsupported Claim Check

| Checkpoint | Status | Notes |
| --- | --- | --- |
| No production ZATCA compliance claim. | not run | Requires browser/document output review. |
| No PDF/A-3 claim. | not run | Requires browser/PDF output review. |
| No official VAT filing claim. | not run | Requires VAT route review. |
| No real email sent claim. | not run | Requires Sales/AR route review. |
| No payment gateway or payment link claim. | not run | Requires Sales/AR route review. |
| No automatic reminder claim. | not run | Requires collections/dashboard route review. |
| No automatic recurring scheduler claim. | not run | Requires recurring/dashboard route review. |
| No automatic inventory movement claim from delivery notes. | not run | Requires delivery note route review. |
| No legal debt collection automation claim. | not run | Requires collections route review. |
| No hosted/customer-data proof claim. | pass | Evidence remained local-only and metadata-only; no hosted/customer-data check was run. |

## Accountant Approval

No checkpoint was reviewed or approved by an accountant in this sprint.

## Current Execution Blocker

Resolved blockers:

- The earlier fixture tax-rate selection defect was fixed by requiring active `SALES` or `BOTH` tax-rate scope.
- The local database schema blocker was resolved by applying the pending local migrations and regenerating the Prisma client.
- The payment-account mapping blocker was fixed by passing the active posting ASSET chart-of-account id for customer payment/refund payloads.
- The credit-note application request-shape blocker was fixed by sending only `invoiceId` and `amountApplied`.
- The delivery/source-line lookup blocker was fixed by fetching invoice and quote detail records before source-linked delivery-note creation.
- The partial credit-note allocation idempotency blocker was fixed by reusing decimal-equivalent existing non-reversed allocations.

Current blocker:

- No current local fixture-execute blocker was found in this sprint.
- The remaining blocker is review scope: accountant review, tax wording/title review, PDF metadata checks, `/documents` checks with generated-document rows, full UI/browser acceptance, hosted/customer-data proof, and production readiness remain pending.

Partial marker-scoped local data exists:

- Customers: `1`
- Items: `2`
- Sales invoices: `5`
- Customer payments: `1`
- Credit notes: `1`
- Credit-note allocations: `1`
- Customer refunds: `1`
- Sales quotes: `2`
- Quote conversions: `1`
- Recurring templates: `1`
- Generated recurring draft invoices: `1`
- Delivery notes: `2`
- Collection cases: `2`
- Collection activities: `4`
- Generated documents: `0`

## Prior Blocked Status

The 2026-06-04 expected-result status marked all checkpoints blocked because local services were unavailable. That environment blocker is resolved for local runtime only. Accountant, tax, product, PDF, and full browser acceptance review remain pending.
