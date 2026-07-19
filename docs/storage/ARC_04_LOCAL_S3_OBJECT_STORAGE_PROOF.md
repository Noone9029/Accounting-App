# ARC-04 local S3-compatible generated-document proof

Date: 2026-07-20
Classification: local, disposable, synthetic only

## Result

ARC-04 added a real S3-compatible generated-document adapter and proved it against a disposable local MinIO service. `LOCAL_GENERATED_DOCUMENT_S3_PROOF_PASSED` was emitted before the proof process was stopped; both its API and console ports were then confirmed closed.

The local service was MinIO `RELEASE.2025-09-07T16-13-09Z` for Windows/amd64. The downloaded executable SHA-256 was `AF709E6BA68488404E85ACDD22A3030D0F5E56A108D4B27D744F18CEB50861B4`. It was bound to `127.0.0.1` only, used synthetic credentials, and is an untracked local proof artifact rather than a repository dependency.

## Adapter and runtime behavior

- `S3GeneratedDocumentStorageAdapter` uses the existing `GeneratedDocumentStorageAdapter` boundary and is selected only when `GENERATED_DOCUMENT_STORAGE_PROVIDER=s3` and complete S3 configuration exists.
- The database adapter remains the default. Existing database-backed records keep using their persisted provider metadata, so changing the runtime selection does not strand a database-backed document.
- S3 keys are organization- and generated-document-id-anchored. Unsafe traversal input is rejected; filenames are only a sanitized final segment.
- Writes store only bounded S3 metadata: SHA-256, organization id, and generated-document id. The document body stays out of database metadata for S3 records.
- Duplicate writes are deterministic only when size, SHA-256, organization id, and generated-document id all match; a conflicting existing object is rejected.
- Reads validate the expected key shape and persisted tenant/document metadata, then verify remote metadata, byte size, and SHA-256 before returning content. Missing, cross-tenant, malformed, corrupt, and provider failures do not expose object keys or credentials.
- The client limits a request to ten seconds and uses at most three SDK attempts. Provider errors are normalized to safe application errors.
- Direct cleanup is explicit through `deleteGeneratedDocumentContent`; ordinary document reads and writes do not delete objects.
- Signed URLs remain disabled. Download stays API-mediated through the existing tenant/source authorization path.

## Local proof coverage

`apps/api/scripts/local-generated-document-s3-proof.ts` created a unique private local bucket and exercised:

- database default write/read and rollback read;
- S3 put/readback with persisted-provider metadata;
- reconciliation of database and S3 SHA-256/size;
- object `Head` metadata consistency;
- deterministic duplicate and conflicting duplicate behavior;
- wrong-tenant, missing-object, and corrupt-object rejection;
- disabled signed URL behavior;
- explicit scoped object cleanup, empty-bucket confirmation, bucket deletion, and local process/port teardown.

Focused adapter tests passed: 18 tests in `generated-document-storage.spec.ts`. API type-check passed after local Prisma client generation.

## Boundaries and next gate

This is not hosted storage proof, a bucket-policy review for a hosted provider, customer-data proof, retention/legal-hold/malware scanning proof, backup/restore proof, monitoring proof, or production readiness. No hosted bucket, database, application, provider, beta, or production resource was touched. No schema or migration was created.

Any non-local object-storage proof remains gated by the documented approval package and `APPROVE NON-PRODUCTION HOSTED PROOF`. Production cutover needs separate written approval. The local MinIO data directory and executable remain untracked under `.codex-minio/`; no service remains running.
