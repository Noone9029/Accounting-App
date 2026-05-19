# Vercel + Supabase Deployment

This project deploys as two Vercel projects backed by one Supabase Postgres database:

- `ledgerbyte-api`: NestJS API from `apps/api`
- `ledgerbyte-web`: Next.js web app from `apps/web`
- Supabase: Postgres only. LedgerByte still uses its own JWT auth and Prisma data model.

Official references:

- Vercel monorepos: https://vercel.com/docs/monorepos
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel function connection pooling: https://vercel.com/kb/guide/connection-pooling-with-functions
- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase connection management: https://supabase.com/docs/guides/database/connection-management
- Supabase Postgres connection strings and pooler modes: https://supabase.com/docs/guides/database/connecting-to-postgres
- Prisma serverless deployment guide: https://docs.prisma.io/docs/v6/orm/prisma-client/deployment/serverless
- Prisma Vercel deployment guide: https://docs.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
- Prisma database connection management: https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
- Prisma PgBouncer/Supavisor guidance: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer

## 1. Create Supabase Database

1. Create a Supabase project.
2. In Supabase, open **Connect** and copy the Prisma/Postgres connection strings.
3. Recommended production setup:
   - `DATABASE_URL`: Supabase transaction pooler/runtime connection string, commonly port `6543`.
   - `DIRECT_URL`: Supabase direct or session connection string for Prisma migrations, commonly port `5432`.
4. Prefer a dedicated Prisma database user instead of the default `postgres` user once moving beyond a private demo.

Do not commit either connection string.

## 2. Apply Prisma Migrations To Supabase

From the repository root on your machine, temporarily point the API env at Supabase:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
```

For a new empty production database, seed once if you want the demo admin, default roles, chart of accounts, fiscal periods, and inventory foundation data:

```bash
corepack pnpm db:seed
```

Do not run `db:seed` against a live production tenant after real data exists unless you have reviewed the seed script.

## 3. Create Vercel API Project

Import the GitHub repository into Vercel as a project named, for example, `ledgerbyte-api`.

Project settings:

- Root Directory: `.`
- Framework Preset: Other
- Include source files outside Root Directory: enabled
- Build Command: leave unset/default for the current Git deployment path.
- Install Command: root `vercel.json` sets `corepack enable && corepack pnpm install --frozen-lockfile`.

The root `vercel.json` is required for Git auto-deploy. It routes all requests to `api/index.js`, and `scripts/vercel-postinstall.cjs` builds the workspace package dependencies plus the Nest API when `LEDGERBYTE_DEPLOY_TARGET=api` is present. Do not rely on `vercel.api.json` for Git-triggered API deployments; that file is the CLI fallback config.

For CLI deployment from this monorepo, link the repository root to the API project and deploy with:

```bash
vercel deploy --prod --local-config vercel.api.json
```

Environment variables:

```env
DATABASE_URL="<supabase runtime pooler url>"
DIRECT_URL="<supabase direct or session url for migrations>"
JWT_SECRET="<long random production secret>"
JWT_EXPIRES_IN="7d"
PRISMA_TRANSACTION_MAX_WAIT_MS="10000"
PRISMA_TRANSACTION_TIMEOUT_MS="20000"
CORS_ORIGIN="https://<your-web-domain>,https://*.vercel.app"
ZATCA_ADAPTER_MODE="mock"
ZATCA_ENABLE_REAL_NETWORK="false"
ZATCA_SANDBOX_BASE_URL=""
ZATCA_SIMULATION_BASE_URL=""
ZATCA_PRODUCTION_BASE_URL=""
ZATCA_SDK_EXECUTION_ENABLED="false"
```

`CORS_ORIGIN` accepts comma-separated exact origins and simple wildcard entries like `https://*.vercel.app`.
`PRISMA_TRANSACTION_TIMEOUT_MS` and `PRISMA_TRANSACTION_MAX_WAIT_MS` are deployment safeguards for Supabase/Vercel latency during multi-step accounting transactions.

For Vercel/serverless runtime traffic, the API must use the Supabase transaction pooler. The runtime `DATABASE_URL` should be a Supabase pooler URL on transaction-mode port `6543`, or a session-mode Supabase pooler URL that the API normalizes to transaction mode at startup. `DIRECT_URL` remains reserved for Prisma CLI/migration/direct database operations. Do not point Prisma migration commands at the transaction pooler unless Prisma's migration configuration has been reviewed for that workflow.

After deployment, verify the API root and health endpoints:

```text
https://<api-project>.vercel.app/
https://<api-project>.vercel.app/health
https://<api-project>.vercel.app/readiness
```

Expected root response:

```json
{
  "service": "LedgerByte API",
  "status": "ok",
  "healthUrl": "/health",
  "readinessUrl": "/readiness",
  "docs": {
    "deployment": "docs/DEPLOYMENT_VERCEL_SUPABASE.md"
  },
  "environment": "production",
  "timestamp": "2026-05-15T00:00:00.000Z"
}
```

Expected health response:

```json
{ "status": "ok", "service": "api" }
```

`/health` is intentionally lightweight and does not require a database check. `/readiness` checks database connectivity and should return `503` with safe JSON if the API function is alive but the database is unavailable or misconfigured.

