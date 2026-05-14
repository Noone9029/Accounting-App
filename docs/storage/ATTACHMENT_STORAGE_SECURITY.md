# Attachment Storage Security

Audit date: 2026-05-15

## Current Controls

- Attachments are tenant-scoped by `organizationId`.
- Upload validates linked entity ownership before creating metadata.
- Supported MIME types are limited to PDF, PNG, JPEG, WebP, CSV, XLSX, and XLS.
- Empty files, invalid base64, unsupported MIME types, and oversized files are rejected.
- `ATTACHMENT_MAX_SIZE_MB` controls upload size with a default of 10 MB.
- Filenames are sanitized.
- SHA-256 `contentHash` is computed at upload.
- List and detail endpoints return metadata only and exclude `contentBase64`.
- Download is the only content path.
- Deleted attachments are soft-deleted and cannot be downloaded.

## Current Storage Risk

Database/base64 storage is acceptable for local development and early MVP testing but is not production-scale. Risks include:

- Database growth from binary payloads.
- Backup and restore size growth.
- Higher memory pressure during upload/download.
- No object lifecycle management.
- No external malware scanning pipeline.

## S3-Compatible Security Requirements

Before enabling S3/object storage:

- Store credentials only in environment or a managed secrets system.
- Never expose secret values through readiness endpoints, logs, client bundles, or docs.
- Use least-privilege credentials scoped to the target bucket/prefix.
- Enable bucket encryption and backup/lifecycle policies.
- Use tenant-safe object keys.
- Verify content hash after every upload and migration copy.
- Keep API-level authorization even when signed URLs are introduced.
- Block download for deleted attachments regardless of object existence.

## Future Virus Scanning Hook

Recommended future flow:

1. Upload file to quarantine prefix.
2. Create attachment metadata with a pending scan status.
3. Scan using a dedicated worker/provider.
4. Promote clean files to active prefix.
5. Block download until clean.
6. Preserve scan result and timestamp.

No virus scanning is implemented in this task.

## Future Retention Policy Hook

Retention should be defined per organization and entity type. Accounting support files may require long retention windows and deletion controls. Soft delete should remain metadata-first until an approved purge workflow exists.

## Generated Documents

Generated PDFs should follow a similar storage security model but remain separate from uploaded attachments. They are system-created documents, not arbitrary user uploads, and may need different retention and immutability policies.
