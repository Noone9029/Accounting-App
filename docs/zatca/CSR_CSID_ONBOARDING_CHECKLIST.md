# ZATCA CSR And CSID Onboarding Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

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
