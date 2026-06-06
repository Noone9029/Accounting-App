# ZATCA Key Custody And CSID Lifecycle Design

Date: 2026-06-06

Status: Design accepted for controlled beta readiness tracking. No onboarding execution is performed by this document.

## 2026-06-06 Sandbox CSID Preflight Guard Update

The next guard is now implemented in `SANDBOX_CSID_PREFLIGHT_GUARD.md`, with current metadata-only results in `SANDBOX_CSID_PREFLIGHT_RESULTS.md`.

Current preflight status: `PREFLIGHT_BLOCKED`. The guard found the repo-local planning references and code surfaces, but key custody, CSID response custody, sandbox adapter execution, OTP approval, compliance CSID request approval, and production signing remain blocked. It made no OTP request, no CSID request, no ZATCA network call, and exposed no private-key, certificate, CSID, token, auth-header, request, or response bodies.

Recommended next prompt: `ZATCA sandbox OTP and compliance CSID approval plan`.

## 1. Purpose And Scope

This document defines LedgerByte's ZATCA key custody, certificate/CSID lifecycle, and approval-gated sandbox onboarding design.

This is documentation and safe readiness planning only. It does not request OTPs, request compliance CSIDs, request production CSIDs, call ZATCA, generate production credentials, execute signing, persist signed XML, persist QR payloads, run clearance/reporting, implement PDF-A3, deploy, migrate, seed, reset, delete, send email, or change production/beta data.

The goal is to draw the vault map, not open the vault.

## 2. Current State

Repository reconciliation on 2026-06-06:

- Latest commit inspected before this design: `49bd2b00 Review ZATCA dummy signing QR gaps`.
- Required dummy-signing review, QR gap, local evidence, local guard, SDK readiness, compliance-map, roadmap, scorecard, audit, README, and handoff files were present.
- Existing related docs found: `SECURITY_KEY_MANAGEMENT_CHECKLIST.md`, `KEY_CUSTODY_AND_CSR_ONBOARDING_PLAN.md`, `ZATCA_KEY_CUSTODY_DECISION_DRAFT.md`, `SANDBOX_CSID_ONBOARDING_PLAN.md`, `SANDBOX_CSID_ONBOARDING_RUNBOOK.md`, `CSID_RESPONSE_CUSTODY_PLAN.md`, `CSID_SECRETS_PROVIDER_CONFIGURATION_PLAN.md`, `CSID_SECRETS_CUSTODY_BOUNDARY.md`, and `CSR_CSID_ONBOARDING_CHECKLIST.md`.
- Requested `CSR_ONBOARDING_PLAN.md`, `CSID_LIFECYCLE_PLAN.md`, `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`, `CSID_LIFECYCLE_CHECKLIST.md`, and `KEY_CUSTODY_DECISION_MATRIX.md` did not already exist.
- Existing CSR/CSID scripts/endpoints exist for local planning, local CSR generation gates, metadata-only custody records, mock/dry-run CSID planning, and disabled real adapters. No endpoint was executed in this design task.

Local dummy signing state:

- `docs/zatca/evidence/local-dummy-signing-execution-20260606.json` records a local SDK dummy-material pass for `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note`.
- That evidence proves only local SDK dummy-material sign/QR/validate processing for sanitized generated fixtures under Java 11.
- It does not prove production signing, production Phase 2 QR, CSID lifecycle, clearance/reporting, PDF-A3, signed artifact storage, repeatable SDK CI, ZATCA compliance, or legal/accounting readiness.

## 3. Official References Inspected

