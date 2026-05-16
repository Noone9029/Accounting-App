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
ZATCA_HASH_MODE=local
```

Real ZATCA network calls are disabled by default and remain blocked unless `ZATCA_ADAPTER_MODE=sandbox`, `ZATCA_ENABLE_REAL_NETWORK=true`, and `ZATCA_SANDBOX_BASE_URL` are all configured.
Local ZATCA Java SDK execution is also disabled by default. `ZATCA_SDK_EXECUTION_ENABLED=true` enables only local SDK XML validation and SDK hash comparison after Java 11-14 and SDK paths are configured; it does not submit invoices, sign XML, request CSIDs, or prove production compliance. `ZATCA_HASH_MODE=local` remains the default. The planned `sdk` mode is blocked unless SDK execution is explicitly enabled and ready, and current endpoints only compare hashes or report reset plans without mutating metadata.
The official SDK fixture validation pass is documented at `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`. Default local Java is 17.0.16, but a Java 11.0.26 runtime was found and used without changing global Java. The official standard invoice, simplified invoice, standard credit note, and standard debit note samples pass through the official `fatoora -validate -invoice <filename>` launcher. LedgerByte's local standard XML fixture now passes SDK XSD/EN/KSA/PIH and global validation after supply-date and first-PIH mapping. The local simplified fixture passes SDK XSD/EN/PIH but remains non-compliant until signing, certificate handling, Phase 2 QR, CSID, clearance/reporting, and PDF/A-3 work are completed. API-generated standard invoice XML now validates locally through the SDK wrapper with address/identifier warnings and a documented app-vs-SDK hash mismatch.

To run local fixture validation safely, point the wrapper at a Java 11-14 runtime and SDK paths in a local shell only:

```powershell
$env:ZATCA_SDK_EXECUTION_ENABLED="true"
$env:ZATCA_SDK_JAVA_BIN="C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe"
$env:ZATCA_SDK_JAR_PATH="E:\Accounting App\reference\zatca-einvoicing-sdk-Java-238-R3.4.8\Apps\zatca-einvoicing-sdk-238-R3.4.8.jar"
$env:ZATCA_SDK_CONFIG_DIR="E:\Accounting App\reference\zatca-einvoicing-sdk-Java-238-R3.4.8\Configuration"
$env:ZATCA_SDK_WORK_DIR="$env:TEMP\ledgerbyte-zatca-sdk"
```

The repo path contains a space, so the documented fixture pass used a no-space temporary SDK copy. Do not commit machine-specific SDK/Java paths, and do not treat local SDK validation as production compliance.

To validate generated invoice XML against a running local API after explicitly enabling SDK execution, provide a finalized invoice id:

```powershell
$env:LEDGERBYTE_API_URL="http://localhost:4000"
$env:LEDGERBYTE_E2E_EMAIL="admin@example.com"
$env:LEDGERBYTE_E2E_PASSWORD="Password123!"
corepack pnpm zatca:validate-generated -- --invoice-id <sales-invoice-id>
```

The script prints a safe summary with `sdkHash`, `appHash`, and `hashComparisonStatus` presence/status only; it does not print passwords, tokens, or XML.

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
- `POST /sales-invoices/:id/zatca/hash-compare`
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
- `POST /zatca/egs-units/:id/enable-sdk-hash-mode`
- `POST /zatca/egs-units/:id/generate-csr`
- `GET /zatca/egs-units/:id/csr`
- `GET /zatca/egs-units/:id/csr/download`
- `POST /zatca/egs-units/:id/request-compliance-csid`
- `POST /zatca/egs-units/:id/request-production-csid`
- `GET /zatca/hash-chain-reset-plan`
- `GET /zatca/submissions`

ZATCA SDK wrapper:

- `GET /zatca-sdk/readiness`
- `POST /zatca-sdk/validate-xml-dry-run`
- `POST /zatca-sdk/validate-xml-local`
- `POST /zatca-sdk/validate-reference-fixture`
- `POST /sales-invoices/:id/zatca/sdk-validate`
- `POST /sales-invoices/:id/zatca/hash-compare`

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
- `POST /sales-invoices/:id/zatca/hash-compare` regenerates the current invoice XML, reads the stored app hash, and runs SDK `-generateHash` only when local SDK execution is explicitly enabled and ready. The response includes `sdkHash`, `appHash`, `hashMatches`, `hashComparisonStatus`, hash mode, warnings/blockers, and `noMutation=true`; it never updates invoice metadata or EGS ICV/hash state.
- `POST /zatca/egs-units/:id/enable-sdk-hash-mode` is an explicit opt-in for local SDK hash persistence on a fresh EGS unit only. It requires `zatca.manage`, `confirmReset=true`, a reason, SDK execution/readiness, and zero existing invoice metadata on that EGS. It does not sign invoices, submit to ZATCA, request CSIDs, or migrate old local hash chains.
- `GET /zatca/hash-chain-reset-plan` is an admin dry run. It summarizes active EGS units, hash mode, current ICV/last-hash state, existing ZATCA invoice metadata, SDK readiness blockers, per-EGS enablement eligibility, reset risks, and recommended next steps. It returns `dryRunOnly=true` and does not reset anything.
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
- The validation response is local-only and not legal compliance evidence. Official SDK sample fixtures now pass locally under Java 11. LedgerByte's local standard fixture now passes SDK XSD/EN/KSA/PIH and global validation; the simplified fixture now passes SDK XSD/EN/PIH but still fails signing, QR, and certificate checks. API-generated standard invoice XML now validates locally with address/identifier warnings.

### ZATCA Official Reference Maps

- Local official ZATCA/FATOORA material has been inventoried under `reference/` (singular), not `references/`.
- The inventory lives at `docs/zatca/REFERENCES_INVENTORY.md`.
- Future ZATCA implementation work should start with `docs/zatca/OFFICIAL_IMPLEMENTATION_MAP.md` and `docs/zatca/ZATCA_CODE_GAP_REPORT.md` before changing XML, CSR, hash, signing, QR, or API behavior.
- The Java SDK usage plan lives at `docs/zatca/SDK_USAGE_PLAN.md`; the SDK should be wrapped only in isolated test tooling first, with a Java 11-14 runtime and redacted logs.
- The test-only SDK wrapper notes live at `docs/zatca/SDK_VALIDATION_WRAPPER.md`.
- Official sample fixture validation results live at `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`.
- Hash-chain/PIH planning lives at `docs/zatca/HASH_CHAIN_AND_PIH_PLAN.md`.
- `GET /zatca-sdk/readiness` reports local SDK discovery status, Java readiness, config/work-dir checks, hash mode, and whether execution is enabled. `POST /zatca-sdk/validate-xml-dry-run` creates a command plan without executing the SDK. `POST /zatca-sdk/validate-xml-local`, `POST /zatca-sdk/validate-reference-fixture`, `POST /sales-invoices/:id/zatca/sdk-validate`, and `POST /sales-invoices/:id/zatca/hash-compare` are disabled unless `ZATCA_SDK_EXECUTION_ENABLED=true`; when enabled they run local-only XML validation or SDK hash comparison with timeout, temp cleanup, path traversal protection, sanitized output, and no metadata mutation. SDK hash persistence is separate and requires a fresh EGS unit explicitly enabled through `/zatca/egs-units/:id/enable-sdk-hash-mode`.
- `corepack pnpm zatca:validate-sdk-hash-mode` runs the local fresh-EGS SDK hash-mode validation helper against a running local API. It creates an isolated local organization, enables `SDK_GENERATED` on a zero-metadata EGS, generates two invoices, compares persisted hashes against SDK `-generateHash`, verifies PIH chaining and idempotency, and performs local SDK XML validation. It must be run only with explicit local SDK env vars and does not send any ZATCA network request.
- `corepack pnpm zatca:debug-pih-chain` runs the same local-only fresh-EGS path with PIH-chain debug output. It uses a temporary SDK config whose `pihPath` points at the invoice metadata `previousInvoiceHash`, because the official SDK validator otherwise reads the default first-invoice seed from `Data/PIH/pih.txt` and incorrectly fails second-invoice local-chain validation.
- Latest local fresh-EGS result: invoice 1 stored SDK hash `LjCY8QibCBOF4IHSmbwyLFevrxfCi7wD5+XP2D2plS4=` using the official first PIH seed; invoice 2 stored SDK hash `5HwroZhItrbnJyQf0a+aiPXzTCLlIci14fnPgKZmNS0=` using invoice 1's SDK hash as PIH; both hash-compare calls returned `MATCH`; repeat generation was idempotent; both generated standard invoices passed SDK XML validation globally with no `KSA-13` failure. Remaining generated XML warning is buyer-address data quality rule `BR-KSA-63` because the current customer model does not capture a dedicated 4-digit buyer building number.
- The current code is still not production compliant. Official SDK/API validation, real CSID onboarding, signing, PDF/A-3, clearance, reporting, and KMS-backed key custody are still required.

Not implemented yet:

- real ZATCA API calls
- real OTP validation
- real compliance CSID issuance
- production CSID issuance
- real ZATCA compliance, clearance, or reporting APIs
- cryptographic signing/stamping
- production ZATCA hash-chain/signature behavior; SDK hash persistence exists only as an explicit local-only opt-in for fresh EGS units
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

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA seller/buyer readiness checks

- Added local-only ZATCA readiness checks for seller profile invoice XML data, buyer contact invoice XML data, invoice generation state, EGS/hash-chain state, and generated XML availability.
- Official sources inspected: `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`, standard credit/debit note samples, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`, `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`.
- Rules confirmed: seller invoice XML address checks use `BR-KSA-09`, seller building number format uses `BR-KSA-37`, seller postal code format uses `BR-KSA-66`, seller VAT checks use `BR-KSA-39` and `BR-KSA-40`, standard Saudi buyer postal-address readiness uses `BR-KSA-63`, Saudi buyer postal code format uses `BR-KSA-67`, buyer name standard-invoice warning uses `BR-KSA-42`, and buyer VAT format when present uses `BR-KSA-44`.
- Standard vs simplified behavior: standard-like tax invoices with Saudi buyers require buyer street, building number, district, city, postal code, and country code for clean XML readiness. Simplified invoices do not block on missing buyer postal address when official samples/rules do not require it.
- API changes: `GET /zatca/readiness` now returns detailed readiness sections while preserving legacy local readiness fields. `GET /sales-invoices/:id/zatca/readiness` returns read-only invoice readiness with `localOnly: true`, `noMutation: true`, and `productionCompliance: false`.
- UI changes: the ZATCA settings page shows section readiness cards, the contact detail page shows buyer address readiness for customer contacts, and the sales invoice detail page shows seller/buyer/invoice/EGS/XML readiness near ZATCA actions.
- Safety boundary: readiness checks do not sign XML, request CSIDs, call ZATCA, submit clearance/reporting, generate PDF/A-3, or claim production compliance.
- Recommended next step: improve admin workflows for correcting readiness issues in-place, then rerun local fresh-EGS SDK validation only when XML output changes.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.

