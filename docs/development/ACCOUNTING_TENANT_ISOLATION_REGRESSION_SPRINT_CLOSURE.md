# Accounting Tenant Isolation Regression Sprint Closure

Date: 2026-06-18

Branch: `feature/accounting-tenant-isolation-regression`

Base: `origin/main` at `9bd65e4e3dceb34a8b38862ce880877e0e9fd8d1`

## Scope

- Added API-level tenant isolation and permission regression coverage for accounting and accounting-adjacent controllers.
- Fixed only the real isolation defect found by the new regression test.
- No Prisma schema change, migration, hosted/customer-data mutation, provider call, ZATCA production work, UAE Peppol/ASP production work, deployment, Supabase command, or Vercel command was performed.
- Generic/KSA/UAE edition source and frontend UI were not redesigned or changed.

## Coverage Added

- `apps/api/src/accounting-tenant-isolation-regression.spec.ts` adds 58 metadata/RBAC regression checks using real controller decorators and real default role constants.
- The new RBAC coverage confirms the default Viewer role has no accounting mutation permissions, mutation routes require non-view permissions, and read routes require view permissions.
- Controller coverage includes sales invoices, purchase bills, customer payments, supplier payments, credit notes, purchase debit notes, bank accounts, bank-account reconciliation, bank reconciliations, compliance readiness, audit logs, attachments, generated documents, and reports.
- `apps/api/src/bank-accounts/bank-account.service.spec.ts` adds a tenant-isolation regression for transaction opening balances so cross-tenant journal lines cannot affect the active organization's bank-account transaction balance.

## Bug Fixed

- `BankAccountService.transactions()` calculated the opening balance with `ledgerBalance(profile.accountId, { lt: from })`.
- That helper filtered by account, posted/reversed status, and date, but did not carry `organizationId` into the `journalLine.findMany` query.
- The fix changes the helper signature to require `organizationId` and includes it in the query. The opening balance for bank-account transactions now stays tenant-scoped.

## Query Pattern Review

- Reviewed tenant filters and permission metadata across high-risk accounting surfaces: invoice and bill source lookups, payment allocation paths, credit/debit note source lookups, bank account/reconciliation queries, reports/dashboard aggregates, generated document and attachment lookups, compliance readiness rows, and audit-log queries.
- Existing safe patterns remain: tenant-scoped `findFirst` for `{ id, organizationId }`, tenant-scoped `findMany`, source-record checks before mutation, update/delete after tenant-scoped reads, and aggregate/report queries including `organizationId`.
- No additional source change was needed beyond the bank-account opening-balance fix.

## Verification

- Passed `corepack pnpm --filter @ledgerbyte/api test`: 142 suites, 1290 tests.
- Passed `corepack pnpm --filter @ledgerbyte/api typecheck`.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- invoices`: 3 suites, 12 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- bills`: 2 suites, 8 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- customer-payments`: 4 suites, 32 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- supplier-payments`: 4 suites, 12 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- dashboard`: 4 suites, 24 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- reports`: 2 suites, 18 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- sidebar`: 1 suite, 6 tests, with the existing non-blocking React `ScrollArea` `act(...)` warning.
- Passed `corepack pnpm --filter @ledgerbyte/web test -- security`: 1 suite, 3 tests.
- Passed `corepack pnpm --filter @ledgerbyte/web typecheck`.
- Passed `corepack pnpm --filter @ledgerbyte/web build`.
- Passed `corepack pnpm verify:diff`; generated `apps/web/next-env.d.ts` build churn was restored afterward because it was outside scope.
- Passed `corepack pnpm verify:ci:local` after commit with the API-scoped plan: `git diff --check`, `corepack pnpm db:generate`, API typecheck, targeted tests for the two changed API specs, and API build. The gate excluded migrations, seed/reset/delete, E2E, smoke, deploys, env changes, ZATCA, email, backup/restore, production URLs, and login flows.

## Remaining Gaps

- This pass does not prove hosted/customer-data behavior, runtime database row-level security, concurrency/race behavior, live provider behavior, live bank feeds, legal/accountant sign-off, or production readiness.
- Provider evidence remains unavailable: no UAE ASP sandbox credentials/docs/provider response/commercial terms and no ZATCA production credentials/response.

## Safety

- Original ZATCA stash remains parked.
- Protected dirty worktree/branch state remains preserved.
- `codex/purchase-bill-seeded-uuid-validation` and other protected codex branches were not changed.
- No screenshots or local artifacts were added.

Recommended next prompt: `Review accounting tenant isolation regression PR`.