Only repo-local official references under `reference/` were inspected.

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/` path and filename metadata
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem` path and filename metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem` path and filename metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Reference findings used here:

- The SDK documents CSR generation, signing, QR generation, invoice request generation, hash generation, validation, non-production mode, and simulation mode.
- The SDK CSR template/examples define the CSR input keys LedgerByte already models or reviews: common name, serial number, organization identifier, organization unit name, organization name, country name, invoice type, location address, and industry business category.
- The SDK config points to local certificate and private-key paths. Those files are SDK dummy/test material for local processing and must never become tenant credential material.
- The compliance CSID document describes a CSR plus OTP based compliance CSID request and sensitive response material. This design does not copy request/response bodies.
- The onboarding document describes production CSID issuance after compliance prerequisites. This design does not request production credentials.
- The renewal document describes certificate renewal based on CSR/OTP-style renewal. This design does not perform renewal.
- The security features standard identifies cryptographic stamp lifecycle areas including issuance/management, renewal, revocation, CSID profile, stamp structure, previous invoice hash, and QR.
- The XML standard and data dictionary tie QR, previous invoice hash, cryptographic stamp, signing, clearance, and reporting concerns to signed invoice artifacts and future API flows.

## 4. Existing LedgerByte ZATCA Key, Certificate, And CSID Model

Existing code/data surfaces inspected for design:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/zatca/zatca.service.ts`
- `apps/api/src/zatca/zatca.controller.ts`
- `apps/api/src/zatca/zatca.config.ts`
- `apps/api/src/zatca/adapters/*`
- `apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts`
- `apps/api/scripts/zatca-csr-dry-run.ts`
- `apps/api/scripts/zatca-csr-local-generate.ts`
- `apps/api/scripts/zatca-compliance-csid-plan.ts`
- `apps/api/scripts/zatca-local-signing-dry-run.ts`
- `apps/api/scripts/zatca-local-signed-xml-validate.ts`
- `packages/shared/src/zatca-readiness.ts`
- `apps/web/src/lib/zatca.ts`
- `apps/web/src/app/(app)/settings/zatca/page.tsx`

Current model findings:

- `ZatcaOrganizationProfile` stores non-secret seller/profile readiness metadata.
- `ZatcaEgsUnit` stores EGS state, CSR field metadata, hash-chain metadata, and legacy body-capable fields: `csrPem`, `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem`.
- `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` are not production-acceptable custody fields. They must be treated as local/mock/development-only until deprecated or replaced.
- `ZatcaCsrConfigReview` stores sanitized CSR config previews, config hash, official key order, missing/review fields, and approval/revocation metadata.
- `ZatcaComplianceCsidCustodyRecord` stores metadata-only custody records: request ids, certificate request ids, boolean presence flags, storage mode placeholders, expiry/renewal metadata, status, approver/revoker metadata, and productionCompliance=false.
- `ZatcaSignedArtifactDraft`, storage policy approval, and storage control evidence models are metadata-only readiness surfaces and keep body persistence blocked.
- Current readiness sections already surface key custody, CSR, compliance CSID onboarding, compliance CSID custody, signing, signed artifact storage, Phase 2 QR, and PDF-A3 blockers.

Existing execution findings:

- Real ZATCA network is disabled unless adapter mode, network flag, and base URL are all configured.
- `HttpZatcaSandboxAdapter.requestComplianceCsid` currently throws before sending any HTTP request.
- `MockZatcaOnboardingAdapter` can exercise local mock CSID contract behavior only.
- The legacy `requestComplianceCsid` service path can persist `complianceCsidPem` when an onboarding adapter succeeds. It must remain unavailable for real sandbox use until body custody is replaced.
- `requestProductionCsid` can persist `productionCsidPem` if an adapter succeeds, but current production/mock implementations are blocked or incomplete. Production CSID remains out of scope.
- Compliance CSID dry-run and custody-plan responses intentionally return no token body, no secret body, no certificate body, no private key, no OTP, no CSR body, no signed XML body, no QR payload body, and productionCompliance=false.

## 5. Key Custody Requirements

LedgerByte production key custody must satisfy these requirements before production signing can be enabled:

- Production private key material must not be stored in ordinary application database tables.
- Production private key material must not be returned by API, UI, logs, telemetry, audit diffs, exports, PDFs, screenshots, test output, or evidence files.
- Production signing should be performed by a KMS/HSM-backed signing boundary or equivalent external signing service that avoids private-key body disclosure to application code.
- Key references, certificate metadata, approval records, expiry, status, environment, EGS linkage, and audit metadata may be stored in LedgerByte tables.
- Rotation, revocation, renewal, decommissioning, incident response, and break-glass procedures must be designed before signing.
- Custody must be environment-specific. Local dummy SDK material must never be upgraded into sandbox or production tenant credentials.

## 6. Private Key Handling Policy

Must never be stored in normal DB tables:

- Production private key PEM/DER/body.
- Sandbox/private beta private key body unless a separately approved custody implementation uses a controlled secrets/KMS boundary.
- SDK dummy private-key body as tenant credential material.
- Private key body in evidence, audit logs, submission logs, generated documents, attachments, or support exports.

