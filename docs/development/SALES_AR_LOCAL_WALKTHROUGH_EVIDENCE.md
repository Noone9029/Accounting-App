# Sales/AR Local Walkthrough Evidence

Date: 2026-06-05

Marker planned: `SALES-AR-WALKTHROUGH-20260604`

## Current Execution Status

Controlled local runtime activation, local schema readiness, tax/account prerequisite hardening, payment-account hardening, credit-note application hardening, source-line hardening, and allocation/refund idempotency hardening are complete for the local fixture scope.

The latest guarded fixture dry-run passed and the single guarded execute attempt for the Local Sales/AR Fixture Idempotency Execute Completion and Route Metadata Walkthrough Sprint completed successfully.

The fixture created or reused marker-scoped local synthetic data through:

- Customer, service item, and product item.
- Three finalized sales invoice samples.
- One customer payment.
- One credit note and one credit-note allocation.
- One customer refund.
- Two sales quotes and one quote-converted draft invoice.
- One recurring invoice template and one generated recurring draft invoice.
- Two delivery notes, including one invoice-sourced delivery note and one quote-sourced delivery note.
- Two collection cases and four collection activities.

Metadata-only local route checks were run against `http://localhost:3000` and `http://localhost:4000`. No browser screenshots, PDF generation, full response body dumps, accountant review, or accountant approval were performed.

## Current Runtime Evidence

Metadata-only local checks confirmed:

- Docker Desktop engine is available.
- Local Postgres is listening on local port `5432`.
- Local Redis is listening on local port `6379`.
- Local API is listening on local port `4000`.
- Local web is listening on local port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- Web root returned an HTTP redirect to the app flow.
- `/login` returned HTTP `200`.
- Seed/demo login was verified against the local API only.
- Login token output, password output, cookies, auth headers, and DB URLs were suppressed.

## Latest Fixture Execute And Route Metadata Evidence

Sprint: Local Sales/AR Fixture Idempotency Execute Completion and Route Metadata Walkthrough Sprint

Dry-run command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Dry-run result:

- Status: planned.
- Created data: false.
- Local target guard: passed.
- Existing marker payment, credit note, credit-note allocation, refund, and quotes were planned for reuse.
- Source invoice detail line and source quote detail line were ready.
- Recurring template, delivery notes, and collection cases were planned for creation.

Execute command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Execute result:

- Status: executed.
- Created/reused summary: created `13`, reused `13`, skipped `0`.
- Fake document numbers recorded by execute: `INV-000345`, `INV-000346`, `INV-000347`, `INV-000348`, `INV-000349`, `PAY-000325`, `CN-000064`, `REF-000127`, `QUO-000001`, `QUO-000002`, `REC-000001`, `DN-000001`, `DN-000002`, `COL-000001`, and `COL-000002`.
- Non-effects confirmed by fixture output: no seed/reset/delete, cleanup/delete, email sending, payment gateway capture, payment link, VAT filing, ZATCA call, PDF generation, backup/restore, hosted workflow, beta workflow, customer-data workflow, or OS power command.

Metadata-only route checks after execute:

| Route | Web status | API status |
| --- | --- | --- |
| `/dashboard` | `200` | `200` |
| `/customers` | `200` | `200` |
| `/customers/[id]` | `200` | `200` |
| `/sales/invoices` | `200` | `200` |
| `/sales/invoices/[id]` | `200` | `200` |
| `/sales/quotes` | `200` | `200` |
| `/sales/quotes/[id]` | `200` | `200` |
| `/sales/recurring-invoices` | `200` | `200` |
| `/sales/recurring-invoices/[id]` | `200` | `200` |
| `/sales/delivery-notes` | `200` | `200` |
| `/sales/delivery-notes/[id]` | `200` | `200` |
| `/sales/collections` | `200` | `200` |
| `/sales/collections/[id]` | `200` | `200` |
| `/reports/aged-receivables` | `200` | `200` |
| `/reports/vat-summary` | `200` | `200` |
| `/reports/vat-return` | `200` | `200` |
| `/tax` | `200` | Not applicable |
| `/documents` | Not run | Not run; generated-document count was `0`. |

