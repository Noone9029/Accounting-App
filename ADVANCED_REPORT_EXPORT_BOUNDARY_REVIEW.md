# Advanced Report Export Boundary Review

## Scope

This lane fixes and documents the local-only API boundary for the existing advanced report endpoints:

- `GET /reports/cash-flow`
- `GET /reports/revenue-trend`
- `GET /reports/top-customers`
- `GET /reports/top-products-services`

These advanced reports remain JSON-only. This branch does not add CSV export, PDF export, report-pack generation, archive writes, download routes, report math changes, accounting logic changes, Prisma schema changes, migrations, UI behavior, hosted mutations, hosted migrations, email/provider calls, banking/reconciliation work, UAE ASP work, or ZATCA work.

## Finding

The advanced report endpoints accepted unsupported export query strings such as `?format=csv` and `?format=pdf` but ignored them and returned JSON. That made the export/download boundary ambiguous and could mislead clients into treating JSON responses as implemented exports.

## Fix Implemented

- Added a controller-level JSON-only format guard for the four advanced report endpoints.
- Allowed omitted `format`, `format=json`, and mixed-case JSON values such as `format=JSON` and `format=JsOn`.
- Rejected `format=csv`, `format=pdf`, and any other non-JSON format with a clear `BadRequestException`.
- Ensured unsupported export requests fail before the advanced report service method is called.
- Updated the API catalog to document the advanced reports as JSON-only.

## Tests Added

Updated `apps/api/src/reports/reports.controller.spec.ts` to prove:

- Existing advanced report requests without `format` still call the JSON report service.
- Explicit JSON requests, including mixed-case JSON, still call the JSON report service.
- Unsupported CSV and PDF requests are rejected for all four advanced reports.
- Unsupported export requests do not call the advanced report services.
- Unsupported export requests do not call the core CSV/PDF export helpers.

## Explicit Non-Changes

- No report calculations changed.
- No accounting logic changed.
- No Prisma schema or migration changed.
- No UI behavior changed.
- No hosted proof, hosted mutation, hosted migration, cleanup execute, provider/storage call, email send, UAE ASP, ZATCA, or banking/reconciliation work was run.
- No fake CSV/PDF export implementation was added.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/reports/reports.controller.spec.ts` - passed, 36 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- First `corepack pnpm test` attempt - failed in unrelated `tenant-isolation-http.integration.spec.ts` beforeAll hook timeout under full-suite load.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/tenant-isolation-http.integration.spec.ts` - passed, 11 tests.
- Second `corepack pnpm test` attempt - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - build-generated Next.js route-type churn was detected and restored; final generated-file check has no diff.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk credential scan - no real credentials; full-file matches are existing API catalog security wording or review-document scan wording.

## Remaining Gaps

- Real CSV/PDF exports for advanced reports remain unimplemented.
- Advanced report export/download browser E2E proof remains future work.
- Report-pack generation and pack-level downloads remain separate lanes.
- Hosted/staging proof remains blocked until an approved owner packet exists.
- Accountant-certified advanced report layouts remain future work.

## Next Recommended Prompt

Codex, review the advanced report export boundary PR for owner-review readiness only. Confirm diff scope, test quality, generated-file cleanliness, credential scan, API catalog wording, and that no report math, accounting logic, Prisma schema, UI behavior, hosted operations, banking/reconciliation, UAE ASP, or ZATCA work changed.
