# ZATCA CSID Secrets Custody Boundary

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

The official compliance CSID API material shows the compliance CSID request as a CSR plus OTP flow and the response as request/certificate identifiers plus sensitive `binarySecurityToken` and `secret` material. The compliance invoice API uses the compliance certificate token/secret for authentication. Reporting and clearance use production certificate token/secret and remain separate from this phase. The security standards treat the private key as secret material and describe certificate issuance, renewal, revocation, and protection expectations. No official file inspected here approves LedgerByte storing raw token, secret, certificate, private key, OTP, CSR, signed XML, or QR payload bodies in this task.

## Custody boundary definition

The boundary separates safe metadata from future secret-body custody.

Metadata that can be represented locally:
- request id and certificate request id
- boolean flags that a token, secret, or certificate existed in a response
- redacted storage mode placeholders
- expiry-known boolean and future expiry date metadata
- renewal-required boolean
- status, audit actor ids, timestamps, and blocked reason text

Secret bodies that must not cross the current application boundary:
- `binarySecurityToken`
- CSID `secret`
- certificate body / PEM / base64 certificate content
- private key
- OTP
- CSR body
- signed XML body
- QR payload body
- production credentials

## Provider options

### Secrets manager

A future secrets manager provider should store token and secret bodies outside the application database and return only redacted references. The API/UI should never return the body.

### KMS envelope encryption

A future KMS-backed provider may envelope-encrypt sensitive values and store only ciphertext references and metadata through a controlled boundary. The current phase does not implement this.

### Encrypted database fields

Encrypted DB storage is still risky because application code, backups, operational exports, and logs can become secret exposure paths. It remains a future option only after explicit security review and approval.

### Certificate storage

Certificate body custody may use a secrets manager, KMS-backed store, encrypted DB, or tightly controlled object storage in a later phase. This phase stores no certificate body and returns no certificate body.

## Access control and audit requirements

- `zatca.view` may read readiness and metadata-only summaries.
- `zatca.manage` remains required for custody metadata record creation or revocation.
- Real future provider use must audit only redacted references and metadata.
- Logs must not include token, secret, certificate, private key, OTP, CSR, signed XML, QR payload, Authorization headers, or provider credentials.

## Rotation, renewal, and recovery requirements

- Renewal metadata must be modeled before real CSID persistence.
- Rotation must support superseding redacted references without exposing old bodies.
- Revocation must be reference-based and metadata-only in public responses.
- Disaster recovery must prove references can be restored without exporting raw secrets into logs, UI, or support tooling.

## Current implementation boundary

LedgerByte now exposes a disabled provider interface: `ComplianceCsidSecretCustodyProvider`. The default implementation is `DisabledComplianceCsidSecretCustodyProvider`.

Current readiness:
- provider: `DISABLED`
- enabled: `false`
- tokenStorageReady: `false`
- secretStorageReady: `false`
- certificateStorageReady: `false`
- kmsConfigured: `false`
- secretsManagerConfigured: `false`
- encryptedDbApproved: `false`
- productionCompliance: `false`

All store/revoke methods throw a sanitized disabled error and do not include secret input in the error message.

## What remains blocked

- real ZATCA network calls
- real compliance CSID requests
- production CSID requests
- token body persistence
- secret body persistence
- certificate body persistence
- private key persistence for production custody
- OTP or CSR body persistence
- signed XML or QR payload body persistence
- clearance/reporting
- PDF/A-3
- production credentials
- production compliance claims

## Staged implementation plan

1. Keep the disabled provider boundary as the default.
2. Review and approve a secrets-manager/KMS provider design.
3. Add redacted provider-reference metadata only, with no body output.
4. Add provider-specific integration tests using fakes only.
5. Add a separately gated sandbox execution path after OTP and response custody are approved.
6. Keep production CSID, clearance/reporting, PDF/A-3, and production compliance as separate blocked phases.

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
