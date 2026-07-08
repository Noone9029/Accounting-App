# VAT/Tax Report Browser E2E Proof Review

## Scope

This lane adds an opt-in, local-only Playwright proof for LedgerByte's browser-facing VAT Summary and draft VAT Return review surfaces.

It starts from updated `origin/main` after PR #266, the VAT/tax report value proof pack. It does not run hosted proof, hosted mutations, hosted migrations, cleanup execute mode, provider/storage APIs, tax authority calls, UAE ASP calls, ZATCA calls, or real customer data.

## Local-only execution gate

The browser proof is skipped unless explicitly enabled.

To run the full proof, start local API and web servers against a disposable local Postgres database, then set:

- `LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to an allowed disposable local Postgres URL
- `LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID` to a synthetic proof-run id
- `LEDGERBYTE_WEB_URL` to a local web URL, for example `http://localhost:3000`
- `LEDGERBYTE_API_URL` to a local API URL, for example `http://localhost:4000`
- `LEDGERBYTE_E2E_SEED_WORKFLOWS=false` to avoid unrelated demo seeding during this proof

The spec rejects non-local web/API URLs, non-local database hosts, non-Postgres database URLs, and production-looking database names. It requires `LEDGERBYTE_TEST_DATABASE_URL` when enabled and does not fall back to `DATABASE_URL`.

## Areas covered

- Browser login through the merged cookie/session auth flow.
- No legacy browser auth-token persistence.
- VAT Summary UI values from posted VAT Payable `220` and VAT Receivable `230` journal activity.
- VAT Summary date filter boundaries.
- VAT Summary CSV/PDF controls are visible for an authorized user.
- VAT Return UI values from finalized sales invoices and finalized purchase bills.
- VAT Return date filter boundaries.
- VAT Return internal-review CSV control is visible and returns a CSV response.
- VAT Return browser-authenticated JSON values match the synthetic source-document totals.
- VAT Return internal-review CSV values match JSON/source-document totals.
- Draft, voided, and out-of-range source documents are excluded from the browser-authenticated CSV.
- Tenant scoping remains enforced for VAT Summary, VAT Return JSON, and VAT Return CSV.
- Tenant B values and source-document markers do not appear in Tenant A browser UI or browser-authenticated API/CSV responses.
- Wording remains internal-review/non-filing and does not claim official submission, tax-authority acceptance, ZATCA approval, or certified VAT return status.

## Guard and permission model summary

The proof logs in with `POST /auth/login` through Playwright's browser request context. Auth remains in cookie/session state, while the active organization id is set by the existing E2E helper.

The synthetic Tenant A user has membership only in Tenant A. The synthetic Tenant B user and organization exist only to provide cross-tenant markers and direct API targets. Both roles use full permissions so failures are tenant-boundary failures, not missing-permission failures.

The browser routes call the real web report pages and real API routes:

- `GET /reports/vat-summary`
- `GET /reports/vat-summary?format=csv`
- `GET /reports/vat-summary/pdf`
- `GET /reports/vat-return`
- `GET /reports/vat-return?format=csv`

The cross-tenant direct probes use the Tenant A browser session with Tenant B's organization id and expect authorization denial.

## Bugs found

No production runtime defect was found.

No accounting logic defect was found.

Fixture/test-only finding:

- The first opt-in browser run proved the UI renders grouped currency values like `SAR 1,000.00`; the test helper was updated to match the existing renderer instead of changing production code.

## Fixes implemented

- Added `tests/e2e/vat-tax-report-browser.spec.ts`.
- Added proof-specific opt-in env gates and local URL/database safety checks.
- Added synthetic two-tenant VAT browser fixtures with users, memberships, posted VAT account journals, finalized/draft/voided/out-of-range source documents, and scoped cleanup.
- Added UI assertions for VAT Summary and VAT Return values, date filters, CSV controls, tenant isolation, and non-filing wording.
- Added browser-authenticated JSON/CSV assertions for VAT Return values and source-document boundaries.
- Added this review document and the PR summary document.

No production runtime code was changed. No accounting logic was changed. No Prisma schema or migration was changed.

## Remaining untested areas

- Hosted/staging VAT/tax report browser proof.
- VAT Summary PDF text parsing.
- VAT Return PDF output, because VAT Return currently exposes internal-review CSV only.
- Official filing format, filing approval workflow, tax-authority submission, UAE ASP integration, and ZATCA integration.
- Accountant/tax-advisor approval of VAT terminology, signs, and filing-ready layout.
- Multi-currency, branch-specific, reverse-charge, exempt, zero-rated, and partial-recovery VAT scenarios.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --dir apps/api exec prisma validate` - passed.
- `docker compose -p ledgerbyte-vat-browser-proof -f infra/docker-compose.yml up -d postgres redis` - passed for local disposable services only.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api db:migrate` - passed against local disposable Postgres only.
- `corepack pnpm exec playwright test tests/e2e/vat-tax-report-browser.spec.ts --list` - passed after Prisma client generation.
- Default targeted browser proof with opt-in unset - passed, 5 guard tests and 1 skipped mutating proof.
- Opt-in local browser proof with `LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E=1` - first run failed on a test-only grouped-currency assertion; rerun passed, 6 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API and web suites both printed the repo's existing Jest worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; it detected generated `apps/web/next-env.d.ts` churn from build.
- `apps/web/next-env.d.ts` generated churn was restored; final generated-file check has no diff.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk credential scan - no real credentials; matches are synthetic fixture credential and token field names only.

## Remaining risks

- The opt-in proof requires local API/web servers and a migrated disposable local Postgres database.
- Normal Playwright runs skip this browser proof unless the explicit opt-in environment variable is set.
- The proof verifies LedgerByte's current internal-review VAT browser surfaces only. It does not prove official filing readiness or authority-specific compliance.
- PDF text parsing is outside this lane.

## Next recommended prompt

Codex, review the VAT/tax report browser E2E proof PR for owner-review readiness only. Confirm diff scope, local-only guard behavior, browser proof quality, generated-file cleanliness, credential scan results, and verification status. Do not add scope, do not run hosted mutations, do not run hosted migrations, do not change accounting logic, and do not start UAE ASP or ZATCA work.
