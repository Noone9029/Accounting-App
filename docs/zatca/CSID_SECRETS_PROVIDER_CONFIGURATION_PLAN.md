# ZATCA CSID secrets provider configuration plan

Date: 2026-05-18

## Official files inspected

- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`

## Source-bound facts

- The compliance CSID API returns sensitive response material such as `binarySecurityToken` and `secret`; examples also show certificate material and `requestID`.
- Compliance CSID material is used for compliance invoice validation, while production CSID material is separate and remains out of scope.
- Reporting and clearance use production certificate credentials and invoice payload fields such as `invoiceHash`, `uuid`, and base64 `invoice`.
- The security standards discuss cryptographic stamp identifiers, certificate lifecycle, issuance, renewal, revocation, and protection of private keys/certificates.
- The official references inspected here do not authorize storing token, secret, certificate, private key, OTP, CSR, signed XML, or QR payload bodies in this phase.

## Current disabled provider boundary

LedgerByte currently exposes a `ComplianceCsidSecretCustodyProvider` interface and a disabled provider implementation. The disabled provider reports readiness and rejects all store/revoke calls with sanitized errors. It does not call a real secrets manager, KMS, encrypted database facility, storage adapter, or ZATCA API.

## Provider configuration goals

The provider configuration planner is a non-executing local readiness layer. It reads configuration intent from environment variables and returns redacted booleans and summaries only. It does not enable secret body persistence, does not validate real provider credentials, does not test provider access, and does not claim production compliance.

## Supported future provider modes

- `FUTURE_SECRETS_MANAGER`: future custody through a secrets-manager service with redacted reference IDs and version IDs.
- `FUTURE_KMS`: future KMS-backed custody or envelope encryption with external key control.
- `FUTURE_ENCRYPTED_DB`: future encrypted database storage, still treated as a higher-risk fallback requiring explicit approval.

## Environment variable plan

- `ZATCA_CSID_CUSTODY_PROVIDER=disabled|secrets-manager|kms|encrypted-db`
- `ZATCA_CSID_CUSTODY_KMS_KEY_ID`
- `ZATCA_CSID_CUSTODY_SECRET_PREFIX`
- `ZATCA_CSID_CUSTODY_REGION`
- `ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED`
- `ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE`

All variables are read locally for planning only. `ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE` is ignored in this phase and cannot enable persistence.

## Configuration redaction plan

Public API, UI, script, and logs must never return raw provider identifiers that could function as credentials or reveal sensitive infrastructure. Key IDs, prefixes, and regions are summarized as redacted presence markers and lengths. Raw access keys, tokens, passwords, provider secrets, certificate bodies, private keys, OTPs, CSR bodies, signed XML, and QR payloads are not accepted or returned.

## Reference ID strategy

Future stored references should include only redacted provider type, reference ID, optional version ID, creation metadata, and `bodyReturned=false`. Reference IDs should be tenant scoped and non-enumerable. The current task adds planning only and no new body reference columns.

## Secret versioning strategy

Future token and secret custody should track provider version IDs where supported. Rotation should create new references rather than overwrite active ones, and old references should move through explicit revocation/supersession metadata. No versioned secret body is stored in this task.

## Certificate storage strategy

Certificate body custody remains blocked. Future options include secrets-manager storage, KMS-backed encrypted storage, or controlled certificate storage with strict access review. Certificate expiry and renewal metadata must be modeled before real use.

## Token and secret rotation plan

Rotation remains future work. It must account for compliance CSID renewal, production CSID separation, audit logging, reference supersession, and safe rollback. No automatic rotation or real provider integration is implemented now.

## Renewal relationship

Renewal APIs can produce new sensitive CSID material. Renewal handling must follow the same custody boundary as initial issuance. Renewal metadata remains incomplete and is a blocker.

## Access-control requirements

Only ZATCA management roles should configure or approve future custody. Read endpoints must remain sanitized. API/UI must not display or export token, secret, certificate, private key, OTP, CSR, signed XML, or QR bodies.

## Audit logging requirements

Future provider enablement, reference creation, revocation, rotation, and renewal must be audited with redacted metadata only. Audit payloads must not include provider credentials or secret bodies.

## Operational runbook

1. Keep provider disabled in all environments until reviewed.
2. Configure provider intent using redacted environment variables only.
3. Review provider configuration plan output.
4. Approve access-control, audit, backup, rotation, renewal, and disaster recovery controls.
5. Implement and test a real provider in sandbox only.
6. Add explicit body-storage approval gates in a later phase.

## Disaster recovery concerns

Future custody needs provider recovery, key recovery, version restore, audit-log retention, tenant isolation, and break-glass access review. These controls are not implemented in this phase.

## What must never be returned to API/UI

- `binarySecurityToken` body
- CSID `secret` body
- Certificate body
- Private key body
- OTP
- CSR body
- Provider credentials or access keys
- Signed XML body
- QR payload body
- Production credentials

## What remains blocked

- Real secrets-manager/KMS calls
- Token, secret, and certificate body persistence
- Real sandbox CSID HTTP execution
- Production CSID requests
- Clearance/reporting
- PDF/A-3
- Production credentials
- Production compliance claims

## Staged implementation plan

1. Provider configuration planner only, disabled by default.
2. Provider readiness and custody gate integration.
3. Legal/security review of provider configuration, access, audit, rotation, and DR controls.
4. Non-production provider adapter contract tests with mocked provider clients.
5. Real sandbox-only provider integration behind explicit gates.
6. Separate body-storage approval gate before any real CSID material persistence.

## ZATCA CSID secrets provider configuration plan - 2026-05-18

Official files inspected for this phase: `compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, the XML/security standards, the data dictionary, and the SDK readme/usage files under `reference/`.

