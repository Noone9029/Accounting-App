# DEV-12 Generated Documents Storage Retention Closure

Status/date: closed local-only evidence on 2026-05-30.

Latest commit inspected: `151c3f37 Preflight DEV-12 retention cleanup policy`.

Marker: `DEV12-DOC-20260530T000000`.

## Scope

DEV-12 is closed as local-only generated documents storage retention evidence.

The branch covered one synthetic generated-document fixture, safe metadata list/detail behavior, one approved local download gate check, storage readiness and migration dry-run checks, and retention/legal-hold cleanup policy preflight. The run stayed scoped to the local PostgreSQL database target and did not use production, beta, hosted/shared targets, customer data, external object storage, real provider services, or document/body output.

## Actions Not Performed In Closure

- No runtime mutation.
- No download.
- No PDF, CSV, base64, `contentBase64`, request body, response body, attachment body, signed XML, QR payload, token, cookie, auth header, DB URL, provider payload, or secret output.
- No object upload, copy, delete, rewrite, migration execution, purge, cleanup, restore, backup, seed, reset, deploy, production action, beta action, or customer-data action.
- No broad smoke, E2E, full test, hosted check, load test, or concurrency test.

## Evidence Covered By Parts 1-13

- Part 1: preflight found generated documents are currently DB/base64-backed through `GeneratedDocumentService.archivePdf`; downloads read `contentBase64`; S3 writes for generated documents, retention/legal hold, purge/cleanup, restore, malware scanning, signed URLs, and object lifecycle are not implemented.
- Part 2: approved local-only fixture creation created one synthetic generated-document record and one generated-document audit-log row under the marker.
- Part 3: fixture verification confirmed marker-scoped counts, metadata, DB storage, hash/size, audit baseline, and `contentBase64` presence without selecting or printing the value.
- Part 4: metadata preflight confirmed list/detail endpoints use safe metadata fields and require `generatedDocuments.view`, while download uses a separate `generatedDocuments.download` permission.
- Part 5: approved local metadata checks confirmed list/detail/filter behavior for the marker document without download, body output, or mutation.
- Part 6: metadata evidence verification confirmed the Part 5 evidence remained marker-scoped, count-stable, body-free, and secret-free.
- Part 7: download preflight mapped the download route and expected filename, MIME, size, hash, archive delta, audit delta, not-found behavior, and permission boundaries.
- Part 8: approved local download gate checks confirmed one marker download's metadata/hash only, without body output, and verified permission allow/deny behavior.
- Part 9: download evidence verification confirmed no new download, matching hash/size/count evidence, and no body or secret patterns.
- Part 10: storage readiness preflight confirmed storage readiness and migration planning are count/readiness only, generated documents remain DB-backed, and backup readiness is metadata-only.
- Part 11: approved local readiness and migration dry-run checks confirmed database providers, redacted S3 boolean config, count-only dry-run values, and no object upload/delete/migration execution.
- Part 12: storage evidence verification confirmed the marker document remained DB-backed with no storage key, no migration execution, no object output, and no signed URL/object key/body leakage.
- Part 13: retention/legal-hold cleanup preflight confirmed no generated-document retention duration, legal-hold field/workflow/enforcement, soft-delete, purge/cleanup/restore executor, approved tax/accounting retention duration, or destructive cleanup approval model.

## Generated-Document Fixture Evidence Summary

- Synthetic org prefix: `a452101a`.
- Synthetic user prefix: `9f375f20`.
- Generated document prefix: `663e5c68`.
- Document type: `REPORT_TRIAL_BALANCE`.
- Source: `AccountingReport` / `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE`.
- Document number: `DEV12-DOC-TB-0001`.
- Filename: `DEV12-DOC-trial-balance.pdf`.
- MIME type: `application/pdf`.
- Storage provider/key: `database` / `null`.
- Status: `GENERATED`.
- Size: `129`.
- SHA-256: `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f`.
- Marker generated-document count: `1`.
- Marker generated-document audit-log count: `1`.
- Marker attachments: `0`.
- Marker backup evidence rows: `0`.

## Metadata List/Detail Evidence Summary

