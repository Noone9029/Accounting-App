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

Superseded material: historical status claims are not accepted as current normative proof. No unofficial source was used.

## Offline execution result

The no-network commands were run locally:

```text
node scripts/zatca-sdk-ci-readiness.cjs --plan --no-network --json
node scripts/zatca-sdk-validate-local.cjs --all --no-network --json
```

The initial unconfigured fresh-checkout commands reported `networkCallsMade: false`, no body/QR/private-key/token/header output, and `productionComplianceEnabled: false`. Validation was not attempted because the ignored SDK reference is deliberately unavailable in a fresh checkout.

After the owner authorized local-only acceptance of the official SDK terms, the runner used an existing local SDK reference read-only through `ZATCA_SDK_ROOT`; no SDK file was copied into this worktree or committed. Its JAR was SHA-256 verified as `48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530`. With the explicit Microsoft JDK `11.0.26` binary, the following no-network command completed successfully:

```text
node scripts/zatca-sdk-validate-local.cjs --all --no-network --json --out docs/zatca/evidence/official-sdk-local-validation-20260720.json
```

The refreshed metadata-only artifact records eight registered and unique SDK validation artifacts: two official SDK samples and six LedgerByte-generated fixtures, including debit-note, document-allowance, and multiple-line VAT cases. Historical `ledgerbyte-generated-credit-note` is an alias of `ledgerbyte-credit-note` and is excluded from aggregates. The evidence reports eight valid fixtures and zero invalid fixtures in this unsigned-valid-artifact run, plus registered/unique/official/LedgerByte-generated counts, `networkCallsMade: false`, `productionComplianceEnabled: false`, and no XML, QR, private-key, token, or header output. The runner now resolves official samples from the explicitly configured SDK root rather than assuming that ignored material exists in a clean worktree.

Unsigned XML validation is proven for the registered fixtures. LedgerByte C14N 1.1/invoice-hash parity is proven for every current LedgerByte-generated fixture. A configured Tier-2 test constructs LedgerByte XAdES signatures with externally supplied local-only dummy material, generates nine-tag Phase 2 QR values in LedgerByte code, verifies the decoded QR ECDSA signature locally, and validates temporary standard and Arabic simplified signed XML artifacts with the official offline SDK. The SDK did not generate those signatures or QR values, and the tests retain no XML, QR, certificate, key, or raw SDK output. This is local compatibility evidence only; SDK validation is not ZATCA approval, and the CI readiness guard correctly remains `CI_BLOCKED_MISSING_SDK_REFERENCE` for a fresh checkout because no reproducible licensed SDK acquisition policy exists.

## Key-generation safety correction

The official SDK readme requires an EC `secp256k1` private key for signing. LedgerByte's legacy in-process RSA key/CSR helpers and API route have therefore been disabled. They can no longer generate or persist an incompatible RSA key; future local non-production CSR work must use the SDK/KMS custody workflow. This is a fail-closed correction, not a claim that a production key-custody implementation is complete.

`ZatcaEgsUnit.privateKeyPem` is a deprecated legacy database field that may contain plaintext private-key material from historical code paths. ARC-07A does not write it, return it through APIs, or migrate hosted data. The planned cleanup is: inventory and quarantine existing values under an approved custody migration; replace each retained key with a non-exportable signing-provider reference and metadata-only certificate record; verify no callers remain; then run an explicitly approved, reversible schema/data migration to remove the field. Until then, it remains a documented production blocker. The core signing boundary defaults to disabled, supports only externally configured `LOCAL_TEST` secp256k1 dummy material, and rejects sandbox, simulation, and production-looking use; future KMS/HSM implementations must satisfy the same metadata-only interface.

The local Java C14N 1.1 provider removes the required nodes through namespace-aware DOM traversal, applies C14N 1.1 without comments, and was compared byte-for-byte with the configured official SDK `-generateHash` oracle for all six current LedgerByte-generated valid fixtures. The configured local test also proves hash changes for monetary value, UUID, ICV, PIH, invoice-line, and seller-identifier mutations, while LF/CRLF-only formatting produces the same canonical hash. This is narrow local hash-parity evidence only; it does not constitute ZATCA approval or prove production key custody. The provider is disabled without the explicitly configured external SDK/JDK and returns metadata-only safe statuses; it does not print or persist input XML or canonical XML.

`docs/zatca/ARC_07A_LOCAL_PIH_ICV_STATE_CONTRACT.md` defines the local-only PIH/ICV proof state machine. It verifies ordered A/B/C progression, rejects duplicate/skipped/concurrent ICV claims and wrong/reused PIHs, and rolls back failed signing, validation, or local conformance attempts without changing durable production state. It is not wired to Prisma or any ZATCA endpoint.

## Required remaining conformance work

The current implementation map still identifies unimplemented or unverified areas: officially evidenced zero-rated/exempt categories and rounding cases, the full invalid-rule fixture matrix, a database-backed issuance proof, and a production-safe signing implementation. C14N11/hash parity is proven for the current six LedgerByte-generated fixtures and must expand with any new fixture. The local signing provider remains intentionally disabled except for explicit `LOCAL_TEST` external paths; it is not a production key-custody implementation. No live credential, network request, OTP, CSID, clearance, reporting, customer data, or persisted signed artifact was used in this audit.

ARC-07A cannot meet its exit criteria until the missing local implementation and fixture coverage is completed. A lawful, reproducible SDK acquisition/reference policy is additionally required before SDK validation can become CI evidence. Before any sandbox action, each intended valid fixture must pass the official SDK and every invalid fixture must fail with a recorded safe reason.
