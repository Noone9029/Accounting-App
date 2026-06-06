# ZATCA CSR And CSID Onboarding Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## 2026-06-06 Reconciliation Update

This older checklist remains historical context. The current status checklist is `CSID_LIFECYCLE_CHECKLIST.md`, and the consolidated design is `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`.

No OTP was requested, no CSID was requested, and no ZATCA network call was made by the design task.

## 2026-06-06 Sandbox CSID Preflight Guard Update

`SANDBOX_CSID_PREFLIGHT_GUARD.md` and `SANDBOX_CSID_PREFLIGHT_RESULTS.md` now provide the no-network preflight before any sandbox OTP/CSID approval. The current status is `PREFLIGHT_BLOCKED`.

The guard checks CSR reference presence and CSR property keys, but it does not request OTPs, request CSIDs, call ZATCA, generate signing material, or expose request/response/credential bodies.

- Current CSR generation is local development groundwork only.
- Verify official CSR subject attributes, serial-number format, extensions, key algorithm, and certificate profile.
- Get FATOORA sandbox access and a real OTP before testing compliance CSID onboarding.
- Map official compliance CSID request/response fields.
- Store issued CSIDs and certificate request IDs without exposing private keys.
- Keep production CSID request blocked until sandbox compliance checks pass.
- Add tests proving request logs never store OTP, CSR PEM, CSID PEM, or private-key material.

## Reference-backed source files

- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`

Current LedgerByte CSR generation remains local-only. Before real compliance CSID work, compare local CSR output against the SDK CSR tool and verify CSR subject, serial-number, key algorithm, OTP handling, and response fields.
