# Generated Document Object Storage Implementation Plan

Date: 2026-06-19

Scope: production-readiness implementation planning only. This plan does not implement generated-document object storage, create Prisma migrations, apply schema changes, touch hosted buckets, run hosted storage probes, generate real signed URLs, migrate generated-document content, apply SQL templates, roll out RLS, apply runtime DB roles, or add ZATCA/UAE provider work.

## Purpose

Move generated documents toward object storage safely while preserving the current database-backed behavior until staging proof, backup/restore proof, retention/legal review, and owner approval are complete.

The plan answers how LedgerByte should move from the generated-document object-storage contract to implementation without breaking current generated-document reads, without touching hosted storage, and without enabling production storage claims.

## Current State

Generated documents are DB-backed. `GeneratedDocumentService.archivePdf()` creates `GeneratedDocument` rows with `storageProvider = "database"`, `contentBase64`, `contentHash`, `sizeBytes`, `filename`, `mimeType`, source metadata, and `organizationId`. `GeneratedDocumentService.download()` loads content by `{ id, organizationId }` and returns API-mediated PDF bytes from database/base64 content.

Generated-document metadata/list routes use `GeneratedDocumentController` and require JWT auth, organization context, permission guards, and `generatedDocuments.view` or `generatedDocuments.download`. Current generated-document source ownership checks exist for supported archive source delegates before archive row creation.

Attachments have separate S3-compatible groundwork through `AttachmentStorageService`, `DatabaseAttachmentStorageService`, and `S3AttachmentStorageService`. Attachment object keys use `org/{organizationId}/attachments/{attachmentId}/{safeFilename}` when S3 is configured. Generated documents do not yet use the attachment adapter and should stay logically separate even if a future bucket is shared.

Signed URLs are not implemented. `StorageProvider.getReadUrl` is only an optional interface hook, and no provider issues URLs.

No hosted generated-document object-storage proof exists. No bucket policy proof, backup/restore proof, retention/legal-hold proof, malware-scan evidence, or owner approval exists for production generated-document object storage.

`apps/api/src/documents` does not exist in this checkout. Current generated-document frontend archive behavior lives under `/documents`, backed by `/generated-documents` API routes.

2026-06-19 adapter-interface implementation update: Phase B now has an initial scaffold in `apps/api/src/generated-documents/generated-document-storage.ts`. The runtime module registers `DatabaseGeneratedDocumentStorageAdapter` as the generated-document default. `GeneratedDocumentService.archivePdf()` and `download()` use the adapter boundary while preserving DB-backed rows and API-mediated downloads. `FakeLocalGeneratedDocumentObjectStorageAdapter` exists for local tests only and is not runtime-registered. Generated-document object storage and signed URLs remain disabled/unimplemented.

2026-06-19 disabled-object-adapter proof update: Phase D now has a disabled generated-document object adapter proof, not a real object adapter. `DisabledGeneratedDocumentObjectStorageAdapter` reports `object-storage-unavailable` and throws disabled/not-configured errors for generated-document reads and writes. `createGeneratedDocumentStorageAdapter()` defaults to the DB adapter, gates the fake local adapter behind an explicit local-test-only option, maps explicit object/S3-compatible modes to the disabled adapter, and fails closed on unknown modes. The Nest runtime module remains DB-backed and does not use this selector for production object storage.

2026-06-19 fake-local-adapter proof update: Phase C now has completed local fake-object proof behavior. The fake adapter stores synthetic content in memory, returns exact content through the adapter boundary, derives tenant-prefixed/generated-document-id anchored keys, verifies SHA-256 and byte size metadata, rejects missing objects, rejects tenant-context mismatches when organization context is supplied, and handles duplicate writes deterministically. The selector refuses fake local adapter selection for production-looking environments. This is local/test-only proof machinery; it does not implement real object storage, hosted storage, signed URLs, schema changes, migrations, or production storage enablement.