## ZATCA CSR config review workflow update (2026-05-16)

Official references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only operator review tracking for sanitized non-production CSR config previews:
- Added `ZatcaCsrConfigReview` records with `DRAFT`, `APPROVED`, `SUPERSEDED`, and `REVOKED` status.
- Stored only sanitized `key=value` CSR config preview text, official key order, config hash, missing/review/blocker metadata, operator approval fields, and audit-friendly notes.
- Added endpoints to create/list reviews and approve/revoke review records.
- New reviews supersede previous active reviews for the same EGS unit so only the latest preview review remains active.
- Approval is blocked when the current preview has missing fields, blockers, or a changed config hash.
- `POST /zatca/egs-units/:id/csr-dry-run` now reports `configReviewRequired`, `latestReviewId`, `latestReviewStatus`, and `configApprovedForDryRun` for future controlled SDK CSR planning.
- The ZATCA settings UI shows review status, config hash, approval metadata, and create/approve/revoke actions next to the sanitized CSR config preview.
- Audit logs capture create/approve/revoke actions without private keys, certificate bodies, CSID tokens, one-time portal codes, generated CSR bodies, or production credentials.

Safety boundary remains unchanged:
- No SDK CSR execution is implemented.
- No compliance CSID or production CSID request is made.
- No invoice signing, clearance/reporting, PDF/A-3, real ZATCA network call, production credentials, or production compliance claim is enabled.

