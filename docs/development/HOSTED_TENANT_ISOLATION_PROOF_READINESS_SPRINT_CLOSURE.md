# Hosted Tenant Isolation Proof Readiness Sprint Closure

Date: 2026-06-18

Branch: `feature/hosted-tenant-isolation-proof-readiness`

Base: `origin/main` at `b8fda1f8be96d9f8beeb6688feafdd3d9c377e22`, after PR #68 (`feature/hosted-tenant-isolation-proof-plan`) merged.

## Scope

This pass converts the hosted tenant isolation proof plan into proof-readiness guardrails. It adds a disabled-by-default safety harness shell, targeted safety tests, and status documentation.

No hosted command, Supabase command, Vercel command, production database command, customer-data mutation, schema change, migration, seed, reset, delete, provider call, real bank feed, payment processor integration, real email, ZATCA call, UAE ASP call, or Peppol call was run.

## PR #67 Baseline Preserved

PR #67 remains the local/API tenant-isolation baseline. It added API/controller metadata and RBAC regression checks across invoices, bills, payments, credit notes, debit notes, banking/reconciliation, compliance, audit logs, attachments, generated documents, and reports.

PR #67 also fixed one real tenant-isolation bug: `BankAccountService.transactions()` now passes `organizationId` into `ledgerBalance`, and `ledgerBalance` filters `journalLine.findMany` by organization.

## PR #68 Plan Baseline Preserved

PR #68 already added `docs/security/HOSTED_TENANT_ISOLATION_PROOF_PLAN.md` and `docs/development/HOSTED_TENANT_ISOLATION_PROOF_PLAN_SPRINT_CLOSURE.md`.

This branch updates that plan to record the newly added harness shell and its remaining limitations.

## Harness Added

Added:

- `apps/api/src/hosted-tenant-isolation-proof.ts`
- `apps/api/src/hosted-tenant-isolation-proof.spec.ts`
- `apps/api/scripts/hosted-tenant-isolation-proof.ts`

Updated:

- root `package.json`
- `apps/api/package.json`

The harness is disabled by default and requires `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1` plus a proof-run ID. It defaults to dry-run mode, prints a redacted target classification, refuses production-looking URLs, refuses local mode against hosted targets, refuses destructive/external operation flags, and always reports `networkEnabled: false` and `mutationEnabled: false`.

The harness does not execute hosted checks yet. It is a guardrail for a later staging/dedicated proof environment arc.

## Audit Status

- Important tenant-owned Prisma models use `organizationId` as the application tenant boundary.
- `User` and `Organization` remain global/root identity models.
- No Prisma migration in the repo was found that enables application-table RLS policies.
- App-source raw SQL remains limited to the health check `SELECT 1`.
- Uploaded attachment S3-compatible storage exists behind API-side configuration and uses `org/{organizationId}/attachments/{attachmentId}/...` keys for new S3 uploads.
- Attachment downloads remain API-mediated and tenant-scoped through `AttachmentService.download(organizationId, id)`.
- Generated documents remain database-backed; generated-document object-storage and signed URL proof remain unimplemented.
- Supabase/Data API service-role/default-ACL risk remains a separate deployment/security blocker.

## Verification

Safe local verification run:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @ledgerbyte/api db:generate
corepack pnpm test:tenant-isolation-proof
corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/accounting-tenant-isolation-regression.spec.ts src/bank-accounts/bank-account.service.spec.ts
corepack pnpm --filter @ledgerbyte/api typecheck
corepack pnpm --filter @ledgerbyte/web typecheck
corepack pnpm verify:diff
LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1 corepack pnpm tenant-isolation:proof -- --proof-run-id proof-20260618 --base-url http://localhost:3001
git diff --check
```

Results:

- Harness safety tests: 7 passed.
- PR #67 regression slices: 2 suites passed, 73 tests passed.
- API typecheck passed.
- Web typecheck passed.
- `verify:diff` passed.
- Safe local harness CLI printed a dry-run `ready` classification for `http://localhost:3001/` with `networkEnabled: false` and `mutationEnabled: false`.
- `git diff --check` passed.
- Forbidden-claim scan found only negative assertions and not-implemented/planned/readiness contexts.

The first attempted focused API test command used the package test script argument form and expanded to the broader API suite. It failed before executing the new harness tests because the fresh worktree needed local Prisma client generation. After `db:generate` and the scoped script fix, the requested verification passed.

## Still Blocked

- Hosted/customer-data proof is not complete.
- No staging or dedicated proof environment was exercised.
- No production data was read or mutated.
- Database-enforced RLS remains absent/pending.
- Least-privilege runtime-role proof remains pending.
- Storage object-key, signed URL, generated-document, attachment, archive, and restore tenant-boundary proof remains pending in hosted runtime.
- Concurrency/race proof remains pending.
- Observability evidence, alerting, and proof-run archive format remain pending.
- Accountant/legal/security owner sign-off remains pending.
- Provider evidence remains unavailable: no UAE ASP sandbox docs, Peppol/ASP credentials, provider response, commercial terms, or ZATCA production credentials.

## Recommended Next Arc

Implement staging-only tenant isolation proof execution with synthetic tenants, read-only-first checks, safe auth strategy, no production writes, and sanitized evidence capture.
