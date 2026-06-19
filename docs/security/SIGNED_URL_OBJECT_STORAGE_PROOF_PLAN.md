# Signed URL Object Storage Proof Plan

Date: 2026-06-19

Scope: local-only signed URL and object-storage proof design plus safe validator scaffolding. This pass does not run hosted commands, mutate hosted/customer data, touch hosted object storage, generate real hosted signed URLs, change schemas, add migrations, apply SQL templates, roll out RLS, apply runtime DB roles, or start ZATCA/UAE provider work.

## Current State

- Signed URLs are not implemented in the current runtime path. `StorageProvider.getReadUrl` exists as an optional interface hook, but no provider implements signed URL issuance.
- Uploaded attachments are database/base64-backed by default. The S3-compatible attachment adapter is feature-flagged groundwork for new uploaded attachments and writes keys under `org/{organizationId}/attachments/{attachmentId}/{safeFilename}` when configured.
- Generated documents remain database-backed through `GeneratedDocumentService.archivePdf()` and `contentBase64`. Generated-document S3 writes are not implemented.
- Generated-document content now flows through `GeneratedDocumentStorageAdapter` with `DatabaseGeneratedDocumentStorageAdapter` as the runtime default. The fake local object adapter is test-only and not runtime-registered.
- Explicit generated-document object/S3-compatible adapter selection now resolves to a disabled fail-closed adapter. The disabled adapter has no signed URL method and throws disabled/not-configured errors before any generated-document object read or write.
- The fake local generated-document object adapter now proves in-memory object-style write/read/hash/size/key/missing-object/tenant-context/duplicate behavior for local tests only. It has no signed URL method and is refused for production-looking selection.
- The generated-document object-storage contract now requires future generated-document object keys to be tenant-prefixed and generated-document-id anchored, with object keys resolved only after authorization.
- The generated-document object-storage implementation plan keeps generated documents DB-backed by default and requires DB fallback, disabled object reads, synthetic staging proof, and owner approval before any object-backed rollout.
- `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md` now defines the required gates before any future generated-document object adapter can run against staging object storage. Signed URLs remain outside that proof unless a separate signed URL gate is approved.
- `scripts/generated-document-object-adapter-staging-preflight.cjs` now evaluates those future generated-document object adapter staging gates locally. It does not generate signed URLs, does not validate credentials over the network, and does not connect to hosted object storage.
- `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md` now defines the future generated-document object adapter staging proof runner contract. `scripts/generated-document-object-adapter-staging-runner.cjs` is local-only; it does not generate signed URLs, validate credentials over the network, connect to hosted object storage, or execute hosted proof.
- Attachment and generated-document downloads are API-mediated through JWT auth, organization context, permission guards, and service-level `{ id, organizationId }` predicates.
- Archive/future retention object storage is not implemented as a runtime object-storage path. It remains a proof and design requirement.

## Signed URL Authorization Rules

- No signed URL may be generated before tenant authorization.
- Signed URL requests must verify active organization membership.
- Signed URL requests must verify the required permission before URL issuance.
- Signed URL requests must resolve the object key from authorized metadata, never directly from request input.
- Attachment signed URL requests must verify attachment ownership by `{ id, organizationId }`.
- Generated-document signed URL requests must verify generated-document ownership by `{ id, organizationId }` and source ownership for creation paths.
- Future archive signed URL requests must verify archive ownership by `{ id, organizationId }`.
- Unauthorized errors must not expose object keys, bucket names, signed URLs, or object body details.

## Signed URL Shape Requirements

- Short TTL is required.
- Download-only behavior is preferred where the provider supports it.
- Public bucket assumptions are not allowed.
- Secrets and full signed URLs must not be logged.
- Object keys must not appear in unauthorized error messages.
- Content-Disposition must be sanitized if included.
- Signed URL issuance should include audit context such as `organizationId`, `userId`, object type, object id, and `proofRunId` for proof runs.

## Object-Storage Path Requirements

