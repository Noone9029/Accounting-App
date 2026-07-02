# Least-Privilege Runtime DB Role Plan

Status: plan only, not executed
Date: 2026-07-02

This document defines the role separation LedgerByte should use before paid beta or ASP-connected workflows. It does not create a role or mutate Supabase.

## Role Model

| Role class | Purpose | Allowed use | Must not do |
| --- | --- | --- | --- |
| migration/admin | Run Prisma migrations, ownership repair, controlled DBA tasks. | Manual or CI migration window only. | Be used by serverless runtime or browser clients. |
| API runtime | Serve LedgerByte API traffic through Prisma. | Ordinary app reads/writes under app authorization. | Own schema, run migrations, manage roles, bypass RLS, access provider secrets outside app paths. |
| read-only/reporting | Optional future analytics/read replica role. | Read-only diagnostics or reporting. | Write app records or see cross-tenant data without explicit review. |
| browser roles | Supabase `anon`/`authenticated` if Data API is ever used. | Prefer no direct LedgerByte app-table access. | Bypass LedgerByte API authorization. |

## Runtime Role Acceptance Criteria

- No superuser-like flags.
- `USAGE` on required schemas only.
- DML only on app tables required by Prisma runtime.
- No ownership of `_prisma_migrations`.
- No permission to create roles/databases/extensions.
- No direct grants to browser roles for app tables unless RLS policy is reviewed.
- Rotation procedure tested without printing credentials.

## Cutover Sequence

1. Generate runtime password in a secure secret path; never print it.
2. Create runtime role and grants in a reviewed maintenance window.
3. Update only API `DATABASE_URL` secret; keep `DIRECT_URL` on migration/admin credential.
4. Redeploy API preview.
5. Run readiness, smoke tests, tenant-isolation proof, reports smoke, and compliance disabled/no-network checks.
6. If validation fails, restore previous API database secret from secret store without printing it.

## Current Non-Execution Evidence

- This PR adds only docs and read-only diagnostics.
- No `prisma migrate deploy`, `supabase db`, SQL role creation, or Vercel env mutation is part of this goal.
- `SECURITY-EXECUTION-01` adds `security:env-separation-check`, which reports only whether runtime, migration/admin, read-only, Supabase, Vercel, SMTP, provider, ZATCA/ASP, and auth credential variable names are present. It never prints values and does not validate or connect using connection strings.
- Current local evidence is `docs/security/evidence/ENV_SEPARATION_CHECK.md`. Runtime, migration/admin, and hosted credential separation still requires a reviewed hosted execution window before any secret-store change.

## SECURITY-HARDENING-02 Safe-Script Review

`SECURITY-HARDENING-02` did not create or modify any database role. It sharpened the safe-script diagnostic evidence so migration/seed commands remain visible as review-required:

- `db:migrate`
- `db:seed`
- `demo:seed-workflows`

These commands still require explicit owner approval and a controlled execution window before any hosted use.
