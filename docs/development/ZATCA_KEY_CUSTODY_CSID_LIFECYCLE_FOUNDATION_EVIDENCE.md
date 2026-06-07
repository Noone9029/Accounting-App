# ZATCA Key Custody CSID Lifecycle Foundation Evidence

Date: 2026-06-07

Branch: `codex/dev-12-generated-documents-storage-retention`

Starting commit inspected: `e69912d4 Implement ZATCA key custody CSID lifecycle foundation`

## Worktree And Graphify Status

- Regular `git status --short`: clean before verification and before this evidence document was created.
- Ignored graphify status: `graphify-out/` and `apps/graphify-out/` remain ignored.
- Graphify files on disk: 68.
- Tracked graphify artifacts: 0.
- Graphify deletion performed: no.

## Commit Files Inspected

- `CODEX_HANDOFF.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260607110000_zatca_key_custody_csid_lifecycle_foundation/migration.sql`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/src/zatca/dto/update-zatca-credential-lifecycle.dto.ts`
- `apps/api/src/zatca/dto/zatca-credential-lifecycle-action.dto.ts`
- `apps/api/src/zatca/zatca-credential-lifecycle.spec.ts`
- `apps/api/src/zatca/zatca.controller.ts`
- `apps/api/src/zatca/zatca.service.ts`
- `apps/web/src/app/(app)/settings/zatca/page.tsx`
- `apps/web/src/app/(app)/settings/zatca/page.test.tsx`
- `apps/web/src/lib/types.ts`
- `apps/web/src/lib/zatca.ts`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_PREFLIGHT.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION.md`
- `docs/zatca/**`
- `packages/zatca-core/**`
- `package.json`

Note: root `prisma/schema.prisma` does not exist in this workspace; the active Prisma schema inspected is `apps/api/prisma/schema.prisma`.

## Schema And Migration Verification

- Result: pass for the new foundation model.
- The commit adds `ZatcaCredentialLifecycleStatus` and `ZatcaCredentialCustodyProviderType` enums.
- The commit adds one additive metadata model, `ZatcaCredentialLifecycle`, scoped by organization, EGS unit, and environment.
- The new model stores lifecycle status, custody provider type, custody reference alias, certificate metadata, CSID lifecycle metadata, readiness timestamps, disable/revoke metadata, actor references, and safety flags.
- The new model does not add raw private-key, raw certificate, raw CSR, OTP, token, secret, signed XML, QR payload, request body, response body, PDF body, provider payload, or credential body columns.
- The migration artifact repeats the metadata-only boundary in comments and creates only the metadata enums/table/indexes/foreign keys.
- No migration command was run in this verification lane.

Existing schema note: older ZATCA preparation models still contain legacy development/private-key or signed-artifact reference concepts. Those were not introduced by this foundation commit and remain documented as blockers for real production material.

## Backend And API Verification

- Result: pass.
- Controller endpoints are limited to reading lifecycle metadata, reading EGS lifecycle metadata, metadata-only upsert, disable, and revoke.
- Endpoints use existing ZATCA view/manage permission gates and organization-scoped service methods.
- Service validation rejects unsafe fields and values, including raw private-key, PEM, raw certificate, raw CSR, OTP, token, secret, password, signed XML, QR payload, request body, response body, provider payload, auth header, cookie, and body-like XML/material patterns.
- API responses force safe envelope flags such as `localOnly`, `metadataOnly`, `noNetwork`, `noCsidRequest`, `noSigning`, `noClearanceReporting`, `noPdfA3`, `noProductionCredentials`, and `productionCompliance: false`.
- Redaction flags report that private keys, certificate bodies, CSR bodies, OTPs, tokens, secrets, signed artifacts, QR bodies, provider request payloads, and provider response payloads are not returned.
- Audit mapping records metadata upsert/disable/revoke actions against `ZatcaCredentialLifecycle`; inspected payloads use safe lifecycle metadata rather than bodies.
- Real onboarding, real signing, clearance/reporting, PDF/A-3, production CSID, and production compliance remain blocked or absent from this foundation path.

## UI Verification

- Result: pass.
- The ZATCA settings page fetches `/zatca/key-custody-lifecycle` and renders a metadata-only lifecycle panel.
- The UI displays lifecycle status, environment, custody provider, reference alias, certificate fingerprint, certificate expiry, compliance CSID status, production CSID status, and schema availability metadata.
- The UI states that ZATCA production compliance is not enabled.
- The UI states that OTPs, private keys, certificate bodies, CSR bodies, CSID tokens, request/response bodies, signed XML, QR payloads, network calls, signing, clearance/reporting, PDF/A-3, and production compliance are not enabled in this foundation panel.
- No new UI fields collect real OTPs, private keys, raw certificates, raw CSRs, CSID token bodies, secrets, or production credentials.

