# Generated Document Object Adapter Staging Proof Runner Design

Date: 2026-06-19

Scope: runner design plus local-only fail-closed skeleton. This does not execute hosted proof, connect to hosted object storage, connect to a hosted database, mutate hosted/customer data, write/list/delete hosted objects, generate signed URLs, enable object storage, change schema, create Prisma migrations, apply SQL templates, roll out RLS, apply runtime DB roles, or start ZATCA/UAE provider work.

## Purpose

The generated-document object adapter staging proof runner coordinates a future approved staging-only proof for generated-document object storage. It must never run against production and must not be treated as proof execution until real staging credentials, synthetic tenants, a dedicated staging bucket, a real generated-document object adapter, rollback/evidence gates, and owner/security/accounting/legal approvals exist.

The current state remains `NOT_READY`: generated documents are still DB-backed by default, explicit object/S3-compatible generated-document modes fail closed through `DisabledGeneratedDocumentObjectStorageAdapter`, the fake local adapter is local/test-only, real generated-document object storage is not implemented, hosted object storage is not proven, and signed URLs are not implemented or proven.

## Current Baseline

PR #83 added `scripts/generated-document-object-adapter-staging-preflight.cjs`, a local-only preflight helper. It checks approval, environment, credential, bucket, application, data, migration, execution, evidence, and rollback gates. It classifies targets as missing, safe staging, safe local, unsafe production, or ambiguous; requires `proofRunId`, explicit allow flags, distinct synthetic Tenant A/B ids, rollback/evidence confirmations, bucket-policy review, credential-scope review, and no-production-target confirmation; and redacts access key, secret key, and database URL values.

The preflight helper always reports `networkEnabled=false`, `mutationEnabled=false`, `mutationAllowed=false`, `hostedObjectStorageTouched=false`, and `signedUrlsGenerated=false`. A passing preflight means only that local gate inputs are clean for a future approved proof runner. It does not prove storage isolation and does not authorize hosted execution.

This pass adds `scripts/generated-document-object-adapter-staging-runner.cjs` as a local-only runner skeleton. Active modes are limited to `help`, `plan`, `preflight`, and `dry-run`. Hosted proof modes are blocked placeholders.

## Runner Modes

| Mode | Current status | Behavior |
| --- | --- | --- |
| `help` | Active | Prints usage, safety boundaries, required env vars, active modes, and future-gated modes. Does not connect to anything. |
| `plan` | Active | Prints the future execution sequence, required approvals, synthetic data needs, rollback contract, and evidence contract. Does not connect to anything. |
| `preflight` | Active | Delegates to the PR #83 preflight helper. It fails closed when preflight gates are missing or unsafe. It does not connect to hosted services. |
| `dry-run` | Active | Prints what the future runner would do and what it refuses now. It does not connect to storage, mutate, generate signed URLs, touch DB, or enable object storage. |
| `read-only-check` | Future-gated | Blocked placeholder. Future behavior would verify bucket reachability and object-list denial only after all preflight gates and an explicit read-only allow flag. |
| `synthetic-write-plan` | Future-gated | Blocked placeholder. Future behavior would plan proofRunId-scoped synthetic writes only after approval and a real adapter. |
| `synthetic-write-proof` | Future-gated | Blocked placeholder. Future behavior would require all preflight gates, explicit staging mutation allow, synthetic Tenant A/B ids, `proofRunId`, dedicated bucket, rollback plan, evidence capture, and a real object adapter. |
| `cleanup-plan` | Future-gated | Blocked placeholder. Future behavior must be proofRunId-scoped and must refuse broad cleanup. |
| `cleanup-proof` | Future-gated | Blocked placeholder. Future cleanup must verify DB-backed default is restored and proof object writes are proofRunId-scoped. |
| `evidence-summary` | Future-gated | Blocked placeholder. Future evidence must redact secrets and must not include bodies, signed URLs, customer identifiers, or credentials. |

## Required Mode Behavior

`help` prints usage, active modes, future-gated modes, safety boundaries, and required preflight env vars. It explicitly states that no hosted proof is executed.

`plan` prints a future execution sequence: plan, preflight, dry-run, read-only-check after separate approval, synthetic-write-plan after separate approval, synthetic-write-proof after real adapter and mutation approval, proofRunId-scoped cleanup-plan, cleanup-proof after separate approval, and evidence-summary with redacted metadata only.

`preflight` imports the existing preflight helper. Missing or unsafe gates return `PREFLIGHT_FAILED`. A locally clean preflight returns `PREFLIGHT_PASSED_RUNNER_STILL_NOT_READY` because the runner still cannot execute hosted proof in this pass.

`dry-run` returns `networkEnabled=false`, `mutationEnabled=false`, `mutationAllowed=false`, `proofExecuted=false`, `hostedStorageTouched=false`, and `signedUrlsGenerated=false`. It lists the future steps and the actions refused now: bucket reachability probes, object list/read/write/delete, database read/write, signed URL issuance, and cleanup execution.

Future proof modes are blocked with `FUTURE_GATED_NOT_IMPLEMENTED`. They must not become active until a separate approval sprint implements real adapter behavior, credential handling, staging target verification, object operations, rollback, and evidence capture.

