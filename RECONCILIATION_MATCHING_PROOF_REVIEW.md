# Reconciliation Matching Proof Review

Status: local-only proof pack branch, targeted proof verified.

Branch: `codex/reconciliation-matching-proof`

## Scope

This branch adds a guarded Prisma-backed proof for bank statement matching and reconciliation close safety. It does not add live bank feeds, connected banking, bank credentials, payment initiation, automatic matching, automatic reconciliation, hosted proof execution, UAE/ZATCA work, or production banking claims.

## Areas Covered

- Local-only opt-in database guard.
- Match candidate filtering for posted status, bank account, date window, amount, and tenant.
- Explicit match rejection for foreign-tenant journal lines.
- Explicit match rejection for wrong-account journal lines.
- Manual matching to an existing posted bank journal line.
- Categorization-created balanced bank-fee journal.
- Ignored statement row handling without a new journal.
- Import status refresh to reconciled after all rows are reviewed.
- Reconciliation summary zero-difference status after matched, categorized, and ignored rows.
- Reconciliation create, submit, approve, close, and snapshot evidence.
- Report CSV and report data exclusion of foreign tenant data.
- Closed-period import and review mutation blocking after reconciliation close.
- Audit log evidence for matched, categorized, ignored, and closed actions.
- Review-event evidence for submit, approve, and close.

## Guard Model

The proof defaults to skipped. It runs only when:

- `LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` is set

The test refuses:

- missing explicit test database URL
- non-Postgres URLs
- non-local hosts
- production-looking database names

The spec intentionally does not fall back to `DATABASE_URL`.

## Bugs Found

- The first opt-in run exposed a fixture issue: a deliberately wrong-direction posted bank line changed the real ledger balance and invalidated the zero-difference reconciliation assertion. The proof was narrowed to wrong-account and foreign-tenant rejection so the safety assertion remains meaningful without polluting ledger state.

## Fixes Implemented

- Added `apps/api/src/reconciliation-matching-proof.integration.spec.ts`.
- Added this review document and PR summary document.

## Accounting Impact

No production accounting logic changed. The proof uses existing accounting behavior:

- Matching does not create journals.
- Categorization creates the expected Dr expense / Cr bank journal.
- Ignoring a statement row does not create a journal.
- Reconciliation close snapshots reviewed statement rows and does not create journals.

## Remaining Untested Areas

- Browser-runtime matching workflow proof.
- Hosted/customer-data matching proof.
- Automatic matching or auto-reconciliation, which remain intentionally out of scope.
- Load/concurrency proof for simultaneous match/categorize/close attempts.
- Certified target-bank statement compatibility.
- Accountant beta sign-off.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed with the local placeholder URL.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/reconciliation-matching-proof.integration.spec.ts` - passed in default mode: 5 passed, 1 skipped.
- `docker compose -p ledgerbyte-reconciliation-matching-proof -f infra/docker-compose.yml up -d postgres redis` - local disposable Postgres/Redis started.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api db:migrate` - passed against disposable local Postgres; 78 migrations applied.
- First opt-in local DB proof run - failed because a test fixture created a real posted wrong-direction bank line that changed ledger balance.
- `$env:LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION='1'; $env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/reconciliation-matching-proof.integration.spec.ts` - passed after fixture correction: 6 passed.
- `docker compose -p ledgerbyte-reconciliation-matching-proof -f infra/docker-compose.yml down` - stopped and removed the local disposable services.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; it surfaced generated `apps/web/next-env.d.ts` churn from the Next build.
- `git diff -- apps/web/next-env.d.ts` - showed generated Next route-type churn only; restored.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk secret scan - no real secrets; matches were safe synthetic `passwordHash` fixtures and documentation text.

## Remaining Risks

- This proof is local-only and synthetic. It does not prove hosted staging behavior, production readiness, or real bank statement compatibility.
- The proof relies on application-level tenant scoping, not database-enforced RLS.

## Next Recommended Prompt

Codex, review the reconciliation matching proof PR only for owner-review readiness. Confirm the diff is limited to the local-only reconciliation matching proof spec and docs, run the guarded default test, run the opt-in local DB proof if local Postgres is available, run lint/typecheck/test/build/verify:diff, check generated files and secrets, and do not add live bank feeds, hosted mutations, accounting logic changes, UAE/ZATCA work, provider integrations, payment initiation, automatic matching, or automatic reconciliation.
