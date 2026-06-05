# Sales/AR Local Schema Readiness Execute Retry Closure

Date: 2026-06-05

Sprint: Local-Only Schema Readiness and Sales/AR Fixture Execute Retry Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Summary

The local runtime safety gates passed, the local database schema was brought current for the current Sales/AR modules, Prisma client generation succeeded after a local API refresh, and the hardened Sales/AR walkthrough fixture dry-run passed.

One guarded fixture execute retry was attempted after those gates passed. The execute retry failed safely at customer payment creation. No retry loop or manual database mutation was run after that failure.

## Safety Gates Result

Passed before schema migration and fixture execution:

- Docker engine was available.
- Local Postgres was listening on port `5432`.
- Local Redis was listening on port `6379`.
- Local API was reachable on `http://localhost:4000`.
- Local web was reachable on `http://localhost:3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API.
- Passwords, tokens, cookies, auth headers, DB URLs, and secrets were not printed.
- Inspected env target keys classified as local-only.
- No Supabase, Vercel, production, staging, beta, user-testing, hosted, shared, or unknown remote target was used.

## Schema Readiness Inspection

Created:

- `docs/development/SALES_AR_LOCAL_SCHEMA_READINESS_PREFLIGHT.md`

Read-only migration status before migration:

- Prisma detected `63` migrations.
- Seven migrations were pending.
- The target was local Postgres on `localhost:5432`.

Pending migrations:

- `20260521193000_add_supplier_statement_document_type`
- `20260603090000_accountant_workflow_sprint`
- `20260603110000_sales_quotes_proformas_sprint`
- `20260604100000_quote_pdf_archive_sprint`
- `20260604140000_recurring_invoices_sprint`
- `20260604170000_delivery_notes_sprint`
- `20260604190000_collections_workflow_sprint`

Reviewed pending SQL for destructive statements:

- No `DROP TABLE`.
- No `DROP COLUMN`.
- No `TRUNCATE`.
- No data `DELETE`.
- No reset requirement.
- No seed requirement.
- No cleanup/delete requirement.

Observed `ON DELETE` strings were foreign-key referential actions, not cleanup commands.

## Migrations Applied

Command:

```powershell
corepack pnpm db:migrate
```

Result:

- Applied the seven pending migrations to the proven local database.
- No seed/reset/delete was run.
- No hosted/beta/production migration was run.
- No product behavior was changed.

Post-migration status:

- `corepack pnpm exec prisma migrate status` in `apps/api` reported the database schema is up to date.

## Prisma Generate Result

Command:

```powershell
corepack pnpm db:generate
```

Initial result:

- Failed with a Windows `EPERM` rename error because the running local API held the Prisma query engine DLL.

Refresh performed:

- Identified the local API listener on port `4000`.
- Stopped only that local API Node process.
- Reran `corepack pnpm db:generate`.

Final result:

- Prisma Client generation succeeded.

## API And Web Refresh Result

The local API was restarted with the documented local dev script after Prisma generation.

Post-refresh checks:

| Check | Result |
| --- | --- |
| API port `4000` | Listening |
| Web port `3000` | Listening |
| `GET /health` | HTTP `200` |
| `GET /readiness` | HTTP `200` |
| `/login` | HTTP `200` |
| Local seed/demo login | Passed |
| `/auth/me` | HTTP `200` |

No credentials, tokens, cookies, auth headers, DB URLs, secrets, or response bodies containing customer data were recorded.

## Sales/AR Endpoint Status Checks

Status-only checks after migration and API refresh:

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

No full JSON bodies were printed or recorded.

## Dry-run Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: passed.
- Local target guard: passed.
- Active organization resolved.
- Selected sales tax rate: `VAT on Sales 15%`, rate `15`, scope `SALES`, active.
- Selected sales revenue account: code `411`, active posting `REVENUE`.
- Selected bank account profile: code `112`, active and backed by a posting account.
- Required endpoint readiness checks passed.
- Existing marker metadata was detected through read-only API calls.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.

## Execute Retry Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: failed safely.
- Failure point: `POST /customer-payments`.
- Safe error summary: `Paid-through account must be an active posting asset account in this organization.`
- Retry count after this failure: `0`.
- Manual database mutation after this failure: not performed.
- Cleanup/delete after this failure: not performed.

## Created Counts

Metadata-only marker scan after the failed execute:

| Area | Marker-scoped local synthetic records |
| --- | ---: |
| Customers | 1 |
| Items | 2 |
| Sales invoices | 3 |
| Sales quotes | 0 |
| Recurring invoice templates | 0 |
| Delivery notes | 0 |
| Collection cases | 0 |
| Customer payments | 0 |
| Credit notes | 0 |
| Customer refunds | 0 |
| Generated documents | 0 |

The partial marker-scoped local data is preserved by default. No cleanup/delete was run.

## Route And Checkpoint Updates

Updated:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

Routes remain blocked for walkthrough completion because the fixture did not create the full synthetic data set. No browser route was reviewed and no route was accountant-reviewed.

Expected-result checkpoints remain not run or blocked. No checkpoint was accountant-approved.

## Findings Log Status

Updated:

- `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`

No accountant reviewed the walkthrough in this sprint. No accountant findings were recorded or approved.

The schema migration and payment execute failure are development execution evidence only.

## Product/API/Backend Changes

No product API/service behavior changed.

Local database schema was updated by applying existing pending migrations against the local-only database. No new migration was created in this sprint.

No posting behavior, payment allocation logic, VAT math, ZATCA behavior, email behavior, inventory behavior, permissions, or production infrastructure behavior changed.

## Execution Defect Candidate

The fixture blocker from this sprint was payment account mapping:

- The fixture selects a bank account profile as the bank/cash prerequisite.
- The customer payment DTO `accountId` expects a chart-of-account id.
- The fixture payment step passes the bank account profile id.
- The customer payment API correctly requires the paid-through account to be an active posting asset account in the organization.

Recommended fixture hardening:

- Store both bank account profile id and linked chart-of-account id during preflight.
- Use the linked chart-of-account id for customer payments and refunds.
- Keep the bank account profile available only for bank-profile-specific checks.
- Rerun dry-run before any future execute attempt.

This is not an accountant finding.

Follow-up status from the payment-account hardening sprint:

- The fixture now passes the linked posting ASSET chart-of-account id for customer payments and refunds.
- The payment-account blocker was cleared in dry-run and in the next guarded execute retry.
- The next blocker is fixture credit-note application request shape: `POST /credit-notes/[id]/apply` rejected an unsupported `note` field.
- See `docs/development/SALES_AR_LOCAL_FIXTURE_PAYMENT_ACCOUNT_HARDENING_CLOSURE.md`.

## Validation Commands

Run:

- `git status --short --branch`
- `docker version --format '{{.Server.Version}}'`
- Local port checks for `5432`, `6379`, `4000`, and `3000`
- `GET http://localhost:4000/health`
- `GET http://localhost:4000/readiness`
- `GET http://localhost:3000/login`
- Token-suppressed local seed/demo login and `/auth/me`
- Local env target classification without printing values
- `corepack pnpm exec prisma migrate status` from `apps/api`
- Destructive-keyword scan over pending migration SQL
- `corepack pnpm db:migrate`
- `corepack pnpm db:generate`
- Local API restart after Prisma generate file-lock
- Post-refresh migration status check
- Status-only Sales/AR endpoint checks
- Hardened fixture dry-run
- One guarded fixture execute retry
- Metadata-only marker scan

Follow-up:

- `git diff --check` was deferred from this closure and is run in the payment-account hardening closure validation.

## Marketing Typecheck Blocker Status

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- Prior blocker: `HomePage` reported as `() => void` at lines `35` and `65`.

This sprint did not modify or delete marketing files.

## Remaining Blockers

- Full Sales/AR walkthrough fixture execution is no longer blocked by fixture payment account mapping.
- Full Sales/AR walkthrough fixture execution is now blocked by fixture credit-note application request shape.
- Partial marker-scoped local synthetic data exists and is preserved by default.
- Browser route walkthrough remains pending.
- Expected-result checkpoint review remains pending.
- Accountant review remains pending.

## Recommended Next Sprint

This next sprint was run as `Focused Local Sales/AR Fixture Payment-Account Hardening and Execute Retry Sprint`. It cleared the payment-account blocker and exposed the next fixture request-shape blocker.

Recommended current next sprint:

- Update the fixture credit-note application request to match the credit-note apply DTO/service.
- Do not cleanup/delete partial data.
- Rerun dry-run first.
- Attempt exactly one guarded local execute only after dry-run passes.
