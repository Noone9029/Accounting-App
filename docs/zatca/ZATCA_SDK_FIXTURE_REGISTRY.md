# ZATCA SDK Fixture Registry

Date: 2026-06-06

LedgerByte is controlled beta/user-testing only. This registry supports local/no-network SDK validation evidence. It does not enable CSID onboarding, signing, clearance, reporting, PDF/A-3, or production ZATCA compliance.

## Registry Rules

- Fixture bodies must not be pasted into this document.
- Evidence output must identify fixtures by ID and relative path only.
- Official samples remain official-reference fixtures, not LedgerByte compliance claims.
- LedgerByte fixtures must use local/demo data only.
- Body output is forbidden for every fixture in this registry.
- Missing fixtures must produce a blocker result instead of invented validation precision.

## Fixtures

| Fixture ID | Source file path | Fixture type | Standard/simplified | Invoice kind | Validation mode | Expected result | Official or LedgerByte | Sensitive data | Body output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `official-standard-invoice` | `<ZATCA_SDK_ROOT>/Data/Samples/Standard/Invoice/Standard_Invoice.xml` (or the default local reference root) | SDK sample | Standard | Invoice | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass or safe SDK warning, depending local SDK/Java state | Official SDK sample | Official sample data only | Forbidden |
| `official-simplified-invoice` | `<ZATCA_SDK_ROOT>/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml` (or the default local reference root) | SDK sample | Simplified | Invoice | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass or safe SDK warning, depending local SDK/Java state | Official SDK sample | Official sample data only | Forbidden |
| `ledgerbyte-standard-invoice` | `packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml` | Local deterministic XML fixture | Standard | Invoice | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass, fail, or safe SDK warning from local validation | LedgerByte-generated fixture | Demo/local fixture data only | Forbidden |
| `ledgerbyte-credit-note` | `packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml` | Local deterministic XML fixture | Standard | Credit note | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass under Java 11-14 local SDK validation; safe blocker under unsupported Java | LedgerByte-generated fixture | Demo/local fixture data only | Forbidden |
| `ledgerbyte-generated-standard-invoice` | `packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml` | Local deterministic XML fixture | Standard | Invoice | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass under Java 11-14 local SDK validation; safe blocker under unsupported Java | LedgerByte-generated fixture | Demo/local fixture data only | Forbidden |
| `ledgerbyte-debit-note` | `packages/zatca-core/fixtures/ledgerbyte-generated-debit-note.expected.xml` | Local deterministic XML fixture | Standard | Debit note | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass or safe SDK warning from local validation | LedgerByte-generated fixture | Demo/local fixture data only | Forbidden |
| `ledgerbyte-allowance-invoice` | `packages/zatca-core/fixtures/ledgerbyte-generated-allowance-invoice.expected.xml` | Local deterministic XML fixture | Standard | Invoice with document allowance | `OFFICIAL_SDK_VALIDATE_NO_NETWORK` | Pass or safe SDK warning from local validation | LedgerByte-generated fixture | Demo/local fixture data only | Forbidden |
| `ledgerbyte-arabic-simplified-invoice` | `packages/zatca-core/fixtures/ledgerbyte-generated-arabic-simplified-invoice.expected.xml` | Local deterministic XML fixture | Simplified | Invoice with Arabic seller, buyer, and line description | C14N11 hash-parity only until its LedgerByte-signed Tier 2 artifact is added | Unsigned SDK validation is expected to reject missing signature/QR; do not count it as valid yet | LedgerByte-generated fixture | Demo/local fixture data only | Forbidden |

## 2026-06-06 Generated LedgerByte Fixture Entries

### `ledgerbyte-generated-standard-invoice`

- Fixture ID: `ledgerbyte-generated-standard-invoice`.
- Fixture type: standard sales invoice.
- Source: generated from sanitized local demo data in `packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.input.json`.
- XML body policy: committed as a deterministic sanitized local fixture snapshot at `packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml`; body output remains forbidden in evidence, docs, API responses, and logs.
- Official references used: SDK readme and usage, official standard and simplified invoice samples, official standard credit and debit note samples for shared structures, Schematron rules, `Data/PIH/pih.txt`, `EInvoice_Data_Dictionary.xlsx`, XML implementation standard PDF, and security features implementation standard PDF.
- Expected SDK behavior: `PASSED` with Java 11.0.26 through `fatoora -validate -invoice` in local/no-network mode; `BLOCKED_UNSUPPORTED_JAVA` or equivalent safe blocker when only Java 17 is selected.
- Known warnings/errors: none recorded in metadata evidence for the generated fixture run. Wrapper safety warnings remain expected because the run is local/no-network, uses the official Windows launcher, and stages a temporary no-space SDK workspace.
- Blocker status: no fixture-specific blocker after Java 11-14 is configured; production blockers remain.
- No-network validation required: true.
- productionCompliance false.

