# Official ZATCA SDK Fixture Validation Results

Audit date: 2026-05-16

Base commit audited: `482237e Validate official ZATCA SDK fixtures`

## Scope

This pass used only the official ZATCA documentation, SDK, schemas, rules, samples, and manuals present under the repo-local `reference/` folder. No ZATCA network calls were enabled or attempted. No invoices were submitted, no CSIDs were requested, no production credentials were used, no invoice signing was implemented, and PDF/A-3 was not implemented.

## SDK Hash Persistence Groundwork Update

Commit context: current working tree after `3ed2568 Add ZATCA hash-chain replacement groundwork`.

This update did not change the official fixture validation results. It uses the previously verified SDK `-generateHash` command as the local hash oracle for an explicit fresh-EGS persistence path:

- Default EGS hash mode remains `LOCAL_DETERMINISTIC`.
- Fresh EGS units can opt into `SDK_GENERATED` only after local SDK execution/readiness passes and an admin confirms the reset reason.
- Existing EGS units with invoice metadata are blocked from in-place SDK hash migration.
- Metadata generated in SDK mode stores the SDK hash and `hashModeSnapshot=SDK_GENERATED`.
- No signing, ZATCA network calls, CSID requests, clearance/reporting, or PDF/A-3 work was added.

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

## Structural Mapping Correction Pass

Follow-up date: 2026-05-16

Commit context: current working tree after `9e350d6 Run ZATCA SDK fixture validation readiness`.

Official files used again for this pass:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonAggregateComponents-2.1.xsd`

Changes made:

- Moved ICV from an invalid root `cbc:ID schemeID="ICV"` into official `cac:AdditionalDocumentReference/cbc:ID=ICV/cbc:UUID`.
- Kept PIH as `cac:AdditionalDocumentReference/cbc:ID=PIH/cac:Attachment/cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain"`.
- Added QR `AdditionalDocumentReference` structure using the existing local TLV output; Phase 2 cryptographic QR tags are still not implemented.
- Mapped standard invoice `InvoiceTypeCode@name` to `0100000` and simplified invoice `InvoiceTypeCode@name` to `0200000`, matching the official invoice samples.
- Reordered UBL address and item children to satisfy the official UBL XSD.
- Changed tax totals, legal monetary totals, and line classified tax category shape to match the official invoice samples for the current single-standard-VAT local fixtures.
- Updated the standard fixture buyer VAT to the official sample-style valid pattern and corrected the simplified fixture line totals to remove the local line-net warning.

Revalidation used the same Java 11 runtime and official launcher command:

```powershell
cmd.exe /d /c "<temp-sdk>\Apps\fatoora.bat" -validate -invoice "<fixture.xml>"
```

