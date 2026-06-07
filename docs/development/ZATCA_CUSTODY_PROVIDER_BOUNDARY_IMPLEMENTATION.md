# ZATCA Custody Provider Boundary Implementation

Date: 2026-06-07

## Scope

Implemented the first safe ZATCA custody provider boundary for interface and disabled/mock/local-reference behavior only. This lane did not implement real custody, real secret storage, real ZATCA network calls, sandbox portal login, real OTP handling, real CSID handling, real private-key generation or storage, raw certificate or CSR storage, signing, clearance/reporting, PDF-A-3, production credentials, migrations, deploys, provider/environment changes, or production compliance.

LedgerByte remains controlled beta/user-testing only. Real ZATCA production compliance is not enabled.

## Repository State

- Branch inspected: `codex/zatca-custody-provider-boundary-preflight`
- Starting commit: `fe6642f360cf2940fa4d0c0c016978fea7e7659d Document ZATCA custody provider boundary preflight`
- Preflight reference: `docs/development/ZATCA_CUSTODY_PROVIDER_BOUNDARY_PREFLIGHT.md`
- `origin/main` inspected before implementation: `fd6dbff97e5c669a1c2cda1fc329fecdda5bb809`
- Regular worktree was clean before implementation.
- `graphify-out/` and `apps/graphify-out/` remained ignored and untracked.

## Files Changed

- `apps/api/src/zatca/custody/zatca-custody-provider-boundary.ts`
- `apps/api/src/zatca/custody/zatca-custody-provider-boundary.spec.ts`
- `apps/api/src/zatca/zatca.service.ts`
- `apps/api/src/zatca/compliance-csid-custody-provider.spec.ts`
- `docs/development/ZATCA_CUSTODY_PROVIDER_BOUNDARY_IMPLEMENTATION.md`

No Prisma schema or migration files were changed.

## Implemented Boundary

Added `ZatcaCustodyProviderBoundary` as a reference-only interface with safe methods:

- `storeSandboxCsidResponseMetadataOnly`
- `storeSecretMaterialReferenceOnly`
- `retrieveSigningHandleNotPrivateKey`
- `revokeReference`
- `rotateReference`
- `verifyReferenceHealth`

These methods are defined around metadata, references, handles, redacted identifiers, booleans, certificate metadata, lifecycle state, and timestamps only. They do not accept or return raw secret bodies.

## Disabled Provider Behavior

- `DisabledZatcaCustodyProviderBoundary` remains the runtime-safe default.
- `createZatcaCustodyProviderBoundary()` returns the disabled provider by default.
- Requesting `LOCAL_REFERENCE` without the explicit test-only factory switch still returns the disabled provider.
- Disabled provider methods throw sanitized `ZatcaCustodyProviderBoundaryDisabledError` messages that do not echo input material.
- Readiness reports `enabled=false`, `runtimeProvider=DISABLED`, `bodyStorageAllowed=false`, `networkCallsEnabled=false`, `signingEnabled=false`, `clearanceReportingEnabled=false`, `pdfA3Enabled=false`, and `productionCompliance=false`.

## Mock And Local-Reference Behavior

- `LocalReferenceZatcaCustodyProviderBoundary` is test/no-network only.
- It returns metadata-only references and handles with redacted reference ids.
- It records safe presence flags such as `hasToken`, `hasSecret`, and `hasCertificate`.
- It marks body and unsafe execution flags false, including `bodyReturned=false`, `secretBodyStored=false`, `tokenBodyStored=false`, `certificateBodyStored=false`, `privateKeyReturned=false`, `requestBodyStored=false`, `responseBodyStored=false`, `providerPayloadStored=false`, `networkCallsMade=false`, and `productionCompliance=false`.
- It does not call a real secrets manager, KMS, HSM, database, ZATCA endpoint, or signing service.
- Existing mocked secrets-manager/KMS CSID provider classes remain test/client-contract scaffolds only; they are not wired as runtime providers.

