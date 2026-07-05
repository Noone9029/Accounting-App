# Object-storage tenant isolation hardening

## Summary

This PR tightens local attachment object-storage tenant isolation for S3-backed attachment downloads.

It ensures API-mediated S3 attachment reads fail closed if the stored object key does not match the authorized organization and attachment id.

## Files changed

- `apps/api/src/attachments/attachment-storage.service.ts`
- `apps/api/src/attachments/attachment-storage.service.spec.ts`
- `apps/api/src/attachments/attachment.service.ts`
- `apps/api/src/attachments/attachment.service.spec.ts`
- `docs/security/STORAGE_TENANT_ISOLATION_PROOF_PLAN.md`
- `docs/storage/ATTACHMENT_STORAGE_SECURITY.md`
- `OBJECT_STORAGE_TENANT_ISOLATION_REVIEW.md`

## Runtime impact

- S3 attachment object-key tenant and attachment id segments are normalized before writes.
- `AttachmentService.download()` passes authorized organization and attachment context to storage reads.
- `S3AttachmentStorageService.read()` rejects unsafe or mismatched stored object keys before any `GetObject` call.

## No-scope confirmations

- No accounting logic changed.
- No Prisma schema or migrations changed.
- No auth runtime logic changed.
- No UI behavior changed.
- No hosted object storage was touched.
- No signed URL behavior was added.

## Tests added

- S3 attachment object-key segment normalization.
- S3 read denial before network when a stored key belongs to another tenant.
- S3 read denial before network when a stored key belongs to another attachment.
- Attachment service proof that authorized tenant/attachment context is passed into storage reads.

## Remaining gaps

- Hosted bucket policy proof.
- Real signed URL proof.
- Real generated-document object-storage proof.
- Backup/restore, malware scanning, lifecycle, legal hold, immutable retention, and stale permission revocation proof.

## Validation

Initial red run after dependency setup confirmed the new storage tests failed before the fix.

Final validation:

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- Targeted attachment storage/service tests - passed.
- Storage proof validator tests - passed.
- Targeted attachment plus generated-document storage tests - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- `apps/web/next-env.d.ts` generated churn was restored; no final diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted secret scan found no real secrets; only synthetic S3 test placeholders matched.