May be stored as metadata only:

- Key custody provider type.
- Redacted provider reference.
- Key alias or key id only when redacted and approved for exposure.
- Key status, creation date, rotation date, revocation date, decommission date.
- Environment, EGS unit id, certificate request id, certificate serial/thumbprint, issue/expiry dates.
- Boolean flags such as `privateKeyBodyExposed=false`.

Must be delegated later:

- Production signing.
- Private-key generation/import.
- Private-key storage.
- Private-key rotation/revocation.
- Any operation requiring private-key body access.

Recommended production direction: KMS-backed signing, HSM, or external signing service. Secrets manager is acceptable only as a possible controlled interim for sandbox/non-production token or certificate custody, not as the final production private-key signing boundary unless reviewed and explicitly accepted.

## 7. Certificate Handling Policy

Compliance certificate:

- Used only in the compliance/sandbox lifecycle until compliance checks are completed.
- Does not prove production signing readiness.
- Sensitive body must not be returned or persisted in ordinary tables.
- Safe metadata may include certificate request id, request id, presence flags, issue/expiry metadata, status, renewalRequired, revocation status, and custody mode.

Production certificate:

- Must be requested only after compliance CSID and compliance checks are approved.
- Must be linked to an approved production key custody path.
- Must not be stored as raw PEM/body in ordinary application tables.
- Must not enable signing until production signing, signed artifact storage, clearance/reporting, PDF-A3, operations, and reviews are separately approved.

Expiry, renewal, revocation, rotation:

- Store expiry metadata and renewal windows before relying on any certificate.
- Renewal must create a new metadata chain and preserve old metadata for audit.
- Revocation must immediately block signing and submission for affected EGS units.
- Rotation must define cutover, previous certificate retention as metadata, and historical invoice verification behavior.

## 8. CSID Lifecycle

CSR preparation:

- Complete official CSR fields from seller/EGS metadata.
- Generate sanitized CSR preview and require `APPROVED` CSR config review.
- Local CSR generation must use a temp-only path and must not print private key body content.

OTP requirement:

- OTP is obtained out-of-band by an authorized operator through the official ZATCA process.
- LedgerByte must not request OTPs in this design phase.
- OTP must never be stored, logged, returned, or copied into evidence.

Compliance CSID request:

- Future sandbox-only execution requires approved CSR review, approved custody provider, approved operator, exact sandbox-only approval phrase, disabled-by-default execution flag, and redaction evidence.
- Response body material must be captured only by approved custody. Application responses may store metadata-only presence flags and safe ids.

Compliance checks:

- Compliance checks must wait for signed XML with controlled certificate/key custody.
- Checks must not store request/response bodies in ordinary logs or evidence.

Production CSID request:

- Blocked until compliance CSID, compliance checks, key custody, legal/accounting/ZATCA specialist review, and production operations approval are complete.
- Production CSID response material must be handled only by the production custody boundary.

Renewal:

- Requires expiry metadata, renewal approval, new CSR or official renewal inputs as verified from official docs, OTP handling approval, and safe credential rotation.

Revocation/decommissioning:

- Requires an incident/revocation workflow that blocks signing/submission, records approver and timestamp metadata, preserves historical evidence metadata, and prevents body leakage.

## 9. Environment Separation

Local:

- May use SDK dummy/test material only for approved temp-only local experiments.
- May store metadata-only evidence.
- Must not use real CSID material or production credentials.

Test/user-testing:

- May show readiness blockers and design metadata.
- Must not call ZATCA or request OTP/CSID unless a future explicit sandbox preflight gate approves it.

Sandbox/simulation:

- May be used only after sandbox OTP capture, custody, operator, and no-body evidence policies are approved.
- Sandbox success is not production compliance.

Paid private beta:

- Must keep production signing disabled unless production custody and production CSID gates are complete.
- May show readiness metadata and blockers only.

Production:

- Requires KMS/HSM/external signing custody, production CSID lifecycle approval, official reviews, signed artifact storage, clearance/reporting, PDF-A3, error/retry queue, monitoring, incident response, and legal/accounting sign-off.

## 10. Evidence Policy

Allowed metadata-only fields:

