# ZATCA Signed XML Promotion Plan

Date: 2026-05-16

This document defines the safe boundary between local temp-only signed XML validation and any future persisted signed invoice state in LedgerByte. It is architecture and readiness guidance only. It does not implement signed XML persistence, CSID requests, ZATCA submission, clearance/reporting, PDF/A-3, production credentials, or production compliance.

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

## Official findings used for this design

- The SDK readme documents local commands for signing, QR generation, validation, hash generation, API request generation, and CSR generation.
- The SDK readme states that the bundled certificate and private key are dummy testing material only.
- The SDK samples show signed XML containing `ext:UBLExtensions`, `cac:Signature`, `PIH`, and `QR` additional document references. The sample signature method values align with BR-KSA-28, BR-KSA-29, and BR-KSA-30.
- The Schematron requires PIH and QR structures and checks the signature identifiers when a cryptographic stamp exists.
- The data dictionary defines KSA-13 as the previous invoice hash over the business payload excluding QR and cryptographic stamp, and it defines KSA-14 and KSA-15 as QR and cryptographic stamp structures.
- The security features standard describes XAdES enveloped XML signing and states that the whole XML content except QR-code data is covered by the signature.
- The compliance invoice, reporting, and clearance API documents show request bodies containing `invoiceHash`, `uuid`, and base64 invoice payload. This makes persisted signed artifact state separate from the later submission response state.

## Current temp-only validation state

LedgerByte can run a controlled local SDK experiment with Java 11 and official SDK dummy/test certificate material. The current successful local validation result is evidence that the generated XML can be signed, QR-generated, and locally validated in temp storage only. It is not invoice state.

Current confirmed local validation result from the prior controlled experiment:

- XSD: PASSED
- EN: PASSED
- KSA: PASSED
- QR: PASSED
- SIGNATURE: PASSED
- PIH: PASSED
- GLOBAL: PASSED

The signed XML body and QR payload were deleted from the temp directory and were not persisted.

## Promotion definition

Promotion means LedgerByte intentionally converts a signed XML artifact from a local execution artifact into persisted invoice state, with an immutable storage reference, validation evidence, audit log, and explicit separation from ZATCA submission. Promotion is not the same as SDK validation and is not the same as clearance/reporting.

A future promoted signed XML record would need at minimum:

- invoice id and tenant id
- signing certificate identity summary, not certificate body in ordinary API responses
- key custody mode and signing boundary summary
- signed XML object storage key or equivalent artifact reference
- signed XML artifact hash
- QR artifact status after signing
- validation result summary
- promoted by, promoted at, and source execution id
- idempotency key or config hash
- productionCompliance remaining false until all official requirements are complete

## What must never be promoted

- Any XML signed with SDK dummy/test material.
- Any signed XML generated without real ZATCA-issued certificate material.
- Any signed XML generated with raw or unmanaged production private key material.
- Any signed XML whose validation result is failed, partial, missing, or generated from stale invoice metadata.
- Any signed XML generated in a temp-only dry-run endpoint unless a separate future promotion endpoint explicitly validates and records it.

## Signed XML artifact lifecycle

1. Generate unsigned XML and hash-chain metadata locally.
2. Run temp-only SDK signing and QR generation, if explicitly enabled.
3. Run temp-only SDK validation of the signed XML.
4. Delete temp files by default.
5. Keep only sanitized validation summaries in API responses.
6. In a future phase, promote only after a separate approval and storage workflow exists.

## QR artifact lifecycle

QR must be regenerated after signing because Phase 2 QR depends on hash/signature/certificate material. Current basic QR and temp SDK QR output must not be treated as persisted Phase 2 QR state. A future promoted QR status should point to the signed artifact version it belongs to.

## Invoice hash lifecycle

Current local metadata stores the generated invoice hash used for local hash-chain work. Official submission payloads later require invoiceHash and invoice base64 values. Before promotion, LedgerByte must decide and test the exact source of the persisted submission hash for signed XML flows using official SDK output and official API request generation, without guessing.

## PIH chain lifecycle

PIH must continue to use invoice-specific previous hash setup during local validation. Promotion must not mutate EGS last hash or invoice metadata unless a future signed artifact promotion design explicitly defines the transition. Dummy signed XML cannot advance the production PIH chain.

## ICV lifecycle

ICV is assigned during local unsigned XML generation and must not be advanced by dry-run signing, dry-run validation, or promotion planning endpoints. A future promotion endpoint must be idempotent for an already generated invoice and must not create duplicate ICV values.

## Validation result lifecycle

Validation success is a precondition, not promotion. A future validation evidence record should store only summarized category results and sanitized messages unless signed artifact storage is approved separately.

## Clearance/reporting dependency

Clearance/reporting remains out of scope. The official API documents show later request payloads using UUID, invoiceHash, and base64 invoice. Promotion must be separate from submission, and submission must be separate from the clearance/reporting response.

## Storage recommendation

Do not store signed XML in relational text fields. Use object storage with tenant-scoped keys, immutable naming, encryption at rest, retention rules, access logs, and redacted API responses. Store metadata in the database, not large XML bodies or private key material.

