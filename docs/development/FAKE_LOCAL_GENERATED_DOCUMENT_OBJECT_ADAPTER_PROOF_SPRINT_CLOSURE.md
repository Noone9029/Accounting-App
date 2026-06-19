# Fake Local Generated Document Object Adapter Proof Sprint Closure

Date: 2026-06-19

Branch: `feature/fake-local-generated-document-object-adapter-proof`

Base: clean `origin/main` at `b434ebfe2d1a3f1dfa99f2a1f795db4341d9f59f` after PR #80.

## Purpose

This was a local-only generated-document storage adapter proof.

The question answered by this pass was whether LedgerByte's generated-document storage adapter boundary can support object-style storage behavior locally, using fake in-memory storage, while keeping the real runtime DB-backed by default and keeping real object storage disabled.

This is not real object storage, not hosted object storage, not signed URL support, not production storage enablement, and not ZATCA/UAE provider work.

## Scope Boundaries

No hosted command, hosted/customer-data mutation, hosted Supabase command, Vercel deploy command, production database command, seed/reset/delete, Prisma schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, signed URL generation, generated-document migration, real hosted object adapter rollout, real customer document access, provider call, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, real email, real bank feed, payment processor integration, production compliance claim, or SOC 2/security certification claim was added or performed.

## Inventory

- `GeneratedDocumentStorageAdapter` exists in `apps/api/src/generated-documents/generated-document-storage.ts`.
- `DatabaseGeneratedDocumentStorageAdapter` is the runtime default.
- `FakeLocalGeneratedDocumentObjectStorageAdapter` exists for local tests only.
- `DisabledGeneratedDocumentObjectStorageAdapter` exists from PR #80 and fails closed for explicit object/S3-compatible modes.
- `createGeneratedDocumentStorageAdapter()` defaults to database, requires explicit fake-local test selection, maps object/S3-compatible modes to the disabled adapter, and fails closed for unknown modes.
- `GeneratedDocumentModule` registers `DatabaseGeneratedDocumentStorageAdapter`; it does not runtime-register the fake local adapter or a real object adapter.
- Generated-document rows remain DB-backed by default with `storageProvider = "database"`, `contentBase64`, `contentHash`, and `sizeBytes`.

## Implementation Summary

- Completed fake local object adapter behavior with in-memory synthetic content only.
- Added hash and byte-size verification before fake local readback.
- Added safe missing-object failure behavior.
- Added tenant-context mismatch rejection when organization context is supplied to the adapter payload.
- Added deterministic duplicate write behavior: identical duplicate writes return the same metadata, while same-key different-content writes fail.
- Added production-looking environment refusal for fake local adapter selection.
- Threaded existing generated-document organization/id/size metadata through `GeneratedDocumentService.download()` into the adapter boundary.
- Extended the object-storage proof validator with fake-local proof status and explicit real-object-adapter false reporting.

## Current Generated-Document State

Generated documents remain DB-backed by default. Archive writes and downloads still flow through the generated-document adapter boundary, with `DatabaseGeneratedDocumentStorageAdapter` preserving:

- `storageProvider = "database"`
- `storageKey = null`
- `contentBase64`
- `contentHash`
- `sizeBytes`
- API-mediated organization-scoped downloads

## Fake Local Adapter Behavior

`FakeLocalGeneratedDocumentObjectStorageAdapter`:

- reports `local-test-object`
- stores generated-document content in memory
- returns exact stored content through the adapter boundary
- derives keys shaped like `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}`
- rejects path traversal segments in tenant or generated-document id inputs
- computes SHA-256 content hashes
- records `sizeBytes`
- verifies hash and size metadata before readback
- rejects missing objects with a safe not-found error
- rejects tenant-context mismatches when `organizationId` is supplied
- handles duplicate writes deterministically
- has no signed URL method
- performs no network calls
- requires no hosted credentials
- is not runtime-registered
- is refused for production-looking fake-adapter selection

## Disabled Adapter And Selector Status

`DisabledGeneratedDocumentObjectStorageAdapter` remains fail-closed and reports `object-storage-unavailable`.

`createGeneratedDocumentStorageAdapter()`:

- defaults to `DatabaseGeneratedDocumentStorageAdapter`
- returns the disabled adapter for explicit object/S3-compatible modes
- returns the fake adapter only when explicit local/test selection is allowed
- refuses fake-adapter selection for production-looking environments
- fails closed for unknown modes

## Validator Coverage

`scripts/object-storage-proof-validate.cjs` now reports:

- generated-document storage adapter interface detected
- database adapter detected
- disabled object adapter detected
- selector detected
- fake local object adapter detected
- fake local selection requires safe environment
- fake local proof status is `local-test-only`
- real object adapter implemented is `false`
- default runtime storage remains `database`
- hosted object storage touched is `false`
- real signed URLs generated is `false`
- schema migration required is `false`

## Edition Safety

This pass did not add Generic/KSA/UAE product surfaces, provider calls, compliance artifacts, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, or production compliance claims. Existing edition separation remains unchanged.

## Verification

Passed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- generated-document-storage`
- `corepack pnpm --filter @ledgerbyte/api test -- generated-documents`
- `corepack pnpm --filter @ledgerbyte/api test -- attachments`
- `corepack pnpm --filter @ledgerbyte/api test -- storage`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web test -- documents`
- `corepack pnpm --filter @ledgerbyte/web test -- invoices`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `node --test scripts/object-storage-proof-validate.test.cjs`
- `node scripts/object-storage-proof-validate.cjs --help`
- `node scripts/object-storage-proof-validate.cjs --strict --dry-run`
- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check`
- `corepack pnpm verify:ci:local`

`corepack pnpm verify:ci:local` regenerated `apps/web/next-env.d.ts`; that generated churn was restored because it is outside this task scope.

## Remaining Production Blockers

- Approved staging/proof storage credentials.
- Synthetic tenants.
- Dedicated staging bucket.
- Hosted object-storage proof.
- Bucket policy proof.
- Real generated-document object adapter and hosted proof.
- Real signed URL implementation and proof if signed URLs are used.
- Schema/migration approval if future metadata is required.
- Backup/restore proof.
- Retention/legal-hold/malware-scan evidence.
- Observability evidence.
- Owner/legal/accounting/security sign-off.
- UAE ASP/Peppol provider evidence.
- ZATCA production credentials.

## Protected State

Preserved dirty worktree `E:\Accounting App` on `feature/edition-split-preserve-current-changes`, safety patch `E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\primary-country-edition-repo-hygiene-safety-20260617-192644.patch`, ZATCA `stash@{0}`, and protected branches `codex/purchase-bill-seeded-uuid-validation` and `codex/wafeq-banking-reconciliation-audit-polish` remained untouched.

## Next Recommended Prompt

`Design generated-document object adapter staging proof gates`