LedgerByte now has a non-executing CSID custody provider configuration planner. It reads only planning environment variables for future `FUTURE_SECRETS_MANAGER`, `FUTURE_KMS`, and `FUTURE_ENCRYPTED_DB` modes, redacts key IDs/prefixes/regions, and keeps the runtime provider disabled.

The provider configuration endpoint and custody plan report `providerEnabled=false`, `bodyStorageAllowed=false`, `tokenStorageReady=false`, `secretStorageReady=false`, `certificateStorageReady=false`, and `productionCompliance=false`. `ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE` is intentionally ignored in this phase.

No real secrets-manager/KMS call, real ZATCA network call, real CSID request, token/secret/certificate/private-key/OTP/CSR/signed-XML/QR body persistence, clearance/reporting, PDF/A-3, production credential use, or production compliance claim is implemented.

Recommended next step: add mocked secrets-manager/KMS provider client contract tests that still never store real CSID material.

## ZATCA CSID mocked custody provider contracts update (2026-05-18)

Official files inspected for this update:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

Implemented scope:
- Added local TypeScript-only mocked secrets-manager and KMS client contracts for future compliance CSID custody tests.
- Added mocked provider skeletons that accept fake injected clients, return redacted references only, and report productionCompliance=false.
- Added redacted reference handling that never exposes full ARNs, URLs, UUIDs, secret paths, KMS key IDs, provider credentials, token bodies, secret bodies, or certificate bodies.
- Kept the runtime factory/default provider disabled; providerEnabled=false, bodyStorageAllowed=false, and realProviderImplementationReady=false.
- Updated provider readiness, provider configuration plan, smoke output, and ZATCA settings UI to show mocked provider contract availability without enabling real storage.

Safety guarantees:
- No real secrets-manager, KMS, cloud provider, database secret storage, or ZATCA network call is performed.
- No real CSID request, production CSID request, clearance/reporting, PDF/A-3, production credentials, signed XML body storage, or QR payload body storage is implemented.
- binarySecurityToken, secret, certificate body, private key, OTP, CSR body, signed XML, and QR payload bodies remain blocked from API/UI responses and persistence.
- productionCompliance remains false.

Recommended next step:
- Add a non-executing provider-reference audit and rotation plan before any real sandbox custody provider implementation.
