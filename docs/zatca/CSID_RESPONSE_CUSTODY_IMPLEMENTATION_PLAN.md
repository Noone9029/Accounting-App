# ZATCA CSID Response Custody Implementation Plan

## Purpose And Scope

This plan defines the custody implementation path that must exist before LedgerByte may process a real ZATCA sandbox compliance CSID response. It is planning and guard evidence only. It does not process a real CSID response, implement production custody, store secrets, request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, create request bodies, parse response bodies, write to the database, enable signing, enable clearance/reporting, generate QR payloads, or implement PDF-A3.

Metadata-only simulated custody tests may use synthetic placeholder strings only. Any future real custody path must avoid printing, returning, logging, or persisting body material outside an approved custody provider.

## Current State

- Current execution guard status remains blocked before request execution.
- `scripts/zatca-sandbox-csid-preflight.cjs` reports `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED` for the request guard phrase and `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED` for the execute flag.
- New response custody guard status is `CUSTODY_METADATA_SIMULATION_BLOCKED`.
- No OTP, CSID request, ZATCA network call, sandbox adapter execution, real response-body processing, DB connection, DB write, secret storage, certificate storage, token storage, signing, QR, clearance/reporting, or PDF-A3 action was performed.

## 2026-06-07 Sandbox Adapter Approval Follow-Up

Sandbox adapter execution approval planning is now documented in `SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, and `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`. The standalone guard is `scripts/zatca-sandbox-adapter-execution-approval.cjs`.

Observed adapter approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; the blocked execute-adapter shape reports `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. No sandbox adapter was executed, no request body was created, no response body was processed, no OTP/CSID/network/DB action occurred, and no env values or bodies were exposed. Recommended next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`.

## Official References Inspected

- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties`

The inspection was structural only. No example OTPs, CSID secrets, binary security tokens, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies were copied.

## Current LedgerByte Custody Model

LedgerByte already has metadata-only `ZatcaComplianceCsidCustodyRecord` support for future non-production custody planning. Safe metadata includes request identifiers, certificate request identifiers, boolean presence flags, storage mode placeholders, expiry-known flags, expiry timestamps, renewal flags, status, audit user IDs, and production-compliance false markers.

The existing `ComplianceCsidSecretCustodyProvider` boundary is present but disabled. Provider readiness reports token, secret, and certificate storage not ready. Body storage remains explicitly blocked. Mock provider contract classes are test-only and do not enable runtime storage.

Legacy raw PEM-capable fields still exist on `ZatcaEgsUnit`: `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem`. These fields must be treated as blockers for any real CSID response material.

## Expected Response Body Categories

Official references identify response handling categories structurally only:

- Certificate material.
- Binary/security token or equivalent sensitive auth material.
- Secret material.
- Request identifiers and certificate request identifiers.
- Expiry or validity metadata, including renewal implications.

The exact real response body must not be guessed here. Future implementation must verify field names and behavior against official references before processing real bodies.

## Never Store In Normal DB Tables

Normal application tables must not store:

- Binary/security token bodies.
- Secret bodies.
- Certificate PEM/body material from a real CSID response.
- Private-key bodies.
- OTP values.
- CSR bodies in custody records or evidence.
- Auth headers.
- Raw request bodies.
- Raw response bodies.
- Signed XML bodies.
- QR payload bodies.
- Production credentials.

## Metadata Allowed

The following may be stored as metadata only after approval:

- Request ID or certificate request ID.
- Boolean presence flags for token, secret, and certificate material.
- Storage mode enum values such as `NOT_STORED` or future provider reference modes.
- Redacted provider reference identifiers, never raw body material.
- Provider kind and provider readiness status.
- Expiry-known flag and expiry timestamp when derived without exposing certificate body.
- Renewal-required flag.
- Custody status, blocker reason, created/revoked metadata, and audit event IDs.
- Production-compliance false marker.

## Provider Boundary Requirements

Sandbox or non-production interim custody may use an approved secrets-manager style provider for token, secret, and controlled certificate references. Production direction must use KMS/HSM or an external signing/custody service for production key and credential handling.

Required provider behavior:

- No raw body return to app/API/UI/logs/evidence.
- No raw response body stored in Prisma application tables.
- Redacted reference IDs only.
- Provider configuration values represented by booleans or redacted references only.
- Rotation, renewal, revocation, backup, restore, and access review controls.
- Sanitized errors that do not include provider secrets or body material.

## Custody Approval Gates

Before real sandbox response handling:

1. Approve custody provider type and non-production scope.
2. Approve redacted reference format and version metadata.
3. Approve token, secret, and certificate body storage modes.
4. Approve audit event names and evidence fields.
5. Approve rollback behavior if provider storage fails.
6. Approve no-body logging and no-body API/UI responses.
7. Approve sandbox adapter execution separately.
8. Approve OTP capture and CSID request execution separately.

## Required Redaction Flags

Every future custody result must expose explicit flags:

- `realResponseBodyProcessed`
- `requestResponseBodyPrinted`
- `envValuesPrinted`
- `tokenBodyPersisted`
- `secretBodyPersisted`
- `certificateBodyPersisted`
- `privateKeyBodyPrinted`
- `metadataOnlyEvidence`
- `productionCompliance`

Safe guard values remain false for body handling and true for metadata-only evidence.

## Required Audit Events

Future audit events may record metadata-only transitions:

- Custody provider configuration reviewed.
- Metadata-only CSID custody record planned.
- Token reference stored by provider.
- Secret reference stored by provider.
- Certificate reference stored by provider.
- Custody failed and metadata rolled back.
- Custody reference revoked.
- Renewal metadata updated.

Audit logs must not include body material, request bodies, response bodies, OTPs, auth headers, private keys, tokens, secrets, certificate bodies, signed XML, or QR payload bodies.

## Failure Behavior

Future handling must fail closed:

- Reject a response if the provider is unavailable.
- Reject a response if any body would be logged.
- Reject a response if any body would be stored in normal DB tables.
- Reject a response if body storage is requested through env flags.
- Reject a response if provider output would return raw material to app code.
- Roll back metadata if custody storage fails.
- Keep execution guard blocked after any custody failure.

## Future Implementation Sequence

1. Keep current metadata-only guard and docs as the control boundary.
2. Define concrete provider contract tests using synthetic placeholder strings only.
3. Add a disabled-by-default provider adapter with no real cloud credentials.
4. Add metadata transaction design that rolls back on provider failure.
5. Add no-body redaction tests for logs, API responses, audit events, and evidence.
6. Add sandbox adapter execution approval plan without making a real request.
7. Only after approvals, implement real sandbox response parsing in a controlled no-body custody path.

## What Remains Blocked

- Real response body processing.
- DB writes for real response custody.
- Token, secret, or certificate body persistence.
- OTP capture.
- Sandbox compliance CSID request execution.
- Sandbox adapter execution.
- Production CSID lifecycle.
- Production signing and Phase 2 QR.
- Clearance/reporting.
- PDF-A3.
- Retry queue and signed artifact storage.
- Official/legal/accounting review.

## Recommended Next Prompt

Completed follow-up: `ZATCA sandbox adapter execution approval plan`

Completed follow-up: `ZATCA sandbox adapter mock-to-real boundary test plan`

Boundary artifacts: `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md` and `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`.

Boundary status: `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`. No OTP/CSID/network call, sandbox adapter execution, mock adapter execution, request body creation, response body processing, DB write, env value output, or secret/body exposure occurred.

`ZATCA sandbox adapter no-network contract tests`
