# Tenant Isolation Browser E2E Review

## Scope

This lane adds a browser end-to-end tenant-isolation proof for organization switching and high-risk read/export/download surfaces.

No production runtime code, accounting logic, Prisma schema, migration files, or UI behavior are intentionally changed. The only code changes are Playwright test support and a local-only browser E2E spec.

## Local-only execution gate

The browser tenant proof is skipped unless explicitly enabled.

To run it, the caller must start local API and web servers, then set:

- `LEDGERBYTE_BROWSER_TENANT_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to a disposable local Postgres URL

The fixture refuses non-local database hosts and refuses database names that look production-oriented. It does not fall back to `DATABASE_URL`.

## Areas tested

- Cookie-authenticated browser login using Playwright's browser request context.
- No browser persistence of `ledgerbyte.accessToken` or legacy `accessToken`.
- Organization switching correction when localStorage is poisoned with a foreign organization id.
- Account menu organization switcher shows only organizations from the authenticated user's memberships.
- Direct browser fetch with a foreign `x-organization-id` is rejected.
- Dashboard summary totals are scoped to the active tenant.
- Customer list UI shows tenant A customer records and not tenant B records.
- Global search API and UI results exclude tenant B markers while tenant A results still appear.
- Team settings UI shows tenant A membership data and not tenant B membership data.
- Tenant A customer detail URL renders tenant A data without tenant B markers.
- Direct customer detail API URL for a tenant B customer id returns not found when requested from tenant A context.
- Profit and loss report JSON excludes tenant B activity.
- Profit and loss CSV export excludes tenant B activity.
- Profit and loss PDF export is available for tenant A and rejected for tenant B organization context.
- Generated document listing excludes tenant B records.
- Tenant B generated document and attachment downloads return not found when requested from tenant A context.

## Guard and permission model summary

The browser spec logs in through `/auth/login`, relying on httpOnly cookie auth and the readable CSRF cookie created by the API. The web runtime still stores only the active organization id in localStorage. Tenant-scoped browser requests include `x-organization-id`; `OrganizationContextGuard` must prove an active membership before the request reaches controllers/services.

The fixture gives User A full permissions in Organization A only and User B full permissions in Organization B only. Cross-tenant failures are therefore tenant-boundary failures rather than missing-permission failures.

## Bugs found

- Existing Playwright helper `loginByApi` wrote `ledgerbyte.accessToken` into browser localStorage. Runtime code already clears browser token storage, but the helper weakened browser E2E realism after the cookie-auth migration.

## Fixes implemented

- Updated `loginByApi` to delegate to a new cookie-authenticated `loginByBrowserApi` helper.
- `loginByBrowserApi` logs in through Playwright's browser request context so auth cookies are available to the browser page.
- The helper still returns the access token only for test-side API setup and no longer writes token values into browser localStorage.
- Added a local-only Prisma fixture for two synthetic tenants and browser-visible accounting records.
- Added `tests/e2e/tenant-isolation-browser.spec.ts`.

## Database changes

None. The new fixture writes synthetic data only to the explicitly supplied disposable local test database during opt-in browser E2E execution and cleans up by deleting the seeded organizations and users.

## Accounting logic changes

None.

## Remaining untested areas

- Hosted/staging browser proof.
- Real object-storage provider download isolation beyond database-backed generated documents and attachments.
- Every route in inventory, banking, tax, compliance, returns, collections, and advanced document workflows.
- Mutation-heavy browser workflows such as cross-tenant form submissions, because this lane focuses on switching, read, search, report, export, and download boundaries.
- Page-level navigation to every foreign detail route; this lane uses a representative tenant A customer detail page plus direct API URL probes for foreign detail/download boundaries.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed after stopping the local API helper that held the Prisma Windows query-engine DLL from the browser proof run.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts` - passed in default mode with 3 skipped tests.
- `LEDGERBYTE_BROWSER_TENANT_E2E=1 LEDGERBYTE_TEST_DATABASE_URL=<allowed local test Postgres URL> LEDGERBYTE_API_URL=http://localhost:4000 LEDGERBYTE_WEB_URL=http://localhost:3010 LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts` - passed with 3 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. Existing web Jest worker open-handle warning was emitted, with all suites passing.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff -- apps/web/next-env.d.ts` - showed generated Next.js churn only; restored.
- Targeted high-risk secret scan on changed files - no real secrets; matches were synthetic test field names and token-storage assertions.
- Targeted trailing whitespace scan on changed files - no matches.
- `git diff --check` - passed with an existing CRLF normalization warning for `tests/e2e/utils/e2e-helpers.ts`.

## Remaining risks

- The browser E2E proof requires local API/web servers and a migrated disposable local database.
- Normal E2E runs skip this tenant proof unless the explicit opt-in environment variable is set.
- The browser spec samples representative high-risk UI/API surfaces and does not replace exhaustive route-by-route tenant testing.

## Next recommended prompt

After this lane is reviewed and merged, start a fresh clean worktree from updated `origin/main` for hosted staging tenant-isolation proof. Keep it read-only unless an approved staging mutation gate is explicitly provided, do not run hosted migrations, and document all covered and blocked areas.
