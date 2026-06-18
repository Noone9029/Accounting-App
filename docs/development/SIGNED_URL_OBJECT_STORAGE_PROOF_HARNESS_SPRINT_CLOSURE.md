# Signed URL Object Storage Proof Harness Sprint Closure

Date: 2026-06-19

Branch: `feature/signed-url-object-storage-proof-harness`

## Scope

This was a local-only production-readiness design and proof-harness pass for signed URL and object-storage tenant boundaries.

No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, hosted object-storage mutation, real hosted signed URL generation, schema change, migration, SQL template application, RLS rollout, runtime role application, real customer document access, provider call, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, real email, bank feed, payment processor integration, production compliance claim, or SOC 2/security certification claim was added.

## Inventory

- Signed URLs do not currently exist in the runtime path.
- `StorageProvider.getReadUrl` exists as an optional interface hook, but no provider implements it.
- Attachment downloads are API-mediated and permission-guarded.
- Generated-document downloads are API-mediated and permission-guarded.
- Attachments are database/base64-backed by default with feature-flagged S3-compatible adapter groundwork.
- Generated documents remain database-backed.
- Attachment object keys use `org/{organizationId}/attachments/{attachmentId}/{safeFilename}`.
- Generated-document object keys are not active runtime keys; the proof validator models the future pattern only.
- Future archive object keys are design-only.

## Changes Made

- Added `docs/security/SIGNED_URL_OBJECT_STORAGE_PROOF_PLAN.md`.
- Added this sprint closure.
- Added `docs/storage/SIGNED_URL_OBJECT_STORAGE_RISK_REGISTER.md`.
- Extended `scripts/object-storage-proof-validate.cjs` with a signed URL/object-storage proof plan in dry-run output.
- Added local tests for signed URL proof-plan guards, object-key policy validation, and traversal-safe proof-key helpers.
- Fixed one local proof-harness path-safety gap: the validator filename/key helpers now remove `..` traversal markers before constructing planned object keys.

## Harness Status

- Dry-run remains the default.
- No hosted storage call is made.
- No real signed URL is generated.
- Staging proof planning requires explicit allow flags and a valid proof run id.
- Production-looking storage targets are refused.
- Network and mutation flags remain false in the harness output.

## Verification

- `corepack pnpm --filter @ledgerbyte/api db:generate` passed.
- `corepack pnpm test:storage-proof-validate` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- attachment` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- generated-document` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- storage` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- hosted-tenant-isolation-proof` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- accounting-tenant-isolation-regression` passed.
- `corepack pnpm --filter @ledgerbyte/api test` passed.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web test -- documents` passed.
- `corepack pnpm --filter @ledgerbyte/web test -- invoices` passed.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard` passed.
- `corepack pnpm --filter @ledgerbyte/web test -- sidebar` passed with the existing `ScrollAreaRoot` act warning.
- `corepack pnpm --filter @ledgerbyte/web test -- security` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web build` passed.
- `corepack pnpm storage:proof-validate -- --json --strict --dry-run` passed.
- `corepack pnpm storage:proof-validate -- --json --strict --mock-cycle --provider local` passed.
- `corepack pnpm verify:diff` passed.
- `git diff --check` passed.
- `git diff --cached --check` passed.
- `corepack pnpm verify:ci:local` passed.
- Forbidden-claim scan found only pre-existing negative/historical contexts, not new active product claims.

## Blocked Scenarios

- Hosted object-storage proof requires approved staging/proof credentials and a dedicated synthetic bucket.
- Real signed URL proof requires an actual signed URL implementation and staging object-storage infrastructure.
- Bucket policy proof requires provider configuration and reviewed policy evidence.
- Generated-document object storage requires a separate implementation and migration/rollback design.
- Archive object storage requires retention/legal-hold/backup/restore decisions before implementation.

## Edition Safety

This branch touches shared storage proof tooling and docs only. It does not add Generic, KSA, or UAE product copy; it does not add active ZATCA, UAE Peppol/PINT-AE/ASP, FTA, or provider production claims.

## Next Recommended Prompt

`Design generated-document object storage implementation contract`
