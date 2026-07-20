# ARC-07B official sandbox contract matrix

Date: 2026-07-20
Scope: public official-source refresh and local-only preparation. This is not a sandbox execution authorization.

## Source register

| Official source | Page/version metadata | Retrieved | SHA-256 of retrieved UTF-8 page | Environment | Decision supported |
| --- | --- | --- | --- | --- | --- |
| [E-Invoice specifications](https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx) | Public developer page; linked XML Implementation Standard and Data Dictionary | 2026-07-20 | `73B60BE328A690CA052A261BAC16DFC937AE969BBCB70785216A8B9F9FC8325C` | Local implementation and future sandbox preparation | LedgerByte must use the published XML/data-dictionary contract for invoice structure, PIH, ICV, and QR decisions. |
| [Download SDK](https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx) | Public developer page; current local authorized reference remains SDK 238-R3.4.8 | 2026-07-20 | `64DC2AB82ACB01E00DC8E1954CCFC851258CF7DF3A78528DDAD69E8B370E680C` | Local-only structural/hash oracle | The SDK remains an offline oracle; no SDK file or licensed binary is committed. |
| [Simplified technical guide](https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/Simplified-technical-guide.aspx) | Public developer page | 2026-07-20 | `086C93770A3E67BC265AC019B06E60BCA28FD8EF2C974DB7F633246B1066F153` | Simplified invoice preparation | Simplified reporting routing and QR rules require current official confirmation before external execution. |
| XML Implementation Standard (linked by the specifications page) | Linked official document; body not committed | 2026-07-20 | URL identity captured by the specifications page | XML/cryptographic local conformance | ARC-07A XML/XAdES work remains governed by the current official standard. |
| E-Invoice Data Dictionary (linked by the specifications page) | Linked official spreadsheet; body not committed | 2026-07-20 | URL identity captured by the specifications page | Field-level local conformance | PIH, ICV, QR, and invoice-field decisions must remain source-backed. |

Superseded or non-normative material: legacy repository endpoint scaffolding, examples, and historical runbooks. They may inform a local adapter shape but must not supply an official host, credential, method, path, or API-version claim.

## External sandbox contract

| Contract item | Current official evidence | ARC-07B result |
| --- | --- | --- |
| Official sandbox host | Not published in the currently retrieved public pages | `BLOCKED_OFFICIAL_HOST_UNCONFIRMED` |
| Allowed HTTPS paths and methods | Not published in the currently retrieved public pages | `BLOCKED_OFFICIAL_PATH_UNCONFIRMED` |
| API-version headers | Not published in the currently retrieved public pages | `BLOCKED_OFFICIAL_API_VERSION_UNCONFIRMED` |
| Authentication construction | Not published in the currently retrieved public pages | `BLOCKED_OFFICIAL_AUTH_UNCONFIRMED` |
| Request/response media types and limits | Not published in the currently retrieved public pages | `BLOCKED_OFFICIAL_CONTENT_CONTRACT_UNCONFIRMED` |
| Timeout, retry, and idempotency semantics | Not published in the currently retrieved public pages | `BLOCKED_OFFICIAL_RETRY_POLICY_UNCONFIRMED` |
| Compliance CSID sequence | Public onboarding contract not retrieved from an authoritative current endpoint | `BLOCKED_OFFICIAL_ONBOARDING_SEQUENCE_UNCONFIRMED` |
| Sandbox production-CSID sequence | Public current contract not retrieved | `BLOCKED_OFFICIAL_PRODUCTION_CSID_SEQUENCE_UNCONFIRMED` |
| Standard clearance routing | Public current contract not retrieved | `BLOCKED_OFFICIAL_CLEARANCE_SEQUENCE_UNCONFIRMED` |
| Simplified reporting routing | Public current contract not retrieved | `BLOCKED_OFFICIAL_REPORTING_SEQUENCE_UNCONFIRMED` |
| Certificate renewal/expiry behavior | Public current contract not retrieved | `BLOCKED_OFFICIAL_CERTIFICATE_LIFECYCLE_UNCONFIRMED` |
| Official error-code catalogue | Public current contract not retrieved | `BLOCKED_OFFICIAL_ERROR_CODES_UNCONFIRMED` |

## Local-only implementation constraints

- The runtime adapter must default to disabled and must not derive an endpoint from user input, repository examples, or a hostname suffix.
- Any future official adapter requires an exact source-backed HTTPS host, an allowlisted path/method pair, no redirects, bounded request/response handling, a current API-version contract, and a separately approved synthetic-data execution packet.
- Compliance CSID, production-CSID, clearance, and reporting requests remain disabled. No authenticated ZATCA API request, OTP processing, CSID request, or invoice submission occurred during this refresh.
- Safe evidence may contain only source metadata, checksums, safe status codes, and non-secret identifiers. It must not contain XML, QR payloads, certificates, credentials, headers, OTPs, or response bodies.

## Required resolution before network execution

Obtain from a current official ZATCA source or authenticated developer documentation, then review in a separate contract update:

1. Sandbox hostname and TLS policy.
2. Compliance and subsequent credential-stage endpoints, paths, methods, headers, and request/response schemas.
3. Clearance and reporting endpoint contracts, including invoice-type routing and idempotency/retry semantics.
4. Official error-code and certificate lifecycle rules.

Until then, ARC-07B can implement and prove disabled/local-loopback boundaries only. The separate owner gate remains `APPROVE ZATCA SANDBOX NETWORK EXECUTION FOR SYNTHETIC DATA ONLY`; this document does not supply that approval.