No full HTML, full JSON payloads, screenshots, PDF bodies, base64, tokens, cookies, auth headers, DB URLs, or secrets were recorded.

## Local Target Guard

The local target guard passed at the inspected configuration level.

Inspected target keys were classified as local-only without printing values:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_API_URL`

No Supabase, Vercel, production, staging, beta, user-testing, hosted Postgres, or unknown remote target was used.

## Fixture Dry-run Evidence

The guarded fixture planner was added at:

`apps/api/scripts/sales-ar-walkthrough-fixture.ts`

Dry-run command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Dry-run result:

- Status: planned.
- Local target guard: passed.
- Checked local targets: 8.
- Created data: false.
- Database connected: false.
- Database writes: false.
- Seed/reset/delete: false.
- Login performed by fixture: false.
- Email sent: false.
- Payment captured: false.
- ZATCA called: false.
- PDF generated: false.

The dry-run was rerun before execute mode on 2026-06-05 and passed with the same marker and local target guard.

Planned fake record counts:

| Area | Planned count |
| --- | ---: |
| Customers | 1 |
| Service items | 1 |
| Product items | 1 |
| Sales invoices | 4 |
| Customer payments | 1 |
| Credit notes | 1 |
| Refund scenarios | 1 |
| Sales quotes | 2 |
| Recurring invoice templates | 1 |
| Generated draft invoices | 1 |
| Delivery notes | 2 |
| Collection cases | 2 |
| Collection activities | 3 |
| Report checkpoints | 3 |
| Dashboard checkpoints | 6 |

## Fixture Execute Attempt Evidence

Execute command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Execute result:

- Status: failed safely before the full fixture completed.
- Failure point: `POST /items`.
- Safe error summary: the API rejected the selected sales tax rate as inactive or invalid for the active organization.
- Manual database mutation after failure: not performed.
- Cleanup/delete after failure: not performed.
- Seed/reset/delete: not performed.
- Email sending: not performed.
- Payment gateway capture or payment link creation: not performed.
- VAT filing: not performed.
- ZATCA calls: not performed.
- PDF generation: not performed.
- Backup/restore: not performed.
- Hosted, beta, production, or customer-data workflow: not used.

Partial side-effect review:

| Area | Read-only metadata result |
| --- | --- |
| Contacts | Local API marker scan showed marker occurrences, so a partial marker-scoped synthetic contact may have been created before the item validation failure. |
| Items | Local API marker scan showed no marker occurrences on the reachable item list endpoint. |
| Customer payments | Local API marker scan showed no marker occurrences. |
| Credit notes | Local API marker scan showed no marker occurrences. |
| Customer refunds | Local API marker scan showed no marker occurrences. |
| Sales invoices, quotes, recurring templates, delivery notes, collections | Module list endpoints returned server errors in this runtime during status-only checks, so no route walkthrough or marker count was established after the failed execute. |

## Fixture Hardening Retry Evidence

Sprint: Focused Local Sales/AR Fixture Hardening and Safe Execute Retry Sprint

Safety gates rerun on 2026-06-05:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API without recording password, token, cookies, or auth headers.
- Inspected target env keys classified as local-only without printing values.

Fixture hardening:

- Tax-rate selection now requires an active tax rate with `SALES` or `BOTH` scope.
- Revenue-account selection now requires an active posting `REVENUE` account.
- Bank/cash account selection now requires an active profile backed by a posting account.
- Dry-run and execute now use the same read-only prerequisite validation.
- Execute mode now blocks before mutation if required endpoints or prerequisites are not ready.

Root cause of the previous item failure:

- The fixture selected by any `15%` tax rate.
- The local tax-rate list includes active `PURCHASES`-scoped 15% rates before the active sales VAT rate.
- `POST /items` correctly rejected the selected purchase-scoped tax rate because item sales tax requires `SALES` or `BOTH` scope.

Hardened dry-run result:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`
- Status: blocked before mutation.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.
- Selected prerequisite tax rate: `VAT on Sales 15%`, rate `15`, scope `SALES`, active.
- Selected prerequisite revenue account: code `411`, active posting revenue.
- Selected prerequisite bank account: code `112`, active posting account.