| Fixture | Status after structural pass | SDK messages |
| --- | --- | --- |
| Official standard invoice | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. |
| Official simplified invoice | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[QR]`, `[SIGNATURE]`, `[PIH]` passed; warning `BR-KSA-98`; global passed. |
| Official standard credit note | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. |
| Official standard debit note | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. |
| LedgerByte standard local fixture | FAIL, improved | `[XSD]`, `[EN]`, `[KSA]` now pass. Remaining warning `BR-KSA-15` says a tax invoice with standard transaction code must contain supply date. `[PIH]` fails with `KSA-13`; global failed. |
| LedgerByte simplified local fixture | FAIL, improved | `[XSD]` and `[EN]` now pass. Remaining KSA/signature/QR failures are `BR-KSA-30`, `BR-KSA-28`, warning `BR-KSA-29`, warning `BR-KSA-60`, warning `BR-KSA-98`, `QRCODE_INVALID`, signature `NullPointerException`, signature `certificate wrong invoiceCertificate`, and `[PIH]` `KSA-13`; global failed. |

Resolved from the first LedgerByte fixture failure set:

- XSD ordering error around `cbc:IssueDate`.
- `BR-KSA-33` missing invoice counter value shape.
- `BR-KSA-06` invalid transaction-code flag structure.
- `BR-KSA-44` invalid buyer VAT in the local standard fixture.
- `BR-KSA-08` missing seller identification warning in the local fixtures.
- `BR-KSA-EN16931-09` tax total shape warning in the local fixtures.
- `BR-KSA-EN16931-11` simplified invoice line net amount warning.

Remaining non-production gaps:

- `KSA-13` remains because official PIH/hash-chain/canonicalization is not implemented.
- Simplified invoices still require real cryptographic stamp/signature and Phase 2 QR tags.
- Standard invoices still need a real supply/delivery date mapping (`BR-KSA-15`) before official validation can pass cleanly.
- This pass still does not sign invoices, call ZATCA, request CSIDs, or prove production compliance.

## Supply Date And PIH/Hash Groundwork Pass

Follow-up date: 2026-05-16

Commit context: current working tree after `35a5358 Fix ZATCA XML structure against SDK gaps`.

Official files used for this pass:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Reference findings:

- Schematron `BR-KSA-15` requires `cac:Delivery/cbc:ActualDeliveryDate` for standard tax invoices with transaction-code prefix `01`.
- Data dictionary field `KSA-5` maps supply date to `cac:Delivery / cbc:ActualDeliveryDate`.
- Schematron `BR-KSA-26`, the security features PDF, and the SDK `Data/PIH/pih.txt` support the first-invoice PIH value `NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==`, the base64 SHA-256 value for `0`.
- Schematron and the XML/security docs describe invoice-hash input transforms: remove `ext:UBLExtensions`, remove `cac:AdditionalDocumentReference` where `cbc:ID = QR`, remove `cac:Signature`, canonicalize using C14N11, SHA-256 hash the canonical bytes, then base64 encode.
- SDK docs expose a local hash oracle command: `fatoora -generateHash -invoice <filename>`.

Changes made:

- Added `ZatcaInvoiceInput.supplyDate` and emitted `cac:Delivery/cbc:ActualDeliveryDate` in UBL order after the customer party.
- Mapped generated sales invoice XML to use `SalesInvoice.issueDate` as the local supply-date fallback until LedgerByte has a dedicated supply/delivery date field.
- Changed the first-invoice PIH fallback to the official SDK/Schematron value above while preserving explicit `previousInvoiceHash` overrides.
- Added hash-input groundwork helpers that remove the documented nodes but intentionally return a blocked result until SDK `-generateHash` or a verified C14N11 implementation is used.
- Updated local standard/simplified fixtures and fixture tests.

Revalidation used Java 11.0.26 and the official launcher from the same no-space temporary SDK workflow:

```powershell
cmd.exe /d /c "<temp-sdk>\Apps\fatoora.bat" -validate -invoice "<fixture.xml>"
```

| Fixture | Status after supply/PIH pass | SDK messages |
| --- | --- | --- |
| Official standard invoice | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. |
| Official simplified invoice | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[QR]`, `[SIGNATURE]`, `[PIH]` passed; warning `BR-KSA-98`; global passed. |
| Official standard credit note | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. |
| Official standard debit note | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. |
| LedgerByte standard local fixture | PASS | `[XSD]`, `[EN]`, `[KSA]`, `[PIH]` passed; global passed. Previous `BR-KSA-15` and `KSA-13` messages are resolved for this local fixture. |
| LedgerByte simplified local fixture | FAIL, improved | `[XSD]`, `[EN]`, and `[PIH]` passed. Remaining KSA/signature/QR failures are `BR-KSA-30`, `BR-KSA-28`, warnings `BR-KSA-29`, `BR-KSA-60`, `BR-KSA-98`, `QRCODE_INVALID`, signature `NullPointerException`, and wrong `invoiceCertificate`; global failed. |

SDK `-generateHash` was run as a local oracle only. The values are recorded for future comparison tests. Later work added explicit fresh-EGS SDK hash persistence, but these fixture values still do not represent signing, submission, CSID issuance, or production compliance:

- LedgerByte standard fixture: `Lt2QoJTH0yk6yJYK7vtb59zfyYwFOb8RsWWrpMdGCVg=`
- LedgerByte simplified fixture: `5Ikqk68Pa1SveBTWh+K5tF55LUoj+GhLzj/Ib78Bpfw=`

Resolved from the previous LedgerByte fixture failure set:

- Standard `BR-KSA-15` supply-date warning.
- Standard `KSA-13` PIH failure.
- Simplified `KSA-13` PIH failure.

Remaining non-production gaps:

- The app still does not compute official invoice hashes in-process; the core helper blocks until SDK `-generateHash` or verified C14N11 support is added.
- Generated invoice XML through the API still needs SDK validation with a local DB/API stack.
- Simplified invoices still require real cryptographic stamp/signature, certificate handling, and Phase 2 QR tags.
- No signing, ZATCA network calls, CSID, clearance/reporting, or PDF/A-3 work was added.

## API Generated XML And Hash Comparison Pass

Follow-up date: 2026-05-16

Commit context: current working tree after `9a4f3ea Add ZATCA supply date and PIH hash groundwork`.

