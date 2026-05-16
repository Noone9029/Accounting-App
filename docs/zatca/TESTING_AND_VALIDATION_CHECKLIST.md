# ZATCA Testing And Validation Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Keep unit tests for XML escaping, QR byte lengths, deterministic hashes, ICV idempotency, and adapter safety.
- Add official sample invoice fixtures when available.
- Add schema/canonicalization/signature validation tests before real sandbox calls.
- Add sandbox-only integration tests gated behind explicit environment flags.
- Keep smoke passing in default mock mode with no real OTP, CSID, or network required.
- Keep smoke asserting that `/zatca-sdk/readiness` reports SDK execution disabled by default and that invoice SDK validation returns a disabled local-only response.
- Keep smoke asserting that `/zatca-sdk/validate-reference-fixture` returns a disabled local-only response by default.
- Keep smoke asserting that SDK readiness returns `requiredJavaRange`, `javaSupported`, and the official command string without requiring Java execution.
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
- Default Java remains OpenJDK 17.0.16, which is outside the official SDK README requirement of Java `>=11` and `<15`.
- Java 11.0.26 was found locally and used without changing global Java.
- Official standard invoice, simplified invoice, standard credit note, and standard debit note samples pass with the official launcher.
- LedgerByte standard and simplified fixtures have had their first structural correction pass plus supply-date/PIH groundwork. The standard fixture now passes SDK XSD/EN/KSA/PIH validation and the global SDK result passes. The simplified fixture now passes SDK XSD/EN/PIH validation and fails the expected non-production signing/QR/certificate checks.
- Generated invoice XML validation through the local API remains pending because the API/database stack was not confirmed running during the fixture pass.
- Hash groundwork tests verify the documented transform inputs and keep official C14N11 hash output blocked until SDK `-generateHash` or a verified canonicalization library is used.
