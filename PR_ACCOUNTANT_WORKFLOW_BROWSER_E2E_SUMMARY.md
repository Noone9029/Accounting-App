# Accountant workflow browser E2E proof

## Summary

This PR adds an opt-in local browser E2E proof for the paid-beta accountant workflow.

It proves the core accountant path through the browser UI using synthetic local/test data only:

- Sales invoice creation, finalization, journal-posting evidence, customer payment allocation, customer ledger UI, and AR aging UI impact.
- Purchase bill creation, finalization, journal-posting evidence, supplier payment allocation, supplier ledger UI, and AP aging UI impact.
- Manual journal creation, posting, reversal, and general-ledger UI impact.
- Audit log UI visibility for posted financial actions.
- Tenant-scoped UI/report assertions and direct foreign invoice, bill, journal, and report probes.

## Files changed

- `ACCOUNTANT_WORKFLOW_BROWSER_E2E_REVIEW.md`
- `PR_ACCOUNTANT_WORKFLOW_BROWSER_E2E_SUMMARY.md`
- `apps/api/src/audit-log/audit-log.service.ts`
- `apps/api/src/audit-log/audit-log.service.spec.ts`
- `tests/e2e/accountant-workflow-browser.spec.ts`

## Runtime impact

One production runtime fix is included: `GET /audit-logs/retention-settings` now handles concurrent first-load default-settings creation without returning a 500.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant guard, CSRF, JWT/session, cleanup, hosted, provider, UAE ASP, ZATCA, banking, reconciliation, production accounting, Prisma schema, migration, or UI behavior changed.

## Test behavior

The browser proof is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed disposable local Postgres URL
- `LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID` is set to a synthetic proof-run id
- `LEDGERBYTE_WEB_URL` and `LEDGERBYTE_API_URL` are local URLs

Normal Playwright collection skips the DB-mutating browser proof unless the opt-in flag is set.

## Safety

- No hosted proof was executed.
- No hosted mutations were run.
- No hosted migrations were run.
- No cleanup execute mode was run.
- No provider/storage APIs were called.
- No real customer data was used.
- Fixtures are synthetic and marker-scoped.
- Cleanup deletes only the seeded synthetic organizations and users.
- The DB and URL guard rejects hosted/prod-looking targets.

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder `DATABASE_URL`/`DIRECT_URL` - passed.
- Local-only `corepack pnpm --filter @ledgerbyte/api db:migrate` - passed; no hosted migrations run.
- Default Playwright run for `tests/e2e/accountant-workflow-browser.spec.ts` - passed, 5 passed and 1 skipped.
- Opt-in local browser proof for `tests/e2e/accountant-workflow-browser.spec.ts` - passed, 6 passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/audit-log/audit-log.service.spec.ts` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. The web suite emitted its existing worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; printed existing CRLF normalization warnings for touched API files.
- `git diff --check` - passed; printed existing CRLF normalization warnings for touched API files.
- Targeted high-risk secret scan - passed. Matches were safe synthetic browser fixture password fields, audit-log redaction keywords, and redaction test fixtures only.
- Generated-file check - `apps/web/next-env.d.ts` build churn was restored; no final diff.

## Bugs found and fixed

No production accounting defect was found.

The browser proof found an audit-log retention-settings race: concurrent first-load requests could both try to create default settings for the same organization and one request would fail with a Prisma P2002 unique constraint. The fix uses upsert and a targeted P2002 fallback read, with a service unit test.

## Remaining gaps

- Hosted/staging accountant workflow browser proof.
- Exhaustive report/export/PDF route coverage.
- Advanced tax, multi-currency, inventory, banking, UAE Peppol, ZATCA, ASP, email, and provider/storage workflows.
- Accessibility cleanup for unlabeled sales invoice and manual journal line controls.
- The proof covers representative report/export evidence, but not every CSV/PDF/download variant.

## Reviewer focus areas

- Confirm the browser proof creates Tenant A financial workflow records through real UI forms.
- Confirm the DB and URL guards remain local-only and opt-in.
- Confirm Tenant B data is absent from Tenant A browser UI and reports.
- Confirm no runtime/accounting/schema/UI behavior changes are included.
