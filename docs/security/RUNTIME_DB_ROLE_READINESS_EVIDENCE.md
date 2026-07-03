# Runtime DB Role Readiness Evidence

Status: readiness evidence only, not executed
Date: 2026-07-03

This document records the current runtime-role separation posture for security review. It does not create roles, change passwords, mutate Supabase, update Vercel secrets, connect to a database, or print environment values.

## Current Env Separation Status

Current local evidence remains source/name-presence only:

- `corepack pnpm security:env-separation-check` writes `docs/security/evidence/ENV_SEPARATION_CHECK.md` and JSON.
- The check reports environment variable names by category only.
- It does not read, print, parse, validate, or connect with secret values.
- Latest expected baseline remains `NO_ENV_SEPARATION_WARNINGS` unless regenerated evidence says otherwise.

## Desired Role Model

| Role | Purpose | Desired privileges | Must not do |
| --- | --- | --- | --- |
| runtime API role | Serve Nest API requests through Prisma under app authorization. | Ordinary DML on required application tables, sequence usage, no ownership. | Run migrations, create roles, bypass RLS, access browser contexts, own schema. |
| migration/admin role | Prisma migrations and controlled DBA maintenance. | Schema ownership and migration privileges during an approved window. | Be used by serverless runtime or browser clients. |
| read-only diagnostic role | Future read-only hosted diagnostics and evidence collection. | Read-only metadata/table access after explicit non-production approval. | Write data, bypass tenant restrictions, use service-role powers, inspect production customer content without approval. |

## Direct URL Risks

- `DIRECT_URL` or migration/admin credentials must not be present in browser/web runtime.
- `DIRECT_URL` must not be used by the ordinary API runtime after cutover.
- Any future diagnostic that uses a connection string must redact values and refuse production-looking targets by default.

## Supabase Service Role Risks

- Supabase service-role credentials must never be exposed to browser contexts.
- Service-role usage can bypass RLS and must be limited to reviewed backend/admin paths.
- Data API grants and default privileges must be inspected live before allowing anon/authenticated table access.

## Deployment Env Expectations

- API runtime receives only the least-privilege runtime `DATABASE_URL`.
- Migration jobs receive migration/admin credentials only during controlled windows.
- Read-only diagnostics receive a separate read-only URL only for approved non-production checks.
- Vercel and Supabase secret changes require a separate owner-approved hosted execution goal.

## What Can Be Verified Locally

- Static source diagnostics can inventory tenant keys, parent paths, unique/index review queues, API query scope markers, and dangerous scripts.
- Env-separation diagnostics can confirm variable names are categorized without printing values.
- Unit tests can prove scanners do not import Prisma Client, connect to a DB, use network calls, or leak secret-shaped literals.

## Blocked Until Hosting/Supabase Admin Access

- Runtime role creation.
- Role grant inspection and repair.
- Secret-store cutover.
- Hosted read-only grants/default privilege audit.
- RLS enablement or policy application.
- Data API exposure verification.
- PITR/backup proof against hosted infrastructure.

## Owner Approval Checklist

Before any future runtime-role execution:

- Explicit non-production or maintenance-window target is approved.
- Rollback path is documented without printing credentials.
- Runtime, migration/admin, and read-only roles are named and scoped.
- Production-looking target refusal and redaction checks are in place.
- Cross-tenant denial tests are ready to run after cutover.
- Safe-script audit still reports no review-required items and owner-approval-required dangerous commands remain blocked by default.

## Current Conclusion

LedgerByte has stronger static evidence for future runtime-role separation after `SECURITY-TENANT-ISOLATION-04`, but least-privilege runtime role separation is not active yet. RLS, hosted grants, Supabase Data API posture, and secret-store cutover remain future approved goals.
