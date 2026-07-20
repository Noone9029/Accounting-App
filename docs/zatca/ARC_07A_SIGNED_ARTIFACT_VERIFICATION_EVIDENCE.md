# ARC-07A signed-artifact verification evidence

Local-only evidence recorded 2026-07-20.

- `ledgerbyteIndependentSignatureVerification: PASSED` for six unique temporary LedgerByte-generated signed artifacts: standard, Arabic simplified, credit note, debit note, document allowance, and multi-line VAT.
- `officialSdkStructuralValidation: PASSED` for the same six artifacts, run afterwards with explicit local `ZATCA_SDK_ROOT`, JDK 11, and no network.
- `officialSdkUnsignedValidation: PASSED` and `officialSdkHashParity: PASSED` remain separately recorded by the local SDK evidence runner.
- The LedgerByte verifier does not invoke SDK `-validate`. It performs secure DOM parsing, C14N 1.1 reference digest checks, SignedProperties digest checks, embedded-certificate linkage, secp256k1 ECDSA verification, and Phase 2 QR binding checks.
- Thirty adversarial tamper cases were attempted and rejected with safe classifications: document/digest, SignedProperties, certificate, signature, algorithm, signature-structure, QR, and DTD/entity cases. Result-consistency checks require every `VALID` result to have every check true.
- Twenty deterministic local business-rule fixtures were rejected before signing or SDK invocation, with stable safe codes for seller identity/VAT, note reference and reason, monetary consistency, currency, PIH, ICV, duplicate ICV reservation, and simplified-signing QR prerequisites. Their safe SDK outcome is `NOT_SENT_LOCAL_REJECTED` rather than a fabricated SDK result.

No XML body, QR payload, certificate, public key, signature, private key, SDK output, customer data, or network activity is retained in this evidence.

No-network status: confirmed. Java: configured JDK 11. SDK: configured local 238-R3.4.8 reference. Temporary signed XML is removed by the test harness.

This does not prove production certificate trust, KMS/HSM custody, sandbox execution, ZATCA approval, or production compliance. Durable issuance is Result B: the in-memory PIH/ICV proof remains deliberately non-Prisma and no production persistence contract is introduced in ARC-07A.
