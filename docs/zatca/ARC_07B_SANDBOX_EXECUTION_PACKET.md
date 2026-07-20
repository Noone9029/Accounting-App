# ARC-07B sandbox execution packet

Date: 2026-07-21
Status: **PREPARED / BLOCKED AT NETWORK AND CREDENTIAL GATES**

This metadata-only packet prepares a future synthetic-data sandbox run. It is not an approval, does not contain a target, credential, CSR, OTP, request body, XML, QR value, certificate, or response body, and cannot enable network execution.

## Baseline and local proof lineage

- Current main baseline: `d9a8df0b889067677e1c156c527e71d950d25ae7`.
- ARC-07A local conformance: PR [#385](https://github.com/Noone9029/Accounting-App/pull/385), merge `20315e55`.
- ARC-07B credential custody boundary: PR [#389](https://github.com/Noone9029/Accounting-App/pull/389), merge `aa0514d6`.
- ARC-07B disabled adapter boundary: PR [#390](https://github.com/Noone9029/Accounting-App/pull/390), merge `4c1ee7ae`.
- ARC-07B transactional state: PR [#391](https://github.com/Noone9029/Accounting-App/pull/391), merge `e5a961f1`.
- ARC-07B loopback lifecycle proof: PR [#392](https://github.com/Noone9029/Accounting-App/pull/392), merge `d9a8df0b`.
- Authorized local SDK oracle: 238-R3.4.8, JAR SHA-256 `48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530`, JDK 11.0.26. This is not a redistributable CI dependency.

## Contract and synthetic scope

- Source register: [ARC_07B_OFFICIAL_SANDBOX_CONTRACT_MATRIX.md](ARC_07B_OFFICIAL_SANDBOX_CONTRACT_MATRIX.md).
- Every host, path, method, header, authentication, media-type, retry, onboarding, clearance, reporting, and error-code field is `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE`.
- Synthetic identifiers only: `ARC07B-SYNTHETIC-001` through `ARC07B-SYNTHETIC-006`; no customer, production, or hosted data is in scope.
- The maximum external request count is zero until a checksum-backed contract, approved custody/CSR procedure, and standalone owner authorization are present.

## Planned sequence after separate approval

1. Revalidate the exact official source register and packet SHA-256 without accepting undocumented endpoint values.
2. Verify a synthetic-only identity, approved non-production credential provider, CSR procedure, and fresh human-controlled OTP procedure.
3. Run one bounded compliance-stage request only after the exact contract and approval gates pass; record metadata-only evidence.
4. Stop on any contract mismatch, credential/custody refusal, unexpected redirect, non-synthetic identity, or unsafe response classification.
5. Do not attempt production CSID, clearance, reporting, or production signing as part of the first sandbox request.

## Rollback, cleanup, and non-claims

- The loopback lifecycle proof establishes local cleanup expectations: no retained proof rows, XML, QR, credential material, raw responses, listener, container, or volume.
- A future official execution must revoke or invalidate only newly issued synthetic credentials under the verified official procedure and preserve metadata-only evidence of the outcome.
- Approval status is false. Network is disabled. Execution is disallowed.
- No ZATCA approval, sandbox success, production certificate trust, KMS/HSM custody, clearance, reporting, production compliance, or customer-data proof is claimed.

## Required gates

The future owner authorization is a standalone message, not text in this packet, source, documentation, or Git history. Until it is received and all other fields are independently ready, the preflight must remain `PREPARED_BLOCKED` with `executionAllowed: false`.
