# ZATCA Sandbox CSID Response Custody Dry-Run Planning

Date: 2026-06-08

Branch: `codex/zatca-sandbox-csid-response-custody-dry-run`

Starting main commit: `9d7c216af43ba935f12f3e36799270f01bc334a3 Merge PR #3: ZATCA sandbox CSID request schema planning`

## Summary

This lane adds a metadata-only sandbox CSID response custody dry-run planner and read-only API planning endpoint. It does not process a real CSID response body, persist secret material, call ZATCA, log in to the sandbox portal, request OTP/CSID values, create or send a real request body, generate or store keys, enable signing, enable clearance/reporting, enable PDF-A-3, or claim production compliance.

Sandbox portal reference only: `https://sandbox.zatca.gov.sa/IntegrationSandbox`

## Implemented

- `apps/api/src/zatca/zatca-sandbox-csid-response-custody-dry-run.ts`
  - Defines allowed metadata fields for future sandbox CSID response custody planning.
  - Rejects forbidden secret/body fields and obvious body-like values.
  - Returns a dry-run plan with `noNetwork: true`, `noRequestBodyCreated: true`, `noResponseBodyProcessed: true`, `noSecretMaterialPersisted: true`, and `productionCompliance: false`.
- `apps/api/src/zatca/zatca.service.ts`
  - Adds `getEgsUnitSandboxCsidResponseCustodyDryRunPlan`.
  - Reads only EGS/custody metadata and safe provider readiness metadata.
  - Adds readiness metadata for the response custody dry-run planner without enabling response processing.
- `apps/api/src/zatca/zatca.controller.ts`
  - Adds read-only route: `GET /zatca/egs-units/:id/sandbox-csid-response-custody-dry-run-plan`.
- Targeted API tests cover pure planner validation, service safety metadata, controller exposure, and blocked production planning.

## Allowed Metadata Fields

- `environment`
- `egsUnitId`
- `organizationId`
- `requestReferenceAlias`
- `custodyProviderType`
- `custodyReferenceAlias`
- `certificateRequestId`
- `hasBinarySecurityToken`
- `hasSecret`
- `hasCertificate`
- `certificateFingerprint`
- `certificateSerialNumber`
- `certificateIssuer`
- `certificateSubject`
- `certificateExpiresAt`
- `responseCustodyReadinessStatus`
- `blockers`
- `warnings`

## Forbidden Fields

- `otp`
- `privateKey`
- `privateKeyPem`
- `rawPrivateKey`
- `csrPem`
- `rawCsr`
- `csrBody`
- `rawCsid`
- `complianceCsidPem`
- `productionCsidPem`
- `certificate`
- `certificatePem`
- `certificateBody`
- `rawCertificate`
- `binarySecurityToken`
- `binarySecurityTokenBody`
- `secret`
- `secretBody`
- `token`
- `tokenBody`
- `requestBody`
- `responseBody`
- `providerPayload`
- `signedXml`
- `qrPayload`

## Safety Result

- Real OTP/CSID: not used or requested.
- Real ZATCA network: not called.
- Sandbox portal login: not attempted.
- Request body creation: not implemented.
- Response body processing: not implemented.
- Secret material persistence: not implemented.
- Binary security token, secret, certificate body, private key, CSR, signed XML, QR payload, request/response body, and provider payload values: rejected.
- Signing, clearance/reporting, PDF-A-3: still blocked.
- Production compliance: false.
- Migrations/deploys/provider env changes: not performed.

## Remaining Blockers

- Manual sandbox access and OTP handling approval.
- Real custody provider approval.
- KMS/HSM or managed-secret boundary.
- Sandbox CSID request execution approval.
- Real sandbox CSID response-body processing approval.
- Real sandbox CSID response custody approval.
- Legacy PEM/payload-capable fields.
- Signing and Phase 2 QR.
- Clearance/reporting.
- PDF-A-3.
- Production CSID lifecycle.
- Official/legal/accounting/ZATCA specialist review.

## Recommended Next Lane

`LedgerByte approve and merge ZATCA sandbox CSID response custody dry-run planning PR.`
