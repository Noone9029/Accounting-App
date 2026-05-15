# CI Database Readiness Checklist

Audit date: 2026-05-15

This checklist defines what must be true before trusting the deployed LedgerByte browser E2E smoke suite. It is for non-production Vercel/Supabase test environments only.

## Environment Boundary

- Supabase database is a test database, not production.
- Vercel API project points only at the test Supabase database.
- Vercel web project points only at the test API URL through `NEXT_PUBLIC_API_URL`.
- GitHub Actions workflow inputs point at the test web/API pair.
- No production database URL, direct database URL, JWT secret, or E2E password is committed to the repository.
- The E2E workflow is manual-only and should not be pointed at production data.

## Required Deployed URLs

Current test defaults:

- Web: `https://ledgerbyte-web-test.vercel.app`
- API: `https://ledgerbyte-api-test.vercel.app`

Verify API root, health, and readiness:

```bash
curl -fsS https://ledgerbyte-api-test.vercel.app/
curl -fsS https://ledgerbyte-api-test.vercel.app/health
curl -fsS https://ledgerbyte-api-test.vercel.app/readiness
```

Expected health:

```json
{"status":"ok","service":"api"}
```

Expected root status includes `service`, `status`, `healthUrl`, sanitized `environment`, and `timestamp`. Expected readiness is `status: "ok"` when the test Supabase database is reachable. A readiness `503` means the API function is reachable but database connectivity is not ready. `GET /` returning `404 Cannot GET /` now usually means the API alias is serving an older deployment that does not include the root status endpoint.

## Required GitHub Configuration

Required GitHub Actions secrets:

- `LEDGERBYTE_E2E_EMAIL`
- `LEDGERBYTE_E2E_PASSWORD`

Optional GitHub Actions variables:

- `LEDGERBYTE_WEB_URL`
- `LEDGERBYTE_API_URL`

Manual workflow dispatch can override the URLs for one run. Do not enter production URLs unless the production environment has been explicitly approved for read-only smoke checks and contains no real customer data.

## Database Readiness

Before running deployed E2E:

- Prisma migrations are applied to the test Supabase database.
- The seed/admin test user exists.
- The test organization exists.
- Default roles and permissions exist.
- Demo chart of accounts, tax rates, bank account profiles, inventory foundation data, and document settings required by seeded admin smoke pages exist.
- The API can log in using the E2E credentials.
- The web app can load `/login` and `/dashboard` against the test API.

Safe login verification:

```bash
curl -fsS https://ledgerbyte-api-test.vercel.app/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"<test-email>","password":"<test-password>"}'
```

Do not paste real production passwords into shell history.

## Reset Or Reseed Test DB

Use only on disposable test databases:

1. Confirm the Supabase project is the test project.
2. Confirm the Vercel API project points at the same test database.
3. Back up any test evidence you need.
4. Apply migrations from the repository.
5. Run seed only after confirming no real customer data exists.
6. Run `node scripts/check-deployed-e2e-env.cjs`.
7. Run the deployed E2E workflow.

Do not run destructive reset or reseed commands against production.

## Go/No-Go

Go:

- `/` returns safe LedgerByte API status JSON.
- `/health` returns `200`.
- `/readiness` returns database `ok`, or a readiness failure has been investigated and accepted only for non-DB smoke checks.
- E2E secrets are configured in GitHub.
- API login works with the test user.
- Vercel web points at the test API.
- Supabase test DB is migrated and seeded.
- No production URLs or credentials are in the workflow inputs.

No-go:

- API runtime points at production.
- Web runtime points at a production API.
- E2E user is a real production user.
- Migrations are missing.
- Seed user or test organization is missing.
- GitHub secrets are absent.
- Supabase connection pool errors are active and unresolved.
