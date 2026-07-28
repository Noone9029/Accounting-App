# ARC-07B official sandbox contract matrix

Date: 2026-07-28
Scope: ARC-07B-06F authenticated official-contract import and metadata-only local preparation. This is not a sandbox execution authorization.

## Evidence register

The committed evidence is metadata only. It retains no PDF body, local path, raw OpenAPI document, request or response body, credential, header value, certificate, CSR, XML, QR payload, or OTP. The six API documents are authenticated Developer Portal Swagger/OAS **PDF exports**, not raw OpenAPI files.

| Source ID | Official document | Bytes | SHA-256 | Evidence class |
| --- | --- | ---: | --- | --- |
| `zatca-clearance-api` | `clearance.pdf` | 1,412,311 | `30cc26348758ddd3fd2fe854687433314ffa7366b447e223107d45863b319643` | Authenticated Swagger PDF export |
| `zatca-compliance-csid-api` | `compliance_csid.pdf` | 374,182 | `f27cc9119f8db32dbbc512731ec82971affa86ef31b8f5881989fa0ecdc97325` | Authenticated Swagger PDF export |
| `zatca-compliance-invoice-api` | `compliance_invoice.pdf` | 597,460 | `8f7b779057317f0f3408d6b82f80647570f750e10c6d8458f9efb6eb4fbbc93a` | Authenticated Swagger PDF export |
| `zatca-detailed-guideline` | `E-Invoicing_Detailed__Guideline.pdf` | 1,095,156 | `55b7dfb481b8732078ee8fa6264a42a7293ac555b0682a8458a75f634e4ff2e4` | Official ZATCA PDF |
| `zatca-detailed-technical-guidelines` | `E-invoicing_Detailed_Technical_Guidelines.pdf` | 1,936,397 | `56244c72702e9a5aab7f9ba9900d2b15d91e6cfc05c118cf44c62558df941484` | Official ZATCA PDF |
| `zatca-fatoora-portal-manual` | `Fatoora_Portal_User_Manual_English.pdf` | 7,045,690 | `6fec08254aac8f3aab2247f96bd7b4ac2dc3558fb48c2a4b598dde564ad14c52` | Official ZATCA PDF |
| `zatca-onboarding-api` | `onboarding.pdf` | 402,177 | `9570f3a54ada2ef70fba20311565661234a39d9ba348fbed8bf80e267074ecf8` | Authenticated Swagger PDF export |
| `zatca-renewal-api` | `renewal.pdf` | 507,791 | `a194a61e0f6d85a5b4ef01312b91d98a2ebde400745fcde117baf830bbb7c88a` | Authenticated Swagger PDF export |
| `zatca-reporting-api` | `reporting.pdf` | 680,569 | `dc497e1039100ce0038ae15928a1b9bb57b61c161234b2ac07b48421ce82c532` | Authenticated Swagger PDF export |
| `zatca-developer-portal-manual-v3` | `User_Manual_Developer_Portal_Manual_Version_3.pdf` | 13,251,887 | `f74c94302e33b68568545e2e320f73691f47800b6a4374bf784fb663d2743104` | Official ZATCA PDF |

The machine-readable register, source-page citations, and contract leaves are in [official-sandbox-contracts.json](evidence/arc-07b/official-sandbox-contracts.json). Its schema is version 2. The canonical digest, computed with only the top-level `contractSha256` excluded from the digest input, is `bf564b600700f783515b9e4af46a31f428e27a5e6b8bdae5cf07156ed77e6950`.

## Environment and operation allowlist

The current lane is the FATOORA Simulation environment only. The separate Developer Portal integration sandbox is evidence input, not an interchangeable execution target:

