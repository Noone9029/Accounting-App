# Tenant Isolation DB Review

## Scope

This lane adds an opt-in Prisma-backed tenant-isolation integration test using a disposable local Postgres database. It starts from merged `origin/main` after PR #232 and complements the existing guard, controller, service, and in-memory HTTP proof tests.

No production runtime code, accounting logic, Prisma schema, or migration files are intentionally changed in this lane.

## Local-only execution gate

The new DB spec is skipped by default in normal Jest runs.

To run it, the caller must set:

- `LEDGERBYTE_TENANT_DB_INTEGRATION` to `1`.
- `LEDGERBYTE_TEST_DATABASE_URL` to a disposable local Postgres URL.

The spec refuses non-local database hosts and refuses database names that look production-oriented. This is intended to prevent accidental hosted mutations.

## Areas tested

- Organization switching and `OrganizationContextGuard` membership enforcement.
- Organization list and detail access for a user with membership in only one tenant.
- Customers and suppliers list/read/update boundaries.
- Global search boundaries across contacts and transaction-backed results.
- Sales invoice read, create, update, delete, and PDF-data boundaries.
- Purchase bill read, create, update, delete, and PDF-data boundaries.
- Customer payment cross-tenant unapplied allocation boundaries.
- Supplier payment cross-tenant unapplied allocation boundaries.
- Journal read, create, update, and post boundaries.
- Chart of accounts list/read/create-with-parent boundaries.
- Profit and loss and trial balance report aggregate boundaries.
- Generated document list/read/download boundaries.
- Attachment list/read/download/delete boundaries.
- Organization member list/read/status-update boundaries.
- Invitation role-boundary checks.
- Audit log list/read/export boundaries.

## Guard and permission model summary

Tenant-scoped API requests use the authenticated user plus `x-organization-id`. `OrganizationContextGuard` only sets `request.organizationId` after finding an active membership for that user and organization. Controller metadata proof tests from PR #232 verify tenant routes also include JWT and permission guards. This DB lane verifies that representative service/database paths do not cross tenant IDs even when given foreign record IDs.

## Bugs found

No production tenant-isolation defect was found during this lane.

The first opt-in DB spec run exposed two test expectation issues:

- The search response correctly returned zero results but echoed the submitted query, so the assertion now checks only `search.results`.
- Supplier payment unapplied allocation rejects a foreign bill with the service's existing `BadRequestException`; the assertion now verifies that rejection and no mutation.

## Fixes implemented

Implemented a gated Prisma-backed tenant-isolation integration spec:

- `apps/api/src/tenant-isolation-db.integration.spec.ts`

No runtime service/controller/guard code was changed. No accounting logic was changed.

## Remaining untested areas

- Browser end-to-end organization switching UX.
- Hosted environment behavior.
- Real object-storage providers beyond database-backed generated document and attachment records.
- Every inventory, banking, compliance, tax, and advanced document workflow.
- Full dashboard controller response path beyond report aggregate coverage.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` with placeholder local env - passed.
- `docker compose -f infra/docker-compose.yml up -d postgres` - local Postgres started.
- `corepack pnpm --filter @ledgerbyte/api db:migrate` against local Postgres - passed, no pending migrations.
- Default DB spec gate: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/tenant-isolation-db.integration.spec.ts` - passed as skipped by default.
- Opt-in DB spec gate with local test DB env - passed, 9 tests.
- Existing tenant proof tests: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/auth/guards/organization-context.guard.spec.ts apps/api/src/tenant-isolation-proof.spec.ts apps/api/src/tenant-isolation-http.integration.spec.ts` - passed, 63 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; DB spec skipped by default.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed; generated `apps/web/next-env.d.ts` churn was restored afterward.
- `git diff --check` - passed.
- `git diff -- apps/web/next-env.d.ts` - no remaining diff after restore.
- Changed-file trailing whitespace scan - no matches.
- High-risk secret scan - no real secrets; only synthetic local test `passwordHash` fixture fields matched.

## Remaining risks

- The DB lane depends on local migrations being applied to the disposable local database before execution.
- The spec samples representative critical tenant boundaries rather than exhaustively enumerating every route in the app.
- Normal test runs skip the DB lane by design, so CI coverage requires an explicit local/test DB job if desired.
- `apps/web/next-env.d.ts` is generated by Next.js build and was restored because its diff was not an intentional source change.

## Next recommended prompt

After this lane is reviewed, start the next tenant-isolation implementation lane from a fresh clean worktree based on updated `origin/main`, focused on one remaining uncovered domain with failing tests first.
