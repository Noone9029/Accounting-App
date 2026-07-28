# ARC-07B sandbox execution packet

Date: 2026-07-28
Status: **CONTRACT IMPORTED / BLOCKED BY CUSTODY, CSR ORACLE, OTP AVAILABILITY, AND APPROVAL**

This metadata-only packet prepares a future synthetic-data sandbox run. It is not an approval, contains no unreviewed or dynamically supplied target, credential, CSR, OTP, request body, XML, QR value, certificate, or response body, and cannot enable network execution.

## Baseline and local proof lineage

- Current main baseline before this packet update: `3808a4a2f7df073962e0eb413561a6f1a2593119`.
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
- ARC-07B-06F authenticated contract import: ten checksum/size-pinned official PDF metadata records; six API records are authenticated Swagger/OAS PDF exports, not raw OpenAPI.
- Authorized local SDK oracle: 238-R3.4.8, JAR SHA-256 `48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530`, JDK 11.0.26. This is not a redistributable CI dependency.
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
2. Verify a synthetic-only identity, approved non-production credential provider, CSR procedure, and fresh human-controlled OTP procedure.
3. Run one bounded compliance-stage request with an immutable payload only after the exact contract and approval gates pass; record metadata-only evidence.
4. Stop on any contract mismatch, credential/custody refusal, unexpected redirect, non-synthetic identity, unsafe response classification, or ambiguous `UNCERTAIN` outcome.
5. Do not attempt production CSID, clearance, reporting, or production signing as part of the first sandbox request.

## Rollback, cleanup, and non-claims

- The loopback lifecycle proof establishes local cleanup expectations: no retained proof rows, XML, QR, credential material, raw responses, listener, container, or volume.
- A future official execution must revoke or invalidate only newly issued synthetic credentials under the verified official procedure and preserve metadata-only evidence of the outcome.
- Approval status is false. Network is disabled. Execution is disallowed.
- No ZATCA approval, sandbox success, production certificate trust, KMS/HSM custody, clearance, reporting, production compliance, or customer-data proof is claimed.

## Required gates

The future owner authorization is a standalone message, not text in this packet, source, documentation, or Git history. Until it is received and all other fields are independently ready, the preflight must remain `PREPARED_BLOCKED` with `executionAllowed: false`.

## Current no-network gate snapshot

The strict preflight reads only this packet and committed metadata evidence. It does not load a network module, read a credential, prompt for OTP, or resolve a host.

| Gate | Current value | Evidence / reason |
| --- | --- | --- |
| `networkEnabled` / `networkCallsMade` | `false` / `false` | Invocation requires `--no-network`; no network path is loaded. |
| `approvalPresent` / `otpAvailable` | `false` / `false` | The standalone owner authorization is absent and no OTP is requested. |
| `sandboxTargetVerified` / `officialContractComplete` | `true` / `true` | Schema-v2 metadata pins the exact `/e-invoicing/simulation` target and authenticated official contract. Production and Developer Portal bases are non-interchangeable and prohibited for this lane. |
| `credentialProviderReady` / `signingKeyReady` | `true` / `true` | Local DPAPI custody and local CSR/key cryptographic proof are metadata-backed. |
| `certificateCustodyReady` | `false` | No compliance response/certificate exists; custody is staged but a certificate must not be invented. |
| `csrLocalProofReady` / `csrReady` | `true` / `false` | Local secp256k1 CSR proof exists; the configured JDK 11 and authorized SDK Tier-2 CSR oracle are unavailable in the current process. |
| `secureOtpInputReady` | `true` | The non-echo one-shot mechanism is paired with official evidence for exactly six ASCII digits and one-hour validity. No OTP is present. |
| `rollbackReady` / `cleanupReady` / `evidenceReady` | `true` / `true` / `true` | Local loopback cleanup and metadata-only evidence are proven. |
| `requestSequenceReady` / `executionAllowed` | `false` / `false` | Every required execution gate must be true; no partial evidence can enable a request. |

The remaining blockers are therefore not only owner approval. Certificate custody, the Tier-2 CSR oracle, a fresh human-controlled OTP, and the standalone owner authorization remain absent. No network, OTP, CSID, clearance, reporting, credential, certificate, hosted mutation, or customer-data action occurred during 06F.