### `ledgerbyte-generated-credit-note`

- Fixture ID: `ledgerbyte-generated-credit-note`.
- Fixture type: standard credit note.
- Source: generated from sanitized local demo data in `packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.input.json`.
- XML body policy: committed as a deterministic sanitized local fixture snapshot at `packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml`; body output remains forbidden in evidence, docs, API responses, and logs.
- Official references used: SDK readme and usage, official standard credit note sample, official standard invoice sample, official debit note sample for shared reason/payment structures, Schematron rules, `Data/PIH/pih.txt`, `EInvoice_Data_Dictionary.xlsx`, XML implementation standard PDF, and security features implementation standard PDF.
- Expected SDK behavior: `PASSED` with Java 11.0.26 through `fatoora -validate -invoice` in local/no-network mode; `BLOCKED_UNSUPPORTED_JAVA` or equivalent safe blocker when only Java 17 is selected.
- Known warnings/errors: none recorded in metadata evidence for the generated fixture run. Wrapper safety warnings remain expected because the run is local/no-network, uses the official Windows launcher, and stages a temporary no-space SDK workspace.
- Credit note original reference: references sanitized invoice number `LB-GEN-STD-0001` through `cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID`.
- Blocker status: no fixture-specific blocker after Java 11-14 is configured; production blockers remain.
- No-network validation required: true.
- productionCompliance false.

## Aliases

- `ledgerbyte-local-standard-invoice` maps to `ledgerbyte-standard-invoice`.
- `ledgerbyte-local-credit-note`, `ledgerbyte-generated-credit-note`, and `ledgerbyte-local-generated-credit-note` map to `ledgerbyte-credit-note`; aliases are excluded from aggregate validation counts.

## Current Command Coverage

The local wrapper supports:

```bash
corepack pnpm zatca:sdk-validate-local -- --fixture official-standard-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture official-simplified-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-standard-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-credit-note --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-generated-standard-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-generated-credit-note --no-network --json
corepack pnpm zatca:sdk-validate-local -- --all --no-network --json
```

The CI readiness guard checks these registered generated fixture paths without reading or printing XML bodies:

```bash
corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json
```

Current CI guard status is `CI_BLOCKED_MISSING_SDK_REFERENCE` because the local official SDK reference is ignored and not available from a fresh checkout. The fixture registry and generated fixture paths are present locally, but that does not enable SDK validation in PR CI.

## 2026-07-20 Read-only configured SDK validation

With a locally configured `ZATCA_SDK_ROOT`, explicit Java `11.0.26`, and `--no-network`, all five registered unique fixtures passed `fatoora -validate`. The metadata-only evidence is `docs/zatca/evidence/official-sdk-local-validation-20260720.json`. Official fixture lookup is rooted in `ZATCA_SDK_ROOT`, so this proof does not copy ignored SDK files into a worktree. This local result does not change the CI blocker or authorize signing, sandbox, clearance, reporting, or production use.

The local signed XML plan guard also checks generated fixture path presence by metadata only:

```bash
corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json
```

That guard does not read fixture XML bodies, does not sign fixtures, does not generate QR payloads, and does not validate signed XML in this sprint.

## Blocker Policy

The wrapper records a blocker instead of failing destructively when:

- Java is missing or outside the supported SDK range.
- The SDK JAR or configuration folder is missing.
- A registered fixture file is missing.
- No executable local SDK validation command can be resolved.
- The SDK local validation command times out.

## Not Implemented

- No real ZATCA network calls.
- No OTP or CSID request.
- No signing with real credentials.
- No clearance or reporting.
- No PDF/A-3 generation.
- No production compliance claim.

## 2026-06-06 Approved Local Dummy Signing Coverage

The approved local dummy-material execution attempted only registered sanitized generated fixtures:

- `ledgerbyte-generated-standard-invoice`: SDK sign `PASSED`, QR `PASSED`, signed validation `PASSED`.
- `ledgerbyte-generated-credit-note`: SDK sign `PASSED`, QR `PASSED`, signed validation `PASSED`.

Evidence: `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.

This registry still does not authorize production invoices, beta/customer data, real CSID/certificate material, network submission, clearance/reporting, PDF/A-3, signed artifact persistence, or production compliance claims.

## 2026-06-06 Dummy Signing Result Review

The approved dummy signing evidence for the two registered generated fixtures was reviewed in `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md`. Both registered fixture IDs matched the approved scope, and both retained sign `PASSED`, QR `PASSED`, and signed validation `PASSED` metadata in the evidence file.

The Phase 2 QR gap analysis is recorded in `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md`. The registry remains limited to sanitized local fixtures and does not authorize production, beta, customer, CSID, network, clearance/reporting, PDF/A-3, signed artifact persistence, or production-compliance use.
