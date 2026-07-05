# Tenant Isolation Review

Branch: `codex/tenant-isolation-proof-tests`

Base: updated `origin/main` at merge commit `cd171114` for PR #231.

## Guard and permission model summary

- Cookie/JWT authentication is handled before tenant context by `JwtAuthGuard`.
- Tenant context is accepted only from `x-organization-id` after `OrganizationContextGuard` proves the authenticated user has an `ACTIVE` `OrganizationMember` row for that organization.
- Route authorization is enforced by `PermissionGuard`, which reloads the active membership for the same user and organization before checking route permissions.
- Tenant-scoped controllers use `@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)` and pass `@CurrentOrganizationId()` into services.
- Organization switching/list/detail/update routes are intentionally user-scoped with `JwtAuthGuard` only; the service scopes access by `userId`, active membership, and organization permissions instead of trusting `x-organization-id`.

## Areas tested

- Customers and vendors/suppliers: controller guard and permission contracts, including lists, detail views, statements, statement PDF/export routes, AP dashboard routes, create, and update.
- Invoices and bills: sales invoice and purchase bill controller guard and permission contracts, including list/detail, PDF data, PDF/download generation, create, update, finalize, void, and delete flows.
- Payments: customer and supplier payment controller guard and permission contracts, including list/detail, receipt data, receipt PDF/download generation, unapplied allocation flows, void, and delete flows.
- Journals: journal entry list/count/detail/create/update/post/reverse controller guard and permission contracts.
- Chart of accounts: account list/detail/next-code/create/update/delete controller guard and permission contracts.
- Reports and exports/PDF downloads: reports controller guard and class permission contract, including core report routes, CSV export branches, and PDF export routes.
- Generated document and attachment downloads: controller guard and permission contracts for list/detail/download/upload/update/delete paths.
- Settings: document settings, number sequences, and storage readiness/migration-plan controller guard and permission contracts.
- Dashboard aggregates: dashboard summary and onboarding checklist controller guard and permission contracts.
- Search: service proof that every visible source query and aggregate includes `organizationId`, and that sources without view permission are not queried.
- Organization switching: service proof that list/detail/update are scoped to active membership for the current user and do not expose inaccessible organizations.
- Invitations and organization members: service proof that member listing is organization-scoped, cross-organization member IDs are not updated, and invites cannot use a role from another organization.
- Roles: service proof that role listing is organization-scoped and cross-organization role IDs are not deleted.
- Audit logs: controller guard and permission contracts for list/export/detail/retention paths.
- Auth guard boundary: unit proof that `OrganizationContextGuard` rejects missing auth, missing organization header, and non-member organization headers before setting `request.organizationId`.

## HTTP integration coverage added

The branch now includes `apps/api/src/tenant-isolation-http.integration.spec.ts`, which starts a real Nest HTTP app with the production controllers, `configureApp`, cookie auth, CSRF middleware, `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard`. The test uses two synthetic users and two synthetic organizations represented by deterministic in-memory tenant fixtures behind fake route services. This keeps the suite local and non-destructive while exercising the actual HTTP route, middleware, decorator, and guard layer.

Covered HTTP/API areas:

- Cookie auth and CSRF: login sets auth and CSRF cookies; unsafe requests send the matching CSRF header.
- Organization switching: User A cannot use Organization B as `x-organization-id`; User A cannot read Organization B through `/organizations/:id`.
- Customers and suppliers: User A can list only Organization A records; User A cannot read or update Organization B customer/supplier IDs; search result rows do not include Organization B contact data.
- Invoices: User A cannot read, update, delete, or download Organization B invoice PDFs; User A cannot create an Organization A invoice with Organization B customer/item IDs.
- Bills: User A cannot read, update, delete, or download Organization B bill PDFs; User A cannot create an Organization A bill with Organization B supplier/account IDs.
- Payments: User A cannot read Organization B customer payments; User A cannot create/apply payments against Organization B invoice IDs.
- Journals: User A cannot read, update, or post Organization B journal entries; User A cannot create a journal using Organization B accounts.
- Reports and exports/downloads: trial balance JSON, CSV export, and PDF download responses include only Organization A markers and exclude Organization B markers.
- Generated documents and attachments: User A cannot read/download Organization B generated documents or attachments, and cannot delete Organization B attachments.
- Invitations and members: User A can list only Organization A members; User A cannot manage Organization B members, cannot invite into Organization B by header, and cannot invite with an Organization B role while in Organization A.
- Audit logs: User A can list/export only Organization A audit logs and cannot read Organization B audit log IDs.

