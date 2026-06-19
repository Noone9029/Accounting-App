# Storage Architecture

Audit date: 2026-05-15

## Current Behavior

LedgerByte currently keeps two storage domains separate:

- Uploaded attachments: user-uploaded supporting files linked to accounting, banking, inventory, contact, item, and journal records through `Attachment`.
- Generated documents: system-created PDFs and report archives stored through `GeneratedDocument`.

Both domains continue to use database/base64 storage by default. Attachment uploads still use the existing JSON/base64 API, but the attachment storage service can now write new uploads to S3-compatible object storage when `ATTACHMENT_STORAGE_PROVIDER=s3` and all required S3 configuration is present. Generated PDF archive behavior is unchanged and remains database-backed.

## Configuration

Default providers:

```env
ATTACHMENT_STORAGE_PROVIDER=database
GENERATED_DOCUMENT_STORAGE_PROVIDER=database
ATTACHMENT_MAX_SIZE_MB=10
```

S3-compatible configuration for uploaded attachments:

```env
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_BASE_URL=
```

The readiness API returns boolean configuration status only. It must never return access key or secret values.

## Provider Design

The groundwork defines a generic storage provider contract:

- `saveObject(input)`
- `getObject(input)`
- `deleteObject(input)`
- `getReadUrl(input)` optional
- `readiness()`

Implemented providers:

- `DatabaseAttachmentStorageService`: active default provider for uploaded attachments.
- `S3AttachmentStorageService`: feature-flagged provider for uploaded attachments. It uses AWS SDK v3 against generic S3-compatible endpoints and stores objects at `org/{organizationId}/attachments/{attachmentId}/{safeFilename}`.

Generated documents now have a generated-document-specific adapter boundary, but they remain in `GeneratedDocument` database/base64 storage by default, with readiness and migration counts exposed for planning.

2026-06-19 generated-document object-storage contract update: future generated-document object storage must use a tenant-prefixed and generated-document-id anchored key shape such as `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`. Object keys must be server-derived after authorization and must not include provider secrets, customer-sensitive path data, global flat paths, or direct user-controlled key input. This is a contract only; no generated-document object storage was enabled.

2026-06-19 generated-document object-storage implementation-plan update: `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md` defines the future adapter path. The default remains DB-backed. A future implementation should add a generated-document-specific storage interface with a database adapter first, a fake local object adapter for tests, and a future object adapter behind disabled feature flags. Signed URLs are not required for the initial object-storage phase and remain separately proof-gated.

2026-06-19 generated-document adapter-interface update: `GeneratedDocumentStorageAdapter` and `DatabaseGeneratedDocumentStorageAdapter` now exist under `apps/api/src/generated-documents/generated-document-storage.ts`. `GeneratedDocumentModule` registers the database adapter as the runtime default. The fake local generated-document object adapter is test-only and not runtime-registered. No hosted object storage, real object adapter, signed URL path, schema migration, or generated-document migration was added.

2026-06-19 disabled generated-document object adapter proof update: `DisabledGeneratedDocumentObjectStorageAdapter` and `createGeneratedDocumentStorageAdapter()` now prove fail-closed selection behavior. The selector defaults to database storage, requires explicit local-test-only selection for the fake adapter, maps object/S3-compatible modes to a disabled adapter, and fails closed on unknown modes. `GeneratedDocumentModule` remains database-backed and does not register a real generated-document object adapter.

## Readiness APIs

- `GET /storage/readiness`
- `GET /storage/migration-plan`

Both require authentication, `x-organization-id`, and either `documentSettings.view` or `attachments.manage`.

`/storage/readiness` reports active providers, readiness, blocking reasons, warnings, max attachment size, and S3 config booleans. S3 attachment readiness is configuration-only; it does not expose secrets or perform a live bucket write.

`/storage/migration-plan` is dry-run only. It returns counts and byte totals for attachments and generated documents, database/S3 record counts, the configured target provider, and does not copy, delete, or rewrite content.

## Production Direction

Before production-scale file usage:

- Add a resumable database-to-S3 migration executor.
- Add upload/download tests against a local object-store emulator.
- Add virus scanning and retention policy hooks.
- Add migration batches with hash verification and rollback checkpoints.
- Keep generated documents and uploaded attachments logically separate even if they share a bucket.
- Implement generated-document object storage only after DB fallback, metadata, adapter, staging proof, bucket policy, backup/restore, retention/legal-hold, malware-scan, and owner approval gates are satisfied.

## Non-Goals In This Groundwork

- S3 is not the default and no S3 credentials are required for database-mode development/tests.
- No generated document migration.
- No attachment migration.
- No live bucket readiness probe.
- No OCR.
- No virus scanning.
- No email sending.
- No generated document object-storage implementation.
- No generated document hosted object adapter.
- No generated document real object adapter replacing the disabled proof adapter.
- No generated document signed URL implementation.
- No generated document schema migration.
