# Storage Architecture

Audit date: 2026-05-15

## Current Behavior

LedgerByte currently keeps two storage domains separate:

- Uploaded attachments: user-uploaded supporting files linked to accounting, banking, inventory, contact, item, and journal records through `Attachment`.
- Generated documents: system-created PDFs and report archives stored through `GeneratedDocument`.

Both domains continue to use database/base64 storage by default. Attachment uploads still use the existing JSON/base64 API. Generated PDF archive behavior is unchanged.

## Configuration

Default providers:

```env
ATTACHMENT_STORAGE_PROVIDER=database
GENERATED_DOCUMENT_STORAGE_PROVIDER=database
ATTACHMENT_MAX_SIZE_MB=10
```

Future S3-compatible configuration:

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
- `S3AttachmentStorageService`: stub only. It reports not ready and throws if selected for writes in this groundwork build.

Generated documents are not migrated to this abstraction yet. They remain in `GeneratedDocument` database/base64 storage, with readiness and migration counts exposed for planning.

## Readiness APIs

- `GET /storage/readiness`
- `GET /storage/migration-plan`

Both require authentication, `x-organization-id`, and either `documentSettings.view` or `attachments.manage`.

`/storage/readiness` reports active providers, readiness, blocking reasons, warnings, max attachment size, and S3 config booleans.

`/storage/migration-plan` is dry-run only. It returns counts and byte totals for attachments and generated documents and does not copy, delete, or rewrite content.

## Production Direction

Before production-scale file usage:

- Add a real S3-compatible SDK adapter.
- Decide bucket layout and tenant-safe object keys.
- Add upload/download tests against a local object-store emulator.
- Add virus scanning and retention policy hooks.
- Add migration executor with resumable batches and hash verification.
- Keep generated documents and uploaded attachments logically separate even if they share a bucket.

## Non-Goals In This Groundwork

- No external upload.
- No S3 credentials required.
- No generated document migration.
- No attachment migration.
- No OCR.
- No virus scanning.
- No email sending.
- No generated document archive refactor.
