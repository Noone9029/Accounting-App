# Phase 2 QR Gap Analysis

LedgerByte remains controlled beta/user-testing only. This analysis uses only repo-local official ZATCA references and the metadata-only local dummy signing evidence. It does not execute SDK signing, QR generation, validation, hash commands, ZATCA network calls, CSID/OTP, clearance/reporting, PDF/A-3, migrations, seed/reset/delete, deployment, or email.

## 2026-06-06 Key Custody And CSID Lifecycle Design Link

The key custody and CSID lifecycle design is now documented in `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`, with companion checklist `CSID_LIFECYCLE_CHECKLIST.md` and decision matrix `KEY_CUSTODY_DECISION_MATRIX.md`.

Phase 2 QR remains blocked until production key custody, certificate/CSID lifecycle, signed XML generation, and evidence storage are approved. The local dummy run used SDK dummy material only and must not be treated as tenant credential material.

## 1. Purpose And Scope

Define the gap between LedgerByte's local dummy QR evidence and production Phase 2 QR/signing readiness.

This analysis distinguishes:

- Local dummy QR generation by the repo-local SDK.
- Production Phase 2 QR generation.
- SDK output used only as local metadata evidence.
- ZATCA-accepted QR behavior through clearance/reporting flows.
- QR embedded in XML as `AdditionalDocumentReference`.
- QR printed on rendered invoices or PDFs.
- QR included in a future PDF/A-3 package.

## 2. Official References Inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora.bat`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/global.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/jq.exe`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem` path/filename metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem` path/filename metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureBasicComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`

## 3. Current LedgerByte QR State

- LedgerByte has basic local QR groundwork and ZATCA readiness metadata.
- Sanitized generated standard invoice and credit-note XML fixtures exist locally.
- The approved dummy-material SDK run generated QR during temp-only SDK execution and validated the signed temp XML.
- No QR payload body is persisted.
- No production Phase 2 QR generator is implemented.
- No QR body is embedded into persistent production XML artifacts.
- No QR is proven on rendered invoices, PDFs, or PDF/A-3 packages.

## 4. What The Dummy Signing Run Proved

The local run proved that the official repo-local SDK can generate QR output for the two sanitized generated fixtures after dummy-material signing under Java 11.0.26, and that the SDK then validates the signed temp XML with exit code `0`.

The evidence is local-only and metadata-only. It proves SDK path readiness for sanitized fixtures; it does not prove that LedgerByte owns a production QR implementation.

## 5. Phase 2 QR Tags And Dependencies

The security features implementation standard defines QR TLV content in two groups:

- Tags `1-5`: seller name, seller VAT registration number, invoice timestamp, invoice total including VAT, and VAT total.
- Tag `6`: hash of the XML invoice.
- Tag `7`: ECDSA signature of the XML hash.
- Tag `8`: ECDSA public key extracted from the signing private key.
- Tag `9`: for simplified tax invoices and associated notes, the ECDSA signature of the cryptographic stamp issued by ZATCA's technical CA.

Tags `1-5` are not enough for Phase 2 readiness. Tags `6-9` depend on signing, certificate material, hash transforms, and, for simplified documents, ZATCA technical CA behavior.

## 6. Standard Invoice QR Considerations

For standard tax invoices and associated standard notes:

- The local dummy SDK can generate QR in a temp run.
- Production QR behavior still depends on a valid signed XML artifact, real certificate lifecycle, invoice hash consistency, and clearance acceptance.
- The clearance API reference validates invoice hash, QR, cryptographic stamp, and PIH, and may return a cleared invoice payload after successful validation.
- A local dummy QR pass cannot be used as clearance proof because no production certificate, CSID, auth, or ZATCA API call was used.

## 7. Simplified Invoice QR Considerations

For simplified tax invoices and associated notes:

