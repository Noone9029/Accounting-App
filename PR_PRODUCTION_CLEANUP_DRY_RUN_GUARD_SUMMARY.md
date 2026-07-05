# Production Security Cleanup Dry-Run Guard

## Summary

This PR adds a non-mutating production security-cleanup dry-run guard for LedgerByte.

It includes:

- Static runbook validation for production security-cleanup dry-run readiness.
- A metadata-only runbook for future approved cleanup dry-run review.
- Root package scripts for the guard and its test.
- Production launch-gate documentation updates.

## Impact

- No production runtime code changed.
- No accounting logic changed.
- No auth runtime behavior changed.
- No Prisma schema or migrations changed.
- No UI behavior changed.
- No hosted migrations were run.
- No hosted mutations were run.
- `security:cleanup -- --dry-run` was not run against a hosted target.
- `security:cleanup -- --execute` was not run.

## Safety Contract

The guard reads committed documentation and root `package.json` script wiring only. It does not read env secrets, call provider APIs, open provider consoles, connect to databases, run hosted migrations, run cleanup dry-run, run cleanup execute, seed, reset, delete data, send email, or call ZATCA endpoints.

The runbook explicitly permits only future owner-approved dry-run review and forbids `security:cleanup -- --execute`, `security:cleanup:execute`, hosted mutations, hosted migrations, seed/reset/delete, production data deletion, database restore, direct SQL, provider console mutations, secret values, raw logs, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, raw emails, raw IPs, jti values, row identifiers, email sends, and ZATCA network calls.

## Validation

Completed locally:

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - initially hit a Windows Prisma engine DLL rename file-lock while run in parallel with Prisma validate; serial rerun passed.
- Prisma validate with placeholder/local URL pattern - passed.
- `corepack pnpm test:production-cleanup-dry-run-guard` - passed.
- `corepack pnpm production:cleanup-dry-run-guard -- --json` - passed with `PRODUCTION_CLEANUP_DRY_RUN_GUARD_PASSED`.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API and web tests emitted the existing force-exited worker warning but exited successfully.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated build churn detected, then restored; no remaining diff.
- Targeted high-risk secret scan on changed files - no real secrets.
- Trailing whitespace scan on changed files - no matches.

## Remaining Gaps

- Owner approval is still required before running cleanup dry-run against any hosted target.
- Hosted cleanup dry-run execution remains separate.
- Cleanup execute approval remains separate and blocked.
- Cleanup scheduling remains separate.
- Monitoring, hosted backup/PITR, hosted restore, incident response rehearsal, and final launch approval remain separate gates.

## Next Recommended Prompt

Codex, review PR <number> only for owner-review readiness. Confirm the branch is docs/script/package only, the production cleanup dry-run guard is non-mutating, checks pass, no secrets are exposed, `apps/web/next-env.d.ts` has no generated churn, and no hosted cleanup dry-run, cleanup execute, hosted migrations, or hosted mutations were run.
