# Production Smoke Readiness Guard

## Summary

This PR adds a non-mutating production smoke readiness guard for LedgerByte.

It includes:

- Static runbook validation for manual/deployed smoke readiness.
- A metadata-only runbook covering browser smoke, deployed API smoke, tenant switching, dashboard totals, search, settings, exports, downloads, refresh behavior, direct URL probes, cookie auth, CSRF, and health/readiness checks.
- Root package scripts for the guard and its test.
- Production launch-gate documentation updates.

## Impact

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No auth runtime behavior changed.
- No UI behavior changed.
- No hosted migrations were run.
- No hosted mutations were run.
- No smoke test was executed against a hosted target.

## Safety Contract

The guard reads committed documentation only. It does not read env secrets, call provider APIs, open provider consoles, connect to databases, run hosted migrations, run cleanup execute, execute smoke tests, seed, reset, delete data, export files, download files, send email, or call ZATCA endpoints.

The runbook requires metadata-only evidence and explicitly forbids production URLs without approval, hosted migrations, hosted mutations, seed/reset/delete, `security:cleanup -- --execute`, real customer data, provider console mutations, secret values, raw logs, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, object bodies, email sends, and ZATCA network calls.

## Validation

Completed locally:

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with placeholder/local URL pattern - passed.
- `corepack pnpm test:production-smoke-readiness-guard` - passed.
- `corepack pnpm production:smoke-readiness-guard -- --json` - passed with `PRODUCTION_SMOKE_READINESS_GUARD_PASSED`.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; web tests emitted the existing force-exited worker warning but exited successfully.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated build churn detected, then restored; no remaining diff.
- Targeted high-risk secret scan on changed files - no real secrets.
- Trailing whitespace scan on changed files - no matches.

## Remaining Gaps

- Approved non-production target and credentials are still required before any deployed smoke execution.
- Future manual browser smoke execution remains separate.
- Future hosted API smoke execution remains separate.
- Production smoke remains blocked until a separate production approval gate exists.
- Monitoring, hosted backup/PITR, hosted restore, support escalation, and final launch approval remain separate gates.

## Next Recommended Prompt

Codex, review PR <number> only for owner-review readiness. Confirm the branch is test/docs/script only, the smoke readiness guard is non-mutating, checks pass, no secrets are exposed, `apps/web/next-env.d.ts` has no generated churn, and no hosted smoke, hosted migrations, hosted mutations, or cleanup execute commands were run.
