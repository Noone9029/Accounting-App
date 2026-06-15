# UAE PINT-AE Official Serializer Rule Pack Sprint Closure

Date: 2026-06-16

## Summary

Added a local-only official UAE PINT-AE serializer and validation rule-pack foundation. This keeps the existing LedgerByte readiness XML path separate while adding official local XML generation using the official PINT-AE identifiers currently known in the repo.

## What Changed

- Added official constants for `urn:peppol:pint:billing-1@ae-1`, `urn:peppol:bis:billing`, endpoint scheme `0235`, and TIN-derived endpoint IDs.
- Added focused `packages/uae-peppol-pint-ae/src/pint-ae/*` modules for constants, types, rules, serializer functions, and golden fixtures.
- Added structured rule results with `code`, `severity`, `message`, `fieldPath`, and `source`.
- Added invoice and credit-note serializers that emit official local XML and enforce credit-note reason/original-reference requirements.
- Added local rule coverage for endpoint, TIN/TRN, participant ID, address, invoice type, currency, line data, tax category, tax totals, total mismatch, and negative invoice values.
- Added guards so unknown official commercial-invoice code mappings, predefined endpoint values, and transaction flag mappings are not silently guessed.
- Updated compliance-core local validation to use the official local serializer and metadata-only archive hash path.
- Updated the UAE readiness panel wording to distinguish local readiness, local official XML generation, and absent ASP validation.

## Safety Boundaries

- Controlled beta/user-testing only.
- Local UAE PINT-AE XML generation and validation only.
- No real ASP validation.
- No real ASP calls or submission.
- No FTA reporting.
- No real Peppol transmission.
- No production Peppol or UAE compliance claim.
- No FTA certified, Peppol certified, official UAE provider, or accredited ASP claim by LedgerByte.
- No ZATCA production behavior.
- No hosted/customer-data mutation.
- No Vercel/Supabase changes.
- No production infrastructure commands.

## Known Limitations

- No real ASP provider response evidence exists yet.
- No provider has been commercially selected.
- No provider sandbox docs or credentials exist.
- Provider-specific payload contracts remain blocked on provider sandbox docs.
- Commercial invoice type-code mapping, predefined endpoint values for deemed supply/export/not-subject buyers, and transaction flag mappings remain source-required TODOs.
- ZATCA remains parked and blocked by default.

## Next Recommended Prompt

`UAE PINT-AE official-code TODO review`
