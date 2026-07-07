# Accountant report and export proof pack

## Summary

This PR adds a local-only HTTP proof pack for paid-beta accountant report/export readiness.

It proves guarded API routes using synthetic tenants and disposable local Postgres data:

- Core financial reports: profit and loss, balance sheet, trial balance, general ledger, dashboard summary, AR aging, and AP aging.
- Contact reports: customer ledger, customer statement, supplier ledger, and supplier statement.
- CSV exports: profit and loss, trial balance, AR aging, and AP aging.
- PDF/download routes: report PDF, sales invoice PDF data/PDF, purchase bill PDF data/PDF, generated-document download, and attachment download.
- Audit evidence: generated-document archive audit entries and tenant-scoped audit CSV export.
- Tenant isolation: direct Tenant B probes and organization-switching attempts are rejected or return Tenant A scoped data only.

## Files changed

- `ACCOUNTANT_REPORT_EXPORT_PROOF_REVIEW.md`
- `PR_ACCOUNTANT_REPORT_EXPORT_PROOF_SUMMARY.md`
- `apps/api/src/accountant-report-export-proof.integration.spec.ts`

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant guard, CSRF, JWT/session, cleanup, hosted, provider, object-storage, banking, reconciliation, UAE ASP, ZATCA, or UI behavior changed.

## Test behavior

The Prisma-backed HTTP proof is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed disposable local Postgres URL

Normal Jest runs execute only URL-gate tests and skip the DB-mutating proof block.

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

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Default targeted report/export proof - passed, 5 URL-gate tests and 5 skipped DB proof tests.
- First opt-in targeted report/export proof attempt - blocked because local Postgres was not listening on `localhost:5432`; no hosted target was used.
- Local Docker Compose Postgres - started locally and healthy.
- Local-only `corepack pnpm --filter @ledgerbyte/api db:migrate` - passed; no hosted migrations run.
- Opt-in targeted report/export proof with local test DB env - passed, 10 tests.
- Targeted existing accountant workflow proof default mode - passed, 5 URL-gate tests and 4 skipped DB proof tests.
- Targeted existing accountant workflow proof opt-in local DB mode - passed, 9 tests.
- Targeted existing tenant isolation proof set default mode - passed, 68 tests and 9 skipped DB proof tests.
- Targeted existing tenant isolation DB proof opt-in local DB mode - passed, 14 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. The web suite emitted its existing worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Generated-file check - `apps/web/next-env.d.ts` build churn was restored; no final diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; matches were synthetic test fields, safe local placeholder URLs, enum names, or documentation statements.

## Bugs found and fixed

No production runtime defect was found.

No accounting logic defect was found.

The only execution issue was environmental: local Postgres was not initially running. After starting the repo-local Postgres service and confirming migrations were current, the opt-in proof passed.

## Remaining gaps

- Hosted/staging report/export proof.
- Browser E2E report/export/download proof.
- Exhaustive coverage for every report/export/PDF variant.
- VAT return CSV and VAT summary value proof.
- Report-pack generation surfaces.
- Object-storage/provider-backed downloads and signed URL behavior.
- Dedicated download audit-log entries, because current download routes do not write them.
- Advanced tax, multi-currency, inventory, banking, reconciliation, UAE Peppol, ZATCA, ASP, email, and provider workflows.

## Reviewer focus areas

- Confirm the spec uses real HTTP controllers, auth/session cookies, organization/permission guards, and production services.
- Confirm the DB guard remains local-only and opt-in.
- Confirm Tenant B data is absent from Tenant A reports, exports, PDFs, downloads, statements, and audit export.
- Confirm no runtime/accounting/schema/UI/provider/compliance changes are included.
