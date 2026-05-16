# ZATCA SDK Usage Plan

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Current SDK Hash Mode Update

LedgerByte now has a local-only persistence path for SDK-generated invoice hashes, but it is intentionally not the default:

- `ZatcaEgsUnit.hashMode` defaults to `LOCAL_DETERMINISTIC`.
- `SDK_GENERATED` can be enabled only through the admin endpoint on a fresh EGS unit after SDK execution/readiness passes.
- Existing EGS units with invoice metadata are blocked from in-place migration; create a new EGS unit for SDK hash mode.
- `ZatcaInvoiceMetadata.hashModeSnapshot` records the mode used when metadata is generated.
- SDK mode persists `fatoora -generateHash -invoice <filename>` output only; it still does not sign, submit, request CSIDs, clear/report, or embed XML in PDF/A-3.

The local SDK bundle is `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.

## SDK Summary

| Item | Finding |
| --- | --- |
| SDK language/runtime | Java CLI/JAR. |
| Primary executable | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora` and `Apps/fatoora.bat`, backed by `Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`. |
| Java requirement from SDK readme | Java >=11 and <15. Default local Java is 17.0.16, but Java 11.0.26 was found under `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe` and was used for fixture validation without changing global Java. |
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

- Running without `SDK_CONFIG` returned a configuration null-pointer error from `Config.readResourcesPaths`.
- Running the Windows launcher initially failed because `jq` was not on `PATH`.
- Running the launcher from `E:\Accounting App` can fail because paths derived from the checkout are not fully quoted and the space can split the path.
- Running from a no-space temporary SDK copy with Java 11, `SDK_CONFIG`, `FATOORA_HOME`, and the SDK `Apps` folder on `PATH` successfully validated official fixtures.
- Direct JAR validation was not equivalent to the official launcher for the simplified invoice sample; it reported QR/signature failures while `fatoora.bat -validate -invoice` passed. Prefer the official launcher.
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
3. Pin Java 11-14 with Docker or a local toolchain path; do not rely on the default installed Java 17.
4. First use the SDK only for offline XML validation and hash comparison against copied, license-approved fixtures.
5. Add SDK validation to CI only after the wrapper is deterministic on Windows paths with spaces and Linux CI paths.
6. Treat SDK signing and QR generation as future validation oracles until production key custody is designed.
7. Do not enable clearance/reporting/compliance network submissions until the API adapter has verified URLs, payloads, credentials, and sandbox-only tests.

## Implemented Wrapper Groundwork

- `GET /zatca-sdk/readiness` now reports local SDK discovery and Java readiness without executing the SDK.
- `POST /zatca-sdk/validate-xml-dry-run` now builds a command plan from invoice XML metadata or request `xmlBase64` without writing temp files or executing Java.
- `POST /zatca-sdk/validate-xml-local` now accepts raw XML, base64 XML, or invoice XML metadata, but remains disabled by default through `ZATCA_SDK_EXECUTION_ENABLED=false`.
- `POST /zatca-sdk/validate-reference-fixture` validates allowlisted XML fixture paths under `reference/` or `packages/zatca-core/fixtures` only.
- `POST /sales-invoices/:id/zatca/sdk-validate` runs local validation against generated invoice XML when explicitly enabled and readiness passes. It also runs SDK `-generateHash` and returns read-only `sdkHash`, `appHash`, `hashMatches`, and `hashComparisonStatus` fields.
- `POST /sales-invoices/:id/zatca/hash-compare` runs the SDK hash oracle only, when enabled, and always returns `noMutation=true`.
- `GET /zatca/hash-chain-reset-plan` returns active EGS/local metadata state plus reset risks as a dry run only.
- `ZATCA_HASH_MODE=local` remains the default. `ZATCA_HASH_MODE=sdk` is a planning flag only and does not make LedgerByte persist SDK hashes.
- The SDK readme documents `fatoora -validate -invoice <filename>`; LedgerByte now prefers launcher execution and uses direct JAR execution only as a fallback if no launcher is present.
- The SDK readme documents `fatoora -generateHash -invoice <filename>`; LedgerByte uses it as the hash oracle and does not mutate metadata during comparison.
- The wrapper enforces a 2 MB XML limit, timeout, temp-file cleanup, output redaction, and path traversal blocking. Windows `.bat` launcher execution uses `cmd.exe` with an argument array only; it does not concatenate a command string.
- The frontend displays SDK validation readiness on `/settings/zatca` and exposes dry-run plus local validation actions from invoice detail pages.
- `apps/api/src/zatca-sdk/zatca-official-fixtures.ts` registers the first official and LedgerByte XML fixtures used for the Java 11 validation pass.
- `scripts/validate-generated-zatca-invoice.cjs` validates a generated invoice through a running local API and prints a safe hash comparison summary.

