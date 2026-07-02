# Backup, PITR, and Object Storage Pre-ASP Plan

Status: pre-ASP plan, not hosted proof
Date: 2026-07-02

## Current State

- Local/mock backup and object-storage proof scripts already exist.
- `BackupRestoreEvidence` exists in the Prisma model.
- Generated documents and attachments have archive/storage groundwork.
- Hosted PITR, hosted restore, real object storage, signed URL, lifecycle, and immutable retention proof are not completed.

## Before ASP Access

| Capability | Pre-ASP target | Current status |
| --- | --- | --- |
| database backup | Backup source and owner documented. | Planned; hosted proof pending. |
| PITR | PITR enabled and recoverability tested in non-production. | Blocked until hosted DB plan and credential window. |
| restore drill | At least one non-destructive restore drill with evidence. | Local/mock proof exists; hosted restore pending. |
| object storage | Provider config, tenant path policy, encryption, versioning, lifecycle, and denial proof. | Design exists; real bucket proof pending. |
| generated document archive | Metadata/hash/count integrity checks and retention policy. | Partial; legal retention review pending. |
| attachment storage | Tenant isolation and private object access proof. | Partial; provider proof pending. |

## Safe Execution Order

1. Keep local/mock proof scripts as non-production evidence only.
2. Choose hosted DB backup/PITR owner after final hosting decision.
3. Run a non-production restore drill into a separate database.
4. Compare migration history, row counts, checksum samples, and readiness endpoint.
5. Validate object-storage bucket policy in a test bucket.
6. Verify signed URL expiry, tenant path denial, lifecycle/versioning, and audit events.
7. Record genuine evidence in docs or evidence tables only after the drill actually runs.

## Explicit Non-Claims

- No hosted PITR proof is claimed.
- No object storage production proof is claimed.
- No signed URL readiness is claimed.
- No private document body was downloaded or uploaded in this PR.