## Audit log requirements

Future promotion must audit:

- actor id
- invoice id
- source unsigned metadata id
- signing material identity summary
- validation summary
- artifact hash
- object storage key
- previous and resulting artifact status
- explicit confirmation that no ZATCA submission was performed by promotion

Audit logs must never include private key PEM, certificate body, CSID token, OTP, signed XML body, QR payload body, or generated CSR body.

## Rollback and reversal constraints

Signed artifact promotion should be append-only. Do not mutate or delete the old artifact silently. If a future replacement is needed, create a superseding artifact record with reason, actor, and timestamp. Financial invoice reversal remains an accounting/document process and must not be conflated with signed XML artifact replacement.

## Idempotency rules

Future promotion must be idempotent by invoice id, unsigned XML hash, signing certificate identity, and signed XML artifact hash. Re-running the same promotion should return the existing artifact record, not create duplicates or advance ICV/hash state.

## Production blockers

- Real ZATCA certificate/CSID lifecycle is not implemented.
- Production key custody is not implemented.
- Signed XML persistence is not implemented.
- Phase 2 QR persistence is not implemented.
- Clearance/reporting is not implemented.
- PDF/A-3 is not implemented.
- Production compliance remains false.

## Staged implementation plan

1. Keep current local signed XML validation temp-only.
2. Add metadata-only promotion planning and readiness blockers. This phase is now implemented.
3. Design signed artifact schema and object storage retention without storing XML in relational text fields.
4. Add a disabled-by-default promotion draft endpoint that records metadata only from an already validated temp artifact.
5. Add real certificate/key custody integration in a separate phase.
6. Add clearance/reporting request generation after signed artifact storage is proven safe.
7. Add PDF/A-3 after signed XML and submission boundaries are stable.

## Current implementation status

- `GET /sales-invoices/:id/zatca/signed-xml-promotion-plan` returns a local-only, dry-run, no-mutation promotion plan.
- Invoice and settings readiness include a signed artifact promotion section.
- The UI shows signed artifact promotion as blocked and explains that local signed validation success is not promoted invoice state.
- No signed XML, QR payload, private key, certificate body, CSID token, OTP, generated CSR body, or production credential is returned or persisted.

## ZATCA signed artifact storage planning update (2026-05-16)

- Added metadata-only signed artifact storage planning in `docs/zatca/SIGNED_ARTIFACT_STORAGE_PLAN.md`.
- Added `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan` as a local-only, dry-run, no-mutation endpoint.
- Added signed artifact storage readiness blockers for missing metadata model, object-storage retention, immutable archive, intentionally blocked signed XML body persistence, intentionally blocked QR payload persistence, and missing clearance/reporting linkage.
- Chose no Prisma schema in this phase because no signed artifact state should be persisted until object-storage retention, immutable archive, audit, and redaction rules are approved.
- No signed XML body, QR payload body, SDK execution, CSID request, ZATCA network call, clearance/reporting, PDF/A-3, production credential, or production compliance claim is introduced.

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

## 2026-05-17 - ZATCA signed artifact object-storage probe

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

Storage implementation inspected:
- apps/api/src/storage/storage-configuration.service.ts
- apps/api/src/storage/storage-provider.ts
- apps/api/src/storage/storage.controller.ts
- apps/api/src/storage/storage.module.ts
- apps/api/src/attachments/attachment-storage.service.ts
- apps/api/src/attachments/attachment.module.ts
- apps/api/src/storage/storage.service.spec.ts
- apps/api/src/storage/storage.controller.spec.ts

Implemented behavior:
- Added `GET /zatca/signed-artifact-storage/probe-plan` for a read-only local probe plan. It returns object-storage configuration status, test prefix, planned test object key, and explicit blockers without uploading any object.
- Added `POST /zatca/signed-artifact-storage/probe` behind `ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED=false` by default. When disabled, it skips execution and writes/deletes nothing.
- When explicitly enabled in a local/test environment, the probe writes only this harmless text payload under `zatca/signed-artifacts/probe/<organizationId>/<timestamp>-probe.txt`: `LedgerByte ZATCA signed artifact storage probe only. No invoice data.`
- The enabled probe reads the harmless object back when supported, deletes it afterward, reports cleanup, and still keeps signed artifact body storage blocked.
- The probe does not upload signed XML, QR payload, invoice data, private keys, certificates, CSID tokens, OTPs, production credentials, or ZATCA submission payloads.
- The invoice signed artifact storage plan now reports `storageProbeRequired=true`, `latestStorageProbeStatus=NOT_RUN`, and includes the probe plan while body persistence remains blocked.
- The invoice ZATCA panel shows object-storage status and that the probe is disabled by default unless the env flag is enabled.

Safety boundary:
- No signed XML body persistence.
- No QR payload body persistence.
- No CSID requests.
- No ZATCA network calls.
- No clearance/reporting.
- No PDF/A-3.
- No production credentials.
- No production compliance claim.

Recommended next step:
- Add a future signed artifact retention and immutability design review before any endpoint can persist signed XML or QR payload bodies.
