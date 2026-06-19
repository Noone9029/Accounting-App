# Generated Document Object Adapter Staging Proof Gates

Date: 2026-06-19

Scope: staging-gate design only. This document does not implement a real generated-document object adapter, enable object storage, touch hosted object storage, generate signed URLs, run hosted commands, mutate hosted/customer data, change schema, create migrations, apply SQL templates, roll out RLS, apply runtime DB roles, or start ZATCA/UAE provider work.

2026-06-19 gate approval record update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_GATE_APPROVAL_RECORD.md` records the current approval decision as `BLOCKED`. The required human approval evidence, staging credentials, dedicated bucket, synthetic tenants, rollback/evidence confirmations, bucket-policy review, credential-scope review, and sign-offs are not complete in repo evidence or the current prompt. The gates are not approved, and future proof execution remains `NOT_READY`.

2026-06-19 approval evidence package update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_APPROVAL_EVIDENCE_PACKAGE.md` prepares the future approval request checklist, sign-off template, staging artifact intake checklist, bucket policy review checklist, credential scope review checklist, rollback/evidence checklist, exact future approval phrase, expiry rules, and next human actions. The package does not approve the gates, does not execute proof, does not touch hosted object storage, and does not change `BLOCKED` or `NOT_READY`.

2026-06-19 approval artifact intake update: the current prompt was evaluated and contained placeholders only for required approval artifacts. No complete approver sign-offs, staging target, bucket, synthetic tenants, credential-scope reference, rollback/evidence confirmations, bucket-policy review, credential-scope review, or final sign-off were supplied. Gates remain blocked and not approved; no staging proof was executed.

2026-06-19 complete approval artifact intake update: the follow-up prompt was evaluated for complete approval artifacts. It still supplied placeholders only and no explicit safe approval evidence, so the gates remain `BLOCKED`, not approved, and not ready for hosted proof. No staging proof was executed, no hosted object storage was touched, no hosted/customer data was mutated, no signed URLs were generated, and no real object adapter was implemented.

## Purpose

This document defines the exact gates that must pass before LedgerByte may run any future generated-document object adapter against staging object storage.

The current runtime default remains `DatabaseGeneratedDocumentStorageAdapter`. Explicit object/S3-compatible generated-document modes still fail closed through `DisabledGeneratedDocumentObjectStorageAdapter`. `FakeLocalGeneratedDocumentObjectStorageAdapter` remains local/test-only proof machinery and is not hosted storage.

2026-06-19 preflight helper update: `scripts/generated-document-object-adapter-staging-preflight.cjs` now evaluates these gates locally before any future staging proof runner is allowed to proceed. The helper supports human-readable output, `--help`, `--json`, `--strict`, and `--dry-run`; it classifies environment/target values, requires explicit allow flags, requires distinct synthetic Tenant A/B ids, requires `proofRunId`, checks rollback/evidence/bucket-policy/credential-scope confirmations, and redacts secret-like values. It does not connect to hosted storage or databases, mutate hosted/customer data, write or delete objects, generate signed URLs, enable object storage, switch runtime defaults, or execute staging proof.

