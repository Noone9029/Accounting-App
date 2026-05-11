# ZATCA Testing And Validation Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Keep unit tests for XML escaping, QR byte lengths, deterministic hashes, ICV idempotency, and adapter safety.
- Add official sample invoice fixtures when available.
- Add schema/canonicalization/signature validation tests before real sandbox calls.
- Add sandbox-only integration tests gated behind explicit environment flags.
- Keep smoke passing in default mock mode with no real OTP, CSID, or network required.
- Record official validator responses as fixtures after sandbox access is available.
- Do not promote any mock success state to legal `CLEARED` or `REPORTED` status.

## Reference-backed source files

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/**/*.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/**/*.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`

Testing should first add an isolated SDK wrapper for offline validation and hash comparison. Real sandbox integration tests must remain gated behind explicit environment flags and valid credentials.
