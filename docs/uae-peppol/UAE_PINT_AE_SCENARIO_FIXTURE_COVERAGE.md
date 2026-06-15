# UAE PINT-AE Scenario Fixture Coverage

Audit date: 2026-06-16

This document records local-only UAE PINT-AE fixture coverage in `@ledgerbyte/uae-peppol-pint-ae`. It is a fixture coverage summary, not a legal compliance certificate, not provider validation, not FTA reporting evidence, and not production Peppol evidence.

## Scope

- Controlled beta/user-testing only.
- Local UAE PINT-AE XML generation and validation only.
- No real ASP calls.
- No real ASP submission.
- No FTA reporting.
- No real Peppol transmission.
- No production Peppol claim.
- No FTA certified, Peppol certified, official UAE provider, or accredited ASP claim by LedgerByte.
- No ZATCA production behavior.
- No hosted/customer-data mutation.
- No Vercel/Supabase changes.
- Accounting finalization remains separate from compliance delivery state.

## Positive Fixtures

| Scenario | Fixture | Expected coverage |
| --- | --- | --- |
| Standard UAE tax invoice | `standardUaePintAeTaxInvoiceFixture()` | Official local invoice XML, `CustomizationID`, `ProfileID`, `ProfileExecutionID`, endpoint scheme `0235`, type code `380`. |
| Commercial invoice | `commercialUaePintAeInvoiceFixture()` | Commercial invoice document type uses source-backed type code `380`. |
| Tax credit note | `standardUaePintAeTaxCreditNoteFixture()` | Credit-note XML includes type code `381`, original invoice reference, and credit-note reason. |
| Export receiver not registered in Peppol | `exportReceiverNotRegisteredUaePintAeInvoiceFixture()` | Buyer endpoint value `9900000099` and transaction flag `00000001`. |
| Deemed supply | `deemedSupplyUaePintAeInvoiceFixture()` | Buyer endpoint value `9900000097` and transaction flag `01000000`. |
| Buyer not subject to UAE eInvoicing regulations | `buyerNotSubjectUaePintAeInvoiceFixture()` | Buyer endpoint value `9900000098` and default transaction flag `00000000`. |
| Multi-line invoice with mixed line values | `multiLineUaePintAeTaxInvoiceFixture()` | Multiple lines, subtotal/tax/total validation, official local XML identifiers. |
| Document-level discount/allowance invoice | `documentLevelAllowanceUaePintAeInvoiceFixture()` | Package-local document allowance XML using `cac:AllowanceCharge`, `cbc:ChargeIndicator=false`, reason text, allowance amount, allowance tax category/rate, `cbc:AllowanceTotalAmount`, and recalculated taxable/payable totals. |
| Line-level discount/allowance invoice | `lineLevelAllowanceUaePintAeInvoiceFixture()` | Package-local line allowance XML using `cac:AllowanceCharge`, `cbc:ChargeIndicator=false`, reason text, line allowance amount, and line net amount validation. |

## Negative Fixtures

| Scenario | Fixture | Expected structured error |
| --- | --- | --- |
| Missing buyer endpoint | `missingBuyerEndpointUaePintAeInvoiceFixture()` | `BUYER_ENDPOINT_REQUIRED` |
| Invalid TIN/TRN | `invalidTinTrnUaePintAeInvoiceFixture()` | `SELLER_TIN_INVALID`, `SELLER_TRN_INVALID` |
| Credit note missing reason | `creditNoteMissingReasonUaePintAeFixture()` | `CREDIT_NOTE_REASON_REQUIRED` |
| Credit note missing original reference | `creditNoteMissingOriginalReferenceUaePintAeFixture()` | `CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED` |
| Unsupported legacy transaction flag | `unsupportedLegacyTransactionFlagUaePintAeFixture()` | `TRANSACTION_TYPE_FLAG_OFFICIAL_MAPPING_REQUIRED` with `official-doc-required` source |
| Allowance exceeds subtotal | `allowanceExceedsSubtotalUaePintAeFixture()` | `DOCUMENT_ALLOWANCE_EXCEEDS_SUBTOTAL`, `ALLOWANCE_EXCEEDS_BASE_AMOUNT`, `SUBTOTAL_MISMATCH` |
| Negative allowance | `negativeAllowanceUaePintAeFixture()` | `ALLOWANCE_AMOUNT_NEGATIVE`, `SUBTOTAL_MISMATCH` |
| Missing allowance reason | `missingAllowanceReasonUaePintAeFixture()` | `ALLOWANCE_REASON_REQUIRED` |
| Unsupported allowance reason code | `unsupportedAllowanceReasonCodeUaePintAeFixture()` | `ALLOWANCE_REASON_CODE_OFFICIAL_MAPPING_REQUIRED` with `official-doc-required` source |
| Reverse charge blocked without official mapping | `blockedReverseChargeUaePintAeFixture()` | `REVERSE_CHARGE_TRANSACTION_FLAG_OFFICIAL_MAPPING_REQUIRED` with `official-doc-required` source |

## Blocked Scenarios

| Scenario | Why blocked |
| --- | --- |
| Reverse charge invoice | Source documents identify VAT category `AE` for reverse charge, but this package does not yet have a source-backed UAE reverse-charge transaction flag and complete VAT-category serialization contract. It is represented as a structured `official-doc-required` validation failure, not serialized. |
| Provider-specific payload contract | No provider sandbox docs, credentials, non-confidential provider response, or commercial terms exist. |

## Harness

The package now exports:

- `validateUaePintAeFixture()`
- `runUaePintAeFixtureSuite()`
- `summarizeUaePintAeFixtureResults()`
- `uaePintAeScenarioFixtureDefinitions()`

The fixture suite records fixture name, document type, scenario, expected outcome, actual outcome, errors, warnings, and generated XML metadata. The XML metadata checks include official `CustomizationID`, official `ProfileID`, `ProfileExecutionID`, endpoint scheme `0235`, predefined endpoint value when expected, and expected transaction flag when expected.

The QA summary is metadata-only and uses the label `local QA summary`. It explicitly records `certificationClaim=false` and `legalComplianceEvidence=false`. It also records blocked scenario metadata so official-document blockers and provider-later blockers are not mixed together.

## Known Gaps

- No real provider evidence exists.
- No provider-specific adapter exists.
- No real ASP validation exists.
- No real ASP submission exists.
- No FTA reporting exists.
- No production UAE compliance claim exists.
- No production Peppol claim exists.
- Allowance/discount support is package-local serializer input and fixture coverage only; it is not API/UI/accounting integration and does not change invoice posting or finalization behavior.
- Allowance reason-code serialization remains blocked until a source-backed reason-code list mapping is implemented.
- Reverse-charge XML remains blocked until a source-backed transaction flag and complete VAT-category contract are implemented.
- ZATCA remains parked and blocked by default.

## How To Run

```powershell
corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae test
corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae typecheck
```

The broader local verification gate remains separate from this package fixture summary.
