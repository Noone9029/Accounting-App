# ZATCA Signing and Phase 2 QR Plan

Last updated: 2026-05-16

## Scope and boundary

This plan is local-only signing groundwork and Phase 2 QR readiness planning for LedgerByte. It does not implement real XML signing, CSID requests, production credentials, clearance/reporting, PDF/A-3, or real ZATCA network calls. It must not be used as a production compliance claim.

## Official sources inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonExtensionComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonSignatureComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd`

## Official findings

- The SDK readme documents `fatoora -sign -invoice <filename> -signedInvoice <filename>`, `fatoora -qr -invoice <filename>`, and `fatoora -generateHash -invoice <filename>`.
- The SDK readme says the SDK certificate and private key under `Data/Certificates` are dummy and for testing purposes only.
- The SDK config points at `cert.pem`, `ec-secp256k1-priv-key.pem`, schema, Schematron, PIH, and input paths.
- The data dictionary maps `KSA-14` QR to `cac:AdditionalDocumentReference` with `cbc:ID = QR` and `mimeCode = text/plain`.
- The data dictionary maps `KSA-15` cryptographic stamp to `ext:UBLExtensions` plus main UBL `cac:Signature` with `cbc:ID = urn:oasis:names:specification:ubl:signature:Invoice` and `cbc:SignatureMethod = urn:oasis:names:specification:ubl:dsig:enveloped:xades`.
- Official samples include `ext:UBLExtensions`, `sig:UBLDocumentSignatures`, `sac:SignatureInformation`, XMLDSig `ds:Signature`, XAdES signed properties, embedded `ds:X509Certificate`, QR `AdditionalDocumentReference`, and main UBL `cac:Signature`.
- Schematron rules `BR-KSA-27`, `BR-KSA-28`, `BR-KSA-29`, and `BR-KSA-30` validate QR/cryptographic stamp structure. Schematron text also describes the hash transform excluding `ext:UBLExtensions`, `cac:Signature`, and QR `AdditionalDocumentReference`.
- The security features PDF states XAdES signing requires `ds:SignedInfo`, canonicalization, ECDSA SHA-256 signature method, at least two references, `ds:SignatureValue`, `ds:KeyInfo`, `ds:X509Certificate`, `xades:SignedProperties`, signing time, signing certificate references, and signature policy information.
- The security features PDF states previous invoice hash uses the same transform as the cryptographic stamp and SHA-256.
- Phase 2 QR fields include tags 1-5 plus tag 6 XML hash, tag 7 ECDSA signature of the XML hash, tag 8 ECDSA public key from the signing private key, and tag 9 ZATCA technical CA signature for simplified invoices and notes.
- The XML implementation PDF delegates QR and electronic signature details to the security features PDF.

## Signing workflow design

1. Generate unsigned UBL XML locally using the existing invoice XML builder.
2. Confirm seller, buyer, invoice, EGS, and XML readiness.
3. Resolve official SDK command plan for `fatoora -sign -invoice <filename> -signedInvoice <filename>` without executing by default.
4. Require a real certificate lifecycle before signing: CSR generation, compliance CSID/certificate, validation in simulation/sandbox, then production CSID/certificate in a later production phase.
5. Use secure key custody before enabling signing. Do not store private key material in ordinary application tables.
6. Sign only in an isolated local/temp working directory when a future controlled local dummy-material experiment is explicitly enabled.
7. Validate signed XML locally with the official SDK before any future network integration.
8. Regenerate Phase 2 QR after signing so signature-dependent QR tags are based on the final signed artifact.

## Key and certificate lifecycle

- CSR config depends on common name, serial number, organization identifier, organization unit, organization name, country, invoice type, location address, and business category.
- Compliance CSID/certificate is required before safe signing validation can be considered.
- Production CSID/certificate must wait for a separate production onboarding phase.
- The SDK dummy certificate/private key may only be used for isolated test experiments and must never be stored as tenant credentials or treated as production material.
- Production key custody should use KMS/HSM-backed signing or an equivalent controlled signing service with audit logs, key rotation, access control, and no private key disclosure to app logs or API responses.

## Invoice hash relationship to signing

- The official transform for hash/signature excludes `ext:UBLExtensions`, main UBL `cac:Signature`, and QR `AdditionalDocumentReference`.
- Existing local hash-chain work remains separate from real signing. The signing plan must not mutate ICV, PIH, invoice hash, EGS last hash, or metadata.
- Final production signing must reconcile app-stored invoice hash, SDK hash, signed XML digest, and QR tag 6.

## Phase 2 QR relationship to signing

- Current LedgerByte QR is basic local QR groundwork and must not be presented as complete Phase 2 QR.
- Phase 2 QR tags 6-9 depend on XML hash, ECDSA signature, public key, and, for simplified invoices/notes, the ZATCA technical CA signature of the cryptographic stamp.
- QR `AdditionalDocumentReference` remains the XML location for QR payloads. It must be regenerated after signing so cryptographic tags match the signed XML and certificate material.

## Local SDK signing possibility

- The SDK documents `-sign`, but LedgerByte does not execute it by default.
- `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run command plan only.
- A future optional script may use SDK dummy material only in a temp directory if official behavior is confirmed end-to-end and the user explicitly approves it.
- The current default remains `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false`.

## What must not be done

- Do not use production credentials.
- Do not request CSIDs in this phase.
- Do not submit to ZATCA.
- Do not persist SDK dummy private keys or certificates to tenant records.
- Do not log private key or certificate contents.
- Do not mark invoices as signed, cleared, reported, or production compliant.
- Do not generate fake Phase 2 QR tags.

## Validation strategy

- Normal backend tests must not require Java or SDK execution.
- Unit tests assert signing readiness blockers, dry-run signing plan shape, no private key exposure, production compliance false, and no metadata/EGS mutations.
- Smoke asserts settings and invoice readiness remain local-only and blocked for signing/Phase 2 QR/PDF-A-3 while local XML generation continues.
- Fresh-EGS SDK validation should be rerun only when XML output or hash behavior changes.

## Known blockers

- XAdES signing implementation is not present.
- Certificate lifecycle is not implemented beyond local CSR/mock CSID scaffolding.
- Private key custody/KMS/HSM is not configured.
- Phase 2 QR cryptographic tags are not implemented.
- PDF/A-3 embedding is not implemented.
- Real clearance/reporting APIs are still disabled by design.

## Staged implementation plan

1. Keep current dry-run signing plan and readiness blockers.
2. Add a controlled local dummy-material SDK signing experiment only if explicitly approved.
3. Add signed XML parsing/validation tests from official signed samples.
4. Design key custody using KMS/HSM or equivalent controlled signing service.
5. Implement compliance-certificate handling in a non-production environment with explicit user approval.
6. Generate Phase 2 QR after signed XML is available and validated.
7. Add PDF/A-3 only after signed XML and QR behavior are stable.
8. Add real ZATCA network integration only in a separate production-readiness phase with credentials and legal/compliance review.
## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.
