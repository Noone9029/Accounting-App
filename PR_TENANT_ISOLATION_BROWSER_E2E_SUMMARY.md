# Browser E2E tenant isolation proof

## Summary

This PR adds and expands a local-only browser E2E tenant-isolation proof for organization switching, scoped UI reads, search, settings, reports, exports, direct URL probes, and downloads.

It uses the existing cookie-authenticated Playwright browser-context login helper and asserts that browser token persistence is not reintroduced.

## Files changed

- `TENANT_ISOLATION_BROWSER_E2E_REVIEW.md`
- `PR_TENANT_ISOLATION_BROWSER_E2E_SUMMARY.md`
- `tests/e2e/tenant-isolation-browser.spec.ts`
- `tests/e2e/utils/tenant-isolation-browser-fixture.ts`

## Scope covered

- Browser cookie-auth login.
- No browser token persistence from E2E helper login.
- Organization switching correction after invalid stored org context.
- Account menu organization visibility.
- Dashboard aggregates, report net profit, trends, and receivables aging buckets.
- Customer list and customer detail URL/API boundary.
- Sales invoice list/detail URL/API boundary.
- Purchase bill list/detail URL/API boundary.
- Journal list and journal detail API boundary.
- Chart of accounts detail API boundary.
- Global search API and UI, including customer, supplier, invoice, bill, journal, and amount markers.
- Team, security, document, and storage settings.
- Profit and loss JSON report.
- Profit and loss CSV export.
- Profit and loss PDF export.
- Generated document archive UI and list/download isolation.
- Attachment download isolation, including tenant A success before tenant B denial.

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth runtime logic changed.

No UI behavior changed.

## Test behavior

The browser tenant spec is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_BROWSER_TENANT_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed local/test Postgres URL

The fixture refuses non-local database hosts and production-looking database names. It does not fall back to `DATABASE_URL`.

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed after stopping the local API helper that held the Prisma Windows query-engine DLL.
- Prisma validate with local placeholder URL - passed.
- Default browser tenant spec run - passed with 3 skipped tests.
- Opt-in local browser tenant spec run against local API/web/Postgres - passed with 3 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. Existing web Jest worker open-handle warning was emitted, with all suites passing.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings for changed text files.
- Targeted high-risk secret scan on changed files - no real secrets; matches were synthetic test field names and token-storage assertions.
- Targeted trailing whitespace scan on changed files - no matches.
- `apps/web/next-env.d.ts` generated churn was restored.

Expanded tenant-surface validation on this branch:

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- `corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts --list` - passed; 3 browser tenant tests discovered.
- Docker Desktop was started locally and `docker compose -p ledgerbyte-browser-e2e -f infra/docker-compose.yml up -d postgres redis` passed with local Postgres and Redis healthy.
- Local Prisma migrations were deployed to the disposable Compose Postgres database.
- Local API and web dev servers were started on `http://localhost:4000` and `http://localhost:3000`.
- First opt-in expanded browser proof run reached the app and failed one dashboard assertion because the synthetic fixture used January 2026 activity while dashboard summary aggregates are current-period based.
- The fixture dates and report query window were tightened to create real posted activity in the current dashboard/report period.
- Opt-in expanded browser tenant proof with local API/web/Postgres - passed, 3 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- First `corepack pnpm test` attempt failed from a pre-existing API integration `beforeAll` timeout; the same suite passed by path in-band, and the second full `corepack pnpm test` passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `apps/web/next-env.d.ts` generated churn was restored again.

## Security and safety

- No hosted mutations were run.
- No hosted migrations were run.
- The browser fixture uses synthetic local test tenants.
- The browser spec uses cookie-authenticated login and asserts no auth tokens are persisted in browser localStorage.

## Remaining gaps

- Hosted/staging browser tenant proof.
- Real object-storage provider download isolation.
- Exhaustive browser route coverage for every module.
- Mutation-heavy browser cross-tenant form submissions.
- Page-level navigation to every foreign detail route. This branch covers customer, sales invoice, and purchase bill page-level foreign detail URLs plus direct API probes for journal/account boundaries; the web app currently has no journal detail page.

## Reviewer focus areas

Please review:

- Browser use of the existing cookie-authenticated Playwright login helper.
- Local-only DB URL guard.
- Browser fixture cleanup.
- Cross-tenant assertions in `tests/e2e/tenant-isolation-browser.spec.ts`.
- Documented remaining gaps.
