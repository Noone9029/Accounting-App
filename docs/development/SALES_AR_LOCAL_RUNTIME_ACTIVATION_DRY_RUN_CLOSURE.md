# Controlled Local Runtime Activation And Sales/AR Fixture Dry-run Sprint Closure

Date: 2026-06-05

Sprint: Controlled Local Runtime Activation and Sales/AR Fixture Dry-run Sprint

Product: LedgerByte

## Summary

Local LedgerByte runtime was activated safely for the controlled Sales/AR walkthrough readiness path. Docker-local Postgres and Redis were reachable, the local API and web app started, local health/readiness checks passed, local seed/demo login was verified without printing secrets, and a guarded Sales/AR walkthrough fixture planner was added and run in dry-run mode only.

No sample data was created. No fixture execute mode was run.

## Docker And Local Dependencies

- Docker client: available.
- Docker engine: available.
- Local Postgres container/service: reachable on local port `5432`.
- Local Redis container/service: reachable on local port `6379`.
- External hosted services: not used.
- Production, beta, staging, user-testing, Supabase, and Vercel targets: not used.

## Local API And Web

- API start command: `corepack pnpm --filter @ledgerbyte/api dev`.
- API local port: `4000`.
- API `/health`: HTTP `200`.
- API `/readiness`: HTTP `200`.
- Web start command: `corepack pnpm --filter @ledgerbyte/web dev`.
- Web local port: `3000`.
- Web root: responded with an app redirect.
- Web `/login`: HTTP `200`.

Only status codes, port metadata, and content lengths were inspected. No response bodies containing sensitive information were recorded.

## Local Target Guard

The local target guard passed at the inspected configuration level.

Checked keys were local-only without printing values:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_API_URL`

The fixture dry-run script also performed a local target guard and reported `localTargetGuard=passed`.

## Login Verification

Seed/demo login was verified only against the local API after DB/API readiness passed.

The verification suppressed:

- password output
- access token output
- cookies
- auth headers
- DB URLs
- secret values

This login verification did not create Sales/AR sample records and did not run any walkthrough mutation.

## Fixture Dry-run Script

Added:

`apps/api/scripts/sales-ar-walkthrough-fixture.ts`

Supported behavior:

- `--dry-run`
- `--marker`
- `--execute` refusal
- local target guard
- no production/beta/hosted guard
- no secret printing
- no PDF/body output
- no email, payment, ZATCA, VAT filing, backup, restore, smoke, E2E, seed, reset, cleanup, or delete behavior
- preserve-by-default cleanup posture

## Fixture Dry-run Execution

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Dry-run status: passed.
- Marker: `SALES-AR-WALKTHROUGH-20260604`.
- Planned fake records: customer, service item, product item, tax-mode invoices, payment, credit note, refund scenario, quotes, recurring template, generated draft invoice, delivery notes, collection cases, collection activities, reports, tax, and dashboard checkpoints.
- Checked local targets: 8.
- Data created: false.
- Database connected: false.
- Database writes: false.
- Fixture login performed: false.
- Seed/reset/delete: false.
- PDF generation: false.
- Email sent: false.
- Payment captured: false.
- ZATCA called: false.

## Data Creation Status

No data was created.

The sprint did not run:

- fixture execute mode
- seed
- reset
- delete
- cleanup
- migration
- smoke
- E2E
- browser walkthrough
- PDF generation
- real email
- payment gateway
- payment link
- VAT filing
- ZATCA
- backup
- restore
- hosted checks
- customer-data checks

## Route And Checkpoint Status

Route status was updated in:

`docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`

Expected-results status was updated in:

`docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

Current route/checkpoint status:

- Runtime is ready for local dry-run evidence.
- Routes were not browser-reviewed.
- Expected result checkpoints were not executed.
- Sample data creation remains pending explicit execute approval.
- Accountant review remains pending.

## Findings Log Status

The findings log was updated to record local runtime activation status only.

No accountant findings were invented, recorded, approved, or implemented.

## Safe Boundaries Verified

This sprint did not change accounting, payment, tax, ZATCA, inventory, hosted, or production behavior.

The fixture dry-run and runtime checks did not:

- post journals
- allocate payments
- mutate invoice balances
- create customer payments
- create credit notes or refunds
- send email
- create payment links
- file VAT
- call ZATCA
- move inventory
- generate PDFs
- touch production, beta, hosted, shared, or customer data

## Validation Commands

Ran:

```powershell
git status --short --branch
docker version
docker compose -f infra/docker-compose.yml config --services
Get-NetTCPConnection -LocalPort 3000,3001,4000,4001,5432,6379 -State Listen
Invoke-WebRequest http://localhost:4000/health -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest http://localhost:4000/readiness -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest http://localhost:3000 -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 0
Invoke-WebRequest http://localhost:3000/login -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 0
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
git diff --check
```

Results:

- Docker engine: available.
- Local Postgres/Redis ports: listening.
- Local API/web ports: listening.
- API health/readiness: HTTP `200`.
- Web root/login: reachable locally.
- Fixture dry-run: passed.
- `git diff --check`: passed with line-ending warnings only from the existing dirty working tree.

## Marketing Typecheck Blocker

The unrelated untracked marketing test blocker remains out of scope:

`apps/web/src/app/marketing.test.tsx`

Previous reports identified this as a web typecheck blocker where `HomePage` is inferred as `() => void` at lines 35 and 65. This sprint did not modify marketing files and did not run repo-wide web typecheck.

## Remaining Blockers

- Fixture execute mode is still not approved.
- No local synthetic Sales/AR sample data has been created.
- No browser walkthrough has been run.
- No PDF outputs have been generated for review.
- No accountant review has been performed.
- No accountant findings have been recorded.
- Hosted/beta/customer-data proof remains out of scope.

## Recommended Next Sprint

Run an explicitly approved local-only Sales/AR walkthrough fixture execute sprint:

- re-confirm local target guard,
- run only marker-scoped synthetic sample-data creation,
- preserve-by-default cleanup,
- execute the route checklist locally,
- record metadata-only walkthrough evidence,
- update the findings log with reviewer findings only if a reviewer actually records them.
