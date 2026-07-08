# Backup and Restore Readiness Plan

## Purpose

LedgerByte now has a metadata-only backup and restore readiness surface for controlled-beta operations. The current implementation records evidence and exposes plans only; it does not run database backups, copy object-storage data, export customer data, restore snapshots, or expose secrets.

## 2026-06-12 Backup/Restore Proof Harness

- `scripts/backup-restore-proof-harness.cjs` and `scripts/backup-restore-proof-harness.test.cjs` now add a safe local/mock proof harness for synthetic backup-manifest and restore-simulation mechanics.
- Package scripts:
  - `corepack pnpm backup:restore-proof -- --json --strict --dry-run`
  - `corepack pnpm backup:restore-proof -- --json --strict --mock-cycle`
- Current harness statuses:
  - `BACKUP_RESTORE_PROOF_DRY_RUN_READY`
  - `BACKUP_RESTORE_MOCK_CYCLE_PASSED`
- This harness is synthetic-only and temp-directory-only. It does not run `pg_dump`, `pg_restore`, Supabase PITR, object-storage export/import, or any real customer-data restore path.
- This harness does not replace hosted backup/PITR proof, hosted restore-drill proof, object-storage backup proof, or object-storage restore proof.

## 2026-07-08 Local PostgreSQL Drill Groundwork

- `apps/api/src/disaster-recovery/local-postgres-drill.ts` and `apps/api/scripts/local-postgres-drill.ts` add local PostgreSQL backup/restore drill tooling.
- Package scripts:
  - `corepack pnpm backup:local-postgres-drill -- --mode plan --json --evidence-dir artifacts/backup-restore-drill`
  - `corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode backup --execute --backup-output-dir artifacts/backup-restore-drill/backups`
  - `corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode restore --execute --backup-file artifacts/backup-restore-drill/backups/<file>.dump`
  - `corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode verify --execute`
  - `corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode drill --execute --prepare-fixture --backup-output-dir artifacts/backup-restore-drill/backups --evidence-dir artifacts/backup-restore-drill`
- Execution modes require:
  - `LEDGERBYTE_DR_SOURCE_DATABASE_URL` for backup/drill,
  - `LEDGERBYTE_DR_RESTORE_DATABASE_URL` for restore/verify/drill,
  - `LEDGERBYTE_LOCAL_BACKUP_RESTORE_APPROVAL=I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_NON_PRODUCTION_TARGET`.
- `--prepare-fixture` is execution-only and drill-only. It drops and recreates only the classified disposable local source/restore databases, applies Prisma migrations to the source database, and seeds local synthetic production-shaped rows before backup.
- When local PostgreSQL client tools are not installed, the drill can run `pg_dump`, `pg_restore`, and `psql` inside the local Docker compose `postgres` service with `LEDGERBYTE_DR_PG_TOOLS=docker-compose` and `LEDGERBYTE_DR_PG_DOCKER_COMPOSE_FILE=infra/docker-compose.yml`.
- The classifier blocks hosted, remote, production, beta, staging, user-testing, customer-looking, and non-PostgreSQL targets.
- Restore execution is additionally blocked unless the restore database is local and disposable-looking, such as a database name containing `restore`, `drill`, `disposable`, `tmp`, `temp`, `test`, or `local`.
- Fixture preparation additionally requires the source database to be disposable-looking; the active local development `accounting` database is not accepted as a fixture source.
- Backup output is limited to `artifacts/` or the OS temp directory and reports filename, SHA-256 checksum, size, and sanitized target classification.
- Restore verification checks seeded core accounting tables, Prisma migration history, tenant-scoped counts, a no-cross-tenant journal-line/account check, nullable and non-null `requestId` coverage on audit/generated-document/document-inbox/payment-provider records, and seeded invoice payment-link table restoration.
- Evidence output can be generated as redacted JSON and Markdown. It never includes database URLs, passwords, tokens, provider payloads, document bodies, PDFs, XML contents, private data, or raw customer data.
- This tooling still does not prove hosted production recovery, hosted PITR, object-storage recovery, RPO/RTO approval, or disaster-recovery readiness.

### Evidence Modes

- Plan-mode evidence: produced by `--mode plan`; no database backup, restore, migration, seed, `pg_dump`, `pg_restore`, or `psql` execution occurs.
- Executed local drill evidence: produced by `--mode drill --execute --prepare-fixture` against localhost/Docker disposable databases only; it can prove local PostgreSQL dump/restore mechanics and seeded restore checks for that machine.
- Hosted production recovery: still unproven. This local drill must not be used as proof that production backups or restores work.
- Hosted PITR: still unproven. PITR needs provider-specific non-production evidence.
- Object-storage recovery: still unproven. Database-backed document metadata can be counted here, but object backup/export/import is outside this drill.
- RPO/RTO: still unapproved. This drill records elapsed mechanics only and does not infer business recovery targets.

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
- `scripts/backup-restore-proof-harness.cjs`
- `scripts/backup-restore-proof-harness.test.cjs`
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
- The synthetic proof harness verifies local/mock manifest and restore mechanics only; it does not prove hosted recovery or disaster recovery.
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
