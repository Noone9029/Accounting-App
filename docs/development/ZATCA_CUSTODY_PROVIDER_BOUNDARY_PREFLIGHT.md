# ZATCA Custody Provider Boundary Preflight

Date: 2026-06-07

## Scope

This is a docs-only and code-inspection-only preflight for the next ZATCA custody provider boundary. It does not implement a provider, request or process OTPs, request CSIDs, call ZATCA, create request bodies for real submission, process response bodies, generate or store private keys, store raw certificates or CSRs, implement signing, implement clearance/reporting, implement PDF-A-3, change provider/environment configuration, deploy, run migrations, or claim production compliance.

LedgerByte remains controlled beta/user-testing only. Real ZATCA production compliance is not enabled.

## Repository State

- Branch inspected: `codex/zatca-custody-provider-boundary-preflight`
- Latest branch commit inspected: `778a7638cf0ec2328d5430f9c410d4146a24f112 Document ZATCA custody provider boundary branch start`
- Branch remote head inspected: `778a7638cf0ec2328d5430f9c410d4146a24f112`
- `origin/main` inspected: `fd6dbff97e5c669a1c2cda1fc329fecdda5bb809`
- Local handoff commit preserved on this branch: `39eafadc08b54507e5d5899a10459e28fccc1bcc`
- Regular worktree status before this doc: clean
- `git diff --stat` before this doc: no tracked diff
- `git diff --name-status` before this doc: no tracked diff
- `git diff --check` before this doc: clean

## Graphify Status

- `graphify-out/` remains ignored and preserved on disk.
- `apps/graphify-out/` remains ignored and preserved on disk.
- Tracked graphify files: 0.
- Graphify files deleted: 0.
- Graphify output was not staged or inspected by body content.

## Files And Areas Inspected

Primary files and areas inspected:

- `CODEX_HANDOFF.md`
- `docs/development/ZATCA_CUSTODY_PROVIDER_BOUNDARY_BRANCH_START.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_PREFLIGHT.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_FOUNDATION_EVIDENCE.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_MERGE_READINESS.md`
- `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_POST_MERGE.md`
- `docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`
- `docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md`
- `docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`
- `docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md`
- `docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md`
- `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md`
- `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`
- `docs/zatca/SANDBOX_CSID_ONBOARDING_PLAN.md`
- `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260607110000_zatca_key_custody_csid_lifecycle_foundation/migration.sql`
- `apps/api/src/zatca/**`
- `apps/api/src/zatca/custody/**`
- `apps/api/src/zatca/adapters/**`
- `apps/api/src/zatca-sdk/**`
- `apps/web/src/app/(app)/settings/zatca/**`
- `apps/web/src/lib/zatca.ts`
- `apps/web/src/lib/types.ts`
- `package.json`
- `scripts/zatca-*.cjs`
- `scripts/zatca-*.test.cjs`

All inspection was structural and metadata-oriented. No secret-like values, request bodies, response bodies, signed XML bodies, QR payloads, generated document bodies, customer/vendor data, or provider payload bodies were printed into this document.

## Current Custody And Readiness State

- The metadata-only ZATCA key custody and CSID lifecycle foundation is merged to `main`.
- The ZATCA settings UI exposes readiness and lifecycle metadata, and says production compliance is not enabled.
- The active Prisma schema contains `ZatcaCredentialLifecycleStatus`, `ZatcaCredentialCustodyProviderType`, and `ZatcaCredentialLifecycle`.
- `ZatcaCredentialLifecycle` stores lifecycle state, provider type, reference alias, certificate metadata, CSID status metadata, timestamps, actor references, and safety flags only.
- `ZatcaComplianceCsidCustodyRecord` stores metadata-only custody planning records with request/certificate request identifiers, presence booleans, storage-mode placeholders, expiry/renewal metadata, status, revocation metadata, and `productionCompliance=false`.
- Existing no-network guards and results keep sandbox adapter execution, request body creation, response body processing, CSID requests, OTP capture, DB writes, signing, clearance/reporting, PDF-A-3, and production compliance blocked.
- Existing local dummy SDK evidence remains local/no-network/dummy-material evidence only.

