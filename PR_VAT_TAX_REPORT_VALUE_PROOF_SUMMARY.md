# Add VAT/tax report value proof pack

## Summary

This PR adds a local-only VAT/tax report value proof pack for LedgerByte's current internal-review VAT surfaces.

It proves:

- VAT Summary values from posted VAT payable/receivable journal activity.
- VAT Return JSON values from finalized sales invoices and purchase bills.
- VAT Return internal-review CSV values match JSON and source-document totals.
- Date range boundaries are respected.
- Tenant scoping remains enforced for VAT Summary, VAT Return JSON, and VAT Return CSV.
- Tenant B VAT/tax data does not appear in Tenant A JSON or CSV.
- VAT Return wording remains internal-review/non-filing and does not claim official submission.

## Scope boundaries

- Local/test database only.
- Synthetic fixtures only.
- No hosted mutations.
- No hosted migrations.
- No cleanup execute mode.
- No provider/storage API calls.
- No tax authority calls.
- No UAE ASP or ZATCA calls.
- No real customer data.
- No compliance production claim changes.
- No production runtime code changes.
- No accounting logic changes.
- No Prisma schema or migration changes.

## Test coverage added

- `apps/api/src/vat-tax-report-value-proof.integration.spec.ts`

The spec is skipped by default except for guard tests. The full DB-mutating proof requires:

- `LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` pointing at a disposable local Postgres database

The spec rejects hosted, non-local, non-Postgres, and production-looking database URLs. It does not fall back to `DATABASE_URL`.

## Bugs found

No production runtime defect was found.

No accounting logic defect was found.

## Validation performed

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with a local placeholder URL - passed.
- Default targeted VAT/tax proof - passed, 5 URL-gate tests and 4 skipped DB proof tests.
- Opt-in local DB VAT/tax proof - not run because no disposable local Postgres database was available; local Docker Desktop/Postgres startup was blocked before any database target was reached.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed, with the existing API Jest worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `apps/web/next-env.d.ts` generated build churn was restored; final generated-file check has no diff.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk credential scan - no real credentials; initial matches were documentation wording only and were removed before final scan.

## Remaining gaps

- Hosted/staging VAT/tax report proof.
- Browser E2E VAT/tax report value proof.
- VAT Summary PDF text parsing.
- Official filing format, filing approval workflow, tax-authority submission, UAE ASP integration, and ZATCA integration.
- Accountant/tax-advisor approval of VAT terminology, signs, and filing-ready layout.
- Multi-currency, branch-specific, reverse-charge, exempt, zero-rated, and partial-recovery VAT scenarios.
