# UAE PINT-AE Official Serializer Gap List

Status: local serializer partial proof
Date: 2026-07-02

## Current Covered Locally

- UAE electronic address scheme `0235`.
- Official customization/profile identifiers in local serializer output.
- Commercial invoice type code `380`.
- Tax credit note type code `381`.
- ProfileExecutionID transaction flag builder for mapped scenarios.
- Predefined endpoint scenarios currently represented in fixtures.
- Negative tests for missing endpoints, invalid TIN/TRN, missing credit-note reason/reference, and unmapped transaction flags.

## Known Gaps

- Provider-specific payload contract.
- Provider-specific submission envelope.
- Reverse-charge transaction flag mapping where source-backed mapping is still missing.
- Allowance/charge representation.
- Full official validation against external authority tooling.
- ASP sandbox certification evidence.
- Production certificate/accreditation evidence.

## Claim Boundary

The package can claim local readiness and tested local serializer coverage for the listed fixtures. It cannot claim UAE compliance, Peppol certification, FTA reporting, ASP acceptance, or production serializer completion.
