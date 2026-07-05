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
- Dashboard summary API totals and rendered dashboard money values are scoped to the active tenant.
- Dashboard report net profit, monthly sales trend, monthly net-profit trend, and receivables aging bucket amounts are scoped to the active tenant.
- Customer list UI shows tenant A customer records and not tenant B records.
- Global search API and UI results exclude tenant B markers while tenant A results still appear.
- Global search API denies tenant B supplier, invoice, bill, journal, and amount markers while still returning tenant A customer, supplier, invoice, bill, and journal markers.
- Team settings UI shows tenant A membership data and not tenant B membership data.
- Security settings UI shows tenant A identity and organization context without tenant B identity or organization data.
- Document settings and storage settings load in tenant A context without tenant B identity, document, or storage markers.
- Organization document settings and storage migration-plan APIs are rejected for a foreign organization context.
- Tenant A customer detail URL renders tenant A data without tenant B markers.
- Direct browser navigation to a tenant B customer detail URL from tenant A context renders a safe not-found state without tenant B markers.
- Direct customer detail API URL for a tenant B customer id returns not found when requested from tenant A context.
- Sales invoice list/detail UI, purchase bill list/detail UI, and journal list UI show tenant A records and not tenant B records.
- Direct API probes for tenant B invoice detail/PDF data, bill detail/PDF data, journal detail, and chart-of-account detail return not found from tenant A context.
- Profit and loss report JSON excludes tenant B activity.
- Profit and loss CSV export excludes tenant B activity.
- Profit and loss PDF export is available for tenant A and rejected for tenant B organization context.
- Generated document listing excludes tenant B records.
- Generated document archive UI shows tenant A generated documents and not tenant B generated documents.
- Tenant A generated document and attachment downloads still work in browser cookie-auth context.
- Tenant B generated document and attachment downloads return not found when requested from tenant A context.

## Guard and permission model summary

The browser spec logs in through `/auth/login`, relying on httpOnly cookie auth and the readable CSRF cookie created by the API. The web runtime still stores only the active organization id in localStorage. Tenant-scoped browser requests include `x-organization-id`; `OrganizationContextGuard` must prove an active membership before the request reaches controllers/services.

The fixture gives User A full permissions in Organization A only and User B full permissions in Organization B only. Cross-tenant failures are therefore tenant-boundary failures rather than missing-permission failures.

## Bugs found

- Existing Playwright helper `loginByApi` wrote `ledgerbyte.accessToken` into browser localStorage. Runtime code already clears browser token storage, but the helper weakened browser E2E realism after the cookie-auth migration.
- The settings team page assertion used a non-exact heading locator, so Playwright could match both `Team members` and `Loading team members...` during browser E2E runs.

## Fixes implemented

- Updated `loginByApi` to delegate to a new cookie-authenticated `loginByBrowserApi` helper.
- `loginByBrowserApi` logs in through Playwright's browser request context so auth cookies are available to the browser page.
- The helper still returns the access token only for test-side API setup and no longer writes token values into browser localStorage.
- Added a local-only Prisma fixture for two synthetic tenants and browser-visible accounting records.
- Added `tests/e2e/tenant-isolation-browser.spec.ts`.
- Added a representative browser direct-URL proof for User A navigating to Tenant B's customer detail route.
- Added an explicit rendered dashboard money assertion so the browser UI shows Tenant A's amount and not Tenant B's amount.
- Expanded dashboard API assertions beyond one money field to cover report net profit, sales/net-profit trends, and receivables aging.
- Expanded search proof to tenant B supplier, invoice, bill, journal, and amount markers.
- Expanded browser settings proof to team, security, document settings, and storage settings surfaces.
- Expanded direct URL/API proof to sales invoice, purchase bill, journal, and chart-of-account surfaces.
- Expanded generated-document proof to include the `/documents` UI archive and tenant A download success before tenant B download denial.
- Tightened the team settings heading assertion to the exact page heading.
- The direct foreign customer route assertion allows only the known browser resource error from the related collection lookup after proving the page renders a safe not-found state and no Tenant B markers.

## Database changes

None. The new fixture writes synthetic data only to the explicitly supplied disposable local test database during opt-in browser E2E execution and cleans up by deleting the seeded organizations and users.

## Accounting logic changes

None.

## Remaining untested areas

