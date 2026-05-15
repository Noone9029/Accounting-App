# S3 Migration Plan

Audit date: 2026-05-15

## Objective

Move uploaded attachments and generated documents from database/base64 storage to S3-compatible object storage without losing tenant isolation, content hashes, download behavior, or auditability.

The S3 attachment upload adapter now exists behind `ATTACHMENT_STORAGE_PROVIDER=s3`, but this migration plan is still not implemented. The current API only exposes readiness and dry-run counts.

## Required Preconditions

- S3-compatible provider selected for the target domain after accountant/admin review.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` configured in the runtime environment.
- No secrets exposed in logs, APIs, screenshots, or support bundles.
- Bucket encryption, backups, lifecycle policies, and access controls reviewed.
- Object key convention finalized.
- Rollback plan approved.

## Proposed Object Key Layout

Uploaded attachment key used by the S3 adapter:

```text
org/{organizationId}/attachments/{attachmentId}/{safeFilename}
```

Suggested generated document key:

```text
organizations/{organizationId}/generated-documents/{generatedDocumentId}/{contentHash}-{filename}
```

Keys must not include untrusted path segments without sanitization. Tenant id and record id should remain part of the key for operational tracing.

## Migration Phases

1. Dry run:
   - Count records by provider.
   - Sum byte totals.
   - Confirm content hashes exist.
   - Report estimated work.

2. Pilot copy:
   - Copy a small tenant-scoped batch.
   - Write object to S3.
   - Read object back and verify SHA-256 hash.
   - Leave database base64 content intact.

3. Dual-read:
   - Prefer S3 for records with `storageKey`.
   - Fallback to database content for records not migrated.
   - Keep downloads tenant-scoped through the API.

4. Cutover:
   - New uploads write to S3 only after the adapter has passed testing.
   - Generated documents can be switched separately from uploaded attachments.

5. Cleanup:
   - Remove database base64 content only after backup, hash verification, and rollback window.
   - Keep metadata, content hash, size, provider, and storage key.

## Generated Documents

Generated PDFs are system-created archives and should remain separate from uploaded attachments. They can use the same bucket but should keep distinct key prefixes, retention rules, and audit notes.

## Open Decisions

- Whether downloads use signed URLs or continue streaming through the API.
- Whether to retain base64 content permanently for small files.
- Whether generated documents need immutable retention.
- Whether attachment deletion should delete object content immediately or only mark metadata deleted.

## Not Implemented Yet

- Migration executor.
- Signed URL support.
- Object deletion.
- Virus scanning.
- Retention policy enforcement.
- OCR or file parsing.
