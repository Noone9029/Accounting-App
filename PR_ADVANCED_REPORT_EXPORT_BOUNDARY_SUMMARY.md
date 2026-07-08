# Guard advanced report export boundary

## Summary

This PR makes the advanced report export boundary explicit.

Advanced report endpoints remain JSON-only:

- `GET /reports/cash-flow`
- `GET /reports/revenue-trend`
- `GET /reports/top-customers`
- `GET /reports/top-products-services`

Unsupported export requests such as `?format=csv` and `?format=pdf` now fail clearly before report generation instead of being ignored and returning JSON.

## Files Changed

- `ADVANCED_REPORT_EXPORT_BOUNDARY_REVIEW.md`
- `PR_ADVANCED_REPORT_EXPORT_BOUNDARY_SUMMARY.md`
- `apps/api/src/reports/reports.controller.ts`
- `apps/api/src/reports/reports.controller.spec.ts`
- `docs/API_CATALOG.md`

## Boundary Behavior

- Omitted `format` continues to return JSON.
- `format=json` continues to return JSON.
- Mixed-case JSON values such as `format=JSON` and `format=JsOn` continue to return JSON.
- `format=csv` is rejected with a clear unsupported-export error.
- `format=pdf` is rejected with a clear unsupported-export error.
- Other non-JSON formats are rejected with the same JSON-only boundary.
- Unsupported formats do not call the advanced report service methods.
- Unsupported formats do not call core CSV/PDF export helpers.

## Runtime Impact

API behavior changes only for unsupported advanced report export query strings. Those requests now return a clear bad-request error.

No report math changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant isolation, CSRF, JWT/session, cleanup, hosted, provider/storage, email, banking/reconciliation, UAE ASP, ZATCA, or UI behavior changed.

## Tests

Updated `apps/api/src/reports/reports.controller.spec.ts` to cover JSON and unsupported export boundaries for the four advanced reports.

## Validation

Passed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with local placeholder URL
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/reports/reports.controller.spec.ts`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/tenant-isolation-http.integration.spec.ts`
- `corepack pnpm test` on rerun
- `corepack pnpm build`
- `corepack pnpm verify:diff`
- `git diff --check`
- Generated-file check after restoring `apps/web/next-env.d.ts` build churn
- Changed-file trailing whitespace scan
- Targeted high-risk credential scan

The first `corepack pnpm test` attempt failed in unrelated `tenant-isolation-http.integration.spec.ts` beforeAll timeout under full-suite load. The isolated spec passed, and the full suite passed on rerun.

The high-risk credential scan found no real credentials. Full-file matches were existing API catalog security wording or review-document scan wording.

## Safety

- No hosted proof was executed.
- No hosted mutations were run.
- No hosted migrations were run.
- No cleanup execute mode was run.
- No provider/storage APIs were called.
- No email was sent.
- No fake export implementation was added.

## Remaining Gaps

- Real advanced report CSV/PDF exports remain unimplemented.
- Advanced report export/download browser E2E proof remains future work.
- Report-pack generation and pack downloads remain separate lanes.
- Hosted/staging proof remains blocked pending an approved packet.

## Reviewer Focus Areas

- Confirm the PR only guards unsupported advanced report export formats.
- Confirm advanced reports remain JSON-only.
- Confirm no report math, accounting logic, Prisma schema, UI behavior, hosted operations, provider/storage, email, banking/reconciliation, UAE ASP, or ZATCA scope is included.
