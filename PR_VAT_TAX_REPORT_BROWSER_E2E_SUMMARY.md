# Add VAT/tax report browser E2E proof

## Summary

This PR adds a local-only browser E2E proof pack for LedgerByte's current internal-review VAT/tax report surfaces.

It proves browser-facing VAT report behavior using synthetic tenants and disposable local Postgres data:

- VAT Summary UI values from posted VAT payable/receivable activity.
- VAT Summary date filters and export controls.
- VAT Return UI values from finalized sales invoices and finalized purchase bills.
- VAT Return date filters.
- VAT Return internal-review CSV control and response.
- Browser-authenticated VAT Return JSON and CSV values match source-document totals.
- Tenant scoping remains enforced for VAT Summary, VAT Return JSON, and VAT Return CSV.
- Tenant B values do not appear in Tenant A browser UI or browser-authenticated API/CSV responses.
- Wording remains internal-review/non-filing and does not claim official submission.

## Files changed

- `VAT_TAX_REPORT_BROWSER_E2E_REVIEW.md`
- `PR_VAT_TAX_REPORT_BROWSER_E2E_SUMMARY.md`
- `tests/e2e/vat-tax-report-browser.spec.ts`

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant guard, CSRF, JWT/session, cleanup, hosted, provider, object-storage, banking, reconciliation, UAE ASP, ZATCA, or production UI behavior changed.

## Test behavior

The Playwright proof is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_VAT_TAX_REPORT_BROWSER_E2E=1`
- `LEDGERBYTE_VAT_TAX_REPORT_BROWSER_PROOF_ID` is set to a synthetic proof-run id
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
- No tax authority, UAE ASP, or ZATCA calls were made.
- No real customer data was used.
- Fixtures are synthetic and marker-scoped.
- Cleanup deletes only the seeded synthetic organizations and users.

## Validation

Passed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with local disposable URL
- Local disposable Postgres/Redis startup
- Local-only Prisma migrate deploy against disposable Postgres
- Targeted Playwright spec load/list check
- Default Playwright proof run with opt-in unset: 5 passed, 1 skipped
- Opt-in local VAT/tax report browser proof: 6 passed
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm verify:diff`
- `git diff --check`

`corepack pnpm test` printed the repo's existing API/web Jest worker force-exit warnings after all tests passed.

`apps/web/next-env.d.ts` generated churn was detected after build and restored.

Changed-file trailing whitespace and targeted high-risk credential scans found no real issues.

## Bugs found and fixed

No production runtime defect was found.

No accounting logic defect was found.

Fixture/test-only fix:

- The Playwright money assertion helper now matches the existing grouped currency renderer for values such as `SAR 1,000.00`.

## Remaining gaps

- Hosted/staging VAT/tax browser proof.
- VAT Summary PDF text parsing.
- Official filing format, filing approval workflow, tax-authority submission, UAE ASP integration, and ZATCA integration.
- Accountant/tax-advisor approval of VAT terminology, signs, and filing-ready layout.
- Multi-currency, branch-specific, reverse-charge, exempt, zero-rated, and partial-recovery VAT scenarios.

## Reviewer focus areas

- Confirm the spec uses real browser routes, cookie/session login, organization context, and VAT report UI controls.
- Confirm the DB guard remains local-only and opt-in.
- Confirm Tenant B data is absent from Tenant A UI and browser-authenticated JSON/CSV responses.
- Confirm no runtime/accounting/schema/provider/compliance changes are included.
