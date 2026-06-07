# DEV-12 Storage Readiness And Migration Dry-Run Preflight

Date: 2026-05-30

Latest commit inspected: `9e562375 Verify DEV-12 generated document download gate`

Marker: `DEV12-DOC-20260530T000000`

## 1. Purpose And Scope

This Part 10 preflight plans local-only storage readiness and migration dry-run checks for the DEV-12 marker generated document. It is documentation and read-only code inspection only. It does not run readiness calls, run migration, upload objects, delete objects, mutate storage settings, download document bodies, or change app behavior.

Part 11 may run approved local readiness and dry-run/count-only checks. It must not execute migration, upload/delete objects, print secrets/bodies, or infer production readiness.

## 2. Safety Rules

- Use only the local DEV-12 marker organization and generated document.
- Prove the database target is local-only before any Part 11 runtime read.
- Do not run a storage migration executor.
- Do not upload to object storage.
- Do not delete from object storage.
- Do not change storage settings or environment variables.
- Do not generate or download document bodies.
- Do not print storage credentials, bucket names if secret, signed URLs, object keys if sensitive, DB URLs, auth headers, cookies, tokens, secrets, PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, or provider payload bodies.
- Do not run E2E, smoke, full tests, full build, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup, restore, production, beta, hosted/shared, or customer-data checks.

## 3. Current Storage Provider Behavior

| Area | Current behavior |
| --- | --- |
| Provider normalization | `StorageConfigurationService` treats any provider other than `s3` as `database`. |
| Attachment provider | Reads `ATTACHMENT_STORAGE_PROVIDER`; default is `database`. |
| Generated-document provider | Reads `GENERATED_DOCUMENT_STORAGE_PROVIDER`; default is `database`. |
| S3 status | Readiness returns booleans for endpoint, region, bucket, access key, secret, force-path-style, and public-base-url configuration. |
| Secret redaction | Readiness returns only booleans and warning/blocker text, not access keys, secret keys, endpoint values, bucket values, or object keys. |
| Local `.env` posture | No `ATTACHMENT_STORAGE_PROVIDER`, `GENERATED_DOCUMENT_STORAGE_PROVIDER`, `S3_*`, or `ATTACHMENT_MAX_SIZE_MB` keys were present in the inspected local `.env` key list. |

## 4. Generated-Document Storage Gap

- `GeneratedDocumentService.archivePdf` stores generated PDFs in the database by setting `storageProvider = "database"` and `contentBase64 = input.buffer.toString("base64")`.
- `GeneratedDocumentService.download` reads `contentBase64` and returns a buffer.
- There is no generated-document S3 write/read/delete provider path.
- If `GENERATED_DOCUMENT_STORAGE_PROVIDER=s3` is configured, `StorageService.readiness` still warns that generated-document S3 writes are not enabled and generated documents remain database-backed.
- No generated-document object key construction, signed URL, object migration executor, object delete, malware scan, lifecycle policy, restore proof, or legal-hold integration exists.

## 5. Attachment Storage Behavior

- Uploaded attachments have a database storage service and an S3-compatible storage service.
- Database attachment storage stores `contentBase64` and is local/dev only.
- S3 attachment storage can upload/read new attachments when configuration is complete, using an organization-scoped key pattern.
- Attachment S3 read/write support does not implement generated-document object storage.
- The generic attachment delete object method is a no-op in this phase; attachment soft-delete is a separate application data path.

## 6. Storage Readiness Endpoints And Page

| Surface | Current behavior |
| --- | --- |
| `GET /storage/readiness` | Returns attachment storage readiness, generated-document storage readiness, S3 config booleans, max upload size, warnings, and blocking reasons. |
| `GET /storage/migration-plan` | Returns organization-scoped attachment and generated-document counts/bytes, database/S3 counts, target provider, migration flags, notes, and `dryRunOnly: true`. |
| Permissions | Both storage endpoints require `documentSettings.view` and `attachments.manage`. |
| `/settings/storage` | Loads readiness and migration plan; if allowed, also loads backup readiness, restore drill plan, and backup evidence metadata. |
| UI guardrail | The page states migration execution is not implemented and backup/restore controls are metadata-only. |

## 7. Migration Dry-Run Behavior

`StorageService.migrationPlan` is count-only:

