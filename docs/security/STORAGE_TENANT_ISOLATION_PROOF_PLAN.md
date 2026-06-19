# Storage Tenant Isolation Proof Plan

Date: 2026-06-18

Scope: planning, audit, and documentation only. This pass did not run hosted commands, mutate hosted/customer data, generate real signed URLs, touch object storage, access real customer documents, change schemas, add migrations, deploy, or run Supabase commands.

2026-06-19 local proof update: a follow-up local-only API pass added regression coverage for attachment metadata/content denial, generated-document metadata/content denial, generated-document source ownership checks before archive creation, S3 object-key filename normalization, and storage readiness/migration-plan organization scoping. The pass fixed generated-document archive source ownership checks and S3 object-key traversal marker normalization without hosted commands, object-storage mutation, schema changes, migrations, RLS rollout, runtime role application, signed URL work, or provider work.

2026-06-19 signed URL/object-storage proof harness update: a local-only follow-up added `docs/security/SIGNED_URL_OBJECT_STORAGE_PROOF_PLAN.md`, a signed URL/object-storage risk register, and dry-run proof-plan output in `scripts/object-storage-proof-validate.cjs`. The harness still does not generate real signed URLs or touch hosted storage. It records authorization-before-URL requirements, object-key policy checks, staging allow/proofRunId gates, and production-looking storage target refusal.

2026-06-19 generated-document object-storage contract update: a local-only follow-up added `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md`, `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_RISK_REGISTER.md`, and generated-document object-storage contract output in `scripts/object-storage-proof-validate.cjs`. Generated documents remain database-backed; generated-document object storage and signed URLs remain not implemented. Future generated-document object keys must be tenant-prefixed, generated-document-id anchored, normalized, server-derived, and authorized before object-key or signed URL resolution.

2026-06-19 generated-document object-storage implementation-plan update: `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md` now defines the implementation sequence. The plan keeps DB-backed reads as the default, requires generated-document storage adapters before provider rollout, uses fake local object storage only for tests, keeps object writes/reads disabled until explicit staging proof, and stops for explicit approval before any schema or migration work.

2026-06-19 generated-document adapter-interface update: a local-only follow-up added `GeneratedDocumentStorageAdapter`, a database runtime default adapter, and a fake local object adapter for tests only. Generated-document archive/download behavior remains DB-backed and API-mediated. The fake adapter is not runtime-registered, and no hosted object storage, signed URL, schema migration, RLS/runtime role, or provider work was added.

2026-06-19 disabled generated-document object adapter proof update: a local-only follow-up added a disabled generated-document object adapter and selector guardrails. Database storage remains the default. Explicit object/S3-compatible generated-document modes resolve to a disabled adapter that throws before reads or writes, fake local object storage remains explicit local-test-only, and unknown modes fail closed. No hosted object storage, signed URL, schema migration, RLS/runtime role, generated-document migration, or provider work was added.

2026-06-19 fake local generated-document object adapter proof update: a local-only follow-up completed fake adapter proof behavior for synthetic in-memory generated-document objects. The fake adapter now verifies tenant-prefixed/generated-document-id anchored keys, exact readback, hash and byte-size metadata, missing-object failure, tenant-context mismatch rejection when organization context is supplied, deterministic duplicate handling, and production-looking fake-adapter selection refusal. Runtime generated-document storage remains database-backed. No hosted object storage, signed URL, schema migration, RLS/runtime role, generated-document migration, or provider work was added.

2026-06-19 generated-document object adapter staging-gate update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md` now defines the required approval, environment, credential, bucket policy, application, data, migration, execution, evidence, and rollback gates before any future generated-document object adapter may run against staging object storage. This is staging-gate design only; no hosted object storage was touched and no staging proof was executed.

2026-06-19 generated-document object adapter staging preflight helper update: `scripts/generated-document-object-adapter-staging-preflight.cjs` now evaluates those gates locally before any future proof runner. It requires staging/proof-only target classification, distinct synthetic tenant ids, `proofRunId`, allow flags, rollback/evidence confirmations, bucket-policy review, credential-scope review, and no-production-target confirmation. It does not connect to hosted storage, mutate hosted/customer data, generate signed URLs, change schema, apply RLS/runtime roles, or execute tenant-isolation proof.

2026-06-19 generated-document object adapter staging runner design update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md` now defines the future runner contract, modes, state machine, safety stops, evidence, rollback, and future execution sequence. `scripts/generated-document-object-adapter-staging-runner.cjs` is local-only and fail-closed: active modes are `help`, `plan`, `preflight`, and `dry-run`; hosted read/write/cleanup/evidence modes remain blocked placeholders. It does not connect to hosted storage, mutate hosted/customer data, generate signed URLs, change schema, apply RLS/runtime roles, or execute tenant-isolation proof.

