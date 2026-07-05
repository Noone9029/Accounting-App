# Production rollback runbook guard

## Summary

This PR adds a metadata-only production rollback runbook plus a local static guard.

It improves paid-beta production readiness by documenting rollback owner roles, application rollback checks, migration decision boundaries, environment-variable rollback safety, queue/worker rollback safety, support communication, post-rollback verification, abort conditions, and evidence redaction.

Review update: the guard now rejects absolute or repo-escaping `--runbook` paths before reading files, so the metadata-only/no-secret-read contract cannot be weakened by path traversal.

## Files changed

- `docs/production/PRODUCTION_ROLLBACK_RUNBOOK.md`
- `docs/production/LAUNCH_GATE_CHECKLIST.md`
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`
- `package.json`
- `scripts/production-rollback-runbook-guard.cjs`
- `scripts/production-rollback-runbook-guard.test.cjs`
- `PR_PRODUCTION_ROLLBACK_RUNBOOK_SUMMARY.md`

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth runtime behavior changed.

No UI behavior changed.

## Safety

- No hosted migrations.
- No hosted mutations.
- No `security:cleanup -- --execute`.
- No database restore.
- No DNS changes.
- No provider console mutations.
- No network calls.
- No database connections.
- No env secret reads.
- No secret values printed.
- No customer data printed.
- No rollback execution.

## Validation

- `node --test scripts/production-rollback-runbook-guard.test.cjs` before implementation - failed because the guard module did not exist.
- `node --test scripts/production-rollback-runbook-guard.test.cjs` - passed, 5 tests.
- `node scripts/production-rollback-runbook-guard.cjs --json` - passed with `PRODUCTION_ROLLBACK_RUNBOOK_GUARD_PASSED`.
- `corepack pnpm test:production-rollback-runbook-guard` - passed, 5 tests.
- `corepack pnpm production:rollback-runbook-guard -- --json` - passed with `PRODUCTION_ROLLBACK_RUNBOOK_GUARD_PASSED`.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` with local placeholder `DATABASE_URL` and `DIRECT_URL` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed on the longer rerun; the first run hit the local 120s command timeout, and API Jest still printed the existing open-handle warning after passing.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed with existing CRLF normalization warnings only.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- Targeted high-risk secret scan - safe redaction wording only; no real secrets.
- Trailing whitespace scan - no matches.
- `apps/web/next-env.d.ts` generated churn was restored after build.

## Remaining gaps

- This is a runbook and static text guard only.
- Owner approval is still required before any hosted rollback execution.
- Final production hosting and monitoring provider choices remain separate gates.
- Hosted backup/PITR and restore proof remain separate gates.
- Staging smoke and manual browser smoke still require approved targets and credentials.