- Aggregates attachment count and byte totals by organization.
- Aggregates generated-document count and byte totals by organization.
- Counts database-backed attachments and generated documents.
- Counts S3/S3-placeholder attachments and generated documents with `storageProvider = "s3"`.
- Returns `databaseStorageCount`, `s3StorageCount`, `migrationRequired`, `targetProvider`, `estimatedMigrationRequired`, and `dryRunOnly: true`.
- Notes explicitly say no objects are copied, deleted, or rewritten.
- No migration executor is present in the inspected service path.

## 8. Backup/Restore Relation

- `GET /system/backup-readiness` is read-only and reports required metadata evidence types for database backup, PITR, migration history, object storage backup, generated-document backup, attachment backup, restore drill, restore verification, and RPO/RTO review.
- `GET /system/restore-drill-plan` is read-only and does not execute restore operations.
- Backup evidence create/verify/revoke endpoints mutate metadata-only evidence and write audit logs, so they are out of scope for Part 11.
- Backup readiness does not prove an actual backup, restore, object storage export, generated-document reachability after restore, or production readiness.

## 9. Object-Storage Readiness Fields And Redaction Rules

Allowed Part 11 evidence fields:

- Active provider names: `database` or `s3`.
- Readiness booleans.
- Blocking reason labels.
- Warning text.
- S3 config booleans: endpoint configured, region configured, bucket configured, access key configured, secret configured, force-path-style, public base URL configured.
- Counts and byte totals.
- Target provider and `dryRunOnly`.

Forbidden Part 11 evidence values:

- DB URLs.
- S3 endpoint values.
- Bucket names if they reveal a secret/non-public environment target.
- Access keys, secret keys, tokens, credentials, auth headers, cookies.
- Object keys if they are sensitive.
- Signed URLs.
- PDF bytes, base64, attachment bodies, CSV bodies, signed XML, QR payloads, provider payload bodies.

## 10. Allowed Part 11 Checks

- Prove the database target is local-only.
- Confirm the DEV-12 marker fixture exists.
- Call `StorageService.readiness()` or the equivalent local service path.
- Call `StorageService.migrationPlan(markerOrganizationId)` as dry-run/count-only.
- Optionally call read-only backup readiness/restore drill planning if no mutation is needed.
- Verify readiness output contains no secret values, object keys, signed URLs, or bodies.
- Verify migration plan returns counts and `dryRunOnly: true`.
- Verify generated-document and audit counts remain stable before/after.

## 11. Forbidden Part 11 Checks

- Do not execute storage migration.
- Do not upload/read/delete objects in S3 or any external object store.
- Do not create, archive, generate, download, delete, purge, supersede, or restore generated documents.
- Do not mutate attachments, backup evidence, storage settings, retention settings, environment variables, schema, or app behavior.
- Do not run E2E, smoke, full tests, full build, migrations, seed/reset/delete, deploys, ZATCA, email, backup, restore, login, browser flows, production/beta/customer-data checks, or hosted/shared target checks.

## 12. Expected Marker Counts And Readiness Results

Expected Part 11 local results if the environment remains unchanged:

| Area | Expected result |
| --- | --- |
| Attachment active provider | `database` |
| Generated-document active provider | `database` |
| Attachment readiness | Ready with database/local-dev warning |
| Generated-document readiness | Ready with database/local-dev warning |
| S3 config booleans | Required S3 values not configured; force-path-style defaults to `true`; public base URL not configured |
| Marker organization generated-document count | At least the DEV-12 marker document; expected `1` if no unrelated generated docs exist in that synthetic organization |
| Marker generated-document size bytes | `129` |
| Generated-document database count for marker organization | Expected `1` |
| Generated-document S3 count for marker organization | Expected `0` |
| Attachment count for marker organization | Expected `0` |
| Migration dry-run | `dryRunOnly: true`, `migrationRequired: true`, `databaseStorageCount: 1`, `s3StorageCount: 0` for the marker organization |
| Count stability | Generated-document and audit-log counts should remain unchanged |

## 13. Risks And Blockers

- Generated-document object storage is not implemented; database/base64 generated-document storage is local/dev evidence only.
- Attachment S3 support does not prove generated-document S3 support.
- Migration plan is count-only and does not move or verify objects.
- Backup readiness is metadata-only and does not run backup/restore.
- Readiness booleans can prove only configuration presence/absence, not actual bucket permissions, object versioning, immutable retention, malware scanning, restore integrity, or production suitability.
- If Part 11 finds S3 provider values configured locally, evidence must remain boolean/redacted and must still not upload/delete objects.

## 14. Recommended Next Thread

`DEV-12 Part 11: approved local storage readiness and migration dry-run checks`
