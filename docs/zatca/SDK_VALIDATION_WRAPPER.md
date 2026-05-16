# ZATCA SDK Validation Wrapper

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Purpose

LedgerByte has a test-only wrapper for the official ZATCA Java SDK files stored under `reference/`. The wrapper is for local XML validation only. It does not call ZATCA APIs, does not sign invoices, does not request CSIDs, does not embed XML into PDF/A-3, and does not make the app production compliant.

## Current SDK Hash Persistence Groundwork

The current pass adds explicit local-only SDK hash persistence behind per-EGS opt-in:

- Default behavior remains `LOCAL_DETERMINISTIC`; existing EGS units keep their current local hash-chain behavior.
- `POST /zatca/egs-units/:id/enable-sdk-hash-mode` can set `hashMode=SDK_GENERATED` only for a fresh EGS unit with zero invoice metadata, `confirmReset=true`, a reason, and passing SDK readiness.
- Metadata generated under SDK mode runs SDK `fatoora -generateHash -invoice <filename>`, persists that SDK hash as `invoiceHash`/`xmlHash`, stores `hashModeSnapshot=SDK_GENERATED`, and advances PIH from the previous SDK hash.
- SDK failures roll back metadata/EGS mutation; repeated metadata generation remains idempotent.
- This is not signing, not submission, not CSID onboarding, and not production compliance.

## Reference Inventory Findings

- SDK root: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`
- SDK JAR: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`
- Launchers: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora` and `Apps/fatoora.bat`
- Config/defaults: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`, `defaults.json`, `usage.txt`
- Sample XML: `Data/Samples/Simplified/**/*.xml` and `Data/Samples/Standard/**/*.xml`
- XSDs: `Data/Schemas/xsds/UBL2.1/xsd/**/*.xsd`
- Schematron/XSL: `Data/Rules/Schematrons/*.xsl`
- SDK readme: `Readme/readme.md`, `readme.pdf`, and `readme.docx`
- Java expectation from SDK readme: Java `>=11` and `<15`
- Validation command documented by SDK readme: `fatoora -validate -invoice <filename>`
- Hash oracle command documented by SDK readme: `fatoora -generateHash -invoice <filename>`

## Readiness Check

`GET /zatca-sdk/readiness` checks local SDK prerequisites and returns safe booleans:

- `enabled`
- `referenceFolderFound`
- `sdkJarFound`
- `fatooraLauncherFound`
- `jqFound`
- `configDirFound`
- `workingDirectoryWritable`
- `supportedCommandsKnown`
- `javaFound`
- `javaVersion`
- `javaVersionSupported`
- `detectedJavaVersion`
- `javaSupported`
- `requiredJavaRange`
- `javaBinUsed`
- `javaBlockerMessage`
- `sdkCommand`
- `projectPathHasSpaces`
- `canAttemptSdkValidation`
- `canRunLocalValidation`
- `blockingReasons`
- `warnings`
- `suggestedFixes`

The endpoint requires authentication and `x-organization-id`. It does not read or return private keys, CSIDs, OTPs, XML content, database URLs, secrets, or certificate material. It may return the configured Java binary string because developers need to confirm the Java 11-14 runtime used for local-only validation.

## Dry-Run Command Planning

`POST /zatca-sdk/validate-xml-dry-run` accepts:

```json
{
  "invoiceId": "<invoice id>",
  "mode": "dry-run"
}
```

or:

```json
{
  "xmlBase64": "<base64 xml>",
  "mode": "dry-run"
}
```

It loads or validates the local XML payload, builds a temporary XML path and command plan, and returns warnings. It does not write the temp file, execute Java, call the SDK, sign anything, or make network calls.

## Local Execution Gate And Config

Local SDK execution is blocked by default:

```env
ZATCA_SDK_EXECUTION_ENABLED=false
ZATCA_HASH_MODE="local"
ZATCA_SDK_JAR_PATH=""
ZATCA_SDK_CONFIG_DIR=""
ZATCA_SDK_WORK_DIR=""
ZATCA_SDK_JAVA_BIN="java"
ZATCA_SDK_TIMEOUT_MS=30000
```

When the flag is false or unset, validation endpoints return a safe disabled response with `officialValidationAttempted=false` and no SDK execution.

When enabled, `POST /zatca-sdk/validate-xml-local`, `POST /zatca-sdk/validate-reference-fixture`, and `POST /sales-invoices/:id/zatca/sdk-validate` run local-only validation only after readiness passes. The invoice validation path also runs SDK `-generateHash` as a read-only oracle and compares it to the app-stored metadata hash when one exists.

