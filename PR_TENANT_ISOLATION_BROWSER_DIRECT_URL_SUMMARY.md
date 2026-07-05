# Browser E2E tenant isolation: direct URL proof

## Summary

This PR adds the missing browser page-level direct URL proof to the local-only tenant-isolation E2E spec.

It verifies that User A navigating directly to Tenant B's customer detail URL gets a safe not-found state and no Tenant B markers in the rendered page.

It also tightens the team settings heading locator to avoid matching the transient `Loading team members...` heading during browser E2E runs.

## Files changed

- `tests/e2e/tenant-isolation-browser.spec.ts`
- `TENANT_ISOLATION_BROWSER_E2E_REVIEW.md`
- `PR_TENANT_ISOLATION_BROWSER_DIRECT_URL_SUMMARY.md`

## Scope covered

- Direct browser navigation to a foreign tenant customer detail route.
- No Tenant B customer marker rendered in the Tenant A browser session.
- No Tenant B user/email marker rendered in the Tenant A browser session.
- Existing direct API URL probe for the same foreign customer still expects `404`.
- The direct foreign customer route permits only the known browser resource error from the related collection lookup after the safe not-found UI is proven.

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth runtime logic changed.

No UI behavior changed.

## Test behavior

The browser tenant spec remains opt-in and local-only.

It runs only when:

- `LEDGERBYTE_BROWSER_TENANT_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed local/test Postgres URL

The fixture refuses non-local database hosts and production-looking database names. It does not fall back to `DATABASE_URL`.

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with the local placeholder URL pattern - passed.
- Targeted browser tenant spec default mode - passed with 3 skipped tests.
- Targeted browser tenant spec opt-in local mode - passed with 3 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. API: 167 suites passed, 1531 tests passed, 9 skipped. Web: 157 suites passed, 692 tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings for changed text files.
- Generated-file check - passed; `apps/web/next-env.d.ts` generated build churn was restored.
- Targeted high-risk secret scan - no real secrets; matches were token-storage assertions and the synthetic fixture password field.
- Targeted trailing whitespace scan - no matches.

## Remaining gaps

- Hosted/staging browser tenant proof.
- Real object-storage provider download isolation.
- Exhaustive browser route coverage for every module.
- Mutation-heavy browser cross-tenant form submissions.
- Page-level navigation to every foreign detail route beyond the representative customer detail route.

## Reviewer focus areas

Please review the new direct browser navigation assertion in `tests/e2e/tenant-isolation-browser.spec.ts` and confirm it stays a local-only browser proof without runtime changes.
