# Backup and Restore Readiness Plan

## Purpose

LedgerByte now has a metadata-only backup and restore readiness surface for controlled-beta operations. The current implementation records evidence and exposes plans only; it does not run database backups, copy object-storage data, export customer data, restore snapshots, or expose secrets.

## Current Storage Story

- Database: Supabase/Postgres is the intended production database, with Prisma migrations as the application schema history.
- Uploaded attachments: default storage remains database/base64. New uploads can use S3-compatible object storage only when `ATTACHMENT_STORAGE_PROVIDER=s3` and S3 configuration are complete.
- Generated documents: generated PDFs remain database-backed in this phase. S3-compatible generated-document writes are still planned.
- ZATCA artifacts: signed XML body persistence and QR payload body persistence remain blocked. This plan does not change ZATCA execution, storage, network, or production-compliance claims.

## Database Backup Requirements

- Confirm Supabase/Postgres backups are enabled for the controlled-beta environment.
- Capture metadata-only evidence for the backup provider, schedule, operator runbook, and verification date.
- Confirm Prisma migration history is preserved and can be applied after restore when needed.
- Confirm point-in-time recovery readiness separately from ordinary scheduled backups.
- Do not store database URLs, `DIRECT_URL`, Supabase service role keys, connection strings, or credentials in LedgerByte evidence.

## Object and Document Storage Requirements

- Capture object-storage backup evidence for S3-compatible buckets before production review.
- Capture generated-document backup evidence separately because generated PDFs are currently database-backed.
- Capture uploaded-attachment backup evidence separately because attachments can be mixed between database and S3 providers.
- Verify tenant-scoped object prefixes and API authorization during restore drills.
- Do not store customer document bodies, attachment bodies, base64 payloads, signed XML bodies, QR payload bodies, provider keys, or storage credentials in evidence.

## Restore Drill Requirements

The restore drill plan is intentionally read-only. A real drill must be run outside the application in an isolated non-production environment.

Checklist:

- Select a snapshot from the approved backup source.
- Restore into an isolated environment.
- Run Prisma migrations if the restored snapshot is behind the deployed schema.
- Verify organization and user counts without exporting customer data.
- Verify accounting reports and key ledger balances.
- Verify uploaded attachments and generated documents through tenant-scoped API reads.
- Verify ZATCA metadata remains non-production unless a separate ZATCA phase explicitly approves otherwise.
- Verify customer email sending remains disabled in the restored environment.
- Record `RESTORE_DRILL` and `RESTORE_VERIFICATION` evidence after the drill.

## RPO/RTO

RPO and RTO values are placeholders until business review. Do not infer legal, accounting, or customer-contract retention periods from this technical plan. Capture `RPO_RTO_REVIEW` evidence only after business owners approve the targets.

## Tenant Isolation

Restore verification must prove tenant isolation survives the restore. Evidence should describe the verification method without customer recipient lists, customer document contents, attachment contents, raw provider payloads, database URLs, or credentials.

## Implemented Now

- `GET /system/backup-readiness`
- `GET /system/restore-drill-plan`
- `GET /system/backup-evidence`
- `POST /system/backup-evidence`
- `POST /system/backup-evidence/:id/verify`
- `POST /system/backup-evidence/:id/revoke`
- `BackupRestoreEvidence` metadata-only model.
- `/settings/storage` backup readiness and evidence capture card for users with audit retention administration permission.
- Smoke assertions for no backup execution, no restore execution, no secret exposure, and default `productionReady=false`.

## Verification For This Readiness Slice

- `corepack pnpm db:generate`
- `corepack pnpm db:migrate`
- Targeted API system tests for backup readiness and system controller behavior.
- Targeted frontend storage tests for backup readiness labels, blockers, and secret-safe rendering.
- `corepack pnpm typecheck`
- `corepack pnpm build`
- `corepack pnpm smoke:accounting`
- `git diff --check`
- `git diff --cached --check`

The verification does not include real backup execution, real restore execution, Java SDK execution, real ZATCA network calls, real CSID requests, clearance/reporting, PDF-A3, real customer email sending, or real provider webhook calls.

## Non-Production Restore Drill - 2026-05-19

A local non-production Postgres restore drill was executed against the Docker Postgres service using seeded local/demo data only. No production database, Supabase project, hosted backup, service role key, database URL, object-storage credential, customer document body, attachment body, signed XML body, or QR payload body was used or printed.

