# Storage Generated Document Isolation Proof Sprint Closure

Date: 2026-06-19

Branch: `feature/storage-generated-document-isolation-proof`

Base: clean `origin/main` at `796784b34a40c0900cce8e403bef70ffb60ca521`

## Scope

This was a local-only production-readiness proof pass for uploaded attachment and generated-document tenant isolation. It did not run hosted commands, Supabase commands, Vercel deploy commands, production database commands, hosted/customer-data mutations, hosted object-storage mutations, signed URL generation, schema changes, migrations, SQL template application, RLS rollout, runtime role application, real customer document access, provider calls, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, real email, real bank feeds, payment processors, production compliance claims, or SOC 2/security certification claims.

## Storage And Document Paths Inventoried

- Uploaded attachments: `AttachmentController`, `AttachmentService`, `AttachmentStorageService`, database/base64 storage, and feature-flagged S3-compatible upload storage.
- Generated documents: `GeneratedDocumentController`, `GeneratedDocumentService`, generated-document list/get/download, source-record PDF archive creation, and metadata-only ZATCA PDF/A-3 boundary.
- Storage readiness: `StorageController`, `StorageService`, `StorageConfigurationService`, readiness output, and dry-run migration-plan counts.
- Compliance/archive metadata: `ComplianceDocument` and `DocumentArchiveRecord` remain organization-scoped metadata surfaces; no body storage or hosted archive proof was added here.

## Local Proof Added

- Tenant A cannot download Tenant B attachment content through a guessed attachment ID; content storage is not read when metadata is not found in the active organization.
- Tenant A cannot update or soft-delete Tenant B attachments through guessed IDs.
- Attachment list/get/download use organization-scoped predicates and detail metadata does not select base64 body content.
- Attachment upload validates supported linked source records by `{ id, organizationId }`.
- S3 attachment keys include organization and attachment identifiers and now normalize traversal markers out of filenames.
- Tenant A cannot fetch or download Tenant B generated-document metadata/content through guessed generated-document IDs.
- Generated-document archive creation now verifies supported source records by `{ id, organizationId }` before creating archive rows.
- Storage readiness and migration-plan counts remain API-mediated and organization-scoped.

## Bugs Fixed

- `S3AttachmentStorageService` previously preserved `..` traversal markers in the filename portion of object keys. The key still had tenant and attachment prefixes, but filename normalization is now stricter.
- `GeneratedDocumentService.archivePdf()` previously trusted caller-provided `organizationId`, `sourceType`, and `sourceId` after upstream source services had usually loaded the source. It now performs its own supported-source ownership check before creating archive rows.

## Blocked Or Future-Proof Items

- Hosted object-storage tenant isolation was not run.
- Bucket policy and direct object access denial were not proven.
- Signed URLs are not implemented; no signed URL was generated.
- Generated-document object storage is not implemented; generated documents remain database-backed.
- Generated-document object keys, signed URL revocation, stale permission removal behavior, object lifecycle policy, legal hold, malware scanning, immutable archive controls, and backup/restore proof remain future work.
- No database RLS/runtime role proof was added.
- No UAE ASP/Peppol provider evidence or ZATCA production credentials are available.

## Safety Result

- No hosted command was run.
- No hosted/customer data was mutated.
- No hosted object storage was touched.
- No schema or migration was changed.
- No SQL template was applied.
- No RLS policy or runtime DB role was applied.
- No production target was touched.
- The preserved dirty worktree, safety patch, ZATCA stash, and protected codex branches remained untouched.

## Remaining Production Blockers

- Approved staging/proof credentials and synthetic tenant IDs.
- Hosted storage and bucket policy proof.
- Signed URL design and proof if signed URLs are introduced.
- Generated-document object-storage design and proof.
- Backup/restore proof for metadata and object bodies.
- Retention, immutability, legal-hold, malware-scan, and archive policy evidence.
- Observability for denied access without body or secret leakage.
- Security/accounting/legal owner sign-off.
- UAE ASP/Peppol provider evidence and ZATCA production credentials.

## Recommended Next Prompt

`Design signed URL and object storage proof harness`