See `SDK_VALIDATION_WRAPPER.md` for endpoint behavior and safety rules.

## Current Fixture Validation Result

`OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` records the 2026-05-16 fixture pass.

The SDK command is verified as `fatoora -validate -invoice <filename>`. Actual fixture execution was completed with Java 11.0.26 and the official Windows launcher from a no-space temporary SDK copy:

- Official standard invoice, simplified invoice, standard credit note, and standard debit note samples passed.
- The simplified official invoice produced warning `BR-KSA-98` about submitting simplified invoices within 24 hours, while the global result still passed.
- LedgerByte standard and simplified local XML fixtures were improved in the follow-up structural and supply-date/PIH passes. UBL ordering, official `ICV`/`PIH`/`QR` ADR shapes, standard/simplified transaction flags, seller/customer identifiers, tax total shape, supply date, official first PIH fallback, and the simplified line amount warning were corrected. The standard fixture now passes SDK XSD/EN/KSA/PIH validation and global validation. The simplified fixture now passes SDK XSD/EN/PIH validation but still fails signing, QR, and certificate checks because real signing/certificate/Phase 2 QR behavior is not implemented.
- SDK `-generateHash` has been used as a local oracle for LedgerByte fixtures. The app intentionally does not compute official hashes yet; the core helper returns blocked status until SDK hash output or verified C14N11 support is wired in.
- Generated invoice XML validation through the API now succeeds locally when SDK execution is explicitly enabled. The tested finalized invoice returned SDK exit code `0`; SDK hash `ZVhjW6kwGeZ58ZYw1l9+9dBPm+m2CIWxKX4pDXVzTsU=` and app hash `X8UbEeT1oEdrpx2lMCNRUljZtcylcMoj1HSnaCWSDb8=` produced `hashComparisonStatus=MISMATCH`, which is expected until official SDK/C14N11 hashing replaces the local deterministic app hash.
- Fresh-EGS SDK hash-mode validation now has a repeatable local runner: `corepack pnpm zatca:validate-sdk-hash-mode`. With Java 11.0.26, it enabled `SDK_GENERATED` on a zero-metadata EGS, generated `INV-000001` and `INV-000002`, persisted SDK hashes `3G0f1iTuJNYnHJY8dJWsoGfz9jfCBaTwNb+UK84ILaU=` and `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=`, verified direct SDK `-generateHash` matches, verified invoice 2 PIH equals invoice 1's SDK hash, and proved repeat generation does not mutate ICV or EGS last hash. SDK XML validation still leaves generated buyer-address warnings and an invoice 2 `KSA-13` PIH validation failure for the next pass.

## Guardrails For Future Wrapper

- Use an allowlisted command set (`-validate` and `-generateHash`; signing only after explicit design approval).
- Execute with a per-run temp directory outside `reference/`.
- Redact paths and payloads that may contain private key, certificate, OTP, CSID secret, or full signed XML.
- Enforce timeout and max output length.
- Store only derived validation results in normal application logs.
- Never use the SDK dummy private key/certificate as tenant material.