Recommended next step:
- Add an explicitly gated, temp-directory-only local CSR file preparation review gate that requires an approved review hash before any future non-production SDK CSR execution experiment.

## 2026-05-16 - ZATCA CSR local generation gate

Official local references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only behavior:
- Added a disabled-by-default CSR local generation gate at `POST /zatca/egs-units/:id/csr-local-generate` and `corepack pnpm zatca:csr-local-generate`.
- The gate requires `ZATCA_SDK_CSR_EXECUTION_ENABLED=true`, a non-production EGS unit, an `APPROVED` CSR config review, a current preview hash matching the approved review, no missing CSR fields, and no preview blockers.
- When the flag is false, no SDK process runs, no temp private key is generated, no CSR is generated, and the response reports `executionEnabled=false`, `executionAttempted=false`, and `executionSkipped=true`.
- When the flag is true and all prerequisites pass, the app writes only a temp CSR config file, runs the official SDK CSR command plan with temp private-key and generated-CSR paths, summarizes sanitized stdout/stderr, and deletes the temp directory by default.
- Responses, logs, reviews, smoke output, and UI do not expose private key PEM, generated CSR body, certificate bodies, CSID token material, OTP values, or production credentials.
- The gate does not request compliance CSIDs, does not request production CSIDs, does not call ZATCA network endpoints, does not sign invoices, does not perform clearance/reporting, does not implement PDF/A-3, and keeps `productionCompliance=false`.

