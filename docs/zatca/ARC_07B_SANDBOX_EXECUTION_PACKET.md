# ARC-07B sandbox execution packet

Date: 2026-07-29
Status: **READY FOR FRESH ONE-SHOT OWNER APPROVAL / STATIC STAGE READY / NO EXECUTION**

This metadata-only packet prepares a future synthetic-data sandbox run. It is not an approval, contains no unreviewed or dynamically supplied target, credential, CSR, OTP, request body, XML, QR value, certificate, or response body, and cannot enable network execution.

## Baseline and local proof lineage

- Current main baseline before this packet update: `999d10a17116708bea8e5cb46a216be47f422bbe`.
- ARC-07A local conformance: PR [#385](https://github.com/Noone9029/Accounting-App/pull/385), merge `20315e55`.
- ARC-07B credential custody boundary: PR [#389](https://github.com/Noone9029/Accounting-App/pull/389), merge `aa0514d6`.
- ARC-07B disabled adapter boundary: PR [#390](https://github.com/Noone9029/Accounting-App/pull/390), merge `4c1ee7ae`.
- ARC-07B transactional state: PR [#391](https://github.com/Noone9029/Accounting-App/pull/391), merge `e5a961f1`.
- ARC-07B loopback lifecycle proof: PR [#392](https://github.com/Noone9029/Accounting-App/pull/392), merge `d9a8df0b`.
- ARC-07B-06A official contract evidence: PR [#394](https://github.com/Noone9029/Accounting-App/pull/394), merge `6e7d0427`.
- ARC-07B-06B local DPAPI custody: PR [#395](https://github.com/Noone9029/Accounting-App/pull/395), merge `c5604447`.
- ARC-07B-06C local CSR cryptographic proof: PR [#396](https://github.com/Noone9029/Accounting-App/pull/396), merge `4c2db6dd`.
- ARC-07B-06D secure ephemeral OTP boundary: PR [#397](https://github.com/Noone9029/Accounting-App/pull/397), merge `ae4bd5f1`.
- ARC-07B-06E strict evidence-driven preflight: PR [#398](https://github.com/Noone9029/Accounting-App/pull/398), merge `a79fa70e`; normalized packet-hash follow-up PR [#399](https://github.com/Noone9029/Accounting-App/pull/399), merge `3808a4a2`.
- ARC-07B-06F authenticated contract import: PR [#400](https://github.com/Noone9029/Accounting-App/pull/400), merge `6afe1175`; ten checksum/size-pinned official PDF metadata records; six API records are authenticated Swagger/OAS PDF exports, not raw OpenAPI.
- ARC-07B-06G stage-aware preflight: PR [#401](https://github.com/Noone9029/Accounting-App/pull/401), merge `f04c0436`; explicit onboarding, compliance-document, Simulation production-CSID, clearance, and reporting stages are evaluated independently.
- ARC-07B-06H official SDK Simulation CSR oracle: PR [#402](https://github.com/Noone9029/Accounting-App/pull/402), merge `999d10a1`. Local Tier-2 execution passed with SDK 238-R3.4.8 and Microsoft OpenJDK 11.0.26. This is a local generation/configuration oracle, not validation of the separate 06C CSR, and it is not a redistributable CI dependency.
- ARC-07B-07A one-shot Simulation compliance-CSID binding: a CLI-only operator boundary now binds clean-main and checksum preflight, external one-shot approval consumption, hidden TTY OTP input, one exact Simulation HTTPS attempt, strict response parsing, and atomic sandbox DPAPI custody. The local 26-case literal-loopback proof is metadata-only and records no external DNS, external socket, ZATCA call, OTP read, CSID, credential body, Prisma mutation, or hosted mutation.
- Dependency audit note: Next 16.2.12 declares optional Sharp `^0.34.5`, but Sharp 0.34.5 remains affected by `GHSA-f88m-g3jw-g9cj`. The root override deliberately selects audited Sharp 0.35.3 outside that optional range. `test:next-sharp-compatibility` exercises Next's real image-optimizer boundary, and the override should be removed once Next declares a patched compatible range.

## Contract and synthetic scope

- Source register: [ARC_07B_OFFICIAL_SANDBOX_CONTRACT_MATRIX.md](ARC_07B_OFFICIAL_SANDBOX_CONTRACT_MATRIX.md).
- The exact Simulation target, six operation contracts, authentication roles, headers, safe request/response field names, statuses, credential progression, OTP format, CSR contract, compliance matrix, retry classifications, and duplicate outcomes are `CONFIRMED_AUTHENTICATED_OFFICIAL`.
- Numeric rate limits, a guaranteed `Retry-After`, and a backoff formula remain `UNPUBLISHED`; these three non-gating leaves cannot supply invented runtime values.
- Contract SHA-256: `bf564b600700f783515b9e4af46a31f428e27a5e6b8bdae5cf07156ed77e6950`.
- The canonical contract digest is computed from schema-v2 metadata with `contractSha256` excluded from the digest input. Any contract drift invalidates this reviewed packet.
- Synthetic identifiers only: `ARC07B-SYNTHETIC-001` through `ARC07B-SYNTHETIC-006`; no customer, production, or hosted data is in scope.
- The maximum external request count is zero until a checksum-backed contract, approved custody/CSR procedure, and standalone owner authorization are present.

## Planned sequence after separate approval

1. Revalidate the exact official source register, canonical contract digest, and packet SHA-256 without accepting undocumented endpoint or rate-limit values.
2. Select exactly one explicit execution stage and verify its independent static gates. The first authorized stage is `COMPLIANCE_CSID_ONBOARDING`; it requires receive custody but cannot require a certificate that the request is intended to obtain.
3. Atomically consume a fresh external approval record, rerun non-secret static gates, read the OTP from a hidden TTY, and run one bounded compliance-stage request with an immutable payload only after every gate passes; record metadata-only evidence.
4. Stop on any contract mismatch, credential/custody refusal, unexpected redirect, non-synthetic identity, unsafe response classification, or ambiguous `UNCERTAIN` outcome.
5. Do not attempt production CSID, clearance, reporting, or production signing as part of the first sandbox request.

## Rollback, cleanup, and non-claims

- The loopback lifecycle proof establishes local cleanup expectations: no retained proof rows, XML, QR, credential material, raw responses, listener, container, or volume.
- A future official execution must revoke or invalidate only newly issued synthetic credentials under the verified official procedure and preserve metadata-only evidence of the outcome.
- Approval status is false. Network is disabled. Execution is disallowed.
- No ZATCA approval, sandbox success, production certificate trust, KMS/HSM custody, clearance, reporting, production compliance, or customer-data proof is claimed.

## Required gates

The future owner authorization is a standalone message, not text in this packet, source, documentation, or Git history. Static `requestSequenceReady` is stage-specific and independent of owner approval, OTP availability, and network enablement. The Tier-2 SDK CSR oracle is proven locally, so `COMPLIANCE_CSID_ONBOARDING` is `STATIC_STAGE_READY_EXECUTION_BLOCKED`: `requestSequenceReady` is true while `executionAllowed` remains false.

## Current no-network gate snapshot

The strict preflight reads only this packet and committed metadata evidence. It does not load a network module, read a credential, prompt for OTP, or resolve a host.

| Gate | Current value | Evidence / reason |
| --- | --- | --- |
| `networkEnabled` / `networkCallsMade` | `false` / `false` | Invocation requires `--no-network`; no network path is loaded. |
| `approvalPresent` / `otpAvailable` | `false` / `false` | The standalone owner authorization is absent and no OTP is requested. |
| `sandboxTargetVerified` / `officialContractComplete` | `true` / `true` | Schema-v2 metadata pins the exact `/e-invoicing/simulation` target and authenticated official contract. Production and Developer Portal bases are non-interchangeable and prohibited for this lane. |
| `executionStage` | `COMPLIANCE_CSID_ONBOARDING` | No implicit stage is permitted. Missing or unsupported stages fail before preflight execution. |
| `credentialProviderReady` / `signingKeyReady` | `true` / `true` | Local DPAPI custody and local CSR/key cryptographic proof are metadata-backed. |
| `certificateReceiveCustodyReady` / `productionCredentialReceiveCustodyReady` | `true` / `true` | A disposable synthetic Windows CurrentUser DPAPI proof stored, fixed-purpose compared, revoked, deleted, and cleaned token, secret, and certificate material. Canonical System32 binaries, a scrubbed child environment, bounded I/O, confirmed termination close, and ciphertext/plaintext inequality are required. `networkIsolationProven` remains false because no OS-enforced child-process network sandbox is claimed. Reviewed `FATOORA_SIMULATION` maps only to the provider's internal `SANDBOX` label. |
| `complianceCertificatePresent` / `productionCertificatePresent` | `false` / `false` | No credential has been requested or received. Onboarding correctly does not require an existing compliance certificate. |
| `complianceDocumentMatrixComplete` | `false` | No compliance document was submitted. This blocks only the later Simulation production-CSID stage. |
| `csrLocalProofReady` / `csrTier2SdkReady` / `csrReady` | `true` / `true` / `true` | The separate 06C local CSR proof and the 06H official SDK Simulation CSR generation/configuration oracle both pass. The two CSRs are not claimed to be byte-identical or key-identical. |
| `secureOtpInputReady` | `true` | The non-echo one-shot mechanism is paired with official evidence for exactly six ASCII digits and one-hour validity. No OTP is present. |
| `executionBindingImplemented` / `executionBindingReviewed` | `true` / `true` | A separate CLI-only operator binding is implemented and reviewed; normal runtime adapters remain disabled. |
| `oneShotApprovalBoundaryReady` | `true` | A future approval is external, hash/stage/scope/budget-bound, atomically consumed before request, and never restored after uncertainty. No approval record exists now. |
| `officialHttpsTransportReady` | `true` | The bounded transport accepts only the reviewed Simulation base, HTTPS, a standard TLS chain, no proxy, no redirect, bounded DNS/body/timeouts, and one request. |
| `complianceResponseParserReady` / `complianceResponseCustodyReady` | `true` / `true` | Strict duplicate-member/field/certificate-key checks feed an atomic sandbox DPAPI custody transaction with rollback. No credential has been received. |
| `rollbackReady` / `cleanupReady` / `evidenceReady` | `true` / `true` / `true` | Local loopback cleanup and metadata-only evidence are proven. |
| `requestSequenceReady` / `executionAllowed` | `true` / `false` | Static onboarding gates, including the 26-case local binding proof, pass. A fresh standalone approval, a fresh human-controlled OTP, network enablement, and execution permission remain absent, so no request can run. |

The receive-custody circularity is removed, the independent Tier-2 SDK Simulation CSR oracle is complete, and the CLI-only one-shot binding is proven locally. The only remaining onboarding execution blockers are a fresh one-shot owner approval, a fresh human-controlled OTP, network enablement, and execution permission. `complianceCertificatePresent` remains false and is correctly not an onboarding blocker. Compliance documents, Simulation production-CSID, clearance, and reporting remain independently blocked by credentials or evidence that do not yet exist. No network, OTP, CSID, clearance, reporting, credential, certificate, hosted mutation, or customer-data action occurred during this local preparation.
