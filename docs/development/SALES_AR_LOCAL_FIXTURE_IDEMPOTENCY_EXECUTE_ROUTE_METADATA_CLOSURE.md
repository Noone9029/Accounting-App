# Sales/AR Local Fixture Idempotency Execute Route Metadata Closure

Date: 2026-06-05

Sprint: Local Sales/AR Fixture Idempotency Execute Completion and Route Metadata Walkthrough Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Safety Gates Result

Local-only gates passed before execute mode:

- Docker engine available.
- Local Postgres listening on port `5432`.
- Local Redis listening on port `6379`.
- Local API listening on port `4000`.
- Local web listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Local login and `/auth/me` succeeded without recording passwords, tokens, cookies, auth headers, DB URLs, or secrets.
- Inspected env targets classified as local-only without printing values.
- No Supabase, Vercel, production, staging, beta, hosted, shared, or customer-data target was used.

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Idempotency Verification And Hardening

Updated `apps/api/scripts/sales-ar-walkthrough-fixture.ts`:

- Added dry-run idempotency reuse-plan output for marker customer, items, invoices, customer payment, credit note, credit-note allocation, refund, quotes, recurring template, delivery notes, and collection cases.
- Added a read-only credit-note allocation preflight check.
- Confirmed existing non-reversed credit-note allocations can be reused when they cover the planned apply amount using decimal-equivalent comparison.
- Corrected dry-run expected-count labels to match the current execute plan.

Product API behavior was not changed.

## Endpoint Status Checks

Status-only local checks returned HTTP `200`:

| Endpoint | Status |
| --- | --- |
| `/sales-invoices` | `200` |
| `/sales-quotes` | `200` |
| `/recurring-invoices` | `200` |
| `/delivery-notes` | `200` |
| `/collections` | `200` |
| `/collections/summary` | `200` |
| `/dashboard/summary` | `200` |
| `/contacts` | `200` |
| `/items` | `200` |
| `/tax-rates` | `200` |
| `/accounts` | `200` |
| `/customer-payments` | `200` |
| `/credit-notes` | `200` |
| `/customer-refunds` | `200` |

No full JSON bodies, customer-sensitive data, tokens, cookies, auth headers, DB URLs, or secrets were printed.

## Dry-run Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: planned.
- Local target guard: passed.
- Created data: false.
- Database writes: false.
- Existing payment, credit note, credit-note allocation, refund, and quotes were planned for reuse.
- Source invoice detail line: ready.
- Source quote detail line: ready.
- Delivery-note payload shape: validated.
- Recurring template, delivery notes, and collection cases were planned for execute creation.
- No seed/reset/delete, cleanup/delete, PDF generation, email, payment gateway, payment link, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or OS power command was run.

## Execute Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: executed.
- Created/reused summary: created `13`, reused `13`, skipped `0`.
- The execute attempt completed on the single guarded attempt.
- No retry loop was run.
- No manual database mutation outside the fixture was run.
- No cleanup/delete, seed/reset/delete, PDF generation, email, payment gateway, payment link, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, broad E2E, screenshot capture, or OS power command was run.

## Created And Current Counts

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
| Generated documents | 0 |

Fake document numbers recorded by execute:

- Sales invoices: `INV-000345`, `INV-000346`, `INV-000347`, `INV-000348`, `INV-000349`.
- Customer payment: `PAY-000325`.
- Credit note: `CN-000064`.
- Refund: `REF-000127`.
- Sales quotes: `QUO-000001`, `QUO-000002`.
- Recurring template: `REC-000001`.
- Delivery notes: `DN-000001`, `DN-000002`.
- Collection cases: `COL-000001`, `COL-000002`.

## Route Metadata Walkthrough Result

Metadata-only checks were run against `http://localhost:3000` and `http://localhost:4000`.

| Route | Web status | API status |
| --- | --- | --- |
| `/dashboard` | `200` | `200` |
| `/customers` | `200` | `200` |
| `/customers/[id]` | `200` | `200` |
| `/sales/invoices` | `200` | `200` |
| `/sales/invoices/new` | `200` | Not applicable |
| `/sales/invoices/[id]` | `200` | `200` |
| `/sales/quotes` | `200` | `200` |
| `/sales/quotes/new` | `200` | Not applicable |
| `/sales/quotes/[id]` | `200` | `200` |
| `/sales/recurring-invoices` | `200` | `200` |
| `/sales/recurring-invoices/new` | `200` | Not applicable |
| `/sales/recurring-invoices/[id]` | `200` | `200` |
| `/sales/delivery-notes` | `200` | `200` |
| `/sales/delivery-notes/new` | `200` | Not applicable |
| `/sales/delivery-notes/[id]` | `200` | `200` |
| `/sales/collections` | `200` | `200` |
| `/sales/collections/new` | `200` | Not applicable |
| `/sales/collections/[id]` | `200` | `200` |
| `/reports/aged-receivables` | `200` | `200` |
| `/reports/vat-summary` | `200` | `200` |
| `/reports/vat-return` | `200` | `200` |
| `/tax` | `200` | Not applicable |
| `/documents` | Not run | Not run |

`/documents` was skipped because generated-document count was `0`.

## Expected Checkpoint Status Updates

Updated `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`.

- Technical metadata checkpoints that were actually verified were marked `pass`.
- UI wording/layout, accountant interpretation, tax title policy, VAT filing wording, PDF output, and production/customer-data proof remain pending.
- No accountant approval was claimed.

## Findings Log Status

Updated `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`.

- No accountant findings were recorded.
- No findings were approved.
- Fixture idempotency and route metadata evidence was recorded only as development evidence.

## Product/API/Backend Changes

No product API, service, schema, migration, frontend app behavior, posting behavior, VAT behavior, ZATCA behavior, payment behavior, email behavior, inventory behavior, or dashboard behavior was changed.

The only code change was local fixture-script hardening in `apps/api/scripts/sales-ar-walkthrough-fixture.ts`.

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
- Metadata-only route checks.
- `/sales/*/new` web route status checks.

## Marketing Blocker Status

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- Known failure: `HomePage` reports as `() => void` at lines 35 and 65.

Marketing files were not modified, deleted, staged, or mixed into this sprint.

## Remaining Blockers

- No accountant review has been performed.
- No PDF metadata checks were run.
- `/documents` was not run because generated-document count was `0`.
- No full UI acceptance, screenshots, broad E2E, hosted/customer-data proof, production proof, official VAT filing proof, production ZATCA proof, real email proof, or payment gateway proof exists.
- Product/accountant/tax review is still needed for labels, wording, calculations, report interpretation, Tax Invoice title policy, VAT wording, dashboard definitions, and empty/read-only states.

## Recommended Next Sprint

Recommended next sprint:

`Local Sales/AR Accountant Browser Walkthrough And PDF Metadata Review Sprint`

Scope:

- Use the completed marker-scoped synthetic data set.
- Run a controlled local browser walkthrough route by route.
- Perform optional local fake-record PDF metadata checks only if approved.
- Keep no production/beta/hosted/customer-data workflow, no seed/reset/delete, no cleanup/delete, no email/payment gateway/ZATCA/VAT filing, no full body dumps, and no accountant-approval claims unless a real accountant provides review findings.