The wrapper writes XML to a temporary work directory, runs the SDK with argument-array execution, sets `SDK_CONFIG` from the resolved SDK `Configuration/config.json`, enforces a timeout, sanitizes stdout/stderr, and deletes temp files. It does not call ZATCA network endpoints. Windows batch launcher execution resolves `cmd.exe` through ComSpec/SystemRoot and preserves Windows `Path`/`PATH` so a sanitized child-process environment can still find the command shell and Java runtime.

## Validation Endpoints

`POST /zatca-sdk/validate-xml-local` accepts:

```json
{
  "xml": "<Invoice>...</Invoice>",
  "invoiceType": "standard",
  "source": "uploaded"
}
```

It also still accepts `xmlBase64` or `invoiceId` for compatibility. XML payloads are capped at 2 MB.

`POST /zatca-sdk/validate-reference-fixture` accepts a fixture path under `reference/` or `packages/zatca-core/fixtures` only:

```json
{
  "fixturePath": "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml"
}
```

Path traversal and non-XML files are rejected.

`POST /sales-invoices/:id/zatca/sdk-validate` uses already generated local invoice XML, if present. It does not update invoice accounting, does not submit to ZATCA, and does not mark the invoice production compliant.

`POST /sales-invoices/:id/zatca/hash-compare` runs the same SDK `-generateHash` oracle path without running XML validation. It returns `appHash`, `sdkHash`, `hashMatches`, `hashComparisonStatus`, env `hashMode`, EGS `hashMode`, metadata `hashModeSnapshot`, and `noMutation=true`. With default SDK execution disabled it returns a blocked response. It never updates `ZatcaInvoiceMetadata`, `ZatcaEgsUnit.lastIcv`, or `ZatcaEgsUnit.lastInvoiceHash`.

`GET /zatca/hash-chain-reset-plan` is an admin-only dry run. It returns active EGS units, hash modes, metadata counts, current local ICV/hash state, latest generated invoice metadata, SDK readiness blockers, SDK-mode enablement eligibility, reset risks, and recommended next steps. It does not reset or delete anything.

When SDK execution is enabled, the response includes hash comparison fields:

- `sdkHash`: the SDK `-generateHash` output, when it can be parsed.
- `appHash`: the current `ZatcaInvoiceMetadata.invoiceHash`, when validating generated invoice XML.
- `hashMatches`: `true`, `false`, or `null`.
- `hashComparisonStatus`: `MATCH`, `MISMATCH`, `NOT_AVAILABLE`, or `BLOCKED`.

The comparison is read-only. It does not update `ZatcaInvoiceMetadata`, `ZatcaEgsUnit.lastInvoiceHash`, invoice status, or accounting data.

`scripts/validate-generated-zatca-invoice.cjs` can be used locally to log in to a running API, generate/fetch invoice XML, call the SDK wrapper endpoint, and print a safe summary without tokens, XML, or secrets.

## Java Version Status

The SDK readme states that Java must be `>=11` and `<15`. The local default Java is OpenJDK 17.0.16, which is outside that range, but a supported Java 11 runtime was found at:

```text
C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe
```

Do not change global Java. For local SDK validation, set `ZATCA_SDK_JAVA_BIN` to a Java 11-14 binary or use an isolated temp/Docker wrapper.

## Official Fixture Validation Status

The official fixture validation pass is documented in `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`.

Current result: official sample validation is no longer blocked. Using Java 11.0.26 and the official `fatoora.bat` launcher from a no-space temporary SDK copy:

- Official standard invoice: `PASS`
- Official simplified invoice: `PASS` with warning `BR-KSA-98`
- Official standard credit note: `PASS`
- Official standard debit note: `PASS`
- LedgerByte local standard fixture: `PASS`; XSD/EN/KSA/PIH pass and the global SDK result passes after supply-date and official first-PIH fallback mapping.
- LedgerByte local simplified fixture: `FAIL`, improved; XSD/EN/PIH pass, but signing, QR, and certificate checks fail until real signature/certificate/Phase 2 QR work exists.

The failure messages for LedgerByte fixtures are documented in `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`.

The first fixture set to validate after Java is corrected is registered in `apps/api/src/zatca-sdk/zatca-official-fixtures.ts`:

