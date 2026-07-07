# Advanced Report Web Routes Review

## Scope

This lane exposes existing read-only advanced report API endpoints through LedgerByte web routes:

- `/reports/cash-flow`
- `/reports/revenue-trend`
- `/reports/top-customers`
- `/reports/top-products-services`

The API endpoints and report calculations already existed. This branch does not change accounting logic, Prisma schema, migrations, auth runtime, tenant isolation runtime, banking/reconciliation implementation, hosted proof execution, provider/storage behavior, UAE ASP, ZATCA, or compliance production claims.

Refero/Lazyweb screen search was attempted for report UI references, but the available account returned `NO_SUBSCRIPTION`. The implementation therefore stays intentionally close to the existing LedgerByte report-page patterns.

## Areas Covered

- Reports index now lists a Management reports group for the four advanced report routes.
- Route registry entries now mark the advanced report routes active under the existing `reports.view` permission.
- Global search can discover Cash Flow, Revenue Trend, Top Customers, and Top Products & Services.
- Report-pack preview source links now treat the four advanced web routes as navigable.
- Cash Flow page loads `GET /reports/cash-flow` and renders summary totals, period rows, basis, and notes.
- Revenue Trend page loads `GET /reports/revenue-trend` and renders revenue totals, monthly rows, basis, and notes.
- Top Customers page loads `GET /reports/top-customers` and renders ranked finalized-sales-invoice customer totals with customer links.
- Top Products & Services page loads `GET /reports/top-products-services` and renders ranked finalized-sales-invoice-line item/service totals.

## Guard And Permission Model Summary

All new route registry entries use `reports.view`, matching the existing reports family. The Next routes reuse the app shell's existing protected-route behavior and the report components use the existing `apiRequest` cookie-authenticated client and active organization hook.

No new API route, auth guard, permission guard, CSRF behavior, JWT/session behavior, or tenant-isolation runtime behavior is introduced.

## Bugs Found

No production accounting defect was found.

No API defect was found.

The web gap was that the API and report-pack manifest already referenced advanced reports, but the web app had no corresponding active pages. Report-pack preview therefore treated `/reports/cash-flow` and related sources as preview-only.

## Fixes Implemented

- Added four Next report route files.
- Added four report page components wired to existing read-only API endpoints.
- Added frontend response types for the existing API shapes.
- Added route registry, report index, report-pack navigability, and global-search entries.
- Added focused web tests proving the index, helper, report-pack link, and page rendering behavior.

## Explicit Non-Changes

- No accounting math changed.
- No API report service/controller behavior changed.
- No Prisma schema or migration changed.
- No CSV/PDF export endpoints were added for these advanced reports.
- No report-pack generation, pack download, archive write, email, scheduling, storage mutation, provider call, hosted mutation, hosted migration, tax-authority submission, UAE ASP, or ZATCA behavior was added.

## Remaining Untested Or Unimplemented Areas

- CSV/PDF export endpoints for the advanced report routes.
- Report-pack generation and pack-level downloads.
- Advanced report browser E2E against local seeded data.
- Comparative periods beyond the existing API responses.
- Custom branch/filter UI beyond the date range currently exposed.
- Hosted/staging proof.
- Accountant-reviewed production report definitions/layouts.
- Load/concurrency proof.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/web test -- report-pages report-packs reports` - failed before implementation as expected after dependencies were installed.
- `corepack pnpm --filter @ledgerbyte/web test -- report-pages report-packs reports app-routes global-search` - passed, 7 suites and 55 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. Web printed the existing Jest worker teardown warning but exited successfully.
- `corepack pnpm build` - passed and listed the four new advanced report routes.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated Next.js churn was detected after build and restored.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk credential scan - passed. Broad changed-file scan matched only existing safe type/property names in `apps/web/src/lib/types.ts` and the phrase `secret scan` in this review doc; diff-only scan found no matches.

## Remaining Risks

- These pages expose existing JSON report outputs only. Users still need separate proof lanes for advanced report exports, PDF rendering, report-pack execution, and hosted/customer-data behavior.
- Frontend tests mock API responses; backend report math remains covered by existing API tests.

## Next Recommended Prompt

Codex, review the advanced report web routes PR for owner-review readiness only. Confirm diff scope, tests, generated-file cleanliness, secret scan, route/permission model, and that no accounting logic, Prisma schema, hosted operations, banking/reconciliation implementation, UAE ASP, or ZATCA work changed.
