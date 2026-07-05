# Generated Document Object Storage Proof Review

Branch: `codex/generated-document-object-storage-proof`

Base: updated `origin/main` at merge commit `73725506647baa63dfbe0791a9bfe600f56e8ea8`.

## Scope

This lane adds local service-level proof for generated-document object-backed archiving and download using the explicit local test object adapter. It does not run hosted storage, hosted mutations, hosted migrations, signed URL generation, Prisma schema changes, accounting logic changes, or UI behavior changes.

## Guard and permission model summary

- Generated-document routes remain API-mediated by JWT auth, organization context, permission guards, and `GeneratedDocumentService`.
- Generated-document metadata reads and downloads still query by `{ id, organizationId }` before content reads.
- The local object adapter derives keys under `org/{organizationId}/generated-documents/{generatedDocumentId}/{filename}` and rejects tenant or document id mismatches when context is supplied.
- `archivePdf()` now preallocates a generated-document id only for non-database storage adapters, passes that id into the storage write, and persists the same id on the generated-document row.
- Database-backed generated documents remain database-backed by default.

## Areas tested

- Service-level generated-document archiving through `FakeLocalGeneratedDocumentObjectStorageAdapter`.
- Tenant-scoped generated-document object key creation from service-provided organization id and generated-document id.
- Object-backed generated-document database metadata uses `storageProvider`, `storageKey`, `contentHash`, and `sizeBytes`, with no base64 body.
- Service-level download reads object-backed content after the `{ id, organizationId }` metadata lookup.
- Cross-tenant guessed generated-document download still returns not found before content is returned.

## Bugs found

- The generated-document object adapter required `generatedDocumentId` for tenant-scoped object keys, but `GeneratedDocumentService.archivePdf()` wrote content before a generated-document id existed. This prevented object-backed generated-document archiving from satisfying the adapter's own key contract.

## Fixes implemented

- Added a targeted service test proving archive and download work through the local object adapter.
- Preallocated a UUID for non-database generated-document storage writes.
- Persisted the preallocated UUID on the generated-document row so the object key and database record use the same generated-document id.

## Database changes

- None. No Prisma schema or migration changes.

## Accounting logic changes

- None.

## Remaining untested areas

- Real hosted object-storage provider behavior for generated documents.
- Hosted bucket policy and provider-side direct object access denial.
- Real signed URL issuance, URL TTL expiry, and stale permission revocation.
- Hosted synthetic tenant proof for generated-document object storage.
- Object-storage backup/restore, lifecycle, malware scanning, legal hold, immutable retention, and deletion cleanup behavior.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- Red targeted run: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/generated-documents/generated-document-rules.spec.ts` - failed as expected before the fix because the object adapter required `generatedDocumentId`.
- Green targeted run: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/generated-documents/generated-document-rules.spec.ts` - passed, 1 suite / 8 tests.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/generated-documents/generated-document-storage.spec.ts apps/api/src/generated-documents/generated-document-rules.spec.ts` - passed, 2 suites / 24 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 167 passed suites, 1536 passed tests, 9 skipped opt-in DB tests; web reported 157 passed suites, 692 passed tests.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed with changed files only and CRLF normalization warnings on touched files.
- `git diff --check` - passed with CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated Next.js churn was detected after build and restored; no intended final diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; matches were documentation references to secret scans and an existing non-secret generated-document/ZATCA warning string.

## Remaining risks

- The local fake adapter proves service integration and tenant-scoped object key composition, but it is not a substitute for real provider IAM/bucket-policy proof.
- Real object storage remains disabled by default and must stay behind explicit staging proof before production use.
- Orphaned object cleanup after a storage write succeeds but database create fails remains future work for any real object-storage adapter.

## Next recommended prompt

`Codex, review PR #[number] for the generated-document object-storage proof branch only. Confirm the diff is limited to GeneratedDocumentService id preallocation for non-database adapters, targeted generated-document tests, and proof docs; run the targeted generated-document tests, lint, typecheck, full tests, build, verify:diff, generated-file check, secret scan, and git diff --check. Do not run hosted storage, hosted migrations, real signed URL proof, or tenant-isolation expansion.`