UI and validation notes:
- ZATCA settings now shows that local SDK CSR generation requires an approved review and the disabled-by-default env gate.
- Default smoke calls the local generation endpoint with the default disabled flag and verifies no SDK execution, no secret content, no EGS ICV/hash mutation, and no submission-log creation.
- Normal tests mock SDK execution and do not require Java or the official SDK.

Recommended next step:
- Add a controlled non-production operator flow to intentionally enable the CSR gate in a local sandbox session, run the SDK CSR command once with temp files, and manually inspect only sanitized metadata before any future CSID onboarding design.

## 2026-05-16 - Local ZATCA signing dry-run and Phase 2 QR gate

- Official sources inspected: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, official simplified/standard invoice samples, official standard credit/debit samples, SDK certificate/private-key fixture paths, BR-KSA Schematron rules, UBL XAdES/XMLDSig schemas, XML implementation standard PDF, security features implementation standard PDF, and EInvoice_Data_Dictionary.xlsx.
- Added local-only signing dry-run groundwork through `POST /sales-invoices/:id/zatca/local-signing-dry-run` and `corepack pnpm zatca:local-signing-dry-run`.
- `ZATCA_SDK_SIGNING_EXECUTION_ENABLED` defaults to `false`. With the default setting, no SDK signing execution, no QR generation, no temp private-key usage, no signed XML output, no CSID request, no ZATCA network call, and no persistence occurs.
- If explicitly enabled for local/non-production work, the planned path writes unsigned XML to temporary files, attempts the official SDK `-sign` command, plans/runs the SDK `-qr` step only after a signed XML is detected, sanitizes stdout/stderr, and cleans temporary files by default.
- Redaction guarantees: responses and logs must not include private key PEM, certificate bodies, CSID tokens, OTPs, full signed XML bodies, generated CSR bodies, or QR payload bodies.
- Phase 2 QR status: blocked until signed XML, certificate, hash, and signature artifacts are available. The current UI/API exposes the dependency chain instead of fabricating cryptographic QR tags.
- Production limitations remain: no compliance CSID request, no production CSID request, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: run a controlled non-production SDK signing experiment only after approved CSR/test certificate material exists and the operator explicitly enables the local execution gate.