List/detail/filter checks returned the marker generated document using metadata-only fields. The checks covered document type, source type, source id, and status filters. The evidence confirmed `contentBase64`, raw body fields, buffers, and PDF bytes were excluded from list/detail output.

## Download Gate Evidence Summary

One approved local-only marker download check confirmed filename `DEV12-DOC-trial-balance.pdf`, MIME type `application/pdf`, byte length `129`, and SHA-256 `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f`. The archive delta remained `0`, the audit delta remained `0`, missing id returned `NotFoundException`, and `generatedDocuments.download` or `admin.fullAccess` was required. View-only and source-view-only permissions were denied.

## Storage Readiness And Migration Dry-Run Evidence Summary

The approved local readiness checks reported attachment provider `database` and generated-document provider `database`, both ready with local/dev warnings. S3 configuration was reported as redacted booleans only. The migration dry-run reported `dryRunOnly=true`, attachment count `0`, generated-document count `1`, generated-document total bytes `129`, database storage count `1`, S3 storage count `0`, target provider `database`, `migrationRequired=true`, and no object copy/delete/rewrite.

Backup readiness was metadata-only, did not run a backup or restore, reported `productionReady=false`, and found all required evidence types missing for the marker organization.

## Retention Legal Hold Policy Evidence Summary

Generated documents currently have status, `generatedAt`, and `createdAt`, but no approved retention duration, legal-hold marker, legal-hold workflow, legal-hold enforcement, soft delete, purge executor, cleanup executor, restore executor, object lifecycle rule, or destructive cleanup approval model. The safe policy is preserve-by-default until a future dry-run-first, marker/tenant-scoped, approval-gated cleanup executor exists and legal/accounting retention rules are approved.

## What DEV-12 Proves

- Local synthetic generated-document fixture creation can archive one DB-backed generated-document row with metadata, size, and content hash.
- Metadata list/detail/filter paths can return marker-scoped safe metadata without document body output.
- The download service can read the local DB-backed marker PDF and return a buffer whose hash/size match stored metadata, without creating another archive row.
- The generated-document download permission is separate from metadata view permission.
- Storage readiness and migration planning can count generated documents and attachments without exposing secrets, bodies, object keys, or executing migration.
- Current retention/legal-hold/cleanup implementation gaps are documented and should remain preserve-by-default.

## What DEV-12 Does Not Prove

DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.

It also does not prove generated-document S3 writes, database/base64 migration execution, signed URLs, object lifecycle enforcement, legal-hold enforcement, backup retention, object restore, accountant/legal approval, PDF/A-3/ZATCA artifact retention, or customer-data deletion/retention conflict handling.

## Production Gap Register

- Object storage for generated documents.
- Database/base64 migration.
- Signed URLs.
- Lifecycle policy.
- Legal hold.
- Tax/accounting retention approval.
- Customer-data deletion/retention conflict.
- Malware scanning.
- Restore proof.
- Backup proof.
- Generated-document purge executor.
- Versioning/supersede policy.
- PDF/A-3/ZATCA artifact boundaries.
- Hosted/beta/customer-data proof.
- Broad E2E/smoke/full-test.
- Load/concurrency for large PDFs.
- Accountant/legal review.

## E2E Readiness Checklist

- Build a non-production generated-document object-storage path for new archives.
- Add a resumable DB/base64-to-object migration executor with dry-run, rollback, and count reconciliation.
- Validate signed URL or streaming policy without leaking object keys.
- Add object lifecycle, legal-hold, retention duration, purge/cleanup, and restore policy only after accountant/legal approval.
- Test malware scanning and file safety controls for uploaded files and generated artifacts if object storage becomes shared infrastructure.
- Prove backup/restore and object restore on a non-production hosted target.
- Add broad document/archive/download E2E coverage after the storage path and permission matrix are finalized.
- Run load/concurrency tests with large PDFs before production-scale claims.

## Closure Conclusion

DEV-12 is closed as local-only generated documents storage retention evidence.

DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.

Generated-document storage is not production-complete. It remains DB/base64-backed until a future approved branch implements and proves object storage, migration, retention/legal hold, restore, scanning, and broad E2E/load coverage.

Recommended next branch: `DEV-13 Part 1: role permission matrix production-gap and E2E readiness preflight`.
