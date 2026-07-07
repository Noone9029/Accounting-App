# Banking Reconciliation Foundation Review

Status: local-only proof pack branch, targeted proof verified.

Branch: `codex/banking-reconciliation-foundation`

## Scope

This branch adds a guarded Prisma-backed proof for the manual banking/reconciliation foundation. It does not add live bank feeds, connected banking, bank credentials, payment initiation, automatic reconciliation, automatic posting, hosted proof execution, UAE/ZATCA work, or production banking claims.

## Areas Covered

- Bank account profile with linked active asset posting account.
- Manual statement preview and import.
- Statement import preview non-mutation.
- Statement row match candidate discovery.
- Explicit statement row matching to an existing posted bank journal line.
- Deterministic bank rule suggestion and explicit operator-applied categorization.
- Categorization-created bank fee journal.
- Reconciliation summary and zero-difference status.
- Reconciliation create, submit, approve, and close workflow.
- Reconciliation report data and CSV evidence.
- Dashboard cash/bank aggregate via `ReportsService.dashboardSummary`.
- Closed-period import guard.
- Cross-tenant negative checks for imports, statement rows, bank rules, reconciliations, bank accounts, reports, and dashboard output.

## Guard Model

The proof defaults to skipped. It runs only when:

- `LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` is set

The test refuses:

- missing explicit test database URL
- non-Postgres URLs
- non-local hosts
- production-looking database names

The spec intentionally does not fall back to `DATABASE_URL`.

## Bugs Found

- `corepack pnpm test` exposed an existing browser unit-test timing issue in `apps/web/src/app/(app)/bank-accounts/[id]/card-settlements/[settlementId]/page.test.tsx`: the test waited for the static page header, then asserted detail content before the mocked settlement load had resolved.

## Fixes Implemented

- Added `apps/api/src/banking-reconciliation-foundation.integration.spec.ts`.
- Added this review document and PR summary document.
- Stabilized the existing card settlement detail test by awaiting the asynchronous manual-banking safety wording before asserting the rest of the loaded detail content.

## Accounting Impact

No production accounting logic changed. The proof uses existing accounting behavior:

- Matching does not create journals.
- Categorization creates the expected Dr expense / Cr bank journal.
- Reconciliation close creates a statement-row snapshot and does not create journals.

## Remaining Untested Areas

- Browser-runtime banking workflow proof beyond existing route-load smoke.
- Hosted/customer-data banking proof.
- Certified bank-specific parser coverage.
- Raw statement-file archive execution.
- DB-level unique statement fingerprint/index.
- Transfer fees and FX transfers.
- Direct cheque source accounting and card credit/refund offset policy.
- Load/concurrency proof for import/match/reconciliation races.
- Accountant sign-off with filled beta evidence packet.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed with the local placeholder URL.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/banking-reconciliation-foundation.integration.spec.ts` - passed in default mode: 5 passed, 2 skipped.
- `docker compose -p ledgerbyte-banking-reconciliation-foundation -f infra/docker-compose.yml up -d postgres redis` - local disposable Postgres/Redis started and reported healthy.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api db:migrate` - passed against disposable local Postgres; no pending migrations.
- `$env:LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION='1'; $env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/banking-reconciliation-foundation.integration.spec.ts` - passed in opt-in local DB mode: 7 passed.
- `docker compose -p ledgerbyte-banking-reconciliation-foundation -f infra/docker-compose.yml down` - stopped and removed the local disposable services.
- `corepack pnpm --filter @ledgerbyte/web test --testPathPatterns=card-settlements` - passed after the test-only timing fix: 2 suites passed, 5 tests passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed after the test-only timing fix: API 170 suites passed, web 157 suites passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; it surfaced generated `apps/web/next-env.d.ts` churn from the Next build.
- `git diff -- apps/web/next-env.d.ts` - showed generated Next route-type churn only; restored with `git restore -- apps/web/next-env.d.ts`.
- Changed-file targeted secret scan - no real secrets; matches were synthetic `passwordHash` fixture fields and the word `secrets` in this review document.
- Changed-file trailing whitespace scan - passed.
- `git diff --check` - passed with an existing CRLF normalization warning for the touched web test.

## Remaining Risks

- This proof is local-only and synthetic. It improves confidence in the manual banking foundation but does not prove hosted staging behavior, production readiness, or real bank statement compatibility.
- The proof relies on the existing application-level tenant scoping model, not database-enforced RLS.

## Next Recommended Prompt

Codex, review the banking reconciliation foundation PR only for owner-review readiness. Confirm the diff is limited to the local-only proof spec and docs, run the guarded default test, run the opt-in local DB proof if local Postgres is available, run lint/typecheck/test/build/verify:diff, check generated files and secrets, and do not add live bank feeds, hosted mutations, accounting logic changes, UAE/ZATCA work, or provider integrations.
