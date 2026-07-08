# VAT/Tax Report Value Proof Review

## Scope

This lane adds a local-only, opt-in Prisma proof for VAT Summary and VAT Return value correctness against synthetic test data.

It starts from updated `origin/main` after the accountant report/export and advanced report export boundary proof lanes. It does not run hosted mutations, hosted migrations, cleanup execute mode, provider/storage APIs, tax authority calls, UAE ASP calls, ZATCA calls, or real customer data.

## Local-only execution gate

The DB-mutating proof is skipped by default. Normal Jest execution runs only the URL-gate tests.

To run the full proof, the caller must set:

- `LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to a disposable local Postgres URL

The spec requires `LEDGERBYTE_TEST_DATABASE_URL` when the opt-in flag is enabled. It rejects non-Postgres URLs, non-local hosts, and production-looking database names. It does not fall back to `DATABASE_URL`.

## Areas tested

- VAT Summary values from posted journal activity in VAT Payable `220` and VAT Receivable `230`.
- VAT Return JSON values from finalized sales invoices and finalized purchase bills.
- VAT Return internal-review CSV values matching JSON totals and source-document totals.
- Inclusive `from` and `to` date boundaries.
- Exclusion of out-of-range source documents and out-of-range posted VAT journal activity.
- Exclusion of draft sales invoices and voided purchase bills from VAT Return.
- Tenant scoping for VAT Summary, VAT Return JSON, and VAT Return CSV.
- Tenant B VAT/tax document markers and distinctive values do not appear in Tenant A JSON or CSV output.
- Internal-review, non-filing wording remains present and no official submission claim is introduced.

## Guard and permission model summary

This proof exercises `ReportsService` directly against a local Prisma database. The service reads data with an explicit `organizationId`:

- `vatSummary` filters accounts and journal lines by `organizationId`.
- `vatReturn` filters finalized sales invoices and purchase bills by `organizationId`.
- `vatReturnCsvFile` reuses the same `vatReturn` result before rendering the internal-review CSV.

Route authentication, cookie auth, CSRF, permission guards, and tenant context guards are covered by prior merged security and tenant-isolation proof lanes. This lane is focused on persisted VAT/tax report values and tenant data boundaries in the report service.

## Bugs found

No production runtime defect was found.

No accounting logic defect was found.

## Fixes implemented

- Added `apps/api/src/vat-tax-report-value-proof.integration.spec.ts`.
- Added explicit local DB safety gates for the new opt-in proof.
- Added synthetic two-tenant fixtures with posted VAT account journals and finalized/draft/voided/out-of-range source documents.
- Added Tenant A/Tenant B negative assertions for JSON and CSV outputs.
- Added this review document and the PR summary document.

No production runtime code was changed. No accounting logic was changed. No Prisma schema or migration was changed.

## Remaining untested areas

- Hosted/staging VAT/tax report proof.
- Browser E2E VAT/tax report value proof.
- VAT Summary PDF text parsing.
- Official filing format, filing approval workflow, tax-authority submission, UAE ASP integration, and ZATCA integration.
- Accountant/tax-advisor approval of VAT terminology, signs, and filing-ready layout.
- Multi-currency, branch-specific, reverse-charge, exempt, zero-rated, and partial-recovery VAT scenarios.

## Commands run

- `git fetch origin main --prune` - passed.
- `git log -1 --oneline origin/main` - `c53cdef9 Merge pull request #265 from Noone9029/codex/advanced-report-export-boundary-proof`.
- `gh pr list --state open` - passed; no VAT/tax report value proof PR was open.
- `gh pr list --state merged --limit 80` - passed; older VAT return foundation PR #29 was already merged, but no VAT/tax report value proof lane was found.
- `git worktree add E:\Worktrees\Accounting-App\vat-tax-report-value-proof -b codex/vat-tax-report-value-proof origin/main` - passed.
- `corepack pnpm install --frozen-lockfile` - passed, with the repo's standard ignored build-script warning.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- Default targeted VAT/tax proof: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/vat-tax-report-value-proof.integration.spec.ts` - passed, 5 URL-gate tests and 4 skipped DB proof tests.
- Local Docker Postgres attempt: `docker compose -p ledgerbyte-vat-tax-report-proof -f infra/docker-compose.yml up -d postgres` - blocked because the local Docker Desktop Linux engine was not running; no hosted target was used.
- Local Postgres port check: `Test-NetConnection -ComputerName localhost -Port 5432` - no listener on `localhost:5432`.
- Local Docker Desktop service/app start attempts - blocked by local OS/tool errors; no hosted target was used.
- Opt-in local DB VAT/tax proof with `LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION=1` - not run because no disposable local Postgres database was available.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 175 passed suites, 32 skipped tests, and 1595 passed tests; web reported 157 passed suites and 694 passed tests. The API Jest command printed its existing worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; it detected generated `apps/web/next-env.d.ts` churn from build.
- `apps/web/next-env.d.ts` generated churn was restored; final generated-file check has no diff.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk credential scan - no real credentials; initial matches were documentation wording only and were removed before final scan.

## Remaining risks

- The opt-in proof requires a disposable local Postgres database with the current Prisma schema.
- Normal test runs skip the DB-mutating proof by design; CI needs an explicit local/test DB job to run it continuously.
- The proof verifies LedgerByte's current internal-review VAT surfaces only. It does not prove official filing readiness or authority-specific compliance.
- This local run did not execute the opt-in DB proof because Docker Desktop/Postgres was unavailable on the machine. The proof code and guards are present, but owner review should run it in a local Postgres environment before treating this lane as fully value-proven.

## Next recommended prompt

Codex, review the VAT/tax report value proof PR for owner-review readiness only. Confirm diff scope, proof quality, local-only DB guard behavior, generated-file cleanliness, credential scan results, and verification status. Do not add scope, do not run hosted mutations, do not run hosted migrations, do not change accounting logic, and do not start UAE ASP or ZATCA work.
