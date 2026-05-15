# Vercel + Supabase Deployment

This project deploys as two Vercel projects backed by one Supabase Postgres database:

- `ledgerbyte-api`: NestJS API from `apps/api`
- `ledgerbyte-web`: Next.js web app from `apps/web`
- Supabase: Postgres only. LedgerByte still uses its own JWT auth and Prisma data model.

Official references:

- Vercel monorepos: https://vercel.com/docs/monorepos
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma

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
- Build Command: `corepack pnpm --filter @ledgerbyte/api db:generate`

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

After deployment, verify:

```text
https://<api-project>.vercel.app/health
```

Expected response:

```json
{ "status": "ok", "service": "api" }
```

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

Run deployed browser smoke after both projects are promoted:

```bash
LEDGERBYTE_WEB_URL=https://ledgerbyte-web-test.vercel.app LEDGERBYTE_API_URL=https://ledgerbyte-api-test.vercel.app LEDGERBYTE_E2E_EMAIL=admin@example.com LEDGERBYTE_E2E_PASSWORD=Password123! corepack pnpm e2e
```

## 5. Production Cutover Checklist

- Supabase migrations applied successfully.
- API `/health` returns `ok`.
- API `CORS_ORIGIN` includes the final web production domain.
- Web `NEXT_PUBLIC_API_URL` points to the API production domain.
- Login works with the seeded admin account or a real production user.
- The first organization loads and tenant-scoped requests include `x-organization-id`.
- Trial Balance, invoices, purchase bills, inventory pages, and PDF endpoints are manually smoke-tested.
- `JWT_SECRET` is strong and not reused from local development.
- Preview deployments do not point at production data unless intentionally allowed.
- For small Supabase pooler deployments, set `PRISMA_CONNECTION_LIMIT=1` or rely on the Vercel default in `PrismaService` to keep serverless database session usage conservative.

## 6. Known Deployment Limits

- The API runs through a Vercel serverless function wrapper. Long-running background workers are not implemented.
- Redis/BullMQ is still infrastructure groundwork and not required by the current app workflows.
- S3-compatible document upload storage is still not wired; generated PDFs are database-backed local/dev groundwork.
- Supabase is used as Postgres, not Supabase Auth.
- Prisma migrations should be run intentionally before promoting production deployments.
- Supabase row-level security should be reviewed before production exposure. LedgerByte currently enforces tenant isolation in the application layer, and RLS was not enabled automatically during test deployment smoke work.