## Sandbox Portal Reference

Future sandbox portal/access reference only:

`https://sandbox.zatca.gov.sa/IntegrationSandbox`

This preflight did not open the portal, automate a browser, enter credentials, request or capture an OTP, create a CSID request body, process a CSID response body, call a ZATCA endpoint, or store sandbox account material. Portal credentials must never enter the repository, docs, logs, shell history, chat, tests, or generated artifacts.

## Current Provider And Code Surfaces

Current custody/provider surfaces found:

- `apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts`
  - `ComplianceCsidSecretCustodyProvider`
  - `DisabledComplianceCsidSecretCustodyProvider`
  - `MockedSecretsManagerComplianceCsidCustodyProvider`
  - `MockedKmsComplianceCsidCustodyProvider`
  - `createComplianceCsidSecretCustodyProvider`
  - `readComplianceCsidCustodyProviderConfig`
- `apps/api/src/zatca/compliance-csid-custody-provider.spec.ts`
- `apps/api/src/zatca/compliance-csid-custody-records.spec.ts`
- `apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts`
- `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts`
- `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts`
- `apps/api/src/zatca/adapters/compliance-csid-http.mapper.ts`
- `apps/api/src/zatca/zatca.controller.ts`
- `apps/api/src/zatca/zatca.service.ts`
- `apps/web/src/app/(app)/settings/zatca/page.tsx`
- `apps/web/src/lib/zatca.ts`
- `apps/web/src/lib/types.ts`

Important findings:

- Runtime provider creation still returns the disabled provider.
- Mocked secrets-manager and KMS classes are test/client-contract scaffolds only.
- Provider configuration is summarized with booleans/redacted metadata and remains disabled.
- The disabled provider fails closed and sanitizes errors.
- The sandbox-disabled adapter refuses real network execution.
- The HTTP sandbox adapter contains scaffolding but throws before compliance CSID HTTP execution in this phase.
- `compliance-csid-http.mapper.ts` contains request mapping concepts; request body creation for real submission remains a later, separately approved lane.
- The settings UI includes local/mock planning controls and copy. Existing mock OTP fields must not be reused for real sandbox OTP handling.

## Current Database And Storage Surfaces

Normal application tables currently store or can store these ZATCA-related categories:

- `ZatcaOrganizationProfile`: organization-level seller/profile readiness metadata.
- `ZatcaEgsUnit`: EGS metadata plus legacy body-capable fields.
- `ZatcaCsrConfigReview`: sanitized CSR config review metadata and approval/revocation metadata.
- `ZatcaComplianceCsidCustodyRecord`: metadata-only CSID custody planning records.
- `ZatcaCredentialLifecycle`: metadata-only key custody and CSID lifecycle state.
- `ZatcaSignedArtifactDraft`: signed-artifact draft metadata and object-reference style fields.
- `ZatcaSignedArtifactStoragePolicyApproval`: policy metadata with body persistence blocked by default.
- `ZatcaSignedArtifactStorageControlEvidence`: metadata-only control evidence.
- `ZatcaSubmissionLog`: request/response payload columns exist and are unsafe for future real ZATCA bodies without a separate quarantine/redaction plan.

The next custody provider boundary can use the existing lifecycle and custody metadata models for provider type, alias/reference, state, and readiness flags. A new normal-DB table is not required for the first interface/disabled/mock/local-reference boundary unless implementation discovers a narrow metadata-only audit/reference history need. Any future schema addition must remain metadata-only.

## Legacy Raw PEM And Body-Capable Blockers

The following existing fields remain blockers for any real custody or onboarding execution:

- `ZatcaEgsUnit.csrPem`
- `ZatcaEgsUnit.privateKeyPem`
- `ZatcaEgsUnit.complianceCsidPem`
- `ZatcaEgsUnit.productionCsidPem`
- `ZatcaSubmissionLog.requestPayloadBase64`
- `ZatcaSubmissionLog.responsePayloadBase64`
- Signed-artifact body/storage-key surfaces unless object storage and no-body policy are approved separately.

