# ZATCA Sandbox CSID Execution Approval Gate

Date: 2026-06-08

Branch: `codex/zatca-sandbox-csid-execution-approval-gate`

Starting main commit: `8867c2c1259f3655b7dcfde8ef853a0799ec2404 Merge PR #4: ZATCA sandbox CSID response custody dry-run planning`

## Summary

This lane adds a metadata-only sandbox CSID execution approval gate. The gate can recognize the exact approval phrase as planning metadata, but it does not authorize or perform sandbox CSID execution.

Sandbox portal reference only: `https://sandbox.zatca.gov.sa/IntegrationSandbox`

## Implemented

- `apps/api/src/zatca/zatca-sandbox-csid-execution-approval-gate.ts`
  - Defines the exact approval phrase for this planning lane.
  - Recognizes the phrase as metadata only.
  - Rejects forbidden secret/body fields and obvious body-like values.
  - Always returns `executionAllowed: false`, `noNetwork: true`, `noOtpCaptured: true`, `noCsidRequested: true`, `noRequestBodyCreated: true`, `noResponseBodyProcessed: true`, and `productionCompliance: false`.
- `apps/api/src/zatca/zatca.service.ts`
  - Adds `getEgsUnitSandboxCsidExecutionApprovalPlan`.
  - Exposes safe request-schema, response-custody, custody-provider, and EGS metadata.
  - Adds readiness metadata for the execution approval gate without enabling execution.
- `apps/api/src/zatca/zatca.controller.ts`
  - Adds read-only route: `GET /zatca/egs-units/:id/sandbox-csid-execution-approval-plan`.
- Targeted tests cover phrase recognition, invalid/missing phrase handling, forbidden-field rejection, blocked production planning, service non-mutation, and controller exposure.

## Exact Approval Phrase

`I approve LedgerByte sandbox CSID execution approval gate planning only: recognize approval metadata but do not request OTP, do not request CSID, do not call ZATCA, do not create request bodies, do not process response bodies, do not store secrets, do not sign, do not clear/report, do not create PDF-A-3, and do not claim production compliance.`

Phrase recognition is metadata-only. Even with the exact phrase, execution remains blocked.

## Statuses

- `APPROVAL_REQUIRED`
- `APPROVAL_PHRASE_INVALID`
- `APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `BLOCKED_SANDBOX_ACCESS_NOT_CONFIRMED`
- `BLOCKED_OTP_CAPTURE_NOT_APPROVED`
- `BLOCKED_CUSTODY_PROVIDER_NOT_APPROVED`
- `BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED`
- `BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED`
- `BLOCKED_REAL_NETWORK_DISABLED`
- `BLOCKED_PRODUCTION_COMPLIANCE_FALSE`

## Forbidden Fields

- `otp`
- `otpValue`
- `csid`
- `complianceCsid`
- `productionCsid`
- `privateKey`
- `privateKeyPem`
- `rawPrivateKey`
- `csrPem`
- `rawCsr`
- `csrBody`
- `certificateBody`
- `rawCertificate`
- `binarySecurityToken`
- `binarySecurityTokenBody`
- `secret`
- `secretBody`
- `token`
- `requestBody`
- `responseBody`
- `providerPayload`
- `signedXml`
- `qrPayload`
- `password`
- `authHeader`
- `authorization`

## Safety Result

- Real OTP/CSID: not used, requested, stored, printed, or processed.
- Real ZATCA network: not called.
- Sandbox portal login: not attempted.
- Request body creation: not implemented.
- Response body processing: not implemented.
- Secret material persistence: not implemented.
- Private key, raw CSR, raw certificate, binary security token body, CSID secret body, token, signed XML, QR payload, request/response body, provider payload, password, and auth header values: rejected.
- Signing, clearance/reporting, PDF-A-3: still blocked.
- Production compliance: false.
- Migrations/deploys/provider env changes: not performed.

## Remaining Blockers

- Manual sandbox access approval.
- Manual sandbox OTP capture approval.
- Real custody provider approval.
- KMS/HSM or managed-secret boundary.
- Real sandbox CSID request execution approval.
- Real sandbox request-body creation approval.
- Real sandbox response-body processing approval.
- Real sandbox response custody approval.
- Legacy PEM/payload-capable fields.
- Signing and Phase 2 QR.
- Clearance/reporting.
- PDF-A-3.
- Production CSID lifecycle.
- Official/legal/accounting/ZATCA specialist review.

## Recommended Next Lane

`LedgerByte approve and merge ZATCA sandbox CSID execution approval gate PR.`
