# Deployed E2E Runbook

Audit date: 2026-05-15

This runbook explains how to run and triage the deployed LedgerByte Playwright smoke suite in GitHub Actions. It is intended for non-production test environments.

## Workflow

Workflow file:

- `.github/workflows/deployed-e2e.yml`

Workflow name:

- **Deployed E2E Smoke**

Trigger:

- Manual `workflow_dispatch` only.

Default test targets:

- Web: `https://ledgerbyte-web-test.vercel.app`
- API: `https://ledgerbyte-api-test.vercel.app`

## Required Secrets

Configure these in GitHub repository settings before running the workflow:

- `LEDGERBYTE_E2E_EMAIL`
- `LEDGERBYTE_E2E_PASSWORD`
- `LEDGERBYTE_E2E_ORGANIZATION_ID`

Do not store production user credentials in these secrets. The organization id can also be stored as a repository variable, but the workflow must receive it so the suite targets the intended user-testing tenant.

Optional repository variables:

- `LEDGERBYTE_WEB_URL`
- `LEDGERBYTE_API_URL`

Manual dispatch inputs can override variables for a single run.

## How To Run

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Select **Deployed E2E Smoke**.
4. Click **Run workflow**.
5. Confirm `web_url` and `api_url` point to the non-production test environment.
6. Start the run.

The job will:

1. Check out the repository.
2. Install dependencies.
3. Install Playwright Chromium.
4. Run `node scripts/check-deployed-e2e-env.cjs`.
5. Run `corepack pnpm e2e`.
6. Upload artifacts from `playwright-report/` and `test-results/` when present.

## Local Equivalent

PowerShell:

```powershell
$env:LEDGERBYTE_WEB_URL = "https://ledgerbyte-web-test.vercel.app"
$env:LEDGERBYTE_API_URL = "https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_E2E_EMAIL = "<test-email>"
$env:LEDGERBYTE_E2E_PASSWORD = "<test-password>"
$env:LEDGERBYTE_E2E_ORGANIZATION_ID = "<test-organization-id>"
$env:LEDGERBYTE_E2E_SEED_WORKFLOWS = "false"
Remove-Item Env:\LEDGERBYTE_ALLOW_GENERATED_TEST_USER -ErrorAction SilentlyContinue
node scripts/check-deployed-e2e-env.cjs
corepack pnpm e2e
```

For local Windows operator runs, load those values from `%LOCALAPPDATA%\LedgerByte\user-testing-credentials.json`; the password field in that file must be DPAPI-encrypted, not plaintext. `LEDGERBYTE_ALLOW_GENERATED_TEST_USER=true` is only for isolated non-production debugging and should stay unset for normal deployed proof.

## Artifacts

Inspect artifacts from the workflow run summary.

- `playwright-test-results`: screenshots, videos, and error context when tests fail.
- `playwright-report`: HTML report when Playwright creates it in CI.

Start with `playwright-test-results` for route crashes, selector failures, and screenshots.

## Common Failures

### API Down Or Wrong Endpoint

Symptoms:

- Preflight fails on API root, API health, or API readiness.
- Browser shows network errors.
- `GET /` returns `404 Cannot GET /`, which now usually means the API alias is serving an older deployment.

Checks:

- Open `https://ledgerbyte-api-test.vercel.app/`.
- Expected root status includes `{"service":"LedgerByte API","status":"ok","healthUrl":"/health"}`.
- Open `https://ledgerbyte-api-test.vercel.app/health`.
- Expected: `{"status":"ok","service":"api"}`.
- Open `https://ledgerbyte-api-test.vercel.app/readiness`.
- Expected: status `ok` when Supabase is reachable; safe `503` JSON when the API is alive but DB connectivity is failing.

Recovery:

- Confirm the API deployment is ready in Vercel.
- Confirm the API alias points at the latest deployment.
- Confirm API environment variables are present.
- If root and health work but readiness fails, inspect Supabase connection strings, migrations, connection pool pressure, and Vercel function logs.

### Missing Migrations

Symptoms:

- API returns `500`.
- `/readiness` may work while route handlers that need missing tables fail.
- Vercel logs mention missing tables, columns, or enum values.
- E2E fails on routes added recently.

Recovery:

- Confirm this is the test Supabase project.
- Apply Prisma migrations to the test database.
- Re-run API health and deployed E2E.

### Seed User Missing

Symptoms:

- Login fails with `401`.
- E2E global setup or first authenticated test fails.

Recovery:

- Confirm the test user exists.
- Confirm default organization membership is active.
- Reseed only if the database is disposable test data.

### CORS Issue

Symptoms:

- Browser console shows CORS blocked requests.
- API root, health, and readiness work directly, but web cannot call authenticated API routes.

Recovery:

- Confirm API `CORS_ORIGIN` includes the web test origin.
- Redeploy API after changing CORS env.

### Stale Vercel Deployment

Symptoms:

