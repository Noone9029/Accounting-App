# Accountant Workflow Proof Review

## Scope

This lane adds a local-only proof pack for the core paid-beta accountant workflow. It starts from updated `origin/main` and proves the workflow through production API services against synthetic data in a disposable local Postgres database.

No hosted proof, hosted mutation, hosted migration, UAE ASP access, ZATCA sandbox access, provider/storage API call, Prisma schema change, migration, production compliance claim, UI change, or runtime accounting change is included.

## Local-only execution gate

The Prisma-backed accountant workflow proof is skipped by default. URL-gate tests still run in the normal Jest suite without connecting to a database.

To run the full DB proof, the caller must set:

- `LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to a disposable local Postgres URL

The spec requires `LEDGERBYTE_TEST_DATABASE_URL` when the opt-in flag is enabled. It refuses non-Postgres URLs, non-local hosts, and production-looking database names. It does not fall back to `DATABASE_URL`.

## Workflows proven

- Sales invoice creation and finalization.
- Sales invoice journal posting to AR and revenue.
- Customer payment creation and allocation against the finalized invoice.
- Customer ledger rows and closing balance after partial payment.
- AR aging impact with the remaining invoice balance.
- Purchase bill creation and finalization.
- Purchase bill journal posting to expense and AP.
- Supplier payment creation and allocation against the finalized bill.
- Supplier ledger rows and closing balance after partial payment.
- AP aging impact with the remaining bill balance.
- Manual journal creation, posting, reversal, and general ledger/trial balance report impact.
- Audit log entries for posted financial actions.
- Audit CSV export remains tenant-scoped.
- Tenant scoping remains enforced for cross-tenant invoice, bill, ledger, aging, general ledger, trial balance, and audit export assertions.

## Test coverage added

- `apps/api/src/accountant-workflow-proof.integration.spec.ts`

The spec uses two synthetic tenants with separate users, memberships, contacts, and posting accounts. It executes production service methods for invoices, bills, payments, journals, ledgers, reports, and audit logs. It does not encode substitute accounting behavior in the test.

## Bugs found

No production accounting logic defect was found.

The first enabled DB run exposed fixture gaps, not runtime defects:

- Sales invoice finalization requires posting account `220`; the synthetic fixture now creates it.
- Purchase/AP coverage needs posting account `230`; the synthetic fixture now creates it.
- Manual journal reversal posts at the run date, so the proof report range now ends at the test run date rather than the February fixture period.

## Fixes implemented

- Added a local-only accountant workflow integration proof with explicit DB URL safety gates.
- Added synthetic VAT payable/receivable posting accounts required by existing finalization services.
- Added cross-tenant negative assertions around reports, ledgers, audit logs, and direct read attempts.
- Added documentation for covered and uncovered areas.

No runtime service/controller/auth code was changed. No accounting logic was changed. No Prisma schema or migration was changed.

## Remaining untested areas

- Hosted/staging accountant workflow execution.
- Browser E2E accountant workflow UX.
- Report PDF generation through HTTP routes.
- Dashboard aggregate endpoint coverage.
- Inventory, banking, VAT, UAE Peppol, ZATCA, ASP, email, and object-storage/provider workflows.
- Multi-currency and tax-bearing invoices/bills.
- Concurrent posting/allocation behavior.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- Default targeted accountant workflow proof: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/accountant-workflow-proof.integration.spec.ts` - passed, 5 URL-gate tests and 4 skipped Prisma-backed DB tests.
- First opt-in targeted accountant workflow proof attempt - blocked because local Postgres was not listening on `localhost:5432`; no hosted target was used.
- `docker compose -f infra/docker-compose.yml up -d postgres` - local Postgres started after Docker Desktop was launched locally.
- Opt-in targeted accountant workflow proof with `LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION=1` and local `LEDGERBYTE_TEST_DATABASE_URL` - passed, 9 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 168 passed suites with 13 skipped tests and 1541 passed tests, and web reported 157 passed suites with 692 passed tests.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; generated `apps/web/next-env.d.ts` churn was restored afterward.
- `git diff --check` - passed.
- `git diff -- apps/web/next-env.d.ts` - no diff after restore.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; matches are synthetic local Postgres placeholder URLs inside DB guard tests.

## Remaining risks

- The DB proof requires a disposable local Postgres with current schema already available.
- Normal test runs skip the DB-mutating proof by design; CI would need an explicit local/test DB job for always-on coverage.
- The proof covers the core accountant flow, not every report/export format or every advanced accounting path.
- `apps/web/next-env.d.ts` is regenerated by Next.js build and was restored because its diff was not an intentional source change.

## Next recommended prompt

Codex, review the accountant workflow proof PR for owner-review readiness only. Confirm diff scope, test quality, local-only DB guard behavior, generated-file cleanliness, secret scan results, and verification status. Do not add scope, do not run hosted mutations, do not run hosted migrations, and do not change accounting logic.
