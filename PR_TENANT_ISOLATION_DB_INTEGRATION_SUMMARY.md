# Prisma-backed tenant isolation DB integration tests

## Summary

This PR adds an opt-in, local-only Prisma/Postgres tenant-isolation integration lane.

It adds real Prisma-backed synthetic two-tenant fixture coverage for high-risk organization-scoped accounting paths while keeping normal CI non-mutating by default.

## Files changed

- `TENANT_ISOLATION_DB_REVIEW.md`
- `apps/api/src/tenant-isolation-db.integration.spec.ts`
- `PR_TENANT_ISOLATION_DB_INTEGRATION_SUMMARY.md`

## Scope covered

- Organization switching.
- Contacts.
- Invoices.
- Bills.
- Payments.
- Journals.
- Chart of accounts.
- Reports.
- Generated documents.
- Attachments.
- Members and invitations.
- Audit logs.
- Search.

## Runtime impact

No production runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth runtime logic changed.

No UI behavior changed.

## Test behavior

The Prisma-backed DB integration block is opt-in and local-only.

It runs only when:

- `LEDGERBYTE_TENANT_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` points to an allowed local/test Postgres URL

`LEDGERBYTE_TEST_DATABASE_URL` is required when the opt-in flag is enabled; the spec no longer falls back to `DATABASE_URL`.

The normal full test suite skips the Prisma-backed DB block by default. Lightweight URL-gate tests still run without connecting to a database.

## Validation

- `git status --short` - only scoped tenant-isolation DB files changed before PR summary creation.
- `git branch --show-current` - `codex/tenant-isolation-db-integration`.
- `git rev-parse HEAD` - `eb2b82ede81118a91197706bcd4980be01d66b80` before this PR commit.
- `git diff -- apps/web/next-env.d.ts` - generated churn detected after build, then restored; no remaining diff.
- `docker compose -f infra/docker-compose.yml up -d postgres` - local Postgres started.
- Local Postgres health check - healthy.
- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:migrate` with local `postgresql://accounting:accounting@localhost:5432/accounting?schema=public` - passed; no pending migrations.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` with placeholder local URL - passed.
- Default DB spec gate: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/tenant-isolation-db.integration.spec.ts` - passed, 5 URL-gate tests and 9 skipped Prisma-backed DB tests.
- Opt-in DB spec: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/tenant-isolation-db.integration.spec.ts` with local DB env - passed, 14 tests.
- Existing tenant proof tests: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/auth/guards/organization-context.guard.spec.ts apps/api/src/tenant-isolation-proof.spec.ts apps/api/src/tenant-isolation-http.integration.spec.ts` - passed, 63 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 167 passed suites with 9 skipped Prisma-backed DB tests while URL-gate checks ran without a database connection.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - no matches.
- High-risk secret scan - no real secrets; only synthetic local test `passwordHash` fixture fields matched.

## Security and safety

- No hosted mutations were run.
- No hosted migrations were run.
- The DB spec uses synthetic test fixtures.
- Secret scan found no real secrets.
- `apps/web/next-env.d.ts` generated churn was restored.

## Remaining gaps

- Browser E2E organization switching UX.
- Hosted/staging tenant proof.
- Real object-storage tenant isolation beyond DB-backed attachments/docs.
- Inventory, banking, compliance, tax, and advanced document workflows.
- Full dashboard controller response coverage.

## Reviewer focus areas

Please review:

- Local-only DB URL guard.
- Opt-in gating behavior.
- Synthetic fixture cleanup.
- Cross-tenant negative assertions.
- Report/search isolation assertions.
- `TENANT_ISOLATION_DB_REVIEW.md` remaining gaps.