- Local E2E passes but deployed E2E fails on missing routes or old UI text.
- Vercel deployment date predates the commit under test.

Recovery:

- Redeploy the correct API or web project.
- Confirm web `NEXT_PUBLIC_API_URL` points at the intended API deployment.

### Supabase Connection Pool Pressure

Symptoms:

- Intermittent API `500`.
- Logs mention max clients, pool size, or session pool pressure.
- Logs containing `EMAXCONNSESSION` indicate Supabase session-mode pool exhaustion.

Recovery:

- Keep E2E workers at `1`.
- Confirm the API runtime is using Supabase transaction-mode pooling for Vercel/serverless traffic. For Supabase pooler URLs, session mode uses port `5432`; transaction mode uses port `6543`.
- Keep API Prisma runtime connection limits conservative. The API defaults to `connection_limit=1` on Vercel unless `PRISMA_CONNECTION_LIMIT` is explicitly set.
- Confirm the Vercel API wrapper caches the in-flight Nest bootstrap promise so concurrent cold requests do not create multiple Prisma clients in the same warm function instance.
- Avoid adding highly parallel page-load requests in smoke tests.
- Use sanitized pool diagnostics only: connection counts by safe labels are acceptable; connection strings, usernames, passwords, tokens, SQL bodies with customer data, document bodies, and auth headers are not.
- Retry only after checking logs; do not hide persistent pool exhaustion.

Official references used for the 2026-05-20 pool-exhaustion repair:

- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase connection management: https://supabase.com/docs/guides/database/connection-management
- Supabase Postgres connection strings and pooler modes: https://supabase.com/docs/guides/database/connecting-to-postgres
- Prisma serverless connection management: https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
- Prisma Vercel deployment guide: https://docs.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
- Prisma PgBouncer/Supavisor guidance: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
- Vercel function connection pooling guide: https://vercel.com/kb/guide/connection-pooling-with-functions

### API Smoke Route Appears To Hang

Symptoms:

- A deployed `corepack pnpm smoke:accounting` run prints progress through purchase workflows and then appears to stop around `GET /journal-entries`.
- API `/`, `/health`, and `/readiness` continue returning HTTP `200`.
- Vercel error logs do not show route errors, and sanitized Supabase pool counts do not grow.

Checks:

- Reproduce one route only before rerunning the full smoke loop.
- Use secret-store credentials and do not print passwords, tokens, auth headers, request bodies, response bodies, customer documents, or attachment bodies.
- Enable `LEDGERBYTE_SMOKE_PROGRESS=true` and set `LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS=60000` for a bounded diagnostic run.
- Capture sanitized pool counts before and after the single route. Counts by state are acceptable; connection strings, usernames, SQL text, and customer content are not.

2026-05-20 finding:

- The suspected route was unpaginated `GET /journal-entries` after purchase-bill accounting-preview.
- The request reached the API and completed with HTTP `200` in about five seconds, returning 68,441 bytes for 75 journal entries and 166 summarized lines.
- The old route ignored `limit=5&page=1`, so count-style smoke checks still downloaded the full list.
- Pool counts stayed stable around `unknown=8`, `active=1`, `idle=5`; no recurring `EMAXCONNSESSION` was observed.
- Commit `998930a7fdcc94fa3d926ded3b1f20f0917f69b6` added tenant-scoped `GET /journal-entries/count`, changed smoke count assertions to use it, and added request timeout/progress helpers.
- A bounded smoke run after the fix progressed past journal counts into banking but did not finish inside a 30-minute external ceiling. Full deployed E2E remains intentionally deferred until smoke runtime length is triaged.

### Banking Smoke Slice

Use this before rerunning the full deployed smoke loop when the last visible route is near bank transfers:

```powershell
$env:LEDGERBYTE_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_SMOKE_EMAIL="<from secret store>"
$env:LEDGERBYTE_SMOKE_PASSWORD="<from secret store>"
$env:LEDGERBYTE_SMOKE_ORGANIZATION_ID="<from secret store>"
$env:LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS="60000"
$env:LEDGERBYTE_SMOKE_PROGRESS="true"
Remove-Item Env:\LEDGERBYTE_ALLOW_GENERATED_TEST_USER -ErrorAction SilentlyContinue
corepack pnpm smoke:accounting:banking
```

2026-05-20 finding:

- The exact bank-transfer route was `POST /bank-transfers/:id/void` after bank transfer creation, statement import, match-candidate lookup, and statement-row matching.
- The first void request reached the API and completed with HTTP `201` in about 22 seconds with a 2,078-byte response.
- The immediately following smoke step was the idempotent second `POST /bank-transfers/:id/void`; it completed with HTTP `201` in about 8 seconds.
- The next account-detail reads completed in about 6 seconds each, and the following `GET /bank-accounts/:id/transactions` completed in about 16 seconds.
- Sanitized pool counts stayed stable around `unknown=8`, `active=1`, `idle=5-7`; Vercel API error-log inspection returned no error entries.
- The confirmed issue is monolithic deployed smoke runtime length, not a bank-transfer route hang, response parser hang, DB lock, or recurring `EMAXCONNSESSION`.
- Full deployed smoke and full deployed E2E remain pending until the full smoke loop is run with an appropriate hard ceiling.

