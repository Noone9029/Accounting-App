# Fail closed storage signed URL paths

## Summary

This PR adds local fail-closed proof for attachment and generated-document read URL paths.

It does not implement real signed URLs. It makes attempted signed URL access reject explicitly until separate signed URL design, implementation, hosted proof, and owner approval exist.

## Files changed

- `apps/api/src/attachments/attachment-storage.service.ts`
- `apps/api/src/attachments/attachment-storage.service.spec.ts`
- `apps/api/src/attachments/attachment.service.spec.ts`
- `apps/api/src/generated-documents/generated-document-storage.ts`
- `apps/api/src/generated-documents/generated-document-storage.spec.ts`
- `apps/api/src/storage/storage-provider.ts`
- `docs/security/SIGNED_URL_OBJECT_STORAGE_PROOF_PLAN.md`
- `docs/storage/ATTACHMENT_STORAGE_SECURITY.md`
- `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md`
- `SIGNED_URL_GENERATED_DOCUMENT_PROOF_REVIEW.md`

## Runtime impact

- Generic S3 attachment object reads now require authorized `organizationId` and `attachmentId` context before provider reads.
- Attachment `getReadUrl()` now fails closed with a disabled/proof-required error.
- Generated-document storage adapters now expose `getGeneratedDocumentReadUrl()` and fail closed for database, fake local object, and disabled object adapters.

## No-scope confirmations

- No real signed URLs are generated.
- No hosted object storage was touched.
- No hosted migrations or production mutations were run.
- No Prisma schema or migrations changed.
- No accounting logic changed.
- No UI behavior changed.
- No auth/session/CSRF/login-throttling behavior changed.

## Tests added

- S3 attachment generic object read rejects without authorized tenant/attachment context.
- S3 attachment generic object read still succeeds with authorized tenant/attachment context.
- Attachment read URL request rejects before S3 client access.
- Database-backed generated-document read URL request rejects.
- Fake local generated-document object adapter read URL request rejects.
- Disabled generated-document object adapter read URL request rejects.

## Remaining gaps

- Real signed URL issuance remains unimplemented.
- Hosted signed URL proof remains unrun.
- Hosted bucket policy/direct-object denial remains unproven.
- Generated-document real object-storage adapter remains unimplemented.
- URL TTL expiry, stale-permission revocation, signed URL audit events, backup/restore, malware scanning, legal hold, and immutable retention remain future work.

## Validation

Initial targeted storage tests passed after the fail-closed implementation.

Final validation:

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- Targeted attachment/generated-document storage tests - passed.
- Expanded targeted attachment/generated-document tests including the attachment service mock - passed.
- `corepack pnpm test:storage-proof-validate` - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed with existing CRLF normalization warnings only.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- `apps/web/next-env.d.ts` generated churn was restored; no final diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk secret scan found no real secrets; only synthetic S3 test placeholders matched.