2026-06-19 staging-gate design update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md` now defines the approval, environment, credential, bucket policy, application, data, migration, execution, evidence, and rollback gates required before any future generated-document object adapter may run against staging object storage. This is gate design only. It does not implement a real adapter, touch hosted storage, generate signed URLs, change schema, create migrations, or run staging proof.

2026-06-19 staging preflight helper update: `scripts/generated-document-object-adapter-staging-preflight.cjs` now performs local-only preflight validation for those future staging gates. It checks explicit environment variables, `proofRunId`, staging/proof target classification, bucket naming, distinct synthetic tenant ids, allow flags, rollback/evidence confirmations, bucket-policy review, credential-scope review, and no-production-target confirmation. It redacts secret-like values, never validates credentials over the network, never connects to hosted storage or databases, and never mutates hosted/customer data. This does not change the phase plan: real object adapter implementation, staged proof execution, signed URLs, schema/migration changes, and production rollout remain separate blocked phases.

2026-06-19 staging runner design update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md` now defines the future runner contract, modes, state machine, safety stops, evidence outputs, rollback flow, and future execution sequence. `scripts/generated-document-object-adapter-staging-runner.cjs` is a local-only fail-closed skeleton with active `help`, `plan`, `preflight`, and `dry-run` modes only. Future hosted read/write/cleanup/evidence modes are blocked placeholders. The skeleton does not connect to hosted storage or databases, does not mutate, does not generate signed URLs, does not implement a real object adapter, and does not change runtime generated-document storage from database-backed.

2026-06-19 staging gate approval record update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_GATE_APPROVAL_RECORD.md` records the current gate approval status as `BLOCKED`. No explicit approval evidence was found for the exact staging-only proof scope, so Phase F remains blocked before any future runner execution.

## Implementation Principles

- Preserve DB-backed reads and downloads until object reads are proven.
- Keep object storage disabled by default.
- Introduce a generated-document storage interface before adding any object provider.
- Keep API-mediated authorization first; object keys are not an authorization boundary.
- Derive object keys server-side only after organization, permission, metadata, and source checks.
- Anchor object keys by generated document id: `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`.
- Preserve SHA-256 hash and content length verification.
- Keep generated documents separate from uploaded attachments.
- Keep signed URLs optional and proof-gated, not required for the first object-storage implementation.
- Keep Generic neutral, KSA artifacts KSA-gated, and UAE artifacts UAE-gated.
- Keep rollback available before rollout.
- Do not claim production storage readiness until staged evidence exists.

## Proposed Phase Breakdown

### Phase A: Local Interface And Adapter Design Only

Define a generated-document storage adapter contract in docs and types, but keep runtime behavior unchanged.

Acceptance criteria:

- Adapter methods and metadata contract are reviewed.
- No provider code writes hosted objects.
- Current generated-document tests still prove DB-backed behavior.

Likely files:

- `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md`
- `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md`
- `scripts/object-storage-proof-validate.cjs`
- `scripts/object-storage-proof-validate.test.cjs`

### Phase B: Generated-Document Storage Interface With DB Adapter As Default

Add a generated-document-specific storage boundary and a database adapter that preserves current behavior.

Status: initial local scaffold implemented on 2026-06-19. The DB adapter is the runtime default; no object adapter is runtime-selectable.

Acceptance criteria:

- `archivePdf()` still stores DB/base64 by default.
- `download()` still returns DB-backed bytes through the API.
- No current caller needs to know whether storage is database or object-backed.

Likely files:

- `apps/api/src/generated-documents/generated-document.service.ts`
- `apps/api/src/generated-documents/generated-document.module.ts`
- future `apps/api/src/generated-documents/generated-document-storage.service.ts`
- `apps/api/src/generated-documents/generated-document-rules.spec.ts`

### Phase C: Fake Local Object-Storage Adapter For Tests Only

Add an in-memory or temp-directory fake adapter for local tests. It must not connect to hosted storage.

Status: initial in-memory fake implemented on 2026-06-19 for direct local tests only. It is not registered as a runtime provider.

Acceptance criteria:

- Fake adapter stores by tenant-scoped generated-document-id key.
- Path traversal filenames are normalized.
- Hash mismatch and missing object scenarios fail closed.

Likely files:

- future `apps/api/src/generated-documents/generated-document-storage.service.ts`
- `apps/api/src/generated-documents/generated-document-rules.spec.ts`
- `scripts/object-storage-proof-validate.cjs`
- `scripts/object-storage-proof-validate.test.cjs`

### Phase D: Object-Storage Adapter Behind Disabled Feature Flag

Add a future S3-compatible generated-document adapter only behind disabled flags and with no production default.

Status: disabled proof only on 2026-06-19. A fail-closed disabled object adapter and selector guardrails exist, but no hosted provider, credentials, bucket calls, signed URLs, schema changes, migrations, generated-document migration, or runtime object-storage rollout exists.

Acceptance criteria:

- Default remains DB-backed.
- Object writes require explicit non-production enablement.
- No signed URL path is required for this phase.
- API-mediated reads remain available.
- Explicit object/S3-compatible selection fails closed until a real adapter is separately approved and implemented.

Likely files:

- `apps/api/src/storage/storage-configuration.service.ts`
- `apps/api/src/storage/storage-provider.ts`
- future generated-document object adapter
- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/storage/storage.service.spec.ts`