## 2026-05-16 - Controlled local ZATCA signing experiment

Scope: local SDK signing/Phase 2 QR experiment only. No CSID request, no ZATCA network call, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed from official references:
- The SDK documents local `fatoora -sign -invoice <file> -signedInvoice <file>` and `fatoora -qr -invoice <file>` commands.
- Simplified invoices require the cryptographic stamp/UBL signature structures and Phase 2 QR path; BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60 remain expected until valid signing material and QR generation are in place.
- The official samples contain the required signature IDs `urn:oasis:names:specification:ubl:signature:1`, `urn:oasis:names:specification:ubl:signature:Invoice`, and signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`.
- The bundled SDK certificate/private key files are treated as SDK dummy/test material only and must not be used as production credentials.

Implementation updates:
- Hardened `POST /sales-invoices/:id/zatca/local-signing-dry-run` so `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` still requires a generated XML, invoice metadata, active EGS, writable temp directory, Java SDK readiness, SDK launcher/config readiness, explicit SDK dummy certificate/private key availability, no production credentials, no network-like command plan, and no persistence.
- Rewrites SDK config into a temp directory for any future local signing attempt so official config keys point at repo-local SDK paths and dummy test material without returning certificate/private-key content.
- Response now distinguishes `executionStatus`, `signingExecuted`, `qrExecuted`, dummy material readiness, temp SDK config writing, signed XML detection, QR detection, SDK exit codes, sanitized stdout/stderr, blockers, warnings, and cleanup.
- UI now surfaces local signing execution status plus whether SDK signing or QR commands actually executed.
- Default smoke remains safe with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false` and verifies execution is skipped.

Controlled local experiment result:
- Experiment invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`, generated locally as `SIMPLIFIED_TAX_INVOICE` with ICV 33 for this test.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` set only for that command.
- Java observed: OpenJDK 17.0.16.
- SDK path: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- Result: `executionEnabled=true`, `executionAttempted=false`, `executionSkipped=true`, `executionStatus=SKIPPED`.
- Blocker: detected Java 17.0.16 is outside the SDK-supported range `>=11 <15`.
- SDK exit code: not applicable because execution was correctly blocked before SDK invocation.
- `signedXmlDetected=false`; `qrDetected=false`; `sdkExitCode=null`; `qrSdkExitCode=null`.
- Temp files written: unsigned XML false, SDK config false, signed XML false.
- Cleanup: no temp files required; cleanup reported success.
- Optional local validation of signed temp XML was skipped because no signed XML was produced.

Security and redaction guarantees:
- No private key PEM, certificate body, CSID token, OTP, generated CSR body, signed XML body, or QR payload body is returned or stored.
- No invoice metadata is marked signed.
- No signed XML or QR is persisted to the database.
- The dry-run path does not request CSIDs, does not call ZATCA, and does not submit invoices.
- The path remains a local engineering experiment and does not prove production compliance.

Remaining blockers and next step:
- Install/use an officially supported Java runtime for the SDK experiment, preferably Java 11, then rerun the gated local experiment with SDK dummy/test material only.
- Even if local dummy signing succeeds later, production signing remains blocked until proper compliance/production CSID onboarding, key custody, certificate handling, clearance/reporting design, and production validation are implemented.

## 2026-05-16 - Java 11 controlled ZATCA SDK signing experiment

