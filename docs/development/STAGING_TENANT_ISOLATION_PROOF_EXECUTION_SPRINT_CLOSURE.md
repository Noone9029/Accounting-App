# Staging Tenant Isolation Proof Execution Sprint Closure

Date: 2026-06-18

Branch: `feature/staging-tenant-isolation-proof-execution`

Base: `origin/main` at `afb32f4ad2e3a9b853ad7a2a1bdcc5f5d3521f14`, after PR #69 (`feature/hosted-tenant-isolation-proof-readiness`) merged.

## Scope

This pass extends the PR #69 hosted tenant isolation proof harness from readiness-only classification to a fail-closed staging execution contract.

No hosted command, Supabase command, Vercel deploy command, production database command, customer-data mutation, schema change, migration, seed, reset, delete, broad cleanup, provider call, real bank feed, payment processor integration, real email, ZATCA call, UAE ASP call, or Peppol call was run.

## PR #69 Baseline Preserved

PR #69 prepared the disabled-by-default harness shell, harness safety tests, package scripts, hosted proof plan update, and readiness handoff/status docs.

This branch preserves the same command surface:

```text
corepack pnpm tenant-isolation:proof
corepack pnpm test:tenant-isolation-proof
```

## Harness Changes

Updated:

- `apps/api/src/hosted-tenant-isolation-proof.ts`
- `apps/api/src/hosted-tenant-isolation-proof.spec.ts`
- `apps/api/scripts/hosted-tenant-isolation-proof.ts`

The harness now supports these modes:

- `dry-run`
- `read-only-plan`
- `staging-read-only-probe`
- `staging-synthetic-proof`
- `production-read-only-posture`

Dry-run classification remains default, non-networked, and non-mutating. It can run without hosted credentials and reports missing execution requirements.

Staging read-only probe classification requires:

- `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1`
- `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1`
- `LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID`
- `LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN`
- `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID`
- `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID`

Staging synthetic proof classification additionally requires:

- `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1`

Synthetic proof data must be labeled as:

```text
LB-TENANT-PROOF:<proofRunId>
```

Cleanup remains proof-run-ID scoped only. Broad cleanup remains prohibited.

The CLI now prints a sanitized human-readable safety summary to stderr and machine-readable JSON to stdout. Auth tokens and secret-like URL values are never printed.

## Execution Status

Actual staging proof was not executed.

Missing requirements:

- No verified staging or dedicated proof URL was present.
- No hosted proof auth token was present.
- No synthetic proof tenant A ID was present.
- No synthetic proof tenant B ID was present.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1` was not present.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1` was not present.

Because those requirements were missing, no read-only probe, staging synthetic execution, hosted mutation, or cleanup was attempted.

## Safety Status

- No production writes occurred.
- No real customer data was touched.
- No hosted/customer data was mutated.
- No Supabase command was run.
- No Vercel deploy command was run.
- No ZATCA production work was added.
- No UAE Peppol/PINT-AE/ASP production work was added.
- No provider integration was added.
- No production compliance claim was added.

Database/RLS status remains unchanged: application-level `organizationId` scoping is the current primary tenant boundary, and database-enforced application-table RLS remains unproven in the repo.

## Remaining Blockers

- Approved staging or dedicated proof target.
- Safe staging auth strategy and credentials.
- Two synthetic proof tenant IDs.
- Read-only probe adapter and evidence archive.
- Explicit approval before staging synthetic mutation.
- Proof-run-ID-scoped synthetic execution and cleanup adapter.
- Database RLS or accepted runtime-role strategy.
- Object-storage, signed URL, generated-document, attachment, archive, backup/restore, and restore/export tenant-boundary proof.
- Concurrency/race proof.
- Observability evidence and alerting for forbidden cross-tenant access.
- Accountant/legal/security owner sign-off.
- Provider evidence remains unavailable: no UAE ASP sandbox docs, Peppol/ASP credentials, provider response, commercial terms, or ZATCA production credentials.

## Verification

Focused verification run during implementation:

```text
corepack pnpm --filter @ledgerbyte/api test -- hosted-tenant-isolation-proof
```

Result:

- Harness safety tests: 12 passed.

Full branch verification is recorded in the final PR/check report.
