# Disabled Generated Document Object Adapter Proof Sprint Closure

Date: 2026-06-19

Branch: `feature/disabled-generated-document-object-adapter-proof`

Base: clean `origin/main` at `6abef3e58ed83403509a7b87f7408f4d93d14010` after PR #79.

## Purpose

This was a local-only production-readiness safety proof for generated-document object storage.

The question answered by this pass was whether LedgerByte can prove generated-document object storage remains unavailable and fail-closed at runtime while DB-backed generated-document storage remains the only enabled runtime path.

## Scope Boundaries

No hosted command, hosted/customer-data mutation, hosted Supabase command, Vercel deploy command, production database command, seed/reset/delete, Prisma schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, real hosted signed URL generation, generated-document migration, real object-storage adapter rollout, real customer document access, provider call, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, real email, real bank feed, payment processor integration, production compliance claim, or SOC 2/security certification claim was added or performed.

## Implementation Summary

- Added `DisabledGeneratedDocumentObjectStorageAdapter` in `apps/api/src/generated-documents/generated-document-storage.ts`.
- Added `createGeneratedDocumentStorageAdapter()` as a pure selector helper.
- Kept `GeneratedDocumentModule` runtime wiring unchanged: `DatabaseGeneratedDocumentStorageAdapter` remains the Nest runtime default.
- Extended generated-document storage adapter tests with disabled-adapter and selector guardrails.
- Extended `scripts/object-storage-proof-validate.cjs` dry-run output with disabled-adapter and selector detection.
- Updated handoff, bug audit, implementation status, readiness scorecard, roadmap, storage, and security docs.

## Current Generated-Document State

Generated documents remain DB-backed by default. Archive writes and downloads still flow through `GeneratedDocumentStorageAdapter`, with `DatabaseGeneratedDocumentStorageAdapter` preserving:

- `storageProvider = "database"`
- `storageKey = null`
- `contentBase64`
- `contentHash`
- `sizeBytes`
- API-mediated organization-scoped downloads

## Disabled Adapter Behavior

`DisabledGeneratedDocumentObjectStorageAdapter`:

- reports `object-storage-unavailable`
- throws `Generated-document object storage is disabled and has no configured runtime adapter.` for writes
- throws the same disabled/not-configured error for reads
- returns `false` for content-hash verification
- has no signed URL method
- performs no network calls
- requires no credentials
- does not touch hosted storage

## Selector Guardrails

`createGeneratedDocumentStorageAdapter()`:

- defaults to `DatabaseGeneratedDocumentStorageAdapter`
- returns the disabled adapter for explicit object/S3-compatible modes
- requires `allowLocalTestObjectAdapter: true` before returning `FakeLocalGeneratedDocumentObjectStorageAdapter`
- fails closed with `Unsupported generated-document storage adapter mode: ...` for unknown modes

The selector is a proof/helper surface. Runtime module wiring remains hardcoded to the database adapter.

## Fake Local Adapter Status

`FakeLocalGeneratedDocumentObjectStorageAdapter` remains local-test-only. It is not runtime-registered, does not use hosted storage, stores content in memory, requires generated-document ids for object keys, and remains gated by explicit selector input.

## Validator Coverage

`scripts/object-storage-proof-validate.cjs` now reports:

- disabled object adapter detected
- selector detected
- default runtime storage remains `database`
- explicit object mode selection is `disabled-adapter`
- unknown mode behavior is `fail-closed`
- object storage enabled by default is `false`
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
- `corepack pnpm --filter @ledgerbyte/api test -- generated-document`
- `corepack pnpm --filter @ledgerbyte/api test -- attachment`
- `corepack pnpm --filter @ledgerbyte/api test -- storage`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web test -- documents`
- `corepack pnpm --filter @ledgerbyte/web test -- invoices`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `node --test scripts/object-storage-proof-validate.test.cjs`
- `node scripts/object-storage-proof-validate.cjs --help`
- `node scripts/object-storage-proof-validate.cjs --json --strict --dry-run`
- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check`
- `corepack pnpm verify:ci:local`

The first `corepack pnpm --filter @ledgerbyte/api test -- generated-document` attempt failed in the fresh worktree because Prisma client types were not generated. After `corepack pnpm --filter @ledgerbyte/api db:generate`, the command passed.

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
