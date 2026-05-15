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

Generated documents are not migrated to this abstraction yet. They remain in `GeneratedDocument` database/base64 storage, with readiness and migration counts exposed for planning.

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

## Non-Goals In This Groundwork

- S3 is not the default and no S3 credentials are required for database-mode development/tests.
- No generated document migration.
- No attachment migration.
- No live bucket readiness probe.
- No OCR.
- No virus scanning.
- No email sending.
- No generated document archive refactor.
