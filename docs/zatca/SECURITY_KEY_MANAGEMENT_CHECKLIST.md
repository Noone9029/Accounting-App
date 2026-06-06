# ZATCA Security And Key Management Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## 2026-06-06 Reconciliation Update

This checklist remains the operational security checklist. The consolidated design source is now `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`; tracking is in `CSID_LIFECYCLE_CHECKLIST.md`; option comparison is in `KEY_CUSTODY_DECISION_MATRIX.md`.

Production private-key custody remains unimplemented. The recommended direction is KMS/HSM/external signing or equivalent custody, with application tables storing metadata only.

## 2026-06-06 Sandbox CSID Preflight Guard Update

The no-network preflight guard is now implemented and documented in `SANDBOX_CSID_PREFLIGHT_GUARD.md`; current results are in `SANDBOX_CSID_PREFLIGHT_RESULTS.md`.

Security result: `PREFLIGHT_BLOCKED`. The guard confirms legacy raw PEM-capable fields remain a blocker, CSID response custody is not approved, the sandbox adapter remains disabled, and no OTP/CSID/network/signing behavior was enabled. No private-key, certificate, token, CSID, auth-header, request, or response bodies were exposed.

- Private keys in the database are development placeholders only.
- Move real private-key generation and storage to KMS or a secrets manager before real onboarding.
- Prevent private-key material from normal API responses, frontend state, logs, audit records, and smoke output.
- Define access control, rotation, backup, incident response, and certificate revocation procedures.
- Verify signing operations can use key handles without exposing PEM material to application logs.
- Add operational monitoring for failed signing, failed API submissions, and suspicious certificate access.

## Reference-backed source files

- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem`

The SDK readme labels the bundled certificate and private key as dummy/testing material. They must not be used as LedgerByte tenant credentials or production secrets.

## 2026-06-06 Key Custody Preparation

- `ZATCA_KEY_CUSTODY_DECISION_DRAFT.md` records KMS/HSM, secrets-manager, encrypted database, and local development custody options.
- Production private-key custody remains undecided and unimplemented.
- Local database PEM placeholders remain development-only and are not production custody.
- `ZATCA_AUDIT_EVIDENCE_STANDARD.md` defines metadata that may be stored and secret/body material that must not be logged.
- No real KMS, HSM, secrets-manager, production private key, production CSID, signing, clearance/reporting, PDF/A-3, or production compliance behavior is implemented by the preparation sprint.

## 2026-06-06 SDK Validation Evidence Boundary

- `ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md` defines metadata-only SDK validation evidence.
- SDK validation evidence must keep `xmlBodyPrinted`, `qrPayloadPrinted`, `privateKeyPrinted`, `networkCallsMade`, and `productionComplianceEnabled` false.
- The local wrapper must not persist or print XML bodies, QR payload bodies, private keys, OTPs, CSID token/secret material, auth tokens, headers, or full request/response bodies.
- This evidence boundary does not implement KMS, secrets-manager custody, signing, clearance/reporting, PDF/A-3, or production compliance.
