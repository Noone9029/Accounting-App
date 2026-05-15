# Official ZATCA SDK Fixture Validation Results

Audit date: 2026-05-16

Base commit audited: `482237e Validate official ZATCA SDK fixtures`

## Scope

This pass used only the official ZATCA documentation, SDK, schemas, rules, samples, and manuals present under the repo-local `reference/` folder. No ZATCA network calls were enabled or attempted. No invoices were submitted, no CSIDs were requested, no production credentials were used, no invoice signing was implemented, and PDF/A-3 was not implemented.

## Official Reference Files Inspected

SDK bundle:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.docx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora.bat`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/global.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/jq.exe`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/defaults.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/install.bat`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/install.sh`
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

The README also states the Java prerequisite is Java `>=11` and `<15`.

The Windows launcher wraps the JAR with SDK-specific runtime arguments and `--globalVersion`. In this pass, direct JAR execution was not equivalent for the simplified official sample: it produced QR/signature failures while the official `fatoora.bat` launcher passed the same XML. The LedgerByte wrapper therefore now prefers the official launcher when present and keeps direct JAR execution as a fallback only.

## Java Runtime Detection

Commands run:

```powershell
java -version
where.exe java
node scripts/zatca-sdk-readiness.cjs
```

Detected runtimes:

| Runtime | Version | Supported by SDK README |
| --- | --- | --- |
| `C:\Users\Ahmad\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe` | OpenJDK 17.0.16 | No |
| `C:\Program Files\Java\jre1.8.0_441\bin\java.exe` | Java 8 | No |
| `C:\Program Files\Java\jre1.8.0_51\bin\java.exe` | Java 8 | No |
| `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe` | OpenJDK 11.0.26 | Yes |

`ZATCA_SDK_JAVA_BIN` was not globally set. Local validation was run with the Java 11 runtime path directly and without changing global Java.

## Execution Setup

The repo path is `E:\Accounting App`, which contains a space. To avoid launcher path splitting, the official SDK folder was copied to this temporary no-space workspace:

```text
E:\Work\Temp\ledgerbyte-zatca-sdk-238-R3.4.8
```

Only the temporary SDK copy was adjusted. The repo-local `reference/` folder was not modified.

The temporary execution environment used:

- `FATOORA_HOME=E:\Work\Temp\ledgerbyte-zatca-sdk-238-R3.4.8\Apps`
- `SDK_CONFIG=E:\Work\Temp\ledgerbyte-zatca-sdk-238-R3.4.8\Configuration\config.json`
- `PATH` prepended with `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin` and the temporary SDK `Apps` folder
- Command shape: `cmd.exe /d /c <temp-sdk>\Apps\fatoora.bat -validate -invoice <xml-file>`

`install.bat` and `install.sh` confirmed that `SDK_CONFIG` is expected by the launcher setup. Without `SDK_CONFIG`, the SDK failed before validation with a `NullPointerException` in `Config.readResourcesPaths` and XML parser output `Content is not allowed in prolog`.

## Fixture Validation Results