### Phase E: Metadata Fields Or Migration Plan If Required

Decide whether current fields are enough for staged implementation or whether new metadata fields are required. Stop for explicit approval before creating any migration.

Acceptance criteria:

- Current, missing, and future metadata fields are documented.
- No Prisma migration is created without approval.
- Existing DB-backed content remains readable.

Likely files:

- `apps/api/prisma/schema.prisma` only in a later approved migration phase
- future Prisma migration only after explicit approval
- generated-document service and tests after generated Prisma types are updated

### Phase F: Staging Object-Storage Proof With Synthetic Tenants

Use a dedicated staging/proof bucket and synthetic tenants only. This plan does not execute that proof.

Status: staging proof gate model, local preflight helper, and local-only runner design/skeleton documented on 2026-06-19. Future proof execution remains blocked until explicit approvals, dedicated staging bucket, staging-only credentials, synthetic Tenant A/B ids, `proofRunId`, allow flags, bucket policy review, rollback/cleanup plan, sanitized evidence plan, and a real generated-document object adapter are all present.

Acceptance criteria:

- Tenant A cannot access Tenant B generated object through API or provider path.
- Object key guessing fails.
- Hash verification passes.
- Cleanup is proof-run-id scoped only.

Likely files:

- proof harness docs/scripts in a later approved proof branch
- generated-document tests
- storage tenant isolation proof docs

### Phase G: Backfill/Migration Rehearsal

Rehearse copying DB-backed generated-document bodies to object storage while keeping DB content.

Acceptance criteria:

- DB content remains available.
- Object content hash equals DB content hash.
- Partial failure leaves no metadata pointing at missing objects.
- Rollback to DB-backed reads is rehearsed.

Likely files:

- future migration executor script
- generated-document storage adapter
- storage migration plan docs
- backup/restore proof harness docs

### Phase H: Signed URL Implementation Only If Required

Keep API streaming unless signed URLs are required for performance or provider constraints. Signed URLs require separate proof.

Acceptance criteria:

- Authorization happens before URL generation.
- Requests accept generated document id, not object key.
- URLs are short-lived and not logged.
- Stale-permission behavior is documented and tested.

Likely files:

- `apps/api/src/generated-documents/generated-document.controller.ts`
- `apps/api/src/generated-documents/generated-document.service.ts`
- `apps/api/src/storage/storage-provider.ts`
- signed URL proof docs/tests

