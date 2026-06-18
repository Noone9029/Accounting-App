# Hosted Tenant Isolation Proof Plan Sprint Closure

Date: 2026-06-18

Branch: `feature/hosted-tenant-isolation-proof-plan`

Base: `origin/main` at `0b9de9e9ec9ffa7c7e8f048c75a8efc72516e223`

## Scope

This was a production-readiness planning and audit pass for hosted tenant isolation evidence.

Docs were updated only. No hosted command, Supabase command, Vercel command, production database command, customer-data mutation, schema change, migration, seed, reset, delete, provider call, real bank feed, payment processor integration, real email, ZATCA call, UAE ASP call, or Peppol call was run.

## PR #67 Baseline

PR #67 was already merged into `origin/main`.

PR #67 added:

- API-level tenant isolation and RBAC metadata regression checks across accounting and accounting-adjacent controllers.
- Bank-account service regression coverage for transaction opening balances.
- A real fix in `BankAccountService.transactions()`: `organizationId` is now passed into `ledgerBalance`, and `ledgerBalance` filters `journalLine.findMany` by organization.

This branch records that PR #67 improves local/API confidence only. Hosted/customer-data behavior remains unproven.

## Audit Findings

- Important production-domain Prisma models carry `organizationId` tenant paths and tenant indexes or composite unique constraints.
- Global/root models without `organizationId` are `User` and `Organization`.
- Raw SQL in app source is limited to the health check `SELECT 1`.
- No Prisma migration in the repo enables application-table RLS policies or creates RLS policies.
- Prior deployment docs continue to record public-table RLS/runtime-role work as incomplete.
- Generated document and attachment tables are tenant-scoped in the database model, but hosted object-storage key/signed URL isolation remains unproven.

## Documents Added

- `docs/security/HOSTED_TENANT_ISOLATION_PROOF_PLAN.md`
- `docs/development/HOSTED_TENANT_ISOLATION_PROOF_PLAN_SPRINT_CLOSURE.md`

## Documents Updated

- `CODEX_HANDOFF.md`
- `BUG_AUDIT.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`

## Plan Coverage

The hosted proof plan covers:

- Local, staging, and production environment strategy.
- Two synthetic proof tenants and users.
- Synthetic data rules and proof-run ID labeling.
- Read-only production posture unless later explicitly approved.
- API cross-tenant read/mutation checklist.
- Database RLS/runtime-role review status and strategy choices.
- Storage object key, signed URL, generated-document, attachment, archive, and retention checks.
- Concurrency/race checks for payment, finalization, reconciliation, idempotency, and cross-tenant ID guessing.
- Observability checks for correlation IDs, tenant IDs, audit/security events, and sensitive-data redaction.
- Acceptance criteria before tenant isolation can be treated as production-grade.

## Still Blocked

- Hosted/customer-data proof is still not complete.
- Database-level RLS policy implementation remains absent from the repo.
- Least-privilege runtime-role proof remains incomplete.
- Production writes for tenant proof remain prohibited until separately approved.
- Storage object-key and signed URL tenant checks remain unproven in a hosted environment.
- Backup/restore tenant-boundary proof remains unproven.
- Concurrency/race proof remains unimplemented.
- Provider evidence remains unavailable: no UAE ASP sandbox docs, Peppol/ASP credentials, provider response, commercial terms, or ZATCA production credentials.
- Accountant/legal/security owner sign-off remains pending.

## Safety Confirmation

- No hosted commands were run.
- No hosted/customer data was mutated.
- No schema or migration changes were made.
- No ZATCA production work was added.
- No UAE Peppol/ASP production work was added.
- No provider evidence was available.
- No production compliance claim was added.
- Preserved dirty worktree/branch state was not used for this branch.
- ZATCA stash remained untouched.
- Protected codex branches remained untouched.

## Recommended Next Arc

Implement staging-only hosted tenant isolation proof harness.
