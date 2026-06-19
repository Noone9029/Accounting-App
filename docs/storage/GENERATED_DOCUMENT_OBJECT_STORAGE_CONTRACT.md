# Generated Document Object Storage Contract

Date: 2026-06-19

Scope: production-readiness implementation contract only. This contract does not enable generated-document object storage, migrate generated documents, create real signed URLs, touch hosted buckets, change schema, apply migrations, apply SQL templates, roll out RLS, apply a runtime DB role, or add ZATCA/UAE provider production behavior.

2026-06-19 implementation-plan update: `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md` consumes this contract and defines the future phased path. The implementation plan keeps current DB-backed reads as the default, object storage disabled by default, signed URLs optional/proof-gated, and schema/migration work blocked until explicit approval.

2026-06-19 adapter-interface update: `apps/api/src/generated-documents/generated-document-storage.ts` now provides the first local generated-document storage adapter boundary. The runtime default is `DatabaseGeneratedDocumentStorageAdapter`. A fake local object adapter exists for tests only and is not runtime-registered. This does not enable generated-document object storage, signed URLs, hosted storage, schema changes, or migrations.

2026-06-19 disabled-object-adapter proof update: `DisabledGeneratedDocumentObjectStorageAdapter` now exists as a local fail-closed proof. Explicit generated-document object/S3-compatible adapter modes resolve to this disabled adapter, which throws disabled/not-configured errors for reads and writes and has no signed URL capability. Unknown generated-document storage modes fail closed. Runtime module wiring remains database-backed.

2026-06-19 fake-local-adapter proof update: `FakeLocalGeneratedDocumentObjectStorageAdapter` now proves local object-style adapter behavior with in-memory synthetic content only. It supports exact readback, generated-document-id anchored object keys, hash and size verification, missing-object failure, tenant-context mismatch rejection when org context is supplied, deterministic duplicate handling, and production-looking fake-adapter selection refusal. It is not a real object-storage adapter, not hosted storage, not signed URL support, and not production enablement.

2026-06-19 staging-gate design update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md` is now the required preflight contract before any future generated-document object adapter can run against staging object storage. It requires explicit approvals, dedicated staging bucket, staging-only credentials, synthetic tenants, `proofRunId`, dry-run/read-only-first ordering, rollback/cleanup plan, and sanitized evidence capture. It does not execute staging proof or implement object storage.

2026-06-19 staging preflight helper update: `scripts/generated-document-object-adapter-staging-preflight.cjs` now turns the staging-gate contract into a local-only preflight check. It evaluates required env vars and confirmations, rejects production-looking or ambiguous targets, requires distinct synthetic tenants, requires `proofRunId`, redacts credentials, and reports readiness without network or mutation. This helper is not a real adapter, not hosted object storage, not signed URL support, not proof execution, and not production enablement.

2026-06-19 staging runner design update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md` defines the future staging proof runner contract and `scripts/generated-document-object-adapter-staging-runner.cjs` adds a local-only fail-closed skeleton. Active modes are limited to `help`, `plan`, `preflight`, and `dry-run`; future hosted modes are blocked. This runner is not a real adapter, not hosted object storage, not signed URL support, not proof execution, and not production enablement.

