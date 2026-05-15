# LedgerByte

[![Deployed E2E Smoke](https://github.com/Noone9029/Accounting-App/actions/workflows/deployed-e2e.yml/badge.svg)](https://github.com/Noone9029/Accounting-App/actions/workflows/deployed-e2e.yml)

LedgerByte accounting SaaS foundation with a Next.js frontend, NestJS API, Prisma/PostgreSQL persistence, Redis-ready queue infrastructure, and package boundaries for accounting, ZATCA, PDF, shared types, and UI.

This is an original implementation inspired by common accounting workflows. It does not copy Wafeq branding, proprietary text, logos, UI assets, or copyrighted material.

## Stack

- Monorepo: pnpm workspaces
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT bearer auth
- Queue target: BullMQ + Redis ready infrastructure
- File storage target: database default with feature-flagged S3-compatible uploaded-attachment storage
- Testing: Jest
- Browser E2E: Playwright

## Setup

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Docker infrastructure:

```bash
docker compose -f infra/docker-compose.yml up
```

Useful commands:

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm e2e
pnpm smoke:accounting
pnpm db:migrate
pnpm db:seed
```

## Deployment

LedgerByte is prepared for a two-project Vercel deployment backed by Supabase Postgres:

- API project: `apps/api`, deployed as a Vercel Node serverless function wrapper around the NestJS app.
- Web project: `apps/web`, deployed as the Next.js frontend.
- Database: Supabase Postgres with Prisma `DATABASE_URL` for runtime and `DIRECT_URL` for migrations.
- Prisma transaction timing can be tuned with `PRISMA_TRANSACTION_MAX_WAIT_MS` and `PRISMA_TRANSACTION_TIMEOUT_MS` for hosted Supabase/Vercel latency.

See [docs/DEPLOYMENT_VERCEL_SUPABASE.md](docs/DEPLOYMENT_VERCEL_SUPABASE.md) for the full setup checklist, required Vercel project settings, and environment variables.

Deployment safety docs:

- [CI database readiness checklist](docs/deployment/CI_DATABASE_READINESS_CHECKLIST.md)
- [Supabase security review](docs/deployment/SUPABASE_SECURITY_REVIEW.md)
- [Deployed E2E runbook](docs/deployment/DEPLOYED_E2E_RUNBOOK.md)

API status links:

- `GET /` returns a public, non-sensitive LedgerByte API status response with links to `/health` and `/readiness`.
- `GET /health` returns the lightweight function health response `{ "status": "ok", "service": "api" }`.
- `GET /readiness` checks database connectivity and returns safe JSON, using `503` when the API is reachable but the database is unavailable.

Seed login:

- Email: `admin@example.com`
- Password: `Password123!`
- Demo organization id: `00000000-0000-0000-0000-000000000001`

Tenant-scoped API calls require:

```http
Authorization: Bearer <token>
x-organization-id: <organizationId>
```

ZATCA adapter defaults:

```env
ZATCA_ADAPTER_MODE=mock
ZATCA_ENABLE_REAL_NETWORK=false
ZATCA_SANDBOX_BASE_URL=
ZATCA_SIMULATION_BASE_URL=
ZATCA_PRODUCTION_BASE_URL=
ZATCA_SDK_EXECUTION_ENABLED=false
ZATCA_SDK_JAR_PATH=
ZATCA_SDK_CONFIG_DIR=
ZATCA_SDK_WORK_DIR=
ZATCA_SDK_JAVA_BIN=java
ZATCA_SDK_TIMEOUT_MS=30000
```

Real ZATCA network calls are disabled by default and remain blocked unless `ZATCA_ADAPTER_MODE=sandbox`, `ZATCA_ENABLE_REAL_NETWORK=true`, and `ZATCA_SANDBOX_BASE_URL` are all configured.
Local ZATCA Java SDK execution is also disabled by default. `ZATCA_SDK_EXECUTION_ENABLED=true` enables only local SDK XML validation after Java 11-14 and SDK paths are configured; it does not submit invoices, sign XML, request CSIDs, or prove production compliance.
The official SDK fixture validation pass is documented at `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`; current local execution is blocked because this machine has Java 17.0.16 while the SDK README requires Java `>=11` and `<15`.

## Local Smoke Test

The accounting smoke test runs against the live API and creates clearly named `Smoke Test` records. It does not delete data.

1. Start local services:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

2. Apply database setup:

```bash
corepack pnpm db:migrate
corepack pnpm db:seed
```

3. Start the API and web apps:

```bash
corepack pnpm dev
```

4. In another terminal, run:

```bash
corepack pnpm smoke:accounting
```

Optional overrides:

```bash
LEDGERBYTE_API_URL=http://localhost:4000 corepack pnpm smoke:accounting
LEDGERBYTE_SMOKE_EMAIL=admin@example.com LEDGERBYTE_SMOKE_PASSWORD=Password123! corepack pnpm smoke:accounting
```

The smoke covers seed login, `/auth/me` role permission visibility, role/member API visibility, custom role creation, unknown-permission rejection, organization discovery, dashboard summary section/trend/aging checks, bank account profile defaults/transactions/balance movement, bank transfers/opening balances, bank statement preview/import/matching/categorization/reconciliation summary/submit/approve/close/void lock checks, reconciliation report data/CSV/PDF/archive checks, item/customer/supplier setup, warehouse defaults, opening-balance stock movements, inventory adjustment approval/void flows, warehouse transfers/void reversals, purchase receipt posting/voiding, compatible purchase receipt asset post/reverse, finalized-invoice sales stock issue posting/voiding after manual COGS post/reversal, receiving/issue status endpoints, inventory balances, inventory settings, inventory accounting settings, purchase receipt posting readiness, purchase receipt accounting preview, sales issue COGS preview, manual COGS posting, P&L COGS activity, stock valuation/movement/low-stock reports, inventory clearing reconciliation/variance reports and CSV exports, accountant-reviewed inventory variance proposal create/submit/approve/post/reverse flow, no-journal inventory movement checks outside explicit COGS/receipt asset/variance proposal post actions, fiscal period posting lock rejection, draft invoice edit, invoice finalization idempotency, ZATCA profile setup, safe adapter defaults, compliance checklist/readiness/XML mapping endpoints, SDK readiness/dry-run/local-validation disabled endpoints, EGS private-key response redaction, CSR generation/download, mock compliance CSID onboarding, local ZATCA XML/QR/hash generation, local-only XML validation, repeated-generation ICV idempotency, local/mock compliance-check logging, safe blocked clearance/reporting responses, payment over-allocation rejection, partial and full payments, customer overpayment application/reversal from unapplied payments, customer refund posting/voiding from unapplied payments and credit notes, credit note creation/finalization/application/allocation reversal/PDF/archive/ledger rows, purchase bill creation/finalization/AP posting/PDF/archive, purchase debit note finalization/application/allocation reversal/void/PDF/archive/ledger rows, supplier payment posting/voiding/receipt PDF, supplier ledger/statement rows, ledger/statement balances, receipt-data, report CSV/PDF endpoint availability, payment void idempotency, active allocation/refund void blocking, and invoice void rejection while active payments exist.

The smoke also verifies document settings, number sequence settings/listing/audit logging, PDF archive creation after invoice PDF generation, generated document archive download, user-uploaded attachment upload/list/download/soft-delete checks, representative audit log records/sensitive metadata redaction, audit retention settings/dry-run preview, audit CSV export redaction, and storage readiness/migration-plan dry-run checks without creating journals.

On Windows, if `db:generate` fails with Prisma query engine `EPERM`, stop running API/dev Node processes and rerun it. This is usually a file lock on Prisma's generated client DLL.

## Browser E2E Smoke

Playwright browser smoke coverage lives in `tests/e2e` and runs against the local web/API apps. It checks the most important user-facing surfaces without replacing the deeper API smoke accounting assertions.

Suggested local flow:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
corepack pnpm e2e
```

If Playwright reports a missing Chromium browser, run `corepack pnpm exec playwright install chromium` once on the machine.

Optional overrides:

```bash
LEDGERBYTE_WEB_URL=http://localhost:3000 LEDGERBYTE_API_URL=http://localhost:4000 corepack pnpm e2e
LEDGERBYTE_E2E_EMAIL=admin@example.com LEDGERBYTE_E2E_PASSWORD=Password123! corepack pnpm e2e
```

Deployed test environment:

```bash
LEDGERBYTE_WEB_URL=https://ledgerbyte-web-test.vercel.app LEDGERBYTE_API_URL=https://ledgerbyte-api-test.vercel.app LEDGERBYTE_E2E_EMAIL=admin@example.com LEDGERBYTE_E2E_PASSWORD=Password123! corepack pnpm e2e
```

The suite defaults to one worker and a deployed-friendly timeout. Override with `LEDGERBYTE_E2E_WORKERS`, `LEDGERBYTE_E2E_TEST_TIMEOUT_MS`, or `LEDGERBYTE_E2E_EXPECT_TIMEOUT_MS` only when the target environment can handle the load.

GitHub Actions:

- Manual workflow: **Deployed E2E Smoke** in `.github/workflows/deployed-e2e.yml`.
- Required secrets: `LEDGERBYTE_E2E_EMAIL` and `LEDGERBYTE_E2E_PASSWORD`.
- Default deployed URLs: `https://ledgerbyte-web-test.vercel.app` and `https://ledgerbyte-api-test.vercel.app`.
- Artifacts: `playwright-report` and `playwright-test-results` are uploaded when present.
- Runbook: [docs/deployment/DEPLOYED_E2E_RUNBOOK.md](docs/deployment/DEPLOYED_E2E_RUNBOOK.md).

Do not point the deployed E2E workflow at production data or production user credentials.

The E2E preflight fails clearly if the local API or web app is not running: `Start local API/web before running E2E.` See [docs/testing/BROWSER_E2E_TESTING.md](docs/testing/BROWSER_E2E_TESTING.md) for coverage and limitations.

## Project Audit / Current State

The current engineering audit docs live under `docs/`:

- `docs/PROJECT_AUDIT.md`: high-level current state, maturity, top risks, and next priorities.
- `docs/PRODUCT_AUDIT_V2.md`: current product maturity, go/no-go status, blockers, and production-readiness view after dashboard, audit, inventory, storage, email, E2E, and deployment-readiness work.
- `docs/PRODUCT_READINESS_SCORECARD.md`: 0-100 readiness scorecard by product area.
- `docs/NEXT_30_PROMPTS_ROADMAP.md`: prioritized next 30 Codex prompts grouped by stabilization, production foundations, ZATCA, advanced accounting, and SaaS business layer.
- `docs/IMPLEMENTATION_STATUS.md`: module-by-module status map.
- `docs/CODEBASE_MAP.md`: repository structure and ownership map.
- `docs/API_CATALOG.md`: implemented API endpoint catalog.
- `docs/DATABASE_MODEL_CATALOG.md`: Prisma model and enum catalog.
- `docs/FRONTEND_ROUTE_CATALOG.md`: frontend route catalog.
- `docs/AUDIT_LOG_COVERAGE_REVIEW.md`: standardized audit event coverage and remaining audit risks.
- `docs/ACCOUNTING_WORKFLOW_AUDIT.md`: journal and subledger workflow audit.
- `docs/ZATCA_STATUS_AUDIT.md`: current ZATCA status and production warnings.
- `docs/TESTING_AND_SMOKE_AUDIT.md`: test and smoke coverage map.
- `docs/REMAINING_ROADMAP.md`: prioritized roadmap.
- `docs/MANUAL_DEPENDENCIES.md`: required human/third-party dependencies.

## Implemented API

Health/status:

- `GET /`
- `GET /health`
- `GET /readiness`

Dashboard:

- `GET /dashboard/summary` returns the read-only business overview for the active organization. It requires `dashboard.view` and includes sales AR, purchase AP, banking, inventory, report health, compliance/admin counts, attention items, last-six-month trend arrays, AR/AP aging buckets, cash balance trend points, and low-stock items. The endpoint derives values from existing records and posted report services only; it does not create journals or mutate accounting data.

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` returns active memberships, role name, and role permissions
- `GET /auth/invitations/:token/preview`
- `POST /auth/invitations/:token/accept`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

Organizations:

- `POST /organizations`
- `GET /organizations`
- `GET /organizations/:id`
- `PATCH /organizations/:id`

Roles:

- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PATCH /roles/:id`
- `DELETE /roles/:id`

Organization members:

- `GET /organization-members`
- `GET /organization-members/:id`
- `PATCH /organization-members/:id/role`
- `PATCH /organization-members/:id/status`
- `POST /organization-members/invite` creates invited users/memberships, hashed invite tokens, and mock/local email outbox records.

Email:

- `GET /email/readiness`
- `POST /email/test-send`
- `GET /email/outbox`
- `GET /email/outbox/:id`

Accounts:

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`

Bank accounts:

- `GET /bank-accounts`
- `POST /bank-accounts`
- `GET /bank-accounts/:id`
- `PATCH /bank-accounts/:id`
- `POST /bank-accounts/:id/archive`
- `POST /bank-accounts/:id/reactivate`
- `POST /bank-accounts/:id/post-opening-balance`
- `GET /bank-accounts/:id/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD`

Bank transfers:

- `GET /bank-transfers`
- `POST /bank-transfers`
- `GET /bank-transfers/:id`
- `POST /bank-transfers/:id/void`

Bank statement import and reconciliation:

- `GET /bank-accounts/:id/statement-imports`
- `POST /bank-accounts/:id/statement-imports/preview`
- `POST /bank-accounts/:id/statement-imports`
- `GET /bank-statement-imports/:id`
- `POST /bank-statement-imports/:id/void`
- `GET /bank-accounts/:id/statement-transactions?status=UNMATCHED&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /bank-statement-transactions/:id`
- `GET /bank-statement-transactions/:id/match-candidates`
- `POST /bank-statement-transactions/:id/match`
- `POST /bank-statement-transactions/:id/categorize`
- `POST /bank-statement-transactions/:id/ignore`
- `GET /bank-accounts/:id/reconciliation-summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /bank-accounts/:id/reconciliations`
- `POST /bank-accounts/:id/reconciliations`
- `GET /bank-reconciliations/:id`
- `POST /bank-reconciliations/:id/submit`
- `POST /bank-reconciliations/:id/approve`
- `POST /bank-reconciliations/:id/reopen`
- `POST /bank-reconciliations/:id/close`
- `POST /bank-reconciliations/:id/void`
- `GET /bank-reconciliations/:id/items`
- `GET /bank-reconciliations/:id/review-events`
- `GET /bank-reconciliations/:id/report-data`
- `GET /bank-reconciliations/:id/report.csv`
- `GET /bank-reconciliations/:id/report.pdf`

Tax rates:

- `GET /tax-rates`
- `POST /tax-rates`
- `PATCH /tax-rates/:id`

Manual journals:

- `GET /journal-entries`
- `POST /journal-entries`
- `GET /journal-entries/:id`
- `PATCH /journal-entries/:id`
- `POST /journal-entries/:id/post`
- `POST /journal-entries/:id/reverse`

Contacts:

- `GET /contacts`
- `POST /contacts`
- `PATCH /contacts/:id`
- `GET /contacts/:id`
- `GET /contacts/:id/ledger`
- `GET /contacts/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /contacts/:id/statement-pdf-data?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /contacts/:id/statement.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /contacts/:id/supplier-ledger`
- `GET /contacts/:id/supplier-statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /contacts/:id/generate-statement-pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`

Branches:

- `GET /branches`
- `POST /branches`
- `PATCH /branches/:id`

Items:

- `GET /items`
- `POST /items`
- `GET /items/:id`
- `PATCH /items/:id`
- `DELETE /items/:id`

Warehouses and inventory:

- `GET /warehouses`
- `POST /warehouses`
- `GET /warehouses/:id`
- `PATCH /warehouses/:id`
- `POST /warehouses/:id/archive`
- `POST /warehouses/:id/reactivate`
- `GET /stock-movements`
- `POST /stock-movements`
- `GET /stock-movements/:id`
- `GET /inventory-adjustments`
- `POST /inventory-adjustments`
- `GET /inventory-adjustments/:id`
- `PATCH /inventory-adjustments/:id`
- `DELETE /inventory-adjustments/:id`
- `POST /inventory-adjustments/:id/approve`
- `POST /inventory-adjustments/:id/void`
- `GET /warehouse-transfers`
- `POST /warehouse-transfers`
- `GET /warehouse-transfers/:id`
- `POST /warehouse-transfers/:id/void`
- `GET /purchase-receipts`
- `POST /purchase-receipts`
- `GET /purchase-receipts/:id`
- `GET /purchase-receipts/:id/accounting-preview`
- `POST /purchase-receipts/:id/post-inventory-asset`
- `POST /purchase-receipts/:id/reverse-inventory-asset`
- `POST /purchase-receipts/:id/void`
- `GET /purchase-orders/:id/receiving-status`
- `GET /purchase-orders/:id/receipt-matching-status`
- `GET /purchase-bills/:id/receiving-status`
- `GET /purchase-bills/:id/receipt-matching-status`
- `GET /sales-stock-issues`
- `POST /sales-stock-issues`
- `GET /sales-stock-issues/:id`
- `GET /sales-stock-issues/:id/accounting-preview`
- `POST /sales-stock-issues/:id/post-cogs`
- `POST /sales-stock-issues/:id/reverse-cogs`
- `POST /sales-stock-issues/:id/void`
- `GET /sales-invoices/:id/stock-issue-status`
- `GET /inventory/balances`
- `GET /inventory/settings`
- `PATCH /inventory/settings`
- `GET /inventory/accounting-settings`
- `PATCH /inventory/accounting-settings`
- `GET /inventory/reports/stock-valuation`
- `GET /inventory/reports/movement-summary`
- `GET /inventory/reports/low-stock`
- `GET /inventory/reports/clearing-reconciliation`
- `GET /inventory/reports/clearing-variance`
- `GET /inventory/variance-proposals`
- `POST /inventory/variance-proposals`
- `POST /inventory/variance-proposals/from-clearing-variance`
- `GET /inventory/variance-proposals/:id`
- `GET /inventory/variance-proposals/:id/events`
- `GET /inventory/variance-proposals/:id/accounting-preview`
- `POST /inventory/variance-proposals/:id/submit`
- `POST /inventory/variance-proposals/:id/approve`
- `POST /inventory/variance-proposals/:id/post`
- `POST /inventory/variance-proposals/:id/reverse`
- `POST /inventory/variance-proposals/:id/void`

Sales invoices:

- `GET /sales-invoices`
- `GET /sales-invoices/open?customerId=<id>`
- `POST /sales-invoices`
- `GET /sales-invoices/:id`
- `GET /sales-invoices/:id/pdf-data`
- `GET /sales-invoices/:id/pdf`
- `GET /sales-invoices/:id/credit-notes`
- `GET /sales-invoices/:id/credit-note-allocations`
- `GET /sales-invoices/:id/customer-payment-unapplied-allocations`
- `GET /sales-invoices/:id/zatca`
- `POST /sales-invoices/:id/zatca/generate`
- `POST /sales-invoices/:id/zatca/compliance-check`
- `POST /sales-invoices/:id/zatca/clearance`
- `POST /sales-invoices/:id/zatca/reporting`
- `GET /sales-invoices/:id/zatca/xml`
- `GET /sales-invoices/:id/zatca/xml-validation`
- `GET /sales-invoices/:id/zatca/qr`
- `POST /sales-invoices/:id/generate-pdf`
- `PATCH /sales-invoices/:id`
- `DELETE /sales-invoices/:id`
- `POST /sales-invoices/:id/finalize`
- `POST /sales-invoices/:id/void`

Sales credit notes:

- `GET /credit-notes`
- `POST /credit-notes`
- `GET /credit-notes/:id`
- `GET /credit-notes/:id/pdf-data`
- `GET /credit-notes/:id/pdf`
- `GET /credit-notes/:id/allocations`
- `POST /credit-notes/:id/apply`
- `POST /credit-notes/:id/allocations/:allocationId/reverse`
- `POST /credit-notes/:id/generate-pdf`
- `PATCH /credit-notes/:id`
- `DELETE /credit-notes/:id`
- `POST /credit-notes/:id/finalize`
- `POST /credit-notes/:id/void`

Customer payments:

- `GET /customer-payments`
- `POST /customer-payments`
- `GET /customer-payments/:id`
- `GET /customer-payments/:id/receipt-data`
- `GET /customer-payments/:id/receipt-pdf-data`
- `GET /customer-payments/:id/receipt.pdf`
- `GET /customer-payments/:id/unapplied-allocations`
- `POST /customer-payments/:id/apply-unapplied`
- `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`
- `POST /customer-payments/:id/generate-receipt-pdf`
- `POST /customer-payments/:id/void`
- `DELETE /customer-payments/:id`

Customer refunds:

- `GET /customer-refunds`
- `POST /customer-refunds`
- `GET /customer-refunds/refundable-sources?customerId=:id`
- `GET /customer-refunds/:id`
- `GET /customer-refunds/:id/pdf-data`
- `GET /customer-refunds/:id/pdf`
- `POST /customer-refunds/:id/generate-pdf`
- `POST /customer-refunds/:id/void`
- `DELETE /customer-refunds/:id`

Purchase orders:

- `GET /purchase-orders`
- `POST /purchase-orders`
- `GET /purchase-orders/:id`
- `GET /purchase-orders/:id/pdf-data`
- `GET /purchase-orders/:id/pdf`
- `POST /purchase-orders/:id/generate-pdf`
- `PATCH /purchase-orders/:id`
- `DELETE /purchase-orders/:id`
- `POST /purchase-orders/:id/approve`
- `POST /purchase-orders/:id/mark-sent`
- `POST /purchase-orders/:id/close`
- `POST /purchase-orders/:id/void`
- `POST /purchase-orders/:id/convert-to-bill`

Purchase bills:

- `GET /purchase-bills`
- `GET /purchase-bills/open?supplierId=<id>`
- `POST /purchase-bills`
- `GET /purchase-bills/:id`
- `GET /purchase-bills/:id/pdf-data`
- `GET /purchase-bills/:id/pdf`
- `GET /purchase-bills/:id/debit-notes`
- `GET /purchase-bills/:id/debit-note-allocations`
- `GET /purchase-bills/:id/supplier-payment-unapplied-allocations`
- `PATCH /purchase-bills/:id`
- `DELETE /purchase-bills/:id`
- `POST /purchase-bills/:id/finalize`
- `POST /purchase-bills/:id/void`

Purchase debit notes:

- `GET /purchase-debit-notes`
- `POST /purchase-debit-notes`
- `GET /purchase-debit-notes/:id`
- `GET /purchase-debit-notes/:id/pdf-data`
- `GET /purchase-debit-notes/:id/pdf`
- `GET /purchase-debit-notes/:id/allocations`
- `PATCH /purchase-debit-notes/:id`
- `DELETE /purchase-debit-notes/:id`
- `POST /purchase-debit-notes/:id/finalize`
- `POST /purchase-debit-notes/:id/void`
- `POST /purchase-debit-notes/:id/apply`
- `POST /purchase-debit-notes/:id/allocations/:allocationId/reverse`
- `POST /purchase-debit-notes/:id/generate-pdf`

Supplier payments:

- `GET /supplier-payments`
- `POST /supplier-payments`
- `GET /supplier-payments/:id`
- `GET /supplier-payments/:id/receipt-pdf-data`
- `GET /supplier-payments/:id/receipt.pdf`
- `GET /supplier-payments/:id/unapplied-allocations`
- `POST /supplier-payments/:id/apply-unapplied`
- `POST /supplier-payments/:id/unapplied-allocations/:allocationId/reverse`
- `POST /supplier-payments/:id/void`
- `DELETE /supplier-payments/:id`

Supplier refunds:

- `GET /supplier-refunds`
- `POST /supplier-refunds`
- `GET /supplier-refunds/refundable-sources?supplierId=:id`
- `GET /supplier-refunds/:id`
- `GET /supplier-refunds/:id/pdf-data`
- `GET /supplier-refunds/:id/pdf`
- `POST /supplier-refunds/:id/generate-pdf`
- `POST /supplier-refunds/:id/void`
- `DELETE /supplier-refunds/:id`

Organization document settings:

- `GET /organization-document-settings`
- `PATCH /organization-document-settings`

Generated documents:

- `GET /generated-documents`
- `GET /generated-documents/:id`
- `GET /generated-documents/:id/download`

Uploaded attachments:

- `POST /attachments`
- `GET /attachments`
- `GET /attachments/:id`
- `GET /attachments/:id/download`
- `PATCH /attachments/:id`
- `DELETE /attachments/:id`

Storage readiness:

- `GET /storage/readiness`
- `GET /storage/migration-plan`

ZATCA foundation:

- `GET /zatca/profile`
- `GET /zatca/adapter-config`
- `GET /zatca/compliance-checklist`
- `GET /zatca/xml-field-mapping`
- `GET /zatca/readiness`
- `PATCH /zatca/profile`
- `GET /zatca/egs-units`
- `POST /zatca/egs-units`
- `GET /zatca/egs-units/:id`
- `PATCH /zatca/egs-units/:id`
- `POST /zatca/egs-units/:id/activate-dev`
- `POST /zatca/egs-units/:id/generate-csr`
- `GET /zatca/egs-units/:id/csr`
- `GET /zatca/egs-units/:id/csr/download`
- `POST /zatca/egs-units/:id/request-compliance-csid`
- `POST /zatca/egs-units/:id/request-production-csid`
- `GET /zatca/submissions`

ZATCA SDK wrapper:

- `GET /zatca-sdk/readiness`
- `POST /zatca-sdk/validate-xml-dry-run`
- `POST /zatca-sdk/validate-xml-local`
- `POST /zatca-sdk/validate-reference-fixture`
- `POST /sales-invoices/:id/zatca/sdk-validate`

Audit logs:

- `GET /audit-logs`
- `GET /audit-logs/:id`
- `GET /audit-logs/export.csv`
- `GET /audit-logs/retention-settings`
- `PATCH /audit-logs/retention-settings`
- `GET /audit-logs/retention-preview`
- `POST /audit-logs/retention-dry-run`

Audit log behavior:

- List/detail and retention-settings read require `auditLogs.view`; CSV export requires `auditLogs.export`; retention updates and preview/dry-run require `auditLogs.manageRetention`.
- Supports filters for `action`, `entityType`, `entityId`, `actorUserId`, `from`, `to`, `search`, `limit`, and `page`.
- Standardized high-risk event names cover auth, team/role changes, journals, fiscal periods, sales, purchases, banking, inventory, attachments, generated documents, document settings, and ZATCA local actions.
- Audit metadata is sanitized before persistence and response serialization. Passwords, token values/hashes, secrets, API/access keys, private keys, authorization headers, and base64 payload fields are redacted.
- CSV export uses the same filters as list, escapes CSV fields, includes timestamp, actor, action, entity, summary, and sanitized metadata JSON, and redacts sensitive metadata key names as well as values.
- Retention settings default to 2555 days, validate between 365 and 3650 days, store `autoPurgeEnabled`, and warn that automatic purge execution is not implemented yet.
- Retention preview and retention dry run return cutoff/counts and never delete audit logs.
- `/settings/audit-logs` provides the admin review UI with filters, CSV export, sanitized detail metadata, retention settings, and dry-run preview.

Number sequences:

- `GET /number-sequences`
- `GET /number-sequences/:id`
- `PATCH /number-sequences/:id`

Number sequence behavior:

- List/detail require `numberSequences.view`; updates require `numberSequences.manage`.
- Responses include `scope`, `prefix`, `nextNumber`, `padding`, `exampleNextNumber`, and `updatedAt`.
- Prefixes are limited to 12 uppercase letters/numbers/dash/slash characters.
- Padding must be between 3 and 10, and next number must be positive.
- Lowering `nextNumber` is blocked to avoid duplicate future document numbers.
- Prefix/padding/next-number changes affect future documents only and never renumber existing records.
- Updates write `NUMBER_SEQUENCE_UPDATED` audit logs with old/new prefix, next number, padding, and example values.
- `/settings/number-sequences` provides the admin settings UI.
- Known limitations: no reset workflow, no per-branch numbering, no document type template rules, and no historical renumbering.

## Accounting Rules

- Every tenant business record is scoped by `organizationId`.
- Tenant endpoints validate active organization membership through `x-organization-id`.
- Journal entries are `DRAFT`, `POSTED`, `VOIDED`, or `REVERSED`.
- Posted entries cannot be edited.
- Journal entries must balance using decimal-safe values.
- Reversal creates a new posted opposite journal entry and marks the original as reversed.
- Draft-only void behavior is reserved for a future endpoint.
- Mutating services create audit log records.
- Controllers stay thin; accounting rules live in service/domain layers.

## Sales Invoice Rules

Invoice line amounts are calculated server-side:

- `lineGrossAmount = quantity * unitPrice`
- `discountAmount = lineGrossAmount * discountRate / 100`
- `taxableAmount = lineGrossAmount - discountAmount`
- `taxAmount = taxableAmount * taxRate / 100`
- `lineTotal = taxableAmount + taxAmount`

Invoice totals:

- `subtotal = sum(lineGrossAmount)`
- `discountTotal = sum(discountAmount)`
- `taxableTotal = subtotal - discountTotal`
- `taxTotal = sum(taxAmount)`
- `total = taxableTotal + taxTotal`
- `balanceDue = total - posted payment allocations`

Lifecycle behavior:

- Draft invoices can be edited, deleted, finalized, or voided.
- Finalized invoices cannot be edited or deleted.
- Finalizing twice is idempotent and does not create a second journal entry.
- Voiding a draft marks it `VOIDED`.
- Voiding a finalized invoice creates or reuses one reversal journal entry and marks the invoice `VOIDED`.
- Finalized invoices with active non-voided payment allocations cannot be voided. Void the payments first.
- Voided invoices cannot be edited or finalized.

Posting behavior:

- Finalization posts one balanced journal entry inside a transaction.
- Finalization claims the draft invoice row before journal creation, so repeated or concurrent finalize calls do not double-post.
- Debit account code `120` Accounts Receivable for invoice total.
- Credit revenue accounts grouped by invoice line revenue account using taxable amounts.
- Credit account code `220` VAT Payable only when `taxTotal > 0`.
- The invoice stores the linked `journalEntryId`; voided finalized invoices store `reversalJournalEntryId`.

## Sales Credit Note Rules

Credit notes use the same line calculation semantics as sales invoices:

- `lineGrossAmount = quantity * unitPrice`
- `discountAmount = lineGrossAmount * discountRate / 100`
- `taxableAmount = lineGrossAmount - discountAmount`
- `taxAmount = taxableAmount * taxRate / 100`
- `lineTotal = taxableAmount + taxAmount`

Lifecycle behavior:

- Draft credit notes can be edited, deleted, finalized, or voided.
- Finalized credit notes cannot be edited or deleted.
- Finalizing twice is idempotent and does not create a second journal entry.
- Voiding a draft marks it `VOIDED`.
- Voiding a finalized credit note creates or reuses one reversal journal entry and marks the credit note `VOIDED`.
- Voiding a finalized credit note is blocked while active allocations exist.
- Voiding a finalized credit note is also blocked while posted customer refunds exist; void the refunds first.
- Reversed allocations do not block credit note voiding.
- Linked original invoices must belong to the same organization and customer, be finalized, and not be voided.
- Total non-voided credit notes linked to an invoice cannot exceed the original invoice total.
- `unappliedAmount` starts equal to total and decreases as credit is applied to invoices.

Posting behavior:

- Finalization posts one balanced journal entry inside a transaction.
- Debit revenue accounts grouped by credit note line revenue account using taxable amounts.
- Debit account code `220` VAT Payable only when `taxTotal > 0`.
- Credit account code `120` Accounts Receivable for the credit note total.
- The credit note stores `journalEntryId`; voided finalized credit notes store `reversalJournalEntryId`.
- Applying a finalized credit note to an invoice only creates an immutable `CreditNoteAllocation` row and updates `SalesInvoice.balanceDue` plus `CreditNote.unappliedAmount`.
- Credit application does not create another journal entry because finalization already posted the Accounts Receivable reduction.
- Allocation is guarded in a transaction so the amount cannot exceed either invoice `balanceDue` or credit note `unappliedAmount`.
- Reversing a credit allocation marks the allocation reversed, restores `SalesInvoice.balanceDue`, restores `CreditNote.unappliedAmount`, and creates no journal entry.
- Allocation reversal is transaction guarded so restored balances cannot exceed invoice total or credit note total.
- ZATCA credit note XML/submission is intentionally not implemented yet.

Credit application endpoints:

- `POST /credit-notes/:id/apply` with `{ "invoiceId": "...", "amountApplied": "10.0000" }`
- `POST /credit-notes/:id/allocations/:allocationId/reverse` with optional `{ "reason": "..." }`
- `GET /credit-notes/:id/allocations`
- `GET /sales-invoices/:id/credit-note-allocations`
- Rules: the credit note and invoice must belong to the same organization and customer, both must be finalized and non-voided, amount must be positive, and amount cannot exceed either open balance.
- Reversal rules: the allocation must be active, the credit note and invoice must still be finalized and non-voided, and restored balances cannot exceed their original totals.
- Active allocations block credit note and invoice voiding. Reversed allocations do not block voiding.

## Bank Accounts

Bank account profiles wrap existing posting asset accounts with cash/bank metadata. Profile create/update/archive actions do not replace the chart of accounts; transfer and opening-balance actions create explicit posted journals.

Behavior:

- Each profile links to one active posting `ASSET` account in the same organization.
- One profile is allowed per chart account.
- Default seed/provisioning creates profiles for account code `111 Cash` and `112 Bank Account`.
- Profile status can be `ACTIVE` or `ARCHIVED`; archiving the profile does not archive the linked chart account.
- Ledger balance is calculated from posted journal lines only: asset debits minus credits.
- Draft journals are excluded from balances and transaction rows.
- Transaction rows show posted journal date, entry number, reference, debit, credit, running balance, and best-effort source type/source id/source number.
- Payment, refund, supplier payment, supplier refund, cash expense, and manual journal activity all appear through their posted journal lines.
- Bank transfers post immediately with Dr destination bank/cash account and Cr source bank/cash account.
- Voiding a bank transfer creates or reuses one reversal journal; repeated void calls do not double-reverse.
- Opening balances can be posted once through `POST /bank-accounts/:id/post-opening-balance`.
- Positive opening balances post Dr linked bank/cash account and Cr Owner Equity account code `310`; negative balances post the reverse.
- Opening balance amount/date are locked after posting unless a future reversal workflow is added.
- Payment/refund/cash-expense forms still post using the underlying `accountId`, but show the bank profile display name when one exists.

Statement import and reconciliation behavior:

- Statement import preview parses and validates pasted CSV text or JSON rows through `POST /bank-accounts/:id/statement-imports/preview` without writing records.
- CSV preview/import supports common headers including `date`, `transaction date`, `description`, `memo`, `narration`, `reference`, `ref`, `debit`, `withdrawal`, `money out`, `credit`, `deposit`, and `money in`.
- Statement imports accept local JSON/CSV-style rows through `POST /bank-accounts/:id/statement-imports`; invalid rows reject the import unless `allowPartial=true`, and no journal entries are created during import.
- Bank statement `CREDIT` rows increase the bank balance and match debit lines on the linked bank asset account.
- Bank statement `DEBIT` rows decrease the bank balance and match credit lines on the linked bank asset account.
- Match candidates search posted bank journal lines within a seven-day window by amount and direction; matching remains manual.
- Manual matching marks a statement row `MATCHED` and links the journal line without creating a journal.
- Categorizing an unmatched row creates a posted manual journal using the statement date and the selected offset account, guarded by fiscal periods.
- Ignoring an unmatched row marks it `IGNORED` without posting.
- Reconciliation summary reports statement debit/credit totals, matched/categorized/ignored/unmatched counts, ledger balance, latest statement closing balance, difference, latest closed reconciliation, open draft state, unreconciled count, closed-through date, and a `RECONCILED`/`NEEDS_REVIEW` suggestion.
- Draft bank reconciliations store the period, statement opening/closing balances, ledger closing balance, difference, and notes.
- Reconciliations move through `DRAFT -> PENDING_APPROVAL -> APPROVED -> CLOSED`; submit requires zero difference and no unmatched rows, approve records reviewer notes, close requires approval, and reopen returns pending/approved records to draft.
- Review events are appended for submit, approve, reopen, close, and void actions.
- Closing a reconciliation snapshots statement rows into reconciliation items and locks the statement transaction period.
- Closed reconciliation periods block statement row match, categorize, ignore, overlapping statement import, import void/status-changing operations, while still allowing reads.
- Reconciliation reports are available as JSON data, CSV, and archived PDF through `/bank-reconciliations/:id/report-data`, `/report.csv`, and `/report.pdf`.
- Voiding a reconciliation keeps audit history and unlocks the period, but it does not reverse categorized journals.

Known bank account limitations:

- Import is local JSON/CSV paste only; no file upload parser, OFX, CAMT, or MT940 support yet.
- Reconciliation has approval, close/lock safeguards, and report export, but no strict dual-control enforcement beyond blocking same submitter approval unless `admin.fullAccess`.
- No dedicated approval queue or email delivery.
- No live feeds or external banking APIs.
- No payment gateway integration.
- No automatic/ML matching.
- No transfer fees or multi-currency FX transfer handling.

## Customer Payment Rules

Customer payments are posted immediately in this MVP.

Allocation behavior:

- A payment must reference an active customer contact in the same organization.
- The paid-through account must be an active posting asset account in the same organization.
- Allocation invoices must be finalized, non-voided, open invoices for the same customer.
- Allocation amounts must be greater than zero and cannot exceed invoice `balanceDue`.
- Total allocated amount cannot exceed `amountReceived`.
- Partial payments are supported; invoice `balanceDue` is reduced by allocated amount.
- Allocation writes use conditional invoice balance updates to prevent concurrent payments from making `balanceDue` negative.
- If `amountReceived` is greater than allocated amount, the difference is stored as `unappliedAmount`.
- Unapplied payment credit can be applied later to finalized open invoices for the same customer through `CustomerPaymentUnappliedAllocation` audit rows.
- Applying unapplied payment credit decreases `SalesInvoice.balanceDue` and `CustomerPayment.unappliedAmount`; it does not create a journal entry because the original payment already posted the AR reduction.
- Reversing an unapplied payment allocation marks the allocation reversed, restores `SalesInvoice.balanceDue`, restores `CustomerPayment.unappliedAmount`, and creates no journal entry.
- Unapplied payment application and reversal are transaction guarded so balances cannot go below zero or above invoice/payment totals.
- Current `unappliedAmount` can be refunded manually through customer refunds. Amounts applied to invoices are not refundable unless their allocation is reversed first.

Payment posting behavior:

- Payment creation posts one balanced journal entry inside a transaction.
- Debit the paid-through cash/bank asset account for `amountReceived`.
- Credit account code `120` Accounts Receivable for `amountReceived`.
- Payment creation creates immutable allocation rows and updates invoice balances.
- Voiding a posted payment creates or reuses one reversal journal entry, marks the payment `VOIDED`, and restores invoice balances.
- Voiding a posted payment is blocked while posted customer refunds exist for its unapplied amount; void the refunds first.
- Voiding a posted payment is blocked while active unapplied payment allocations exist; reverse those allocations first.
- Payment voiding claims the posted payment row before restoring balances, so repeated or concurrent void calls restore each invoice balance only once.
- Voiding twice is idempotent and does not create repeated reversals.

Concurrency/idempotency notes:

- Invoice finalization, invoice voiding, customer payment creation, unapplied payment application/reversal, and payment voiding are protected with database transactions plus conditional row updates.
- Manual journal reversal handles duplicate reversal attempts with a clear business error instead of leaking a database unique-constraint error.
- A failed journal creation or allocation claim rolls back the surrounding accounting workflow.

## Customer Refund Rules

Customer refunds are manual accounting records only. They do not call payment gateways, banks, or ZATCA.

Refund sources:

- `CUSTOMER_PAYMENT`: the source payment must be posted, non-voided, same organization, same customer, and have enough `unappliedAmount`.
- `CREDIT_NOTE`: the source credit note must be finalized, non-voided, same organization, same customer, and have enough `unappliedAmount`.
- The paid-from account must be an active posting asset account in the same organization.
- Refunds are posted immediately in this MVP and reduce the source `unappliedAmount` in the same transaction.
- Voiding a posted refund creates or reuses one reversal journal, marks the refund `VOIDED`, and restores the source `unappliedAmount`.
- Voiding twice is idempotent and does not restore source balances twice.

Posting behavior:

- Refund posting debits account code `120` Accounts Receivable for `amountRefunded`.
- Refund posting credits the selected paid-from bank/cash account for `amountRefunded`.
- Refund voiding reverses that journal and restores the source customer credit.
- Customer refund PDFs are operational documents only and are archived through generated documents.

## Purchase Order Rules

Purchase orders are non-posting supplier order documents. They can be converted into draft purchase bills, but they do not create journal entries.

- Lines use the same quantity, discount, VAT, and total calculations as purchase bills.
- Draft purchase orders can be edited, deleted, approved, or voided.
- Approving requires a positive total.
- Approved purchase orders can be marked as sent, converted to a bill, closed, or voided.
- Sent purchase orders can be converted to a bill, closed, or voided.
- Converted purchase orders move to `BILLED` and store the converted bill link.
- Closed, billed, and voided purchase orders cannot be edited or converted.
- Conversion creates a `DRAFT` purchase bill from the supplier, branch, currency, notes, terms, lines, taxes, and totals.
- Conversion requires each line to have an account or an item expense account so the later bill finalization can post correctly.
- Purchase order PDFs are operational documents only and are archived through generated documents.

Known purchase order limitations:

- No partial receiving.
- No partial billing.
- No approval workflow or delegated approval chain.
- No inventory stock receipt or stock movement.
- No email sending to suppliers.

## Purchase Bill Rules

Purchase bill lines use the same decimal-safe calculation semantics as sales invoices:

- `lineGrossAmount = quantity * unitPrice`
- `discountAmount = lineGrossAmount * discountRate / 100`
- `taxableAmount = lineGrossAmount - discountAmount`
- `taxAmount = taxableAmount * taxRate / 100`
- `lineTotal = taxableAmount + taxAmount`

Lifecycle behavior:

- Draft purchase bills can be edited, deleted, finalized, or voided.
- Finalized purchase bills cannot be edited or deleted.
- Finalizing twice is idempotent and does not create a second journal entry.
- Voiding a draft marks it `VOIDED`.
- Voiding a finalized bill creates or reuses one reversal journal entry and marks the bill `VOIDED`.
- Finalized bills with active supplier payment allocations cannot be voided. Void the supplier payment first.
- Finalized bills with active supplier payment unapplied allocations cannot be voided. Reverse the unapplied payment applications first.
- Finalized bills with active purchase debit note allocations cannot be voided. Reverse the debit note allocations first.
- Voided bills cannot be edited or finalized.

Posting behavior:

- Finalization posts one balanced accounts payable journal entry inside a transaction.
- Debit purchase expense, cost-of-sales, or asset accounts grouped by bill line taxable amounts.
- Debit account code `230` VAT Receivable only when `taxTotal > 0`.
- Credit account code `210` Accounts Payable for the bill total.
- The bill stores `journalEntryId`; voided finalized bills store `reversalJournalEntryId`.
- Purchase bills now store `inventoryPostingMode`.
- `DIRECT_EXPENSE_OR_ASSET` is the default and preserves the current posting behavior.
- `INVENTORY_CLEARING` is explicit accountant-reviewed compatibility behavior for manual receipt inventory asset posting. For inventory-tracked lines it debits Inventory Clearing instead of the selected line account; non-inventory lines remain direct.
- Inventory Clearing mode finalization is allowed only for compatible draft bills with enabled inventory accounting, a valid separate clearing account, moving-average valuation, and preview-only receipt posting mode.
- `GET /purchase-bills/:id/accounting-preview` returns a preview-only journal shape for direct mode or clearing mode. It does not create journals.

## Purchase Debit Note Rules

Purchase debit notes are AP-side supplier credit/return/overcharge adjustment documents. They do not submit anything to ZATCA and do not move inventory.

- Lines use the same calculation semantics as purchase bills.
- Draft debit notes can be edited, deleted, finalized, or voided.
- Finalized debit notes cannot be edited or deleted. Finalizing twice is idempotent.
- Linked original bills must belong to the same organization and supplier, be finalized, and not be voided.
- Total non-voided debit notes linked to a bill cannot exceed the original bill total.
- Finalization posts one balanced AP reversal journal: debit account code `210` Accounts Payable, credit purchase expense/COGS/asset accounts by line taxable amounts, and credit VAT Receivable account code `230` when tax exists.
- `unappliedAmount` starts equal to total and decreases as the debit note is applied to open purchase bills.
- Applying or reversing a debit note allocation only updates `PurchaseBill.balanceDue`, `PurchaseDebitNote.unappliedAmount`, and immutable allocation audit rows. It creates no journal entry because finalization already posted the AP reduction.
- Active debit note allocations block debit note voiding and purchase bill voiding until reversed.
- Posted supplier refunds from a purchase debit note block debit note voiding until the refunds are voided.
- Purchase debit note `unappliedAmount` can be reduced by manual supplier refunds; refund voiding restores the source unapplied amount.
- Debit note PDFs are operational documents only and are archived through generated documents.

## Supplier Payment Rules

Supplier payments are posted immediately in this MVP.

- A payment must reference an active supplier contact in the same organization.
- The paid-through account must be an active posting asset account in the same organization.
- Allocation bills must be finalized, non-voided, open bills for the same supplier.
- Allocation amounts must be greater than zero and cannot exceed bill `balanceDue`.
- Total allocated amount cannot exceed `amountPaid`.
- Partial supplier payments are supported; bill `balanceDue` is reduced by allocated amount.
- If `amountPaid` is greater than allocated amount, the difference is stored as `unappliedAmount`.
- Unapplied supplier payment credit can be applied later to finalized open bills for the same supplier through `SupplierPaymentUnappliedAllocation` audit rows.
- Applying unapplied supplier payment credit decreases `PurchaseBill.balanceDue` and `SupplierPayment.unappliedAmount`; it does not create a journal entry because the original supplier payment already posted the AP reduction.
- Reversing an unapplied supplier payment allocation marks the allocation reversed, restores `PurchaseBill.balanceDue`, restores `SupplierPayment.unappliedAmount`, and creates no journal entry.
- Unapplied supplier payment application and reversal are transaction guarded so balances cannot go below zero or above bill/payment totals.
- Current supplier payment `unappliedAmount` can be refunded manually through supplier refunds. Amounts applied to bills are not refundable unless their allocation is reversed first.
- Payment creation posts debit account code `210` Accounts Payable and credit the selected paid-through account.
- Voiding a posted supplier payment creates or reuses one reversal journal, marks the payment `VOIDED`, and restores allocated bill balances once.
- Voiding a posted supplier payment is blocked while active unapplied payment allocations exist; reverse those allocations first.
- Voiding a posted supplier payment is blocked while posted supplier refunds exist for its unapplied amount; void the refunds first.
- Supplier payment PDFs are operational receipt documents only and are archived through generated documents.

## Supplier Refund Rules

Supplier refunds are manual accounting records for money returned by a supplier. They do not call banks, payment gateways, or ZATCA.

Refund sources:

- `SUPPLIER_PAYMENT`: the source payment must be posted, non-voided, same organization, same supplier, and have enough `unappliedAmount`.
- `PURCHASE_DEBIT_NOTE`: the source debit note must be finalized, non-voided, same organization, same supplier, and have enough `unappliedAmount`.
- The received-into account must be an active posting asset account in the same organization.
- Refunds are posted immediately in this MVP and reduce the source `unappliedAmount` in the same transaction.
- Voiding a posted refund creates or reuses one reversal journal, marks the refund `VOIDED`, and restores the source `unappliedAmount`.
- Voiding twice is idempotent and does not restore source balances twice.

Posting behavior:

- Refund posting debits the selected received-into bank/cash asset account for `amountRefunded`.
- Refund posting credits account code `210` Accounts Payable for `amountRefunded`.
- Refund voiding reverses that journal and restores the source supplier credit.
- Supplier refund PDFs are operational documents only and are archived through generated documents.

## Customer Ledger Rules

Customer ledgers are available for contacts of type `CUSTOMER` or `BOTH`.

- `GET /contacts/:id/ledger` returns contact summary, opening balance, closing balance, and chronological ledger rows.
- Opening balance is `0.0000` for the full ledger foundation.
- Invoice rows increase accounts receivable with a debit equal to invoice total.
- Credit note rows decrease accounts receivable with a credit equal to finalized credit note total.
- Payment rows decrease accounts receivable with a credit equal to payment `amountReceived`.
- Payment allocation rows are visible as zero-value informational rows to avoid double-counting.
- Unapplied payment application rows are visible as zero-value informational rows to show later customer-credit matching without double-counting.
- Unapplied payment allocation reversal rows are also zero-value informational rows and do not change running balance.
- Credit note allocation rows are visible as zero-value informational rows to show invoice matching without double-counting.
- Credit note allocation reversal rows are also zero-value informational rows and do not change running balance.
- Customer refund rows increase accounts receivable with a debit equal to the refunded amount because customer credit is reduced.
- Voided customer refund rows reverse that effect with a credit equal to the refunded amount.
- Voided credit note rows reverse the visible credit note effect with a debit equal to credit note total.
- Voided payment rows reverse the visible payment effect with a debit equal to payment `amountReceived`.
- Voided invoice rows reverse the visible invoice effect with a credit equal to invoice total.
- Running balance is decimal-safe and reflects finalized invoices, credit notes, posted payments, and their visible void rows.
- Unapplied payment amounts are included in row metadata because payment creation currently credits AR for full `amountReceived`.

Customer statements:

- `GET /contacts/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD` reuses ledger rows with period filtering.
- `openingBalance` is calculated from ledger activity before `from`.
- `closingBalance` is calculated at the end of the filtered period.
- `GET /contacts/:id/statement-pdf-data?from=YYYY-MM-DD&to=YYYY-MM-DD` returns structured statement data for templates.
- `GET /contacts/:id/statement.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD` returns a basic server-rendered statement PDF.

## Supplier Ledger Rules

Supplier ledgers are available for contacts of type `SUPPLIER` or `BOTH`.

- `GET /contacts/:id/supplier-ledger` returns contact summary, opening balance, closing balance, and chronological AP ledger rows.
- `GET /contacts/:id/supplier-statement?from=YYYY-MM-DD&to=YYYY-MM-DD` reuses supplier ledger rows with period filtering.
- Purchase bill rows increase accounts payable with a credit equal to bill total.
- Purchase debit note rows decrease accounts payable with a debit equal to debit note total.
- Voided purchase debit note rows reverse that visible effect with a credit equal to debit note total.
- Purchase debit note allocation and allocation reversal rows are neutral audit rows with zero debit and zero credit.
- Supplier payment rows decrease accounts payable with a debit equal to payment `amountPaid`.
- Supplier payment unapplied allocation and allocation reversal rows are neutral audit rows with zero debit and zero credit.
- Voided supplier payment rows reverse that visible effect with a credit equal to payment `amountPaid`.
- Supplier refund rows credit accounts payable because supplier-returned cash reduces the supplier credit/AP position already created by an overpayment or debit note.
- Voided supplier refund rows reverse that visible effect with a debit equal to the refunded amount.
- Linked cash expense rows are neutral informational rows with zero debit and zero credit because cash expenses are paid immediately and do not create accounts payable.
- Voided purchase bill rows reverse that visible effect with a debit equal to bill total.
- Running balance is decimal-safe and represents payable amount owed to the supplier.

## Cash Expenses

Cash expenses record direct paid expenses such as rent, office supplies, bank fees, meals, travel, fuel, or small purchases. They are different from purchase bills because they do not create Accounts Payable first.

APIs:

- `GET /cash-expenses`
- `POST /cash-expenses`
- `GET /cash-expenses/:id`
- `POST /cash-expenses/:id/void`
- `GET /cash-expenses/:id/pdf-data`
- `GET /cash-expenses/:id/pdf`

Posting behavior:

- Cash expenses are created as `POSTED` immediately for the MVP.
- Posting debits line expense, cost-of-sales, or asset accounts by taxable amount.
- Posting debits VAT Receivable account code `230` when tax exists.
- Posting credits the selected paid-through cash/bank asset account for the total.
- Voiding creates one reversal journal and marks the cash expense `VOIDED`; repeated void calls reuse the existing voided state.
- Optional linked contacts must be supplier or both-type contacts.
- Linked supplier cash expense activity appears in the supplier ledger as a zero-value informational row and does not affect AP running balance.

PDF endpoints:

- `GET /cash-expenses/:id/pdf-data` returns structured cash expense receipt data.
- `GET /cash-expenses/:id/pdf` returns and archives a basic operational cash expense PDF.

Known limitations:

- Receipt attachments are database-backed groundwork only; no object storage, virus scanning, or OCR exists yet.
- No employee claim approval workflow exists yet.
- No receipt-side bank-feed matching exists yet.

## Fiscal Period Management

Fiscal periods are accountant-controlled posting windows.

APIs:

- `GET /fiscal-periods`
- `POST /fiscal-periods`
- `GET /fiscal-periods/:id`
- `PATCH /fiscal-periods/:id`
- `POST /fiscal-periods/:id/close`
- `POST /fiscal-periods/:id/reopen`
- `POST /fiscal-periods/:id/lock`

Behavior:

- Periods have `OPEN`, `CLOSED`, or `LOCKED` status.
- Period date ranges cannot overlap inside the same organization.
- If an organization has no fiscal periods, posting is allowed for MVP compatibility.
- If periods exist, posting dates must fall inside an `OPEN` fiscal period.
- `CLOSED` and `LOCKED` periods block posted journals and workflow reversal journals with clear 400 errors.
- Locked periods cannot be reopened in this MVP.
- Reports can still read data from closed and locked periods.

Guarded workflows:

- Manual journal posting and reversal.
- Sales invoice finalization and finalized invoice void reversal.
- Customer payment posting and void reversal.
- Customer refund posting and void reversal.
- Credit note finalization and void reversal.
- Purchase bill finalization and void reversal.
- Supplier payment posting and void reversal.
- Supplier refund posting and void reversal.
- Purchase debit note finalization and void reversal.
- Cash expense posting and void reversal.

Matching-only workflows are intentionally not fiscal-period guarded because they create no journal entry: customer/supplier payment allocations, unapplied payment applications/reversals, credit note allocations/reversals, and purchase debit note allocations/reversals.

Known limitations:

- No unlock/admin approval workflow exists yet.
- Reversal posting date currently uses the current date; no user-selected reversal date is exposed yet.
- No fiscal year wizard or formal year-end close exists yet.
- No retained earnings close process exists yet.

## Dashboard Overview

The app dashboard is a read-only accountant/admin overview backed by `GET /dashboard/summary`.

Dashboard widgets currently show:

- Cash/bank balance from posted ledger activity for active bank profiles.
- Unpaid and overdue invoice/bill balances.
- Sales, purchases, customer payments, and supplier payments for the current month.
- Inventory tracked-item count, low-stock count, negative-stock count, estimated stock value, and clearing variance count.
- Trial Balance and Balance Sheet balanced flags plus month-to-date net profit.
- ZATCA readiness blocker count, locked fiscal period count, and current-month audit log count.
- Lightweight chart widgets for the last six months of sales, purchases, net profit, and cash balance.
- AR/AP aging bars and a low-stock watchlist from existing report/dashboard data.

Attention items and KPI cards link to the relevant review surfaces for overdue AR/AP, unreconciled bank rows, low stock, inventory clearing variances, Trial Balance, P&L, Balance Sheet, ZATCA readiness, fiscal period coverage, audit logs, and database-backed document storage where the user's permissions allow the link.

Known limitations:

- No customizable dashboard layout.
- No advanced charting, saved dashboard preferences, or configurable widgets yet.
- KPI definitions are MVP business-overview definitions and still need accountant/product review.
- Dashboard data is read-only and does not replace detailed reports or ledgers.

## Core Accounting Reports

Reports are accountant-facing MVP outputs derived from real LedgerByte data. Journal-based reports use posted journal activity only, including historical entries marked `REVERSED` plus their posted reversal journals. AR/AP aging uses current finalized open invoice and bill balances.

APIs:

- `GET /reports/general-ledger?from=YYYY-MM-DD&to=YYYY-MM-DD&accountId=<optional>&format=json|csv`
- `GET /reports/general-ledger/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/trial-balance?from=YYYY-MM-DD&to=YYYY-MM-DD&includeZero=true&format=json|csv`
- `GET /reports/trial-balance/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/profit-and-loss?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv`
- `GET /reports/profit-and-loss/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/balance-sheet?asOf=YYYY-MM-DD&format=json|csv`
- `GET /reports/balance-sheet/pdf?asOf=YYYY-MM-DD`
- `GET /reports/vat-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv`
- `GET /reports/vat-summary/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/aged-receivables?asOf=YYYY-MM-DD&format=json|csv`
- `GET /reports/aged-receivables/pdf?asOf=YYYY-MM-DD`
- `GET /reports/aged-payables?asOf=YYYY-MM-DD&format=json|csv`
- `GET /reports/aged-payables/pdf?asOf=YYYY-MM-DD`

Behavior:

- General Ledger returns opening balances, period debits/credits, closing balances, and natural running balances by account.
- Trial Balance returns opening, period, and closing debit/credit columns and a balanced flag.
- Profit & Loss uses revenue, cost-of-sales, and expense accounts; revenue is credit-positive and expenses/COGS are debit-positive.
- Balance Sheet uses assets, liabilities, equity, and retained earnings from P&L accounts up to `asOf`.
- VAT Summary uses VAT Payable `220` and VAT Receivable `230` journal activity and is not an official VAT return filing report yet.
- Aged Receivables uses finalized non-voided sales invoices with `balanceDue > 0`.
- Aged Payables uses finalized non-voided purchase bills with `balanceDue > 0`.
- CSV exports return `text/csv`, escape commas/quotes/newlines, include report title/date metadata, and use attachment filenames such as `trial-balance-YYYY-MM-DD.csv`.
- PDF exports use the shared PDFKit renderer in `packages/pdf-core` and are archived automatically as generated documents.

Frontend pages:

- `/reports/general-ledger`
- `/reports/trial-balance`
- `/reports/profit-and-loss`
- `/reports/balance-sheet`
- `/reports/vat-summary`
- `/reports/aged-receivables`
- `/reports/aged-payables`

Known limitations:

- No scheduled reports or email report delivery exists yet.
- VAT Summary is not an official VAT filing report.
- CSV output is intentionally basic.
- Fiscal period labels are not shown on reports yet.
- Reports need accountant review before production use.

## Inventory Groundwork

Inventory movement support remains operational-first in this MVP. Warehouses, direct opening balances, controlled inventory adjustments, warehouse transfers, purchase receipts, sales stock issues, a stock movement ledger, item/warehouse balances, valuation policy settings, inventory accounting settings, journal previews, manual COGS posting, explicit purchase bill Inventory Clearing finalization, compatible manual purchase receipt asset posting, and operational inventory reports exist so teams can track quantities and review accountant-gated posting design without automatic inventory GL posting.

APIs:

- `GET /warehouses`
- `POST /warehouses`
- `GET /warehouses/:id`
- `PATCH /warehouses/:id`
- `POST /warehouses/:id/archive`
- `POST /warehouses/:id/reactivate`
- `GET /stock-movements?itemId=&warehouseId=&from=&to=&type=`
- `POST /stock-movements`
- `GET /stock-movements/:id`
- `GET /inventory-adjustments`
- `POST /inventory-adjustments`
- `GET /inventory-adjustments/:id`
- `PATCH /inventory-adjustments/:id`
- `DELETE /inventory-adjustments/:id`
- `POST /inventory-adjustments/:id/approve`
- `POST /inventory-adjustments/:id/void`
- `GET /warehouse-transfers`
- `POST /warehouse-transfers`
- `GET /warehouse-transfers/:id`
- `POST /warehouse-transfers/:id/void`
- `GET /purchase-receipts`
- `POST /purchase-receipts`
- `GET /purchase-receipts/:id`
- `GET /purchase-receipts/:id/accounting-preview`
- `POST /purchase-receipts/:id/post-inventory-asset`
- `POST /purchase-receipts/:id/reverse-inventory-asset`
- `POST /purchase-receipts/:id/void`
- `GET /purchase-orders/:id/receiving-status`
- `GET /purchase-orders/:id/receipt-matching-status`
- `GET /purchase-bills/:id/receiving-status`
- `GET /purchase-bills/:id/receipt-matching-status`
- `GET /sales-stock-issues`
- `POST /sales-stock-issues`
- `GET /sales-stock-issues/:id`
- `GET /sales-stock-issues/:id/accounting-preview`
- `POST /sales-stock-issues/:id/post-cogs`
- `POST /sales-stock-issues/:id/reverse-cogs`
- `POST /sales-stock-issues/:id/void`
- `GET /sales-invoices/:id/stock-issue-status`
- `GET /inventory/balances?itemId=&warehouseId=`
- `GET /inventory/settings`
- `PATCH /inventory/settings`
- `GET /inventory/accounting-settings`
- `PATCH /inventory/accounting-settings`
- `GET /inventory/purchase-receipt-posting-readiness`
- `GET /purchase-bills/:id/accounting-preview`
- `GET /inventory/reports/stock-valuation?itemId=&warehouseId=&format=csv`
- `GET /inventory/reports/movement-summary?from=&to=&itemId=&warehouseId=&format=csv`
- `GET /inventory/reports/low-stock?format=csv`
- `GET /inventory/reports/clearing-reconciliation?from=&to=&supplierId=&purchaseBillId=&purchaseReceiptId=&status=&format=csv`
- `GET /inventory/reports/clearing-variance?from=&to=&supplierId=&purchaseBillId=&purchaseReceiptId=&status=&format=csv`
- `GET /inventory/variance-proposals`
- `POST /inventory/variance-proposals`
- `POST /inventory/variance-proposals/from-clearing-variance`
- `GET /inventory/variance-proposals/:id`
- `GET /inventory/variance-proposals/:id/events`
- `GET /inventory/variance-proposals/:id/accounting-preview`
- `POST /inventory/variance-proposals/:id/submit`
- `POST /inventory/variance-proposals/:id/approve`
- `POST /inventory/variance-proposals/:id/post`
- `POST /inventory/variance-proposals/:id/reverse`
- `POST /inventory/variance-proposals/:id/void`

Behavior:

- Each seeded or newly provisioned organization gets an active default warehouse with code `MAIN`.
- Warehouse codes are unique per organization and normalized to uppercase.
- The only stock movement type users can create directly in this MVP is `OPENING_BALANCE`; adjustment and transfer movement rows are generated by their controlled workflows.
- Stock movement quantities are always stored as positive numbers; the movement type determines whether quantity increases or decreases stock.
- Stock movements require an inventory-tracked active item and an active warehouse.
- `OPENING_BALANCE` is rejected after one opening balance already exists for the same item and warehouse.
- Inventory adjustments are created as `DRAFT`, can be edited/deleted only while draft, and approval creates `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` stock movements.
- Approved adjustments can be voided once; the void creates the opposite adjustment movement and does not create a journal entry.
- Warehouse transfers post immediately as `POSTED` records with paired `TRANSFER_OUT` and `TRANSFER_IN` movements.
- Warehouse transfer voiding creates paired reversal movements once and rejects repeated void attempts.
- Purchase receipts can be posted from purchase orders, finalized purchase bills, or standalone supplier receipts. They create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements only.
- Purchase order and purchase bill receiving status endpoints return per-line ordered/billed, received, remaining, and overall `NOT_STARTED`/`PARTIAL`/`COMPLETE` status.
- Purchase order and purchase bill receipt matching endpoints return operational matching visibility, receipt values, per-line quantity/value differences, linked receipts, and `NOT_RECEIVED`/`PARTIALLY_RECEIVED`/`FULLY_RECEIVED`/`OVER_RECEIVED_WARNING` status. They do not mutate accounting.
- Sales stock issues can be posted from finalized, non-voided sales invoices. They create `SALES_ISSUE_PLACEHOLDER` stock movements only and cannot exceed invoice line remaining quantities.
- Sales stock issue COGS is manual only. It is posted only through `POST /sales-stock-issues/:id/post-cogs` after preview/accountant review; invoices and stock issues do not auto-post COGS.
- Sales invoice stock issue status returns per-line invoiced, issued, remaining, and overall `NOT_STARTED`/`PARTIAL`/`COMPLETE` status.
- Purchase receipt voids create reversing `ADJUSTMENT_OUT` movements and are blocked if the reversal would make stock negative. Sales stock issue voids create reversing `ADJUSTMENT_IN` movements.
- Decrease adjustments and transfer-outs are rejected when they would make item/warehouse quantity negative.
- Archived warehouses cannot receive new stock movements, and the only active default warehouse cannot be archived.
- `GET /inventory/balances` returns derived quantity on hand by item and warehouse from opening balance, adjustment, transfer, and placeholder receipt/issue directions. Average unit cost and inventory value are simple operational estimates from costed inbound movements, not accounting-grade valuation.
- `GET /inventory/settings` creates default settings on first read: `MOVING_AVERAGE`, negative stock blocked, and inventory value tracking enabled.
- `PATCH /inventory/settings` can save `MOVING_AVERAGE` or `FIFO_PLACEHOLDER`, but FIFO is only a placeholder and report calculations still use moving-average estimates.
- `GET /inventory/accounting-settings` returns preview-only inventory accounting readiness, default-disabled `enableInventoryAccounting`, inventory asset/COGS/inventory clearing/adjustment mapping fields, `purchaseReceiptPostingMode`, blocking reasons, and warnings.
- `PATCH /inventory/accounting-settings` validates that mapped accounts belong to the organization, are active, allow posting, and have approved account types. Inventory accounting cannot be enabled without inventory asset and COGS mappings, the clearing account must be separate from inventory asset and Accounts Payable code `210`, and FIFO remains placeholder-only.
- `GET /inventory/purchase-receipt-posting-readiness` returns an advisory check for manual-only purchase receipt inventory asset posting. It checks inventory accounting, moving-average valuation, preview-only receipt mode, Inventory Asset and Inventory Clearing mappings, account separation, direct-mode bill count, clearing-mode bill count, and warns that automatic purchase receipt GL posting is not enabled. It creates no settings, journals, or accounting mutations.
- `GET /purchase-bills/:id/accounting-preview` returns current bill posting mode, preview-only journal lines, AP/VAT/Clearing account visibility, tracked/direct line counts, warnings, blockers, and finalization readiness. Direct mode previews current AP posting; clearing mode previews Dr Inventory Clearing for tracked lines and can finalize when settings are valid.
- `GET /purchase-receipts/:id/accounting-preview` returns Dr Inventory Asset / Cr Inventory Clearing preview lines when line unit costs and mappings exist, plus receipt value, linked bill mode/status, matched bill value, unmatched receipt value, value difference, matching summary, posting status, journal ids, blockers, and warnings. It returns `canPost: true` only for posted, unvoided receipts linked to finalized `INVENTORY_CLEARING` purchase bills with enabled inventory accounting and valid Inventory Asset/Inventory Clearing mappings.
- `POST /purchase-receipts/:id/post-inventory-asset` requires `inventory.receipts.postAsset`, a compatible finalized `INVENTORY_CLEARING` purchase bill, enabled inventory accounting, `MOVING_AVERAGE`, mapped active posting Inventory Asset and Inventory Clearing accounts, unit costs on every receipt line, positive receipt value, no existing receipt asset journal, and an open fiscal period on the receipt date. It creates one posted journal: Dr Inventory Asset, Cr Inventory Clearing. It does not mutate stock movements, purchase bills, supplier ledger, or AP.
- `POST /purchase-receipts/:id/reverse-inventory-asset` requires `inventory.receipts.reverseAsset`, an existing unreversed receipt asset journal, and an open fiscal period on the current date. It creates one reversal journal and does not void the purchase receipt.
- `GET /inventory/reports/clearing-reconciliation` compares finalized `INVENTORY_CLEARING` purchase bill clearing debits with active linked purchase receipt asset posting credits. It supports `from`, `to`, `supplierId`, `purchaseBillId`, `purchaseReceiptId`, `status`, and `format=csv`.
- `GET /inventory/reports/clearing-variance` returns only problem rows: unmatched clearing-mode bills, partial/variant values, reversed receipt asset postings, and receipt asset postings without compatible clearing bills. It is review-only and never creates variance journals.
- `POST /inventory/variance-proposals/from-clearing-variance` recomputes the selected clearing variance server-side, creates a `DRAFT` proposal with stored debit/credit accounts, and creates no journal.
- `POST /inventory/variance-proposals` creates a manual `DRAFT` variance proposal from accountant-selected debit and credit accounts. The amount must be positive and accounts must be active posting accounts in the organization.
- Inventory variance proposal lifecycle is `DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED`; `VOIDED` is allowed before posting. Posting requires `inventory.varianceProposals.post`, an approved proposal, an open fiscal period on `proposalDate`, and explicitly creates Dr debit account / Cr credit account. Reversal requires `inventory.varianceProposals.reverse` and creates one reversal journal dated to the current date. No proposal, report, or preview endpoint auto-posts.
- `GET /sales-stock-issues/:id/accounting-preview` returns moving-average estimated COGS, Dr COGS / Cr Inventory Asset preview lines, posting status, COGS journal ids when present, and `canPost: true` only when the stock issue is eligible for manual posting.
- `POST /sales-stock-issues/:id/post-cogs` requires `inventory.cogs.post`, enabled inventory accounting, mapped inventory asset and COGS accounts, `MOVING_AVERAGE`, a posted/unvoided stock issue, no existing COGS journal, no preview blocking reasons, and an open fiscal period on the stock issue date. It creates one posted journal: Dr COGS, Cr Inventory Asset.
- `POST /sales-stock-issues/:id/reverse-cogs` requires `inventory.cogs.reverse`, an existing unreversed COGS journal, and an open fiscal period on the current date. It creates one reversal journal and does not void the stock issue.
- `docs/inventory/INVENTORY_ACCOUNTING_INTEGRITY_AUDIT.md` records the 2026-05-15 inventory accounting integrity audit. It found no code-level double-counting defect in the current manual posting paths and approved the accountant-reviewed variance proposal workflow that now exists without automatic posting.
- `GET /inventory/reports/stock-valuation` derives quantity, average unit cost, estimated value, item totals, and grand total from stock movements. Missing inbound cost data is surfaced as a row warning.
- `GET /inventory/reports/movement-summary` returns opening, inbound, outbound, closing, movement count, and movement-type breakdown by item and warehouse.
- `GET /inventory/reports/low-stock` returns inventory-tracked items whose total quantity on hand is at or below `Item.reorderPoint`.

Accounting limitation:

- Inventory movements do not create journal entries automatically and do not affect GL, COGS, inventory asset balances, VAT, or financial statements unless a user explicitly posts COGS for a sales stock issue, explicitly posts inventory asset for a compatible purchase receipt, or explicitly posts an approved inventory variance proposal. Purchase bill finalization affects AP/VAT/line accounts or Inventory Clearing according to the selected bill posting mode.
- Stock valuation is an operational estimate only. It is not the GL inventory asset value and is not used for Balance Sheet, Profit & Loss, VAT, or COGS.
- Purchase receipts debit inventory asset accounts only through the explicit `post-inventory-asset` action and only when linked to a finalized `INVENTORY_CLEARING` purchase bill.
- Inventory clearing account settings, bill/receipt matching visibility, purchase bill inventory posting mode, and purchase bill accounting preview exist. Explicit Inventory Clearing purchase bill finalization posts purchase bill clearing journals, and compatible purchase receipts can now be manually posted Dr Inventory Asset / Cr Inventory Clearing.
- Inventory accounting settings, readiness, reports, proposal creation/review, and preview endpoints do not create `JournalEntry` records; explicit manual COGS posting, explicit purchase bill finalization, explicit purchase receipt asset posting, and explicit approved variance proposal posting are the inventory-adjacent journal paths in this phase.

Manual COGS posting behavior:

- Review account mappings, moving-average estimates, and preview journals with an accountant.
- Post COGS only from the sales stock issue detail or API action after review.
- The posting date is the stock issue date and must pass fiscal-period guard.
- Voiding a stock issue is blocked while COGS is posted and not reversed.
- Reports reflect posted COGS naturally through posted journal lines.

Manual receipt asset posting behavior:

- Inventory Clearing purchase bill finalization is implemented for explicitly selected compatible bills.
- Manual purchase receipt inventory asset posting is implemented only for compatible finalized `INVENTORY_CLEARING` bills and posts Dr Inventory Asset / Cr Inventory Clearing after review.
- Voiding a purchase receipt is blocked while an inventory asset journal is active and unreversed.
- The readiness panel remains a no-auto-posting warning: automatic purchase receipt GL posting is not enabled and direct-mode historical bills are excluded from receipt asset posting.
- Keep FIFO disabled for accounting until cost layers and layer depletion rules exist.

Known limitations:

- No automatic GL inventory posting.
- COGS posting is manual only; no invoice or stock issue auto-posting.
- Purchase receipt inventory asset posting is manual only and blocked for `DIRECT_EXPENSE_OR_ASSET` bills.
- Inventory Clearing purchase bill finalization and receipt asset posting can leave timing differences in Inventory Clearing until receipts and bills are reviewed in the clearing reconciliation and variance reports.
- Existing finalized direct-mode purchase bills are not migrated.
- No automatic variance posting. Inventory variance proposals exist, but journals are created only after submit, approval, and an explicit post action.
- No automatic purchase receipt from purchase orders or bills.
- No automatic sales delivery or stock issue from sales invoices.
- No landed cost.
- FIFO is placeholder-only.
- Accountant review is required before financial inventory postings.
- No barcode, serial, or batch tracking.
- No accounting-grade inventory financial reports; current inventory reports are operational estimates only.

Receipt data:

- `GET /customer-payments/:id/receipt-data` returns structured receipt data for future PDF rendering.
- The response includes organization, customer, payment, paid-through account, journal entry, status, and invoice allocations.
- `GET /customer-payments/:id/receipt-pdf-data` returns the receipt PDF data contract.
- `GET /customer-payments/:id/receipt.pdf` returns a basic server-rendered receipt PDF.

## PDF Groundwork

`packages/pdf-core` contains shared TypeScript data contracts and simple server-side PDF renderers using PDFKit.

Implemented PDF documents:

- Sales invoice PDF: `GET /sales-invoices/:id/pdf`
- Sales credit note PDF: `GET /credit-notes/:id/pdf`
- Customer payment receipt PDF: `GET /customer-payments/:id/receipt.pdf`
- Customer statement PDF: `GET /contacts/:id/statement.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Credit note PDFs include total, unapplied amount, and any invoice credit allocations.
- Customer payment receipt PDFs include current unapplied amount and any later unapplied-payment applications.
- Customer refund PDF: `GET /customer-refunds/:id/pdf`
- Purchase order PDF: `GET /purchase-orders/:id/pdf`
- Purchase bill PDF: `GET /purchase-bills/:id/pdf`
- Purchase debit note PDF: `GET /purchase-debit-notes/:id/pdf`
- Supplier payment receipt PDF: `GET /supplier-payments/:id/receipt.pdf`
- Supplier refund PDF: `GET /supplier-refunds/:id/pdf`
- Cash expense PDF: `GET /cash-expenses/:id/pdf`
- Core accounting report PDFs: `GET /reports/:report/pdf`
- Bank reconciliation report PDF: `GET /bank-reconciliations/:id/report.pdf`

PDF endpoints:

- Require JWT auth and `x-organization-id`.
- Are tenant-scoped and return `404` outside the active organization.
- Return `Content-Type: application/pdf`.
- Use attachment filenames such as `invoice-INV-000001.pdf`, `credit-note-CN-000001.pdf`, `customer-refund-REF-000001.pdf`, `purchase-order-PO-000001.pdf`, `purchase-bill-BILL-000001.pdf`, `purchase-debit-note-PDN-000001.pdf`, `supplier-payment-SP-000001.pdf`, `supplier-refund-SRF-000001.pdf`, `cash-expense-EXP-000001.pdf`, `receipt-PAY-000001.pdf`, and `statement-Customer.pdf`.
- Apply organization document settings for document titles, footer text, basic colors, tax number visibility, and invoice notes/terms/payment sections.
- Archive each generated PDF, including report PDFs, as a `GeneratedDocument` record with content hash, size, filename, source reference, and local base64 content.

These PDFs are operational documents only. They are not ZATCA compliant yet, do not embed XML, do not include QR codes, and are not PDF/A-3.

## Document Settings And Archive

Each organization has document settings that can be read or updated through `GET /organization-document-settings` and `PATCH /organization-document-settings`.

Supported settings:

- invoice, receipt, and statement titles
- footer text
- optional primary and accent hex colors
- tax number, payment summary, notes, and terms visibility flags
- default template names: `standard`, `compact`, or `detailed`

Only the `standard` renderer is implemented today. `compact` and `detailed` are saved for future template work and currently fall back to the standard layout.

Generated PDF downloads are archived automatically in the database through `GeneratedDocument`, including report PDFs and bank reconciliation report PDFs. Archive list/detail endpoints exclude the base64 payload; `/generated-documents/:id/download` streams the archived PDF. Local base64 storage is intentionally temporary and should move to S3-compatible storage before production scale.

## Uploaded Attachments

LedgerByte has reusable uploaded attachment groundwork for supporting documents on accounting and operational records. Generated PDFs remain in `GeneratedDocument`; uploaded files are stored separately as `Attachment` records and are managed from the source record detail pages.

APIs:

- `POST /attachments` uploads a JSON/base64 file payload for a linked source record.
- `GET /attachments?linkedEntityType=:type&linkedEntityId=:id` lists active attachment metadata without returning file content.
- `GET /attachments/:id` returns one metadata record without file content.
- `GET /attachments/:id/download` streams the stored file with its original MIME type and sanitized filename.
- `PATCH /attachments/:id` updates notes.
- `DELETE /attachments/:id` soft-deletes the attachment.

Supported file types are PDF, PNG, JPEG, WebP, CSV, XLSX, and XLS. Empty files, unsupported MIME types, invalid base64, and files above `ATTACHMENT_MAX_SIZE_MB` are rejected; the default size limit is 10 MB.

The default storage provider is still database/base64 through a storage abstraction. A real S3-compatible adapter is available for new uploaded attachments only when `ATTACHMENT_STORAGE_PROVIDER=s3` and all required S3 variables are configured. S3-backed attachments store `storageProvider = S3`, an object `storageKey`, content hash, and size metadata while leaving `contentBase64` empty. Uploaded attachments validate tenant ownership for supported linked entities such as invoices, customer payments, credit notes, customer refunds, purchase bills, supplier payments, debit notes, supplier refunds, purchase orders, cash expenses, bank statement transactions, bank reconciliations, purchase receipts, sales stock issues, inventory adjustments, warehouse transfers, inventory variance proposals, contacts, items, and journal entries.

Storage configuration:

- `ATTACHMENT_STORAGE_PROVIDER=database` or `s3`
- `GENERATED_DOCUMENT_STORAGE_PROVIDER=database`
- `ATTACHMENT_MAX_SIZE_MB=10`
- S3-compatible attachment storage variables: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, and optional `S3_PUBLIC_BASE_URL`.

Storage readiness returns boolean S3 configuration checks only and does not expose secret values. The migration plan is dry-run only; it counts attachment and generated-document records and byte totals, reports the configured target provider, and does not copy, delete, or rewrite content.

Known limitations:

- Database/base64 storage remains the default and is not production-scale.
- S3 attachment storage requires real non-production bucket testing before production use.
- No storage migration executor exists yet.
- Generated documents still use database/base64 storage.
- No OCR, receipt scanning, file parsing, or virus scanning exists yet.
- No drag/drop polish, retention/lifecycle policy, email attachment sending, or ZATCA attachment submission exists yet.

## Email Delivery, Invitations, And Password Reset

LedgerByte includes safe email-token groundwork for organization invitations and password reset without sending real email by default. The default provider remains `mock`; SMTP delivery is available only when explicitly enabled with complete SMTP configuration.

Configuration:

- `EMAIL_PROVIDER=mock`
- `EMAIL_FROM="no-reply@ledgerbyte.local"`
- `APP_WEB_URL="http://localhost:3000"`
- Supported provider modes: `mock`, `smtp-disabled`, and `smtp`.
- SMTP configuration when `EMAIL_PROVIDER=smtp`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_SECURE`.
- Do not commit real SMTP credentials. `SMTP_PASSWORD` is never returned by readiness APIs.

Behavior:

- `POST /organization-members/invite` creates or updates an invited organization member, creates a hashed `ORGANIZATION_INVITE` token, and writes an `ORGANIZATION_INVITE` record to `EmailOutbox`.
- In mock/local mode the invite response includes `invitePreviewUrl` for local testing. The database stores only `tokenHash`, not the raw token.
- `GET /auth/invitations/:token/preview` validates invitation links without consuming them.
- `POST /auth/invitations/:token/accept` sets the user password, activates the membership, consumes the token, and returns a normal login response.
- `POST /auth/password-reset/request` always returns a generic response and only creates a reset token/email when the user exists.
- `POST /auth/password-reset/confirm` validates a one-hour reset token, updates the password, and consumes the token.
- `GET /email/readiness` reports active provider readiness, SMTP configuration booleans, warnings, and blocking reasons without returning secret values.
- `POST /email/test-send` creates a `TEST_EMAIL` outbox record through the active provider. Mock mode records `SENT_MOCK`; SMTP mode records `SENT_PROVIDER` when a configured relay accepts the message.
- `GET /email/outbox` and `GET /email/outbox/:id` expose tenant-scoped mock/local email records for admins with `emailOutbox.view`.
- `POST /auth/tokens/cleanup-expired` deletes expired, unconsumed auth tokens older than 30 days for the active organization.

Rate limits:

- Password reset requests are limited to 3 per email per hour and 10 per IP per hour when IP metadata is available. Blocked requests still return the same generic response.
- Organization invites are limited to 5 per email per hour per organization and 50 invites per organization per day. Blocked invite requests return a clear authenticated admin error.

Known limitations:

- No background email queue or scheduled retry worker.
- No paid/provider-specific API adapter, provider webhook, bounce/complaint handling, or DKIM/SPF/domain validation workflow.
- No branded HTML template polish.
- No MFA, refresh-token rotation, or advanced session management.

## ZATCA Foundation

LedgerByte now has local-only ZATCA Phase 2 groundwork. This is not production ZATCA compliance and does not call ZATCA APIs.

Implemented:

- Organization ZATCA profile/settings with seller name, VAT number, Saudi address fields, environment, and registration status.
- Development EGS unit records with local placeholder CSR/private-key/CSID fields, active unit selection, last ICV, and last invoice hash.
- Sales invoice ZATCA metadata with invoice UUID, status, ICV, previous hash, invoice hash, XML base64, QR payload base64, and local submission logs.
- `packages/zatca-core` deterministic UBL-like XML skeleton generation, explicit XML section builders, local XML field mapping constants, local-only XML validation, basic Phase 1-style TLV QR base64 generation, SHA-256 invoice hashing, CSR/private-key PEM generation helpers, and combined payload building.
- EGS CSR generation and CSR download endpoints.
- Mock OTP/compliance CSID flow through an adapter interface. The mock adapter accepts local 6-digit OTP values such as `000000`, stores a mock compliance CSID and certificate request id, and logs a local onboarding submission.
- Safe adapter scaffolding for `mock`, `sandbox-disabled`, and guarded `sandbox` modes. The HTTP sandbox adapter has future method shapes for compliance CSID, production CSID, compliance check, clearance, and reporting, but it does not guess official endpoint paths.
- Safe EGS API responses do not expose `privateKeyPem`; CSR PEM is available only through CSR-specific endpoints.
- Finalized invoices get local ZATCA metadata records, but XML/QR/hash generation is explicit through `POST /sales-invoices/:id/zatca/generate`.
- Repeating local XML/QR/hash generation for the same invoice is idempotent and returns the existing metadata instead of consuming another ICV or mutating the active EGS hash chain.
- Local/mock invoice compliance checks can be recorded through `POST /sales-invoices/:id/zatca/compliance-check`; they only move local metadata to `READY_FOR_SUBMISSION` and do not mark invoices cleared or reported.
- XML downloads use `application/xml`; QR returns a base64 TLV payload as JSON.
- `GET /sales-invoices/:id/zatca/xml-validation` runs local-only structural XML/input checks and always reports `officialValidation=false`.
- Invoice PDFs can display a small local ZATCA-generated placeholder when QR metadata exists. XML is not embedded into PDFs yet.

### ZATCA Adapter Configuration

- `ZATCA_ADAPTER_MODE=mock` is the default. It uses the local mock CSID and local/mock compliance-check behavior. It never calls ZATCA.
- `ZATCA_ADAPTER_MODE=sandbox-disabled` blocks all network actions with `REAL_NETWORK_DISABLED` and writes failed submission logs where a submission context exists.
- `ZATCA_ADAPTER_MODE=sandbox` is scaffold-only. Real network calls are still blocked unless `ZATCA_ENABLE_REAL_NETWORK=true` and `ZATCA_SANDBOX_BASE_URL` is configured.
- `ZATCA_SANDBOX_BASE_URL`, `ZATCA_SIMULATION_BASE_URL`, and `ZATCA_PRODUCTION_BASE_URL` are optional placeholders. The app does not hardcode guessed official URLs as final truth.
- `ZATCA_ENABLE_REAL_NETWORK=false` is the default and should stay false until current official ZATCA/FATOORA API docs, endpoint URLs, request bodies, response fields, authentication, and credentials are verified.

### ZATCA Compliance Checklist

The engineering checklists live in `docs/zatca`. They are working implementation maps only and are not legal certification.

- View the checklist and local readiness summary in the app at `/settings/zatca`.
- Call `GET /zatca/compliance-checklist` to return grouped static checklist items with status and risk counts.
- Call `GET /zatca/xml-field-mapping` to return local XML mapping scaffold items and counts.
- Call `GET /zatca/readiness` to return local readiness booleans and blocking reasons for the selected organization.
- These endpoints require authentication and `x-organization-id`.
- The readiness response keeps `productionReady=false` until official validation, signing, real API integration, PDF/A-3 embedding, and production key custody are implemented.

Do not treat the current mock CSID, local XML, local QR, or local hash-chain behavior as legal ZATCA/FATOORA compliance.

### ZATCA XML Mapping Scaffold

- XML mapping docs live at `docs/zatca/XML_FIELD_MAPPING.md`.
- Fixture guidance lives at `docs/zatca/XML_FIXTURES_GUIDE.md`.
- Local dev fixtures live under `packages/zatca-core/fixtures`.
- The local fixtures are not official ZATCA fixtures. They exist to keep LedgerByte's XML skeleton deterministic and to cover XML escaping and Unicode handling.
- Local XML validation can be called with `GET /sales-invoices/:id/zatca/xml-validation` after local XML is generated.
- The validation response is local-only and not legal compliance evidence. Official SDK fixture validation is now planned and registered, but live execution is blocked until Java 11-14 is configured.

### ZATCA Official Reference Maps

- Local official ZATCA/FATOORA material has been inventoried under `reference/` (singular), not `references/`.
- The inventory lives at `docs/zatca/REFERENCES_INVENTORY.md`.
- Future ZATCA implementation work should start with `docs/zatca/OFFICIAL_IMPLEMENTATION_MAP.md` and `docs/zatca/ZATCA_CODE_GAP_REPORT.md` before changing XML, CSR, hash, signing, QR, or API behavior.
- The Java SDK usage plan lives at `docs/zatca/SDK_USAGE_PLAN.md`; the SDK should be wrapped only in isolated test tooling first, with a Java 11-14 runtime and redacted logs.
- The test-only SDK wrapper notes live at `docs/zatca/SDK_VALIDATION_WRAPPER.md`.
- Official sample fixture validation results live at `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`.
- `GET /zatca-sdk/readiness` reports local SDK discovery status, Java readiness, config/work-dir checks, and whether execution is enabled. `POST /zatca-sdk/validate-xml-dry-run` creates a command plan without executing the SDK. `POST /zatca-sdk/validate-xml-local`, `POST /zatca-sdk/validate-reference-fixture`, and `POST /sales-invoices/:id/zatca/sdk-validate` are disabled unless `ZATCA_SDK_EXECUTION_ENABLED=true`; when enabled they run local-only XML validation with timeout, temp cleanup, path traversal protection, and sanitized output.
- The current code is still not production compliant. Official SDK/API validation, real CSID onboarding, signing, PDF/A-3, clearance, reporting, and KMS-backed key custody are still required.

Not implemented yet:

- real ZATCA API calls
- real OTP validation
- real compliance CSID issuance
- production CSID issuance
- real ZATCA compliance, clearance, or reporting APIs
- cryptographic signing/stamping
- official ZATCA canonicalization/profile validation
- Phase 2 QR signature/public-key fields
- PDF/A-3 conversion
- embedded XML in PDF archives
- production secrets/KMS storage for private keys

The `privateKeyPem` column is a development placeholder only. Production onboarding must move private keys into a secrets manager or KMS-backed workflow before any real certificate handling.

Future real onboarding steps:

1. Get ZATCA/FATOORA sandbox access.
2. Generate a real OTP from the FATOORA portal.
3. Verify official sandbox, simulation, and production endpoint URLs from current ZATCA documentation.
4. Verify exact request/response payloads, auth headers, certificate fields, and error semantics.
5. Configure sandbox env vars and enable `ZATCA_ENABLE_REAL_NETWORK=true` only in a controlled sandbox environment.
6. Submit CSR through the real compliance CSID endpoint using the verified network adapter mapping.
7. Run official compliance checks for required invoice samples.
8. Request production CSID only after sandbox/compliance checks pass.
9. Store private keys and issued certificates in KMS/secrets manager, not in normal database fields.

## Permission Model

LedgerByte uses tenant-scoped role permissions stored on `Role.permissions` JSON and shared string constants from `packages/shared/src/permissions.ts`.

Default seeded roles:

- `Owner`: full access, including `admin.fullAccess`.
- `Admin`: broad business access without the system-level `admin.fullAccess` flag.
- `Accountant`: dashboard, chart of accounts, bank accounts, bank transfers, statement preview/import/reconciliation, bank reconciliation approval/reopen/close, opening-balance posting, tax, journals, reports, documents, attachments, inventory, manual COGS posting/reversal, manual receipt asset posting/reversal, warehouses, stock movements, inventory adjustments, warehouse transfers, purchase receiving, sales stock issue, fiscal period management, and accounting workflow posting/void permissions.
- `Sales`: dashboard, contacts, items/inventory/warehouse view, sales invoices, sales stock issue view/create, customer payments, credit notes, customer refunds, document access, and attachment view/upload/download for sales workflows.
- `Purchases`: dashboard, contacts, items view, bank account view/transactions, purchase orders, purchase bills, supplier payments, debit notes, supplier refunds, cash expenses, inventory view, warehouse view, stock movement view, inventory adjustment view/create, warehouse transfer view/create, purchase receiving view/create, document access, and attachment view/upload/download for purchase workflows.
- `Viewer`: dashboard and read-only access across core accounting, inventory balances, warehouses, stock movements, adjustments, transfers, reports, documents, attachment metadata/downloads, and ZATCA status, excluding bank account profiles by default.

Permission names are dotted strings such as `dashboard.view`, `reports.view`, `salesInvoices.finalize`, `customerPayments.void`, `purchaseOrders.convertToBill`, `purchaseBills.finalize`, `bankAccounts.manage`, `bankAccounts.transactions.view`, `bankStatements.reconcile`, `attachments.view`, `attachments.upload`, `attachments.download`, `attachments.delete`, `attachments.manage`, `inventory.cogs.post`, `inventory.cogs.reverse`, `inventory.receipts.postAsset`, `inventory.receipts.reverseAsset`, `warehouses.manage`, `stockMovements.create`, `inventoryAdjustments.approve`, `warehouseTransfers.void`, `fiscalPeriods.lock`, and `zatca.manage`.

Backend enforcement:

- Sensitive tenant endpoints use `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard`.
- `@RequirePermissions(...)` declares the required permission for each route.
- `admin.fullAccess` and legacy `*` permissions allow all guarded actions.
- Missing permissions return HTTP 403 with `You do not have permission to perform this action.`
- Organization detail/update endpoints remain tenant-safe by checking the user's membership and role against the requested organization id.

Frontend enforcement:

- `/auth/me` exposes active memberships with role name and permissions.
- Sidebar navigation is filtered by permissions.
- Page-level route protection shows an access-denied panel instead of crashing or redirecting forever.
- High-risk action buttons are hidden when the active role lacks the matching create/update/finalize/void/manage permission.
- `/settings/team` lists organization members, supports role/status changes for `users.manage`, and sends mock/local invite emails for `users.invite`.
- `/settings/roles` and `/settings/roles/:id` show role lists and grouped permission matrices; custom roles can be edited with `roles.manage`, while system/default roles are protected.

Permission matrix categories:

- Organization
- Users / Roles
- Accounting
- Sales
- Purchases
- Inventory
- Reports
- Documents
- ZATCA
- Admin

## Current Package Boundaries

- `packages/accounting-core`: decimal-safe journal and invoice calculation rules
- `packages/zatca-core`: local-only ZATCA XML, QR, hash, and CSR groundwork for future Phase 2 integration
- `packages/pdf-core`: shared PDF data contracts and basic server-side renderers
- `packages/shared`: shared tenant/API types and permission constants
- `packages/ui`: small UI utility package placeholder

## Known Limitations

- ZATCA Phase 2 production onboarding, real CSID issuance, signing, clearance, reporting, PDF/A-3, and embedded XML are not implemented yet.
- Current CSR and mock CSID flow is local-only and never calls ZATCA.
- Sandbox adapter scaffolding exists, but real network calls are intentionally disabled by default and official endpoint/payload mapping remains unverified.
- Current ZATCA XML/QR/hash generation is local-only groundwork. The official reference inventory and code-gap map now exist, but implementation still must be verified against the SDK, schemas, Schematron rules, and current ZATCA/FATOORA sandbox behavior before production use.
- PDF output is basic operational rendering only; no PDF/A-3, embedded XML, or template designer exists yet.
- Generated PDFs and existing user-uploaded attachments default to base64 database records for local/dev groundwork; new uploaded attachments can use S3-compatible storage when `ATTACHMENT_STORAGE_PROVIDER=s3` is explicitly configured.
- GET PDF endpoints currently archive every download.
- Unapplied overpayment application is manual only; there is no automatic credit matching yet.
- Customer refunds are manual accounting records only; no payment gateway refund or bank reconciliation integration exists yet.
- Bank account profiles, posted transaction visibility, bank transfers, guarded one-time opening-balance posting, local statement import preview, reconciliation approval/close/lock/report export, and basic attachment panels exist, but live feeds, transfer fees, production-grade bank file upload parsing/storage, and multi-currency FX transfer handling are not implemented yet.
- Purchase orders are MVP-only: operational purchase receipts can receive stock, but partial billing, supplier email sending, approval workflows, and automatic inventory stock receipts are not implemented.
- Purchase bills, purchase debit notes, supplier payments, and supplier refunds are AP groundwork only; finalized purchase bills can be manually received into stock and matched operationally, and explicitly selected Inventory Clearing bills can post clearing journals, but AP finalization itself does not auto-create stock movements or inventory returns.
- ZATCA credit note XML/signing/submission is not implemented yet.
- ZATCA debit note XML/signing/submission is not implemented yet.
- Inventory returns from credit notes are not implemented yet.
- Recurring invoices are not implemented yet.
- Bank reconciliation has local import preview/manual matching, approval, close-lock, and report export groundwork, but no live feed, OFX/CAMT/MT940 support, file upload storage, or auto-match yet.
- Inventory warehouse, stock ledger, adjustment approval, warehouse transfer, manual purchase receipt, manual sales stock issue, valuation settings, manual COGS posting, manual compatible receipt asset posting, inventory clearing settings, purchase bill clearing-mode finalization, bill/receipt matching visibility, clearing reconciliation/variance reports, and operational reports exist, but no automatic COGS posting, no automatic purchase receipt asset posting, no direct-mode receipt posting, no automatic variance journals, automatic purchase/sales posting, landed cost, serial/batch tracking, or accounting-grade inventory financial reports are implemented yet.
- BullMQ workers, generated-document S3 storage, and DB-to-S3 migration executors are not wired yet.
- Uploaded attachment storage remains database-backed by default; S3-compatible storage for new uploads requires explicit env configuration, and OCR, virus scanning, retention policies, email attachment sending, ZATCA attachment submission, signed URLs, and object-storage lifecycle are not implemented yet.
- Email invitations and password reset use mock/local outbox delivery by default with DB-backed request rate limits and opt-in SMTP support; MFA and advanced session management are still missing.
- Fine-grained approval workflows, dual control, and delegated approval chains are not implemented yet.
- Audit logs now have admin UI, standardized high-risk events, filtered CSV export, dry-run retention controls, and number-sequence update coverage, but there is no immutable external audit store, scheduled export, automatic purge/archive executor, alerting, anomaly detection, or tamper-evident hash chain yet.
- Number sequence settings are editable for future documents only; there is no reset workflow, per-branch numbering, document-template numbering policy, or historical renumbering.
