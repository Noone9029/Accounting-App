# ZATCA Signed Artifact Storage Plan

Date: 2026-05-16

This document defines metadata-only signed artifact storage planning for future ZATCA signed XML promotion in LedgerByte. It does not persist signed XML bodies, QR payload bodies, private keys, certificate bodies, CSID tokens, OTPs, generated CSR bodies, production credentials, or production compliance state.

## Official sources inspected

- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf

## Official findings used

- The SDK readme and usage file document `-sign`, `-signedInvoice`, `-qr`, `-validate`, and `-invoiceRequest` command planning.
- The SDK readme states that bundled certificate/private-key material is dummy testing material only.
- Signed SDK samples include XAdES signature structures, PIH, QR, and `cac:Signature` elements.
- Schematron rules require QR and PIH structures and enforce cryptographic-stamp identifiers when the signature exists.
- The data dictionary defines KSA-13 previous invoice hash, KSA-14 QR, KSA-15 cryptographic stamp, KSA-16 invoice counter value, and KSA-1 UUID.
- The security features standard describes XAdES signing, certificate/key dependency, and QR/security feature behavior.
- Compliance, reporting, and clearance API documents show future payloads using `invoiceHash`, `uuid`, and base64 invoice content.
- The inspected official files do not provide a turnkey application retention policy for LedgerByte object storage, so retention duration and legal archive rules must be designed explicitly before XML body persistence.

## Signed artifact lifecycle

1. Generate unsigned XML and local hash-chain metadata.
2. Run temp-only SDK signing and QR generation in controlled local mode when explicitly enabled.
3. Run temp-only SDK validation and capture sanitized category summaries.
4. Delete temp signed XML, QR output, SDK config, and PIH override files by default.
5. Keep storage planning metadata-only until a future object storage and retention phase is approved.
6. In a future phase, persist signed XML only through an audited promotion workflow after real certificate/key custody is implemented.

## Metadata-only storage phase

Current implementation is planning-only:

- `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan` returns metadata-only storage design data.
- No `ZatcaSignedArtifactRecord` table is added in this phase.
- No signed XML body is stored.
- No QR payload body is stored.
- No object storage object is written.
- No submission log is created.
- No ICV, PIH, invoice hash, EGS last hash, or invoice metadata field is mutated.

## Future object storage phase

Future storage should use tenant-scoped object keys, encryption at rest, immutable or append-only retention, audit logging, and access controls. Proposed future key shape:

```text
zatca/signed-artifacts/{organizationId}/{invoiceId}/future-only/{invoiceNumber}-{invoiceId}-signed.xml
zatca/signed-artifacts/{organizationId}/{invoiceId}/future-only/{invoiceNumber}-{invoiceId}-qr.txt
zatca/signed-artifacts/{organizationId}/{invoiceId}/future-only/{invoiceNumber}-{invoiceId}-validation.json
```

The `future-only` segment is intentional in the current plan to prevent confusion with implemented storage.

## Future signed XML body storage rules

Do not persist signed XML bodies until all of the following exist:

- real ZATCA-issued certificate/CSID lifecycle
- production key custody boundary, preferably KMS/HSM-backed
- object storage provider with tenant-scoped keys
- retention and immutability policy
- redacted API responses
- audit log entries for create/supersede/revoke events
- explicit separation from clearance/reporting submission

Signed XML should not be stored in relational text fields. Store a storage key and metadata in the database, and keep the body in controlled object storage.

## QR payload storage decision

QR payload should not be persisted in this phase. Phase 2 QR depends on signed XML hash/signature/certificate material. Store QR only after the signed XML artifact storage model exists and after redaction rules are approved.

## Invoice hash storage decision

Current invoice metadata already stores local invoice hash fields. Future signed artifact records may store the submission hash used with `invoiceHash`, but only after the exact source is verified with official SDK signing/API request output. Do not guess whether a future submission hash should be promoted from unsigned metadata or signed-output tooling.

## Signed XML hash storage decision

A future signed artifact record may safely store `signedXmlSha256`, `signedXmlSizeBytes`, and validation summaries without storing the XML body in the database. This phase does not create that record yet.

## Validation result metadata

Future metadata can store sanitized category results:

- XSD
- EN
- KSA
- QR
- SIGNATURE
- PIH
- GLOBAL

Do not store full signed XML, QR payload, certificate body, private key, CSID token, OTP, or generated CSR body in validation metadata.