| Item | Approved value | Evidence result |
| --- | --- | --- |
| Simulation base | `https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |
| Compliance CSID | `POST /compliance` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |
| Compliance invoice | `POST /compliance/invoices` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |
| Simulation production CSID | `POST /production/csids` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |
| Renewal | `PATCH /production/csids` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |
| Reporting | `POST /invoices/reporting/single` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |
| Clearance | `POST /invoices/clearance/single` | `CONFIRMED_AUTHENTICATED_OFFICIAL` |

The production base `/e-invoicing/core` and the authenticated export base `/e-invoicing/developer-portal` are recorded to prevent substitution. They are not interchangeable with `/e-invoicing/simulation`, and both are prohibited for this lane.

## Authentication, headers, and safe field names

| Contract item | Confirmed contract |
| --- | --- |
| Basic authentication | The compliance credential's `binarySecurityToken` and `secret` authenticate compliance-invoice and Simulation production-CSID operations. The Simulation production credential's `binarySecurityToken` and `secret` authenticate reporting and clearance. |
| Version | `Accept-Version: V2`. |
| Language | Optional `Accept-Language`; allowed values `en` and `ar`, default `en`. |
| Clearance flag | Required `Clearance-Status`; `0` means disabled and `1` means enabled. |
| Media type | JSON requests and responses use `application/json`. |
| Compliance CSID request/response | Request field `csr`; safe response field names `requestID`, `dispositionMessage`, `binarySecurityToken`, and `secret`. No values are retained. |
| Compliance invoice request | `invoiceHash`, `uuid`, `invoice`. |
| Production CSID request/response | Request field `compliance_request_id`; the same four safe certificate-response field names. |
| Renewal request/context | Request field `csr`, OTP, and current-CSID credential context; the same safe certificate-response field names. |
| Reporting and clearance request | `invoiceHash`, `uuid`, `invoice`. |
| Invoice response groups | Compliance validation fields plus reporting/clearance status groups; reporting uses `validationResults` and `reportingStatus`; clearance uses `validationResults`, `clearanceStatus`, and `clearedInvoice`. |

Only field names are retained. Examples and bodies from the authenticated exports are deliberately excluded.

## Status and routing contract

| Operation | Confirmed statuses | Required handling |
| --- | --- | --- |
| Compliance CSID | `200`, `400`, `406`, `500` | Invalid request or CSR/OTP is a correction path; `406` requires correcting the missing or unsupported `Accept-Version: V2`; do not retry blindly. |
| Compliance invoice | `200`, `400`, `401`, `406`, `500` | Correct request, authentication, or the `Accept-Version: V2` header before another attempt. |
| Production CSID | `200`, `400`, `401`, `406`, `500` | Correct request, authentication, or the `Accept-Version: V2` header before another attempt. |
| Renewal | `200`, `400`, `401`, `406`, `428`, `500` | Correct request, OTP, current-CSID context, authentication, or the API-version header before another attempt. The authenticated export unusually documents `428` as a certificate-issuance response; LedgerByte must type-check it and place any certificate into custody, never treat it as a generic retry or implicit success. |
| Reporting | `200`, `202`, `400`, `401`, `406`, `409`, `500` | `406` requires correcting `Accept-Version: V2`. `409` means the invoice was already reported successfully; reconcile as a duplicate outcome. |
| Clearance | `200`, `202`, `208`, `303`, `400`, `401`, `500` | `208` means the invoice hash was previously submitted. `303` means clearance is disabled and requires an explicit call to reporting; it is never a generic redirect-following instruction. |

## Credential, OTP, CSR, and compliance progression

The confirmed progression is:

1. A human obtains a fresh FATOORA OTP.
2. `POST /compliance` exchanges the OTP and CSR for a compliance credential.
3. The compliance credential authenticates the required compliance-document validations.
4. Successful compliance permits issuance of a Simulation production credential.
5. The Simulation production credential authenticates standard-invoice clearance and simplified-invoice reporting.

The OTP is exactly six ASCII digits (`0` through `9`) and is valid for one hour. The local input boundary is non-echoing, one-shot, callback-scoped, never persisted, and accepts no argument, environment, file, or non-interactive OTP. That input mechanism is ready, but no OTP is present and no authorization is present.

The CSR contract pins:

- curve `secp256k1`;
- digest `SHA-256` and signature `ECDSA-SHA256`;
- certificate templates `PREZATCA-Code-Signing` for Simulation and `ZATCA-Code-Signing` for production;
- exactly these nine config fields: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.

The compliance matrix is:

| Functionality map | Required document validations |
| --- | --- |
| `1000` | Standard invoice, standard debit note, standard credit note |
| `0100` | Simplified invoice, simplified debit note, simplified credit note |
| `1100` | All six documents above |

## Retry, duplicate, and unpublished limits

- `429`, `500`, `503`, and `504` are resend classifications.
- `413` requires a smaller payload.
- `400` requires request correction; `401` requires authentication correction.
- Attempts must be bounded and use an immutable payload. An ambiguous transmission is `UNCERTAIN`, requires outcome reconciliation, and fails closed instead of blindly retrying.
- Clearance `208` and reporting `409` are duplicate outcomes, not permission for an unconditional resend.
- Clearance `303` is an explicit branch to reporting and must never be followed as a generic HTTP redirect.

The official evidence does not publish numeric rate limits, guarantee a `Retry-After` value, or publish a backoff formula. Those three leaves are recorded as `UNPUBLISHED` with `BLOCKED_AUTHENTICATED_CONTRACT_EVIDENCE`, but they are non-gating for contract completeness. Local execution must still use a bounded fail-closed policy.

## Authority boundary and current gate

Qoyod material and community-forum posts are non-normative only. They supply no host, method, path, header, authentication, field, status, retry, OTP, CSR, or compliance-matrix value in the committed contract.

ARC-07B-06F confirms the authenticated official contract and official OTP format without making a network call. It does not provide an OTP, certificate, credential, standalone approval, or production authorization. `otpAvailable` and `approvalPresent` remain `false`; execution remains disallowed.
