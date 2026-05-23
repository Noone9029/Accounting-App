# DEV-01 Local QA Runbook

Status: created during DEV-01 Part 3.5 on 2026-05-23; refreshed after local Docker Postgres/Redis were started.

Latest pushed state inspected for the refresh: `edaec45 Triage DEV-01 local QA runtime blockers`.

## Scope And Rules

- This runbook is for local DEV-01 route QA only.
- Do not use it to deploy, provision remote services, change Vercel/Supabase settings, change environment variables, run migrations, seed/reset/delete data, or change accounting, ZATCA, email, customer data, schema, or production docs.
- Keep AWS as the future production direction only.
- Keep Vercel beta/user-testing/staging only.
- If a dependency is missing, record the blocker and continue with code review or public web shell checks instead of pretending authenticated runtime QA passed.

## Current Part 3.5 Finding

- Initial API startup was blocked before it listened on `localhost:4000`: Prisma initialization failed with `P1001` because the configured local database server was not reachable at `localhost:5432`.
- After Docker became available, `postgres` and `redis` were started with the existing compose file and both became healthy on `localhost:5432` and `localhost:6379`.
- The local database is not empty: `_prisma_migrations` exists and the public schema contains 76 tables. No migrations, seeds, resets, or deletes were run in this triage.
- API startup now works with `corepack pnpm --filter @ledgerbyte/api dev`; `GET /health` returns `200` and `GET /readiness` returns `200` with database `ok`.
- Web startup works independently with `@ledgerbyte/web` on `localhost:3000`; shell HTTP checks returned `200` for `/login` and `/dashboard`.
- The in-app Browser tool refused local route navigation under its URL policy in the prior Sales/AR QA run. That is a Codex/browser-tool limitation, not proof that the app route failed.
- Local API/web shell runtime is now unblocked while the containers and dev servers are running. In-app Browser-based route QA remains blocked by tool policy, and authenticated login was not probed because the login path writes an audit log.

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

2. If local Postgres/Redis are not already running and local dependency startup is explicitly allowed, start only those compose services:

   ```powershell
   docker compose -f infra/docker-compose.yml up -d postgres redis
   ```

3. Confirm Postgres and Redis are healthy:

   ```powershell
   docker compose -f infra/docker-compose.yml ps postgres redis
   Test-NetConnection localhost -Port 5432
   Test-NetConnection localhost -Port 6379
   ```

4. Start the API in one terminal:

   ```powershell
   corepack pnpm --filter @ledgerbyte/api dev
   ```

5. Start the web app in another terminal:

   ```powershell
   corepack pnpm --filter @ledgerbyte/web dev
   ```

6. Probe API health before authenticated route QA:

   ```powershell
   Invoke-WebRequest -Uri http://localhost:4000/health -UseBasicParsing -TimeoutSec 5
   ```

7. Probe API readiness only after health succeeds:

   ```powershell
   Invoke-WebRequest -Uri http://localhost:4000/readiness -UseBasicParsing -TimeoutSec 5
   ```

8. Probe a public web route:

   ```powershell
   Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing -TimeoutSec 10
   ```

9. If both API probes pass and safe documented local credentials are available, authenticated route QA can proceed through an allowed browser/runtime method. If not, mark affected routes blocked or code-reviewed only.

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
- Future DEV-01 QA can use a mixed method: shell HTTP checks for route serving, API health/readiness checks, code review for frontend/API dependency behavior, and targeted Playwright/browser checks only when explicitly allowed and when local API/database prerequisites are already safe.

## Known Blockers

- Historical blocker resolved during refresh: Docker/Postgres/Redis were previously unavailable, causing API Prisma startup failure (`P1001`) before `localhost:4000` was reachable.
- Current API/web shell runtime blocker: none observed while Postgres, Redis, API, and web dev servers are running.
- In-app browser route visits to local URLs remain blocked by Browser tool policy.
- Authenticated browser-runtime QA still needs an allowed browser/runtime method. Login was not executed in this triage because it writes an audit log.

## Safe Next Step For DEV-01 Part 4

Run `DEV-01 Part 4: purchases and AP route QA` as mixed QA. Start by confirming Postgres/Redis, API `/health`, API `/readiness`, and web `/login` still pass. Use shell HTTP and code review by default; use browser-runtime QA only if the next thread has an allowed local browser method and accepts the small audit-log mutation risk of login.
