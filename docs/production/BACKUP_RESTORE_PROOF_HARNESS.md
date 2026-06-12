# Backup Restore Proof Harness

Date: 2026-06-12

Scope: safe local/mock proof only. This harness validates backup-manifest creation and restore-simulation mechanics with synthetic metadata only. It does not connect to any database, Supabase project, object-storage provider, or hosted environment.

## Current Backup/Restore Posture

- LedgerByte remains controlled beta/user-testing only.
- The application already exposes metadata-only backup-readiness and restore-drill-plan surfaces.
- Historical local Docker/Postgres restore-count evidence remains documented in `docs/BACKUP_AND_RESTORE_READINESS_PLAN.md`.
- Hosted Supabase/Postgres backup/PITR proof, hosted restore-drill proof, and object-storage backup/restore proof remain blocked.

## What This PR Proves

- `scripts/backup-restore-proof-harness.cjs` provides a standalone proof harness with Node core modules only.
- Default dry-run status is `BACKUP_RESTORE_PROOF_DRY_RUN_READY`.
- Mock-cycle status is `BACKUP_RESTORE_MOCK_CYCLE_PASSED`.
- The mock cycle proves:
  - synthetic backup manifest creation,
  - synthetic metadata payload creation,
  - sha256 checksum generation and verification,
  - manifest schema validation,
  - restore count verification for synthetic records,
  - safe relative payload paths inside a temp directory, and
  - temp-directory cleanup after verification unless `--keep-artifacts` is explicitly requested.
- The harness blocks unsafe artifact paths with `BACKUP_RESTORE_PROOF_BLOCKED_UNSAFE_PATH`.
- The harness blocks real-data requests with `BACKUP_RESTORE_PROOF_BLOCKED_REAL_DATA_REQUESTED`.
- The harness blocks missing proof surfaces with `BACKUP_RESTORE_PROOF_BLOCKED_MISSING_DOCS`.

## What This PR Does Not Prove

- No hosted Supabase/Postgres backup or PITR behavior.
- No hosted restore drill.
- No `pg_dump`, `pg_restore`, or provider restore command execution.
- No Prisma, database, or Supabase connectivity.
- No real object-storage backup or restore behavior.
- No production backup readiness.
- No production restore readiness.
- No disaster-recovery readiness.
- No customer-data restore proof.

## Dry-Run Status

- Command: `corepack pnpm backup:restore-proof -- --json --strict --dry-run`
- Result: `BACKUP_RESTORE_PROOF_DRY_RUN_READY`
- Dry-run behavior:
  - validates required docs and existing proof scripts,
  - reports the synthetic-only proof boundary,
  - reports the planned manifest schema and synthetic record counts,
  - writes no artifact files.

## Local/Mock Restore Proof Status

- Command: `corepack pnpm backup:restore-proof -- --json --strict --mock-cycle`
- Result: `BACKUP_RESTORE_MOCK_CYCLE_PASSED`
- Mock-cycle behavior:
  - creates a synthetic payload and manifest inside a temp directory only,
  - verifies manifest version, artifact type, created-at format, source mode, checksum, and record counts,
  - removes the temp artifact directory by default after verification.

## Synthetic-Data-Only Boundary

- Record families:
  - organization metadata
  - document metadata
  - attachment metadata
  - generated-document metadata
  - audit-event metadata
- No customer names, customer emails, vendor emails, database URLs, provider credentials, tokens, private keys, or document bodies are written.
- No file writes occur outside a temp directory.

## Relationship To Object Storage

- `docs/production/OBJECT_STORAGE_PROOF_PLAN.md` remains the local/mock object-storage lifecycle proof for synthetic attachment and generated-document payloads.
- This backup/restore harness complements that proof by validating synthetic manifest/payload packaging and restore-simulation mechanics only.
- It does not prove object-storage backup/export behavior.
- It does not prove object-storage restore/import behavior.

## Relationship To Database Backup/PITR

- The harness is not a database backup tool and does not exercise database snapshots.
- The harness does not validate hosted PITR settings, backup schedules, retention, or rollback.
- The earlier local Docker/Postgres restore-count evidence remains historical local evidence only and does not replace hosted proof requirements.

## Production Restore Proof Blockers

- Hosted Supabase/Postgres backup/PITR proof.
- Hosted non-production restore drill with metadata-only evidence.
- Real non-production object-storage backup proof.
- Real non-production object-storage restore proof.
- RPO/RTO review and owner sign-off.
- Monitoring and alerting for stale or failed backups.

## Next Implementation Ticket

`Production trust implementation ticket 3: monitoring and runtime health proof`
