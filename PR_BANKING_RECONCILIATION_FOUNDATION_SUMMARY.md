# PR: Add banking reconciliation foundation proof pack

## Summary

This PR adds a local-only, opt-in Prisma proof for the manual banking/reconciliation foundation.

It proves:

- bank profile setup over a linked asset account
- manual statement preview/import
- explicit match candidate discovery and statement matching
- deterministic bank-rule suggestion and explicit apply
- categorization journal posting
- reconciliation summary/create/submit/approve/close
- reconciliation report data and CSV evidence
- dashboard cash/bank aggregate impact
- closed-period import guard
- tenant scoping for banking records and report/dashboard output

## Safety

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No UI behavior changed.
- No live bank feed, bank API, provider integration, credentials, payment initiation, automatic reconciliation, or automatic posting added.
- No hosted migrations or hosted mutations were run.
- The proof is synthetic and local-only.

## Opt-In Guard

Default test behavior is safe and skip-only. Full local DB proof requires:

```powershell
$env:LEDGERBYTE_BANKING_RECONCILIATION_DB_INTEGRATION='1'
$env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'
corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/banking-reconciliation-foundation.integration.spec.ts
```

The spec refuses missing, hosted, non-local, and production-looking database URLs. It does not fall back to `DATABASE_URL`.

## Validation

Completed so far:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with a local placeholder URL
- default guarded spec run: 5 passed, 2 skipped
- local Docker Postgres/Redis health check
- Prisma migrate deploy against disposable local Postgres: no pending migrations
- opt-in local DB spec run: 7 passed
- local Docker services stopped after the proof
- targeted card settlement web tests after the existing async test wait fix: 2 suites passed, 5 tests passed
- full `corepack pnpm lint`: passed
- full `corepack pnpm typecheck`: passed
- full `corepack pnpm test`: passed after the test-only timing fix
- full `corepack pnpm build`: passed
- `corepack pnpm verify:diff`: passed
- `git diff --check`: passed with an existing CRLF normalization warning for the touched web test
- generated-file check: `apps/web/next-env.d.ts` generated churn was restored
- changed-file trailing whitespace scan: passed
- targeted secret scan: no real secrets; matches were synthetic `passwordHash` fixture fields and safe documentation text

## Remaining Gaps

- Browser-runtime banking workflow proof.
- Hosted/customer-data proof.
- Certified target-bank parser coverage.
- Raw statement-file archive execution.
- DB-level unique statement fingerprint/index if needed.
- Transfer fees and FX.
- Direct cheque source accounting and card credit/refund offset policy.
- Load/concurrency proof.
- Accountant beta sign-off.
