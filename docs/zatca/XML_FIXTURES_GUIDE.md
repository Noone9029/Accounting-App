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

The fixture validation passes are documented in `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`. Official SDK samples pass under Java 11 and the official launcher. After the supply-date and PIH/hash groundwork pass, LedgerByte's local standard fixture passes SDK XSD/EN/KSA/PIH validation and the global SDK result passes. The local simplified fixture passes SDK XSD/EN/PIH validation but still fails signing, QR, and certificate checks because real signing, certificate, canonical hash-chain sequencing, and Phase 2 QR behavior are not implemented.

SDK `-generateHash` values are now recorded for the official standard/simplified samples and the LedgerByte standard/simplified local fixtures. These values are hash-oracle evidence only; normal unit tests parse recorded output and do not require Java or the SDK.

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
- UBL header element order around issue date/time and additional document references
- official sample-backed ICV, PIH, and QR additional document reference shapes
- standard and simplified invoice transaction-code flags
- supply-date `cac:Delivery/cbc:ActualDeliveryDate` mapping for the standard invoice fixture
- official first-invoice PIH fallback and explicit PIH override behavior
- documented hash-input transforms while blocking official C14N11 hash computation until SDK `-generateHash` or verified canonicalization is used
- SDK hash output parsing and read-only hash comparison response shape

These tests are engineering guardrails only. Official ZATCA/FATOORA validation remains a future manual dependency.