Scope: local-only SDK signing and QR experiment with SDK dummy/test material. No CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed official behavior:
- The SDK readme requires Java versions `>=11` and `<15`.
- The documented local signing command is `fatoora -sign -invoice <filename> -signedInvoice <filename>`.
- The documented QR command is `fatoora -qr -invoice <filename>`.
- SDK bundled `cert.pem` and `ec-secp256k1-priv-key.pem` are dummy/testing material only and are not production credentials.
- Simplified invoices require the signature/cryptographic stamp structure and QR flow; official rules include BR-KSA-27, BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60.
- The official simplified sample includes `ext:UBLExtensions`, `sac:SignatureInformation`, signature ID `urn:oasis:names:specification:ubl:signature:1`, referenced signature/signature ID `urn:oasis:names:specification:ubl:signature:Invoice`, signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`, and a `QR` additional document reference.

Java runtime configuration:
- Default Java remains OpenJDK `17.0.16` from `C:\Users\Ahmad\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe`.
- Supported local Java used for the experiment: `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`.
- Java 11 version output: OpenJDK `11.0.26` Microsoft build `11.0.26+4-LTS`.
- No global Java change was made; the command used `ZATCA_SDK_JAVA_BIN` only for the local experiment process.

Wrapper hardening added:
- The official Windows `fatoora.bat` expands `FATOORA_HOME` without quotes, so the repo path `E:\Accounting App` broke the launcher under Java 11.
- The local signing wrapper now stages the SDK launcher, JAR, `jq`, and `global.json` into the existing no-space temp directory before execution.
- The temp SDK config is still rewritten only in temp storage and points at SDK dummy/test certificate/private-key material.
- `tempFilesWritten.sdkRuntime` reports whether the temporary SDK runtime staging occurred.
- The sales invoice ZATCA panel displays whether the temp SDK runtime was staged.
- `corepack pnpm zatca:local-signing-dry-run -- --help` now documents `ZATCA_SDK_JAVA_BIN`.

Controlled signing/QR experiment result:
- Invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`.
- Invoice type: `SIMPLIFIED_TAX_INVOICE`.
- Local ICV: `33` from the previously generated unsigned XML.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` and `ZATCA_SDK_JAVA_BIN` set to Java 11 for that command only.
- Result: `executionEnabled=true`, `executionAttempted=true`, `executionSkipped=false`, `executionStatus=SUCCEEDED_LOCALLY`.
- `signingExecuted=true`; `qrExecuted=true`.
- `sdkExitCode=0`; `qrSdkExitCode=0`.
- `signedXmlDetected=true`; `qrDetected=true`.
- `tempFilesWritten`: unsigned XML true, SDK config true, SDK runtime true, signed XML true, files retained false.
- Cleanup: performed true, success true, temp files removed by default.
- Sanitized SDK output: signing reported `InvoiceSigningService - invoice has been signed successfully`; QR reported `QrGenerationService - Qr has been generated successfully`; QR payload body was redacted.

Optional local validation of signed temp XML:
- A second keep-temp run was used only long enough to validate `signed.xml` locally, then the temp directory was deleted.
- Validation command used the temp staged SDK launcher/config and Java 11, with no ZATCA network call and no CSID request.
- Validation exit code: `0`.
- XSD: PASSED.
- EN: PASSED.
- KSA: PASSED.
- QR: PASSED.
- SIGNATURE: PASSED.
- PIH: FAILED.
- GLOBAL: FAILED.
- Remaining warning: `BR-KSA-08` seller identification warning in the local demo data.
- Remaining error: `KSA-13` PIH invalid. This is expected for the isolated dummy signing experiment because the signed temp artifact is not persisted and the hash chain/PIH is not mutated or promoted as an official signed invoice.

Redaction and no-mutation guarantees:
- No private key PEM, certificate body, CSID token, OTP, signed XML body, generated CSR body, or QR payload body is returned or stored.
- Signed XML is temp-only and deleted by default.
- The validation temp directory from the keep-temp run was manually deleted after validation.
- No invoice metadata is marked signed.
- No signed XML or QR payload is persisted to the database.
- No ICV, PIH, invoice hash, previous hash, EGS last hash, or submission log is mutated by the local signing dry-run path.

Remaining limitations and next step:
- This proves the local SDK dummy-material signing/QR path can execute under Java 11 only; it does not prove production compliance.
- Production signing remains blocked until real compliance/production CSID onboarding, secure key custody, certificate lifecycle handling, official clearance/reporting behavior, PDF-A3, and production validation are implemented.
- Recommended next step: add an explicit local signed-XML validation dry-run endpoint/script that keeps signed XML temp-only, returns only sanitized validation categories, and continues to block all CSID/network/persistence behavior.
