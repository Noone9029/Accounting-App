# Sales/AR Local Walkthrough Execution Preflight

Date: 2026-06-04

Sprint: Controlled Local Sales/AR Accountant Walkthrough Execution Sprint

## 1. Target Environment

Execution target classification: local-only planned target.

Read-only checks found local target configuration:

- `.env` has `DATABASE_URL`, `DIRECT_URL`, and `NEXT_PUBLIC_API_URL` classified as `localhost`.
- `apps/api/.env` has `DATABASE_URL` and `DIRECT_URL` classified as `localhost`.
- `apps/web/.env.local` has `NEXT_PUBLIC_API_URL` classified as `localhost`.

No production, hosted, beta, customer-data, Vercel, Supabase, or remote target was used.

## 2. Local Database Access

Local database access is not currently available for execution.

Read-only port checks:

- Port `5432`: not listening.
- Docker: unavailable in this session.

Because the configured database target is local but the local database service is not reachable, data creation is blocked.

## 3. Safe Local Login Credentials

Safe local login credentials were not available through the inspected local environment keys.

Read-only env-key presence checks found no configured safe-login/demo key values in:

- `.env`
- `apps/api/.env`
- `apps/web/.env.local`

The existing demo workflow script contains default local demo credentials, but using them requires a running local API and is still a seed/mutation path. That path was not executed.

## 4. Seeded Demo Data

Seeded demo data was not verified.

Reasons:

- Local API is not running.
- Local database is not reachable.
- Smoke and seed commands are out of scope unless explicitly approved.
- No read-only database query was run because the database listener was unavailable.

## 5. Disposable Marker Strategy

Marker planned:

`SALES-AR-WALKTHROUGH-20260604`

The marker should be added to any future local-only walkthrough fixture records in notes/descriptions/reference fields where the model supports it.

## 6. Sample Data Creation Safety

Sample data cannot be created safely in this sprint.

The safety gates are not satisfied:

- Local configuration exists, but local database access is unavailable.
- Local API and web app are not running.
- Safe local login was not verified.
- No explicit execute approval phrase exists for mutation.
- Seed/reset/delete is prohibited by this sprint unless explicitly approved.

Execution mode for this sprint: docs-only preflight and marker-based plan.

## 7. PDF Generation

PDF generation was not allowed or performed.

Reasons:

- No local sample data was created.
- Local API/web services are not running.
- The sprint prohibits printing PDF bodies or base64.
- PDF generation would be a walkthrough execution step and remains pending until local gates pass.

## 8. Browser Walkthrough Possibility

Browser walkthrough is blocked in this session.

Read-only port checks:

- Port `3000`: not listening.
- Port `3001`: not listening.
- Port `4000`: not listening.
- Port `4001`: not listening.

The web/API route files exist in the repository, but there is no running app target for browser execution.

## 9. Destructive Cleanup

Destructive cleanup is not allowed.

Default cleanup policy: preserve by default.

No cleanup/delete/reset command was run. No future cleanup should be executed unless a separate approved local-only cleanup plan exists.

## 10. Explicit No-Production Policy

This sprint must not use:

- Production data.
- Hosted/beta/customer data.
- Shared targets.
- Real customer/vendor data.
- Real email.
- Real ZATCA.
- Real payment or payment links.
- Official VAT filing.
- Seed/reset/delete.
- Backup/restore.
- Deployed E2E or hosted smoke.

## 11. Approval Gates Required Before Mutation

Before any future local mutation, all of these gates must pass:

1. Confirm target is local only.
2. Confirm `DATABASE_URL` and `DIRECT_URL` resolve to a local database.
3. Confirm local database listener is reachable.
4. Confirm local API listener is reachable.
5. Confirm safe local login credentials are available.
6. Confirm marker `SALES-AR-WALKTHROUGH-20260604` or a newer timestamped marker.
7. Confirm data is synthetic only.
8. Confirm no seed/reset/delete is needed.
9. Confirm no real email, payment, ZATCA, VAT filing, hosted check, backup/restore, or customer-data workflow will run.
10. Use dry-run first.
11. Require an explicit current-turn execute approval before any write-capable command.

## Preflight Outcome

Local execution is blocked. This sprint proceeds as docs-only with a marker-based local walkthrough data plan, evidence document, route status document, expected-results status document, and findings-log status update.

## Follow-up Bring-up Preflight - 2026-06-04

Follow-up sprint:

`Local Services Bring-up and Sales/AR Walkthrough Dry-run Sprint`

Result: still blocked for runtime execution.

Updated evidence:

- Environment target keys are still classified as local with `localhost` host metadata.
- Docker client is present, but the Docker Desktop Linux engine is unavailable.
- Local Postgres port `5432` is not listening.
- Local Redis port `6379` is not listening.
- Local API ports `4000` and `4001` are not listening.
- Local web ports `3000` and `3001` are not listening.
- `GET http://localhost:4000/health` is unreachable.
- `GET http://localhost:4000/readiness` is unreachable.
- `GET http://localhost:3000` is unreachable.
- Safe local login was not verified.
- No fixture script was added.
- No fixture dry-run was run.
- No sample data was created.

New follow-up docs:

- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_PREFLIGHT.md`
- `docs/development/SALES_AR_WALKTHROUGH_FIXTURE_DRY_RUN_PLAN.md`
- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_DRY_RUN_SPRINT_CLOSURE.md`