## API And Readiness Metadata

Existing ZATCA custody readiness/configuration responses now include safe reference-only boundary metadata:

- `referenceOnlyBoundary`
- `referenceOnlyBoundaryAvailable`
- `localReferenceProviderAvailableForTests`
- `legacyRawPemBlockers`

This metadata is read-only and does not enable custody. Runtime provider state remains disabled.

## Forbidden Data Classes

The new boundary rejects forbidden keys and value patterns for:

- OTP values.
- Raw private keys.
- Raw CSRs.
- Raw certificate bodies.
- Binary security token bodies.
- Secret bodies.
- Tokens and passwords.
- Signed XML bodies.
- QR payload bodies.
- Request bodies.
- Response bodies.
- Provider payload bodies.
- PDF bodies.
- Auth headers/cookies.
- Customer, vendor, bank account, or generated document bodies.

## Safe Metadata And Reference Classes

The boundary allows only safe metadata/reference classes:

- Provider type.
- Provider alias or reference id.
- Redacted reference id and version id.
- Reference alias.
- Environment.
- Lifecycle state.
- Certificate fingerprint, serial, issuer, subject, and expiry metadata.
- Certificate request id.
- Boolean presence flags.
- Status and status reason.
- Timestamps.
- `metadataOnly=true`.
- `productionCompliance=false`.

## Sandbox URL Handling

The sandbox portal URL remains a documented future access reference only:

`https://sandbox.zatca.gov.sa/IntegrationSandbox`

No portal access, credential entry, OTP capture, CSID request execution, request-body creation, response-body processing, or network integration occurred.

## Legacy Blockers Left In Place

The implementation intentionally leaves these blockers in place and exposes them through readiness metadata:

- `ZatcaEgsUnit.csrPem`
- `ZatcaEgsUnit.privateKeyPem`
- `ZatcaEgsUnit.complianceCsidPem`
- `ZatcaEgsUnit.productionCsidPem`
- `ZatcaSubmissionLog.requestPayloadBase64`
- `ZatcaSubmissionLog.responsePayloadBase64`

These fields must be quarantined/deprecated before any real sandbox response body can be processed.

## Tests Run

- `corepack pnpm --dir apps/api exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca-custody-provider-boundary`
- `corepack pnpm --dir apps/api exec jest --config jest.config.cjs --runInBand --testPathPatterns=compliance-csid-custody-provider`
- `corepack pnpm --dir apps/api exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca.*custody`

Additional final checks are recorded in the task summary after this document is committed.

## Safety Boundaries Preserved

- No migrations were run.
- No database mutation scripts, seed/reset/delete actions, or destructive cleanup were run.
- No deploys or provider/environment configuration changes were made.
- No ZATCA network calls were made.
- No sandbox portal login was attempted.
- No real OTP, CSID, private key, certificate, CSR, token, secret, request body, response body, signed XML, QR payload, PDF body, provider payload, production credential, customer/vendor data, bank account data, or email body was used.
- No signing, clearance/reporting, PDF-A-3, export/download/PDF generation, E2E, smoke, browser login/audit-writing flow, backup/restore, or production check was run.
- Graphify output was not staged or deleted.

## Remaining Blockers

- Real custody provider approval.
- KMS/HSM/managed-secret or equivalent signing boundary approval.
- Legacy raw PEM and request/response payload field quarantine.
- Sandbox CSID request body schema dry-run.
- Sandbox CSID response custody dry-run.
- Sandbox-only CSID request execution approval.
- Sandbox-only CSID request execution.
- Local signing with custodied dummy/sandbox references.
- Phase 2 QR sandbox validation.
- Clearance/reporting sandbox plan.
- PDF-A-3 sandbox archive plan.
- Production CSID lifecycle, production signing, production credentials, official/legal/accounting review, and production compliance remain blocked.

## Recommended Next Prompt

`LedgerByte verify ZATCA custody provider boundary evidence.`
