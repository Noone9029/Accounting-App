# Signed URL Generated Document Proof Review

Branch: `codex/signed-url-generated-document-proof`

Base: updated `origin/main` at merge commit `2728476e6dbd1d2d3bdffd5aceb42126590e763d`.

## Scope

This lane adds local fail-closed proof around storage read URL paths. It does not implement real signed URLs, run hosted storage, run hosted migrations, touch production data, change Prisma schema, change accounting logic, or add UI behavior.

## Guard and permission model summary

- Attachment downloads remain API-mediated through JWT auth, organization context, permission guards, tenant-scoped attachment metadata, and `AttachmentService.download(organizationId, id)`.
- S3 attachment reads now require authorized `organizationId` and `attachmentId` context before a generic object read can reach the provider.
- Attachment signed URL requests reject with a disabled/proof-required error before provider access.
- Generated-document downloads remain API-mediated by generated-document id and organization context.
- Generated-document storage adapters now expose `getGeneratedDocumentReadUrl()` as an explicit fail-closed method for database, fake local object, and disabled object adapters.

## Areas tested

- Generic S3 attachment object reads fail closed when caller code omits authorized tenant and attachment context.
- Generic S3 attachment object reads still work with authorized tenant and attachment context.
- Attachment signed URL requests fail closed and do not call the S3 client.
- Database-backed generated-document read URL requests fail closed.
- Fake local generated-document object adapter read URL requests fail closed.
- Disabled generated-document object adapter read URL requests fail closed.
- Existing generated-document database, fake local object, disabled object, hash, key, missing-object, and adapter selection behavior still passes.

## Bugs found

- The low-level S3 attachment `getObject()` helper could still issue object-store reads without the explicit authorized tenant and attachment context that the API download path uses.
- Signed URL request surfaces were implicit or absent. That made it easier for future code to add URL issuance without a dedicated fail-closed method and tests.

## Fixes implemented

- Required `organizationId` and `attachmentId` on generic S3 attachment `getObject()` before provider reads.
- Added a fail-closed attachment `getReadUrl()` implementation.
- Added a generated-document-specific fail-closed `getGeneratedDocumentReadUrl()` adapter method.
- Added tests proving attachment and generated-document read URL requests reject before provider access.
- Updated storage proof docs to state the current fail-closed behavior without claiming signed URL support.

## Database changes

- None.

## Accounting logic changes

- None.

## Remaining untested areas

- Real signed URL issuance. It remains unimplemented.
- Hosted bucket policy and provider-side direct object access denial.
- Hosted object-storage proof with synthetic tenants.
- Generated-document real object-storage adapter behavior.
- Archive object storage, retention, legal hold, malware scanning, backup/restore, URL TTL expiry, stale-permission revocation, and signed URL audit events.

## Commands run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- `$env:DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate` - passed.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/attachments/attachment-storage.service.spec.ts apps/api/src/generated-documents/generated-document-storage.spec.ts` - passed, 2 suites / 28 tests.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/attachments/attachment-storage.service.spec.ts apps/api/src/attachments/attachment.service.spec.ts apps/api/src/generated-documents/generated-document-storage.spec.ts` - passed, 3 suites / 43 tests.
- `corepack pnpm test:storage-proof-validate` - passed, 18 tests.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; API reported 167 passed suites, 1535 passed tests, 9 skipped opt-in DB tests; web reported 157 passed suites, 692 passed tests, with existing successful-suite open-handle warnings.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed with existing CRLF normalization warnings only.
- `git diff -- apps/web/next-env.d.ts` - generated Next.js churn was detected after build and restored; no final diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan - no real secrets; only synthetic S3 test placeholders `access-key` and `secret-key` matched in existing tests and non-exposure assertions.

## Remaining risks

- Fail-closed methods prevent accidental URL issuance in current code, but they do not prove a future signed URL implementation.
- Provider-side object-storage controls still require staging proof with synthetic tenants and explicit owner approval.
- URL TTL, revocation after permission removal, audit logging, and cleanup semantics remain future work.
- The full API and web suites still report the repo's existing open-handle warning after successful test completion.

## Next recommended prompt

`Codex, review PR #[number] for the signed URL generated-document proof branch only. Confirm the diff is limited to fail-closed storage read URL runtime code, targeted attachment/generated-document tests, and docs; run the targeted storage tests, lint, typecheck, full tests, build, verify:diff, generated-file check, secret scan, and git diff --check. Do not run hosted storage, hosted migrations, real signed URL proof, or tenant-isolation expansion.`
