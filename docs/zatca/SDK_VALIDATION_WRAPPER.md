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
- `projectPathHasSpaces`
- `canAttemptSdkValidation`
- `canRunLocalValidation`
- `blockingReasons`
- `warnings`
- `suggestedFixes`

The endpoint requires authentication and `x-organization-id`. It does not read or return private keys, CSIDs, OTPs, XML content, absolute SDK paths, or certificate material.

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

The wrapper writes XML to a temporary work directory, runs the SDK with argument-array execution, enforces a timeout, sanitizes stdout/stderr, and deletes temp files. It does not call ZATCA network endpoints.

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

## Java Version Warning

The SDK readme states that Java must be `>=11` and `<15`. The local machine previously reported Java 17.0.16, which is outside that range. Future execution should use a pinned Java 11-14 runtime, preferably through a Docker wrapper or an explicitly configured JRE path.

## Windows Path-With-Spaces Issue

The repo path is `E:\Accounting App`, which contains a space. Earlier SDK launcher attempts failed because the Windows batch script did not quote all derived paths. Dry-run command plans therefore prefer argument-array execution and warn when paths contain spaces.

## Future Enablement Steps

1. Pin Java 11-14 in CI or Docker.
2. Verify whether the SDK should be invoked through the launcher or direct JAR call.
3. Run SDK validation against official sample XML only in isolated test tooling.
4. Compare SDK hash output to LedgerByte hash output before changing app hash logic.
5. Keep signing, real API calls, production CSID, clearance/reporting, and PDF/A-3 out of scope until the earlier validation steps pass.

## Compliance Warning

SDK readiness and dry-run command planning are engineering tools only. Passing local SDK validation in the future would still not be legal certification or production ZATCA compliance without official sandbox onboarding, valid CSIDs, signing, API validation, PDF/A-3/archive decisions, and legal/operational review.