2026-06-19 staging gate approval record update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_GATE_APPROVAL_RECORD.md` records gate approval status as `BLOCKED`. The contract remains unchanged: no hosted proof may run until explicit approval evidence and required staging inputs exist.

2026-06-19 approval evidence package update: `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_APPROVAL_EVIDENCE_PACKAGE.md` prepares the future approval packet and sign-off placeholders. The contract remains unchanged: the package is not approval, gates remain `BLOCKED`, the runner remains `NOT_READY`, generated documents remain DB-backed, real object storage remains unimplemented, and signed URLs remain unimplemented.

## Current State

Generated documents are currently database-backed unless a future code change proves otherwise. `GeneratedDocumentService.archivePdf()` creates `GeneratedDocument` rows with `storageProvider = "database"`, `contentBase64`, `contentHash`, `sizeBytes`, source metadata, and organization scope. `GeneratedDocumentService.download()` reads content by `{ id, organizationId }` and returns the database/base64 payload through the API.

The service now delegates content write/read/hash behavior to a generated-document storage adapter. The DB adapter preserves the same row fields and download behavior.

The disabled object adapter is diagnostic/proof code only. It does not connect to hosted object storage, does not read or write objects, does not generate signed URLs, and must not be treated as object-storage readiness.

The fake local object adapter is local/test proof code only. It does not connect to hosted object storage, does not use credentials, does not generate signed URLs, and must not be selected for production-looking environments.

The staging runner skeleton is local planning/proof-readiness code only. It does not read or write generated-document bodies, does not list or touch buckets, does not connect to a database, and does not change the runtime adapter selection.

Attachments have separate S3-compatible groundwork behind `ATTACHMENT_STORAGE_PROVIDER=s3`; generated documents do not use that adapter today. `StorageService` reports generated-document S3 as not implemented and keeps generated-document migration planning dry-run/count-only. Signed URLs are not implemented; `StorageProvider.getReadUrl` is only an optional interface hook and no provider issues URLs.

Generated-document archive creation now checks supported source ownership for these source types before writing archive rows: `BankReconciliation`, `CashExpense`, `CreditNote`, `CustomerPayment`, `CustomerRefund`, `DeliveryNote`, `InventoryVarianceProposal`, `PurchaseBill`, `PurchaseDebitNote`, `PurchaseOrder`, `PurchaseReceipt`, `SalesInvoice`, `SalesQuote`, `SalesStockIssue`, `SupplierPayment`, and `SupplierRefund`. Unsupported source types must not be promoted to production object storage without an explicit ownership check.

## Contract Goals

- Preserve tenant isolation through organization-scoped metadata and API authorization.
- Preserve immutable evidence expectations without claiming legal archive guarantees.
- Preserve SHA-256/content-hash integrity and content length checks.
- Preserve retention/archive compatibility and future legal-hold decisions.
- Keep retrieval API-mediated unless a future signed URL path is explicitly implemented and proven.
- Resolve object keys server-side from authorized metadata only.
- Keep generated artifacts provider-neutral unless a compliance rail explicitly owns them.
- Keep KSA and UAE compliance artifacts on separate future/gated rails.
- Avoid production compliance, storage-proof, signed-URL, RLS, or hosted-isolation claims until proven.

## Generated Document Categories

Current DB-backed generated-document categories are based on `DocumentType` and observed archive callers:

- Sales invoice PDF: current DB-backed generated document.
- Sales quote PDF: current DB-backed generated document.
- Delivery note PDF: current DB-backed generated document.
- Credit note PDF: current DB-backed generated document.
- Customer payment receipt PDF: current DB-backed generated document.
- Customer refund PDF: current DB-backed generated document.
- Customer statement PDF: current DB-backed generated document.
- Supplier statement PDF: current DB-backed generated document.
- Purchase order PDF: current DB-backed generated document.
- Purchase bill PDF: current DB-backed generated document.
- Purchase debit note PDF: current DB-backed generated document.
- Supplier payment receipt PDF: current DB-backed generated document.
- Supplier refund PDF: current DB-backed generated document.
- Cash expense PDF: current DB-backed generated document.
- General ledger, trial balance, profit and loss, and balance sheet report PDFs: current DB-backed generated documents.

Planned or future categories:

- Sales invoice XML and credit note XML are compliance/archive artifacts in the compliance rail, not active generated-document object-storage bodies.
- KSA ZATCA artifacts are future/gated KSA rail artifacts only; current invoice PDF archive stores safe metadata only and is not PDF/A-3 or ZATCA submission evidence.
- UAE PINT-AE artifacts are future/gated UAE rail artifacts only; local readiness metadata must not be treated as provider validation or production submission.
- Archive/evidence copies are future object-storage/retention artifacts until a separate archive model, retention policy, and restore proof exist.

## Metadata Contract

Required conceptual metadata for object-backed generated documents:

| Field | Status | Notes |
| --- | --- | --- |
| `organizationId` | Current | Required tenant scope on `GeneratedDocument`. |
| `generatedDocumentId` | Current | Current row id; must be the request and object-key anchor. |
| `sourceType` | Current | String source type; supported-source ownership checks exist for known delegates. |
| `sourceId` | Current | Source record id; must be verified against organization for creation. |
| `documentType` | Current | Prisma `DocumentType`. |
| `edition` or `market` | Planned | Needed only if compliance behavior depends on Generic/KSA/UAE rail. |
| `mimeType` | Current | Defaults to `application/pdf`. |
| `fileName` | Current as `filename` | Must be normalized before object-key use. |
| `storageBackend` | Current as `storageProvider` | Current value is `database`; future object-backed value must be explicit. |
| `storageBucket` or logical bucket | Planned | Do not store provider secrets. |
| `objectKey` | Current as nullable `storageKey` | Null for DB-backed rows; future object keys are server-derived. |
| `contentHash` / `sha256` | Current as `contentHash` | SHA-256 is produced for current PDF archive rows. |
| `contentLength` | Current as `sizeBytes` | Required for hash and restore verification. |
| `createdByUserId` | Current as `generatedById` | Nullable user reference. |
| `createdAt` / `generatedAt` | Current | Both are present. |
| `retentionClass` | Planned | Needs legal/accounting review. |
| `archiveState` | Planned | Current status is generated/failed/superseded, not legal archive state. |
| `legalHold` | Future | Requires policy and schema/design approval. |
| `version` or generation sequence | Future | Needed if duplicate output behavior becomes versioned beyond append-only rows. |
| `providerSubmissionId` | Future/gated | Only for future provider/compliance rails. |
| `complianceRail` | Future/gated | Generic/KSA/UAE rail marker if compliance artifacts are introduced. |

No schema changes are made by this contract. Schema or migration requirements must stop for explicit approval.

## Object Key Contract

Future generated-document object keys should use this conceptual shape:

```text
org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}
```

The key contract requires:

- Tenant prefix under `org/{organizationId}/`.
- Object type prefix `generated-documents`.
- Generated-document id in the key.
- Normalized filename with path traversal markers removed.
- No user-controlled object key input.
- No global flat paths.
- No provider secret in the key.
- No customer-sensitive data in the key.
- Stable enough shape for audit and restore evidence.
- Optional proof-run metadata for staging/proof execution, without changing production key semantics.

Source type, source id, and document type should remain metadata fields. They can be included in a future key only if the team accepts the extra path disclosure and keeps `generatedDocumentId` as the stable anchor.

## Authorization Contract

Generated-document retrieval must:

- Accept `generatedDocumentId`, never an object key, from the request.
- Verify active organization membership through the existing organization context.
- Verify `generatedDocuments.view` for metadata and `generatedDocuments.download` for content.
- Load generated-document metadata by `{ id, organizationId }`.
- Verify source record ownership for creation paths and for future object-backed restore/repair paths where practical.
- Verify edition gate before compliance-related artifact access.
- Authorize before resolving object keys.
- Authorize before any future signed URL generation.
- Return not-found/forbidden consistently without exposing object keys, buckets, URLs, or body details.
- Audit creation/download/URL issuance where audit paths exist, and explicitly document gaps where they do not.

## Hash And Integrity Contract

Every object-backed generated document should have:

- SHA-256 or equivalent content hash.
- Content length.
- MIME type.
- Generation timestamp.
- Source snapshot metadata or source version where available.
- Hash verification on retrieval, restore, migration, or sampled audit where practical.
- Metadata persisted with hash and size before the object is treated as durable.

The current database path already stores `contentHash` and `sizeBytes`. Future object storage must preserve equivalent values and prove hash equivalence during migration.

## Write Path Contract

Safe future object-backed write flow:

1. Render or generate content in memory or an approved temp path.
2. Validate tenant/source ownership before upload.
3. Derive object key server-side from organization id, generated document id, and safe filename.
4. Upload to object storage with content type, content hash, tenant id, and generated document id metadata where provider-safe.
5. Persist generated-document metadata transactionally as much as possible.
6. If upload succeeds but metadata fails, mark or clean up the orphan object through a proof-run/object-id scoped repair path.
7. If metadata succeeds but upload fails, leave the row failed or database-backed; do not point to missing object content.
8. Retry idempotently by generated document id or generation sequence to avoid duplicate durable objects.
9. Never switch production writes to object storage until staging proof, bucket policy proof, backup/restore proof, and owner sign-off exist.

## Read And Download Contract

Safe future read flow:

1. Request by generated-document id.
2. Verify organization membership, permission, metadata ownership, and edition/compliance gate if relevant.
3. Resolve metadata after authorization.
4. If database-backed, return database content through the API.
5. If object-backed, either stream through the API or generate a short-lived signed URL only after authorization and proof.
6. Audit download or signed URL issuance where supported.
7. Avoid secrets, signed URLs, object keys, and body content in logs.

## Migration Contract

Migration from database/base64 to object storage must be staged:

1. Keep DB content until restore proof exists.
2. Backfill object storage in staging/proof first with synthetic or approved non-customer data.
3. Write object metadata without deleting database content.
4. Verify hash equivalence between DB content and object content.
5. Run a dual-read or feature-flag period.
6. Roll back to database content if object retrieval fails.
7. Run backup/restore proof for metadata and object bodies.
8. Use production customer data only after explicit approval and owner sign-off.

## Failure And Rollback Contract

The implementation must handle:

- Upload failure without durable metadata pointing at a missing object.
- Metadata failure after upload through orphan repair or scoped cleanup.
- Hash mismatch by blocking download/migration completion and preserving DB source content.
- Download failure with fallback to DB content during dual-read.
- Stale signed URL after permission removal through short TTL and documented revocation posture.
- Legal hold or retention conflict by refusing destructive cleanup.
- Bucket unavailable by failing closed and preserving DB content.
- Partial migration with resumable batches and no cross-tenant cleanup.
- Retry behavior that does not create unrelated duplicate objects.

## Acceptance Criteria

Generated-document object storage is not production-ready until:

- Local contract tests pass.
- Staging proof gates are satisfied before any hosted object adapter execution.
- Staging bucket proof passes with synthetic tenants.
- Tenant A/B cross-access fails before body or URL access.
- Object key guessing fails.
- Hash verification passes.
- Backup/restore proof exists for metadata and object bodies.
- Signed URL proof exists if signed URLs are used.
- Retention/archive behavior is reviewed by owner/legal/accounting stakeholders.
- Observability records denied access without leaking body, URL, key, or secret data.
- Owner sign-off is complete.
- No customer data is used in proof without explicit approval.

## Explicit Non-Claims

- Generated-document object storage is not enabled.
- Signed URLs are not implemented.
- Hosted object-storage isolation is not proven.
- Staging object-storage isolation is not proven.
- Database RLS is not applied by this contract.
- Retention, legal hold, immutable archive, malware scan, backup, and restore guarantees are not complete.
- KSA ZATCA and UAE Peppol/PINT-AE/ASP provider production work remain blocked on provider/credential evidence and separate approval.