## Future clearance/reporting linkage

Official API documents show future request payloads with `uuid`, `invoiceHash`, and base64 invoice. LedgerByte must link any future signed artifact to submission attempts separately. Storage does not mean submission, and submission does not mean clearance/reporting success.

## Retention policy

No legal/tax retention duration is guessed in this phase. Before body persistence, define:

- retention period
- legal hold behavior
- immutable archive behavior
- supersession and revocation behavior
- restore behavior after backup recovery
- deletion restrictions
- tenant offboarding/export requirements

## Immutability expectations

Future signed artifacts should be append-only. If a signed artifact is replaced, create a superseding record rather than overwriting the existing object silently.

## Audit logging plan

Future audit logs should capture:

- actor id
- invoice id
- source metadata id
- signed artifact record id
- object storage key
- signed XML hash and size
- validation summary
- signing material identity summary
- source execution id
- reason for supersession or revocation

Audit logs must not contain secret or artifact body content.

## Access control plan

- `zatca.view`: may view metadata-only plan and redacted artifact metadata.
- `zatca.manage`: may eventually create promotion drafts or approvals.
- No permission should expose private key PEM, certificate body, CSID token, OTP, signed XML body, QR payload body, or generated CSR body through readiness/planning endpoints.

## Redaction rules

- Never return signed XML body from plan/readiness endpoints.
- Never return QR payload body from plan/readiness endpoints.
- Never return private key PEM, certificate body, CSID token, OTP, generated CSR body, or production credentials.
- Return hashes, sizes, storage keys, and validation summaries only after a future storage phase approves them.

## Backup and restore concerns

Backups must preserve metadata/object consistency. Restore tests must verify that signed artifact metadata does not point to missing object storage keys and that superseded artifacts remain traceable.

## Disaster recovery concerns

Disaster recovery must define how to recover signed XML artifacts, validation summaries, and audit trails without exposing secret material. Future object storage should support versioning or immutable retention where appropriate.

## Why XML bodies are not persisted yet

Signed XML body persistence would create invoice artifact state with legal/audit implications. The current repo has proven temp-only local validation with dummy SDK material, but it has not implemented real certificate custody, object storage retention, immutable archive rules, clearance/reporting linkage, or production compliance. Persisting bodies now would blur those boundaries.

## Staged implementation plan

1. Keep current local signed XML validation temp-only.
2. Add metadata-only storage readiness and plan endpoint. This phase is implemented.
3. Design Prisma metadata table and object storage provider integration after retention rules are approved.
4. Add a disabled-by-default metadata draft creation workflow that stores no XML body.
5. Add object storage write path only after real certificate/key custody and redaction rules are complete.
6. Link promoted signed artifacts to future clearance/reporting submission attempts in a separate phase.
7. Add PDF/A-3 only after signed XML storage/submission boundaries are stable.

## 2026-05-17 - ZATCA signed artifact metadata-only draft records

Official sources inspected for this phase:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf

Findings applied:
- Future clearance/reporting payloads use `uuid`, `invoiceHash`, and a base64 invoice payload, so signed artifact planning keeps invoice metadata visible but does not create submission payloads.
- Official samples and Schematron confirm signed XML, QR, cryptographic stamp, ICV, and PIH are linked artifacts; local validation success is not enough to promote or store production artifacts.
- The new `ZatcaSignedArtifactDraft` table stores planning metadata only: status, source, hashes/sizes placeholders, sanitized validation summary fields, dummy-material flag, promotion blocker reason, and creator audit metadata.
- `signedXmlStorageKey` and `qrPayloadStorageKey` remain null in this task. No signed XML body or QR payload body columns were added.
- New endpoints are local-only: `POST /sales-invoices/:id/zatca/signed-artifact-drafts`, `GET /sales-invoices/:id/zatca/signed-artifact-drafts`, and the expanded `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan`.
- Object-storage capability checks report provider/bucket configuration, unknown write capability, retention/immutability not implemented, tenant-scoped key-prefix planning, and body persistence blocked.
- Production compliance remains false. There are still no CSID requests, no ZATCA network calls, no clearance/reporting, no PDF/A-3, no production credentials, and no signed XML/QR body persistence.

Recommended next step:
- Add a future object-storage probe design that checks write/read/delete capability in an isolated test prefix without storing signed XML bodies, then define retention/immutability controls before any artifact-body persistence.