| Fixture | Path | Exit code | Status | SDK messages |
| --- | --- | ---: | --- | --- |
| Official standard invoice | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml` | 0 | PASS | `[XSD] validation result : PASSED`; `[EN] validation result : PASSED`; `[KSA] validation result : PASSED`; `[PIH] validation result : PASSED`; `*** GLOBAL VALIDATION RESULT = PASSED` |
| Official simplified invoice | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml` | 0 | PASS | `[XSD] validation result : PASSED`; `[EN] validation result : PASSED`; `[KSA] validation result : PASSED`; warning `CODE : BR-KSA-98` about 24-hour simplified invoice submission; `[QR] validation result : PASSED`; `[SIGNATURE] validation result : PASSED`; `[PIH] validation result : PASSED`; `*** GLOBAL VALIDATION RESULT = PASSED` |
| Official standard credit note | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml` | 0 | PASS | `[XSD] validation result : PASSED`; `[EN] validation result : PASSED`; `[KSA] validation result : PASSED`; `[PIH] validation result : PASSED`; `*** GLOBAL VALIDATION RESULT = PASSED` |
| Official standard debit note | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml` | 0 | PASS | `[XSD] validation result : PASSED`; `[EN] validation result : PASSED`; `[KSA] validation result : PASSED`; `[PIH] validation result : PASSED`; `*** GLOBAL VALIDATION RESULT = PASSED` |
| LedgerByte standard local fixture | `packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml` | 0 | FAIL | `[XSD] validation result : FAILED`; `CODE : SAXParseException` with line 11 saying `cbc:IssueDate` was expected instead of another `cbc:ID`; `[EN] validation result : FAILED`; `CODE : SaxonApiException` with `("STD-&-001", "42")`; `[KSA] validation result : FAILED`; `CODE : BR-KSA-33`; `CODE : BR-KSA-44`; `CODE : BR-KSA-06`; warnings `BR-KSA-08`, `BR-KSA-F-06-C40`, `BR-KSA-EN16931-09`; `[PIH] validation result : FAILED`; `CODE : KSA-13`; `*** GLOBAL VALIDATION RESULT = FAILED` |
| LedgerByte simplified local fixture | `packages/zatca-core/fixtures/local-simplified-tax-invoice.expected.xml` | 0 | FAIL | `[XSD] validation result : FAILED`; `CODE : SAXParseException` with line 11 saying `cbc:IssueDate` was expected instead of another `cbc:ID`; `[EN] validation result : FAILED`; `CODE : SaxonApiException` with `("SIM-000001", "43")`; `[KSA] validation result : FAILED`; `CODE : BR-KSA-33`; `CODE : BR-KSA-06`; warnings `BR-KSA-08`, `BR-KSA-F-06-C40`, `BR-KSA-EN16931-11`, `BR-KSA-EN16931-09`; `[PIH] validation result : FAILED`; `CODE : KSA-13`; `*** GLOBAL VALIDATION RESULT = FAILED` |

## Generated Invoice XML Validation

Generated invoice XML validation through the local API was not attempted because the local API/database stack was not confirmed running for this pass. The existing API remains safe by default:

- `GET /zatca-sdk/readiness` reports execution disabled unless explicitly enabled.
- `POST /zatca-sdk/validate-reference-fixture` returns a disabled local-only response by default.
- `POST /sales-invoices/:id/zatca/sdk-validate` returns a disabled local-only response by default.

## LedgerByte XML Gap Summary From SDK Output

- UBL element ordering is wrong: the SDK XSD expected `cbc:IssueDate` where the local fixtures currently emit a second `cbc:ID` for the ICV placeholder.
- ICV is not in the official KSA-16 structure: SDK rule `BR-KSA-33` says each invoice must have an invoice counter value.
- Standard buyer VAT format is invalid for the fixture: SDK rule `BR-KSA-44` requires a 15-digit number beginning and ending with `3` when buyer VAT exists.
- Invoice transaction code mapping is wrong: SDK rule `BR-KSA-06` expects the `NNPNESBCG` flag structure, not the current enum-like text.
- Seller identification is incomplete: SDK warning `BR-KSA-08` expects one allowed seller identification scheme such as `CRN`, `MOM`, `MLS`, `SAG`, `OTH`, or `700`.
- PIH is invalid: SDK rule `KSA-13` fails for both LedgerByte fixtures.
- The simplified local fixture also fails/warns on invoice line net amount formula through `BR-KSA-EN16931-11`.
- Tax total shape needs review: SDK warning `BR-KSA-EN16931-09` appears for both LedgerByte fixtures when tax currency code is present.

## Next Technical Fixes

1. Keep SDK execution disabled by default in normal app and smoke runs.
2. Use Java 11-14 through `ZATCA_SDK_JAVA_BIN` or an isolated temp/Docker SDK workspace when running local SDK validation.
3. Update XML builder ordering and official `AdditionalDocumentReference` structures for `ICV` and `PIH` before changing signing/hash logic.
4. Replace invoice type-code `name` mapping with the official `NNPNESBCG` structure.
5. Fix party identifier/VAT and tax/line mappings using the official samples as the oracle.
6. Add generated-invoice XML validation after local API/DB fixture generation is available.
7. Do not start signing, CSID, clearance/reporting, or PDF/A-3 work until XML mapping passes official SDK validation locally.

## Compliance Warning

This validation pass does not prove production compliance. Production readiness still requires official XML mapping, canonicalization, signing, CSID onboarding, clearance/reporting, PDF/A-3/archive review, legal/accounting review, and controlled sandbox testing.
