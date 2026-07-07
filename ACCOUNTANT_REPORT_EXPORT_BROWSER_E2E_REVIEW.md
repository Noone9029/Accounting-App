# Accountant Report and Export Browser E2E Review

## Scope

This lane adds an opt-in, local-only Playwright proof for accountant-facing report, export, statement, generated-document, and download browser surfaces.

It starts from updated `origin/main` after PR #252 and proves representative UI paths against two synthetic tenants in a disposable local Postgres database.

No hosted proof, hosted mutation, hosted migration, cleanup execute mode, provider/storage API call, banking/reconciliation implementation, UAE ASP access, ZATCA sandbox access, Prisma schema change, migration, production accounting logic change, or compliance production claim is included.

## Local-only execution gate

The browser proof is skipped unless explicitly enabled.

To run the full proof, start local API and web servers against a disposable local Postgres database, then set:

- `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to an allowed disposable local Postgres URL
- `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_PROOF_ID` to a synthetic proof-run id
- `LEDGERBYTE_WEB_URL` to a local web URL, for example `http://localhost:3000`
- `LEDGERBYTE_API_URL` to a local API URL, for example `http://localhost:4000`
- `LEDGERBYTE_E2E_SEED_WORKFLOWS=false` to avoid unrelated demo seeding during this proof

The spec rejects non-local web/API URLs, non-local database hosts, non-Postgres database URLs, and production-looking database names. It does not fall back to hosted or production values.

## Areas covered

- Browser login through the merged cookie/session auth flow.
- Organization context selection for the synthetic Tenant A user.
- No legacy browser auth-token persistence.
- Dashboard report-summary UI values.
- Reports index route.
- Profit and Loss UI.
- Balance Sheet UI.
- Trial Balance UI.
- General Ledger UI.
- Aged Receivables UI.
- Aged Payables UI.
- Customer detail/ledger workspace UI.
- Customer statement route UI.
- Supplier detail/ledger workspace UI.
- Supplier statement route UI.
- CSV export button on Profit and Loss.
- PDF export button on Profit and Loss.
- Generated document archive UI.
- Generated document browser download action.
- Direct foreign invoice/bill UI URL probes.
- Direct foreign report, PDF data, PDF, generated-document, attachment, customer statement, and supplier statement probes.
- Tenant B markers are asserted absent from Tenant A browser UI and browser-authenticated API/export/download responses.

## Guard and permission model summary

The proof logs in with `POST /auth/login` through Playwright's browser request context. The browser keeps auth in httpOnly cookie/session state, while the active organization id is stored in localStorage by the existing E2E login helper.

The synthetic Tenant A user has membership only in Tenant A. The synthetic Tenant B user and organization exist only to provide cross-tenant markers and direct URL targets. Both roles use full permissions so failures are tenant-boundary failures, not missing-permission failures.

## Bugs found

No production runtime defect was found in this lane.

No accounting logic defect was found in this lane.

Fixture/test-only findings:

- Long proof-run markers could make the shared synthetic browser fixture generate an invalid email local part. The fixture now keeps long tenant/report markers in organization/account/document data while using a short unique synthetic email.
- Report and statement browser controls needed exact Playwright selectors because "To" and "Download customer statement" matched other dev-mode or download controls.
- Browser-clicked CSV downloads are consumed by the app download helper, so the proof now checks CSV contents through an authenticated browser-context fetch and uses the UI click to prove the download control and response status/content type.

## Fixes implemented

- Added `tests/e2e/accountant-report-export-browser.spec.ts`.
- Added a proof-specific opt-in env gate and local URL/database safety checks.
- Reused the local synthetic browser tenant fixture with a proof-run marker prefix.
- Kept shared browser fixture emails short while preserving tenant markers in visible synthetic data.
- Explicitly submits report and statement date filters through the UI before assertions.
- Proves CSV contents and tenant scoping through browser-authenticated direct fetch, then proves UI CSV/PDF/generator download controls through browser clicks.
- Added docs for covered and uncovered browser report/export/download areas.

No production runtime code was changed. No accounting logic was changed. No Prisma schema or migration was changed.

## Missing UI surfaces documented

- The proof samples one report export/download button set on Profit and Loss; it does not click every report page's CSV/PDF buttons.
- PDF response content is verified by route status and content type; the test does not parse PDF text.
- Generated-document downloads are covered through the database-backed local archive, not object-storage provider downloads or signed URLs.
- Report-pack generation and pack downloads remain disabled metadata-only surfaces.
- Download-specific audit-log entries remain outside this lane because current download routes do not write dedicated audit logs.

## Remaining untested areas

- Hosted/staging report/export browser proof.
- Exhaustive browser coverage for every report/export/PDF button variant.
- VAT return CSV and VAT summary value proof.
- Report-pack generation and bundle downloads.
- Object-storage/provider-backed generated-document and attachment downloads.
- Signed URL behavior.
- Advanced tax, multi-currency, inventory, banking, reconciliation, UAE Peppol, ZATCA, ASP, email, and provider workflows.

## Commands run

- `git fetch origin main` - passed.
- `git worktree add E:\Worktrees\Accounting-App\accountant-report-export-browser-e2e -b codex/accountant-report-export-browser-e2e origin/main` - passed.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `docker compose -p ledgerbyte-accountant-report-export-browser-e2e -f infra/docker-compose.yml up -d postgres redis` - passed for local disposable services only.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api db:migrate` - passed against local disposable Postgres only.
- `corepack pnpm exec playwright test tests/e2e/accountant-report-export-browser.spec.ts` with opt-in unset - passed, 5 passed and 1 skipped.
- `corepack pnpm exec playwright test tests/e2e/accountant-report-export-browser.spec.ts` with `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_BROWSER_E2E=1` and local DB/web/API URLs - passed, 6 passed.
- `corepack pnpm exec playwright test tests/e2e/accountant-workflow-browser.spec.ts` with `LEDGERBYTE_ACCOUNTANT_WORKFLOW_BROWSER_E2E=1` and short proof id `awbe2e` - passed, 6 passed. An earlier local invocation with an overly long proof id failed before login because that existing spec generated an invalid synthetic email.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. Existing web Jest worker teardown warning was printed, but the command exited 0.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated Next.js churn was detected and restored.

## Remaining risks

- The opt-in proof requires local API/web servers and a migrated disposable local Postgres database.
- Normal Playwright runs skip this browser proof unless the explicit opt-in environment variable is set.
- The proof samples representative high-risk UI/export/download surfaces and does not replace exhaustive route-by-route browser testing.
- The existing accountant workflow browser proof still requires a short proof id to avoid its own synthetic email local-part limit; this branch did not widen scope to change that separate spec.

## Next recommended prompt

Codex, review the accountant report/export browser E2E PR for owner-review readiness only. Confirm diff scope, local-only guard behavior, browser proof quality, generated-file cleanliness, secret scan results, and verification status. Do not add scope, do not run hosted mutations, do not run hosted migrations, do not change accounting logic, and do not start banking, UAE ASP, or ZATCA work.