Official files used again for this pass:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

The SDK readme and `Configuration/usage.txt` confirm the local hash command:

```powershell
fatoora -generateHash -invoice <filename>
```

The SDK hash oracle was rerun with Java 11.0.26 from `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`, using the official launcher from a no-space temporary SDK copy and a temporary `Configuration/config.json` with absolute local SDK paths. No ZATCA network call was made.

| XML | SDK validation result | SDK hash |
| --- | --- | --- |
| Official standard invoice sample | PASS | `V4U5qlZ3yXQ/Si1AC/R8SLc3F+iNy27wdVe8IWRqFAQ=` |
| Official simplified invoice sample | PASS with `BR-KSA-98` warning | `z5F9qsS6oWyDhehD8u8S0DaxV+2CUiUz9Y+UsR61JgQ=` |
| LedgerByte standard local fixture | PASS | `Lt2QoJTH0yk6yJYK7vtb59zfyYwFOb8RsWWrpMdGCVg=` |
| LedgerByte simplified local fixture | FAIL on expected signing/certificate/Phase 2 QR gaps; XSD/EN/PIH pass | `5Ikqk68Pa1SveBTWh+K5tF55LUoj+GhLzj/Ib78Bpfw=` |

Generated invoice XML was validated through the API wrapper with SDK execution explicitly enabled:

```powershell
node scripts/validate-generated-zatca-invoice.cjs --invoice-id 9c08f3ce-e9e9-4ec9-a79c-5e6842de5e4b
```

Result:

- Invoice: `INV-000072`
- Organization: `00000000-0000-0000-0000-000000000001`
- SDK validation attempted: yes.
- SDK exit code: `0`.
- Wrapper `success`: `true`.
- SDK hash: `ZVhjW6kwGeZ58ZYw1l9+9dBPm+m2CIWxKX4pDXVzTsU=`
- App stored hash: `X8UbEeT1oEdrpx2lMCNRUljZtcylcMoj1HSnaCWSDb8=`
- Hash comparison: `MISMATCH`

The API-generated invoice produced a successful local SDK validation run but with production-quality address/identifier warnings including `BR-KSA-08`, `BR-KSA-F-06-C23`, `BR-KSA-09`, `BR-KSA-81`, `BR-KSA-F-06-C25`, `BR-KSA-63`, `BR-KSA-10`, `BR-KSA-66`, and `BR-KSA-67`.

The hash mismatch is expected for metadata generated in the default local mode and is documented in `HASH_CHAIN_AND_PIH_PLAN.md`: LedgerByte stores a local deterministic hash unless a fresh EGS unit has been explicitly enabled for SDK-generated hash mode.

## Hash-Chain Replacement Groundwork Pass

Follow-up date: 2026-05-16

Commit context: current working tree after `f350999 Validate API generated ZATCA XML and hash`.

Official files used again for this pass:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Changes made:

- Added `ZATCA_HASH_MODE=local` as the default planning mode.
- Added read-only `POST /sales-invoices/:id/zatca/hash-compare`, which runs SDK `-generateHash` only when local SDK execution is enabled and ready.
- Added dry-run `GET /zatca/hash-chain-reset-plan`, which reports current EGS ICV/last-hash state, existing invoice metadata, risks, and next steps without reset or deletion.
- Added settings and invoice-detail UI panels for hash mode, SDK readiness, reset-plan review, and no-mutation hash comparison.
- Kept normal smoke and tests disabled-by-default for SDK execution; no signing, CSID, clearance/reporting, network calls, or metadata mutation were added.

## Next Technical Fixes

1. Keep SDK execution disabled by default in normal app and smoke runs.
2. Use Java 11-14 through `ZATCA_SDK_JAVA_BIN` or an isolated temp/Docker SDK workspace when running local SDK validation.
3. Replace local hash-chain behavior only after SDK `-generateHash` or verified C14N11 hash generation is wired in behind a controlled migration/reset plan.
4. Resolve generated XML seller/buyer address and identifier warnings from official samples/rules.
5. Design signing/certificate/key custody before attempting to resolve simplified signature and Phase 2 QR failures.
6. Do not start CSID, clearance/reporting, or PDF/A-3 work until XML/hash/signature validation is stable locally.

## Compliance Warning

This validation pass does not prove production compliance. Production readiness still requires official XML mapping, canonicalization, signing, CSID onboarding, clearance/reporting, PDF/A-3/archive review, legal/accounting review, and controlled sandbox testing.