- Official standard invoice sample.
- Official simplified invoice sample.
- Official standard credit note sample.
- Official standard debit note sample.
- LedgerByte local standard XML fixture.
- LedgerByte local simplified XML fixture.

Generated invoice XML validation through the API now succeeds locally when SDK execution is explicitly enabled. For local deterministic metadata, SDK hash comparison can still show `MISMATCH`, confirming that old/default app hash-chain storage is not production hash-chain evidence. For fresh `SDK_GENERATED` EGS metadata, persisted hashes now match SDK `-generateHash`.

## Fresh EGS SDK Hash-Mode Validation Status

`scripts/validate-zatca-sdk-hash-mode.cjs` provides a repeatable local-only runner for the explicit `SDK_GENERATED` hash mode path. It requires a running local API, Java 11-14, and SDK execution env vars, then creates an isolated local organization, creates a fresh zero-metadata EGS, enables SDK hash mode, generates two finalized invoices, and compares persisted hashes to direct SDK `-generateHash` output.

Latest PIH debug run:

- Java: `11.0.26`
- EGS: fresh local zero-metadata `SDK Hash EGS 20260516090352`
- Invoice 1: `INV-000001`, persisted hash `LjCY8QibCBOF4IHSmbwyLFevrxfCi7wD5+XP2D2plS4=`, direct SDK hash matched, PIH used the official first seed from `Data/PIH/pih.txt`.
- Invoice 2: `INV-000002`, persisted hash `5HwroZhItrbnJyQf0a+aiPXzTCLlIci14fnPgKZmNS0=`, direct SDK hash matched, PIH used invoice 1's SDK hash.
- Hash compare returned `MATCH` and `noMutation=true` for both invoices.
- Repeated generation did not increment ICV or change EGS last hash.
- XML validation for both invoices globally passed after the wrapper supplied invoice-specific `pihPath` values to the SDK validator.
- Remaining XML validation warning is `BR-KSA-63` for buyer building number.

The wrapper now treats official SDK output containing `GLOBAL VALIDATION RESULT = FAILED` or `validation result : FAILED` as `success=false` even when the SDK process exits `0`.

For invoice-chain validation, the wrapper writes a temporary SDK config when `previousInvoiceHash` is available. The temp config points `pihPath` at a temp file containing that invoice metadata value. This avoids validating invoice 2 against the SDK bundle's default first-seed `Data/PIH/pih.txt` file and keeps the repo-local reference folder unchanged.

## Windows Path-With-Spaces Issue

The repo path is `E:\Accounting App`, which contains a space. Earlier SDK launcher attempts failed because the Windows batch script did not quote all derived paths. The successful fixture validation pass copied the SDK to `E:\Work\Temp\ledgerbyte-zatca-sdk-238-R3.4.8`, rewrote only the temporary copy's `Configuration/config.json`, and ran the official launcher with `SDK_CONFIG` and `FATOORA_HOME` set. The repo-local `reference/` folder was not changed.

## Future Enablement Steps

1. Keep Java 11-14 explicit through `ZATCA_SDK_JAVA_BIN`, Docker, or isolated SDK temp workspaces.
2. Prefer the official `fatoora -validate -invoice <filename>` launcher because direct JAR execution was not equivalent for the simplified sample.
3. Keep the first XML structural fixes under tests: UBL order, official `ICV`/`PIH`/`QR` ADRs, invoice type flags, party identifiers, tax totals, and line formulas.
4. Keep validating API-generated invoice XML with the SDK wrapper as XML mapping changes.
5. Validate the fresh-EGS SDK hash mode against SDK `-generateHash` output before any signing work.
6. Decide whether production uses SDK `-generateHash` directly or a verified in-process C14N11 fallback.
7. Keep signing, real API calls, production CSID, clearance/reporting, and PDF/A-3 out of scope until canonical hash-chain and signed XML validation are stable locally.

## Compliance Warning

SDK readiness and dry-run command planning are engineering tools only. Passing local SDK validation in the future would still not be legal certification or production ZATCA compliance without official sandbox onboarding, valid CSIDs, signing, API validation, PDF/A-3/archive decisions, and legal/operational review.

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## 2026-05-16 - Local ZATCA signing dry-run and Phase 2 QR gate

