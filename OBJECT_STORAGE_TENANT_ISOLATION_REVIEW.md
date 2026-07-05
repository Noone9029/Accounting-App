# Object Storage Tenant Isolation Review

Branch: `codex/object-storage-tenant-proof`

Base: updated `origin/main` at merge commit `50c478ad9288f3da65208606ba55d4da22ae43ba`.

## Scope

This lane tightens local attachment object-storage tenant isolation. It does not run hosted storage, hosted mutations, hosted migrations, signed URL generation, Prisma schema changes, or accounting logic changes.

## Guard and permission model summary

- Attachment routes remain protected by JWT auth, organization context, and permission guards.
- `AttachmentService.download(organizationId, id)` still loads attachment metadata by `{ id, organizationId }` and blocks deleted rows before reading content.
- The download path now passes the authorized `organizationId` and `attachmentId` into storage reads.
- `S3AttachmentStorageService.read()` now verifies the stored S3 key starts with `org/{organizationId}/attachments/{attachmentId}/` before any `GetObject` call.
- Generated-document downloads were already API-mediated by `{ id, organizationId }`, and the generated-document fake object adapter already rejects tenant-context mismatches when organization context is supplied.

## Areas tested

- S3 attachment object-key tenant and attachment id segment normalization.
- S3 attachment filename traversal normalization.
- S3 attachment read denial before network access when the stored key belongs to another tenant.
- S3 attachment read denial before network access when the stored key belongs to another attachment in the same tenant.
- Attachment service download passes authorized tenant and attachment context to the storage adapter.
- Existing attachment upload, list, detail, update, soft-delete, deleted-download, and cross-tenant guessed-id protections still pass.

## Bugs found

- S3 attachment writes normalized only the filename portion of object keys. Organization and attachment id segments were inserted raw.
- S3 attachment reads trusted the stored `storageKey` after the tenant-scoped metadata lookup and did not independently verify that the object key still matched the authorized tenant and attachment before issuing `GetObject`.

## Fixes implemented

- Normalized S3 attachment organization and attachment id object-key segments.
- Added fail-closed S3 read validation for unsafe key shapes and tenant/attachment prefix mismatches.
- Passed authorized organization and attachment ids from `AttachmentService.download()` into storage reads.
- Updated storage tenant-isolation documentation.

## Database changes

- None.

## Accounting logic changes

- None.

## Remaining untested areas

- Hosted object-storage tenant isolation with a real bucket and synthetic tenants.
- Bucket policy/direct object access denial.
- Real signed URL behavior; signed URLs remain unimplemented.
- Generated-document real object-storage behavior; generated documents remain database-backed by default.
- Backup/restore, malware scanning, lifecycle, legal hold, immutable retention, and stale permission revocation behavior.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- Red targeted run: `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/attachments/attachment-storage.service.spec.ts` - failed as expected before the fix, proving raw tenant/attachment id segments and mismatched S3 keys were not guarded.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/attachments/attachment-storage.service.spec.ts apps/api/src/attachments/attachment.service.spec.ts` - passed, 2 suites / 25 tests.
- `corepack pnpm test:storage-proof-validate` - passed, 18 tests.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/attachments/attachment-storage.service.spec.ts apps/api/src/attachments/attachment.service.spec.ts apps/api/src/generated-documents/generated-document-storage.spec.ts apps/api/src/generated-documents/generated-document-rules.spec.ts` - passed, 4 suites / 46 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 167 passed suites, 1531 passed tests, 9 skipped opt-in DB tests; web reported 157 passed suites, 692 passed tests, with the existing successful-suite open-handle warning.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated Next.js churn was detected after build and restored; no final diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; only synthetic S3 test placeholders `access-key` and `secret-key` matched in existing tests and non-exposure assertions.

## Remaining risks

- The new guard protects API-mediated S3 reads from mismatched stored keys, but it does not prove provider-side bucket policy isolation.
- Generic low-level `getObject()` calls without authorized tenant context remain a helper path and are not a substitute for API authorization.
- Hosted storage proof still requires approved staging credentials, synthetic tenants, and an explicit proof run.

## Next recommended prompt

`Codex, review PR #[number] for the object-storage tenant isolation hardening branch only. Confirm the diff is limited to attachment S3 key/read-guard runtime code, targeted tests, and docs; run the targeted storage tests, lint, typecheck, full tests, build, verify:diff, git diff --check, generated-file check, and secret scan. Do not run hosted storage, hosted migrations, signed URL proof, or tenant-isolation expansion.`
