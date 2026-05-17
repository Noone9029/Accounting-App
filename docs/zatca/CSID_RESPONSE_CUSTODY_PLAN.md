# ZATCA CSID Response Custody Plan

## Scope

This plan covers metadata-only custody planning for future ZATCA compliance CSID responses. It does not request a real CSID, call ZATCA, persist token bodies, persist secret bodies, persist certificate bodies, request production CSIDs, implement clearance/reporting, implement PDF/A-3, persist signed XML bodies, persist QR payload bodies, or claim production compliance.

## Official files inspected

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
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem

## Official-source findings

- The compliance CSID API response shape includes request identifiers plus sensitive credential material such as `binarySecurityToken` and `secret`.
- The onboarding documentation uses the compliance certificate token and secret as credentials for production CSID onboarding.
- Renewal returns certificate/token/secret-style material and is tied to certificate expiry handling.
- Compliance invoice validation, reporting, and clearance flows depend on authenticated certificate material and future invoice payloads such as UUID, invoice hash, and base64 invoice XML.
- The security standards identify the private key as secret and describe certificate lifecycle, renewal, and revocation concerns.
- The SDK bundled certificate/private key material is test material only and must not become tenant production credential storage.

## Compliance CSID response lifecycle

1. CSR is generated locally through an approved non-production path.
2. OTP is obtained externally from the sandbox/developer portal workflow.
3. A future disabled-by-default sandbox request may return request IDs, token, secret, and certificate material.
4. Token, secret, and certificate bodies must be handled by a custody layer before any persistence is considered.
5. Expiry and renewal metadata must be modeled without exposing sensitive bodies.
6. Compliance CSID remains separate from production CSID and does not prove production compliance.

## Sensitive fields

- `binarySecurityToken`
- `secret`
- certificate body
- private key body
- OTP
- CSR body
- production credentials
- signed XML body
- QR payload body

## Token custody requirements

The token body must never be returned through API or UI. Future persistence requires an explicit custody decision such as a secrets manager or KMS-backed encrypted storage. This task stores no token body and only reports boolean metadata.

## Secret custody requirements

The secret body must never be returned, logged, or stored in ordinary application metadata. Future handling should use a secrets manager or KMS/HSM-style custody pattern with strict access controls and audit logging.

## Certificate custody requirements

Certificate body storage is not implemented. Future handling must separate safe metadata from certificate body storage and must include expiry/renewal metadata. The certificate body must not be displayed in UI or ordinary logs.

## Certificate request ID lifecycle

`requestID` and certificate request IDs are safe metadata when redacted from surrounding sensitive payloads. They may be represented in planning responses, but they do not imply compliance, production readiness, or body persistence.

## Expiry and renewal considerations

Certificate expiry is currently unknown for real sandbox responses. Renewal metadata is not modeled. Renewal remains blocked until real response parsing and custody design are implemented. No retention duration or legal/accounting policy is guessed here.

## Sandbox vs production boundary

Compliance CSID is not production CSID. Mock CSID material is not real CSID material. Production CSID onboarding remains blocked and out of scope. No production credentials are used or stored.

## Mock response handling

Mock adapter output remains deterministic and local-only. Mock mode can report that token/secret/certificate material would require custody, but it must not persist or return bodies.

## Future real response handling

A future real sandbox adapter must remain disabled by default, require explicit sandbox mode and OTP input, redact all sensitive fields, and stop unless custody storage has been reviewed. The current real adapter still blocks before network execution.

## Redaction rules

Public responses and logs must not include token, secret, certificate body, private key, OTP, CSR body, signed XML body, QR payload body, authorization credentials, or production credentials.

## Audit logging rules

Audit logs may record safe metadata such as request IDs, boolean presence flags, custody mode, and status transitions. They must not include sensitive bodies.

## Storage options

- No persistence: current safe default.
- Encrypted DB fields: possible future option only with KMS-backed encryption and strict read controls.
- Secrets manager: recommended direction for token/secret custody.
- KMS/HSM-style custody: recommended for production-grade private key and credential handling.

## Recommended production approach

Use a secrets manager or KMS/HSM-style custody for token/secret/private-key material, store only safe metadata in application tables, and keep certificate body access tightly controlled. Production CSID requires a separate production onboarding design and is not enabled here.

## What must never be returned to API/UI

- `binarySecurityToken` body
- `secret` body
- certificate PEM/body
- private key PEM/body
- OTP
- CSR body in custody responses
- signed XML body
- QR payload body
- production credentials

## Current schema decision

No Prisma schema was added in this task. Custody planning is represented through a read-only endpoint and readiness section because no real sandbox response is requested or persisted. A metadata-only custody record can be designed later after custody policy approval.

## Staged implementation plan

1. Keep current custody plan endpoint read-only and no-mutation.
2. Add metadata-only custody records only after the custody fields are finalized.
3. Add secure secrets-manager/KMS integration behind a disabled-by-default gate.
4. Add real sandbox response parsing only after custody integration is reviewed.
5. Model expiry and renewal metadata.
6. Keep production CSID, clearance/reporting, PDF/A-3, signed XML body persistence, and QR payload persistence in separate future phases.

## Current status

- `GET /zatca/egs-units/:id/compliance-csid-custody-plan` is local-only, dry-run, no-network, no-CSID-request, no-mutation, and productionCompliance=false.
- ZATCA readiness includes `COMPLIANCE_CSID_CUSTODY` blockers.
- Compliance CSID dry-run responses include custody summary booleans while persisting no sensitive bodies.
