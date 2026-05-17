# ZATCA signed artifact immutable storage policy plan

Updated: 2026-05-17

## Scope

This document defines metadata-only planning for future immutable object storage of ZATCA signed artifacts. It does not store signed XML bodies, QR payload bodies, private keys, certificate bodies, CSID tokens, OTPs, production credentials, clearance/reporting payloads, or PDF/A-3 artifacts.

Production compliance remains false.

## Official sources inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/clearance.pdf`

## Official findings used

- The SDK supports signing, QR generation, invoice hash generation, and invoice API request generation, but those are not executed by this policy endpoint.
- Official signed samples contain `ext:UBLExtensions`, `cac:Signature`, PIH, ICV, QR, UUID, certificate data, and signed XML structures.
- Schematron rules require UUID, ICV, PIH, QR, cryptographic stamp structure, and signature IDs/methods where applicable.
- The data dictionary describes KSA-13 previous invoice hash, KSA-14 QR, KSA-15 cryptographic stamp, and KSA-16 invoice counter value.
- Clearance/reporting/compliance API references show future payload linkage to `uuid`, `invoiceHash`, and base64 invoice payloads.
- The inspected official files did not provide a legal retention duration for LedgerByte storage. No duration is guessed here.

## Current storage probe state

- `GET /zatca/signed-artifact-storage/probe-plan` is dry-run only and does not upload objects.
- `POST /zatca/signed-artifact-storage/probe` is disabled unless `ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED=true`.
- When enabled, the probe uses a harmless text object under `zatca/signed-artifacts/probe/<organizationId>/<timestamp>-probe.txt` and deletes it afterward.
- The probe never uses signed XML, QR payload, invoice data, keys, certificates, CSIDs, OTPs, production credentials, or ZATCA submission payloads.

## Metadata-only draft state

- `ZatcaSignedArtifactDraft` stores planning metadata only.
- `signedXmlStorageKey` remains null in this phase.
- `qrPayloadStorageKey` remains null in this phase.
- `productionCompliance` remains false.
- Draft records do not contain signed XML bodies, QR payload bodies, private key PEM, certificate bodies, CSID tokens, OTPs, or production credentials.

## Future object storage requirements

Future signed artifact body persistence requires all of the following before implementation:

- Legal/accounting retention duration approval.
- Object versioning or equivalent immutable history.
- Immutable archive controls or legal hold behavior.
- Append-only supersession behavior for corrected/replaced artifacts.
- Explicit deletion/voiding policy.
- Tenant-scoped object key prefixes.
- Encryption-at-rest review.
- Access-control and break-glass review.
- Backup, restore, and disaster recovery testing.
- Audit logging for create, supersede, restore, access, and administrative actions.
- Real ZATCA certificate/CSID/key custody design.
- Separate clearance/reporting submission design.

## Immutable archive design

Signed artifact body storage should be append-only. A future promoted artifact should not overwrite an existing artifact. Corrections, regenerations, or replacements should create a new version or superseding record and preserve the prior metadata and object reference for audit.

## Object versioning strategy

The future storage provider must confirm object versioning or equivalent immutable archive behavior before signed XML body persistence is allowed. Provider configuration must be verified separately from generic S3 connectivity.

## Append-only and supersede strategy

Future records should distinguish:

- Planned metadata-only draft.
- Future production signing artifact.
- Superseded artifact.
- Revoked or voided business state, without deleting the underlying artifact body unless legal policy explicitly permits it.

## Deletion and voiding policy

Deletion and voiding are not approved. Future design must separate business voiding from artifact destruction. The default assumption is no silent deletion of signed legal/tax artifacts.

## Legal retention unknowns

The official references inspected for this task do not define a LedgerByte-specific retention duration. Retention duration is marked legal/accounting review required. No period is guessed in code, docs, UI, readiness, or smoke.

## Access control requirements

Future access must be tenant-scoped and permission-guarded. Download or restore actions should require explicit authorization, audit logging, and redaction review. Signed XML and QR payloads should not be exposed from readiness or planning endpoints.