Blocked endpoints:

| Endpoint | Status | Safe root cause summary |
| --- | --- | --- |
| `/sales-invoices` | HTTP `500` | Local database is missing the `SalesInvoice.taxMode` column expected by current code. |
| `/sales-quotes` | HTTP `500` | Local database is missing the `SalesQuote` table expected by current code. |
| `/recurring-invoices` | HTTP `500` | Local database is missing the `RecurringInvoiceTemplate` table expected by current code. |
| `/delivery-notes` | HTTP `500` | Local database is missing the `DeliveryNote` table expected by current code. |
| `/collections` | HTTP `500` | Local database is missing the `CollectionCase` table expected by current code. |

Execute retry:

- Not run.
- Reason: hardened dry-run failed prerequisite validation, so execute was blocked before mutation.
- No local migration, seed, reset, delete, manual DB mutation, or cleanup was run.

## Local Schema Readiness And Execute Retry Evidence

Sprint: Local-Only Schema Readiness and Sales/AR Fixture Execute Retry Sprint

Safety gates rerun on 2026-06-05:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API without recording password, token, cookies, or auth headers.
- Inspected target env keys classified as local-only without printing values.

Schema readiness:

- `corepack pnpm exec prisma migrate status` in `apps/api` showed seven pending local migrations.
- Pending SQL was reviewed for destructive statements; no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, data `DELETE`, reset requirement, seed requirement, or cleanup requirement was identified.
- `corepack pnpm db:migrate` applied the pending local migrations.
- `corepack pnpm db:generate` initially failed because the running local API held the Prisma query engine DLL.
- The local API listener on port `4000` was stopped, `corepack pnpm db:generate` then succeeded, and the local API was restarted.
- Migration status then reported the database schema is up to date.

Endpoint readiness after migration:

| Endpoint | Status |
| --- | --- |
| `/sales-invoices` | HTTP `200` |
| `/sales-quotes` | HTTP `200` |
| `/recurring-invoices` | HTTP `200` |
| `/delivery-notes` | HTTP `200` |
| `/collections` | HTTP `200` |
| `/collections/summary` | HTTP `200` |
| `/dashboard/summary` | HTTP `200` |
| `/contacts` | HTTP `200` |
| `/items` | HTTP `200` |
| `/tax-rates` | HTTP `200` |
| `/accounts` | HTTP `200` |

Hardened dry-run after schema readiness:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`
- Status: passed.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.
- Selected prerequisite tax rate: `VAT on Sales 15%`, rate `15`, scope `SALES`, active.
- Selected prerequisite revenue account: code `411`, active posting revenue.
- Selected prerequisite bank account profile: code `112`, active and backed by a posting account.

Guarded execute retry:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604`
- Status: failed safely.
- Failure point: `POST /customer-payments`.
- Safe error summary: `Paid-through account must be an active posting asset account in this organization.`
- No retry loop was run.
- No manual database mutation was attempted after the failure.
- No cleanup/delete was run.
- No seed/reset/delete was run.
- No email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflow was run.

Technical execution defect candidate:

- The fixture's payment step passes the selected bank account profile id as `accountId`.
- The customer payment API expects a chart-of-account id for an active posting asset account.
- The API rejection appears correct. This is a fixture mapping blocker, not an accountant finding and not a proven product API bug.

Metadata-only marker scan after the failed execute:

| Area | HTTP status | Marker-scoped local synthetic records |
| --- | --- | ---: |
| Contacts | `200` | 1 |
| Items | `200` | 2 |
| Sales invoices | `200` | 3 |
| Sales quotes | `200` | 0 |
| Recurring invoice templates | `200` | 0 |
| Delivery notes | `200` | 0 |
| Collection cases | `200` | 0 |
| Customer payments | `200` | 0 |
| Credit notes | `200` | 0 |
| Customer refunds | `200` | 0 |
| Generated documents | `200` | 0 |

## Payment Account Hardening Execute Retry Evidence

