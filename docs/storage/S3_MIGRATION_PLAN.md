# S3 Migration Plan

Audit date: 2026-05-15

## Objective

Move uploaded attachments and generated documents from database/base64 storage to S3-compatible object storage without losing tenant isolation, content hashes, download behavior, or auditability.

The S3 attachment upload adapter now exists behind `ATTACHMENT_STORAGE_PROVIDER=s3`, but this migration plan is still not implemented. The current API only exposes readiness and dry-run counts.

2026-06-19 generated-document implementation-plan update: generated-document object storage remains planned, not enabled. `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md` requires a DB-fallback-first adapter rollout before any generated-document migration. No generated-document migration executor, schema migration, hosted bucket mutation, or signed URL implementation is included in this planning pass.

2026-06-19 adapter-interface update: the first generated-document storage adapter scaffold now exists, with database storage as the runtime default and a fake local object adapter for tests only. This does not change the migration plan: no generated-document object migration, hosted bucket mutation, signed URL implementation, or schema migration has been added.

2026-06-19 disabled-object-adapter proof update: explicit generated-document object/S3-compatible adapter modes now resolve to a disabled fail-closed adapter. This does not change the migration plan: no generated-document migration executor, hosted object adapter, hosted bucket mutation, signed URL implementation, or schema migration has been added.

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

Generated document contract key:

```text
org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}
```

Keys must not include untrusted path segments without sanitization. Tenant id and generated-document id must remain part of the key for operational tracing. Source type, source id, document type, and content hash should remain metadata unless a future reviewed implementation deliberately includes them without leaking customer-sensitive path data.

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
   - Generated-document object reads remain disabled until DB fallback, hash verification, and staging proof pass.

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
- Whether generated documents need future metadata fields such as logical bucket, retention class, archive state, legal hold, generation version, source snapshot hash, object uploaded timestamp, and object verified timestamp.

## Not Implemented Yet

- Migration executor.
- Signed URL support.
- Object deletion.
- Virus scanning.
- Retention policy enforcement.
- Generated-document object-storage adapter implementation.
- Generated-document hosted object-storage adapter implementation.
- Generated-document disabled object adapter replacement with a real hosted adapter.
- Generated-document metadata/schema migration.
- Hosted generated-document bucket proof.
- OCR or file parsing.
