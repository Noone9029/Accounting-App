# Bank Statement Import Proof Review

Status: local-only proof pack branch, targeted proof verified.

Branch: `codex/bank-statement-import-proof`

## Scope

This branch adds a guarded Prisma-backed proof for manual bank statement imports. It does not add live bank feeds, connected banking, provider credentials, payment initiation, automatic matching, automatic reconciliation, hosted proof execution, UAE/ZATCA work, or production banking claims.

## Areas Covered

- Local-only opt-in database guard.
- Preview non-mutation for manual statement imports.
- CSV import persistence with normalized row identity metadata.
- Statement import audit log evidence.
- No journal posting during statement import.
- Duplicate-existing warning and full-import blocking.
- Explicit partial import that skips a duplicate row and imports only the safe row.
- Sanitized OFX, CAMT, and MT940 preview/import source metadata.
- Unsupported/raw statement text warning without raw-body echo.
- Closed reconciliation overlap warning and import blocking.
- Cross-tenant negative checks for import reads, statement row reads, void attempts, and foreign bank profiles.
- Voiding unmatched imports and statement rows.
- Duplicate pressure removal after voiding an import.

## Guard Model

The proof defaults to skipped. It runs only when:

- `LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` is set

The test refuses:

- missing explicit test database URL
- non-Postgres URLs
- non-local hosts
- production-looking database names

The spec intentionally does not fall back to `DATABASE_URL`.

## Bugs Found

- Initial targeted test run before `db:generate` failed because the fresh worktree had not generated Prisma Client yet. `corepack pnpm --filter @ledgerbyte/api db:generate` fixed the environment setup issue.
- The first opt-in local DB run exposed an assertion issue: audit log actions are standardized to `BANK_STATEMENT_IMPORTED` and `BANK_STATEMENT_IMPORT_VOIDED`, not raw `IMPORT` / `VOID`. The spec was corrected to assert the real audit event names.

## Fixes Implemented

- Added `apps/api/src/bank-statement-import-proof.integration.spec.ts`.
- Added this review document and PR summary document.
- Updated audit assertions to match the existing standardized audit-event model.

## Accounting Impact

No production accounting logic changed. The proof uses existing import behavior:

- Preview does not write imports or rows.
- Import creates statement import/transaction rows and audit evidence.
- Import does not create journals.
- Duplicate and closed-period rows are blocked or explicitly skipped by existing partial-import rules.
- Void marks import and unmatched rows voided without posting journals.

## Remaining Untested Areas

- Browser-runtime import flow beyond existing web unit and route-load coverage.
- Hosted/customer-data import proof.
- Certified target-bank parser compatibility.
- Raw statement-file archive execution.
- DB-level unique statement fingerprint/index if needed.
- Bulk import/load/concurrency proof.
- Real accountant sign-off against filled beta evidence packet.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/bank-statement-import-proof.integration.spec.ts` - passed in default mode: 5 passed, 4 skipped.
- `docker compose -p ledgerbyte-bank-statement-import-proof -f infra/docker-compose.yml up -d postgres redis` - local disposable Postgres/Redis started and reported healthy.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api db:migrate` - passed against disposable local Postgres; 78 migrations applied.
- `$env:LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION='1'; $env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/bank-statement-import-proof.integration.spec.ts` - passed in opt-in local DB mode: 9 passed.
- `docker compose -p ledgerbyte-bank-statement-import-proof -f infra/docker-compose.yml down` - stopped and removed the local disposable services.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - first run hit a transient timeout in existing `apps/api/src/tenant-isolation-http.integration.spec.ts`; the spec passed in isolation with `--runInBand`, and the exact full command passed on rerun.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- `git diff -- apps/web/next-env.d.ts` - showed build-generated route-reference churn only; restored.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk secret scan - no real secrets; matches were safe synthetic `passwordHash` fixtures and documentation text.

## Remaining Risks

- This proof is local-only and synthetic. It does not prove hosted staging behavior, production readiness, or real bank statement compatibility.
- The proof relies on application-level tenant scoping, not database-enforced RLS.
- Parser compatibility remains sample-based until target-bank sanitized statements are collected and approved.

## Next Recommended Prompt

Codex, review the bank statement import proof PR only for owner-review readiness. Confirm the diff is limited to the local-only import proof spec and docs, run the guarded default test, run the opt-in local DB proof if local Postgres is available, run lint/typecheck/test/build/verify:diff, check generated files and secrets, and do not add live bank feeds, hosted mutations, accounting logic changes, UAE/ZATCA work, provider integrations, or payment initiation.