Sprint: Focused Local Sales/AR Fixture Payment-Account Hardening and Execute Retry Sprint

Safety gates rerun on 2026-06-05:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API without recording password, token, cookies, or auth headers.
- Inspected target env keys classified as local-only without printing values.

Customer payment paid-through account diagnosis:

- `POST /customer-payments` expects `accountId` to reference a chart-of-account record.
- The customer payment service validates that account as active, posting-enabled, type `ASSET`, and scoped to the organization.
- Customer refunds use the same chart-account requirement for the paid-from account.
- The prior fixture passed a bank account profile id, which correctly failed product validation.

Fixture hardening:

- The fixture now stores the selected bank/cash profile as metadata.
- The fixture now resolves the linked active posting ASSET chart account separately as the payment posting account.
- Dry-run and execute both use the same payment-account selection and validation.
- Customer payment and customer refund payloads now pass the posting asset chart account id, not the bank account profile id.

Status-only endpoint checks before dry-run:

| Endpoint | Status |
| --- | --- |
| `/sales-invoices` | HTTP `200` |
| `/sales-quotes` | HTTP `200` |
| `/recurring-invoices` | HTTP `200` |
| `/delivery-notes` | HTTP `200` |
| `/collections` | HTTP `200` |
| `/collections/summary` | HTTP `200` |
| `/dashboard/summary` | HTTP `200` |
| `/contacts` | HTTP `200` |
| `/items` | HTTP `200` |
| `/tax-rates` | HTTP `200` |
| `/accounts` | HTTP `200` |
| `/customer-payments` | HTTP `200` |

Dry-run after payment-account hardening:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`
- Status: passed.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.
- Selected prerequisite tax rate: `VAT on Sales 15%`, rate `15`, scope `SALES`, active.
- Selected prerequisite revenue account: code `411`, active posting revenue.
- Selected bank account profile: type `BANK`, status `ACTIVE`, linked account code `112`.
- Selected paid-through posting asset chart account: code `112`, type `ASSET`, active, posting-enabled.

Guarded execute retry:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604`
- Status: failed safely.
- Failure point: `POST /credit-notes/[id]/apply`.
- Safe error summary: `property note should not exist`.
- The prior customer payment paid-through account blocker was passed.
- No retry loop was run.
- No manual database mutation was attempted after the failure.
- No cleanup/delete was run.
- No seed/reset/delete was run.
- No email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflow was run.

Technical execution defect candidate:

- The fixture credit-note application step sends a `note` field.
- The credit-note apply endpoint rejects that request shape.
- This is a fixture request-shape blocker, not an accountant finding and not a proven product API bug.

Metadata-only marker scan after the failed payment-account execute retry:

| Area | HTTP status | Marker-scoped local synthetic records |
| --- | --- | ---: |
| Contacts | `200` | 1 |
| Items | `200` | 2 |
| Sales invoices | `200` | 3 |
| Sales quotes | `200` | 0 |
| Recurring invoice templates | `200` | 0 |
| Delivery notes | `200` | 0 |
| Collection cases | `200` | 0 |
| Customer payments | `200` | 1 |
| Credit notes | `200` | 1 |
| Customer refunds | `200` | 0 |
| Generated documents | `200` | 0 |

## Credit-note Application Hardening Execute Retry Evidence

Sprint: Focused Local Sales/AR Fixture Credit-Note Application Hardening and Execute Retry Sprint

Safety gates rerun on 2026-06-05 after Docker/local runtime was restored:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API without recording password, token, cookies, or auth headers.
- Inspected target env keys classified as local-only without printing values.
- Marker remained `SALES-AR-WALKTHROUGH-20260604`.

Credit-note apply diagnosis:

- `POST /credit-notes/[id]/apply` accepts only `invoiceId` and `amountApplied`.
- The prior fixture payload included unsupported `note`.
- The API rejection was correct product validation; product validation was not weakened.

Fixture hardening:

- The fixture now builds a DTO-shaped credit-note apply payload.
- The fixture validates unsupported keys before apply.
- The fixture validates credit note, invoice, organization, customer, status, positive amount, unapplied amount, and invoice balance before apply.
- Dry-run and execute use the same apply payload shape.

