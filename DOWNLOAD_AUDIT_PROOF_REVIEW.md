# Download Audit Proof Review

## Scope

This lane closes the dedicated download audit-log gap for persisted artifact downloads that already exist in the paid-beta accountant workflow:

- `GET /attachments/:id/download`
- `GET /generated-documents/:id/download`

It starts from updated `origin/main` after the report-pack generation proof. It does not add report-pack generation, new storage providers, signed URLs, hosted proof execution, hosted mutations, hosted migrations, cleanup execute mode, banking/reconciliation implementation, UAE ASP work, ZATCA work, accounting logic changes, Prisma schema changes, migrations, or UI behavior changes.

## Areas Tested

- Attachment downloads are tenant-scoped before storage reads.
- Generated-document downloads are tenant-scoped before storage reads.
- Successful attachment downloads write an audit entry with `action: DOWNLOAD`, `entityType: Attachment`, the actor user ID, and safe metadata only.
- Successful generated-document downloads write an audit entry with `action: DOWNLOAD`, `entityType: GeneratedDocument`, the actor user ID, and safe metadata only.
- The audit-log service standardizes download events to:
  - `ATTACHMENT_DOWNLOADED`
  - `GENERATED_DOCUMENT_DOWNLOADED`
- Cross-tenant guessed attachment IDs return not found, do not read storage, and do not write audit entries.
- Cross-tenant guessed generated-document IDs return not found and do not write audit entries.
- Deleted attachment downloads return not found and do not write audit entries.
- Audit metadata excludes file bodies and `contentBase64`.

## Guard And Permission Model Summary

The covered routes remain under the existing guarded controllers:

- `JwtAuthGuard`
- `OrganizationContextGuard`
- `PermissionGuard`
- `attachments.download` for attachment downloads
- `generatedDocuments.download` for generated-document downloads

The controllers now pass the authenticated user ID to the service download methods so the audit rows can identify the actor. Service-level organization filtering still happens before storage reads and before audit logging.

## Bugs Found

The existing persisted artifact download routes returned files without dedicated download audit-log entries.

No accounting correctness defect was found.

No tenant-isolation defect was found in the covered services; the existing organization filters already prevented cross-tenant reads before storage access.

## Fixes Implemented

- Added `ATTACHMENT_DOWNLOADED` and `GENERATED_DOCUMENT_DOWNLOADED` audit event constants.
- Added `Attachment:DOWNLOAD` and `GeneratedDocument:DOWNLOAD` standardization.
- Added actor-aware audit logging after successful attachment content reads.
- Added actor-aware audit logging after successful generated-document content reads.
- Added tests for successful download audit logging, standardized persisted event names, cross-tenant no-log behavior, and deleted attachment no-log behavior.
- Added proof docs for covered and uncovered download-audit areas.

No accounting logic changed. No Prisma schema or migration changed. No hosted operation was run.

## Remaining Untested Or Unimplemented Areas

- Report PDF endpoints such as profit and loss, aged receivables, invoice PDFs, and purchase bill PDFs still do not have dedicated download audit entries in this lane.
- Report-pack artifact downloads remain unimplemented because report-pack generation/download execution is still intentionally disabled.
- Browser E2E proof of the new audit rows is not included; the API/service proof covers the persisted artifact download behavior.
- Provider-backed object storage and signed URL download audit behavior still need a separate provider-approved lane.
- Hosted/staging proof is still blocked until the owner supplies the approved packet values.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Initial targeted test attempt before Prisma generation - failed because Prisma client types were not generated in the fresh worktree.
- Targeted download audit tests - passed, 36 tests.
- Prisma validate with local placeholder URL - passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed. API reported 174 passed suites with 28 skipped tests and 1573 passed tests; web reported 157 passed suites with 692 passed tests. The web suite printed its existing worker force-exit warning after all tests passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed with existing CRLF normalization warnings only.
- Generated-file check - `apps/web/next-env.d.ts` build churn was restored; final check has no diff.
- Changed-file trailing whitespace scan - no matches.
- Targeted high-risk credential scan - no credential leak; matches were synthetic redaction fixtures or existing safe boundary wording.

## Remaining Risks

- This lane proves direct persisted artifact downloads only. It does not claim audit coverage for every PDF/export endpoint.
- If future signed URL or report-pack artifact downloads bypass these services, they must add their own dedicated audit events.

## Next Recommended Prompt

Codex, review the download audit proof PR for owner-review readiness only. Confirm diff scope, audit event standardization, successful-download audit logging, no-log behavior for cross-tenant/not-found downloads, generated-file cleanliness, credential scan results, and verification status. Do not add report-pack generation, hosted mutations, hosted migrations, cleanup execute, provider calls, banking/reconciliation work, UAE ASP work, ZATCA work, or accounting logic changes.
