# ARC-07B-06B Sandbox-Local Credential Custody

Status: LOCAL PROVEN / NOT NETWORK-READY

`SandboxLocalDpapiComplianceCsidCustodyProvider` is a Windows-only, current-user DPAPI provider for controlled synthetic sandbox preparation. It is not a production provider and does not alter the application runtime default: `DisabledComplianceCsidSecretCustodyProvider` remains selected unless a later explicitly approved execution integration enables a validated local-test configuration.

The provider accepts only an explicit `LOCAL_TEST` runtime classification and `SANDBOX` material environment. It rejects simulation and production material labels, and production-looking processes cannot select it. It writes only DPAPI-protected ciphertext plus non-secret lifecycle metadata to `%LOCALAPPDATA%\LedgerByte\ZatcaSandboxCustody`; the directory removes inherited ACLs and grants access only to the current Windows user and `SYSTEM`.

Plaintext is passed to DPAPI through standard input rather than command-line arguments. Reads require a typed reference and occur only through `readSecretForOperation`; the plaintext buffer is zeroed after the callback. Public metadata and errors are bounded and redacted.

No Prisma legacy PEM field is read or written by this provider. No credential material, certificate body, OTP, authorization header, SDK material, or generated XML is committed. Future KMS/HSM custody remains provider-neutral and unimplemented.

The local proof uses only synthetic values and covers ciphertext-at-rest, current-user DPAPI round trip, changed ciphertext, missing reference, non-sandbox input, production-like process classification, expiry, revocation, deletion, redacted outputs, and disabled-by-default factory behavior. It makes no ZATCA request, DNS lookup, hosted mutation, or customer-data access.

This proves a local sandbox custody primitive only. It does not prove official endpoint contracts, sandbox credentials, CSR readiness, OTP availability, production certificate trust, KMS/HSM custody, ZATCA approval, or production compliance.
