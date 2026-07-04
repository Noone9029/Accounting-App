PR title:

P0 security hardening: cookie auth, CSRF, login throttling, session revocation, cleanup runbook

## Summary

This PR implements the P0 security hardening package for LedgerByte.

It includes:

- Fail-closed JWT secret handling.
- Production CORS hardening.
- Baseline API security headers.
- Migration from browser localStorage/sessionStorage auth tokens to httpOnly cookie auth.
- CSRF protection for unsafe cookie-authenticated requests.
- Durable Prisma-backed login throttling.
- Durable AuthSession records using hashed jti values.
- Server-side JWT/session revocation on logout.
- Rejection of legacy JWTs without jti.
- Cleanup CLI for expired/revoked AuthSession rows and stale LoginRateLimit rows.
- Production-safe security cleanup runbook.
- Root cleanup helper scripts.
- Env example and deployment documentation updates.
- API and web regression tests for auth, CSRF, throttling, cleanup, session revocation, and no browser token persistence.

## Database migrations

This PR adds two Prisma migrations:

- `20260704160000_login_rate_limits`
- `20260704170000_auth_sessions`

Hosted migrations were not run from the local worktree. Production migrations must be applied through the approved deployment process.

## Validation performed

- Confirmed branch: `codex/p0-security-hardening`.
- Local Docker Compose Postgres started and verified healthy on `localhost:5432`.
- Local-only Prisma migrations applied successfully.
- Prisma generate passed.
- Prisma validate passed with local placeholder URLs.
- Cleanup help passed from both API and root scripts.
- Cleanup dry-run passed from both API and root scripts.
- `security:cleanup -- --dry-run` printed aggregate counts only.
- `--execute` was not run.
- Secret scan found no real credential leak.
- Browser token persistence was not reintroduced.
- No public cleanup endpoint was added.
- `apps/web/next-env.d.ts` has no final diff.
- Untracked-file trailing whitespace scan returned no matches.

## Commands run

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @ledgerbyte/api db:migrate
corepack pnpm --filter @ledgerbyte/api db:generate
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --help
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run
corepack pnpm security:cleanup -- --help
corepack pnpm security:cleanup:dry-run
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm verify:diff
git diff --check
```

## Test results

Targeted API security tests passed:

- 7 suites.
- 41 tests.

Targeted web auth tests passed:

- 4 suites.
- 19 tests.

Full test suite passed:

- API: 163 suites / 1456 tests.
- Web: 157 suites / 692 tests.

Additional verification:

- `corepack pnpm verify:diff` passed.
- `git diff --check` passed with existing CRLF normalization warnings only.
- Untracked-file trailing whitespace scan returned no matches.

## Security behavior added

- Browser auth no longer depends on readable bearer tokens.
- Login/register/invite acceptance set httpOnly auth cookies.
- Login/register/invite acceptance set readable CSRF cookies.
- Unsafe cookie-authenticated requests require CSRF protection.
- Login attempts are throttled by hashed email, IP, and email+IP keys.
- New JWTs include `jti`.
- JWT guard checks durable AuthSession records.
- Revoked, expired, missing, mismatched, or no-jti sessions are rejected.
- Logout revokes the current server-side session and clears auth/CSRF cookies.
- Cleanup command is dry-run by default.
- Cleanup execute mode requires explicit `--execute`.

## Deployment checklist

Before production deploy:

- Confirm production `JWT_SECRET` is strong and not the fallback value.
- Confirm production CORS origins are explicit, not wildcard.
- Confirm auth cookie settings are appropriate for the deployment domain.
- Apply Prisma migrations through the approved deployment path.
- Deploy API and web together or in a coordinated release.
- Expect old no-jti JWTs to be rejected. Users may need to sign in again.
- Run security cleanup in dry-run mode first.
- Review dry-run counts before ever enabling execute mode.
- Do not run cleanup execute mode from a developer machine against hosted production.

## Cleanup command

Dry run:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run
```

Root helper:

```bash
corepack pnpm security:cleanup:dry-run
```

Execute mode, production caution required:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute
```

## Known remaining risks

- Hosted migrations were not run.
- Manual browser smoke was not performed.
- `accessToken` remains in auth responses for non-browser API compatibility.
- No logout-all-devices or session-management UI yet.
- Production cleanup scheduling remains ops-owned.
- Tenant isolation proof work is not included in this PR.

## Reviewer focus areas

Please review especially:

- Cookie attributes and CSRF behavior.
- JWT guard durable session checks.
- Logout session revocation.
- Login throttling limits and privacy.
- Prisma migration safety.
- Cleanup dry-run and execute safety.
- Web removal of browser token persistence.
- Production deployment notes.