- Run id, timestamp, environment label, SDK version, Java version, fixture id, status, safe code summaries, request id, certificate request id, certificate serial/thumbprint, issue/expiry dates, storage mode, redacted provider reference, approver id/name/email, approval timestamp, blocker list, and boolean redaction flags.

Forbidden body/secret fields:

- XML bodies, signed XML bodies, QR payload bodies, private keys, certificate bodies, CSR bodies, OTPs, CSID secret material, binary security tokens, auth headers, bearer/basic credentials, request bodies, response bodies, customer/vendor payload bodies, and attachment bodies.

Required redaction booleans:

- `xmlBodyExposed=false`
- `signedXmlBodyExposed=false`
- `qrPayloadBodyExposed=false`
- `privateKeyBodyExposed=false`
- `certificateBodyExposed=false`
- `otpExposed=false`
- `csidSecretExposed=false`
- `tokenBodyExposed=false`
- `requestBodyExposed=false`
- `responseBodyExposed=false`
- `customerVendorPayloadExposed=false`
- `attachmentBodyExposed=false`
- `evidencePolicy=metadata-only`

## 11. Audit Policy

Events to record as metadata only:

- CSR config review created, approved, revoked, superseded.
- CSR local generation gate planned or executed locally.
- Sandbox OTP capture approved for a future run, without storing OTP value.
- Compliance CSID request gate approved.
- Compliance CSID metadata record created/revoked.
- Custody provider configuration reviewed/approved/revoked.
- Production CSID gate approved/rejected.
- Production signing enabled/disabled.
- Certificate renewal scheduled/completed/revoked.
- Key rotation/revocation/decommissioning.
- Incident response and emergency signing disablement.

Sensitive event redaction:

- Audit logs must store safe metadata and status transitions only.
- Audit logs must not include OTP, CSR body, private-key body, certificate body, token, secret, signed XML body, QR payload body, auth headers, request body, response body, or customer/vendor payload body.

External calls become allowed only after:

- Explicit sandbox/production gate approval.
- Approved custody provider.
- Approved operator.
- Environment-specific runbook.
- Redaction tests.
- No-body evidence format.
- Dedicated confirmation that the call is allowed for that exact environment.

## 12. Approval Gates

CSR dry-run:

- Requires complete CSR fields, sanitized preview, approved review hash, local-only flag, no-network flag, and no private-key body output.

Sandbox OTP capture:

- Requires operator approval, official portal/process confirmation, redaction checklist, no-storage policy, and exact scope statement. This task did not request OTP.

Compliance CSID request:

- Requires approved CSR review, approved custody provider, sandbox-only execution flag, OTP operator approval, network endpoint approval, request/response redaction, no body logging, and rollback plan.

Compliance invoice checks:

- Require signed XML produced with approved non-production custody, metadata-only artifact evidence, no production claim, and official validation plan.

Production CSID request:

- Requires completed sandbox compliance lifecycle, compliance checks, production custody approval, legal/accounting/ZATCA specialist review, production endpoint approval, incident/revocation plan, and explicit production approval.

Production signing enablement:

- Requires production CSID, approved production key custody, signed artifact storage, clearance/reporting design, PDF-A3 design where applicable, error/retry queue, monitoring, support runbook, and final production readiness sign-off.

## 13. Required Future Data Model Or Secrets-Store Changes

Future schema/custody changes should:

- Deprecate or quarantine `ZatcaEgsUnit.privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` for production use.
- Add key/certificate metadata models for environment, EGS, provider, redacted reference, issue date, expiry date, serial/thumbprint, renewal status, revocation status, and approver metadata.
- Extend `ZatcaComplianceCsidCustodyRecord` or add production CSID custody records for production-specific lifecycle metadata.
- Store provider references, not body material.
- Add explicit `productionSigningEnabled=false` default gates.
- Keep body storage disabled by default even if metadata records are approved.

Future secrets/custody store changes should:

- Implement a real secrets-manager/KMS provider for sandbox token/secret/certificate handling only after approval.
- Implement KMS/HSM/external signing for production private keys.
- Add provider audit, rotation, revoke, backup/restore, access review, and incident procedures.

## 14. Required Future APIs And Endpoints

Future APIs should be disabled by default and metadata-first:

