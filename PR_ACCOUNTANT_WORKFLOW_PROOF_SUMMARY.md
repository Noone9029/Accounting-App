# Accountant workflow proof pack

## Summary

This PR adds a local-only accountant workflow proof pack for paid-beta readiness.

It proves the core accountant path through production API services using synthetic tenants and disposable local Postgres data:

- Sales invoice creation, finalization, journal posting, customer payment allocation, customer ledger, and AR aging impact.
- Purchase bill creation, finalization, journal posting, supplier payment allocation, supplier ledger, and AP aging impact.
- Manual journal creation, posting, reversal, general ledger impact, and balanced trial balance output.
- Audit logs and audit CSV export for posted financial actions.
- Tenant scoping and cross-tenant report/export negative assertions.

## Files changed

- `ACCOUNTANT_WORKFLOW_PROOF_REVIEW.md`
- `PR_ACCOUNTANT_WORKFLOW_PROOF_SUMMARY.md`
- `apps/api/src/accountant-workflow-proof.integration.spec.ts`

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant guard, UI, hosted, provider, UAE ASP, or ZATCA logic changed.

## Test behavior

The Prisma-backed DB proof is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed disposable local Postgres URL

Normal Jest runs execute only URL-gate tests and skip the DB-mutating proof block.

## Safety

- No hosted proof was executed.
- No hosted mutations were run.
- No hosted migrations were run.
- No cleanup execute mode was run.
- No provider/storage APIs were called.
- No real customer data was used.
- Fixtures are synthetic and marker-scoped.
- The DB URL guard rejects non-local and production-looking targets.

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- Default targeted accountant workflow proof - passed, 5 URL-gate tests and 4 skipped DB proof tests.
- First opt-in targeted accountant workflow proof attempt - blocked because local Postgres was not listening on `localhost:5432`; no hosted target was used.
- Local Docker Compose Postgres - started locally and healthy.
- Opt-in targeted accountant workflow proof with local test DB env - passed, 9 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Generated-file check - `apps/web/next-env.d.ts` has no diff after generated churn restore.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; matches are synthetic local Postgres placeholder URLs inside DB guard tests.

## Bugs found and fixed

No production accounting defect was found.

Fixture-only adjustments were made so the synthetic local proof matched existing runtime requirements:

- Added synthetic posting account `220` for sales invoice finalization.
- Added synthetic posting account `230` for purchase/AP posting coverage.
- Adjusted the report range to include the runtime reversal date.

## Remaining gaps

- Hosted/staging accountant workflow proof.
- Browser E2E UX coverage for the accountant workflow.
- PDF/export HTTP route coverage beyond audit CSV and report object assertions.
- Dashboard aggregate route coverage.
- Tax-bearing, multi-currency, inventory, banking, UAE Peppol, ZATCA, ASP, email, and provider/storage workflows.

## Reviewer focus areas

- Confirm the proof uses production services, not substitute accounting logic.
- Confirm the DB guard remains local-only and opt-in.
- Confirm tenant B data is absent from tenant A reports, ledgers, and audit export.
- Confirm no runtime/accounting/schema changes are included.