## 4. Create Vercel Web Project

Import the same GitHub repository into Vercel as a second project named, for example, `ledgerbyte-web`.

Project settings:

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Include source files outside Root Directory: enabled
- Build Command: `corepack pnpm --filter @ledgerbyte/web build`
- Output Directory: `.next`

For CLI deployment from this monorepo, link the repository root to the web project and deploy with:

```bash
vercel deploy --prod --local-config vercel.web.json
```

Environment variables:

```env
NEXT_PUBLIC_API_URL="https://<api-project>.vercel.app"
```

Deploy the web project after the API project URL is known.

The current test deployment uses:

- Web: `https://ledgerbyte-web-test.vercel.app`
- API: `https://ledgerbyte-api-test.vercel.app`

The dated user-testing deployment runbook records the currently verified Git auto-deploy path, CLI fallback path, project ids, deployment ids, health checks, smoke/E2E commands, rollback notes, and root-context API wrapper caveats: [docs/deployment/VERCEL_USER_TESTING_DEPLOYMENT_RUNBOOK.md](deployment/VERCEL_USER_TESTING_DEPLOYMENT_RUNBOOK.md).

Run deployed browser smoke after both projects are promoted:

```bash
LEDGERBYTE_WEB_URL=https://ledgerbyte-web-test.vercel.app LEDGERBYTE_API_URL=https://ledgerbyte-api-test.vercel.app LEDGERBYTE_E2E_EMAIL=<from-secret-store> LEDGERBYTE_E2E_PASSWORD=<from-secret-store> LEDGERBYTE_E2E_ORGANIZATION_ID=<from-secret-store> LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm e2e
```

Deployed smoke and E2E must load credentials from local secret storage or CI secrets. The local Windows operator store is `%LOCALAPPDATA%\LedgerByte\user-testing-credentials.json` with a DPAPI-encrypted password field. Do not commit this file, do not add plaintext password fields, and keep `LEDGERBYTE_ALLOW_GENERATED_TEST_USER` unset for normal deployed validation.

## 5. Production Cutover Checklist

- Supabase migrations applied successfully.
- API `/` returns safe LedgerByte status JSON.
- API `/health` returns `ok`.
- API `/readiness` returns `ok`, or any readiness failure is understood and resolved before relying on app workflows.
- API `CORS_ORIGIN` includes the final web production domain.
- Web `NEXT_PUBLIC_API_URL` points to the API production domain.
- Login works with the seeded admin account or a real production user.
- The first organization loads and tenant-scoped requests include `x-organization-id`.
- Trial Balance, invoices, purchase bills, inventory pages, and PDF endpoints are manually smoke-tested.
- `JWT_SECRET` is strong and not reused from local development.
- Preview deployments do not point at production data unless intentionally allowed.
- For small Supabase pooler deployments, set `PRISMA_CONNECTION_LIMIT=1` or rely on the Vercel default in `PrismaService` to keep each warm serverless instance conservative.

## 6. Known Deployment Limits

- The API runs through a Vercel serverless function wrapper. Long-running background workers are not implemented.
- Redis/BullMQ is still infrastructure groundwork and not required by the current app workflows.
- S3-compatible document upload storage is still not wired; generated PDFs are database-backed local/dev groundwork.
- Supabase is used as Postgres, not Supabase Auth.
- Prisma migrations should be run intentionally before promoting production deployments.
- Supabase row-level security should be reviewed before production exposure. LedgerByte currently enforces tenant isolation in the application layer, and RLS was not enabled automatically during test deployment smoke work. The 2026-05-19 RLS review found 76 public tables with RLS disabled in the user-testing Supabase project and recommends a phased Data API/RLS hardening strategy before production exposure: [docs/deployment/SUPABASE_RLS_REVIEW_20260519.md](deployment/SUPABASE_RLS_REVIEW_20260519.md).
- User-testing cleanup remains dry-run/planning only. Use [docs/deployment/USER_TESTING_ENVIRONMENT_CLEANUP.md](deployment/USER_TESTING_ENVIRONMENT_CLEANUP.md) and `corepack pnpm user-testing:cleanup-plan` before any reviewed manual cleanup.

## 7. Health Troubleshooting

- API root works but web login fails: check web `NEXT_PUBLIC_API_URL`, API `CORS_ORIGIN`, deployed auth credentials, and browser console/network errors.
- `/health` works but `/readiness` fails: the API serverless function is reachable, but database connectivity, migrations, Supabase pooler configuration, or database credentials need review.
- `/health` works directly but web requests fail: confirm the web origin is included in API `CORS_ORIGIN` and redeploy the API after changing it.
- `/` returns `404 Cannot GET /`: the API alias is likely still serving an older deployment that does not include the root status endpoint.
- Readiness returns `503`: inspect safe Vercel function logs for database connection errors without exposing `DATABASE_URL` or other secrets.
- Intermittent API `500` responses with Vercel logs containing `EMAXCONNSESSION` mean the Supabase session pool is exhausted. First confirm runtime traffic is using transaction-mode pooling and that the Vercel wrapper reuses one warm Nest/Prisma bootstrap promise; then review Prisma connection limits, serverless function concurrency/region behavior, or Supabase pool capacity. Do not reset data to fix this symptom.