Status-only endpoint checks before dry-run returned HTTP `200` for Sales/AR, contacts, items, tax-rates, accounts, customer-payments, and credit-notes endpoints.

Dry-run:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`
- Status: passed.
- Created data: false.
- Database writes: false.
- Seed/reset/delete, email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.
- Credit-note apply payload shape: `invoiceId,amountApplied`.
- Unsupported credit-note apply keys: none.

Guarded execute retry:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604`
- Status: failed safely after exactly one retry.
- The previous `property note should not exist` error did not recur.
- Read-only marker scan found one credit-note allocation, one customer refund, and two sales quotes, so execution progressed beyond credit-note application.
- Later failure point: fixture-side source-line lookup while preparing delivery note source linkage.
- Safe error summary: `Expected source document to include at least one line.`
- Root cause candidate: `firstLineId` expects a source invoice/quote line id, but the reused/list source record did not include line details.
- No retry loop, manual mutation after failure, cleanup/delete, seed/reset/delete, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, browser walkthrough, or accountant review was run after the failure.

## Source-line Hardening Execute Retry Evidence

Sprint: Focused Local Sales/AR Fixture Source-Line Hardening and Execute Retry Sprint

Safety gates rerun on 2026-06-05:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API without recording password, token, cookies, or auth headers.
- Inspected target env keys classified as local-only without printing values.
- Marker remained `SALES-AR-WALKTHROUGH-20260604`.

Source-line diagnosis:

- Sales invoice and sales quote detail endpoints include ordered `lines`.
- Sales invoice and sales quote list responses are safe for list display but are not guaranteed to include detail lines.
- Delivery note DTO/service validation expects supported line references such as `sourceSalesInvoiceLineId` and `sourceSalesQuoteLineId`, and validates that those source lines belong to the related document and customer.
- The prior fixture passed reused/list invoice or quote records into `firstLineId`, so line detail was unavailable.

Fixture hardening:

- The fixture now fetches source sales invoice detail before building the invoice-sourced delivery note.
- The fixture now fetches source accepted sales quote detail before building the quote-sourced delivery note.
- The fixture validates source document organization, customer, status, and line presence before delivery-note mutation.
- The fixture validates delivery-note header and line payload keys against the DTO-supported shape before creation.
- Dry-run now reports source invoice and source quote detail-line readiness without printing full response bodies.

