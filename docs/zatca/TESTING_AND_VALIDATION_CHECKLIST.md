# ZATCA Testing And Validation Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Keep unit tests for XML escaping, QR byte lengths, deterministic hashes, ICV idempotency, and adapter safety.
- Add official sample invoice fixtures when available.
- Add schema/canonicalization/signature validation tests before real sandbox calls.
- Add sandbox-only integration tests gated behind explicit environment flags.
- Keep smoke passing in default mock mode with no real OTP, CSID, or network required.
- Keep smoke asserting that `/zatca-sdk/readiness` reports SDK execution disabled by default and that invoice SDK validation returns a disabled local-only response.
- Keep smoke asserting that `/zatca-sdk/validate-reference-fixture` returns a disabled local-only response by default.
- Record official validator responses as fixtures after sandbox access is available.
- Do not promote any mock success state to legal `CLEARED` or `REPORTED` status.

## Reference-backed source files

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/**/*.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/**/*.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`

Testing now has an isolated SDK wrapper for offline XML validation attempts. Keep SDK execution off by default. Real sandbox integration tests must remain gated behind explicit environment flags and valid credentials.

## Current official SDK fixture pass

- Result doc: `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`
- Verified command: `fatoora -validate -invoice <filename>`
- Current blocker: local OpenJDK 17.0.16 is outside the official SDK README requirement of Java `>=11` and `<15`
- Required before fixture execution: install or configure Java 11-14, then run official SDK samples before LedgerByte-generated XML
