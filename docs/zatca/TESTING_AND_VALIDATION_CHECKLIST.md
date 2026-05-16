# ZATCA Testing And Validation Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Current SDK Hash Mode Coverage

New local-only tests cover:

- SDK hash mode enablement blocked when SDK execution/readiness is unavailable.
- SDK hash mode enablement blocked for EGS units that already have invoice metadata.
- Successful SDK hash mode enablement on a fresh EGS with mocked readiness, including audit logging.
- Default local deterministic metadata generation remains unchanged.
- SDK mode metadata generation stores the SDK hash, uses the official first PIH seed for the first invoice, uses the previous SDK hash for the second invoice, and remains idempotent.
- SDK hash generation failure rolls back metadata and EGS hash/ICV mutation.
- Hash comparison reports EGS hash mode and metadata hash-mode snapshot without mutation.
- Reset-plan dry run reports SDK-mode blockers.

Normal tests and smoke do not require Java or SDK execution.

- Keep unit tests for XML escaping, QR byte lengths, deterministic hashes, ICV idempotency, and adapter safety.
- Add official sample invoice fixtures when available.
- Add schema/canonicalization/signature validation tests before real sandbox calls.
- Add sandbox-only integration tests gated behind explicit environment flags.
- Keep smoke passing in default mock mode with no real OTP, CSID, or network required.
- Keep smoke asserting that `/zatca-sdk/readiness` reports SDK execution disabled by default and that invoice SDK validation returns a disabled local-only response.
- Keep smoke asserting that `/zatca-sdk/validate-reference-fixture` returns a disabled local-only response by default.
- Keep smoke asserting that SDK readiness returns `requiredJavaRange`, `javaSupported`, and the official command string without requiring Java execution.
- Keep smoke asserting that disabled local SDK validation returns `hashComparisonStatus=BLOCKED` and does not require Java.
- Keep smoke asserting that `POST /sales-invoices/:id/zatca/hash-compare` is disabled/blocked by default, returns `noMutation=true`, and does not change invoice metadata or EGS ICV/hash state.
- Keep smoke asserting that `GET /zatca/hash-chain-reset-plan` returns `dryRunOnly=true`, `noMutation=true`, reset risks, and no reset executor.
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
- Generated invoice XML validation through the local API now succeeds with SDK execution explicitly enabled and Java 11 configured. The tested invoice returned SDK exit code `0`; the app hash and SDK hash mismatched, confirming that current app hash-chain storage is still local groundwork.
- Hash groundwork tests verify the documented transform inputs, SDK hash output parsing, read-only comparison shape, hash mode labels, and reset dry-run shape while keeping official C14N11 hash output blocked in normal app code until SDK `-generateHash` or a verified canonicalization library is used.

## Fresh EGS SDK Hash-Mode Checklist Result

Validated locally on 2026-05-16 with Java 11.0.26:

- Fresh EGS with zero invoice metadata can enable `SDK_GENERATED`.
- Enablement writes `ZATCA_SDK_HASH_MODE_ENABLED`.
- First SDK-mode invoice uses the official first PIH seed and stores SDK hash `3G0f1iTuJNYnHJY8dJWsoGfz9jfCBaTwNb+UK84ILaU=`.
- Second SDK-mode invoice uses the first invoice SDK hash as PIH and stores SDK hash `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=`.
- Direct SDK `-generateHash` matches persisted hashes for both invoices.
- Hash compare returns `MATCH`, `hashMatches=true`, and `noMutation=true` for both invoices.
- Repeated generation is idempotent and does not advance ICV.
- SDK validation success parsing now treats official global validation failure output as `success=false` even when the SDK exits `0`.

Still failing or warning:

- Invoice 1 SDK XML validation globally passes but has buyer-address warning `BR-KSA-63`.
- Invoice 2 SDK XML validation now globally passes after the SDK wrapper supplies an invoice-specific temp `pihPath` containing metadata `previousInvoiceHash`; `KSA-13` is resolved for the local fresh-EGS generated standard-invoice path.
- The remaining generated XML warning is buyer-address data quality: LedgerByte maps street and district fields, but does not yet capture a dedicated 4-digit buyer building number required by the official Saudi buyer-address rule.

## PIH Chain Debug Regression

Use `corepack pnpm zatca:debug-pih-chain` only in local SDK-enabled environments. It requires a running local API, Java 11-14, SDK execution env vars, and test credentials. It does not call ZATCA, does not sign invoices, and does not mutate metadata during hash comparison.

The regression should prove:

- fresh EGS can enable `SDK_GENERATED`;
- invoice 1 PIH is the official first seed;
- invoice 2 PIH is invoice 1's SDK hash;
- both direct SDK hashes match persisted hashes;
- both hash-compare calls return `MATCH`;
- SDK XML validation passes globally for both generated standard invoices except documented address data warnings;
- repeated generation remains idempotent.
