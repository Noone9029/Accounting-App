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

## 2026-05-16 - ZATCA CSR dry-run workflow

Official sources inspected for this update:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf

Implemented local/non-production CSR dry-run scaffolding:
- Added a sanitized CSR dry-run path at `POST /zatca/egs-units/:id/csr-dry-run`.
- Added `corepack pnpm zatca:csr-dry-run` for local operators to print a sanitized CSR plan.
- The dry-run returns `localOnly: true`, `dryRun: true`, `noMutation: true`, `noCsidRequest: true`, `noNetwork: true`, and `productionCompliance: false`.
- The SDK command is planned from the official syntax: `fatoora -csr -csrConfig <filename> -privateKey <filename> -generatedCsr <filename> -pem`.
- Required CSR config keys are taken from the official SDK template: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Missing required CSR values block temp file preparation. LedgerByte does not invent `csr.invoice.type`, EGS location, common name, OTP, CSID, certificate, or token values.

Temp file and execution strategy:
- Temp planning uses the OS temp folder under `ledgerbyte-zatca-csr-dry-run/<egs>`.
- Planned filenames are `csr-config.properties`, `generated-private-key.pem`, and `generated-csr.pem`.
- The service writes only `csr-config.properties`, only when `prepareFiles` is explicitly requested and no required CSR fields are missing.
- The service never writes private key content, never returns private key content, and never persists generated CSR/private key output to the database.
- Files are cleaned unless `keepTempFiles` is explicitly requested for local debugging.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; this phase still skips SDK execution even if the flag is set, returning the command plan only.

Security boundary:
- No compliance CSID request is made.
- No production CSID request is made.
- No ZATCA network adapter is called.
- No invoice signing is performed.
- No clearance/reporting is performed.
- No PDF/A-3 is implemented.
- No production credentials are used or requested.
- No production compliance is claimed.

Recommended next step:
- Add explicit, official CSR onboarding fields to the EGS/profile model only after confirming each value source with the taxpayer onboarding data, then keep SDK CSR execution in a separate gated local experiment.

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.

## ZATCA CSR config review workflow update (2026-05-16)

Official references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only operator review tracking for sanitized non-production CSR config previews:
- Added `ZatcaCsrConfigReview` records with `DRAFT`, `APPROVED`, `SUPERSEDED`, and `REVOKED` status.
- Stored only sanitized `key=value` CSR config preview text, official key order, config hash, missing/review/blocker metadata, operator approval fields, and audit-friendly notes.
- Added endpoints to create/list reviews and approve/revoke review records.
- New reviews supersede previous active reviews for the same EGS unit so only the latest preview review remains active.
- Approval is blocked when the current preview has missing fields, blockers, or a changed config hash.
- `POST /zatca/egs-units/:id/csr-dry-run` now reports `configReviewRequired`, `latestReviewId`, `latestReviewStatus`, and `configApprovedForDryRun` for future controlled SDK CSR planning.
- The ZATCA settings UI shows review status, config hash, approval metadata, and create/approve/revoke actions next to the sanitized CSR config preview.
- Audit logs capture create/approve/revoke actions without private keys, certificate bodies, CSID tokens, one-time portal codes, generated CSR bodies, or production credentials.

Safety boundary remains unchanged:
- No SDK CSR execution is implemented.
- No compliance CSID or production CSID request is made.
- No invoice signing, clearance/reporting, PDF/A-3, real ZATCA network call, production credentials, or production compliance claim is enabled.

Recommended next step:
- Add an explicitly gated, temp-directory-only local CSR file preparation review gate that requires an approved review hash before any future non-production SDK CSR execution experiment.