Fixture design:

- User A is a member only of Organization A.
- User B is a member only of Organization B.
- Both memberships have full permissions so failures are tenant-boundary failures, not missing-permission failures.
- Tenant data contains separate markers: `TENANT-A-HTTP-PROOF` and `TENANT-B-HTTP-PROOF`.
- Tests assert Organization B markers do not appear in User A responses except where the marker is the user-provided search query itself; result rows are checked separately.
- Mutation counters assert rejected cross-tenant create/invite paths do not write through the fake services.

## Bugs found

- No production tenant-isolation defect was exposed by this local proof pass.
- One local Jest assertion typing issue in the new proof spec was fixed before the targeted test suite passed.
- The HTTP integration pass did not expose a production tenant-isolation defect. Test-helper issues found while building the suite were fixed: the search assertion was narrowed to result rows because the API echoes the query, the fake invitation service was aligned with the real service's not-found semantics for foreign roles, and fixture emails were kept inside valid DTO formats.

## Fixes implemented

- Added `OrganizationContextGuard` unit tests for authenticated tenant-header validation and active-membership enforcement.
- Added a broad tenant-isolation proof spec covering controller guard/permission contracts and focused service scoping for organization switching, search, invitations/members, and roles.
- Added a Nest HTTP integration tenant-isolation spec for high-risk cross-tenant API paths using real controllers, middleware, auth cookies, CSRF, and guards with deterministic synthetic tenant fixtures.
- No accounting logic, auth runtime logic, database schema, migrations, or UI behavior was changed.

## Database changes

- None.

## Accounting logic changes

- None. This branch adds tenant-isolation proof tests and documentation only.

## Remaining untested areas

- Prisma-backed HTTP integration tests against a disposable local test database with real service implementations.
- Full request-level integration tests for every read/write/update/delete route; this pass covers the requested high-risk routes, not every route in the application.
- End-to-end browser proof for organization switching in the web UI.
- Deep service-level two-tenant fixtures for every accounting workflow, including every nested relation and branch/account/item reference.
- Hosted staging proof execution. Existing hosted proof harness remains dry-run/local-safe unless explicitly enabled through approved gates.
- Tenant isolation for modules outside the requested core scope, such as inventory, warehouse transfers, bank statement imports, bank rules, ZATCA/compliance operations, and purchase/sales return workflows.

## Commands run

- `git fetch origin main` - passed.
- `git worktree add -b codex/tenant-isolation-proof-tests E:\Worktrees\Accounting-App\tenant-isolation-proof-tests origin/main` - passed.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/auth/guards/organization-context.guard.spec.ts src/tenant-isolation-proof.spec.ts src/accounting-tenant-isolation-regression.spec.ts src/hosted-tenant-isolation-proof.spec.ts` - passed after fixing the new test assertion shape.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/tenant-isolation-http.integration.spec.ts` - passed. 1 suite / 11 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/tenant-isolation-http.integration.spec.ts src/auth/guards/organization-context.guard.spec.ts src/tenant-isolation-proof.spec.ts src/accounting-tenant-isolation-regression.spec.ts src/hosted-tenant-isolation-proof.spec.ts` - passed. 5 suites / 133 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. API: 166 suites / 1519 tests. Web: 157 suites / 692 tests.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed after removing generated `apps/web/next-env.d.ts` build churn.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret-pattern scan on changed files - no matches.
- `git diff -- apps/web/next-env.d.ts` - no final diff after restoring generated Next.js route-type churn from `corepack pnpm build`.

## Remaining risks

- The HTTP integration spec covers the highest-risk requested routes, but it does not replace full HTTP integration tests for every route/method/status-code combination.
- Service-level tests cover the highest-risk special cases but do not exhaustively seed every model relation.
- Report, dashboard, and search tests prove organization scoping at selected layers; broad fixture-based report correctness remains a separate accounting test lane.
- Hosted production or staging tenant proof was not executed from this worktree.

## Next recommended prompt

`Codex, after this tenant-isolation branch is reviewed and merged, start a fresh clean worktree from updated origin/main and add a disposable local-DB tenant isolation integration lane using real Prisma-backed services and seeded two-organization fixtures for the same high-risk endpoints. Keep it local-only, do not run hosted mutations, do not change accounting logic unless a failing tenant-isolation test proves a real defect, and document covered and uncovered routes.`
