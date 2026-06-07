# Sales/AR Route Review Checklist

Prepared: 2026-06-04

Use this checklist with `SALES_AR_WALKTHROUGH_PACK.md`, `SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`, and `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`.

## Route Checklist

| Route pattern | Purpose | Expected reviewer focus | Safe limitation wording to check | Outputs/PDFs to review | Finding log reference |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | Sales/AR attention overview. | Overdue invoices, collection follow-ups, quote actions, recurring templates, delivery notes, top AR customers, empty states. | Read-only workflow signals; no email, payment, scheduler, VAT filing, ZATCA, or inventory movement. | Dashboard screenshots only if fake data is visible. | Record dashboard findings under `dashboard threshold` or `unsupported claim`. |
| `/customers` | Customer list. | Fake customer names, balances, links, and no real data. | Customer balances are AR summaries, not review approval. | None. | Record customer list findings under `customer ledger` or `usability`. |
| `/customers/[id]` | Customer detail, ledger, statement, and activity. | Balance, statement rows, activity grouping, collections, delivery notes, quotes, recurring templates. | Non-posting records stay separate from statement balance. | Customer statement PDF if generated safely outside the repo. | Record under `customer ledger`, `customer statement`, or workflow type. |
| `/sales/invoices` | Sales invoice list. | Draft/finalized/void status, balance due, customer, due date. | List does not imply email sent, payment link, official VAT filing, or ZATCA clearance. | None. | Record under `accounting logic`, `wording`, or `status label`. |
| `/sales/invoices/new` | Invoice creation. | Customer selection, lines, account coding, tax mode, draft save. | Draft invoice does not post accounting until finalized. | None. | Record under `accounting logic`, `VAT/tax`, or `wording`. |
| `/sales/invoices/[id]` | Invoice detail. | Invoice number, status, totals, amount paid, amount credited, balance due, PDF/archive actions. | Payment received appears only when a real payment exists; no ZATCA production claim. | Sales invoice PDF if generated safely outside the repo. | Record under `PDF/document`, `VAT/tax`, `ZATCA wording`, or `accounting logic`. |
| `/sales/quotes` | Quote list. | Draft/sent/accepted/converted status and non-posting labels. | Quotes are not invoices and do not create AR. | None. | Record under `quote` or `unsupported claim`. |
| `/sales/quotes/new` | Quote creation. | Customer, account-coded lines, tax modes, non-posting wording. | Quote creation does not post, send email, collect payment, or call ZATCA. | None. | Record under `quote`, `VAT/tax`, or `wording`. |
| `/sales/quotes/[id]` | Quote detail. | Accepted status, converted draft invoice link, PDF/archive actions. | Quote PDF is Sales Quote, not Tax Invoice. | Quote PDF if generated safely outside the repo. | Record under `quote` or `PDF/document`. |
| `/sales/recurring-invoices` | Recurring template list. | Template statuses, next run, last run, manual-generation labels. | Templates do not imply automatic scheduler or automatic invoice finalization. | None. | Record under `recurring invoice` or `unsupported claim`. |
| `/sales/recurring-invoices/new` | Recurring template creation. | Schedule preview, account coding, tax modes, template wording. | Template does not post journals or generate invoices automatically. | None. | Record under `recurring invoice`. |
| `/sales/recurring-invoices/[id]` | Recurring template detail. | Manual generation, generated draft invoice links, schedule preview. | Generated invoices are drafts and need separate finalization. | None. | Record under `recurring invoice`. |
| `/sales/delivery-notes` | Delivery note list. | Draft/issued/delivered/cancelled/voided status and fulfillment labels. | Delivery notes are not invoices or tax invoices. | None. | Record under `delivery note` or `unsupported claim`. |
| `/sales/delivery-notes/new` | Delivery note creation. | Source invoice/quote, delivery address, lines, dates, draft save. | Delivery note does not create AR, VAT, payment, email, ZATCA, or inventory movement. | None. | Record under `delivery note`. |
| `/sales/delivery-notes/[id]` | Delivery note detail. | Source links, status actions, PDF/archive actions, reference-only stock issue wording. | Fulfillment document only; no automatic stock movement. | Delivery note PDF if generated safely outside the repo. | Record under `delivery note` or `PDF/document`. |
| `/sales/collections` | Collections workspace. | Summary cards, open cases, due/overdue follow-ups, promised/disputed cases. | Planned email/reminder does not mean sent; promise to pay does not mean paid. | None. | Record under `collections`. |
| `/sales/collections/new` | Collection case creation. | Customer, invoice, priority, follow-up, promise-to-pay, notes. | Case does not allocate payment, create payment link, send email, file VAT, or call ZATCA. | None. | Record under `collections` or `unsupported claim`. |
| `/sales/collections/[id]` | Collection case detail. | Linked invoice/customer, outstanding balance, activity timeline, lifecycle state. | Follow-up records are non-posting and not legal automation. | None. | Record under `collections`. |
| `/reports/aged-receivables` | AR Aging. | Outstanding sales invoice basis, bucket labels, customer/invoice links. | Excludes quotes, recurring templates, delivery notes, and collections. | Report export if generated safely outside the repo. | Record under `AR Aging`. |
| `/reports/vat-summary` | VAT Summary. | Sales tax collected, purchase tax paid, net payable/refundable labels. | Operational summary only; no official filing. | Report export if generated safely outside the repo. | Record under `VAT/tax`. |
| `/reports/vat-return` | VAT Return. | Draft return wording, period, totals, no submission claim. | Not official filing; no tax authority submission. | Report export if generated safely outside the repo. | Record under `VAT/tax`. |
| `/tax` | Tax workspace. | Operational VAT dashboard wording and links. | Not production compliance, official filing, or ZATCA clearance/reporting. | None. | Record under `VAT/tax` or `ZATCA wording`. |
| `/documents` | Generated document archive. | Document type labels, filters, download wording. | Download/archive does not imply email, submission, VAT filing, ZATCA, payment, or inventory movement. | No committed PDFs. | Record under `PDF/document` or `unsupported claim`. |

## Review Discipline

- Use route patterns, not real IDs, in shared documentation.
- Keep binary screenshots and PDFs out of the repo unless a separate artifact policy approves them.
- Record unclear items as `QUESTION`, not approved findings.
- Keep app behavior unchanged during this walkthrough pack sprint.
