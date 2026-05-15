# S3 Attachment Adapter Implementation

Audit date: 2026-05-15

## Scope

LedgerByte now includes a real S3-compatible adapter for uploaded attachments only. It is disabled by default and is activated only with:

```env
ATTACHMENT_STORAGE_PROVIDER=s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
```

Database/base64 storage remains the default provider. Generated documents are not moved to S3 in this phase.

## Object Keys

New S3 attachment uploads use:

```text
org/{organizationId}/attachments/{attachmentId}/{safeFilename}
```

The filename segment is sanitized before use. The organization id and attachment id are generated or validated by the API, not trusted from the browser.

## Upload Behavior

When S3 attachment storage is selected:

- The API validates linked entity ownership, MIME type, size, base64 shape, and empty-file rules before storage.
- The API generates the attachment id before upload so the id can be part of the object key.
- The S3 object is written with `ContentType` and metadata containing `contentHash`, `organizationId`, and `attachmentId`.
- The `Attachment` row stores `storageProvider = S3`, `storageKey`, `contentHash`, and `sizeBytes`.
- `contentBase64` is stored as `null` for S3-backed attachments.

## Download Behavior

Downloads remain API-mediated and tenant-scoped. The API reads the object by `storageKey` and streams it through the existing download endpoint with the stored MIME type and filename.

## Delete Behavior

Attachment deletion remains soft-delete only. The object is not physically deleted in this MVP. A future retention/purge workflow should decide when object deletion is permitted.

## Readiness

`GET /storage/readiness` reports S3 configuration booleans only. It never returns access keys, secret keys, database URLs, or bucket credentials. Readiness is configuration-based and does not perform a live bucket write.

## Testing

Automated tests mock the AWS SDK v3 S3 client. No real AWS, Supabase, MinIO, or S3-compatible credentials are required for tests.

## Remaining Work

- Database-to-S3 migration executor.
- Local object-store integration test against MinIO or equivalent.
- Virus scanning/quarantine flow.
- Retention/lifecycle policy and object purge approval.
- Generated document object storage.
- Signed URL strategy, if needed later.
