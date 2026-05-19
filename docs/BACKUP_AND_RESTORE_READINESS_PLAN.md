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

## Blocked / Remaining

- Real Supabase backup and PITR configuration must be verified outside LedgerByte.
- Real object-storage backup policy and restore test are not implemented by the app.
- Generated documents remain database-backed.
- No restore executor exists in LedgerByte.
- RPO/RTO review is not complete.
- Legal/accounting retention duration is not decided here.
- Production storage hardening, monitoring/alerts, browser E2E expansion, billing/support operations, and real ZATCA OTP/CSID remain separate blockers.

## Staged Implementation Plan

1. Capture metadata-only evidence for database backups, PITR, migration history, object storage backups, generated document backups, and attachment backups.
2. Run a non-production restore drill outside LedgerByte and capture restore drill evidence.
3. Verify accounting reports, documents, attachments, ZATCA non-production state, and disabled email sending in the restored environment.
4. Complete business review for RPO/RTO and retention requirements.
5. Add external monitoring/alert evidence once provider operations are live.
6. Reassess controlled-beta readiness after all required evidence is verified.
