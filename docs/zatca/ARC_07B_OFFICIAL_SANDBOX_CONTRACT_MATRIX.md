# ARC-07B official sandbox contract matrix

Date: 2026-07-21
Scope: public official-source refresh and local-only preparation. This is not a sandbox execution authorization.

## Source register

| Official source | Page/version metadata | Retrieved | SHA-256 of retrieved UTF-8 page | Environment | Decision supported |
| --- | --- | --- | --- | --- | --- |
| [E-Invoice specifications](https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx) | Page reports XML Implementation Standard dated 19 May 2023; page last updated 12 Jan 2026 | 2026-07-20; reviewed 2026-07-21 | `462DB9257EB2FAAA020FD653384D5E8BACD4D748062E7873085B8D59CFF6F66B` | Local implementation and future sandbox preparation | `CONFIRMED_OFFICIAL`: published XML/data-dictionary contract governs local invoice structure, PIH, ICV, and QR decisions. |
| [Download SDK](https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx) | Public developer page; authorized local reference remains SDK 238-R3.4.8 | 2026-07-20; reviewed 2026-07-21 | `9328B227F777A20D7C353A5B78E1183A90D45EB38A34A3AA513DBF9EB967DA0D` | Local-only structural/hash oracle | `CONFIRMED_OFFICIAL`: the SDK is an offline oracle only; no SDK file or licensed binary is committed. |
| [Simplified technical guide](https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/Simplified-technical-guide.aspx) | Page last updated 5 Mar 2026 | 2026-07-20; reviewed 2026-07-21 | `33B711CC93634AF867F3E486FA22DD022141C37634D6C46C2018C2EE92AB093F` | Simplified invoice preparation | `CONFIRMED_OFFICIAL`: simplified invoice rules require their own source-backed review. |
| XML Implementation Standard (linked by the specifications page) | Linked official document; body not committed | 2026-07-20 | URL identity captured by the specifications page | XML/cryptographic local conformance | ARC-07A XML/XAdES work remains governed by the current official standard. |
| E-Invoice Data Dictionary (linked by the specifications page) | Linked official spreadsheet; body not committed | 2026-07-20 | URL identity captured by the specifications page | Field-level local conformance | PIH, ICV, QR, and invoice-field decisions must remain source-backed. |

Superseded or non-normative material: legacy repository endpoint scaffolding, examples, and historical runbooks. They may inform a local adapter shape but must not supply an official host, credential, method, path, or API-version claim.

## External sandbox contract

| Contract item | Current official evidence | ARC-07B result |
| --- | --- | --- |
| Official sandbox host | The public material reviewed does not provide a current checksum-backed API-host contract. Historical manuals and repository scaffolding are non-normative. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Allowed HTTPS paths and methods | No current checksum-backed endpoint contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| API-version headers | No current checksum-backed API-header contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Authentication construction | No current checksum-backed authentication construction is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Request/response media types and limits | No current checksum-backed media-type or size contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Timeout, retry, and idempotency semantics | No current checksum-backed external retry contract is recorded. Local loopback semantics are not an official substitute. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Compliance CSID sequence | Public onboarding material is insufficient to establish an executable current endpoint contract. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Sandbox production-CSID sequence | No current checksum-backed external contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Standard clearance routing | No current checksum-backed external contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Simplified reporting routing | No current checksum-backed external contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Certificate renewal/expiry behavior | No current checksum-backed external lifecycle contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |
| Official error-code catalogue | No current checksum-backed external error contract is recorded. | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |

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
