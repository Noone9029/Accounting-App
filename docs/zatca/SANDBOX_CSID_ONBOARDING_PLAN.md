# ZATCA sandbox compliance CSID onboarding plan

This document defines the safe planning boundary for future sandbox compliance CSID onboarding. It is not an implementation of a real CSID request, not a production onboarding flow, and not a production compliance claim.

## Official sources inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

## Official rules reflected in the planner

- The official SDK documents CSR generation with a CSR config properties file, private-key output path, and generated-CSR output path.
- The official CSR config template/examples define the CSR property keys used by LedgerByte's sanitized CSR config preview.
- The Compliance CSID API documentation shows an OTP header, `Accept-Version: V2`, and a JSON request body containing `csr`.
- The onboarding and invoice API documents show sensitive certificate/token values such as `binarySecurityToken` and `secret`; these must never be logged or returned in public API responses.
- The compliance invoice, reporting, and clearance API documents show future payload linkage to `uuid`, `invoiceHash`, and base64 invoice content. This task does not implement those APIs.
- The renewal API requires separate current-CSID/OTP handling and remains out of scope.

## Onboarding lifecycle

1. Capture official CSR config fields for a non-production EGS unit.
2. Create a sanitized CSR config preview in official key order.
3. Record an operator CSR config review and approve it locally.
4. Generate CSR material only through the disabled-by-default local CSR gate.
5. Obtain a sandbox OTP outside LedgerByte through the official channel.
6. In a later explicitly gated phase, submit a sandbox compliance CSID request.
7. Store any real token, secret, certificate, and request metadata only after a dedicated secret-custody design is approved.

## Request and response shape planning

- Planned headers are redacted:
  - `OTP: [REDACTED_OTP]`
  - `Accept-Version: V2`
  - optional language headers only as non-secret metadata.
- Planned body is redacted:
  - `csr: [REDACTED_CSR_BODY]`
- Sensitive response fields include:
  - `binarySecurityToken`
  - `secret`
  - `requestID`
  - certificate/certificate-like response bodies
  - error payloads that may echo request context

## Boundaries

- Local planning is not ZATCA compliance.
- Sandbox compliance CSID is not a production CSID.
- Production CSID onboarding remains blocked.
- No real request is made by default.
- `ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED=false` is the default execution gate.
- The current implementation adds planning and disabled dry-run behavior only; it does not implement the HTTP adapter.

## Redaction rules

Never return, log, or audit:

- private key PEM
- generated CSR body
- OTP
- certificate body
- binary security token
- CSID secret
- production credentials
- signed XML body
- QR payload body

## Audit and custody requirements before execution

- Sandbox OTP usage must be recorded without storing the OTP value.
- Compliance CSID response storage needs a dedicated secrets manager or equivalent custody model.
- Certificate issue/expiry, request ID, token rotation, renewal, revocation, and incident handling must be modelled before any production path.
- Public EGS/readiness responses should expose boolean/redacted status only.

## Failure and retry handling

- Missing OTP, invalid OTP, missing CSR, invalid CSR, unsupported version, and unauthorized responses are expected official failure classes.
- Retry behavior must be idempotent around EGS unit state and must not duplicate token/certificate records.
- No failure response may leak OTP, CSR body, token, secret, certificate body, or production credentials.

## Staged implementation plan

1. Keep the current sanitized request plan endpoint and script.
2. Add a sandbox-only adapter with explicit network flag and no production URL support.
3. Add OTP DTO validation that accepts OTP for one request only and never stores or logs it.
4. Add secret-custody metadata and redacted audit logging.
5. Add sandbox execution tests with mocked HTTP responses.
6. Only after sandbox CSID custody is safe, design compliance invoice checks.
7. Keep production CSID onboarding, clearance/reporting, PDF/A-3, and production compliance claims blocked until separate approved phases.
