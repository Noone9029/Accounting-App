# Generated Document Storage Adapter Interface Sprint Closure

Date: 2026-06-19

Branch: `feature/generated-document-storage-adapter-interface`

## Scope

This was a local-only production-readiness implementation pass to introduce a generated-document storage adapter boundary while preserving the current database-backed generated-document behavior.

## Current Generated-Document State

- Generated documents remain DB-backed by default.
- `GeneratedDocumentService.archivePdf()` now writes generated-document content through `GeneratedDocumentStorageAdapter`.
- `DatabaseGeneratedDocumentStorageAdapter` is the Nest runtime default and preserves `storageProvider = "database"`, `contentBase64`, `contentHash`, and `sizeBytes`.
- `GeneratedDocumentService.download()` still loads rows by `{ id, organizationId }` and returns API-mediated bytes after reading through the adapter.
- Existing JWT, organization context, permission guards, source ownership checks, and tenant-scoped generated-document queries remain in place.

## Adapter Interface Summary

Added `apps/api/src/generated-documents/generated-document-storage.ts` with:

- `GeneratedDocumentStorageAdapter`
- `DatabaseGeneratedDocumentStorageAdapter`
- `FakeLocalGeneratedDocumentObjectStorageAdapter`
- DB-backed content write/read/hash verification helpers
- generated-document-id anchored object-key derivation for local fake tests

The fake local object adapter is exported for local tests only. It is not registered in the Nest module, does not use network, does not require credentials, stores content in memory, anchors keys as `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`, and rejects traversal segments in tenant/id path inputs.

## Validator Coverage

`scripts/object-storage-proof-validate.cjs` now reports `generatedDocumentStorageAdapterInterface` guardrails:

- interface detected
- database adapter detected
- fake local object adapter detected
- service uses adapter boundary
- module registers database adapter default
- default runtime storage remains database
- object storage is not enabled by default
- fake adapter is not runtime-registered
- no hosted object storage was touched
- no real signed URLs were generated
- no schema migration is required by this scaffold

## Safety Boundaries

No hosted command was run. No hosted/customer data was mutated. No hosted object storage was touched. No real hosted signed URLs were generated. No schema or migration changes were made. No SQL template was applied. No RLS rollout or runtime DB role was applied. No ZATCA production work was added. No UAE Peppol/PINT-AE/ASP production work was added. No provider evidence was available.

## Remaining Blockers

- Hosted object-storage proof
- Dedicated staging/proof bucket
- Synthetic tenant proof data
- Bucket policy proof
- Real generated-document object-storage adapter
- Real signed URL implementation/proof if signed URLs are used
- Schema/migration approval if future metadata fields are required
- Backup/restore proof
- Retention/legal-hold/malware-scan evidence
- Observability evidence
- Owner/legal/accounting/security sign-off
- UAE ASP/Peppol provider evidence
- ZATCA production credentials

## Verification

Recorded in the PR/final handoff for this branch. This closure is local-only evidence and does not change production readiness scores.
