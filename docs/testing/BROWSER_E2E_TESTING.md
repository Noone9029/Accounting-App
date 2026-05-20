# Browser E2E Testing

Audit date: 2026-05-15

LedgerByte has a Playwright browser smoke suite for route, form, navigation, and critical user-facing surface checks. It is intentionally lighter than the API smoke: API smoke owns deep accounting assertions, journal behavior, and mutation-heavy workflows.

## Prerequisites

Start local infrastructure and apply database setup before running browser E2E:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
corepack pnpm db:migrate
corepack pnpm db:seed
```

Start the API and web apps in another terminal:

```bash
corepack pnpm dev
```

When the API URL is local, Playwright global setup also seeds validated demo workflow records through the running API before tests start. This creates or reuses local-only demo data for a VAT-valid customer, supplier, finalized sales invoice, customer payment, finalized purchase bill, supplier payment, posted cash expense, opening stock movement, and harmless attachment placeholder. The same seed can be run directly:

```bash
corepack pnpm demo:seed-workflows
```

The workflow seeder is guarded against accidental production use: it refuses non-local API URLs unless `LEDGERBYTE_DEMO_SEED_ALLOW_REMOTE=true` is set for a disposable non-production target. Set `LEDGERBYTE_E2E_SEED_WORKFLOWS=false` to skip automatic workflow seeding.
By default, browser E2E selects organization `00000000-0000-0000-0000-000000000001` only for local targets. Deployed targets must provide `LEDGERBYTE_E2E_ORGANIZATION_ID` from the user-testing secret store or CI configuration.

The browser suite expects:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Seeded admin email: `admin@example.com`
- Seeded admin password: `Password123!`

## Commands

Run the smoke suite:

```bash
corepack pnpm e2e
```

If Playwright reports that Chromium is not installed on the machine, install the browser once:

```bash
corepack pnpm exec playwright install chromium
```

Run in headed mode:

```bash
corepack pnpm e2e:headed
```

Override local URLs or credentials:

```bash
LEDGERBYTE_WEB_URL=http://localhost:3000 LEDGERBYTE_API_URL=http://localhost:4000 corepack pnpm e2e
LEDGERBYTE_E2E_EMAIL=admin@example.com LEDGERBYTE_E2E_PASSWORD=Password123! corepack pnpm e2e
```

Run against the deployed test environment:

```bash
LEDGERBYTE_WEB_URL=https://ledgerbyte-web-test.vercel.app LEDGERBYTE_API_URL=https://ledgerbyte-api-test.vercel.app LEDGERBYTE_E2E_EMAIL=<from-secret-store> LEDGERBYTE_E2E_PASSWORD=<from-secret-store> LEDGERBYTE_E2E_ORGANIZATION_ID=<from-secret-store> LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm e2e
```

PowerShell equivalent:

```powershell
$env:LEDGERBYTE_WEB_URL = "https://ledgerbyte-web-test.vercel.app"
$env:LEDGERBYTE_API_URL = "https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_E2E_EMAIL = "<from secret store>"
$env:LEDGERBYTE_E2E_PASSWORD = "<from secret store>"
$env:LEDGERBYTE_E2E_ORGANIZATION_ID = "<from secret store>"
$env:LEDGERBYTE_E2E_SEED_WORKFLOWS = "false"
Remove-Item Env:\LEDGERBYTE_ALLOW_GENERATED_TEST_USER -ErrorAction SilentlyContinue
corepack pnpm e2e
```

The deployed test suite runs with one worker by default to avoid overwhelming the small Vercel/Supabase test environment. The per-test and expectation timeouts are configurable with `LEDGERBYTE_E2E_TEST_TIMEOUT_MS` and `LEDGERBYTE_E2E_EXPECT_TIMEOUT_MS`. If Vercel logs show `EMAXCONNSESSION`, wait for API health to recover, confirm runtime traffic is on the Supabase transaction pooler, and review Prisma connection limits or Vercel function concurrency before rerunning.

Before rerunning deployed browser E2E after an API smoke stall, isolate the API route or phase first. The 2026-05-20 journal diagnostic showed `GET /journal-entries` reached the API and completed. The follow-up banking diagnostic showed `POST /bank-transfers/:id/void`, its idempotent second void, and the immediate bank account reads also completed under the 60-second request timeout. A later full smoke run against commit `b6d3e2d19d17ac744281988913b17b3be3144890` reached a 60-minute hard ceiling without any per-route timeout or stderr output, so the blocker was smoke duration rather than a proven browser E2E bug. The first deployed `corepack pnpm smoke:accounting:tail` run against commit `1b7ff0dbbc331c3f1b721ace29ce2a562c6f381d` also reached its 45-minute ceiling while still progressing, with no per-route timeout, no smoke-fetch error, no stderr, stable pool counts, and healthy API/web checks afterward. The follow-up narrow phases proved AR, AP, and documents individually, but `corepack pnpm smoke:accounting:reports` hit the first per-request timeout at `GET /dashboard/summary` after 60 seconds. Rerun browser E2E only after the deployed dashboard summary latency is classified, or after bounded deployed smoke phases pass or produce a documented non-E2E blocker.

## GitHub Actions

`.github/workflows/deployed-e2e.yml` runs the deployed Playwright smoke suite through a manual **Deployed E2E Smoke** workflow.

Runbook and readiness docs:

- [Deployed E2E runbook](../deployment/DEPLOYED_E2E_RUNBOOK.md)
- [CI database readiness checklist](../deployment/CI_DATABASE_READINESS_CHECKLIST.md)
- [Supabase security review](../deployment/SUPABASE_SECURITY_REVIEW.md)

Required GitHub Actions secrets:

- `LEDGERBYTE_E2E_EMAIL`
- `LEDGERBYTE_E2E_PASSWORD`
- `LEDGERBYTE_E2E_ORGANIZATION_ID`

Optional repository variables:

- `LEDGERBYTE_WEB_URL`
- `LEDGERBYTE_API_URL`

Manual dispatch inputs can override the URLs for a single run:

- `web_url`, default `https://ledgerbyte-web-test.vercel.app`
- `api_url`, default `https://ledgerbyte-api-test.vercel.app`

