# Sales/AR Local Fixture Source-Line Hardening Closure

Date: 2026-06-05

Sprint: Focused Local Sales/AR Fixture Source-Line Hardening and Execute Retry Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Safety Gates Result

Local-only safety gates passed before fixture changes and before execute retry:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API only.
- Passwords, tokens, cookies, auth headers, DB URLs, and secret values were not recorded.
- Inspected env targets classified as local-only without printing values.
- No Supabase, Vercel, production, staging, beta, hosted, shared, or customer-data target was used.

## Source-line Lookup Diagnosis

The previous execute retry failed at fixture-side source-line lookup before delivery-note creation.

Root cause:

- Sales invoice and sales quote detail endpoints include ordered `lines`.
- Sales invoice and sales quote list/reused records are not guaranteed to include line details.
- The fixture called `firstLineId` on reused/list source invoice or quote records.
- Delivery note DTO/service validation expects supported line fields such as `sourceSalesInvoiceLineId` and `sourceSalesQuoteLineId`.
- Product API behavior was not changed.

## Fixture Hardening Implemented

Updated `apps/api/scripts/sales-ar-walkthrough-fixture.ts`:

- Added source invoice detail resolution before invoice-sourced delivery-note creation.
- Added source accepted quote detail resolution before quote-sourced delivery-note creation.
- Added source document validation for organization, customer, status, and line presence.
- Added delivery-note payload key validation for supported DTO header and line fields.
- Replaced list-record `firstLineId` use with detail-record line extraction.
- Added dry-run source-line readiness output.
- Added follow-up idempotency hardening after the execute retry exposed existing partial credit-note allocation state.

## Source Detail And Line Validation Behavior

The hardened fixture now requires:

- Source invoice detail loaded from `GET /sales-invoices/[id]`.
- Source quote detail loaded from `GET /sales-quotes/[id]`.
- Source invoice not voided.
- Source quote status `ACCEPTED`.
- Source document customer matches the marker customer where available.
- Source detail includes at least one line.
- Delivery note line uses only one supported source reference field.
- Delivery note payload excludes unsupported keys.

## Partial Marker Data Handling

Existing marker-scoped local synthetic data was preserved.

The fixture continues to reuse marker customer, item, invoice, payment, credit note, refund, and quote records where safe. No cleanup/delete, reset, seed, or manual database mutation was run.

The single execute retry exposed one more partial-data idempotency gap:

- A prior valid credit-note allocation already existed.
- The credit note no longer had enough unapplied amount for a second application.
- The fixture had compared exact formatted decimal strings and did not reuse the existing allocation.
- The fixture now compares decimal-equivalent amounts and can reuse existing non-reversed allocations that already cover the planned apply amount.
- Execute was not rerun after this follow-up hardening because the sprint allowed exactly one execute retry.

## Endpoint Status Checks

Status-only local checks returned HTTP `200`:

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
| `/credit-notes` | HTTP `200` |
| `/customer-refunds` | HTTP `200` |

## Dry-run Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: passed.
- Local target guard: passed.
- Source invoice detail line: ready; finalized source invoice; line count `1`.
- Source quote detail line: ready; accepted source quote; line count `1`.
- Delivery-note payload unsupported keys: none.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.

A second dry-run-only command was run after the single execute retry to validate the follow-up idempotency hardening. It also passed without mutation.

## Execute Retry Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: failed safely after exactly one execute retry.
- Delivery-note source-line creation was not reached.
- Safe failure summary: existing partial credit-note allocation/refund state left the marker credit note with insufficient unapplied amount for a second application attempt.
- No retry loop was run.
- No second execute was run after follow-up hardening.
- No cleanup/delete, seed/reset/delete, manual database mutation after failure, browser walkthrough, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or accountant review was run.

## Created Counts

Metadata-only marker scan after the failed execute retry:

| Area | Count |
| --- | ---: |
| Customers | 1 |
| Items | 2 |
| Sales invoices | 3 |
| Customer payments | 1 |
| Credit notes | 1 |
| Credit-note allocations | 1 |
| Customer refunds | 1 |
| Sales quotes | 2 |
| Recurring invoice templates | 0 |
| Generated draft invoices | 0 |
| Delivery notes | 0 |
| Collection cases | 0 |
| Generated documents | 0 |

## Delivery-note Source Linkage Evidence

Dry-run evidence only:

- Source invoice detail line resolved from the invoice detail endpoint.
- Source quote detail line resolved from the quote detail endpoint.
- Delivery-note payload shape validated before mutation.

Execute evidence:

- Not established.
- Execute stopped before delivery-note creation.

## Route And Checkpoint Updates

Updated:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`
- `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`

Routes and expected checkpoints remain blocked/not run because the full fixture data set is incomplete and no browser walkthrough or accountant review was performed.

## Findings Log Status

No accountant findings were recorded.

No findings were approved.

The source-line failure and the follow-up credit-note allocation idempotency failure were recorded only as development fixture issues.

## Product/API/Backend Changes

No product API behavior was changed.

No schema or migration changes were made.

The only code change was fixture-script hardening in `apps/api/scripts/sales-ar-walkthrough-fixture.ts`.

## Validation Commands

Commands run:

```powershell
git status --short --branch
```

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Additional validation:

- Docker availability check.
- Local port checks for `5432`, `6379`, `4000`, and `3000`.
- Local health/readiness/login checks.
- Local login and `/auth/me` check with credential/token output suppressed.
- Status-only endpoint checks.
- Metadata-only marker scan.
- Dry-run-only syntax/preflight check after follow-up idempotency hardening.

## Marketing Blocker Status

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- Known failure: `HomePage` reports as `() => void` at lines 35 and 65.

Marketing files were not modified, deleted, staged, or mixed into this sprint.

## Remaining Blockers

- Full fixture execute has not completed after the source-line hardening.
- Delivery-note execute evidence is not established.
- Recurring templates, generated draft invoices, delivery notes, collection cases, generated documents, browser walkthrough, PDF metadata checks, route review, expected-results review, and accountant review remain pending.
- A new guarded execute sprint is required to verify that the credit-note allocation idempotency hardening lets the fixture continue to delivery notes and later modules.

## Recommended Next Sprint

Follow-up status:

- `Local Sales/AR Fixture Idempotency Execute Completion and Route Metadata Walkthrough Sprint` was run on 2026-06-05.
- The fixture reused existing marker payment, credit note, credit-note allocation, refund, and quote records.
- The guarded execute completed and metadata-only route checks were recorded.
- See `docs/development/SALES_AR_LOCAL_FIXTURE_IDEMPOTENCY_EXECUTE_ROUTE_METADATA_CLOSURE.md`.

Recommended next sprint:

`Local Sales/AR Accountant Browser Walkthrough And PDF Metadata Review Sprint`
