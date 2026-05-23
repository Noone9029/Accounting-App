# DEV-01 Local QA Runbook

Status: created during DEV-01 Part 3.5 on 2026-05-23.

Latest pushed state inspected: `e977376 QA DEV-01 sales AR routes`.

## Scope And Rules

- This runbook is for local DEV-01 route QA only.
- Do not use it to deploy, provision remote services, change Vercel/Supabase settings, change environment variables, run migrations, seed/reset/delete data, or change accounting, ZATCA, email, customer data, schema, or production docs.
- Keep AWS as the future production direction only.
- Keep Vercel beta/user-testing/staging only.
- If a dependency is missing, record the blocker and continue with code review or public web shell checks instead of pretending authenticated runtime QA passed.

## Current Part 3.5 Finding

- API startup is blocked before it listens on `localhost:4000`: Prisma initialization failed with `P1001` because the configured local database server was not reachable at `localhost:5432`.
- Docker Desktop/Engine was not available during triage, so the documented Docker local infra path could not be inspected or started.
- Web startup works independently with `@ledgerbyte/web` on `localhost:3000`; shell HTTP checks returned `200` for `/login` and `/dashboard`.
- The in-app Browser tool refused local route navigation under its URL policy in the prior Sales/AR QA run. That is a Codex/browser-tool limitation, not proof that the app route failed.
- Authenticated browser-runtime QA remains blocked until a safe local database/API state and an allowed browser/runtime method are available.

## Required Non-Secret Env Categories

Do not print or commit actual values.

- API runtime: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_PORT`, and `CORS_ORIGIN`.
- API optional/local integrations: `REDIS_URL`, S3 settings, SMTP/email settings, and ZATCA-related settings when those features are explicitly in scope.
- Migration/admin-only category: `DIRECT_URL`, used by migration workflows and not needed for simple route QA startup.
- Web runtime: `NEXT_PUBLIC_API_URL`.

## Expected Local Ports

| Service | Expected local port | Evidence |
| --- | ---: | --- |
| Web | `3000` | `apps/web/package.json` runs `next dev --port 3000`. |
| API | `4000` | `apps/api/src/main.ts` defaults `API_PORT` to `4000`; README documents `/health` and `/readiness`. |
| PostgreSQL | `5432` | `infra/docker-compose.yml` exposes the local Postgres dependency on `5432`. |
| Redis | `6379` | `infra/docker-compose.yml` exposes Redis on `6379`. |

## Safe Startup Path For Route QA

Use this path only when the local database has already been prepared by a previously approved setup and no migration/seed/reset/delete work is required.

1. Confirm the expected ports are free or intentionally owned:

   ```powershell
   Get-NetTCPConnection -State Listen -LocalPort 3000,4000,5432,6379 -ErrorAction SilentlyContinue
   ```

2. Start the API in one terminal:

   ```powershell
   corepack pnpm --filter @ledgerbyte/api dev
   ```

3. Start the web app in another terminal:

   ```powershell
   corepack pnpm --filter @ledgerbyte/web dev
   ```

4. Probe API health before authenticated route QA:

   ```powershell
   Invoke-WebRequest -Uri http://localhost:4000/health -UseBasicParsing -TimeoutSec 5
   ```

5. Probe API readiness only after health succeeds:

   ```powershell
   Invoke-WebRequest -Uri http://localhost:4000/readiness -UseBasicParsing -TimeoutSec 5
   ```

6. Probe a public web route:

   ```powershell
   Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing -TimeoutSec 10
   ```

7. If both API probes pass and safe documented local credentials are available, authenticated route QA can proceed. If not, mark affected routes blocked.

## If API Health Fails

- Check whether anything is listening on `4000`.
- Check API startup logs for Prisma initialization errors.
- If logs show `P1001` or no service is listening on `5432`, the local Postgres dependency is missing or unavailable.
- Do not run migrations, seeds, resets, deletes, or env changes in a DEV-01 route-QA thread unless a future prompt explicitly permits them.
- Continue with code review and public web shell checks only.

## If Readiness Fails

- If `/health` passes but `/readiness` returns a failure or `503`, the API process is up but database readiness is not proven.
- Do not mark authenticated, data-backed, role-based, PDF/archive, attachment, or state-changing route behavior as passed.
- Record the exact readiness response class without exposing secrets, request bodies, cookies, tokens, DB URLs, auth headers, or customer data.

## Browser Route QA Limitation

- During DEV-01 Part 3, the in-app Browser tool refused local URL navigation under its URL policy.
- Do not work around that specific tool policy with raw CDP, alternate browser surfaces, or indirect browser automation in the same blocked flow.
- Future DEV-01 QA can use a mixed method: shell HTTP checks for route serving, code review for frontend/API dependency behavior, and targeted Playwright/browser checks only when explicitly allowed and when local API/database prerequisites are already safe.

## Known Blockers

- Docker Desktop/Engine was not running during Part 3.5, so local Postgres/Redis containers were unavailable.
- No listener was present on `localhost:5432`.
- API startup failed before `localhost:4000` was reachable because Prisma could not connect to the local database.
- In-app browser route visits to local URLs remain blocked by Browser tool policy.
- Authenticated runtime QA still needs an already prepared non-production local database and safe credentials.

## Safe Next Step For DEV-01 Part 4

Run `DEV-01 Part 4: purchases and AP route QA` as mixed QA unless the local database and API are already available before the thread starts. Re-check ports and API health first; if health/readiness remain blocked, code-review the AP routes and use shell HTTP only for public web route serving checks.