## Audit logging requirements

Future body persistence should audit:

- Artifact promotion request.
- Object key creation.
- Hash/size metadata capture.
- Validation result capture.
- Supersession.
- Restore/read access.
- Administrative retention or access-policy changes.

Logs must not include XML body, QR payload body, private key PEM, certificate body, CSID token, OTP, or production credential content.

## Encryption-at-rest expectation

Object storage should provide encryption at rest. Key management ownership, rotation, and access must be reviewed before signed XML or QR payload persistence.

## Tenant-scoped key strategy

Future keys should remain tenant scoped, for example:

- `zatca/signed-artifacts/<organizationId>/<invoiceId>/<version>/signed.xml`
- `zatca/signed-artifacts/<organizationId>/<invoiceId>/<version>/qr.txt`
- `zatca/signed-artifacts/<organizationId>/<invoiceId>/<version>/validation.json`

These are planning examples only. No body object is written in this task.

## Backup, restore, and disaster recovery

A future implementation must test restore behavior before enabling signed artifact persistence. Restore testing must prove that metadata, object keys, hashes, sizes, versions, and audit records remain consistent.

## Operational controls

- Body persistence remains blocked by `signedArtifactBodyStorageAllowed=false`.
- `policyApproved=false`.
- `retentionDurationApproved=false`.
- `productionCompliance=false`.
- Readiness must continue to show blockers until legal/accounting policy and technical object-storage controls are approved.

## What remains blocked

- Signed XML body persistence.
- QR payload body persistence.
- Production signing.
- Compliance CSID request.
- Production CSID request.
- ZATCA network calls.
- Clearance/reporting.
- PDF/A-3.
- Production credentials.
- Production compliance claim.

## Staged implementation plan

1. Complete legal/accounting retention review.
2. Select object storage provider and confirm versioning/immutability capability.
3. Define tenant-scoped key conventions and access-control rules.
4. Add restore and disaster recovery tests.
5. Add metadata-only policy approval records if needed.
6. Only after real certificate/key custody and promotion design are approved, design signed XML body persistence.
7. Keep clearance/reporting submission as a separate phase.

## Metadata-only policy approval records

This phase adds `ZatcaSignedArtifactStoragePolicyApproval` as a metadata-only approval record for future immutable signed artifact storage. It records the current policy summary, a policy hash, review status, review gates, approver/revoker metadata, and notes. It intentionally does not store signed XML bodies, QR payload bodies, private keys, certificate bodies, CSID tokens, OTPs, CSR bodies, or production credentials.

