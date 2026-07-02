# Database Security Hardening Plan

Status: pre-ASP foundation draft
Date: 2026-07-02

This plan improves database-security readiness without enabling RLS, creating roles, changing Prisma schema, running migrations, or mutating Supabase.

## Current Evidence

- Prisma uses PostgreSQL with `DATABASE_URL` and `DIRECT_URL`.
- Application tenancy is enforced through authenticated organization context and permission checks.
- `corepack pnpm pre-asp:diagnostics` parsed `apps/api/prisma/schema.prisma` without opening a database connection.
- Diagnostic result: 112 models total, 109 direct `organizationId` tenant-scoped models, 2 identity/tenant roots (`User`, `Organization`), and 1 global configuration model (`OnboardingTemplateVersion`).
- Existing docs already separate current app-enforced tenancy from future database-enforced RLS.

## Target State Before ASP Access

1. Runtime API uses a least-privilege database role.
2. Migration/admin credentials are separate from runtime credentials.
3. Tenant scope catalog is reviewed before any schema expansion.
4. RLS/Data API posture is explicit and phased.
5. Hosted grants/default privileges are audited before relying on Supabase Data API exposure behavior.
6. Cross-tenant negative tests cover high-risk data families: users/memberships, ledger, AR/AP, banking, inventory, documents, compliance, and audit logs.

## Hard Boundaries

- No RLS enablement in this PR.
- No role/password creation.
- No Vercel or Supabase secret mutation.
- No migration or destructive SQL.
- No schema changes.
- No production hosting decision.

## Safe Checks Added

`scripts/pre-asp-readiness-diagnostics.cjs` provides:

- Prisma model tenant-scope catalog.
- Secret environment variable presence by name only.
- `noDatabaseConnection`, `noNetwork`, and `noMutation` assertions in output.

Use:

```powershell
corepack pnpm pre-asp:diagnostics
corepack pnpm test:pre-asp-diagnostics
```

## SECURITY-EXECUTION-01 Read-Only Evidence

`SECURITY-EXECUTION-01` adds deeper read-only diagnostics without enabling RLS, changing roles, changing Prisma schema, running migrations, or mutating hosted state:

- `corepack pnpm security:tenant-scope-audit` writes `docs/security/evidence/TENANT_SCOPE_AUDIT.md` and JSON evidence. Current result: 112 Prisma models cataloged, 109 direct tenant-scoped models, 3 indirect tenant-scoped models, 0 risky unclassified models, and 55 unique constraints flagged for review because they do not themselves include tenant scope.
- `corepack pnpm security:api-route-tenancy-audit` writes `docs/security/evidence/API_TENANCY_AUDIT.md` and JSON evidence. Current result: 144 controller/service files scanned, 126 tenant-guarded files, 8 review-needed files, and explicit webhook/provider review items.
- `corepack pnpm security:env-separation-check` writes `docs/security/evidence/ENV_SEPARATION_CHECK.md` and JSON evidence. It reports environment variable presence by name only and never prints, parses, or validates secret values.
- `corepack pnpm security:safe-script-audit` writes `docs/security/evidence/SAFE_SCRIPT_AUDIT.md` and JSON evidence. It inventories seed/reset/delete/deploy/migrate/provider/compliance-capable scripts without executing them.

These checks produce security-review evidence only. They do not prove hosted RLS, runtime role cutover, Data API grants, or production tenant isolation.

## Review Checklist

Before hosted mutation:

- Confirm runtime role has no `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, or `BYPASSRLS`.
- Confirm runtime role can perform ordinary app DML only on app tables.
- Confirm migration role owns migration execution and is not used by serverless runtime.
- Confirm `DIRECT_URL` is never used by browser/web runtime.
- Confirm Data API exposed schemas, grants, and default privileges are explicit.
- Confirm existing and future public tables are either not exposed to anon/authenticated roles or protected by RLS policies.
- Confirm views use safe access semantics or are not exposed to browser roles.

## Remaining Blockers

- Hosted read-only grants/default-privilege inspection.
- Runtime-role creation and secret-store cutover.
- RLS pilot policy design and staging validation.
- Cross-tenant denial verification against hosted data.

## SECURITY-HARDENING-02 Diagnostic Review Baseline

`SECURITY-HARDENING-02` resolves the PR #222 diagnostic review queue without hosted or database mutation:

- API tenancy audit now reports `NO_RISKY_ROUTES_DETECTED` after exact source reviews of the 8 prior review-required service files.
- Safe-script audit now reports 10 review-required entries, reduced from 32 by clearing only exact reviewed local/read-only/guarded entries.
- Remaining safe-script review items are intentionally retained for migration, seed, API smoke, and ZATCA validation/debug commands.
- Evidence: `docs/security/evidence/API_TENANCY_REVIEW_02.md` and `docs/security/evidence/SAFE_SCRIPT_REVIEW_02.md`.

This remains diagnostic evidence only. It does not create runtime roles, enable RLS, run migrations, mutate Supabase/Vercel, call providers, or prove hosted tenant isolation.
