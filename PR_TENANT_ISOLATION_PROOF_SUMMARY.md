# Tenant isolation proof tests for core accounting routes

## Suggested PR title

Tenant isolation proof tests for core accounting routes

## Summary

This PR adds tenant-isolation proof coverage for LedgerByte's core accounting and organization-scoped API surfaces.

It adds:

- `OrganizationContextGuard` tests proving `x-organization-id` is trusted only after authenticated active membership lookup.
- Controller, guard, and permission proof tests for tenant-scoped API surfaces.
- Service-level proof tests for organization switching, members/invites, roles, and global search scoping.
- Nest HTTP integration proof using cookie auth, CSRF, `JwtAuthGuard`, `OrganizationContextGuard`, `PermissionGuard`, production controllers, and two synthetic users/orgs.
- `TENANT_ISOLATION_REVIEW.md` documenting coverage, remaining gaps, commands, and risks.

## What was tested

- Customers and suppliers.
- Invoices and bills.
- Payments.
- Journals.
- Chart of accounts.
- Reports.
- CSV/PDF/export-style routes.
- Generated documents.
- Attachments.
- Organization switching.
- Invitations and members.
- Roles.
- Audit logs.
- Global search.
- Settings and dashboard guard contracts.
- Core tenant guard behavior.

## HTTP integration coverage

The HTTP integration suite starts a real Nest app with production controllers, `configureApp`, cookie auth, CSRF middleware, `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard`.

It uses two deterministic synthetic users and two deterministic synthetic organizations:

- User A belongs only to Organization A.
- User B belongs only to Organization B.
- Both memberships have broad permissions so failures are tenant-boundary failures, not missing-permission failures.
- Tenant markers prove Organization B data does not leak into User A responses.

Covered HTTP paths include contacts, suppliers, invoices, bills, payments, journals, report JSON/CSV/PDF-style responses, generated documents, attachments, organization switching, invitations/members, and audit logs.

## Guard, controller, and service proof coverage

- Guard tests prove missing auth, missing organization header, and inactive/non-member organization headers are rejected before setting request tenant context.
- Controller proof tests verify tenant-scoped controllers use `JwtAuthGuard`, `OrganizationContextGuard`, `PermissionGuard`, and the current-organization decorator path.
- Service proof tests cover organization switching, member/invite scoping, role scoping, and global search organization filters.

## Files changed

- `TENANT_ISOLATION_REVIEW.md`
- `apps/api/src/auth/guards/organization-context.guard.spec.ts`
- `apps/api/src/tenant-isolation-proof.spec.ts`
- `apps/api/src/tenant-isolation-http.integration.spec.ts`
- `PR_TENANT_ISOLATION_PROOF_SUMMARY.md`

## Bugs found

No production tenant-isolation defect was exposed by this pass.

Only test-helper issues were adjusted while creating the proof suite:

- Search assertions check result rows separately because the API echoes the query.
- Fake invitation behavior was aligned with the real service's not-found semantics for foreign roles.
- Synthetic fixture emails were kept inside valid DTO formats.

## Runtime logic impact

No production runtime code was changed.

No accounting logic, Prisma schema, migrations, auth runtime logic, or UI behavior was changed.

This PR is test/documentation focused.

## Commands run

- `git status --short` - passed; only tenant-isolation test/docs files in scope.
- `git branch --show-current` - `codex/tenant-isolation-proof-tests`.
- `git diff --stat` - no tracked diff before staging because files were untracked.
- `git diff -- apps/web/next-env.d.ts` - no final diff after restoring generated Next.js churn from build.
- Broad prompt secret/token scan - matched only safe test identifiers: `password` field with `syntheticPassword` and fake auth `accessToken` property.
- Targeted high-risk secret scan on changed files - no matches.
- Changed-file trailing whitespace scan - no matches.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/tenant-isolation-http.integration.spec.ts src/auth/guards/organization-context.guard.spec.ts src/tenant-isolation-proof.spec.ts src/accounting-tenant-isolation-regression.spec.ts src/hosted-tenant-isolation-proof.spec.ts` - passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/auth/guards/organization-context.guard.spec.ts src/tenant-isolation-proof.spec.ts src/tenant-isolation-http.integration.spec.ts` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.

## Test totals

- Targeted tenant proof set: 5 suites / 133 tests passed.
- Package-scoped tenant proof command: 3 suites / 63 tests passed.
- Full API tests: 166 suites / 1519 tests passed.
- Full web tests: 157 suites / 692 tests passed.
- `packages/zatca-core`: 2 suites / 31 tests passed.

## Remaining untested areas

- Prisma-backed HTTP tests with a disposable local database.
- Exhaustive route/method coverage.
- Browser-level organization switching proof.
- Hosted staging tenant proof execution.
- Modules outside this core scope, such as inventory, bank imports/rules, compliance/ZATCA, and return workflows.

## Reviewer focus areas

Please review:

- Tenant fixture design.
- Guard and permission expectations.
- HTTP integration proof approach.
- Whether any high-risk endpoint family should be added before merge.
- `TENANT_ISOLATION_REVIEW.md` remaining gaps.

## Next recommended follow-up after merge

`Codex, after the tenant-isolation proof PR is merged, start a fresh clean worktree from updated origin/main and add a disposable local-DB tenant isolation integration lane using real Prisma-backed services and seeded two-organization fixtures for the same high-risk endpoints. Keep it local-only, do not run hosted mutations, do not change accounting logic unless a failing tenant-isolation test proves a real defect, and document covered and uncovered routes.`