Method:

- Created a custom-format dump from the local non-production `accounting` database inside the Docker Postgres container.
- Restored it into an isolated temporary local database.
- Verified schema/table and tenant-scoped record counts only.
- Verified generated-document and attachment rows by count only; no file payloads were read or exported.
- Verified ZATCA artifact body-persistence controls stayed inactive by count only.
- Verified real customer email sending stayed disabled for the restored environment evidence.
- Dropped the temporary restored database and removed the temporary dump after verification.

Sanitized results:

- Source tables: 76; restored tables: 76.
- Source migrations: 55; restored migrations: 55.
- Latest migration verified: `20260519162000_add_backup_restore_evidence`.
- Organizations: 11 source and 11 restored.
- Users: 77 source and 77 restored.
- Attachments: 186 source and 186 restored.
- Generated documents: 820 source and 820 restored.
- Journal entries: 3121 source and 3121 restored.
- ZATCA signed-artifact storage-key rows: 0.
- ZATCA artifact body-persistence approval rows: 0.
- Temporary restore database remaining after cleanup: 0.
- Temporary dump removed: true.

Evidence records created:

- `DATABASE_BACKUP`: `770cd703-47b7-4718-a976-99ecc3e8fdb4`, `VERIFIED`, local non-production Postgres dump/restore evidence only.
- `MIGRATION_HISTORY`: `3003d418-0d41-4ebe-be91-dbd6a8a5ec2e`, `VERIFIED`.
- `RESTORE_DRILL`: `43f10270-aa12-4734-ab6f-931173d86b6e`, `VERIFIED`.
- `RESTORE_VERIFICATION`: `76de8f05-5cf4-499f-b65a-1c6b9ccde6ec`, `VERIFIED`.
- `GENERATED_DOCUMENT_BACKUP`: `68978692-c1ed-460c-92a0-bf0001199a98`, `VERIFIED` for database-backed generated-document rows by count only.
- `ATTACHMENT_BACKUP`: `ac7ddaf8-7df1-4153-acc2-9b8099f85053`, `VERIFIED` for database-backed attachment rows by count only.
- `OBJECT_STORAGE_BACKUP`: `c1897bb0-8ea4-4601-967e-b1bf251532b6`, `DRAFT`, blocked because no S3-compatible object-storage backup/provider export was configured in the local non-production environment.

Readiness after evidence capture:

- `GET /system/backup-readiness` still returns `productionReady=false`.
- Verified evidence types: `DATABASE_BACKUP`, `MIGRATION_HISTORY`, `GENERATED_DOCUMENT_BACKUP`, `ATTACHMENT_BACKUP`, `RESTORE_DRILL`, and `RESTORE_VERIFICATION`.
- Missing evidence types: `POINT_IN_TIME_RECOVERY`, `OBJECT_STORAGE_BACKUP`, and `RPO_RTO_REVIEW`.
- `GET /system/restore-drill-plan` remains read-only and still reports no app-executed restore.
- Endpoint response checks found no database URL, service role key, storage credential, SMTP secret, API key, authorization header, bearer token, private key, Postgres URL, or SMTP URL pattern.

## Blocked / Remaining

- Real Supabase hosted backup and PITR configuration must still be verified against a non-production Supabase project.
- Real S3-compatible object-storage backup policy and restore test remain blocked; local storage is database-backed.
- Generated documents remain database-backed and do not yet have an S3-compatible write path.
- No restore executor exists in LedgerByte; restore drills remain operator-run outside the app.
- RPO/RTO review is not complete and no business targets were inferred.
- Legal/accounting retention duration is not decided here.
- Production storage hardening, monitoring/alerts, browser E2E expansion, billing/support operations, and real ZATCA OTP/CSID remain separate blockers.

## Staged Implementation Plan

1. Capture metadata-only evidence for database backups, PITR, migration history, object storage backups, generated document backups, and attachment backups.
2. Repeat the restore drill against a real non-production Supabase project and capture hosted backup/PITR evidence.
3. Validate S3-compatible object-storage backup/restore with a non-production bucket before moving document storage.
4. Verify accounting reports, documents, attachments, ZATCA non-production state, and disabled email sending in each restored environment.
5. Complete business review for RPO/RTO and retention requirements.
6. Add external monitoring/alert evidence once provider operations are live.
7. Reassess controlled-beta readiness after all required evidence is verified.
