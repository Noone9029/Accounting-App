# Sales/AR Local Fixture Hardening Execute Retry Closure

Date: 2026-06-05

Sprint: Focused Local Sales/AR Fixture Hardening and Safe Execute Retry Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Summary

The local runtime safety gates passed, the Sales/AR walkthrough fixture was hardened, and the hardened dry-run was executed.

The fixture now selects organization-valid tax/account prerequisites and validates read-only execute prerequisites before mutation. The previous tax-rate selection failure is fixed.

The execute retry was not run because the hardened dry-run blocked on local database schema readiness before any mutation.

## Safety Gates Result

Passed:

- Docker engine was available.
- Local Postgres was listening on port `5432`.
- Local Redis was listening on port `6379`.
- Local API was listening on port `4000`.
- Local web was listening on port `3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login returned a local token, and `/auth/me` returned HTTP `200`; password, token, cookies, and auth headers were not printed.
- Inspected env targets classified as local-only without printing values.
- No Supabase, Vercel, production, staging, beta, user-testing, hosted, shared, or unknown remote target was used.

## Root Cause Of Tax-rate Failure

The previous fixture selected by any `15%` tax rate.

In the local organization, the tax-rate list includes active purchase-scoped 15% rates before the sales VAT rate:

- `Reverse Charge 15%`, scope `PURCHASES`
- `VAT on Purchases 15%`, scope `PURCHASES`
- `VAT on Sales 15%`, scope `SALES`

`POST /items` correctly validates item `salesTaxRateId` against active rates with `SALES` or `BOTH` scope. The previous fixture selected a purchase-scoped rate, so the product API rejected it. No product API validation bug was found.

## Fixture Hardening Implemented

Updated `apps/api/scripts/sales-ar-walkthrough-fixture.ts`:

- Dry-run and execute now use the same prerequisite selection path.
- Tax-rate selection requires active `SALES` or `BOTH` scope.
- Sales revenue account selection requires an active posting `REVENUE` account.
- Bank/cash account selection requires an active profile backed by a posting account.
- Existing marker metadata is detected through read-only API calls.
- Execute mode is blocked before mutation if prerequisite validation fails.
- Output remains metadata-only and suppresses tokens, cookies, auth headers, DB URLs, secrets, response bodies, PDF bodies, and base64.

## Pre-execute Validation Behavior

The fixture validates these before any execute mutation:

- local target guard passed
- active local organization resolved
- local user/login resolved
- active sales-valid tax rate selected
- active posting revenue account selected
- active bank/cash account selected
- required read-only API endpoints are reachable
- marker is present
- execute mode is explicitly requested

If validation fails, the fixture prints a safe blocker summary and exits without creating records.

## Partial Marker Data Handling

The prior failed execute may have created a partial marker-scoped synthetic contact.

The hardened fixture continues to search by marker/fake identifiers and is designed to reuse existing marker records where safe. It does not delete, reset, overwrite unrelated data, or clean up partial marker data.

## Endpoint 500 Diagnosis

The previous status-only endpoint 500s were not caused by the partial marker contact.

Safe local API log summaries show the current local database schema is behind the current Sales/AR code:

| Endpoint | Safe root cause summary |
| --- | --- |
| `/sales-invoices` | `SalesInvoice.taxMode` column does not exist in the current local database. |
| `/sales-quotes` | `SalesQuote` table does not exist in the current local database. |
| `/recurring-invoices` | `RecurringInvoiceTemplate` table does not exist in the current local database. |
| `/delivery-notes` | `DeliveryNote` table does not exist in the current local database. |
| `/collections` | `CollectionCase` table does not exist in the current local database. |

This is local schema readiness, not an accountant finding and not a proven product API bug.

## Dry-run Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: blocked before mutation.
- Local target guard: passed.
- Login performed: true, with token output suppressed.
- Selected sales tax rate: `VAT on Sales 15%`, rate `15`, scope `SALES`, active.
- Selected sales revenue account: code `411`, active posting `REVENUE`.
- Selected bank account: code `112`, active posting account.
- Existing marker metadata: contacts had marker occurrences; items/payments/credits/refunds had no marker occurrences.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.

Blocked reason:

- Required Sales/AR endpoints returned HTTP `500` because the local database schema is missing current Sales/AR tables/columns.

## Execute Retry Result

Not run.

Reason: hardened dry-run failed prerequisite validation. Per sprint rules, execute mode was not attempted.

## Created Counts

No additional sample data was created in this sprint.

The previous partial marker-scoped contact may still exist and is preserved by default.

## Route And Checkpoint Updates

Updated:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

Route and checkpoint status remains blocked pending a current local database schema and a successful fixture execute.

No browser route was reviewed. No checkpoint was accountant-approved.

## Findings Log Status

Updated `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`.

No accountant reviewed the walkthrough in this sprint. No accountant findings were recorded or approved. Fixture hardening and schema readiness are recorded as development execution status only.

## Product/API/Backend Changes

No product API/service behavior changed.

Only the local fixture script and documentation were changed. No schema, migrations, posting behavior, payment allocation, VAT math, ZATCA behavior, email behavior, inventory behavior, or production infrastructure changed.

## Validation Commands

Run:

- `git status --short --branch`
- `docker version --format '{{.Server.Version}}'`
- Local port checks for `5432`, `6379`, `4000`, and `3000`
- `GET http://localhost:4000/health`
- `GET http://localhost:4000/readiness`
- `GET http://localhost:3000/login`
- Token-suppressed local seed/demo login and `/auth/me`
- Read-only local tax/account metadata checks
- Status-only Sales/AR endpoint checks
- Safe local API log summary inspection
- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`

Pending:

- `git diff --check`

## Marketing Typecheck Blocker Status

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- Prior blocker: `HomePage` reported as `() => void` at lines `35` and `65`.

This sprint did not modify or delete marketing files.

## Remaining Blockers

- Local database schema is not current for the Sales/AR modules required by the walkthrough fixture.
- Execute retry remains blocked until a local-only schema readiness step is explicitly approved and completed.
- The route/checkpoint walkthrough remains pending completed local synthetic fixture data.

## Recommended Next Sprint

Run a local-only schema readiness sprint:

- Reconfirm local-only database target.
- Inspect pending migrations without applying them first.
- If explicitly approved, apply only local migrations needed for the current Sales/AR schema.
- Rerun API health/readiness and Sales/AR endpoint status checks.
- Rerun the hardened fixture dry-run.
- Run exactly one guarded execute attempt only if the hardened dry-run passes.

## Follow-up Status

Follow-up completed on 2026-06-05 in `SALES_AR_LOCAL_SCHEMA_READINESS_EXECUTE_RETRY_CLOSURE.md`:

- Local-only schema readiness was verified.
- Pending local migrations were applied.
- Prisma client was regenerated after stopping the local API file lock.
- Sales/AR endpoint status checks returned HTTP `200`.
- Hardened fixture dry-run passed.
- One guarded execute retry was attempted and failed safely at customer payment creation.

Current blocker after schema readiness:

- The fixture passes a bank account profile id to the customer payment API where an active posting asset chart-of-account id is required.
- Partial marker-scoped local synthetic data exists and is preserved by default.
- No accountant findings were recorded.