The workflow:

1. Checks out the repository.
2. Sets up Node 22 and Corepack.
3. Runs `corepack pnpm install --frozen-lockfile`.
4. Installs Playwright Chromium with Linux dependencies.
5. Runs `node scripts/check-deployed-e2e-env.cjs`, which checks the deployed web URL, API root, `/health`, `/readiness`, and required credentials without printing secrets.
6. Runs `corepack pnpm e2e`.
7. Uploads `playwright-report/` and `test-results/` artifacts when present.

To run it from GitHub:

1. Open **Actions**.
2. Select **Deployed E2E Smoke**.
3. Choose **Run workflow**.
4. Keep the default test URLs or provide another deployed test web/API pair.

Artifacts appear on the workflow run summary. On failures, inspect `playwright-test-results` first for screenshots, videos, and error context. `playwright-report` is uploaded when Playwright creates it.

## Preflight

`tests/e2e/global-setup.ts` checks that:

- API health is reachable.
- Web app is reachable.
- Login credentials are configured.

If either app is not running, Playwright fails with:

```text
Start local API/web before running E2E.
```

The suite does not start Docker, API, or web automatically.

For deployed GitHub Actions runs, `scripts/check-deployed-e2e-env.cjs` performs a stricter deployment preflight: it verifies the API root status response, lightweight `/health`, database-backed `/readiness`, web URL, and required E2E credentials. This separates "API function is reachable" from "database is ready" when diagnosing Vercel/Supabase failures.

## Covered Flows

- Auth and navigation: login, dashboard shell, organization switcher, owner-visible nav, sign out.
- Sales: invoice list and new invoice form shell.
- Purchases: bill list/form, purchase orders, supplier payments, cash expenses.
- Banking: bank account list/detail, statement imports, reconciliation summary, reconciliation list.
- Reports: reports index, General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, Aged Payables, export button visibility.
- Inventory: warehouses, stock movements, balances, adjustments, transfers, purchase receipts, sales stock issues, variance proposals, settings, stock valuation, movement summary, low stock, clearing reconciliation, clearing variance.
- Attachments: attachment panel rendering on an available accounting document detail page.
- Permissions: role list, role detail permission matrix, team page.
- Email/auth groundwork: password reset generic response, mock email outbox, email readiness panel.
- ZATCA: readiness/settings surface without real network credentials.
- Storage: database storage readiness, generated document storage readiness, redacted S3 readiness, dry-run migration notice.
- Validated demo workflow data: customer/supplier VAT fields, finalized AR/AP documents, payments, posted cash expense, opening stock movement, and app-list rendering for those records.

## Data Strategy

- Uses the seeded admin for login.
- Seeds local demo workflow records through validated API endpoints when the API target is local.
- Uses API setup helpers to discover existing records for detail-page smoke checks.
- Skips the new seeded workflow assertions on remote targets unless workflow seeding is explicitly enabled.
- Avoids external services and real email/S3/ZATCA credentials.

## Known Limits

- The browser suite does not prove full accounting correctness.
- It does not perform visual regression testing.
- Attachment upload/download/delete remains covered by API smoke; browser coverage is currently render-only.
- Email invite acceptance and token extraction remain covered by API smoke; browser coverage checks the visible password reset/outbox/readiness surfaces.
- CI wiring is currently manual-dispatch only.
- The deployed test environment must already have Prisma migrations applied and the seeded test admin available.
- Supabase test projects with small pooler limits can surface route-load flakiness if API functions open too many concurrent database sessions. Deployed Vercel API runtime traffic should use Supabase transaction-mode pooling plus a conservative Prisma runtime connection limit.
- Full deployed E2E remained intentionally deferred after the 2026-05-20 journal-route, banking-route, monolithic full-smoke-duration isolation, first tail-slice ceiling result, and narrow reports-phase `GET /dashboard/summary` timeout. Diagnose that deployed dashboard route before attempting full deployed E2E.
- The GitHub Actions workflow is manual-only for now; scheduled or push-triggered deployed testing should be added only after the test environment is treated as disposable and non-production.