- Read-only key custody design/readiness endpoint.
- Custody provider approval endpoint.
- Sandbox OTP preflight endpoint that never stores/returns OTP.
- Compliance CSID request endpoint guarded by custody and approval.
- Compliance invoice check endpoint after signing/custody.
- Production CSID request endpoint after production approval.
- Certificate renewal/revocation endpoints.
- Production signing enablement endpoint with dual control.
- Incident disable-signing endpoint.

All future endpoints must reject body fields for private keys, OTPs, CSID secrets, tokens, certificate bodies, signed XML bodies, QR payload bodies, and request/response bodies unless a later secure artifact body-storage phase explicitly owns that storage type.

## 15. Required Future UI And Readiness Fields

Future UI/readiness should expose:

- `keyCustodyDesignStatus=DOCUMENTED`
- `csidLifecycleDesignStatus=DOCUMENTED`
- `productionKeyCustodyApproved=false`
- `sandboxOtpApproved=false`
- `complianceCsidRequestEnabled=false`
- `productionCsidRequestEnabled=false`
- `productionSigningEnabled=false`
- `certificateBodyExposed=false`
- `privateKeyBodyExposed=false`
- `evidencePolicy=metadata-only`
- Certificate expiry/renewal status.
- Custody provider readiness.
- Redacted approval and blocker history.

No UI should display or download private-key bodies, certificate bodies, OTPs, CSID tokens/secrets, CSR bodies, signed XML bodies, QR payload bodies, auth headers, or raw ZATCA payloads.

No code/readiness metadata change was made in this design task because existing readiness sections already expose key custody, CSID, signing, Phase 2 QR, and storage blockers. Adding a new response contract should be a focused follow-up with targeted API/web tests.

## 16. Failure And Rollback Behavior

Failures before external call:

- Do not call ZATCA.
- Return blocker metadata only.
- Do not create CSID response records.
- Do not alter EGS signing state.

Failures after future sandbox call:

- Store only safe metadata and redacted status.
- Do not persist response bodies unless approved custody captures them.
- Keep production signing disabled.
- Mark custody/onboarding state as blocked or failed.

Rollback:

- Disable execution flags.
- Revoke metadata approvals if needed.
- Revoke/disable custody references if a provider is involved.
- Preserve audit metadata.
- Never delete evidence needed for incident review unless legal/security policy approves a purge.

## 17. Incident And Revocation Behavior

Incident triggers:

- Suspected key exposure.
- Certificate/token/secret exposure.
- Wrong environment credential use.
- Unauthorized signing.
- ZATCA rejection pattern caused by credential/certificate mismatch.
- Operator error in OTP/CSID workflow.

Required response:

- Disable signing and external submissions for affected EGS units.
- Revoke or suspend metadata approval.
- Rotate/revoke provider references.
- Record incident metadata without secrets.
- Preserve safe evidence.
- Require post-incident review before re-enabling any signing or CSID path.

## 18. What Remains Blocked

- Production signing.
- Production Phase 2 QR proof.
- Sandbox OTP/CSID execution.
- Compliance CSID lifecycle completion.
- Production CSID lifecycle.
- Real signing credentials/certificate lifecycle.
- Clearance/reporting.
- PDF-A3.
- Retry/error queue.
- Production signed-artifact storage.
- KMS/HSM/external signing implementation.
- Legal/accounting/ZATCA specialist review.
- Repeatable SDK CI.
- Production compliance claim.

## 19. Recommended Implementation Sequence

1. Keep this design docs-only until reviewed.
2. Add a small read-only readiness metadata contract with targeted tests.
3. Completed: add `ZATCA sandbox CSID preflight guard` as a non-executing approval guard.
4. Replace legacy PEM-capable CSID persistence with metadata/custody-only paths for real sandbox use.
5. Approve and test a sandbox secrets/KMS custody provider with fake provider clients first.
6. Implement sandbox OTP preflight without storing OTP.
7. Implement sandbox compliance CSID request behind exact approval and disabled-by-default execution.
8. Capture metadata-only sandbox CSID evidence.
9. Add compliance invoice check planning after signed XML/custody readiness exists.
10. Design production CSID lifecycle separately.
11. Design production KMS/HSM/external signing separately.
12. Add signed artifact storage and clearance/reporting only after custody and signing are approved.

## 20. Recommended Next Prompt

`ZATCA sandbox OTP and compliance CSID approval plan`
