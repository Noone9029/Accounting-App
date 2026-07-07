# Download audit proof

## Summary

This PR adds dedicated audit-log entries for successful persisted artifact downloads:

- Attachment downloads.
- Generated-document downloads.

It keeps the existing tenant-scoped download behavior and logs only after a successful content read.

## Files Changed

- `DOWNLOAD_AUDIT_PROOF_REVIEW.md`
- `PR_DOWNLOAD_AUDIT_PROOF_SUMMARY.md`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/src/audit-log/audit-log.service.spec.ts`
- `apps/api/src/attachments/attachment.controller.ts`
- `apps/api/src/attachments/attachment.service.ts`
- `apps/api/src/attachments/attachment.service.spec.ts`
- `apps/api/src/generated-documents/generated-document.controller.ts`
- `apps/api/src/generated-documents/generated-document.service.ts`
- `apps/api/src/generated-documents/generated-document-rules.spec.ts`

## Runtime Impact

Production runtime behavior changes only by adding audit-log rows for successful direct artifact downloads.

No accounting logic changed.

No Prisma schema or migrations changed.

No auth, tenant guard, CSRF, JWT/session, cleanup, accountant workflow proof, report/export proof, report-pack generation, banking/reconciliation, UAE ASP, ZATCA, storage/provider, signed URL, or UI behavior changed.

## Proof Coverage

- Attachment downloads write `ATTACHMENT_DOWNLOADED` audit events.
- Generated-document downloads write `GENERATED_DOCUMENT_DOWNLOADED` audit events.
- Audit rows include actor, organization, entity type, entity ID, filename, MIME type, size, storage provider, and linked entity metadata where available.
- Audit rows do not include file bodies or `contentBase64`.
- Cross-tenant guessed attachment IDs do not read storage and do not write audit rows.
- Cross-tenant guessed generated-document IDs do not write audit rows.
- Deleted attachment downloads do not write audit rows.

## Safety

- No hosted proof was executed.
- No hosted mutations were run.
- No hosted migrations were run.
- No cleanup execute mode was run.
- No provider/storage APIs were called.
- No real customer data was used.
- No fake accounting logic was added.

## Validation

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- Prisma validate with local placeholder URL
- Targeted download audit tests, 36 tests
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm verify:diff`
- `git diff --check`
- Generated-file check
- Changed-file trailing whitespace scan
- Targeted high-risk credential scan

`apps/web/next-env.d.ts` generated churn was detected after build and restored.

`corepack pnpm test` printed the existing web Jest worker force-exit warning after all tests passed.

## Remaining Gaps

- Report PDF endpoints are not covered by dedicated download audit logging in this PR.
- Report-pack artifact downloads remain unimplemented.
- Provider-backed signed URL download audit behavior remains for a separate approved provider lane.
- Hosted/staging proof remains blocked by missing owner-supplied packet values.

## Reviewer Focus Areas

- Confirm audit entries are logged only after successful tenant-scoped content reads.
- Confirm missing/cross-tenant/deleted download attempts do not write audit rows.
- Confirm audit metadata excludes file bodies and base64 content.
- Confirm no accounting/schema/UI/provider/compliance scope is included.