Source-line hardened dry-run:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`
- Status: passed.
- Source invoice detail line: ready, finalized source invoice, line count `1`.
- Source quote detail line: ready, accepted source quote, line count `1`.
- Delivery note payload unsupported keys: none.
- Created data: false.
- Database writes: false.
- Seed/reset/delete, cleanup/delete, email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.

Guarded execute retry:

- Command: `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604`
- Status: failed safely after exactly one retry.
- The execute retry did not reach delivery-note source-line creation.
- Safe failure summary: existing partial credit-note allocation/refund state left the marker credit note with insufficient unapplied amount for a second application attempt.
- No second execute retry was run.
- No manual database mutation after failure, cleanup/delete, seed/reset/delete, browser walkthrough, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or accountant review was run.

Follow-up fixture hardening after the execute failure:

- The fixture credit-note allocation reuse check now compares decimal-equivalent amounts instead of exact formatted strings.
- Existing non-reversed allocations for the same invoice can be reused when their total already covers the planned apply amount.
- This was validated by a dry-run-only command after the failed execute.
- Execute mode was not rerun after this follow-up hardening.

Metadata-only marker scan after the failed source-line execute retry:

| Area | Marker-scoped local synthetic records |
| --- | ---: |
| Contacts | 1 |
| Items | 2 |
| Sales invoices | 3 |
| Customer payments | 1 |
| Credit notes | 1 |
| Credit-note allocations | 1 |
| Customer refunds | 1 |
| Sales quotes | 2 |
| Recurring invoice templates | 0 |
| Delivery notes | 0 |
| Collection cases | 0 |
| Generated documents | 0 |

## Data Created

The local fixture data set was completed under marker `SALES-AR-WALKTHROUGH-20260604`.

The data is synthetic, marker-scoped, local-only, and preserved by default. No cleanup/delete, seed/reset/delete, manual database mutation, hosted/beta/customer-data workflow, email sending, payment gateway capture, payment link creation, VAT filing, ZATCA call, PDF generation, backup, restore, or OS power command was run.

The fixture reused existing partial marker records where safe, including the marker customer, items, invoices, customer payment, credit note, credit-note allocation, refund, and quotes. It then created the remaining recurring template, generated recurring draft invoice, delivery notes, collection cases, and collection activities.

## Counts Created

| Area | Count |
| --- | ---: |
| Customers | 1 |
| Items | 2 |
| Sales invoices | 5 |
| Finalized invoices | 3 |
| Generated draft invoices | 2 |
| Customer payments | 1 |
| Credit notes | 1 |
| Credit-note allocations | 1 |
| Refunds | 1 |
| Sales quotes | 2 |
| Quote conversions | 1 |
| Recurring invoice templates | 1 |
| Generated recurring draft invoices | 1 |
| Delivery notes | 2 |
| Delivery notes sourced from invoice | 1 |
| Delivery notes sourced from quote | 1 |
| Collection cases | 2 |
| Collection activities | 4 |
| Generated PDFs/documents | 0 |

## Route Checklist

Routes were metadata-checked locally by Codex after fixture execute completed.

The route pass was metadata-only. It recorded local HTTP status and API detail/list status where applicable. It did not perform accountant review, broad E2E, screenshot capture, full HTML/body dumps, or PDF generation.

See `SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`.

## Expected Results Checklist

Expected-result checkpoints were updated for metadata that was actually verified.

Technical fixture and route reachability checks are marked as local metadata pass where applicable. UI wording, layout, PDF output, accountant judgment, and VAT/tax policy checks remain pending accountant, tax, or product review as appropriate.

See `SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`.

## PDF Metadata

No PDF generation was performed. No PDF body, base64, hash, or customer-sensitive payload was produced.

## Findings

No accountant findings were recorded.

Codex recorded five technical execution defect candidates:

- The fixture selected a sales tax rate that the API rejected as inactive or invalid for the active organization when creating an item. This fixture tax-rate selection defect was fixed in the local fixture script.
- The fixture payment step passed a bank account profile id where the customer payment API expects a chart-of-account id for an active posting asset account. This fixture payment-account mapping defect was fixed in the local fixture script.
- The fixture credit-note application step sent an unsupported `note` field to the credit-note apply endpoint. This fixture request-shape defect was fixed in the local fixture script.
- The fixture delivery-note source linkage step expected a source invoice/quote line id from a reused/list record that did not include line details. This fixture source-line detail defect was fixed in the local fixture script and dry-run now resolves detail lines.
- The fixture credit-note allocation reuse check compared exact formatted decimal strings and did not reuse the prior valid marker allocation under partial marker state. This fixture idempotency defect was fixed after the single execute retry failed; execute was not rerun in this sprint.

The fixture tax-rate selection defect, payment-account mapping defect, credit-note apply request-shape defect, source-line detail defect, and credit-note allocation idempotency defect were fixed in the local fixture script. The local database schema blocker was resolved by local-only migrations. The latest guarded execute completed successfully and no new technical execution defect candidate was found in this sprint.

## Privacy

This evidence file contains no real customer data, no vendor data, no real email addresses, no tax IDs, no bank account details, no PDF bodies, no base64, no auth headers, no cookies, no tokens, no DB URLs, no secrets, no signed XML, no QR payloads, and no provider credentials.

## Prior Blocked Status

The prior controlled local walkthrough preflight on 2026-06-04 stopped before mutation because Docker and local runtime services were unavailable. That blocker is now resolved for local service availability only. It does not authorize fixture execute mode, sample-data creation, browser walkthrough execution, accountant approval, hosted proof, production proof, email, payment, VAT filing, ZATCA, backup, restore, seed, reset, or delete behavior.
