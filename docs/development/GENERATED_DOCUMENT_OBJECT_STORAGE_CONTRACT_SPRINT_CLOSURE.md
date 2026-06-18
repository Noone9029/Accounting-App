# Generated Document Object Storage Contract Sprint Closure

Date: 2026-06-19

Branch: `feature/generated-document-object-storage-contract`

Base: clean `origin/main` at `a118d0b7b9bd711d04dd74a5c1f6803417970fd3`

## Scope

This was a production-readiness generated-document object-storage contract pass. It was design, documentation, and local-only validator coverage only.

No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, hosted object-storage mutation, real hosted signed URL generation, schema change, migration, SQL template application, RLS rollout, runtime role application, real customer document access, provider call, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, real email, bank feed, payment processor integration, production compliance claim, or SOC 2/security certification claim was added.

## Inventory

- Generated documents remain DB-backed through `GeneratedDocumentService.archivePdf()` with `storageProvider = "database"` and `contentBase64`.
- Current metadata includes organization id, document type, source type/id, document number, filename, MIME type, storage provider, optional storage key, content hash, size, status, generated-by user, and timestamps.
- Generated-document list/get/download are API-mediated and organization-scoped.
- Generated-document download is requested by generated-document id, not object key.
- Generated-document archive creation checks supported source ownership for current supported delegates before row creation.
- Attachment S3-compatible storage exists as separate groundwork under `ATTACHMENT_STORAGE_PROVIDER=s3`.
- Generated-document S3 writes are not implemented; storage readiness warns that generated documents remain database-backed.
- Signed URLs are not implemented; no provider implements signed URL issuance.
- Compliance archive records are organization-scoped metadata surfaces, not generated-document object storage.

## Changes Made

- Added `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md`.
- Added `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_RISK_REGISTER.md`.
- Added this sprint closure.
- Extended `scripts/object-storage-proof-validate.cjs` with a generated-document object-storage contract section in dry-run output.
- Updated validator generated-document key examples to require `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`.
- Added local validator tests for generated-document metadata requirements, object-key rules, authorization-before-object-key-resolution, hash/migration rollback requirements, and KSA/UAE future edition gates.

## Contract Summary

- Metadata: object-backed generated documents must carry organization id, generated-document id, source metadata, document type, MIME type, filename, storage backend, object key, SHA-256, content length, creation actor/time, and future retention/compliance fields only when implemented.
- Object keys: future keys must be tenant-prefixed, generated-document-id anchored, normalized, server-derived, non-flat, and free of provider secrets or customer-sensitive path data.
- Authorization: content and future signed URL access must authorize by generated-document id before resolving object keys or URLs.
- Hash/integrity: object migration must preserve SHA-256 and content length and prove equivalence before any DB content cleanup.
- Migration/rollback: DB content must remain available until staging proof, dual-read/feature flag, backup/restore proof, rollback path, and owner sign-off exist.
- Edition safety: Generic remains neutral; future KSA ZATCA and UAE PINT-AE/ASP artifacts are future/gated and must not become active cross-edition claims.

## Blocked Scenarios

- Hosted object storage requires approved staging/proof credentials and a dedicated synthetic bucket.
- Real signed URL proof requires a real signed URL implementation and staging object-storage infrastructure.
- Bucket policy proof requires provider configuration and reviewed direct-access denial evidence.
- Schema or migration changes require explicit approval.
- DB content deletion requires backup/restore proof and owner/legal/accounting approval.
- KSA ZATCA and UAE Peppol/PINT-AE/ASP provider artifacts require separate provider evidence and approval.

## Safety Result

- No hosted command was run.
- No hosted/customer data was mutated.
- No hosted object storage was touched.
- No real hosted signed URLs were generated.
- No schema or migration was changed.
- No SQL template was applied.
- No RLS policy or runtime DB role was applied.
- No production target was touched.
- Provider evidence remains unavailable.

## Verification

- `corepack pnpm install --frozen-lockfile` passed after the new worktree initially had no `node_modules`.
- `corepack pnpm --filter @ledgerbyte/api db:generate` passed.
- `node --test scripts/object-storage-proof-validate.test.cjs` passed.
- `node scripts/object-storage-proof-validate.cjs --help` passed.
- `node scripts/object-storage-proof-validate.cjs --json --strict --dry-run` passed and reported generated-document object storage disabled, generated documents database-backed, no hosted object-storage touch, and no real signed URLs generated.
- `corepack pnpm --filter @ledgerbyte/api test -- generated-document` passed with 144 suites and 1310 tests; Jest reported an existing worker teardown warning.
- `corepack pnpm --filter @ledgerbyte/api test -- attachment` passed with 3 suites and 23 tests; Jest reported an existing worker teardown warning.
- `corepack pnpm --filter @ledgerbyte/api test -- storage` passed with 144 suites and 1310 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web test -- documents` passed with 3 suites and 18 tests; Jest reported an existing worker teardown warning.
- `corepack pnpm --filter @ledgerbyte/web test -- invoices` passed with 3 suites and 12 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck` passed.
- `corepack pnpm verify:diff` passed.
- `git diff --check` passed.
- `git diff --cached --check` passed.
- Forbidden-claim scan over added diff lines found no active product claims.

## Remaining Production Blockers

- Approved staging/proof storage credentials.
- Synthetic tenant IDs.
- Dedicated staging bucket.
- Hosted object-storage proof.
- Bucket policy proof.
- Real signed URL implementation/proof if URLs are used.
- Generated-document object-storage implementation/proof.
- Backup/restore proof.
- Retention/legal-hold/malware-scan evidence.
- Observability evidence.
- Owner/legal/accounting sign-off.
- UAE ASP/Peppol provider evidence.
- ZATCA production credentials.

## Recommended Next Prompt

`Design generated-document object storage implementation plan`
