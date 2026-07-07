# Advanced report web routes

## Summary

This PR exposes existing read-only advanced report API endpoints in the web app:

- Cash Flow
- Revenue Trend
- Top Customers
- Top Products & Services

It adds route pages, report-index navigation, app-route metadata, global-search entries, report-pack source-link navigability, focused frontend tests, and review documentation.

## Files Changed

- `ADVANCED_REPORT_WEB_ROUTES_REVIEW.md`
- `PR_ADVANCED_REPORT_WEB_ROUTES_SUMMARY.md`
- `apps/web/src/app/(app)/reports/cash-flow/page.tsx`
- `apps/web/src/app/(app)/reports/revenue-trend/page.tsx`
- `apps/web/src/app/(app)/reports/top-customers/page.tsx`
- `apps/web/src/app/(app)/reports/top-products-services/page.tsx`
- `apps/web/src/components/reports/report-pages.tsx`
- `apps/web/src/components/reports/report-pages.test.tsx`
- `apps/web/src/lib/app-routes.ts`
- `apps/web/src/lib/global-search.ts`
- `apps/web/src/lib/report-packs.ts`
- `apps/web/src/lib/report-packs.test.ts`
- `apps/web/src/lib/reports.ts`
- `apps/web/src/lib/reports.test.ts`
- `apps/web/src/lib/types.ts`
- `apps/web/src/app/(app)/report-packs/page.test.tsx`

## Runtime Impact

Web UI behavior changes: the four advanced reports are now reachable from `/reports`, global search, direct routes, and report-pack source links.

No production accounting logic changed.

No API report calculations changed.

No Prisma schema or migrations changed.

No auth, CSRF, JWT/session, tenant isolation, cleanup, banking/reconciliation, UAE ASP, ZATCA, hosted/provider/storage, or compliance submission behavior changed.

## Tests Added Or Updated

- Report index helper coverage for the new Management reports group.
- Report-pack helper coverage for navigable advanced report sources.
- Report-pack page coverage for advanced source-report links.
- Report-page component coverage for Cash Flow, Revenue Trend, Top Customers, and Top Products & Services.

## Validation

Passed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with local placeholder URL
- `corepack pnpm --filter @ledgerbyte/web test -- report-pages report-packs reports app-routes global-search`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm verify:diff`
- `git diff --check`
- Changed-file trailing whitespace scan
- Targeted high-risk credential scan

`apps/web/next-env.d.ts` generated Next.js churn was detected after build and restored.

`corepack pnpm test` printed the existing web Jest worker teardown warning, but exited successfully.

## Remaining Gaps

- Advanced report CSV/PDF exports remain unimplemented.
- Report-pack generation/download remains disabled.
- Hosted/staging proof remains blocked until an approved packet is supplied.
- Provider/storage/signed URL behavior remains outside this PR.
- Production accountant-certified report definitions/layouts remain future work.

## Reviewer Focus Areas

- Confirm the PR only exposes existing read-only API report surfaces in the web app.
- Confirm no accounting math, API runtime, schema/migration, hosted, provider, UAE ASP, ZATCA, or banking scope is included.
- Confirm advanced pages do not display fake export/download/generation controls.
