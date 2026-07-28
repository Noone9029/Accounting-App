# ARC-07B-06C Sandbox CSR Readiness

Status: LOCAL CRYPTOGRAPHIC PROOF / SDK ORACLE UNAVAILABLE IN CURRENT PROCESS

LedgerByte creates a synthetic PKCS#10 certification request with an EC secp256k1 key. The private key is immediately sealed through `SandboxLocalDpapiComplianceCsidCustodyProvider`; signing and public-key derivation occur only through its bounded callback. No private key or CSR body is returned, persisted in Prisma, emitted in evidence, or written to the repository.

The local proof validates the required synthetic subject fields, Saudi country code, PKCS#10 ECDSA-SHA256 signature, and equality between the CSR public key and the custody-derived public key. It rejects incomplete profiles and production-looking custody before a key can be stored.

This does not revive legacy RSA CSR generation. It does not request a CSID, make a ZATCA request, use a real identity or credential, or claim production certificate trust or compliance.

The current process has neither an explicit `ZATCA_SDK_ROOT` nor a compatible JDK 11, so no Tier-2 official SDK CSR oracle was executed. That environment prerequisite remains recorded separately and does not turn this local cryptographic proof into SDK acceptance evidence.

## 2026-07-28 ARC-07B-06H cross-reference

The text above is the historical ARC-07B-06C result and remains accurate for that 06C process. A later authorized local Tier-2 run is recorded separately in `ARC_07B_SANDBOX_CSR_SDK_ORACLE.md`.

ARC-07B-06H used SDK `238-R3.4.8` with Microsoft OpenJDK `11.0.26` to generate a separate synthetic Simulation key and CSR. LedgerByte independently verified that SDK artifact and moved the SDK-generated key into disposable DPAPI custody. The SDK was not used to validate the 06C CSR, and no CSR-byte, CSR-hash, public-key-fingerprint, or private-key equality between 06C and 06H is claimed.

The 06H runtime pins the official SDK JAR, the SDK configuration (`5ECA6FFE95659F58319C9B7F831D54EB71860E9434595798628F42E4C3495408`), and five exact Microsoft OpenJDK runtime components. Read-only Windows handle leases protect the JDK files and the staged launcher/JAR/SDK-config/CSR-config inputs during execution. ACLs use the current Windows token SID, not `USERNAME`. The Java guard denies writes and deletes outside the canonical disposable workspace and self-tests that denial without residue. Lease loss aborts the active child, while lease and DPAPI helper failures require confirmed close or pinned process-tree termination. The plaintext SDK key is zeroed and securely removed before DPAPI re-derivation, and a passing result requires confirmed process termination and complete expected-artifact cleanup. Unexpected files are preserved by non-recursive, empty-directory-only removal rather than deleted.

Together, 06C and 06H satisfy the two independent preflight inputs: `csrLocalProofReady: true` and `csrTier2SdkReady: true`. No network call, OTP, CSID request, production operation, or sensitive-body retention occurred.