Official references inspected for this policy approval phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/clearance.pdf`

The official API documents confirm future payload linkage around UUID, invoice hash, and base64 invoice content for compliance invoice, reporting, and clearance flows. The signed XML samples and security/XML standards show cryptographic stamp, QR, PIH, and signature structures that make signed XML a future artifact. These references do not provide a LedgerByte storage-retention duration. Therefore, retention duration remains `REQUIRES_LEGAL_REVIEW` unless a legal/accounting reviewer supplies an explicit value.

Approval gates:
- Retention duration must be reviewed and supplied. LedgerByte does not invent this value.
- Object versioning must be reviewed and approved.
- Immutable archive behavior must be reviewed and approved.
- Deletion policy must be reviewed and approved.
- Supersession policy must be reviewed and approved.
- Access control must be reviewed and approved.
- Encryption at rest must be reviewed and approved.
- Backup and restore behavior must be reviewed and approved.
- Archive restore testing must be marked complete.

Even when an approval record is approved, `signedXmlBodyPersistenceAllowed`, `qrPayloadBodyPersistenceAllowed`, and `productionCompliance` remain `false` in this phase. Body persistence requires a separate future implementation after real certificate/key custody, CSID onboarding, immutable object-storage controls, clearance/reporting design, and production readiness review.

Local-only endpoints:
- `GET /zatca/signed-artifact-storage/policy-approvals` lists safe metadata records.
- `POST /zatca/signed-artifact-storage/policy-approvals` creates a draft from the current immutable policy plan.
- `POST /zatca/signed-artifact-storage/policy-approvals/:id/approve` records reviewed metadata only and keeps body persistence blocked.
- `POST /zatca/signed-artifact-storage/policy-approvals/:id/revoke` revokes metadata approval and keeps body persistence blocked.

Current out-of-scope boundaries remain unchanged: no signed XML body storage, no QR payload body storage, no CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF-A3, no production credentials, and no production compliance claim.

## ZATCA storage control evidence records update (2026-05-17)

- Official files inspected for this phase: SDK `Readme/readme.md`, SDK `Configuration/usage.txt`, SDK simplified and standard invoice samples, SDK Schematron validation rules, ZATCA Security Features PDF, ZATCA XML Implementation PDF, `EInvoice_Data_Dictionary.xlsx`, `compliance_invoice.pdf`, `reporting.pdf`, and `clearance.pdf`.
- Added metadata-only technical control evidence planning for future signed artifact storage. Evidence covers object versioning, immutable retention/legal-hold equivalent, encryption at rest, access control, backup/restore, restore testing, tenant key scoping, deletion/supersession, storage probe, and other reviewed evidence.
- Evidence records intentionally do not store signed XML bodies, QR payload bodies, private keys, certificate bodies, CSID tokens, OTPs, CSR bodies, object-storage access keys, production credentials, or production compliance state.
- Retention duration remains legal/accounting review required. No retention duration is guessed from the official references.
- Immutable policy, storage-plan, and probe-plan responses now surface evidence-required status, verified evidence types, missing evidence types, and technical-control readiness while keeping body persistence blocked.
- Endpoints added: `GET /zatca/signed-artifact-storage/control-evidence`, `POST /zatca/signed-artifact-storage/control-evidence`, `POST /zatca/signed-artifact-storage/control-evidence/:id/verify`, and `POST /zatca/signed-artifact-storage/control-evidence/:id/revoke`.
- Recommended next step: collect real legal/accounting retention approval and real provider technical evidence, then design a separate body-storage approval gate before any signed XML or QR payload persistence.

## ZATCA evidence completeness reporting (2026-05-17)

- Official files inspected for this phase: SDK `Readme/readme.md`, `Configuration/usage.txt`, simplified and standard invoice samples, the SDK Schematron rules, XML/security implementation PDFs, data dictionary, `compliance_invoice.pdf`, `reporting.pdf`, and `clearance.pdf` under `reference/`.
- Required technical evidence before future signed artifact body persistence can even be reviewed: OBJECT_VERSIONING, IMMUTABLE_RETENTION, ENCRYPTION_AT_REST, ACCESS_CONTROL, BACKUP_RESTORE, RESTORE_TEST, TENANT_KEY_SCOPING, DELETION_SUPERSESSION, and STORAGE_PROBE.
- Completeness rule: only the latest VERIFIED evidence record for each required type counts. DRAFT, REVOKED, SUPERSEDED, and OTHER evidence do not satisfy a required control.
- Added read-only organization reporting at `GET /zatca/signed-artifact-storage/evidence-completeness`; it returns required, verified, missing, draft, revoked, latest-by-type, and BLOCKED or COMPLETE_FOR_REVIEW status.
- Body persistence remains blocked even when all evidence is COMPLETE_FOR_REVIEW. A separate legal/accounting retention approval and explicit body-storage phase are still required.
- The explicit body-persistence gate always returns allowed=false in this phase because evidence, immutable policy, retention approval, production certificate/CSID/key custody, clearance/reporting, PDF/A-3, and body persistence implementation are not complete.
- No signed XML body, QR payload body, private key, certificate body, CSID token, OTP, CSR body, production credential, ZATCA network call, clearance/reporting call, PDF/A-3 output, or production compliance claim is introduced.
- Retention duration is still not guessed; legal/accounting review is required.
- Recommended next step: verify all required technical evidence records, then design a separate explicit body-storage approval gate before any signed XML/QR payload persistence work.