2026-06-19 runner design update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md` defines the future proof runner contract, modes, state machine, safety stops, evidence outputs, rollback flow, and execution sequence. `scripts/generated-document-object-adapter-staging-runner.cjs` is a local-only fail-closed skeleton. Only `help`, `plan`, `preflight`, and `dry-run` are active now; hosted read/write/cleanup/evidence modes return future-gated statuses. The runner reports `networkEnabled=false`, `mutationEnabled=false`, `mutationAllowed=false`, `proofExecuted=false`, `hostedStorageTouched=false`, and `signedUrlsGenerated=false`.

Local commands:

```bash
node scripts/generated-document-object-adapter-staging-preflight.cjs --help
node scripts/generated-document-object-adapter-staging-preflight.cjs --json --dry-run
node scripts/generated-document-object-adapter-staging-preflight.cjs --json --strict --dry-run
node scripts/generated-document-object-adapter-staging-runner.cjs --help
node scripts/generated-document-object-adapter-staging-runner.cjs --mode plan --json
node scripts/generated-document-object-adapter-staging-runner.cjs --mode dry-run --json --strict
node scripts/generated-document-object-adapter-staging-runner.cjs --mode read-only-check --json
corepack pnpm proof:generated-documents:object-staging-preflight
corepack pnpm proof:generated-documents:object-staging-runner-plan
```

Example staging-placeholder invocation for local validation only:

```bash
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OWNER_APPROVED=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT=staging \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BASE_URL=https://api.staging.example.test \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET=ledgerbyte-staging-proof \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT=https://objects.staging.example.test \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID=proof-20260619 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ALLOW=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_ALLOW=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OBJECT_STORAGE_ALLOW=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_A_ID=tenant-a-synthetic \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID=tenant-b-synthetic \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ROLLBACK_CONFIRMED=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_EVIDENCE_CAPTURE_CONFIRMED=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_BUCKET_POLICY_REVIEWED=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_CREDENTIAL_SCOPE_REVIEWED=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_NO_PRODUCTION_TARGET_CONFIRMED=1 \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ACCESS_KEY_ID=fake-access-key \
LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_SECRET_ACCESS_KEY=fake-secret-key \
node scripts/generated-document-object-adapter-staging-preflight.cjs --json --strict --dry-run
```

The example uses fake placeholder values only. Real credentials and real bucket names must not be committed or pasted into docs.

## Current Adapter Baseline

Adapters that exist today:

- `GeneratedDocumentStorageAdapter`: generated-document storage boundary.
- `DatabaseGeneratedDocumentStorageAdapter`: active runtime default.
- `DisabledGeneratedDocumentObjectStorageAdapter`: fail-closed object-storage placeholder for explicit object/S3-compatible modes.
- `FakeLocalGeneratedDocumentObjectStorageAdapter`: in-memory local/test-only fake object adapter.

Current runtime behavior:

- Generated documents remain DB-backed with `storageProvider = "database"`, `contentBase64`, `contentHash`, and `sizeBytes`.
- `GeneratedDocumentModule` registers `DatabaseGeneratedDocumentStorageAdapter`.
- `GeneratedDocumentService.download()` resolves metadata by `{ id, organizationId }` and reads content through the adapter boundary.
- Explicit object/S3-compatible modes do not read or write hosted objects.
- Unknown generated-document storage modes fail closed.

Fake-local proof covers:

- In-memory write and readback of synthetic generated-document content.
- Tenant-prefixed and generated-document-id anchored object keys.
- Path traversal rejection.
- SHA-256 hash verification.
- Byte-size verification.
- Missing-object failure.
- Tenant-context mismatch rejection when context is supplied.
- Deterministic duplicate write behavior.
- Refusal of production-looking fake-adapter selection.

Fake-local proof does not cover:

- Hosted object storage.
- Bucket policy.
- Provider credentials.
- Real object adapter behavior.
- Signed URLs.
- Hosted/customer-data behavior.
- Migration/backfill.
- Backup/restore.
- Retention, legal hold, malware scanning, or observability.
- Production storage readiness.

## Approval Gates

All approvals must be explicit and recorded before any staging object-adapter proof can run:

- Product/engineering owner approval for the exact proof scope.
- Security approval for credential, bucket, logging, and evidence handling.
- Storage owner approval for bucket policy, lifecycle, cleanup, and rollback.
- Accounting/legal review if any generated compliance artifacts are included.
- Written statement that production is excluded.
- Written statement that customer data is excluded.
- Written statement that signed URLs are excluded unless a separate signed URL gate is approved.
- Written statement that ZATCA/UAE provider work is excluded.

## Environment Gates

The target must be classified before any network or mutation path is allowed:

- Dedicated staging/proof environment only.
- Dedicated staging/proof bucket only.
- Non-production database only.
- Synthetic tenants only.
- Synthetic generated documents only.
- Valid `proofRunId` required.
- Production-looking URLs rejected.
- Production-looking bucket names rejected.
- Production-looking database URLs rejected.
- Production-looking environment names rejected.
- Local dry-run/read-only planning must pass before any staging mutation-capable proof.

Production-looking examples include names or URLs containing `prod`, `production`, `live`, `customer`, `customers`, or the primary production domain.

## Credential Gates

Credentials must be staging-only and least-privilege:

- Staging-only object-storage credentials.
- No production credentials.
- No long-lived broad admin keys.
- Bucket permissions limited to the dedicated proof bucket and proof prefix.
- Write/read/list/delete permissions reviewed separately.
- Delete permission disabled unless explicitly required for `proofRunId` cleanup.
- Secret redaction proof required before evidence capture.
- Credential rotation/revocation plan required.
- Credentials must not be committed to the repo.
- Validator and docs must report credential presence by key name only, never values.

## Bucket Policy Gates

Bucket policy must be reviewed before proof execution:

- Bucket is private.
- Public listing disabled.
- Public object access disabled.
- Tenant/object prefixes enforced where the provider supports it.
- Direct cross-tenant object access is denied.
- Delete permissions limited or disabled unless explicitly needed for proof cleanup.
- Lifecycle and retention behavior documented.
- CORS reviewed if browser access is ever used.
- Server-side encryption documented if provider supports it.
- Bucket access logging or audit events documented if available.
- Bucket policy proof remains separate from application-level proof.

## Application Gates

Runtime defaults and fail-closed behavior must stay intact:

- Runtime default remains database-backed.
- A real generated-document object adapter can only be selected with explicit staging allow flags.
- `DisabledGeneratedDocumentObjectStorageAdapter` remains fail-closed for unapproved object modes.
- `FakeLocalGeneratedDocumentObjectStorageAdapter` remains local/test-only.
- Object keys are tenant and generated-document-id anchored.
- Path traversal and unsafe slash shapes are rejected.
- Hash and `sizeBytes` are verified.
- Download reads are authorized by tenant/source ownership before content retrieval.
- Request input must use generated-document id, never direct object key.
- No signed URL generation unless a separate signed URL gate is approved.
- No provider, ZATCA, UAE, FTA, Peppol, PINT-AE, ASP, or production compliance claim changes.

## Data Gates

Proof data must stay synthetic and scoped:

- Only synthetic tenants.
- Only synthetic generated documents.
- `proofRunId` labels required in safe metadata, filenames, or proof evidence.
- No customer data.
- No production exports.
- No real customer document access.
- No broad cleanup.
- Cleanup must be `proofRunId` scoped.
- Rollback must restore or confirm DB-backed behavior.

## Migration Gates

No migration is allowed by this gate design:

- No schema change unless separately approved.
- No Prisma migration unless separately approved.
- If metadata fields are needed, stop and request schema/migration approval.
- Dual-write strategy must be documented before any migration rehearsal.
- Rollback strategy must be documented before any migration rehearsal.
- Restore rehearsal must be planned before production.
- DB `contentBase64` fallback must remain available through proof and rollback.

## Execution Gates

Execution must be fail-closed and ordered:

1. Local dry-run first.
2. Local validator strict dry-run first.
3. Read-only validation first if applicable.
4. Strict target classification before mutation.
5. Explicit staging allow flags.
6. Valid `proofRunId`.
7. Clear target bucket.
8. Clear synthetic Tenant A/B ids.
9. Network calls disabled unless all staging gates pass.
10. Structured output.
11. Exit codes documented.
12. No hosted commands unless all approvals, staging credentials, target classification, and proof inputs are present.

The current `scripts/object-storage-proof-validate.cjs` remains local/dry-run only. It must not connect to hosted services, require credentials, mutate object storage, or imply staging proof was executed.

The preflight helper is also local/dry-run only. Missing gates produce `stagingProofReady=false`; strict mode exits non-zero for missing or unsafe gates. When every local preflight input is satisfied, `executionAllowed=true` only means the preflight gate is clean for a separately approved future proof runner. `mutationAllowed=false`, `networkEnabled=false`, and `mutationEnabled=false` remain true for this helper in all cases.

The runner skeleton is also local-only. `plan` and `dry-run` never connect to hosted services. `preflight` delegates to the helper and can report `PREFLIGHT_PASSED_RUNNER_STILL_NOT_READY` when fake staging placeholders satisfy local gates, but runner proof execution remains blocked. `read-only-check`, `synthetic-write-plan`, `synthetic-write-proof`, `cleanup-plan`, `cleanup-proof`, and `evidence-summary` are future-gated placeholders in this pass.

## Evidence Gates

Evidence must be sanitized and complete:

- Commands captured.
- `proofRunId` captured.
- Target classification captured.
- Object keys captured only in redacted or safe prefix form.
- Hash verification captured.
- `sizeBytes` verification captured.
- Tenant A/B isolation result captured.
- Cleanup result captured.
- Rollback/default-restoration result captured.
- Logs redacted.
- No secret output.
- No document body output.
- Evidence archived in docs or proof artifacts.

Evidence must not include database URLs, auth headers, cookies, access keys, secret keys, signed URLs, document bodies, `contentBase64`, provider payload bodies, ZATCA bodies, UAE provider payloads, or customer identifiers.

## Rollback Gates

Rollback must be available before write-capable proof:

- Object writes are `proofRunId` scoped.
- Cleanup command is `proofRunId` scoped.
- DB-backed default restored or confirmed.
- Disabled object adapter restored or confirmed for unapproved modes.
- Fake local adapter remains local/test-only.
- Bucket state checked after cleanup.
- Failure state documented.
- Manual rollback instructions included.
- Hash mismatch blocks cutover.
- Object read failure returns to DB-backed behavior during proof.
- No database content deletion before backup/restore proof and approval.

## Required Future Inputs

A future staging proof cannot start without:

- Owner/security/storage approvals.
- Dedicated staging/proof environment.
- Dedicated staging/proof bucket.
- Staging-only least-privilege credentials.
- Synthetic Tenant A id.
- Synthetic Tenant B id.
- Valid `proofRunId`.
- Explicit staging allow flags.
- Bucket policy review.
- Rollback/cleanup plan.
- Secret-redaction proof.
- Evidence capture plan.

## Acceptance Criteria

A future staging generated-document object-adapter proof cannot start unless every required gate in this document is satisfied.

A production generated-document object-adapter rollout remains blocked until all of the following are complete:

- Staging generated-document object-adapter proof.
- Hosted object-storage proof.
- Bucket policy proof.
- Backup/restore proof.
- Generated-document migration rehearsal.
- Retention/legal-hold/malware-scan evidence.
- Observability evidence.
- Owner/security/storage/accounting/legal sign-off.
- Signed URL proof if signed URLs are used.
- Explicit schema/migration approval if future metadata is required.

## Explicit Non-Claims

- Real generated-document object storage is not implemented.
- Generated-document object storage is not enabled.
- Staging generated-document object adapter proof has not been executed.
- Hosted object storage is not touched or proven by this gate design.
- Runner design and runner dry-run output do not prove hosted object storage.
- Bucket policy is not proven by this gate design.
- Signed URLs are not implemented or proven.
- Backup/restore is not proven.
- Retention, legal hold, malware scanning, and permanent archive guarantees are not proven.
- Database RLS is not enabled by this gate design.
- Least-privilege runtime DB role is not applied by this gate design.
- No ZATCA production work or UAE Peppol/PINT-AE/ASP provider work is included.