2026-06-19 generated-document object adapter staging gate approval update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_GATE_APPROVAL_RECORD.md` records gate approval status as `BLOCKED`. Approval evidence and required staging inputs remain missing, so the runner is still `NOT_READY` and no storage tenant-isolation proof was executed.

## Current Storage Architecture

LedgerByte currently has two document/storage domains:

- Uploaded attachments use `Attachment` metadata and are database/base64-backed by default.
- Generated documents use `GeneratedDocument` metadata and remain database/base64-backed.

Uploaded attachments also have a feature-flagged S3-compatible adapter. When `ATTACHMENT_STORAGE_PROVIDER=s3` and required S3 configuration is present, new uploaded attachments are written by the API under:

```text
org/{organizationId}/attachments/{attachmentId}/{safeFilename}
```

Generated documents are not migrated to object storage yet. They are archived through `GeneratedDocumentService.archivePdf()` with `storageProvider = "database"` and `contentBase64`.

Downloads are API-mediated:

- `AttachmentController` uses JWT auth, organization context, permission checks, and `AttachmentService.download(organizationId, id)`.
- `GeneratedDocumentController` uses JWT auth, organization context, permission checks, and `GeneratedDocumentService.download(organizationId, id)`.
- The storage readiness and migration-plan endpoints are authenticated and organization-scoped.

What is implemented:

- Attachment list/get/download use `organizationId` predicates.
- Attachment upload validates the linked entity belongs to the same organization before storing metadata/body.
- Attachment soft-delete blocks future downloads.
- S3 attachment object keys include organization and attachment identifiers.
- S3 readiness reporting is configuration-only and does not print secrets.
- Storage migration planning is dry-run/count-only.

What appears local-only or planning-only:

- Database/base64 storage remains the default.
- Generated documents remain database-backed.
- Generated-document object adapter staging proof gates are documented, but not satisfied or executed.
- Generated-document object adapter staging preflight helper is implemented, local-only, and does not execute staging proof.
- Generated-document object adapter staging runner design and local-only skeleton are implemented, but hosted proof modes are future-gated and do not execute staging proof.
- The disabled generated-document object adapter is a fail-closed proof only.
- The fake local generated-document object adapter is local/test proof only and is not hosted storage.
- Migration execution, retention, backup/restore, live bucket probes, and object-store restore proof remain planned.

What is not yet proven:

- Hosted object-storage tenant isolation.
- Real signed URL behavior.
- Real generated-document object-storage behavior.
- Stale URL revocation after permission removal.
- Backup/restore tenant boundary for object storage.
- Production archive/retention guarantees.

## Tenant Scoping Requirements

Every storage object must be associated with a tenant through `organizationId`.

Every download must verify:

- The requester is authenticated.
- The requester has active membership in the request organization.
- The requester has the required document or attachment permission.
- The document or attachment metadata row belongs to the request organization.
- Deleted or superseded rows are handled according to policy.

Signed URLs, if introduced later, must be generated only after tenant authorization. The URL should be short-lived, scoped to one object, and auditable. The app must not expose direct bucket listing or broad prefixes to browsers.

Object keys must not be guessable as an authorization boundary. Even though S3 attachment keys currently include `organizationId` and `attachmentId`, access control must rely on API authorization and provider permissions, not obscurity.

Generated documents must follow the same tenant checks as uploaded attachments.

Archive records must remain tenant-scoped and must not imply permanent legal archive guarantees until retention, immutability, backup, restore, and legal review are complete.

## Proof Checklist

Required non-production proof before production:

| Proof item | Required evidence |
| --- | --- |
| Tenant A cannot list Tenant B documents | API list endpoints return only Tenant A rows for attachments, generated documents, archive records, and storage migration counts. |
| Tenant A cannot download Tenant B attachment | Cross-tenant attachment ID download returns forbidden/not found without body bytes. |
| Tenant A cannot download Tenant B generated document | Cross-tenant generated document ID download returns forbidden/not found without body bytes. |
| Tenant A cannot use guessed object key | Direct object access is blocked by bucket policy or provider permissions; API download still requires Tenant A metadata authorization. |
| Tenant A cannot use stale signed URL after permission removal, if signed URLs are supported | Either no signed URL exists, or URL TTL/revocation behavior is documented and tested. |
| Deleted attachment cannot be downloaded | Soft-deleted attachment metadata blocks API download even if object content still exists. |
| Audit records exist where implemented | Upload, delete, generated document archive, access, and denied access events are logged or explicit gaps are documented. |
| Storage paths include tenant/proof scoping | S3 attachment keys include `org/{organizationId}` and proof objects include a proof-run label or metadata. |
| No broad public bucket exposure | Bucket policy and provider settings block public list/read for tenant objects. |

## Future Staging Proof Requirements

Use only synthetic proof data:

- Synthetic Tenant A and Tenant B.
- Synthetic uploaded attachment for each tenant.
- Synthetic generated document record for each tenant.
- Synthetic archive/retention metadata if the flow exists.
- Proof-run ID label such as `LB-TENANT-PROOF:<proofRunId>` in metadata, notes, or filenames.

Read-only checks:

- List Tenant A storage metadata.
- Attempt to fetch Tenant B metadata by ID from Tenant A context.
- Attempt to download Tenant B attachment from Tenant A context.
- Attempt to download Tenant B generated document from Tenant A context.
- Verify storage readiness and migration-plan counts are organization-scoped.
- Verify no response includes secret config, raw database URLs, object-storage credentials, signed XML bodies, QR payloads, document bodies where metadata-only is expected, or unrelated tenant identifiers.

Mutation checks only in staging/proof environment after explicit approval:

- Create synthetic Tenant A and Tenant B attachments.
- Generate or insert synthetic generated documents through existing safe APIs or approved test adapters.
- Soft-delete a synthetic attachment and prove download is blocked.
- If signed URLs are later implemented, generate short-lived URLs only for synthetic objects and verify cross-tenant denial.
- Cleanup must be proof-run-ID scoped only.

## Remaining Blockers

- No hosted storage proof has been run.
- No real signed URL proof exists.
- Generated document object storage is not implemented.
- Generated document object-storage implementation is planned but not enabled.
- Database/base64 remains the default storage mode.
- No database-to-object-storage migration executor exists.
- No live bucket readiness probe has been run in this pass.
- No backup/restore proof exists for object storage.
- No production archive immutability or retention guarantee exists.
- No malware scanning, OCR, lifecycle policy, legal hold, or customer-data restore evidence is complete.
- No provider evidence is available for UAE ASP/Peppol or ZATCA production credentials, and this storage pass did not start provider work.

## Acceptance Criteria Before Production

Storage tenant isolation is not production-grade until:

- All proof checklist items pass in a staging/proof environment with synthetic tenants.
- Bucket/provider permissions block public list/read and direct cross-tenant access.
- API download authorization remains mandatory for attachments and generated documents.
- Signed URL behavior, if added, is short-lived, tenant-authorized, and logged.
- Generated documents have an object-storage design and proof equivalent to attachments.
- Backup/restore and retention evidence covers both database metadata and object bodies.
- Denied cross-tenant access is observable without leaking document bodies or secrets.
- Security/legal/accounting owners sign off on the exact retention and archive posture.

## Safety Confirmation For This Pass

- No hosted commands were run.
- No hosted/customer data was mutated.
- No object storage was mutated.
- No real signed URL was generated.
- No real customer document was accessed.
- No schema or migration changes were made.
- No generated-document object-storage implementation was added.
- No generated-document object adapter staging proof was executed.
- No ZATCA production work was added.
- No UAE Peppol/PINT-AE/ASP production work was added.
- Provider evidence remains unavailable.
