# Least-Privilege Runtime Role And RLS Staging Design Sprint Closure

Date: 2026-06-18

Branch: `feature/least-privilege-runtime-role-rls-staging-design`

Base: `origin/main` at `40a6c66d2e09e264f26ce50e0930851328abba94`, after PR #72 merged.

## Scope

This pass designed the next least-privilege runtime database role and RLS staging rollout after PR #72 documented the database RLS and storage isolation decision.

Scope stayed planning, docs, SQL templates, and safe local verification only.

No hosted command, hosted/customer-data mutation, hosted Supabase command, Vercel deploy command, production database command, seed/reset/delete, Prisma schema change, migration, RLS implementation, object-storage mutation, signed URL generation, real customer document access, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, provider integration, real ASP call, Peppol call, ZATCA call, real bank feed, payment processor integration, real email, production compliance claim, or SOC 2/security certification claim was added.

## Protected State

The preserved dirty worktree remains untouched:

```text
E:\Accounting App
feature/edition-split-preserve-current-changes
```

The safety patch remains untouched:

```text
E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\primary-country-edition-repo-hygiene-safety-20260617-192644.patch
```

The ZATCA stash remains preserved:

```text
stash@{0}
```

Protected branches were not modified:

```text
codex/purchase-bill-seeded-uuid-validation
codex/wafeq-banking-reconciliation-audit-polish
```

## PR #72 Baseline

PR #72 documented:

- Database-enforced application-table RLS is absent/pending in repo evidence.
- Current tenant protection is application-enforced through organization membership guards, permission guards, service-level `organizationId` predicates, local regressions, and hosted proof harness planning.
- Recommended direction is hybrid: keep app-level scoping, add a least-privilege non-admin API runtime database role, then design and prove RLS for critical tenant tables in staging.
- Storage proof remains pending.

## Runtime Role Design

Added:

- `docs/security/LEAST_PRIVILEGE_RUNTIME_DB_ROLE_DESIGN.md`

Findings:

- `apps/api/prisma/schema.prisma` uses `DATABASE_URL` and `DIRECT_URL`.
- `PrismaService` configures the API runtime Prisma client from `DATABASE_URL`.
- The repository does not currently prove staging or production separation between API runtime and migration/admin DB roles.
- App-source raw SQL found in this pass remains limited to readiness `SELECT 1`.

Design outcome:

- Keep migrations/admin operations on a separate migration/admin role.
- Use a non-admin API runtime role for ordinary Prisma traffic.
- Grant runtime only connection, schema usage, reviewed table DML, and required sequence privileges.
- Keep schema ownership, DDL, `_prisma_migrations` mutation, superuser behavior, and RLS bypass out of ordinary runtime.
- Prove the role in staging before production.

## RLS Staging Design

Added:

- `docs/security/RLS_STAGING_DESIGN.md`

Findings:

- The schema has no `@@map` table remaps, so table names match quoted Prisma model names.
- Critical tables include `Organization`, `OrganizationMember`, `Role`, sales/AP documents, payments, journal tables, bank tables, document/attachment tables, compliance metadata, and audit logs.
- `User` and `Organization` need membership-derived policy behavior instead of a simple `organizationId` predicate.
- Nullable-organization evidence/token/email tables need special global-vs-tenant policy review.

Design outcome:

- Recommended staging approach uses transaction-scoped `SET LOCAL app.current_organization_id` and `SET LOCAL app.current_user_id` inside a dedicated Prisma transaction helper.
- RLS proof should start on a narrow critical-table set in an isolated staging/proof database.
- Existing application guards and `organizationId` predicates stay in place.
- Staging proof must include cross-tenant reads, mutations, aggregates, reports, attachments, generated documents, background jobs, and rollback rehearsal.

## SQL Templates

Added:

- `docs/security/sql/least_privilege_runtime_role_template.sql`
- `docs/security/sql/rls_staging_policy_template.sql`

Template status:

- Templates only.
- Not Prisma migrations.
- Not auto-run.
- No credentials or database URLs.
- Require placeholder replacement and review before any staging use.
- Include explicit production stop comments and staging rollback sketches.

## Handoff Updates

Updated:

- `CODEX_HANDOFF.md`
- `BUG_AUDIT.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`

The updates state:

- PR #72 documented RLS absent/pending and storage proof pending.
- This pass designs least-privilege runtime DB role and RLS staging rollout.
- No runtime role was applied to hosted DB.
- No RLS policies were applied to hosted DB.
- No schema or migration changes were made.
- No hosted/customer data was mutated.
- No Supabase or Vercel deploy command was run.
- No ZATCA production work was added.
- No UAE Peppol/ASP production work was added.
- Provider evidence remains unavailable.

## Remaining Production Blockers

- Approved staging/proof credentials and synthetic tenant IDs.
- Network-capable read-only probe adapter.
- Explicitly approved staging synthetic proof adapter and cleanup path.
- Least-privilege API runtime database role applied and proved in staging.
- RLS or accepted private-app-only compensating control.
- Storage/signed URL proof.
- Backup/restore proof.
- Concurrency proof.
- Observability evidence.
- Security/accounting/legal owner sign-off.
- UAE ASP/Peppol provider evidence remains unavailable.
- ZATCA production credentials remain unavailable.

## Verification

Verification results should be recorded in the PR after commands run.

Planned safe commands:

- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check`
- Forbidden-claim scan over touched docs/templates.

## Next Recommended Prompt

`Implement staging-only runtime role and RLS proof helper`