### Accounting Smoke Tail Slice

Use this before rerunning the full deployed smoke loop when the remaining work is in late AR/AP, generated documents, storage, reporting, or ZATCA-safe checks:

```powershell
$env:LEDGERBYTE_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_SMOKE_EMAIL="<from secret store>"
$env:LEDGERBYTE_SMOKE_PASSWORD="<from secret store>"
$env:LEDGERBYTE_SMOKE_ORGANIZATION_ID="<from secret store>"
$env:LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS="60000"
$env:LEDGERBYTE_SMOKE_PROGRESS="true"
Remove-Item Env:\LEDGERBYTE_ALLOW_GENERATED_TEST_USER -ErrorAction SilentlyContinue
corepack pnpm smoke:accounting:tail
```

The tail slice creates its own smoke customer/supplier/document records and covers ZATCA-safe no-network checks, local/mock CSID and XML/hash/QR flows, blocked clearance/reporting responses, customer payments, overpayments, refunds, credit notes, purchase bills, purchase debit notes, supplier payments/refunds, ledgers/statements, receipt/PDF/report endpoints, generated document archive downloads, uploaded attachments, representative audit log redaction, storage readiness, migration-plan dry runs, and backup/restore readiness planning. It must use the same secret-store credential guard, `LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS`, and redacted progress logging as the full smoke.

2026-05-20 tail-slice validation:

- Deployment tested: API `dpl_6aYo1qozin4cLw1NHvUieaWDV1vE`, web `dpl_CikxbkGdssTwCZUo8Hon9VCvkYTj`, commit `1b7ff0dbbc331c3f1b721ace29ce2a562c6f381d`.
- A single secret-store-backed `corepack pnpm smoke:accounting:tail` run used `LEDGERBYTE_SMOKE_PROGRESS=true`, `LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS=60000`, generated-user fallback unset, and a 45-minute hard ceiling.
- The command was stopped at about 45.45 minutes while still making forward progress. It did not pass inside the requested ceiling.
- No individual route exceeded the 60-second request timeout, no `[smoke-fetch:error]` lines were logged, and stderr was empty.
- Last completed route: `GET /supplier-payments/:id -> 200` in 8,015 ms.
- Last started route: `GET /contacts/:id/supplier-ledger`.
- Slowest completed route labels: `POST /purchase-bills/:id/void -> 201` in 30,344 ms, `POST /sales-invoices/:id/finalize -> 201` in 27,571 ms, and `POST /purchase-debit-notes/:id/void -> 201` in 26,718 ms.
- Pre-tail pool snapshot was `active=1`, `idle=5`, `unknown=8`; post-tail snapshot was `active=1`, `idle=7`, `unknown=8`.
- API `/`, `/health`, and `/readiness` remained HTTP `200`; web `/`, `/setup`, and `/settings/storage` remained HTTP `200`.
- Runtime-log inspection was unavailable because the Vercel runtime-log connector returned `Auth required`.
- Classification: the tail slice is still too broad for a 45-minute deployed ceiling. This was not a confirmed route hang, parser hang, DB lock, or recurring `EMAXCONNSESSION`.

2026-05-20 full-smoke ceiling finding:

- A single deployed full smoke against API deployment `dpl_46ix42o9oadwynLgJThkeqP752Mr` and web deployment `dpl_9nYUNaRDSgw2BzEP2fsjPfE2KRuD`, commit `b6d3e2d19d17ac744281988913b17b3be3144890`, was stopped at the 60-minute hard ceiling after about 61.6 minutes.
- No individual route exceeded the 60-second request timeout, no `[smoke-fetch:error]` lines were logged, and stderr was empty.
- Last completed route: `GET /sales-invoices/:id/credit-note-allocations -> 200` in 5,631 ms.
- Last started route: `GET /contacts/:id/ledger`.
- Slowest completed route: `POST /purchase-receipts/:id/post-inventory-asset -> 201` in 36,024 ms.
- Sanitized pool counts stayed stable from `active=1`, `idle=5`, `unknown=8` before to `active=1`, `idle=7`, `unknown=8` after.
- The result was classified as monolithic smoke duration, not a route hang, parser hang, DB lock, or recurring `EMAXCONNSESSION`.
- Full deployed E2E remains intentionally deferred until bounded smoke phases pass.

## Safety Rules

- Do not run deployed E2E against production data.
- Do not use real customer accounts.
- Do not store production credentials in E2E secrets.
- Do not make deployed E2E destructive.
- Do not enable Supabase RLS or alter production policies as part of a smoke run.
