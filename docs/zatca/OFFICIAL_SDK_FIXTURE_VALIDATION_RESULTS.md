# Official ZATCA SDK Fixture Validation Results

Audit date: 2026-05-16

Base commit audited: `d199c45 Add ZATCA SDK local validation groundwork`

## Scope

This pass used only the official ZATCA documentation, SDK, schemas, rules, samples, and manuals present under the repo-local `reference/` folder. No ZATCA network calls were enabled or attempted. No invoices were submitted, no CSIDs were requested, no production credentials were used, no signing was implemented, and PDF/A-3 was not implemented.

## Official Reference Files Inspected

SDK bundle:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.docx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora.bat`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/global.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/defaults.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/**/*.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/*.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/**/*.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/*.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem`

Official docs:

- `reference/zatca-docs/20210602_ZATCA_Electronic_Invoice_Resolution_English_Vshared.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/E-invoicing Regulation EN.pdf`
- `reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/User_Manual_Developer_Portal_Manual_Version_3.pdf`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/reporting.pdf`

## SDK Command Verification

The SDK README and `Configuration/usage.txt` confirm local invoice validation uses:

```bash
fatoora -validate -invoice <filename>
```

The README also states the Java prerequisite is a Java JRE/SDK `>=11` and `<15`.

The local wrapper now keeps this command format in code:

- Direct JAR execution plan: `java -jar <sdk-jar> -validate -invoice <xml-file>`
- Launcher execution plan: `<fatoora launcher> -validate -invoice <xml-file>`

Both plans use argument-array execution and never concatenate a shell command string.

## Java Runtime Result

Commands run:

```powershell
java -version
where.exe java
```

Observed Java:

```text
openjdk version "17.0.16" 2025-07-15
OpenJDK Runtime Environment Temurin-17.0.16+8
OpenJDK 64-Bit Server VM Temurin-17.0.16+8
C:\Users\Ahmad\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe
```

Result: `BLOCKED`. Java 17 is outside the official SDK README requirement of `>=11` and `<15`.

No local SDK validation command was executed because this task requires SDK commands only when Java `>=11` and `<15` is available. No repo-local Java 11-14 runtime was found under the SDK reference folder.

## Fixture Validation Results

| Fixture | Source | Path | Intended command | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| Standard invoice | Official SDK sample | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml` | `fatoora -validate -invoice Standard_Invoice.xml` | `BLOCKED` | Java 17 is unsupported by the official SDK README. |
| Simplified invoice | Official SDK sample | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml` | `fatoora -validate -invoice Simplified_Invoice.xml` | `BLOCKED` | Java 17 is unsupported by the official SDK README. |
| Standard credit note | Official SDK sample | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml` | `fatoora -validate -invoice Standard_Credit_Note.xml` | `BLOCKED` | Java 17 is unsupported by the official SDK README. |
| Standard debit note | Official SDK sample | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml` | `fatoora -validate -invoice Standard_Debit_Note.xml` | `BLOCKED` | Java 17 is unsupported by the official SDK README. |
| LedgerByte standard local fixture | Local deterministic fixture | `packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml` | `fatoora -validate -invoice local-standard-tax-invoice.expected.xml` | `BLOCKED` | Not an official ZATCA fixture. Validate only after official samples can run first. |
| LedgerByte simplified local fixture | Local deterministic fixture | `packages/zatca-core/fixtures/local-simplified-tax-invoice.expected.xml` | `fatoora -validate -invoice local-simplified-tax-invoice.expected.xml` | `BLOCKED` | Not an official ZATCA fixture. Validate only after official samples can run first. |

## Generated Invoice XML Validation

Generated invoice XML validation through the local API was not attempted with live SDK execution because the local Java runtime is unsupported. The existing API remains safe by default:

- `GET /zatca-sdk/readiness` reports execution disabled unless explicitly enabled.
- `POST /zatca-sdk/validate-reference-fixture` returns a disabled local-only response by default.
- `POST /sales-invoices/:id/zatca/sdk-validate` returns a disabled local-only response by default.

## Official Fixture Observations

The selected official samples include populated UBL extensions, signature-related structures, `cbc:InvoiceTypeCode` numeric values with multi-position `name` flags, `ICV` and `PIH` additional document references, SAR document/tax currency fields, and full line/tax/party structures.

The current LedgerByte local fixtures are intentionally deterministic skeletons. They are not official validation artifacts and should not be treated as compliance evidence.

## Gap Summary

- Runtime blocker: Java 17 is installed, but the official SDK README requires Java `>=11` and `<15`.
- Configuration gap: `Configuration/config.json` contains `C:\SDK\...` absolute paths, while `Configuration/defaults.json` uses relative SDK paths. Future execution should verify the launcher/JAR configuration from a no-space working directory.
- Path gap: the repo lives at `E:\Accounting App`, which contains a space. The wrapper must continue using `execFile` argument arrays and may need a no-space SDK temp copy if the launcher itself does not quote paths correctly.
- LedgerByte XML gap: local generated XML has not yet been evaluated by the official SDK. Do not change XML structure until official samples run and their pass/fail messages are captured.

## Next Technical Fixes

1. Install or pin Java 11-14 and set `ZATCA_SDK_JAVA_BIN` to that runtime.
2. Run official SDK sample XML files first, starting with standard invoice, simplified invoice, standard credit note, and standard debit note.
3. Capture sanitized stdout/stderr and exact SDK exit codes for each official sample.
4. Only after official samples run, validate LedgerByte local fixtures and generated invoice XML.
5. Use official SDK messages to update XML mapping, hash/canonicalization, signing, and QR work in separate scoped tasks.

## Compliance Warning

This validation pass does not prove production compliance. Production readiness still requires official validation, signing, CSID onboarding, clearance/reporting, PDF/A-3/archive review, legal/accounting review, and controlled sandbox testing.
