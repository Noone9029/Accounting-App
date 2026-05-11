# ZATCA SDK Usage Plan

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

The local SDK bundle is `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.

## SDK Summary

| Item | Finding |
| --- | --- |
| SDK language/runtime | Java CLI/JAR. |
| Primary executable | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora` and `Apps/fatoora.bat`, backed by `Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`. |
| Java requirement from SDK readme | Java >=11 and <15. Local Java inspected as 17.0.16, which is outside that range. |
| License | `LICENSE.txt` is LGPL v3. Legal review is needed before bundling or linking the SDK in distributed software. |
| Validates XML | Yes, SDK readme documents `fatoora -validate -invoice <filename>`. |
| Signs invoices | Yes, SDK readme documents `fatoora -sign -invoice <filename> -signedInvoice <filename>`. Do not integrate signing yet. |
| Generates invoice hash | Yes, SDK readme documents `fatoora -generateHash -invoice <filename>`. |
| Generates QR | Yes, SDK readme documents `fatoora -qr -invoice <filename>`. |
| Generates CSR/private key | Yes, SDK readme documents `fatoora -csr -csrConfig <filename> ...`. |
| Generates API request JSON | Yes, SDK readme documents invoice API request generation. |
| Includes sample XML | Yes, standard/simplified invoices, credit notes, debit notes, and scenario samples. |
| Includes schemas/rules | Yes, UBL 2.1 XSDs and ZATCA/EN16931 Schematron XSL files. |
| Includes sample PDF/A-3 | Yes, PDF samples are under `Data/Samples/PDF-A3`. |

## Local Execution Findings

- Running the JAR directly with `java -jar ... -help` returned a configuration null-pointer error outside the launcher context.
- Running the Windows launcher initially failed because `jq` was not on `PATH`.
- After adding the SDK `Apps` directory to `PATH`, the launcher still failed because paths derived from `E:\Accounting App` were not fully quoted and the space split the path.
- The SDK readme identifies bundled certificate/private-key files as dummy/testing material. They must never be loaded into LedgerByte tenant state or logs.

## Node/NestJS Integration Options

| Option | Practicality | Notes |
| --- | --- | --- |
| Direct Java library import | Not practical | The SDK is distributed as a CLI/JAR, not a TypeScript package. Direct integration would increase coupling and licensing/upgrade risk. |
| CLI wrapper with `child_process` | Practical later | Best first integration path for test-only validation/hash/sign experiments. Use temporary directories, explicit timeouts, redacted logs, and a pinned Java runtime. |
| Docker wrapper | Recommended for repeatable validation | Avoids local Java-version drift and path-with-space script issues. Good for CI validation jobs and future controlled sandbox tooling. |
| Copy XSD/XSL validation into Node | Practical for schema/Schematron only | Could validate XML structure without signing, but must still compare to SDK output before trusting results. |
| In-process signing implementation | Not now | Requires key custody, canonicalization, certificate handling, XAdES/XMLDSig correctness, and official validation fixtures. |

## Recommended Safe Approach

1. Keep the current LedgerByte runtime in mock mode with real network calls disabled.
2. Build a test-only SDK wrapper that runs in a temporary directory and never writes tenant secrets to logs.
3. Pin Java 11-14 with Docker or a local toolchain path; do not rely on the currently installed Java 17.
4. First use the SDK only for offline XML validation and hash comparison against copied, license-approved fixtures.
5. Add SDK validation to CI only after the wrapper is deterministic on Windows paths with spaces and Linux CI paths.
6. Treat SDK signing and QR generation as future validation oracles until production key custody is designed.
7. Do not enable clearance/reporting/compliance network submissions until the API adapter has verified URLs, payloads, credentials, and sandbox-only tests.

## Implemented Wrapper Groundwork

- `GET /zatca-sdk/readiness` now reports local SDK discovery and Java readiness without executing the SDK.
- `POST /zatca-sdk/validate-xml-dry-run` now builds a command plan from invoice XML metadata or request `xmlBase64` without writing temp files or executing Java.
- `POST /zatca-sdk/validate-xml-local` remains disabled by default through `ZATCA_SDK_EXECUTION_ENABLED=false`.
- Real local SDK execution intentionally returns a not-implemented response when explicitly enabled until the SDK command format is verified.
- The frontend displays SDK validation readiness on `/settings/zatca` and exposes a dry-run command plan from invoice detail pages.

See `SDK_VALIDATION_WRAPPER.md` for endpoint behavior and safety rules.

## Guardrails For Future Wrapper

- Use an allowlisted command set (`-validate`, then later `-generateHash`; signing only after explicit design approval).
- Execute with a per-run temp directory outside `reference/`.
- Redact paths and payloads that may contain private key, certificate, OTP, CSID secret, or full signed XML.
- Enforce timeout and max output length.
- Store only derived validation results in normal application logs.
- Never use the SDK dummy private key/certificate as tenant material.
