# ZATCA key custody and CSR onboarding plan

Last updated: 2026-05-16

## Scope boundary

This plan is architecture and local readiness scaffolding only. LedgerByte does not request compliance CSIDs, request production CSIDs, use production credentials, sign invoices, submit invoices to ZATCA, run clearance/reporting, generate PDF/A-3, or claim production compliance.

## Official sources inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`: documented `fatoora -csr -csrConfig <filename> -privateKey <filename> -generatedCsr <filename> -pem`, `-sign`, `-qr`, non-production flags, and dummy certificate/private-key restrictions.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`: confirmed SDK command switches for CSR, signing, QR, non-production, and simulation usage.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`: confirmed SDK configuration paths for certificate, private key, PIH, schemas, and Schematrons.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`: confirmed CSR config keys.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`: confirmed example values for common name, serial number, organization identifier, organization unit name, organization name, country name, invoice type, location address, and industry business category.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`: confirmed VAT group organization identifier and organization unit variation.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties`: confirmed Arabic example template uses the same keys.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties`: confirmed Arabic VAT group example uses the same keys.
- `reference/zatca-docs/compliance_csid.pdf`: confirmed compliance CSID API shape and OTP/CSR error cases. This app does not call it.
- `reference/zatca-docs/onboarding.pdf`: confirmed production CSID onboarding depends on current compliance CSID and compliance request id. This app does not call it.
- `reference/zatca-docs/renewal.pdf`: confirmed renewal response can include `binarySecurityToken` and `secret`, which must be redacted. This app does not call it.
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`: confirmed EGS onboarding, certificate issuance, private key secrecy, XAdES/signing concepts, and QR cryptographic dependency.
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`: confirmed invoice hash transforms and signature/QR XML requirements.
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`: confirmed KSA-13 previous invoice hash, KSA-14 QR, and KSA-15 cryptographic stamp fields.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`: inspected signed standard invoice structure.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`: inspected signed simplified invoice and QR structure.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`: inspected signed standard credit note structure.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`: inspected signed standard debit note structure.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`: inspected QR/signature rules including BR-KSA-27, BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd`: inspected XMLDSig schema.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd`: inspected XAdES signed properties schema.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd`: inspected XAdES 1.4.1 schema.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonSignatureComponents-2.1.xsd`: inspected UBL signature component structure.
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd`: inspected signature aggregate structure.

## CSR field mapping plan

LedgerByte now exposes a local-only CSR plan that maps official CSR config keys to available app data without generating files or requesting CSIDs.

| SDK config key | Planned source | Current status |
| --- | --- | --- |
| `csr.common.name` | Not modelled | Missing. Do not infer from display names. |
| `csr.serial.number` | EGS `deviceSerialNumber` | Available for review only. Official examples use structured values. |
| `csr.organization.identifier` | ZATCA profile VAT number | Available when seller VAT number exists. |
| `csr.organization.unit.name` | EGS/unit or branch name | Available for review only. VAT group and branch semantics must be confirmed. |
| `csr.organization.name` | ZATCA profile seller name | Available when seller name exists. |
| `csr.country.name` | ZATCA profile country code | Available when country code exists. |
| `csr.invoice.type` | Not modelled | Missing. Must be designed from official EGS invoice capability flags. |
| `csr.location.address` | Not modelled | Missing. Do not infer from postal address. |
| `csr.industry.business.category` | ZATCA profile business category | Available when captured in profile settings. |

## EGS lifecycle

- Development EGS units continue to support local ICV and PIH/hash-chain testing.
- CSR planning reads EGS metadata but does not mutate `lastIcv`, `lastInvoiceHash`, invoice metadata, submission logs, or audit logs.
- Compliance CSID and production CSID lifecycle remain intentionally blocked.
- Renewal, rotation, revocation, and certificate expiry tracking are not implemented.

## Private key generation options

- Local development temp files: acceptable only for controlled dummy-material experiments in a temp directory; never persisted as tenant production credentials.
- Encrypted database storage: possible for non-production scaffolding, but not recommended for production signing custody because application/database compromise exposes signing keys.
- Cloud KMS: recommended production direction. The app should ask KMS to sign hashes or signing inputs without returning private key bytes.
- HSM-style custody: preferred for high assurance production signing where keys are generated and retained in hardware-backed custody.

## Recommended production approach

- Generate production signing keys inside KMS/HSM or import them under strict controls only if the selected provider and policy allow it.
- Store only key identifiers, certificate metadata, redacted certificate/token summaries, issue/expiry timestamps, and audit references in the application database.
- Never return private key material, CSID secrets, binary security tokens, OTPs, or raw certificate credentials from API responses.
- Enforce split duties for onboarding, signing enablement, key rotation, and revocation.

## Certificate and token storage plan

- Store CSR PEM only when a local development CSR is intentionally generated.
- Store certificate metadata and redacted status fields before storing any raw certificate/token material.
- If certificates or tokens are later stored, encrypt them with envelope encryption and redact them from all API, UI, logs, telemetry, and audit diffs.
- Track certificate request id, compliance request id, token type, issue date, expiry date, environment, custody mode, key id, and revocation state.

## Compliance CSID lifecycle

- Planned sequence: complete CSR fields, generate CSR under controlled custody, obtain OTP out of band, call official compliance CSID API only in a future explicitly approved implementation, redact response token/cert/secret, store metadata, run official compliance checks.
- Current implementation: no CSID request, no OTP handling, no network call.

## Production CSID lifecycle

- Planned sequence: require validated compliance CSID and compliance request id, request production CSID only in a future explicitly approved implementation, store metadata and redacted credential state, enable production signing only after full official validation.
- Current implementation: production CSID is always a readiness blocker.

## Renewal lifecycle

- Planned sequence: monitor certificate expiry, request renewal using official renewal flow only in a future implementation, rotate certificate/token safely, preserve audit trail, and retire old credentials.
- Current implementation: expiry unknown and renewal workflow missing are explicit readiness blockers.

## Rotation, revocation, backup, and disaster recovery

- Rotation must support planned key replacement without breaking historical invoice validation evidence.
- Revocation must immediately block signing and submission workflows.
- Backups must not expose raw private keys; KMS/HSM-backed keys should rely on provider DR controls.
- Restore procedures must validate key id, certificate chain, environment, and EGS state before re-enabling signing.

## Audit logging requirements

- Log who planned, generated, imported, rotated, revoked, or activated any certificate/key material.
- Redact CSR body, certificate body, binary security token, CSID secret, OTP, private key, and signed credential payloads.
- Store status transitions and references, not raw secret values.

## Secret redaction rules

Never log or return:

- Private key PEM or DER bytes.
- CSID secret values.
- Binary security tokens.
- OTP values.
- Raw production credentials.
- SDK dummy private key content.

## Implemented local scaffolding

- `GET /zatca/egs-units/:id/csr-plan` returns local-only, dry-run, no-mutation CSR planning data.
- `GET /zatca/readiness` includes CSR and key-custody readiness sections.
- ZATCA settings UI shows key custody status, CSR readiness, compliance CSID status, production CSID status, renewal status, and certificate expiry availability.
- Tests assert redaction and no-mutation behavior.

## Intentionally not implemented

- Real compliance CSID request.
- Real production CSID request.
- OTP workflow.
- Invoice signing.
- Phase 2 QR cryptographic tags.
- Clearance/reporting.
- PDF/A-3.
- Production compliance.
