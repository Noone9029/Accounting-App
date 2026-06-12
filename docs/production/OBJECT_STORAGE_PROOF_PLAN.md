# Object Storage Proof Plan

Date: 2026-06-12

Scope: safe non-production validation only. This plan adds local/mock validation and S3-compatible configuration-name checks without touching production infrastructure, real customer files, real buckets, real object uploads/downloads/deletes, backups, restores, or provider secrets.

## Current Storage Posture

- Uploaded attachments are database-backed by default. `apps/api/src/attachments/attachment-storage.service.ts` includes S3-compatible groundwork for new uploads only when attachment S3 configuration is complete.
- Generated documents remain database-backed in `apps/api/src/generated-documents/generated-document.service.ts`. Generated-document S3 writes are not implemented in the current runtime path.
- `apps/api/src/storage/storage-provider.ts`, `apps/api/src/storage/storage.service.ts`, and `/storage/readiness` plus `/storage/migration-plan` already provide a small storage abstraction and safe readiness/dry-run migration surfaces.

## What This PR Proves

- `scripts/object-storage-proof-validate.cjs` provides a safe proof harness with no-network guards enabled in every mode.
- Default dry-run validation returns `OBJECT_STORAGE_PROOF_DRY_RUN_READY` without writing files or reading secret values.
- Local mock-cycle validation returns `OBJECT_STORAGE_MOCK_CYCLE_PASSED` by:
  - using only a temporary local directory,
  - writing synthetic non-customer attachment and generated-document payloads,
  - validating tenant-scoped attachment and generated-document object-key policies,
  - validating content-type handling and sample size-limit handling,
  - reading the synthetic payloads back,
  - verifying checksums and exact content,
  - deleting the local mock objects, and
  - removing the temporary directory.
- S3-compatible dry-run validation checks required configuration key names only and can return:
  - `OBJECT_STORAGE_S3_CONFIG_VALIDATED_NO_NETWORK` when the required key names are present, or
  - `OBJECT_STORAGE_PROOF_BLOCKED_MISSING_CONFIG` when required key names are missing.
- Output is secret-safe: configuration is reported as booleans and missing key names only, not values.

## What This PR Does Not Prove

- No real object-storage provider connectivity.
- No real bucket creation, upload, download, delete, lifecycle change, retention change, legal hold change, or versioning change.
- No generated-document runtime S3 write path.
- No signed URL implementation.
- No malware scanning.
- No object-storage backup proof.
- No object-storage restore proof.
- No production readiness or paid SaaS readiness.

## Mock/Local Proof Results

- `corepack pnpm storage:proof-validate -- --json --strict --dry-run`
  - Result: `OBJECT_STORAGE_PROOF_DRY_RUN_READY`
- `corepack pnpm storage:proof-validate -- --json --strict --mock-cycle --provider local`
  - Result: `OBJECT_STORAGE_MOCK_CYCLE_PASSED`

Observed local/mock proof properties:

- Attachment sample key: `org/00000000-0000-0000-0000-000000000001/attachments/attachment-proof/Quarterly-Attachment-proof-.txt`
- Generated-document sample key: `org/00000000-0000-0000-0000-000000000001/generated-documents/sales-invoice/sales-invoice-proof/sales_invoice/Sales-Invoice-1001-proof-.pdf`
- Domains are distinct and tenant-scoped.
- Temporary local directory cleanup completed successfully after the mock cycle.

## S3-Compatible Config Validation Boundary

- This PR validates only the presence of these key names:
  - `S3_ENDPOINT`
  - `S3_REGION`
  - `S3_BUCKET`
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
- No provider connection is attempted.
- No secret values are returned.
- No object lifecycle is exercised.
- Current local default state in this repository remains configuration-incomplete for S3-compatible validation, so real non-production bucket proof is still outstanding.

## Generated-Document Storage Status

- Runtime status today: database-backed only.
- This PR proves generated-document object-key policy in the local/mock harness only.
- This PR does not implement generated-document S3 writes, generated-document signed URLs, or generated-document migration execution.

## Attachment Storage Status

- Runtime status today: database-backed by default with S3-compatible groundwork for new uploads only.
- This PR proves attachment object-key policy plus local/mock upload-read-delete lifecycle behavior.
- This PR does not validate a real S3-compatible attachment bucket.

## Signed URL Status

- Not proven.
- The current runtime storage groundwork does not implement signed URL generation for the proof harness to validate.

## Lifecycle, Retention, And Legal Hold Status

- Not proven.
- This PR does not implement or validate lifecycle rules, retention enforcement, legal hold behavior, object versioning, or immutable archive controls.

## Restore Proof Status

- Still blocked.
- `scripts/backup-restore-proof-harness.cjs` now proves synthetic manifest/payload/restore-simulation mechanics only. It does not prove object-storage restore behavior.
- This PR does not execute or prove object-storage restore behavior.
- Hosted database restore drills and object-storage restore drills remain separate implementation work.

## Next Implementation Ticket

`Production trust implementation ticket 3: monitoring and runtime health proof`
