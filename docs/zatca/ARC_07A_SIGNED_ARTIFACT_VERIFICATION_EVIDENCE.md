# ARC-07A signed-artifact verification evidence

Local-only evidence recorded 2026-07-20.

- `ledgerbyteIndependentSignatureVerification: PASSED` for temporary LedgerByte-generated standard and Arabic simplified signed XML artifacts.
- `officialSdkStructuralValidation: PASSED` for the same artifacts, run afterwards with explicit local `ZATCA_SDK_ROOT`, JDK 11, and no network.
- `officialSdkUnsignedValidation: PASSED` and `officialSdkHashParity: PASSED` remain separately recorded by the local SDK evidence runner.
- The LedgerByte verifier does not invoke SDK `-validate`. It performs secure DOM parsing, C14N 1.1 reference digest checks, SignedProperties digest checks, embedded-certificate linkage, secp256k1 ECDSA verification, and Phase 2 QR binding checks.
- Thirty adversarial tamper cases were attempted and rejected with safe classifications: document/digest, SignedProperties, certificate, signature, algorithm, signature-structure, QR, and DTD/entity cases. Result-consistency checks require every `VALID` result to have every check true.

No XML body, QR payload, certificate, public key, signature, private key, SDK output, customer data, or network activity is retained in this evidence.

No-network status: confirmed. Java: configured JDK 11. SDK: configured local 238-R3.4.8 reference. Temporary signed XML is removed by the test harness.

This does not prove production certificate trust, KMS/HSM custody, sandbox execution, ZATCA approval, or production compliance. Credit, debit, allowance, and multiline signed-artifact coverage remain ARC-07A fixture gaps.
