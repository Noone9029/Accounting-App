# ARC-07B-06C Sandbox CSR Readiness

Status: LOCAL CRYPTOGRAPHIC PROOF / SDK ORACLE UNAVAILABLE IN CURRENT PROCESS

LedgerByte creates a synthetic PKCS#10 certification request with an EC secp256k1 key. The private key is immediately sealed through `SandboxLocalDpapiComplianceCsidCustodyProvider`; signing and public-key derivation occur only through its bounded callback. No private key or CSR body is returned, persisted in Prisma, emitted in evidence, or written to the repository.

The local proof validates the required synthetic subject fields, Saudi country code, PKCS#10 ECDSA-SHA256 signature, and equality between the CSR public key and the custody-derived public key. It rejects incomplete profiles and production-looking custody before a key can be stored.

This does not revive legacy RSA CSR generation. It does not request a CSID, make a ZATCA request, use a real identity or credential, or claim production certificate trust or compliance.

The current process has neither an explicit `ZATCA_SDK_ROOT` nor a compatible JDK 11, so no Tier-2 official SDK CSR oracle was executed. That environment prerequisite remains recorded separately and does not turn this local cryptographic proof into SDK acceptance evidence.
