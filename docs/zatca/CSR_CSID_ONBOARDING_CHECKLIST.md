# ZATCA CSR And CSID Onboarding Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Current CSR generation is local development groundwork only.
- Verify official CSR subject attributes, serial-number format, extensions, key algorithm, and certificate profile.
- Get FATOORA sandbox access and a real OTP before testing compliance CSID onboarding.
- Map official compliance CSID request/response fields.
- Store issued CSIDs and certificate request IDs without exposing private keys.
- Keep production CSID request blocked until sandbox compliance checks pass.
- Add tests proving request logs never store OTP, CSR PEM, CSID PEM, or private-key material.
