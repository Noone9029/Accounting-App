# UAE PINT-AE Official-Code TODO Review

Review date: 2026-06-16

This review covers the official-code TODOs left by the UAE PINT-AE official serializer foundation. The rule for this pass was strict: encode only values found in UAE MoF or OpenPeppol primary sources, keep everything else blocked, and do not use blogs or provider marketing for official codes.

## TODO Inventory

| Item | Prior state | Review result |
| --- | --- | --- |
| Commercial invoice type-code mapping | `commercial-invoice` was blocked as `official-doc-required` | Resolved from OpenPeppol PINT-AE v1.0.1 invoice type code list: `380` is the commercial invoice code. |
| Predefined endpoint value for deemed supply | Blocked as `official-doc-required` | Resolved from OpenPeppol PINT-AE v1.0.1 BIS predefined endpoint table: scheme `0235`, participant identification `9900000097`. |
| Predefined endpoint value for exports when receiver is not registered in Peppol | Blocked as `official-doc-required` | Resolved from OpenPeppol PINT-AE v1.0.1 BIS predefined endpoint table: scheme `0235`, participant identification `9900000099`. |
| Predefined endpoint value for buyer not subject to UAE eInvoicing regulations | Blocked as `official-doc-required` | Resolved from OpenPeppol PINT-AE v1.0.1 BIS predefined endpoint table: scheme `0235`, participant identification `9900000098`. |
| Transaction type flag mappings | Blocked as `official-doc-required` | Resolved from OpenPeppol PINT-AE v1.0.1 code list and MoF mandatory fields document as an 8-position `0`/`1` string. |
| Provider-specific payload contract | Blocked on provider evidence | Still unresolved. No provider sandbox docs, credentials, provider response, or commercial terms are present in the repo. |

## Sources Reviewed

- UAE MoF Electronic Invoicing Guidelines V 1.0, 23 February 2026: https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoicing-Guidelines_V-1.0-23Feb2026.pdf
- UAE MoF Electronic Invoice Mandatory Fields V 1.0, 23 February 2026: https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoice-mandatory-fields_V-1.0-23Feb2026.pdf
- UAE MoF pre-approved eInvoicing service providers page: https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/
- OpenPeppol PINT-AE v1.0.1 BIS: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/bis/
- OpenPeppol PINT-AE v1.0.1 invoice type code list: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/UNCL1001-inv/
- OpenPeppol PINT-AE v1.0.1 transaction type code list: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/transactiontype/
- OpenPeppol PINT-AE v1.0.1 EAS code list: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/eas/
- OpenPeppol PINT-AE v1.0.1 syntax binding for `cbc:ProfileExecutionID`: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/syntax/cbc-ProfileExecutionID/
- OpenPeppol BIS Billing 3.0: https://docs.peppol.eu/poacc/billing/3.0/
- OpenPeppol UAE 2025-Q2 document specifications were checked for continuity against v1.0.1, but the implementation uses v1.0.1 because it is the current released PINT-AE version already referenced by this repo.

## Values Resolved

- `commercial-invoice` now maps to invoice type code `380`.
- Predefined endpoint participant identifications are now encoded:
  - `deemed-supply`: `9900000097`
  - `export-receiver-not-registered`: `9900000099`
  - `buyer-not-subject`: `9900000098`
- Transaction type flag mappings are now encoded:
  - `free-trade-zone`: `10000000`
  - `deemed-supply`: `01000000`
  - `profit-margin-scheme`: `00100000`
  - `summary-invoice`: `00010000`
  - `continuous-supply`: `00001000`
  - `agent-billing`: `00000100`
  - `e-commerce`: `00000010`
  - `exports`: `00000001`
- The serializer now emits `cbc:ProfileExecutionID` with `00000000` for standard invoices and a combined 8-position value for supported special transaction flags.

## Values Not Resolved

- Provider-specific request/response payload contract remains unresolved because no provider sandbox documentation, credentials, provider response, or commercial terms are available.
- No provider-specific status mapping beyond the existing disabled/mock/future placeholders was added.
- No real ASP validation, ASP submission, FTA reporting, Peppol transmission, or production provider evidence exists.

## Implementation Impact

- `@ledgerbyte/uae-peppol-pint-ae` can now generate local official PINT-AE XML for commercial invoices instead of blocking them as unknown.
- The predefined endpoint scenarios no longer require buyer endpoint input when one of the official scenarios is explicitly selected.
- Unknown or legacy transaction flags remain visible as structured `official-doc-required` validation results.
- Invalid explicit transaction flag codes are blocked by local validation instead of being serialized.
- Future provider adapters still expose no capabilities until real provider sandbox evidence exists.

## Next Evidence Needed

- Provider sandbox API documentation for the selected provider.
- Provider sample invoice and credit-note payloads, accepted and rejected examples, error schemas, idempotency rules, webhook signing, evidence download, and status lifecycle documentation.
- Provider credentials and commercial terms, kept outside git and reviewed under a separate approval gate.
- Accountant/legal review before any public compliance wording changes.

## Safety Boundary

- Controlled beta/user-testing only.
- Local UAE PINT-AE XML generation and validation only.
- No real ASP calls, real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, or production Peppol claim.
- LedgerByte does not claim FTA certification, Peppol certification, official UAE provider status, or accredited ASP status.
- No ZATCA production behavior was changed; ZATCA remains parked and blocked by default.
- No hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, migration, seed/reset/delete, smoke, E2E, real email, or provider network action was performed.

Unknown values are not guessed. Any future official-code update must cite the exact official source before changing constants or serializer behavior.