These fields may exist for legacy local/mock readiness, but they must not receive real OTPs, real CSIDs, raw private keys, raw CSRs, raw certificate bodies, binary security token bodies, request bodies, response bodies, signed XML bodies, QR payload bodies, provider payload bodies, or production credentials.

Required future blocker lane: quarantine/deprecate the legacy raw PEM and payload-body-capable surfaces before any real sandbox response body can be processed.

## Safe Custody Provider Boundary Design

Recommended provider posture:

1. Keep `DISABLED` as the runtime default and fail closed.
2. Add explicit interface contracts before adding real provider integrations.
3. Add local-reference/mock providers only for tests and no-network dry-runs.
4. Represent provider output as metadata, redacted references, versions, handles, and booleans only.
5. Do not return raw secret material from provider methods to API, UI, logs, audit events, docs, tests, or evidence.
6. Do not wire a real secrets-manager, KMS, HSM, or external provider until a later approved implementation lane.
7. Keep production signing direction pointed at KMS/HSM/external signing or equivalent non-exportable signing boundary.
8. Treat cloud secrets manager as a possible sandbox/non-production custody reference provider, not as automatic production signing readiness.
9. Avoid encrypted normal-DB secret storage for private keys; if ever considered for non-key material, it requires a separate approval and threat model.

Recommended provider kinds for next lane:

- `DISABLED` or repo-equivalent default provider.
- `LOCAL_REFERENCE` or repo-equivalent local dummy/reference provider for tests only.
- `MOCK_SECRETS_MANAGER_REFERENCE` or repo-equivalent mocked provider for unit contract tests only.
- `MOCK_KMS_SIGNING_HANDLE` or repo-equivalent mocked provider for unit contract tests only.

No real provider SDK, credential, environment mutation, network call, signing operation, or body persistence should be added in the next lane.

## Forbidden Data Classes

The provider boundary must reject, redact, and avoid logging these classes:

- OTP values.
- Raw private keys.
- Raw CSRs.
- Raw certificate bodies.
- Binary security token bodies.
- Secret bodies.
- Auth headers.
- Tokens and passwords.
- Signed XML bodies.
- QR payload bodies.
- Request bodies.
- Response bodies.
- Provider payload bodies.
- PDF bodies.
- Production credentials.
- Customer, vendor, bank account, or generated document bodies.

These classes must not be stored in normal application tables, persisted in evidence, echoed in UI/API responses, printed to stdout/stderr, placed in tests as live values, copied into docs, or committed.

## Metadata-Only Safe Data Classes

The following are acceptable for normal application tables and evidence when redacted/sanitized:

- Provider type.
- Provider alias or reference id.
- Provider reference version id.
- Redacted/masked provider identifier.
- Environment.
- Lifecycle status.
- Compliance CSID status.
- Production CSID status.
- Certificate fingerprint/thumbprint.
- Certificate serial number.
- Certificate issuer metadata.
- Certificate subject metadata.
- Certificate not-before/expiry timestamps.
- Request id or certificate request id when it is not a body or credential.
- Readiness timestamps.
- Revoked/disabled timestamps.
- Rotation-required metadata.
- Boolean `hasToken`, `hasSecret`, `hasCertificate`, and similar presence flags.
- Audit actor ids and metadata-only audit event ids.
- `metadataOnly=true`.
- `productionCompliance=false`.

## Sandbox Account And Access Boundary

Future sandbox access must follow these gates:

- The portal URL may be documented as a reference only.
- Portal credentials must not enter the repo, docs, logs, chat, test fixtures, generated artifacts, or shell commands.
- OTP capture must be manual, ephemeral, and separately approved later.
- OTP values must never be logged, stored, echoed, committed, or displayed after entry.
- Request body creation must be separately approved later.
- Response body processing must be separately approved later.
- Real network execution must be separately approved later.
- Sandbox CSID response custody must be approved before any real response body can exist in app code.
- Production CSID execution remains out of scope until a separate production onboarding lane.

## Proposed Provider Interface Design

Repo-appropriate names can vary, but the next lane should preserve these interface principles:

