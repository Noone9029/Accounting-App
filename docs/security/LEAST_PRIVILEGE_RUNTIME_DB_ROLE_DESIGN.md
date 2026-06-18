# Least-Privilege Runtime Database Role Design

Date: 2026-06-18

Scope: local planning and documentation only. This document does not create a database role, apply grants, apply RLS, change Prisma schema, add a migration, run Supabase commands, run Vercel commands, connect to hosted databases, or mutate hosted/customer data.

## Current State

LedgerByte currently uses Prisma with a PostgreSQL datasource defined in `apps/api/prisma/schema.prisma`:

- `DATABASE_URL` is the runtime datasource URL.
- `DIRECT_URL` is present for direct Prisma connectivity.
- `PrismaService` builds the API client from `DATABASE_URL` and may adjust Supabase pooler connection settings at runtime.
- Prisma migrations are exposed through `corepack pnpm --filter @ledgerbyte/api db:migrate`, which maps to `prisma migrate deploy`.

The repository does not currently prove that API runtime and migration/admin database roles are separated in staging or production. Existing docs describe a prior user-testing least-privilege role design, but this pass did not verify a live role, hosted secret, or deployment. Treat the runtime/admin split as pending until staging evidence proves it.

Current tenant isolation remains application-enforced:

- `JwtAuthGuard` authenticates the user.
- `OrganizationContextGuard` requires `x-organization-id` and verifies an active `OrganizationMember` for the authenticated user.
- `PermissionGuard` reloads the active membership role permissions for the request organization.
- Services generally pass `organizationId` into Prisma reads, mutations, aggregates, and relation validation.

Database-enforced application-table RLS remains absent/pending in repo evidence. A focused scan found no application migration that creates table policies or enables row-level security for LedgerByte application tables. App-source raw SQL remains limited to the readiness `SELECT 1`.

## Target Role Model

LedgerByte should separate database privileges before paid production:

| Role | Purpose | Target restrictions |
| --- | --- | --- |
| Migration/admin role | Approved schema migrations and controlled database maintenance. | May own schema objects and run DDL only through approved deployment workflows. Not used by ordinary API runtime. |
| API runtime role | Ordinary Nest API Prisma traffic. | `LOGIN`, no schema ownership, no DDL, no broad table ownership, no superuser, no replication, no create role/database, no RLS bypass, no unrestricted service-role behavior. |
| Optional read-only/report role | Future reporting/export or support diagnostics if needed. | Read-only, tenant-scoped, no document body or attachment body access unless explicitly reviewed, audited, and tested. |

The API runtime role is not a replacement for application guards. It reduces blast radius if a runtime credential is leaked or a query path is wrong.

## Runtime Role Privileges

The API runtime role should be granted only the privileges needed by the running application:

- Connect to the application database.
- Use the relevant application schema, currently `public` unless a later schema split is approved.
- `SELECT`, `INSERT`, and `UPDATE` only on application tables required by the API.
- `DELETE` only for tables with explicitly approved hard-delete behavior. Where the product uses status flags or soft-delete style records, runtime hard delete should remain denied.
- `USAGE` and sequence access where Prisma-created inserts require sequence privileges.
- No `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, or schema ownership.
- No Prisma migration privileges in normal runtime.
- No access to `_prisma_migrations` except what is explicitly needed for health/diagnostics, preferably none for ordinary runtime.
- No RLS bypass.
- No service-role, owner, superuser, or platform-admin behavior.

Grant reviews should be table-by-table. The initial staging plan can begin with broad application-table DML for compatibility, then tighten deletes and sensitive evidence/document tables after API coverage proves which paths are needed.

## Prisma And Runtime Implications

Prisma runtime should use the API runtime role through `DATABASE_URL`.

Prisma migrations should use the migration/admin role through `DIRECT_URL` or a deployment-only secret. Production and staging must not run ordinary API traffic with the migration/admin credential.

Recommended environment split:

| Environment | `DATABASE_URL` | `DIRECT_URL` |
| --- | --- | --- |
| Local development | Developer-friendly local role is acceptable. Optionally test with a local runtime-role clone. | Local admin or migration-capable URL. |
| CI | Test role with enough privileges for disposable test DB setup. | CI migration role only for schema setup. |
| Staging/proof | Least-privilege API runtime role. | Staging migration/admin role, used only by migration workflow. |
| Production | Least-privilege API runtime role after staging proof. | Production migration/admin role, used only after explicit release approval. |

Prisma caveats:

- `findUnique` by global `id` can bypass tenant predicates unless the app does a prior tenant-scoped lookup or uses compound unique keys.
- Background jobs, email workers, provider callbacks, report jobs, and future bank/payment integrations must carry explicit tenant context.
- Runtime role changes can expose missing grants only under realistic API workflows, so staging smoke tests and tenant isolation regressions must run before production use.
- Connection pooling changes in `PrismaService` must be preserved unless a later review replaces them.

## Deployment Strategy

This pass stays local/design-only.

Recommended rollout:

1. Produce a dry-run grant inventory from the schema and existing API surfaces.
2. Create the runtime role only in an isolated staging/proof database after explicit approval.
3. Configure staging API `DATABASE_URL` to use the runtime role without printing secrets.
4. Keep `DIRECT_URL` or the migration secret on a migration/admin role.
5. Run migrations only through the admin path.
6. Run API typecheck, tenant isolation regression, hosted/staging proof harness, and smoke tests.
7. Prove the runtime role cannot run DDL, cannot mutate `_prisma_migrations`, and cannot bypass future RLS policies.
8. Archive sanitized proof output.
9. Repeat only after owner approval for production.

## Safety Gates

Any future role script must fail closed:

- Refuse production-looking DB URLs unless the mode is explicitly production-approved and read-only where applicable.
- Require explicit `--apply` or equivalent for any grant changes.
- Require an explicit environment classification such as `staging`, `proof`, or `local`.
- Print a plan/dry-run output before applying.
- Redact credentials and connection strings.
- Avoid hosted/customer data inspection.
- Avoid schema changes unless the prompt explicitly approves them.
- Avoid writing generated passwords to logs.
- Keep rollback instructions scoped to the same staging/proof environment.

## Acceptance Criteria

The runtime role is not production-ready until staging proves:

- API traffic works with the least-privilege runtime role.
- Prisma migrations use only the migration/admin role.
- Runtime cannot perform DDL.
- Runtime cannot own or alter application schema objects.
- Runtime cannot mutate `_prisma_migrations`.
- Runtime cannot bypass future RLS policies.
- Runtime cannot access cross-tenant rows once RLS is staged for critical tables.
- Background jobs and report paths use explicit tenant context.
- Tests and sanitized proof output are archived.
- Security/accounting/legal owners accept the final posture.

## Current Pass Outcome

This pass produced the design only. No runtime role is active because of this document, no hosted secret changed, no SQL template was applied, and no production database was touched.
