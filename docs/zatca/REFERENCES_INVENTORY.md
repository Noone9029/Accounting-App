# ZATCA References Inventory

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

Inventory date: 2026-05-12.

The task requested `references/`, but this checkout contains `reference/` (singular). No tracked files were found under `references/`. The files below are local reference material and should not be treated as application runtime inputs unless a later implementation explicitly copies validated, license-approved fixtures into a tracked test fixture folder.

Summary:

- Official documentation PDFs/XLSX found under `reference/zatca-docs`.
- Official Java SDK bundle found under `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- SDK sample XML, PDF/A-3 samples, XSD schemas, and Schematron XSL rules are present.
- SDK certificate and private-key files are dummy/testing material and must never be used as production secrets.
- Two top-level PDFs appear to be local application/business artifacts, not official ZATCA material.

| File path | File type | Likely purpose | Official ZATCA/FATOORA material | Contains | Use timing |
| --- | --- | --- | --- | --- | --- |
| `reference/App Development Timeline.pdf` | PDF | Local app planning/timeline document. | No | Guidance unrelated to ZATCA implementation. | Never for ZATCA logic. |
| `reference/Receipt for 20260328_INV-000100_Unison Mena Company.pdf` | PDF | Local/sample receipt artifact. | No | Business sample, not a ZATCA fixture. | Never for ZATCA logic. |
| `reference/zatca-docs/20210602_ZATCA_Electronic_Invoice_Resolution_English_Vshared.pdf` | PDF | E-invoicing resolution/regulatory context. | Yes | Legal/regulatory guidance. | Later, for legal review and scope confirmation. |
| `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf` | PDF | Security features implementation standard. | Yes | Cryptographic stamp, signature, QR/hash security guidance. | Now for mapping; later for implementation. |
| `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf` | PDF | XML implementation standard. | Yes | XML, UBL, KSA extension, hash/QR/signature references. | Now for mapping; later for XML implementation. |
| `reference/zatca-docs/clearance.pdf` | PDF | Clearance API documentation. | Yes | Standard invoice clearance endpoint, request/response, errors. | Later, after signed XML and sandbox credentials. |
| `reference/zatca-docs/compliance_csid.pdf` | PDF | Compliance CSID API documentation. | Yes | Compliance CSID onboarding endpoint and OTP/CSR response fields. | Later, after OTP and sandbox access. |
| `reference/zatca-docs/compliance_invoice.pdf` | PDF | Compliance invoice API documentation. | Yes | Compliance-check endpoint, invoice payload, validation response fields. | Later, after signed XML and CSID. |
| `reference/zatca-docs/E-invoicing Regulation EN.pdf` | PDF | E-invoicing regulation. | Yes | Regulatory obligations and definitions. | Later, for legal review. |
| `reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf` | PDF | Detailed implementation guideline. | Yes | Business scenarios, QR/hash/security descriptions. | Now for mapping; later for implementation detail. |
| `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx` | XLSX | ZATCA data dictionary. | Yes | Business terms, UBL paths, cardinality, rules. | Now for mapping; later for XML implementation. |
| `reference/zatca-docs/onboarding.pdf` | PDF | Production CSID onboarding API documentation. | Yes | Production CSID endpoint and dependency on compliance CSID credentials. | Later only; production flow remains blocked. |
| `reference/zatca-docs/renewal.pdf` | PDF | Production CSID renewal API documentation. | Yes | Renewal endpoint and OTP/CSR response fields. | Later only. |
| `reference/zatca-docs/reporting.pdf` | PDF | Reporting API documentation. | Yes | Simplified invoice reporting endpoint and response fields. | Later, after signed XML and production CSID flow design. |
| `reference/zatca-docs/User_Manual_Developer_Portal_Manual_Version_3.pdf` | PDF | Developer portal user manual. | Yes | Portal workflow guidance. | Later, for sandbox access and manual onboarding. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora` | Shell script | SDK CLI launcher for Unix-like shells. | Yes, in SDK bundle | CLI entrypoint. | Later via wrapper, not direct app dependency. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora.bat` | BAT | SDK CLI launcher for Windows. | Yes, in SDK bundle | CLI entrypoint. | Later via wrapper; current path with spaces breaks unquoted calls. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/global.json` | JSON | SDK CLI path/config metadata. | Yes, in SDK bundle | Runtime path configuration. | Later if wrapping SDK CLI. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/jq.exe` | EXE | Bundled jq helper for Windows scripts. | Yes, in SDK bundle | Script helper. | Later only inside SDK wrapper. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar` | JAR | Java SDK executable/library. | Yes, in SDK bundle | Validation, signing, hash, QR, CSR, API request tooling per readme. | Later through isolated CLI/Docker wrapper. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json` | JSON | SDK runtime configuration. | Yes, in SDK bundle | Config paths/options. | Later only inside SDK wrapper. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/defaults.json` | JSON | SDK default schema/rule/cert paths. | Yes, in SDK bundle | XSD, Schematron, cert/key, PIH paths. | Later for wrapper setup and validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/jq.exe` | EXE | Bundled jq helper. | Yes, in SDK bundle | Script helper. | Later only inside SDK wrapper. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt` | TXT | SDK CLI usage text. | Yes, in SDK bundle | CLI arguments. | Now for planning; later for wrapper. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem` | PEM | Dummy SDK certificate. | Yes, in SDK bundle | Test certificate material. | Never for production; later only in isolated SDK sample tests if allowed. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem` | PEM | Dummy SDK private key. | Yes, in SDK bundle | Test private-key material. | Never for application secrets or logs. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties` | Properties | Arabic VAT-group CSR sample. | Yes, in SDK bundle | CSR subject/config example. | Later for CSR mapping tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties` | Properties | Arabic CSR sample. | Yes, in SDK bundle | CSR subject/config example. | Later for CSR mapping tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties` | Properties | English VAT-group CSR sample. | Yes, in SDK bundle | CSR subject/config example. | Later for CSR mapping tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties` | Properties | English CSR sample. | Yes, in SDK bundle | CSR subject/config example. | Later for CSR mapping tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties` | Properties | CSR config template. | Yes, in SDK bundle | Required CSR config keys. | Now for mapping; later for CSR generator alignment. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt` | TXT | Previous invoice hash seed/sample. | Yes, in SDK bundle | PIH sample value. | Now for gap report; later for hash-chain tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl` | XSL | ZATCA Schematron validation rules. | Yes, in SDK bundle | KSA business rules, QR/ICV/PIH/signature validations. | Now for mapping; later for validation tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl` | XSL | EN16931 UBL Schematron. | Yes, in SDK bundle | EN16931 business rules. | Later for validation tests. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Advance Payment adjustments with foreign currency invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later, after license/legal review. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Advance Payment adjustments with rate change scenarios.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Advance Payment adjustments.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Credit Note of a Simplified Tax Invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Exempt Tax Invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Export invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Nominal supply invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Out of Scope Standard Tax Invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Self-billing invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Simplified Tax Invoice with Zero Rated Item.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Simplified_Invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Standard_Credit_Note.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Standard_Debit_Note.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Standard_Invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Summary Invoice.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/Third party billing.pdf` | PDF | PDF/A-3 sample. | Yes, in SDK bundle | PDF/A-3 sample output. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Credit/Simplified_Credit_Note.xml` | XML | Simplified credit note sample. | Yes, in SDK bundle | XML sample. | Later as fixture after license review. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Debit/Simplified_Debit_Note.xml` | XML | Simplified debit note sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Nominal supply invoice.xml` | XML | Simplified nominal supply invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified Tax Invoice with Zero Rated Item.xml` | XML | Simplified zero-rated invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml` | XML | Simplified invoice sample. | Yes, in SDK bundle | XML sample. | Now for structure comparison; later as fixture. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml` | XML | Standard credit note sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml` | XML | Standard debit note sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Advance Payment adjustments with foreign currency invoice.xml` | XML | Standard advance-payment sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Advance Payment adjustments with rate change scenarios.xml` | XML | Standard advance-payment/rate-change sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Advance Payment adjustments.xml` | XML | Standard advance-payment sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Exempt Tax Invoice.xml` | XML | Standard exempt tax invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Export invoice.xml` | XML | Standard export invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Out of Scope Standard Tax Invoice.xml` | XML | Standard out-of-scope invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Self-billing invoice.xml` | XML | Standard self-billing invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard Invoice with Document Level Charge.xml` | XML | Standard invoice with document-level charge sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard Invoice with Payable Rounding Adjustment.xml` | XML | Standard invoice with rounding adjustment sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml` | XML | Standard invoice sample. | Yes, in SDK bundle | XML sample. | Now for structure comparison; later as fixture. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Summary Invoice.xml` | XML | Standard summary invoice sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Third party billing.xml` | XML | Standard third-party billing sample. | Yes, in SDK bundle | XML sample. | Later. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/CCTS_CCT_SchemaModule-2.1.xsd` | XSD | UBL common schema dependency. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonAggregateComponents-2.1.xsd` | XSD | UBL aggregate component schema. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonBasicComponents-2.1.xsd` | XSD | UBL basic component schema. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonExtensionComponents-2.1.xsd` | XSD | UBL extension component schema. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonSignatureComponents-2.1.xsd` | XSD | UBL signature component schema. | Yes, in SDK bundle | XML schema. | Later for validation/signature work. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CoreComponentParameters-2.1.xsd` | XSD | UBL core component schema. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-ExtensionContentDataType-2.1.xsd` | XSD | UBL extension content schema. | Yes, in SDK bundle | XML schema. | Later for validation/signature work. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-QualifiedDataTypes-2.1.xsd` | XSD | UBL qualified datatype schema. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd` | XSD | UBL signature aggregate schema. | Yes, in SDK bundle | XML schema. | Later for signature validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureBasicComponents-2.1.xsd` | XSD | UBL signature basic schema. | Yes, in SDK bundle | XML schema. | Later for signature validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-UnqualifiedDataTypes-2.1.xsd` | XSD | UBL unqualified datatype schema. | Yes, in SDK bundle | XML schema. | Later for validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd` | XSD | XAdES schema dependency. | Yes, in SDK bundle | Signature schema. | Later for signing validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd` | XSD | XAdES schema dependency. | Yes, in SDK bundle | Signature schema. | Later for signing validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd` | XSD | XMLDSig schema dependency. | Yes, in SDK bundle | Signature schema. | Later for signing validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd` | XSD | Main UBL invoice schema. | Yes, in SDK bundle | Invoice schema. | Later for XML validation. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/install.bat` | BAT | SDK Windows install script. | Yes, in SDK bundle | Installation helper. | Later only for local SDK setup, not app runtime. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/install.sh` | Shell script | SDK Unix install script. | Yes, in SDK bundle | Installation helper. | Later only for local SDK setup. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/LICENSE.txt` | TXT | SDK license. | Yes, in SDK bundle | LGPL v3 terms. | Now for integration planning; legal review before bundling. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.docx` | DOCX | SDK readme. | Yes, in SDK bundle | SDK usage guide. | Now for planning. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md` | Markdown | SDK readme. | Yes, in SDK bundle | SDK usage guide and CLI arguments. | Now for planning. |
| `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.pdf` | PDF | SDK readme. | Yes, in SDK bundle | SDK usage guide. | Now for planning. |

## Notes From Inspection

- The SDK readme states the Java requirement as Java 11 through below 15; local default `java -version` reports Java 17.0.16, but Java 11.0.26 was found and used for official sample validation. A wrapper should still pin a compatible JRE or Docker image before repeatable SDK automation.
- Direct `java -jar ... -help` returned a configuration null-pointer error when run outside the SDK launcher context.
- The Windows launcher currently fails from this checkout path because `E:\Accounting App` contains a space and the SDK batch script does not quote all derived paths.
- The SDK readme identifies the provided certificate and private key as dummy/testing material. These files must not be copied into application state or logs.