```ts
interface ZatcaCustodyProviderBoundary {
  storeSandboxCsidResponseMetadataOnly(input: MetadataOnlyCsidResponseInput): Promise<CustodyMetadata>;
  storeSecretMaterialReferenceOnly(input: SecretMaterialReferenceInput): Promise<StoredReferenceMetadata>;
  retrieveSigningHandleNotPrivateKey(input: SigningHandleLookupInput): Promise<SigningHandleMetadata>;
  revokeReference(input: RevokeReferenceInput): Promise<CustodyMetadata>;
  rotateReference(input: RotateReferenceInput): Promise<CustodyMetadata>;
  verifyReferenceHealth(input: ReferenceHealthInput): Promise<ReferenceHealthMetadata>;
}
```

Design constraints:

- `storeSandboxCsidResponseMetadataOnly` must not accept response bodies. It records only booleans, ids, fingerprints, expiry, provider alias/reference, and lifecycle state.
- `storeSecretMaterialReferenceOnly` must accept references/handles only, not secret bodies.
- `retrieveSigningHandleNotPrivateKey` must return a non-exportable handle/metadata object only, never PEM/DER/key bytes.
- `revokeReference` and `rotateReference` must operate on references and metadata; real provider calls remain disabled until later approval.
- `verifyReferenceHealth` must return booleans/statuses and redacted reference metadata only.
- All methods must run through forbidden-key and forbidden-value guards.
- Errors must be sanitized and must never include provider paths, env values, token bodies, certificate bodies, key material, request bodies, response bodies, or auth headers.

Mapping to current code:

- Existing `ComplianceCsidSecretCustodyProvider.storeComplianceToken`, `storeComplianceSecret`, `storeComplianceCertificate`, and `revokeReference` can be adapted or wrapped for reference-only behavior.
- Current mocked providers should stay test-only.
- `createComplianceCsidSecretCustodyProvider` should continue returning disabled provider until a later approved real provider lane.
- The settings UI should display provider readiness and references only; it must not collect real OTPs or raw materials.

## Proposed Test Strategy

Targeted tests for the next lane should cover:

- Disabled provider remains runtime default.
- Provider factory does not instantiate real providers from env alone.
- Provider config summary redacts values and reports booleans only.
- Local-reference provider returns references/handles only and no bodies.
- Mock secrets-manager/KMS providers remain unit-contract-only and no-network.
- Forbidden keys are rejected for private keys, CSRs, cert bodies, OTPs, tokens, signed XML, QR payloads, request bodies, response bodies, and provider payloads.
- Forbidden value patterns are rejected even under allowed metadata keys.
- Error messages are sanitized.
- Lifecycle and custody metadata records remain `metadataOnly=true` and `productionCompliance=false`.
- UI renders provider readiness/reference metadata and blocked capability copy.
- No-network guard scripts remain green in plan/static mode.

Safe candidate commands for the next implementation lane:

- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')"`
- `git diff --check`
- `corepack pnpm --dir apps/api exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca.*custody`
- `corepack pnpm --dir apps/api exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca-credential-lifecycle`
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=settings/zatca`
- `corepack pnpm test:zatca-csid-response-custody-guard`
- `corepack pnpm test:zatca-sandbox-adapter-no-network-contract`

Do not run migrations, E2E, smoke, browser login/audit flows, exports/downloads/PDF generation, real ZATCA calls, seed/reset/delete, deploys, production checks, or destructive cleanup.

## Proposed Documentation Updates

If the next implementation lane proceeds, update only documentation that directly records the new boundary:

- `docs/development/ZATCA_CUSTODY_PROVIDER_BOUNDARY_IMPLEMENTATION.md`
- Existing `docs/zatca/CSID_RESPONSE_CUSTODY_*` docs only if wording needs to reflect the new disabled/mock/local-reference provider boundary.
- `CODEX_HANDOFF.md` only with a minimal branch handoff if the repo continues using it as the active handoff.

Documentation must keep the same safety wording: no real OTP, no real CSID, no real ZATCA network, no real private keys, no raw certificates, no raw CSRs, no request/response bodies, no signing, no clearance/reporting, no PDF-A-3, no production credentials, and no production compliance claim.

## Safe Search Summary

Searches were run path/count-only across ZATCA docs/code/tests, schema, scripts, settings UI, and package metadata. Generated graphify output, reference artifacts, logs, build output, and test-results were excluded.

| Term | Matching files | Matches | Preflight interpretation |
| --- | ---: | ---: | --- |
| `custody provider` | 46 | 134 | Expected docs, provider boundary, tests, and blocked readiness wording. |
| `ComplianceCsid` | 60 | 949 | Expected API/test/type naming for compliance CSID planning. |
| `CSID` | 195 | 4778 | Broad ZATCA docs/code/test terminology; remains blocked for real execution. |
| `OTP` | 104 | 1234 | Docs, tests, lifecycle state, and blocked/mock planning; no real OTP used. |
| `privateKeyPem` | 35 | 95 | Legacy raw PEM-capable blocker and tests. |
| `complianceCsidPem` | 34 | 112 | Legacy raw CSID/certificate-capable blocker and mock/local readiness. |
| `productionCsidPem` | 32 | 83 | Legacy production CSID-capable blocker. |
| `raw PEM` | 28 | 43 | Expected blocker/docs wording. |
| `certificate body` | 45 | 145 | Expected forbidden/body-blocking docs/tests. |
| `response body` | 155 | 332 | Expected guard/docs/tests and legacy submission-log concern. |
| `request body` | 83 | 198 | Expected guard/docs/tests and future request schema lane. |
| `secret` | 239 | 1783 | Expected docs/provider/test terminology; no live secret values were printed. |
| `token` | 339 | 1334 | Expected CSID/security-token docs/tests and blockers. |
| `signing` | 236 | 1895 | Existing local/dummy/readiness terminology; real signing remains blocked. |
| `clearance` | 228 | 1019 | Existing blocked readiness terminology. |
| `reporting` | 239 | 1050 | Existing blocked readiness terminology. |
| `PDF-A3` | 93 | 203 | Existing blocked readiness terminology. |
| `ZATCA_SANDBOX` | 29 | 107 | Env/config/guard terminology; values not printed. |
| `ZATCA_ENABLE_REAL_NETWORK` | 18 | 33 | Expected no-network guard/config terminology. |
| `sandbox adapter` | 47 | 344 | Expected adapter docs/tests; execution remains blocked. |
| `no-network` | 78 | 408 | Expected guard/test/readiness evidence. |
| `IntegrationSandbox` | 0 | 0 | No prior repo references found before this preflight doc. |

## Implementation Blockers

Implementation should stop unless these blockers are respected:

- Real provider type and trust boundary are not approved.
- Runtime provider must remain disabled by default.
- Legacy raw PEM-capable fields remain present.
- Legacy request/response payload columns remain unsafe for real ZATCA bodies.
- Sandbox portal credentials and OTP process are not approved.
- Request body schema creation for real submission is not approved.
- Real response body processing is not approved.
- Real network execution is not approved.
- Signing, clearance/reporting, PDF-A-3, production CSID, and production compliance remain out of scope.
- Provider/env configuration must not be changed in this branch without a later explicit approval.

## Future Implementation Lanes

Recommended order:

1. Custody provider boundary implementation.
2. Unsafe legacy PEM field quarantine/deprecation plan.
3. Sandbox CSID request body schema dry-run.
4. Sandbox CSID response custody dry-run.
5. Sandbox-only CSID request execution approval.
6. Sandbox-only CSID request execution.
7. Local signing with custodied dummy/sandbox references.
8. Phase 2 QR sandbox validation.
9. Clearance/reporting sandbox plan.
10. PDF-A-3 sandbox archive plan.

## Approval Phrase Required For Next Lane

`I approve LedgerByte ZATCA custody provider boundary implementation: interface and disabled/mock/local-reference providers only; no real OTP, no real CSID, no real ZATCA network, no real private keys, no raw certificates, no raw CSRs, no request/response bodies, no signing, no clearance/reporting, no PDF-A-3, no production credentials, and no production compliance claim.`

## Recommended Next Prompt

`LedgerByte implement ZATCA custody provider boundary.`