### Phase I: Production Rollout After Proof And Approval

Production rollout is blocked until owner/legal/accounting/security approval and proof evidence exist.

Acceptance criteria:

- Staging proof passes with synthetic tenants.
- Bucket policy proof passes.
- Backup/restore proof covers metadata and object bodies.
- Retention, legal hold, cleanup, and malware-scan posture are approved.
- Observability captures denial/failure evidence without leaking keys or bodies.

## File-By-File Implementation Map

| File or area | Future role | Notes |
| --- | --- | --- |
| `apps/api/src/generated-documents/generated-document.service.ts` | Main write/read orchestration | Keep `archivePdf()` and `download()` compatibility; call adapter behind default DB behavior. |
| `apps/api/src/generated-documents/generated-document.controller.ts` | API-mediated list/get/download and possible future signed URL endpoint | Keep request input as generated document id, never object key. |
| `apps/api/src/generated-documents/generated-document-permissions.ts` | Permission helper | Preserve generated-document download permission semantics. |
| `apps/api/src/generated-documents/generated-document-rules.spec.ts` | Local generated-document behavior tests | Add adapter, fallback, hash, dual-write, and tenant tests in future phases. |
| `apps/api/src/generated-documents/generated-document.module.ts` | Dependency injection boundary | Register DB adapter by default; object adapter only when explicitly enabled. |
| future `generated-document-storage.service.ts` | Adapter contract and DB/fake/object adapters | Keep separate from attachment storage even if helper code is shared. |
| `apps/api/src/storage/storage-configuration.service.ts` | Feature flag/config parsing | Future generated-document flags should default disabled. |
| `apps/api/src/storage/storage-provider.ts` | Shared low-level object provider concepts | Reuse cautiously; generated documents need document-specific metadata and fallback behavior. |
| `apps/api/src/attachments/attachment-storage.service.ts` | Existing attachment S3 helper patterns | Reuse filename/key sanitization patterns, not attachment-specific key shape. |
| `apps/api/src/storage/storage.service.ts` | Readiness and dry-run migration counts | Keep generated-document storage as planned/not enabled until implementation proof. |
| `apps/api/prisma/schema.prisma` | Future metadata fields if approved | No migration in this plan. Stop for approval if fields are required. |
| `apps/api/src/email/email.service.ts` | Generated-document email outbox references | Ensure email attachment/source lookup remains generated-document-id based. No real email work in this plan. |
| `apps/web/src/app/(app)/documents/page.tsx` | Archive list and download UI | Should remain compatible with API-mediated downloads. |
| `apps/web/src/lib/pdf-download.ts` | Current download path helper | Continue using `/generated-documents/{id}/download` unless a future signed URL flow is explicitly designed. |
| `apps/web/src/app/(app)/settings/storage/page.tsx` | Readiness/migration surface | Keep wording conservative: planned/proof-gated, not enabled. |
| `scripts/object-storage-proof-validate.cjs` | Local-only proof/plan validator | No network or hosted mutation. Track disabled defaults and fallback requirements. |
| `scripts/object-storage-proof-validate.test.cjs` | Validator guard tests | Prove implementation-plan guardrails remain local-only. |
| docs under `docs/storage` and `docs/security` | Contract, risk, proof, and roadmap | Must keep non-claim wording current. |

## Current Generated-Document Source Types

Supported source ownership delegates in `GeneratedDocumentService` are:

- `BankReconciliation`
- `CashExpense`
- `CreditNote`
- `CustomerPayment`
- `CustomerRefund`
- `DeliveryNote`
- `InventoryVarianceProposal`
- `PurchaseBill`
- `PurchaseDebitNote`
- `PurchaseOrder`
- `PurchaseReceipt`
- `SalesInvoice`
- `SalesQuote`
- `SalesStockIssue`
- `SupplierPayment`
- `SupplierRefund`