- Schematron rule `BR-KSA-60` requires the cryptographic stamp for simplified tax invoices and related credit/debit notes.
- Tag `9` introduces the ZATCA technical CA signature dependency for simplified documents and associated notes.
- Reporting API references validate QR, cryptographic stamp, PIH, and invoice hash.
- LedgerByte has not implemented production simplified invoice QR generation, reporting submission, or ZATCA-accepted QR proof.

## 8. Credit And Debit Note QR Considerations

Credit notes and debit notes inherit the relevant invoice-type QR/signature dependencies. The approved local run covered one sanitized standard credit note and showed the local SDK can process it with dummy material.

Production note readiness still requires:

- Correct relation to the original invoice.
- Hash/PIH continuity.
- Real certificate/CSID lifecycle.
- Standard vs simplified note classification.
- Clearance/reporting behavior according to the document type.
- QR embedding, rendering, and archive behavior.

## 9. Certificate And CSID Dependencies

The SDK readme documents that the supplied SDK certificate and private key are dummy test material only. The security features standard describes cryptographic stamp identifiers as digital certificates tied to EGS onboarding, renewal, and revocation. The compliance CSID and production CSID references show CSR-based issuance flows, OTP/header requirements, token/secret/certificate response material, and downstream clearance/reporting use.

LedgerByte must design key custody and CSID lifecycle before production signing or QR can be implemented. Dummy SDK material must never be stored as tenant credentials.

## 10. QR Generation Command Findings

The SDK documents:

- `fatoora -sign -invoice <filename> -signedInvoice <filename>`
- `fatoora -qr -invoice <filename>`
- `fatoora -validate -invoice <filename>`
- `fatoora -generateHash -invoice <filename>`

The local dummy execution used sign, QR, and validate in a temp-only path in the previous sprint. This review did not execute those commands.

## 11. Gaps Before Production QR

- No approved production key custody model.
- No sandbox OTP/CSID execution.
- No production CSID lifecycle.
- No real certificate renewal/revocation process.
- No production signing service.
- No app-owned Phase 2 QR tags `6-9` implementation.
- No proven hash/signature/QR consistency against ZATCA APIs.
- No clearance/reporting adapter.
- No signed artifact storage policy.
- No QR rendering/PDF/PDF-A3 integration proof.
- No repeatable SDK CI.
- No official/legal/accounting review.

## 12. Required Implementation Sequence

1. Use the completed key custody and CSID lifecycle design as the gating baseline.
2. Define metadata-only evidence for CSID/certificate handling without storing body material in public docs or responses.
3. Build sandbox-only CSID request planning and approval gates.
4. Implement signing only after custody and CSID gates are approved.
5. Implement Phase 2 QR generation after signed XML/hash behavior is verified.
6. Validate signed XML and QR locally with metadata-only evidence.
7. Add clearance/reporting adapters only after explicit sandbox approval.
8. Design signed artifact storage and retention.
9. Add rendered invoice/PDF QR verification.
10. Add PDF/A-3 only after signed XML and QR behavior are stable.

## 13. Required Test And Evidence Sequence

- Unit tests for QR tag construction that use sanitized deterministic data only.
- Local SDK tests with Java 11-14 and no network.
- Metadata-only evidence for sign, QR, validate, cleanup, and redaction.
- Sandbox CSID lifecycle tests only after explicit approval and safe secret custody.
- Clearance/reporting tests only after explicit sandbox approval.
- Rendering/PDF tests that verify QR presence without exposing QR payload bodies.
- CI guard tests before enabling SDK validation in GitHub Actions.

## 14. What Must Remain Blocked

- Production signing.
- Production Phase 2 QR claims.
- Real ZATCA network calls.
- OTP/CSID requests.
- Clearance/reporting.
- PDF/A-3.
- Production credentials.
- Signed XML body persistence.
- QR payload body persistence.
- Private-key/certificate body exposure.
- Production compliance claims.

## 15. Recommended Next Sprint

`ZATCA sandbox CSID request execution guard`
