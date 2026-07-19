# ARC-07A official-source and local conformance audit

Date: 2026-07-20
Classification: local/offline assessment only

## Current official-source register

The following sources were retrieved directly from ZATCA on 2026-07-20. SHA-256 values are of the retrieved UTF-8 HTML response bytes, not of any linked downloadable PDF or SDK binary.

| Source title | Version/currentness | URL | SHA-256 | Applicable environment | Decision supported |
| --- | --- | --- | --- | --- | --- |
| E-Invoice specifications | Page reports XML Implementation Standard dated 19 May 2023; page last updated 12 Jan 2026 | `https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx` | `462DB9257EB2FAAA020FD653384D5E8BACD4D748062E7873085B8D59CFF6F66B` | Local design/validation and future EGS implementation | UBL/XML requirements must be checked against the current official implementation standard and data dictionary before code changes. |
| Simplified technical guide | Page last updated 5 Mar 2026 | `https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/Simplified-technical-guide.aspx` | `33B711CC93634AF867F3E486FA22DD022141C37634D6C46C2018C2EE92AB093F` | Simplified/B2C requirements | Simplified invoice handling needs its own current official review; it cannot be inferred from standard fixtures. |
| Download SDK | Current ZATCA Developer Portal page | `https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx` | `9328B227F777A20D7C353A5B78E1183A90D45EB38A34A3AA513DBF9EB967DA0D` | Local, offline validation | The official SDK is the required local validation oracle for invoice, credit-note, debit-note, and QR structure checks. |

Superseded material: the repository's ignored `reference/` SDK/document snapshot and historical status claims are not accepted as current normative proof until an approved, checksum-recorded official SDK/package acquisition is available. No unofficial source was used.

## Offline execution result

The no-network commands were run locally:

```text
node scripts/zatca-sdk-ci-readiness.cjs --plan --no-network --json
node scripts/zatca-sdk-validate-local.cjs --all --no-network --json
```

Both reported `networkCallsMade: false`, no body/QR/private-key/token/header output, and `productionComplianceEnabled: false`. Validation was not attempted for any of the six registered fixtures because:

- the official SDK reference/JAR/configuration and official sample files are absent from this fresh checkout;
- the reference directory is intentionally ignored, so CI has no approved acquisition/licensing policy;
- the default Java runtime is 17.0.16, but a compatible local Microsoft JDK 11.0.26.4 was subsequently discovered and can be selected for a future SDK run; it is not itself a remaining blocker.

The result is `CI_BLOCKED_MISSING_SDK_REFERENCE`, not SDK acceptance. It does not prove invoice XML, canonicalization, hash, signature, QR, PIH, ICV, or archive correctness.

## Required remaining conformance work

The current implementation map still identifies unimplemented or unverified areas: canonicalization/hash parity, XAdES/ECDSA/certificate embedding, Phase 2 QR, simplified invoice, debit note, multiple VAT/zero/exempt cases, allowance/rounding cases, invalid-rule fixtures, and a production-safe signing boundary. No live credential, network request, OTP, CSID, clearance, reporting, customer data, or signed artifact was used in this audit.

ARC-07A cannot meet its exit criteria until the owner accepts/authorizes the official ZATCA SDK download terms and provides a lawful, reproducible SDK acquisition/reference policy. Then each valid fixture must pass the official SDK and each invalid fixture must fail with a recorded safe reason before any sandbox action is considered.