## Test Coverage Verification

- API lifecycle tests cover metadata-only not-configured readiness, lifecycle/status mapping, metadata upsert, unsafe field/value rejection, safe response flags, and metadata-only disable/revoke actions.
- API ZATCA targeted tests cover the existing ZATCA no-network/readiness surface plus the new lifecycle spec.
- Web ZATCA settings test covers preparation-only wording, local/no-network messaging, blocked signing/clearance/reporting/PDF-A3, lifecycle metadata display, and production compliance disabled wording.

## Documentation Verification

- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION.md` accurately states metadata-only implementation and explicitly says there was no real OTP, CSID, private-key generation/storage, ZATCA network, signing, clearance/reporting, PDF/A-3, provider/env change, deploy, migration execution, or production compliance claim.
- `CODEX_HANDOFF.md` was updated minimally with the foundation lane summary and next verification prompt.
- Documentation keeps LedgerByte in controlled beta/user-testing readiness posture and does not claim production ZATCA compliance.

## Safe Forbidden-Term Search

Search scope: ZATCA docs/code/tests, foundation docs, settings UI, API schema/migration, `packages/zatca-core`, and `package.json`.

The search printed file paths and counts only, not values. Matches were classified as safe documentation warnings, forbidden-field rejection tests, redaction/blocked wording, existing local/dummy readiness code, or legacy preparation fields not introduced by this commit.

| Term | Matching file count | Verification result |
| --- | ---: | --- |
| `privateKey` | 35 | Expected warnings, legacy prep code, and new rejection/redaction flags; no new lifecycle body storage. |
| `rawPrivateKey` | 2 | Rejection tests/service guard only. |
| `pem` | 62 | Expected legacy prep/docs/fixtures references; new lifecycle model stores no PEM body. |
| `certificateBody` | 15 | Rejection/redaction/docs warnings only for this foundation path. |
| `csrBody` | 5 | Rejection/redaction/docs warnings only for this foundation path. |
| `otp` | 80 | Lifecycle state, docs warnings, blocked wording, and tests; no OTP storage in new model. |
| `token` | 75 | Docs warnings, legacy readiness, rejection/redaction flags; no token body storage in new model. |
| `secret` | 70 | Docs warnings, provider planning, rejection/redaction flags; no secret body storage in new model. |
| `password` | 8 | Existing auth/config terminology and rejection guard; no new credential field. |
| `signedXml` | 24 | Existing signed-artifact readiness and rejection flags; no signed XML body storage in new model. |
| `qrPayload` | 23 | Existing QR readiness/evidence metadata and rejection flags; no QR body storage in new model. |
| `requestBody` | 8 | Docs/guard wording and rejection tests; no request body storage in new model. |
| `responseBody` | 13 | Docs/guard wording and rejection tests; no response body storage in new model. |
| `clearance` | 80 | Existing blocked readiness wording and tests; foundation path does not implement clearance. |
| `reporting` | 86 | Existing blocked readiness wording and tests; foundation path does not implement reporting. |
| `production compliance` | 57 | Disclaimers and false/blocked wording; no production compliance claim. |
| `compliant` | 6 | Existing docs/UI warnings; no claim that LedgerByte is production compliant. |

## Checks Run

- `git branch --show-current`: `codex/dev-12-generated-documents-storage-retention`.
- `git status --short`: clean before evidence doc creation.
- `git status --short --ignored`: ignored local artifacts shown, including `graphify-out/` and `apps/graphify-out/`.
- `git log -12 --oneline`: latest commit was `e69912d4 Implement ZATCA key custody CSID lifecycle foundation`.
- `git diff --stat`: clean before evidence doc creation.
- `git diff --name-status`: clean before evidence doc creation.
- `git diff --check`: passed.
- `git show --stat --oneline e69912d4`: inspected.
- `git show --name-status --oneline e69912d4`: inspected.
- `git show --check e69912d4`: passed.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')"`: passed.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca-credential-lifecycle` from `apps/api`: passed, 1 suite / 4 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca` from `apps/api`: passed, 12 suites / 209 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=settings/zatca` from `apps/web`: passed, 1 suite / 1 test.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: passed.

## Safety Boundaries Preserved

- No migrations were run.
- No seed/reset/delete actions were run.
- No deploys or provider/environment changes were made.
- No real ZATCA services were called.
- No real OTP, CSID, certificate, private key, credential, secret, or production material was used.
- No real signing, clearance/reporting, PDF/A-3, export/download/PDF generation, browser login/audit-writing flow, E2E, smoke, backup/restore, production check, or destructive cleanup was run.
- No graphify output was staged or deleted.

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

`LedgerByte ZATCA custody foundation merge/push readiness`