- Hosted/staging browser proof.
- Real object-storage provider download isolation beyond database-backed generated documents and attachments.
- Every route in inventory, banking, tax, compliance, returns, collections, and advanced document workflows.
- Mutation-heavy browser workflows such as cross-tenant form submissions, because this lane focuses on switching, read, search, report, export, and download boundaries.
- Page-level navigation to every foreign detail route; this lane covers customer, sales invoice, and purchase bill page-level foreign detail URLs plus direct API probes for journal and account boundaries. The web app currently has a journal list route, not a journal detail page.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `LEDGERBYTE_API_URL=http://localhost:4010 LEDGERBYTE_WEB_URL=http://localhost:3010 LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts` - passed in default mode with 3 skipped tests.
- `LEDGERBYTE_BROWSER_TENANT_E2E=1 LEDGERBYTE_TEST_DATABASE_URL=<allowed local test Postgres URL> LEDGERBYTE_API_URL=http://localhost:4010 LEDGERBYTE_WEB_URL=http://localhost:3010 LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts` - passed with 3 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. API: 167 suites passed, 1531 tests passed, 9 skipped. Web: 157 suites passed, 692 tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff -- apps/web/next-env.d.ts` - showed generated Next.js churn only; restored.
- Targeted high-risk secret scan on changed files - no real secrets; matches were token-storage assertions and the synthetic fixture password field.
- Targeted trailing whitespace scan on changed files - no matches.
- `git diff --check` - passed with existing CRLF normalization warnings for changed text files.

Follow-up dashboard UI-scope assertion branch:

- `corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts` - passed in default mode with 3 skipped tests.
- Opt-in local browser proof with `LEDGERBYTE_BROWSER_TENANT_E2E=1`, local API/web on `http://localhost:4010` and `http://localhost:3010`, and disposable local Postgres URL - passed, 3 tests.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` with local placeholder URL - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 167 suites passed with 9 skipped tests and the existing worker-exit warning, web reported 157 suites passed.
- `corepack pnpm build` - passed; generated `apps/web/next-env.d.ts` churn was restored afterward.
- `corepack pnpm verify:diff` - passed.
- `git diff -- apps/web/next-env.d.ts` - no remaining diff after restore.
- Targeted high-risk secret scan on changed files - no real secrets; matches were token-storage assertions and the synthetic fixture password field.
- Targeted trailing whitespace scan on changed files - no matches.
- `git diff --check` - passed with existing CRLF normalization warnings for changed text files.

Expanded browser E2E tenant-surface branch:

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- `corepack pnpm exec playwright test tests/e2e/tenant-isolation-browser.spec.ts --list` - passed; 3 browser tenant tests discovered.
- Docker Desktop was started locally; `docker compose -p ledgerbyte-browser-e2e -f infra/docker-compose.yml up -d postgres redis` - passed with local Postgres and Redis healthy.
- Local Prisma migrations were deployed to the disposable Compose Postgres database; 78 migrations applied.
- Local API and web dev servers were started on `http://localhost:4000` and `http://localhost:3000`.
- First opt-in expanded browser proof run reached the app and failed one dashboard assertion because the synthetic fixture used January 2026 activity while the dashboard summary reports current-month and last-six-month aggregates.
- Updated the synthetic fixture dates and report query window so the browser proof creates real posted activity in the current dashboard/report period.
- Opt-in expanded browser proof with `LEDGERBYTE_BROWSER_TENANT_E2E=1`, local API/web, and an allowed disposable local Postgres URL - passed, 3 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- First `corepack pnpm test` attempt - failed from a pre-existing `src/tenant-isolation-http.integration.spec.ts` `beforeAll` timeout during the full parallel API run.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/tenant-isolation-http.integration.spec.ts --runInBand` - passed, 11 tests.
- Second `corepack pnpm test` attempt - passed; API reported 167 suites passed with 9 skipped tests, web reported 157 suites passed.
- `corepack pnpm build` - passed; generated `apps/web/next-env.d.ts` churn was restored afterward.
- `corepack pnpm verify:diff` - passed.

## Remaining risks

- The browser E2E proof requires local API/web servers and a migrated disposable local database.
- Normal E2E runs skip this tenant proof unless the explicit opt-in environment variable is set.
- The browser spec samples representative high-risk UI/API surfaces and does not replace exhaustive route-by-route tenant testing.
- Hosted/staging browser tenant proof remains unrun and requires the separately prepared approval packet before any hosted execution.

## Next recommended prompt

After this lane is reviewed and merged, start a fresh clean worktree from updated `origin/main` for hosted staging tenant-isolation proof. Keep it read-only unless an approved staging mutation gate is explicitly provided, do not run hosted migrations, and document all covered and blocked areas.