- Official sources inspected: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, official simplified/standard invoice samples, official standard credit/debit samples, SDK certificate/private-key fixture paths, BR-KSA Schematron rules, UBL XAdES/XMLDSig schemas, XML implementation standard PDF, security features implementation standard PDF, and EInvoice_Data_Dictionary.xlsx.
- Added local-only signing dry-run groundwork through `POST /sales-invoices/:id/zatca/local-signing-dry-run` and `corepack pnpm zatca:local-signing-dry-run`.
- `ZATCA_SDK_SIGNING_EXECUTION_ENABLED` defaults to `false`. With the default setting, no SDK signing execution, no QR generation, no temp private-key usage, no signed XML output, no CSID request, no ZATCA network call, and no persistence occurs.
- If explicitly enabled for local/non-production work, the planned path writes unsigned XML to temporary files, attempts the official SDK `-sign` command, plans/runs the SDK `-qr` step only after a signed XML is detected, sanitizes stdout/stderr, and cleans temporary files by default.
- Redaction guarantees: responses and logs must not include private key PEM, certificate bodies, CSID tokens, OTPs, full signed XML bodies, generated CSR bodies, or QR payload bodies.
- Phase 2 QR status: blocked until signed XML, certificate, hash, and signature artifacts are available. The current UI/API exposes the dependency chain instead of fabricating cryptographic QR tags.
- Production limitations remain: no compliance CSID request, no production CSID request, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: run a controlled non-production SDK signing experiment only after approved CSR/test certificate material exists and the operator explicitly enables the local execution gate.

## 2026-05-16 - Controlled local ZATCA signing experiment

Scope: local SDK signing/Phase 2 QR experiment only. No CSID request, no ZATCA network call, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed from official references:
- The SDK documents local `fatoora -sign -invoice <file> -signedInvoice <file>` and `fatoora -qr -invoice <file>` commands.
- Simplified invoices require the cryptographic stamp/UBL signature structures and Phase 2 QR path; BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60 remain expected until valid signing material and QR generation are in place.
- The official samples contain the required signature IDs `urn:oasis:names:specification:ubl:signature:1`, `urn:oasis:names:specification:ubl:signature:Invoice`, and signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`.
- The bundled SDK certificate/private key files are treated as SDK dummy/test material only and must not be used as production credentials.

Implementation updates:
- Hardened `POST /sales-invoices/:id/zatca/local-signing-dry-run` so `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` still requires a generated XML, invoice metadata, active EGS, writable temp directory, Java SDK readiness, SDK launcher/config readiness, explicit SDK dummy certificate/private key availability, no production credentials, no network-like command plan, and no persistence.
- Rewrites SDK config into a temp directory for any future local signing attempt so official config keys point at repo-local SDK paths and dummy test material without returning certificate/private-key content.
- Response now distinguishes `executionStatus`, `signingExecuted`, `qrExecuted`, dummy material readiness, temp SDK config writing, signed XML detection, QR detection, SDK exit codes, sanitized stdout/stderr, blockers, warnings, and cleanup.
- UI now surfaces local signing execution status plus whether SDK signing or QR commands actually executed.
- Default smoke remains safe with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false` and verifies execution is skipped.

Controlled local experiment result:
- Experiment invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`, generated locally as `SIMPLIFIED_TAX_INVOICE` with ICV 33 for this test.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` set only for that command.
- Java observed: OpenJDK 17.0.16.
- SDK path: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- Result: `executionEnabled=true`, `executionAttempted=false`, `executionSkipped=true`, `executionStatus=SKIPPED`.
- Blocker: detected Java 17.0.16 is outside the SDK-supported range `>=11 <15`.
- SDK exit code: not applicable because execution was correctly blocked before SDK invocation.
- `signedXmlDetected=false`; `qrDetected=false`; `sdkExitCode=null`; `qrSdkExitCode=null`.
- Temp files written: unsigned XML false, SDK config false, signed XML false.
- Cleanup: no temp files required; cleanup reported success.
- Optional local validation of signed temp XML was skipped because no signed XML was produced.

Security and redaction guarantees:
- No private key PEM, certificate body, CSID token, OTP, generated CSR body, signed XML body, or QR payload body is returned or stored.
- No invoice metadata is marked signed.
- No signed XML or QR is persisted to the database.
- The dry-run path does not request CSIDs, does not call ZATCA, and does not submit invoices.
- The path remains a local engineering experiment and does not prove production compliance.

Remaining blockers and next step:
- Install/use an officially supported Java runtime for the SDK experiment, preferably Java 11, then rerun the gated local experiment with SDK dummy/test material only.
- Even if local dummy signing succeeds later, production signing remains blocked until proper compliance/production CSID onboarding, key custody, certificate handling, clearance/reporting design, and production validation are implemented.