## State Machine

The runner state machine is:

1. `NOT_READY`
2. `PREFLIGHT_FAILED`
3. `PREFLIGHT_PASSED`
4. `PLAN_READY`
5. `READ_ONLY_APPROVED`
6. `SYNTHETIC_WRITE_APPROVED`
7. `PROOF_RUNNING`
8. `PROOF_FAILED`
9. `PROOF_CLEANUP_REQUIRED`
10. `PROOF_CLEANED_UP`
11. `PROOF_EVIDENCE_READY`

Current repository state remains `NOT_READY` for proof execution. `plan` and `dry-run` may report `PLAN_READY` only for local planning output. `preflight` may report `PREFLIGHT_PASSED` inside the delegated preflight result when fake staging placeholders are complete, but runner proof execution still remains `NOT_READY`.

## Safety Stops

The runner must stop before any hosted behavior if:

- The target is production-looking or ambiguous.
- Required staging/proof env vars are missing.
- `proofRunId` is missing or invalid.
- Tenant A and Tenant B ids are missing or identical.
- Explicit allow flags are missing.
- Bucket policy or credential scope has not been reviewed.
- Rollback or evidence capture is not confirmed.
- A real generated-document object adapter is not implemented and approved.
- Hosted object storage credentials are required for local tests.
- A command would connect to hosted storage or a hosted database.
- A command would write, list, read, or delete hosted objects.
- A command would generate signed URLs.
- A command would mutate hosted/customer data.
- A command requires schema changes or migrations without explicit approval.
- Runtime default would switch away from database-backed generated documents.

## Evidence Contract

Future evidence must be metadata-only and redacted. Allowed fields include command name, mode, exit code, `proofRunId`, target classification, redacted object-key shape, hash/size verification status, tenant isolation result, cleanup result, and blocker list.

Evidence must not include database URLs, auth headers, cookies, access keys, secret keys, signed URLs, document bodies, `contentBase64`, provider payload bodies, ZATCA bodies, UAE provider payloads, or real customer identifiers.

The local runner skeleton reports `secretsRedacted=true`, `proofExecuted=false`, `hostedStorageTouched=false`, and `signedUrlsGenerated=false`.

## Rollback Contract

Future rollback must be proofRunId-scoped only. Broad cleanup is refused. The database-backed default must remain available and must be verified after cleanup. Object writes, once separately approved in a later sprint, must be scoped to a dedicated staging bucket and proofRunId path. Database content must not be deleted before backup/restore proof and hash-equivalence proof exist.

## Environment and Target Classification

The runner delegates classification to the preflight helper:

- Missing: required inputs are absent.
- Safe staging: explicit staging, proof, sandbox, or test markers are present.
- Safe local: localhost/local values are recognized for dry-run classification only.
- Unsafe production: production, live, customer, real, paid, primary, main, ledgerbyte production-looking, or customer-looking values are refused.
- Ambiguous: values that are neither clearly staging/proof/local nor production-looking do not pass strict preflight.

Secret-like values and database URLs are redacted in JSON output.

## Commands

```bash
node scripts/generated-document-object-adapter-staging-runner.cjs --help
node scripts/generated-document-object-adapter-staging-runner.cjs --mode plan --json
node scripts/generated-document-object-adapter-staging-runner.cjs --mode dry-run --json --strict
node scripts/generated-document-object-adapter-staging-runner.cjs --mode preflight --json
node scripts/generated-document-object-adapter-staging-runner.cjs --mode read-only-check --json
corepack pnpm proof:generated-documents:object-staging-runner-plan
corepack pnpm test:generated-documents:object-staging-runner
```

The `read-only-check` example is a refusal check: it returns a future-gated status and performs no hosted read.

## Explicit Non-Claims

- This runner design does not execute staging proof.
- This runner skeleton does not connect to hosted object storage.
- This runner skeleton does not connect to a hosted database.
- This runner skeleton does not mutate hosted/customer data.
- This runner skeleton does not write, read, list, or delete hosted objects.
- This runner skeleton does not generate signed URLs.
- This runner skeleton does not implement a real generated-document object adapter.
- Generated-document object storage is not enabled.
- Hosted object storage is not proven.
- Signed URLs are not implemented or proven.
- Runtime generated-document storage remains database-backed.
- The disabled adapter remains fail-closed.
- The fake local adapter remains local/test-only.
- No schema or migration changes are included.
- No ZATCA or UAE provider production work is included.

## Remaining Blockers

- Approved staging/proof credentials.
- Dedicated staging bucket.
- Synthetic Tenant A/B ids.
- Staging tenant isolation proof.
- Runtime-role/RLS staging proof or accepted compensating control.
- Real generated-document object adapter implementation.
- Hosted object-storage proof.
- Bucket policy proof.
- Signed URL proof if signed URLs are used.
- Schema/migration approval if future metadata requires it.
- Migration rehearsal and rollback proof.
- Backup/restore proof.
- Retention, legal-hold, malware-scan, and observability evidence.
- Owner/security/accounting/legal sign-off.
- UAE ASP/Peppol provider evidence remains unavailable.
- ZATCA production credentials remain unavailable.
