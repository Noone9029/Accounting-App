# Accountant Workflow Browser E2E Review

## Scope

This lane adds an opt-in, local-only browser E2E proof for the paid-beta accountant workflow.

It starts from updated `origin/main` after PR #250 and proves that the core service-level accountant workflow can also be completed through the browser UI using synthetic local/test data.

No hosted proof, hosted mutation, hosted migration, provider/storage call, UAE ASP access, ZATCA sandbox access, banking/reconciliation work, Prisma schema change, migration, production accounting logic change, UI behavior change, or compliance production claim is included.

The browser proof did expose one non-accounting runtime defect in the audit-log settings endpoint. That fix is included because audit-log visibility is part of this paid-beta readiness lane and the failing browser run proved the defect locally.

## Local-only execution gate

The browser proof is skipped unless explicitly enabled.

To run the full proof, start local API and web servers against a disposable local Postgres database, then set:

- `LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to an allowed disposable local Postgres URL
- `LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_PROOF_ID` to a synthetic proof-run id
- `LEDGERBYTE_WEB_URL` to a local web URL, for example `http://localhost:3000`
- `LEDGERBYTE_API_URL` to a local API URL, for example `http://localhost:4000`
- `LEDGERBYTE_E2E_SEED_WORKFLOWS=false` to avoid unrelated demo seeding during this proof

The spec rejects non-local web/API URLs, non-local database hosts, non-Postgres database URLs, and production-looking database names. It does not fall back to hosted or production values.

## Workflows covered

- Login through the browser request context using the merged cookie/session auth flow.
- Organization context selection for the synthetic Tenant A user.
- Create a synthetic sales invoice from the browser UI.
- Finalize the sales invoice from the browser UI.
- Confirm sales invoice journal posting through the authenticated API response.
- Record and allocate a partial customer payment from the browser UI.
- Verify customer ledger/customer balance UI impact.
- Verify AR aging report UI impact.
- Create a synthetic purchase bill from the browser UI.
- Finalize the purchase bill from the browser UI.
- Confirm purchase bill journal posting through the authenticated API response.
- Record and allocate a partial supplier payment from the browser UI.
- Verify supplier ledger/supplier balance UI impact.
- Verify AP aging report UI impact.
- Create, post, and reverse a manual journal from the browser UI.
- Verify general-ledger UI impact for the manual journal and reversal.
- Verify audit-log UI visibility for financial actions.
- Verify Tenant B markers do not appear in Tenant A workflow UI.
- Verify direct foreign invoice, bill, journal, and report probes do not expose Tenant B data.

## Test coverage added

- `tests/e2e/accountant-workflow-browser.spec.ts`
- `apps/api/src/audit-log/audit-log.service.ts`
- `apps/api/src/audit-log/audit-log.service.spec.ts`

The spec seeds only prerequisite synthetic users, organizations, roles, memberships, posting accounts, contacts, and Tenant B foreign markers in the explicitly supplied local test database. Tenant A financial workflow records are created through the browser UI.

## Bugs found

No production accounting logic defect was found during implementation.

The browser proof found that concurrent first-load requests to `GET /audit-logs/retention-settings` could race while creating default audit-log retention settings, producing a Prisma unique-constraint error and a browser 500 on the audit-log page. The fix uses an upsert with a P2002 fallback read so the loser of the race returns the row created by the competing request.

No auth, tenant isolation, CSRF, JWT/session, cleanup, Prisma schema, migration, production accounting logic, or UI behavior change was required.

## Missing UI surfaces documented

- Sales invoice line description, quantity, price, and discount controls do not expose dedicated labels; the spec uses existing form structure around the labelled posting-account select for that row.
- Manual journal line controls do not expose dedicated labels; the spec uses positional selectors inside the manual journal form.
- The proof checks generated financial records and audit visibility, but it does not prove every export/download variant.
- The proof remains local-only. Hosted/staging accountant workflow browser proof is still unrun.

## Remaining untested areas

- Hosted/staging accountant workflow browser proof.
- Every report/export/PDF variant for the accountant workflow.
- Advanced tax, multi-currency, inventory, banking, UAE Peppol, ZATCA, ASP, email, and provider/storage workflows.
- Cross-tenant mutation attempts through every form; this lane covers representative direct foreign read/report probes and absence of foreign data in Tenant A UI.
- Accessibility cleanup for unlabeled sales invoice and manual journal line controls.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` with local placeholder `DATABASE_URL`/`DIRECT_URL` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:migrate` against local Docker Postgres only - passed; no hosted migrations run.
- `corepack pnpm exec playwright test tests/e2e/accountant-workflow-browser.spec.ts` with browser proof opt-in unset - passed, 5 passed and 1 skipped.
- `corepack pnpm exec playwright test tests/e2e/accountant-workflow-browser.spec.ts` with `LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1`, local API/web, and local test Postgres - passed, 6 passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/audit-log/audit-log.service.spec.ts` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. The web suite emitted its existing worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; printed existing CRLF normalization warnings for touched API files.
- `git diff --check` - passed; printed existing CRLF normalization warnings for touched API files.
- Targeted secret scan - passed. Matches were safe synthetic browser fixture password fields, audit-log redaction keywords, and redaction test fixtures only.
- Generated-file check - `apps/web/next-env.d.ts` had generated Next.js route-typing churn after build and was restored.

## Remaining risks

- The opt-in proof requires local API/web servers and a migrated disposable local Postgres database.
- Default Playwright test execution still depends on the repository's existing global E2E setup behavior; default listing/default skip checks can be run without enabling the proof.
- The browser spec is longer than a route smoke test because it exercises real multi-step accounting UI flows.
- Browser report pages may load before active organization context resolves; the proof explicitly submits report filters with `Run report` before asserting report rows.

## Next recommended prompt

Codex, review the accountant workflow browser E2E PR for owner-review readiness only. Confirm diff scope, local-only guard behavior, browser proof quality, generated-file cleanliness, secret scan results, and verification status. Do not add scope, do not run hosted mutations, do not run hosted migrations, and do not change accounting logic.