Observed archive callers include bank reconciliation reports, customer and supplier payments/refunds, credit notes, cash expenses, contact statements, delivery notes, purchase bills, purchase debit notes, purchase orders, reports, sales invoices, sales quotes, and supplier payments/refunds. Future object storage should stay centralized in `GeneratedDocumentService` instead of pushing object writes into each caller.

## Feature Flag Plan

Conceptual flag names:

- `LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_STORAGE_ENABLED`
- `LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_STORAGE_DRY_RUN`
- `LEDGERBYTE_GENERATED_DOCUMENT_DUAL_WRITE_ENABLED`
- `LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_READ_ENABLED`

Safe defaults:

- Object storage disabled by default.
- DB-backed read path remains default.
- Object write disabled unless explicitly enabled in staging/proof.
- Object read disabled until write/hash proof passes.
- Dual write disabled until staging proof.
- Production disabled until owner approval.

Do not implement these flags in this planning pass except as local validator/documentation concepts.

## Metadata And Schema Decision

Current schema can represent a minimal object-backed row because `GeneratedDocument` already has `storageProvider`, nullable `storageKey`, `contentHash`, and `sizeBytes`. It can also keep `contentBase64` for DB fallback.

However, production-grade object storage likely needs additional metadata for lifecycle, proof, and restore operations. Those additions require a future schema/migration approval.

| Metadata | Status | Decision |
| --- | --- | --- |
| `organizationId` | Current | Tenant scope. |
| `id` / generated document id | Current | Object-key anchor. |
| `documentType` | Current | Document category. |
| `sourceType` | Current | Source ownership delegate input. |
| `sourceId` | Current | Source ownership delegate input. |
| `filename` | Current | Normalize for object-key filename segment. |
| `mimeType` | Current | Required for object metadata and downloads. |
| `storageProvider` | Current | Current value is `database`; future object-backed value must be explicit. |
| `storageKey` / object key | Current nullable | Future server-derived key. |
| `contentHash` / SHA-256 | Current | Use for object write, read, migration, and restore verification. |
| `sizeBytes` / content length | Current | Use with hash verification. |
| `contentBase64` | Current nullable | Keep through proof and rollback. |
| `status` | Current | Generated/failed/superseded, not legal archive state. |
| bucket or logical bucket | Missing/future | Required if multiple buckets or logical storage domains are used. |
| `retentionClass` | Missing/future | Requires legal/accounting/security review. |
| `archiveState` | Missing/future | Required if legal archive behavior becomes distinct from generation status. |
| `legalHold` | Missing/future | Requires policy and schema approval. |
| `generationVersion` | Missing/future | Needed if output version semantics become explicit. |
| `sourceSnapshotHash` | Missing/future | Needed for stronger source-to-output evidence. |
| `objectUploadedAt` | Missing/future | Useful for staged proof and observability. |
| `objectVerifiedAt` | Missing/future | Useful for migration/restore proof. |

Schema stop rule: if the future implementation needs missing fields, stop and request explicit schema/migration approval before changing Prisma or creating migrations.

## Adapter Contract

Conceptual methods:

- `writeGeneratedDocument`
- `readGeneratedDocument`
- `deleteGeneratedDocument` only if retention/legal review allows it
- `verifyGeneratedDocumentHash`
- `deriveGeneratedDocumentObjectKey`
- `getGeneratedDocumentMetadata`
- `migrateGeneratedDocumentToObjectStorage`
- `restoreGeneratedDocumentFromObjectStorage`

DB adapter behavior:

- Default adapter.
- Stores and reads `contentBase64`.
- Uses current `contentHash`, `sizeBytes`, `filename`, and `mimeType`.
- Never requires S3 config.

Fake local object-storage adapter behavior:

- Tests only.
- Uses temp directory or in-memory map.
- Writes synthetic content only.
- Uses `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`.
- Verifies hash and cleanup without network.

Future S3/object adapter behavior:

