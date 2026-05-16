# ZATCA SDK Validation Wrapper

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Purpose

LedgerByte has a test-only wrapper for the official ZATCA Java SDK files stored under `reference/`. The wrapper is for local XML validation only. It does not call ZATCA APIs, does not sign invoices, does not request CSIDs, does not embed XML into PDF/A-3, and does not make the app production compliant.

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
ZATCA_SDK_JAR_PATH=""
ZATCA_SDK_CONFIG_DIR=""
ZATCA_SDK_WORK_DIR=""
ZATCA_SDK_JAVA_BIN="java"
ZATCA_SDK_TIMEOUT_MS=30000
```

When the flag is false or unset, validation endpoints return a safe disabled response with `officialValidationAttempted=false` and no SDK execution.

When enabled, `POST /zatca-sdk/validate-xml-local`, `POST /zatca-sdk/validate-reference-fixture`, and `POST /sales-invoices/:id/zatca/sdk-validate` run local-only validation only after readiness passes.

The wrapper writes XML to a temporary work directory, runs the SDK with argument-array execution, sets `SDK_CONFIG` from the resolved SDK `Configuration/config.json`, enforces a timeout, sanitizes stdout/stderr, and deletes temp files. It does not call ZATCA network endpoints.

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
- LedgerByte local standard fixture: `FAIL`, improved; XSD/EN/KSA pass, but PIH fails with `KSA-13` and supply date warning `BR-KSA-15` remains.
- LedgerByte local simplified fixture: `FAIL`, improved; XSD/EN pass, but signing, QR, and PIH checks fail until real signature/certificate/hash-chain work exists.

The failure messages for LedgerByte fixtures are documented in `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`.

The first fixture set to validate after Java is corrected is registered in `apps/api/src/zatca-sdk/zatca-official-fixtures.ts`:

- Official standard invoice sample.
- Official simplified invoice sample.
- Official standard credit note sample.
- Official standard debit note sample.
- LedgerByte local standard XML fixture.
- LedgerByte local simplified XML fixture.

## Windows Path-With-Spaces Issue

The repo path is `E:\Accounting App`, which contains a space. Earlier SDK launcher attempts failed because the Windows batch script did not quote all derived paths. The successful fixture validation pass copied the SDK to `E:\Work\Temp\ledgerbyte-zatca-sdk-238-R3.4.8`, rewrote only the temporary copy's `Configuration/config.json`, and ran the official launcher with `SDK_CONFIG` and `FATOORA_HOME` set. The repo-local `reference/` folder was not changed.

## Future Enablement Steps

1. Keep Java 11-14 explicit through `ZATCA_SDK_JAVA_BIN`, Docker, or isolated SDK temp workspaces.
2. Prefer the official `fatoora -validate -invoice <filename>` launcher because direct JAR execution was not equivalent for the simplified sample.
3. Keep the first XML structural fixes under tests: UBL order, official `ICV`/`PIH`/`QR` ADRs, invoice type flags, party identifiers, tax totals, and line formulas.
4. Add standard supply date mapping and compare SDK hash output to LedgerByte hash output before changing app hash logic.
5. Keep signing, real API calls, production CSID, clearance/reporting, and PDF/A-3 out of scope until canonical hash-chain and signed XML validation are stable locally.

## Compliance Warning

SDK readiness and dry-run command planning are engineering tools only. Passing local SDK validation in the future would still not be legal certification or production ZATCA compliance without official sandbox onboarding, valid CSIDs, signing, API validation, PDF/A-3/archive decisions, and legal/operational review.
