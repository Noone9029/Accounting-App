# Production env preflight

## Summary

This PR adds a local/read-only production environment preflight for LedgerByte.

It classifies production-critical environment posture without printing secrets, connecting to databases, running migrations, calling providers, or executing cleanup.

## Files changed

- `scripts/production-env-preflight.cjs`
- `scripts/production-env-preflight.test.cjs`
- `docs/production/PRODUCTION_ENV_PREFLIGHT.md`
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md`
- `package.json`
- `PR_PRODUCTION_ENV_PREFLIGHT_SUMMARY.md`

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
- No network calls.
- No database connections.
- No provider calls.
- No secret values printed.

## Validation

- `node --test scripts/production-env-preflight.test.cjs` before implementation - failed because the module did not exist.
- `corepack pnpm test:production-env-preflight` - passed, 9 tests.
- `corepack pnpm production:env-preflight -- --json` - passed with `PRODUCTION_ENV_PREFLIGHT_LOCAL_REVIEW` and no secret values printed.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` with placeholder local env - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; web Jest printed the existing open-handle warning after passing.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- `apps/web/next-env.d.ts` generated churn was restored after build.

## Checks added

- Production-like `JWT_SECRET` presence, placeholder rejection, and minimum length.
- Production-like `CORS_ORIGIN` HTTPS, no wildcard-all, and no localhost.
- Secure auth cookie posture, including `SameSite=None` requiring secure cookies.
- Production-like `NEXT_PUBLIC_API_URL` HTTPS and no localhost.
- Production-like `DATABASE_URL` valid Postgres and no localhost.
- `DIRECT_URL` valid Postgres and not equal to `DATABASE_URL` when present.
- Root security cleanup scripts still point at the expected dry-run and execute commands.

## Remaining gaps

- This is a local/static preflight. It does not prove live provider-side secret values unless run in the approved target environment.
- Hosted migrations must still go through the approved deployment process.
- Production cleanup execute mode still requires owner approval and runbook review.
- Monitoring/logging provider setup, hosted backup/PITR proof, restore proof, and rollback evidence remain open.
