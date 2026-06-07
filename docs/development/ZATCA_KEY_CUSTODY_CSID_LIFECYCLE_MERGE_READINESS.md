# ZATCA Key Custody CSID Lifecycle Merge Readiness

Date: 2026-06-07

Branch: `codex/dev-12-generated-documents-storage-retention`

Latest ZATCA evidence commit inspected before this note: `f34f9f5b Verify ZATCA key custody CSID lifecycle foundation evidence`

## Scope

Final merge/push-readiness verification for the metadata-only ZATCA key custody and CSID lifecycle foundation. This note does not authorize merge to `main`, production launch, real ZATCA onboarding, real signing, clearance/reporting, PDF/A-3, provider/environment changes, or production compliance claims.

## Remote And Worktree Status

- Local branch: `codex/dev-12-generated-documents-storage-retention`.
- Regular worktree before this note: clean.
- Remote before this note: `origin/codex/dev-12-generated-documents-storage-retention` pointed to `a0942d3a Finalize graphify generated output decision`.
- Local branch before this note: ahead of origin by 3 commits: preflight, foundation implementation, and foundation evidence.
- Push result at note creation: not pushed yet; final push verification is recorded in the task final deliverable.

## Graphify Status

- `graphify-out/` and `apps/graphify-out/` remain ignored.
- Graphify files preserved on disk: 68.
- Tracked graphify files: 0.
- Graphify files staged: 0.
- Graphify files deleted: 0.

## Commits And Docs Inspected

- `84486e5a Document ZATCA key custody CSID lifecycle preflight`
- `e69912d4 Implement ZATCA key custody CSID lifecycle foundation`
- `f34f9f5b Verify ZATCA key custody CSID lifecycle foundation evidence`
- `CODEX_HANDOFF.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_PREFLIGHT.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION_EVIDENCE.md`

## Metadata-Only Safety Confirmation

- New foundation schema/model is additive and metadata-only.
- No new raw private key storage.
- No new raw certificate storage.
- No new raw CSR storage.
- No OTP storage.
- No real CSID storage beyond safe metadata, status, and reference aliases.
- No signed XML body storage introduced by this foundation.
- No QR payload body storage introduced by this foundation.
- No request or response body storage introduced by this foundation.
- No PDF body storage introduced by this foundation.
- No provider payload storage introduced by this foundation.
- Real onboarding, signing, clearance/reporting, PDF/A-3, and production compliance remain blocked.

Existing ZATCA preparation code and docs still contain legacy/local readiness concepts for development placeholders and signed-artifact metadata. Those were not introduced by the lifecycle foundation and remain blockers for real production material.

## Forbidden-Term Search

Safe path/count-only search was run for `privateKey`, `rawPrivateKey`, `certificateBody`, `csrBody`, `otp`, `token`, `secret`, `password`, `signedXml`, `qrPayload`, `requestBody`, `responseBody`, `production compliance`, and `compliant`.

Appearances were classified as safe validation/rejection tests, blocked UI wording, documentation disclaimers, redaction flags, existing local/dummy readiness terminology, or legacy preparation fields not introduced by this foundation. No secret-like values or payload bodies were printed.

## Checks Run

- `git branch --show-current`: passed.
- `git status --short`: clean before this note.
- `git status --short --ignored`: graphify ignored directories visible.
- `git log -15 --oneline`: inspected.
- `git diff --stat`: clean before this note.
- `git diff --name-status`: clean before this note.
- `git diff --check`: passed.
- `git ls-files graphify-out apps/graphify-out`: no tracked files.
- `git show --stat --oneline 84486e5a`: inspected.
- `git show --stat --oneline e69912d4`: inspected.
- `git show --stat --oneline f34f9f5b`: inspected.
- `git show --check f34f9f5b`: passed.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')"`: passed.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca-credential-lifecycle` from `apps/api`: passed, 1 suite / 4 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca` from `apps/api`: passed, 12 suites / 209 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=settings/zatca` from `apps/web`: passed, 1 suite / 1 test.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: passed.

## PR Status

GitHub CLI is not installed in this workspace, so no PR was inspected or posted via `gh`. No PR was opened, merged, auto-merged, or marked production-ready by this task.

Suggested PR title:

`ZATCA key custody and CSID lifecycle metadata foundation`

Suggested PR body:

```markdown
## Summary

- Adds metadata-only ZATCA key custody and CSID lifecycle foundation.
- Adds additive Prisma metadata model/migration artifact, guarded API/service/DTO endpoints, safe audit event mapping, and ZATCA settings UI lifecycle metadata.
- Adds evidence documentation for preflight, foundation implementation, verification, and merge readiness.

## Evidence

- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_PREFLIGHT.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION_EVIDENCE.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_MERGE_READINESS.md`

## Checks

- API ZATCA lifecycle Jest passed.
- API ZATCA targeted Jest passed.
- Web ZATCA settings Jest passed.
- API typecheck passed.
- Web typecheck passed.
- `git diff --check` passed.

## Safety Boundaries

- No real OTP.
- No real CSID.
- No real private keys, raw certificates, raw CSRs, tokens, secrets, signed XML, QR payloads, request/response bodies, PDF bodies, or provider payloads.
- No real ZATCA network calls.
- No signing.
- No clearance/reporting.
- No PDF/A-3.
- No migrations applied.
- No deploys or provider/environment changes.
- Real ZATCA production compliance is not enabled.

## Remaining Blockers

- Real custody provider approval.
- KMS/HSM or equivalent signing boundary.
- Real CSR/OTP/CSID onboarding.
- Certificate rotation/revocation runbooks.
- Signing, Phase 2 QR, clearance/reporting, PDF/A-3, signed artifact storage, and official/legal/accounting review.
```

## Remaining Blockers

- Real custody provider selection and approval.
- External KMS/HSM or equivalent signing boundary.
- Safe CSR generation boundary for real materials.
- Ephemeral OTP capture and approval workflow.
- Compliance CSID request execution approval.
- Production CSID lifecycle approval.
- Certificate rotation/revocation and incident runbooks.
- Signing, Phase 2 QR, clearance/reporting, PDF/A-3, signed artifact storage, official/legal/accounting review, and production readiness remain blocked.

## Next Prompt

`LedgerByte open or update ZATCA custody foundation PR`
