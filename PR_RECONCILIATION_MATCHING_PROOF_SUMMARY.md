# PR: Add reconciliation matching proof pack

## Summary

This PR adds a local-only, opt-in Prisma proof for bank statement matching and reconciliation close safety.

It proves:

- match candidate filtering excludes draft, wrong-account, and foreign-tenant journal lines
- explicit matching rejects foreign-tenant and wrong-account journal lines
- explicit matching links an unmatched statement row to a posted bank journal line
- categorization creates a balanced posted journal for a bank fee
- ignored statement rows are included in review state without creating a journal
- import status refreshes after all statement rows are reviewed
- reconciliation summary reaches zero difference with matched, categorized, and ignored rows
- reconciliation create, submit, approve, close, and snapshot evidence work together
- report data and CSV evidence stay tenant-scoped
- closed reconciliation periods block later imports and review mutations
- audit logs and review events exist for financial review actions

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
$env:LEDGERBYTE_RECONCILIATION_MATCHING_DB_INTEGRATION='1'
$env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'
corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/reconciliation-matching-proof.integration.spec.ts
```

The spec refuses missing, hosted, non-local, and production-looking database URLs. It does not fall back to `DATABASE_URL`.

## Validation

Completed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with a local placeholder URL
- default guarded spec run: 5 passed, 1 skipped
- local Docker Postgres/Redis startup
- Prisma migrate deploy against disposable local Postgres: 78 migrations applied
- opt-in local DB proof run: 6 passed after fixture correction
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

- The first opt-in local DB proof run exposed a fixture issue: a deliberately wrong-direction posted bank line changed the real ledger balance. The proof was corrected to use wrong-account and foreign-tenant rejection without polluting ledger state.
- `apps/web/next-env.d.ts` had build-generated route-reference churn and was restored.

## Remaining Gaps

- Browser-runtime matching workflow proof.
- Hosted/customer-data matching proof.
- Automatic matching and automatic reconciliation, intentionally not introduced by this PR.
- Load/concurrency proof for simultaneous review actions.
- Certified target-bank statement compatibility.
- Accountant beta sign-off.
