# ZATCA XML Fixtures Guide

This is a working engineering checklist.
Official ZATCA/FATOORA documentation must be verified before production.
Do not treat current mock implementation as legal compliance.

## Fixture Location

Local development fixtures live in:

`packages/zatca-core/fixtures/`

Current fixtures are deliberately labeled as local dev fixtures:

- `local-standard-tax-invoice.input.json`
- `local-standard-tax-invoice.expected.xml`
- `local-simplified-tax-invoice.input.json`
- `local-simplified-tax-invoice.expected.xml`

## What These Fixtures Are

These fixtures prove that LedgerByte's current XML builder is deterministic, escapes XML-special characters, and preserves Arabic/Unicode text. They are not official ZATCA fixtures and must not be used as evidence of legal compliance.

The expected XML files are compared directly in automated tests. If the XML builder changes intentionally, update the expected fixture and document why the local skeleton changed.

## Official Fixture Registry

Official SDK sample fixture targets are now registered in `apps/api/src/zatca-sdk/zatca-official-fixtures.ts`. The registry references files under the repo-local `reference/` folder and the current LedgerByte local fixtures without copying official sample XML into application code.

The first validation pass is documented in `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`. Execution is currently blocked because the local Java runtime is 17.0.16 and the SDK README requires Java `>=11` and `<15`.

Before promoting official fixture checks:

1. Obtain current official ZATCA/FATOORA XML, signing, QR, and validation requirements.
2. Confirm whether fixture data may be committed to the repository.
3. Store official fixtures separately from local dev fixtures.
4. Add tests that clearly distinguish local deterministic checks from official SDK or portal validation.
5. Keep real API calls disabled unless explicit sandbox configuration is provided.

## Current Test Behavior

The local tests compare generated XML against the expected local XML text. They also verify:

- deterministic XML output for the same input
- XML escaping for `&`, `<`, `>`, quotes, and apostrophes
- Arabic/Unicode text survives generation
- local validation rejects missing seller VAT and missing invoice lines

These tests are engineering guardrails only. Official ZATCA/FATOORA validation remains a future manual dependency.
