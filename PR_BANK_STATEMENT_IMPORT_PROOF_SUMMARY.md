# PR: Add bank statement import proof pack

## Summary

This PR adds a local-only, opt-in Prisma proof for manual bank statement imports.

It proves:

- preview does not mutate imports or rows
- CSV import persists normalized statement rows
- statement import writes audit evidence
- statement import does not post journals
- duplicate-existing rows block full import
- explicit partial import skips duplicate rows and imports safe rows
- sanitized OFX, CAMT, and MT940 imports preserve source metadata
- unsupported/raw body warnings do not echo statement contents
- closed reconciliation overlap blocks imports
- tenant scoping protects imports, statement rows, void attempts, and foreign bank profiles
- voiding an unmatched import voids rows and removes duplicate pressure

## Safety

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No UI behavior changed.
- No live bank feed, bank API, provider integration, credentials, payment initiation, automatic matching, automatic reconciliation, or automatic posting added.
- No hosted migrations or hosted mutations were run.
- The proof is synthetic and local-only.

## Opt-In Guard

Default test behavior is safe and skip-only. Full local DB proof requires:

```powershell
$env:LEDGERBYTE_BANK_STATEMENT_IMPORT_DB_INTEGRATION='1'
$env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'
corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/bank-statement-import-proof.integration.spec.ts
```

The spec refuses missing, hosted, non-local, and production-looking database URLs. It does not fall back to `DATABASE_URL`.

## Validation

Completed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate`
- default guarded spec run: 5 passed, 4 skipped
- local Docker Postgres/Redis health check
- Prisma migrate deploy against disposable local Postgres: 78 migrations applied
- opt-in local DB spec run: 9 passed
- local Docker services stopped after the proof
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm verify:diff`
- `git diff --check`
- changed-file trailing whitespace scan
- targeted high-risk secret scan on changed files
- generated-file check for `apps/web/next-env.d.ts`

Notes:

- The first full `corepack pnpm test` run hit a transient timeout in existing `apps/api/src/tenant-isolation-http.integration.spec.ts` setup.
- That existing spec passed immediately in isolation with `--runInBand`.
- The exact full `corepack pnpm test` command then passed on rerun.
- `apps/web/next-env.d.ts` had build-generated route-reference churn and was restored.

## Remaining Gaps

- Browser-runtime bank statement import proof.
- Hosted/customer-data proof.
- Certified target-bank parser coverage.
- Raw statement-file archive execution.
- DB-level unique statement fingerprint/index if needed.
- Bulk import/load/concurrency proof.
- Accountant beta sign-off.