- Object keys must start with `org/{organizationId}/`.
- Object keys must include an object type prefix: `attachments`, `generated-documents`, or future `archives`.
- Attachment keys must include an attachment id prefix.
- Generated-document keys must include generated document id and normalized filename, for example `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`.
- Source type, source id, and document type should remain authorized metadata unless a future reviewed design deliberately includes them without leaking sensitive path data.
- Future archive keys must include an archive id prefix.
- Filenames and path segments must remove traversal markers and unsafe slash shapes.
- User input must never be accepted as an object key.
- Object keys are not an authorization boundary; API authorization and bucket/provider permissions remain mandatory.

## Local Harness Contract

`scripts/object-storage-proof-validate.cjs` now reports a signed URL/object-storage proof plan in dry-run output.

- `realSignedUrlsGenerated=false`.
- `hostedObjectStorageTouched=false`.
- `networkEnabled=false`.
- `mutationEnabled=false`.
- Local dry-run can run without credentials.
- Staging plan mode requires `LEDGERBYTE_STORAGE_PROOF_ALLOW=1`, `LEDGERBYTE_STORAGE_PROOF_STAGING_ALLOW=1`, a valid `LEDGERBYTE_STORAGE_PROOF_RUN_ID`, and staging/test/proof-looking storage target classification.
- Production-looking buckets/endpoints are refused by the local harness.
- Cleanup scope is `proofRunId-only` only when the proof run id is valid.

`scripts/generated-document-object-adapter-staging-preflight.cjs` is narrower: it is a generated-document object adapter staging preflight helper, not a signed URL helper. It always reports `signedUrlsGenerated=false`, `networkEnabled=false`, `mutationEnabled=false`, and `mutationAllowed=false`.

`scripts/generated-document-object-adapter-staging-runner.cjs` is also narrower than signed URL proof. It coordinates only local plan/dry-run/preflight output for a future generated-document object adapter proof. It reports `signedUrlsGenerated=false`, `hostedStorageTouched=false`, and `proofExecuted=false`; future hosted modes are blocked placeholders in this pass.

## Proof Checklist

| Scenario | Required result |
| --- | --- |
| Tenant A requests Tenant B attachment signed URL | Denied before URL generation |
| Tenant A requests Tenant B generated-document signed URL | Denied before URL generation |
| Tenant A requests Tenant B archive signed URL | Denied before URL generation |
| Tenant A submits a guessed object key | Denied because direct object-key input is not accepted |
| Tenant A uses Tenant B source record id | Denied before object metadata or URL resolution |
| Read-only user requests restricted object URL | Permission rules block issuance |
| Permission is removed after URL issuance | TTL and revocation posture is documented before hosted use |
| URL expires | Expired URL behavior is documented and proven in staging before production use |
| Signed URL is issued | Audit event records sanitized context when implemented |

## Hosted Proof Requirements

- Dedicated staging/proof bucket only.
- Generated-document object adapter staging gates satisfied before any object-adapter execution.
- Synthetic Tenant A and Tenant B records only.
- Proof-run id labels on synthetic objects and metadata.
- No customer data.
- No public bucket access.
- No broad bucket cleanup.
- Proof-run-id-scoped cleanup only.
- Signed URL issuance logs if the feature is implemented later.
- Failed cross-tenant attempts recorded without leaking object keys or bodies.

## Acceptance Criteria Before Production

Signed URL and object-storage access are not production-ready until:

- Local authorization and object-key tests pass.
- Staging bucket proof passes with synthetic tenants.
- Signed URL issuance is audited if implemented.
- Cross-tenant attachment, generated-document, and archive URL requests fail before URL generation.
- Object-key guessing fails.
- Generated-document object access is scoped.
- Attachment object access is scoped.
- Archive object access is scoped.
- Backup/restore evidence exists before archive or restore claims are made.
- Security/legal/accounting owners sign off on retention, archive, and access posture.

## Explicit Non-Claims

- This plan does not implement signed URL infrastructure.
- This plan does not prove hosted bucket policy behavior.
- This plan does not prove hosted object-storage tenant boundaries.
- This plan does not make generated-document object storage active.
- This plan does not make the test-only fake generated-document object adapter runtime-selectable.
- This plan does not replace the disabled generated-document object adapter with a real object-storage adapter.
- This plan does not change production readiness scores.
- This plan does not remove the DB-backed fallback requirement for generated documents.
