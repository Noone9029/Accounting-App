# Accountant Report and Export Proof Review

## Scope

This lane adds a local-only HTTP proof pack for paid-beta accountant report, export, PDF, and download readiness.

It starts from updated `origin/main` after the accountant workflow proof lanes and proves guarded API routes against synthetic tenants in a disposable local Postgres database.

No hosted proof, hosted mutation, hosted migration, cleanup execute mode, provider/storage API call, UAE ASP access, ZATCA sandbox access, banking/reconciliation implementation, Prisma schema change, migration, UI change, production accounting logic change, or compliance production claim is included.

## Local-only execution gate

The Prisma-backed HTTP proof is skipped by default. Normal Jest execution runs only the URL-gate tests.

To run the full proof, the caller must set:

- `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` to a disposable local Postgres URL

The spec requires `LEDGERBYTE_TEST_DATABASE_URL` when the opt-in flag is enabled. It refuses non-Postgres URLs, non-local hosts, and production-looking database names. It does not fall back to `DATABASE_URL`.

## Guard and permission model summary

The proof uses real Nest HTTP controllers and route guards:

- `JwtAuthGuard` verifies the merged cookie/session JWT path.
- `OrganizationContextGuard` requires `x-organization-id` and active membership.
- `PermissionGuard` checks route metadata against the synthetic tenant role.
- Synthetic users authenticate through `POST /auth/login`.
- Synthetic roles use `admin.fullAccess` so tenant failures are not hidden by permission denials.

All proof routes are exercised with Tenant A cookies and Tenant A organization context unless a cross-tenant negative assertion intentionally changes the target ID or organization header.

## Reports, exports, and downloads proven

- Profit and loss JSON.
- Balance sheet JSON.
- Trial balance JSON.
- General ledger JSON.
- Dashboard summary JSON.
- Aged receivables JSON.
- Aged payables JSON.
- Customer ledger and customer statement JSON.
- Supplier ledger and supplier statement JSON.
- Profit and loss CSV export.
- Trial balance CSV export.
- Aged receivables CSV export.
- Aged payables CSV export.
- Profit and loss PDF route.
- Aged receivables PDF route.
- Sales invoice PDF data and PDF route.
- Purchase bill PDF data and PDF route.
- Generated-document download route.
- Attachment download route.
- Audit log list and audit CSV export after generated-document archive actions.

## Tenant isolation assertions

The spec creates two synthetic tenants with separate users, memberships, roles, contacts, accounts, invoices, bills, payments, journal entries, generated documents, attachments, and audit logs.

Tenant A report and download responses are asserted not to contain Tenant B:

- email markers
- customer and supplier names
- invoice and bill numbers
- distinctive invoice and bill amounts

The proof also verifies:

- Tenant A cannot switch to Tenant B via `x-organization-id`.
- Tenant A cannot read Tenant B invoice PDF data or invoice PDF.
- Tenant A cannot read Tenant B bill PDF data or bill PDF.
- Tenant A cannot download Tenant B generated documents or attachments.
- Tenant A cannot read Tenant B customer or supplier statements.
- Tenant A report filtering with a Tenant B account ID does not expose Tenant B data.
- Tenant B can still read its own aging data through its own authenticated session.

## Test coverage added

- `apps/api/src/accountant-report-export-proof.integration.spec.ts`

The spec uses production controllers and services for reports, ledgers, PDFs, generated documents, attachments, audit logs, guards, permissions, and auth sessions. It seeds only synthetic finalized accounting records and posted journal lines needed for the proof; it does not encode substitute report/accounting behavior.

## Bugs found

No production runtime defect was found.

No accounting logic defect was found.

The first opt-in execution was blocked because local Postgres was not listening on `localhost:5432`. A repo-local Docker Compose Postgres service was started, local migrations were confirmed current, and the opt-in proof then passed.

## Fixes implemented

- Added a local-only opt-in accountant report/export HTTP proof.
- Added explicit DB URL safety gates for the new proof.
- Added synthetic fixture data for two tenants and scoped cleanup for those tenants.
- Added cross-tenant negative assertions for reports, CSV exports, PDF/data/download routes, statements, generated documents, attachments, organization switching, and audit export evidence.
- Added docs for covered and uncovered areas.

No production runtime code was changed. No accounting logic was changed. No Prisma schema or migration was changed.

## Remaining untested areas

- Hosted/staging report/export proof.
- Browser E2E report/export/download proof.
- Every report/export/PDF variant outside the covered representative set.
- VAT return CSV and VAT summary report values.
- Report-pack manifest and report-pack generation surfaces.
- Object-storage/provider-backed generated-document and attachment downloads.
- Signed URL behavior.
- Download-specific audit entries, because current download routes do not write audit logs.
- Advanced tax, multi-currency, inventory, banking, reconciliation, UAE Peppol, ZATCA, ASP, email, and provider workflows.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Default targeted report/export proof: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/accountant-report-export-proof.integration.spec.ts` - passed, 5 URL-gate tests and 5 skipped DB proof tests.
- First opt-in targeted report/export proof attempt - blocked because local Postgres was not listening on `localhost:5432`; no hosted target was used.
- `docker compose -f infra/docker-compose.yml up -d postgres` - local Postgres started.
- Local Postgres health check - passed.
- Local-only `corepack pnpm --filter @ledgerbyte/api db:migrate` against `postgresql://accounting:accounting@localhost:5432/accounting?schema=public` - passed; no pending migrations.
- Opt-in targeted report/export proof with `LEDGERBYTE_ACCOUNTANT_REPORT_EXPORT_DB_INTEGRATION=1` and local `LEDGERBYTE_TEST_DATABASE_URL` - passed, 10 tests.
- Targeted existing accountant workflow proof default mode - passed, 5 URL-gate tests and 4 skipped DB proof tests.
- Targeted existing accountant workflow proof opt-in local DB mode - passed, 9 tests.
- Targeted existing tenant isolation proof set default mode - passed, 68 tests and 9 skipped DB proof tests.
- Targeted existing tenant isolation DB proof opt-in local DB mode - passed, 14 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 169 passed suites with 18 skipped tests and 1547 passed tests, and web reported 157 passed suites with 692 passed tests. The web test command printed its existing worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `apps/web/next-env.d.ts` generated route-type churn was restored after build; final generated-file check has no diff.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; matches are synthetic test fields, safe local placeholder URLs, enum names, or documentation statements.

## Remaining risks

- The DB proof requires a disposable local Postgres database with the current Prisma schema.
- Normal test runs skip the DB-mutating HTTP proof by design; CI would need an explicit local/test DB job to run it continuously.
- PDF bodies are verified by route status, headers, non-empty PDF bytes, archive/audit evidence, and tenant-scoped source data; the test does not parse PDF text content.
- Download routes are tenant-scoped, but download actions themselves do not currently write dedicated audit-log entries.

## Next recommended prompt

Codex, review the accountant report/export proof PR for owner-review readiness only. Confirm diff scope, test quality, local-only DB guard behavior, generated-file cleanliness, secret scan results, and verification status. Do not add scope, do not run hosted mutations, do not run hosted migrations, do not change accounting logic, and do not start banking, UAE ASP, or ZATCA work.
