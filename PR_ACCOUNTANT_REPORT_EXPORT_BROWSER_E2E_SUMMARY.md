# Accountant report and export browser E2E proof

## Summary

This PR adds an opt-in, local-only Playwright proof pack for paid-beta accountant report/export browser readiness.

It proves browser-facing paths using synthetic tenants and disposable local Postgres data:

- Dashboard report-summary UI values.
- Profit and Loss, Balance Sheet, Trial Balance, General Ledger, Aged Receivables, and Aged Payables UI routes.
- Customer and supplier detail/statement UI routes.
- CSV and PDF export buttons on Profit and Loss.
- Generated-document archive UI and browser download action.
- Direct foreign invoice, bill, report, PDF, generated-document, attachment, and statement probes.
- Tenant isolation: Tenant B markers do not appear in Tenant A browser UI, export responses, or browser-authenticated download/probe responses.

## Files changed

- `ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E_REVIEW.md`
- `PR_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E_SUMMARY.md`
- `tests/e2e/accountant-report-export-browser.spec.ts`
- `tests/e2e/utils/tenant-isolation-browser-fixture.ts`

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant guard, CSRF, JWT/session, cleanup, hosted, provider, object-storage, banking, reconciliation, UAE ASP, ZATCA, or UI behavior changed.

## Test behavior

The Playwright proof is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E=1`
- `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID` is set to a synthetic proof-run id
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed disposable local Postgres URL
- `LEDGERBYTE_WEB_URL` and `LEDGERBYTE_API_URL` are local URLs

Normal Playwright execution runs only the local guard tests and skips the DB-mutating browser proof block.

The spec requires `LEDGERBYTE_TEST_DATABASE_URL` when enabled, rejects non-local/hosted URLs, rejects production-looking database names, and does not fall back to `DATABASE_URL`.

## Safety

- No hosted proof was executed.
- No hosted mutations were run.
- No hosted migrations were run.
- No cleanup execute mode was run.
- No provider/storage APIs were called.
- No real customer data was used.
- Fixtures are synthetic and marker-scoped.
- Cleanup deletes only the seeded synthetic organizations and users.

## Validation

Passed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with local placeholder URL
- Local disposable Postgres/Redis startup
- Local-only Prisma migrate deploy against disposable Postgres
- Default Playwright proof run with opt-in unset: 5 passed, 1 skipped
- Opt-in local accountant report/export browser proof: 6 passed
- Existing accountant workflow browser E2E with short proof id `awbe2e`: 6 passed
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm verify:diff`
- `git diff --check`

`apps/web/next-env.d.ts` generated churn was detected after build and restored.

`corepack pnpm test` printed the existing web Jest worker teardown warning, but exited successfully.

## Bugs found and fixed

No production runtime defect was found in this lane.

No accounting logic defect was found in this lane.

Fixture/test-only fixes:

- Shared browser tenant fixture now keeps synthetic emails short while preserving long proof-run markers in tenant-visible data.
- Browser report/statement controls use exact Playwright selectors.
- CSV content proof uses an authenticated browser-context fetch because the UI download helper consumes clicked download bodies.

## Remaining gaps

- Hosted/staging report/export browser proof.
- Exhaustive browser coverage for every report/export/PDF button variant.
- VAT return CSV and VAT summary value proof.
- Report-pack generation and bundle downloads.
- Object-storage/provider-backed generated-document and attachment downloads.
- Signed URL behavior.
- Dedicated download audit-log entries, because current download routes do not write them.
- Advanced tax, multi-currency, inventory, banking, reconciliation, UAE Peppol, ZATCA, ASP, email, and provider workflows.

## Reviewer focus areas

- Confirm the spec uses real browser routes, cookie/session login, organization context, and report/export/download UI paths.
- Confirm the DB guard remains local-only and opt-in.
- Confirm Tenant B data is absent from Tenant A report, export, statement, generated-document, and direct URL probe surfaces.
- Confirm no runtime/accounting/schema/UI/provider/compliance changes are included.
