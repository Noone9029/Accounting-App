# ZATCA Sandbox CSID Request Schema Planning

Date: 2026-06-07

Branch: `codex/zatca-sandbox-csid-request-schema`

Starting main commit: `8fc065b31370ad8dda7a28c4f850e2a282a863f2 Merge PR #2: ZATCA custody provider boundary`

## Summary

This lane adds a metadata-only sandbox CSID request schema planner and read-only API planning endpoint. It does not create a real request body, process a real response body, call ZATCA, request OTP/CSID values, generate or store keys, enable signing, enable clearance/reporting, enable PDF-A-3, or claim production compliance.

Sandbox portal reference only: `https://sandbox.zatca.gov.sa/IntegrationSandbox`

## Implemented

- `apps/api/src/zatca/zatca-sandbox-csid-request-schema.ts`
  - Defines allowed metadata fields for future sandbox CSID request planning.
  - Rejects forbidden secret/body fields and obvious body-like values.
  - Returns a dry-run plan with `noNetwork: true`, `noRequestBodyCreated: true`, `noResponseBodyProcessed: true`, and `productionCompliance: false`.
- `apps/api/src/zatca/zatca.service.ts`
  - Adds `getEgsUnitSandboxCsidRequestSchemaPlan`.
  - Adds readiness metadata for the schema planner without enabling execution.
- `apps/api/src/zatca/zatca.controller.ts`
  - Adds read-only route: `GET /zatca/egs-units/:id/sandbox-csid-request-schema-plan`.
- Targeted API tests cover pure planner validation, service safety metadata, controller exposure, and blocked production planning.

## Allowed Metadata Fields

- `environment`
- `organizationId`
- `egsUnitId`
- `csrReferenceAlias`
- `csrMetadataReference`
- `certificateRequestId`
- `otpRequired`
- `custodyProviderType`
- `custodyReferenceAlias`
- `requestReadinessStatus`
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
- `certificate`
- `certificatePem`
- `rawCertificate`
- `certificateBody`
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
- Request body creation: not implemented.
- Response body processing: not implemented.
- Private keys, raw CSRs, raw certificates, tokens, secrets, signed XML, QR payloads, and provider payloads: rejected.
- Signing, clearance/reporting, PDF-A-3: still blocked.
- Production compliance: false.
- Migrations/deploys/provider env changes: not performed.

## Remaining Blockers

- Manual sandbox access and OTP handling approval.
- Real custody provider approval.
- KMS/HSM or managed-secret boundary.
- Sandbox CSID request execution approval.
- Sandbox CSID response custody dry-run and response-body handling approval.
- Legacy PEM/payload-capable fields.
- Signing and Phase 2 QR.
- Clearance/reporting.
- PDF-A-3.
- Production CSID lifecycle.
- Official/legal/accounting/ZATCA specialist review.

## Recommended Next Lane

`LedgerByte approve and merge ZATCA sandbox CSID request schema planning PR.`
