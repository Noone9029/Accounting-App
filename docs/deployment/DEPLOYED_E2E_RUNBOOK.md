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

Do not store production user credentials in these secrets.

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
node scripts/check-deployed-e2e-env.cjs
corepack pnpm e2e
```

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

Recovery:

- Keep E2E workers at `1`.
- Keep API Prisma runtime connection limits conservative.
- Avoid adding highly parallel page-load requests in smoke tests.
- Retry only after checking logs; do not hide persistent pool exhaustion.

## Safety Rules

- Do not run deployed E2E against production data.
- Do not use real customer accounts.
- Do not store production credentials in E2E secrets.
- Do not make deployed E2E destructive.
- Do not enable Supabase RLS or alter production policies as part of a smoke run.