- Disabled by default.
- Requires explicit non-production configuration and proof gates.
- Writes content type, hash, organization id, generated document id, and proof run metadata where provider-safe.
- Reads only after API authorization and metadata lookup.
- Does not generate signed URLs unless the signed URL phase is separately approved and proven.

## Dual-Write And Rollback Plan

Modes:

- DB-only current mode: write DB/base64, read DB/base64.
- Dry-run planning mode: derive key and metadata without hosted writes.
- Dual-write staging mode: write DB/base64 first, then object storage, keeping DB content.
- Object-read staging mode: read object-backed rows after hash proof, with DB fallback.
- DB fallback mode: disable object reads and return to DB/base64.

Failure handling:

- If upload fails, keep DB-backed row or mark failed without pointing metadata at a missing object.
- If metadata write fails after upload, use proof-run or object-id scoped orphan cleanup.
- If hash mismatches, block object-read cutover and preserve DB content.
- If metadata/object split-brain is detected, prefer DB fallback and repair metadata/object state.
- If cleanup is needed, limit it to proof-run/object-id scope and honor retention/legal-hold decisions.
- Retries must be idempotent by generated document id or generation sequence.

## Local Test Plan

Future tests:

- DB adapter preserves current archive and download behavior.
- Fake object-storage adapter stores by tenant-scoped generated document id key.
- Object key rejects traversal and unsafe slash shapes.
- Hash mismatch fails closed.
- Dual-write failure leaves DB fallback intact.
- Object-read fallback uses DB when object reads are disabled.
- Tenant A cannot read Tenant B generated object.
- Generated-document source ownership is checked before write/read repair.
- Metadata is resolved by `{ id, organizationId }` before object key resolution.
- Signed URL path, if later added, refuses direct object-key input.
- Generic output stays neutral; KSA artifacts stay KSA-gated; UAE artifacts stay UAE-gated.

## Staging Proof Plan

Future proof sequence:

1. Run local dry-run.
2. Run fake adapter proof with synthetic non-customer payloads.
3. Satisfy `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md`.
4. Run `node scripts/generated-document-object-adapter-staging-preflight.cjs --json --strict --dry-run` with approved staging/proof-only inputs.
5. Configure a dedicated staging/proof bucket after approval.
6. Create or seed synthetic Tenant A and Tenant B only after explicit staging mutation approval.
7. Write synthetic generated documents through a separately approved proof runner.
8. Attempt cross-tenant generated-document metadata and content access.
9. Attempt object-key guessing.
10. Verify hashes and content lengths.
11. Rehearse DB fallback and rollback.
12. Rehearse cleanup scoped to `proofRunId` only.
13. Capture sanitized evidence without keys, signed URLs, credentials, or document bodies.

No customer data may be used in this proof without separate explicit approval.

## Acceptance Criteria

Generated-document object storage is not production-ready until:

- DB-backed compatibility is proven.
- Object adapter is tested locally.
- Metadata migration is approved and applied in staging if needed.
- Staging object-storage proof passes with synthetic tenants.
- Bucket policy proof passes.
- Signed URL proof passes if URLs are used.
- Backup/restore proof passes for metadata and object bodies.
- Retention/legal-hold/malware-scan plan is approved.
- Observability records access and denial events without leaking keys or bodies.
- Owner/legal/accounting sign-off is complete.
- No active production storage claim is added.

## Explicit Non-Claims

- Generated documents remain DB-backed.
- Generated-document object storage is planned, not enabled.
- Signed URLs are planned/proof-gated, not enabled.
- Hosted object-storage proof remains pending.
- Bucket policy proof remains pending.
- Backup/restore proof remains pending.
- Retention/legal-hold/malware-scan evidence remains pending.
- No schema or migration change is made by this plan.
- No hosted/customer data or hosted bucket is touched by this plan.
- No ZATCA production or UAE Peppol/PINT-AE/ASP provider work is added by this plan.
