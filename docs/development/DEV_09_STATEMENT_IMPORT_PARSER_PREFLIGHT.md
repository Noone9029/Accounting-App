# DEV-09 Statement Import Parser Preflight

Status: completed read-only preflight
Date: 2026-05-30
Latest commit inspected: `ac297061 Verify DEV-09 banking reconciliation fixtures`
Marker: `DEV09-BANK-20260530T000000`

## Scope

This preflight maps the statement parser/import behavior before the approved Part 5 local synthetic checks. It is documentation and code inspection only.

Actions not performed: statement preview execution, statement import execution, real bank file access, match, categorize, ignore, reconciliation mutation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, production/beta/shared target access, customer-data access, output generation, download, PDF generation, email, ZATCA, backup, restore, or body/secret printing.

## Source Files Inspected

- `apps/api/src/bank-statements/bank-statement-import-parser.ts`
- `apps/api/src/bank-statements/bank-statement-import-parser.spec.ts`
- `apps/api/src/bank-statements/bank-statement.service.ts`
- `apps/api/src/bank-statements/bank-statement.service.spec.ts`
- `apps/api/src/bank-statements/fixtures/README.md`
- `apps/api/src/bank-statements/fixtures/sample.ofx`
- `apps/api/src/bank-statements/fixtures/sample.mt940`
- `apps/api/src/bank-statements/fixtures/sample-camt053.xml`
- `apps/api/src/bank-statements/fixtures/sample-camt054.xml`
- `docs/banking/BANK_STATEMENT_COMPATIBILITY_MATRIX.md`
- `docs/banking/SANITIZED_BANK_SAMPLE_COLLECTION_GUIDE.md`
- `docs/banking/BANK_PARSER_VALIDATION_CHECKLIST.md`

## Parser Support Map

The parser detects and normalizes these input families:

- CSV:
  - Header aliases for date, description, reference, bank reference, debit, credit, signed amount, balance, counterparty, and currency.
  - Handles quoted CSV values and basic delimiter records.
  - Warns when required date/description or amount columns are missing.
- JSON:
  - Accepts an array of row objects or an object with a `rows` array.
  - Warns for invalid JSON and non-object rows.
- OFX:
  - Detects OFX SGML/XML-like text through OFX tags.
  - Extracts posted date, transaction amount, FITID, MEMO, NAME, transaction type, currency, and closing balance where present.
  - Warns when FITID is missing and duplicate checks must fall back.
- CAMT:
  - Detects CAMT.053/CAMT.054-style XML and `Ntry` blocks.
  - Extracts amount, debit/credit indicator, booking/value dates, references, description, counterparty, and currency.
  - Warns when debit/credit direction is missing.
- MT940:
  - Detects `:61:` transaction lines and balance currency tags.
  - Extracts value dates, debit/credit direction, amount, reference, and `:86:` narrative.
  - Warns when no transaction lines are found.
- UNKNOWN:
  - Returns no rows and warns that the format could not be detected.

## Preview/Import Behavior

Preview path:

- `BankStatementService.previewImport(...)` parses and validates rows.
- Preview is expected to return format, counts, warnings, invalid rows, duplicate warnings, closed-period warnings, and totals.
- Preview should not create `BankStatementImport` or `BankStatementTransaction` rows.

Import path:

- `BankStatementService.importStatement(...)` persists a `BankStatementImport` and valid `BankStatementTransaction` rows.
- Import requires an active bank profile.
- Import rejects invalid rows unless `allowPartial` is set.
- Import rejects zero valid rows.
- Import warns or blocks closed-period rows according to service validation.
- Imported rows start as `UNMATCHED`.

Void path:

- `voidImport(...)` marks non-voided rows as `VOIDED` and the import as `VOIDED`.
- It rejects matched/categorized rows and rows inside closed reconciliation periods.

Part 5 will not run a persisted import. It will use parser checks and preview no-persistence only.

## Duplicate And Idempotency Plan

Part 5 should prove these safely:

- In-file duplicate rows are detected by preview validation.
- Existing local marker rows can produce duplicate warnings without creating new rows.
- Preview count before/after for imports and statement transactions remains unchanged.
- Invalid input returns errors/warnings and does not persist.

Part 5 should not claim full production idempotency. A production duplicate policy still needs target-bank samples, file-level identity policy, raw-file/archive policy, and user-facing repeat-import UX.

## Synthetic Inputs Selected For Part 5

Use only inline synthetic data. Do not read real files or customer files.

Planned parser-only formats:

- CSV with two valid rows and one intentional duplicate row.
- JSON with two valid row objects.
- OFX minimal synthetic statement text.
- CAMT minimal synthetic statement text.
- MT940 minimal synthetic statement text.
- Unknown text to verify safe warning behavior.
- Invalid JSON to verify safe parse error behavior.

Planned preview checks:

- Preview a valid synthetic CSV against the marker bank profile.
- Preview a synthetic CSV with an in-file duplicate row.
- Preview a synthetic invalid row.
- Compare marker-scoped `BankStatementImport` and `BankStatementTransaction` counts before/after preview to prove no persistence.

Persisted import is intentionally skipped in Part 5 because the current approved goal is parser/preview checks, and Part 2 already created fixture rows for later transaction action testing.

## Safety Limits For Part 5

- Exact approval phrase must be re-validated before the Part 5 checks.
- Local DB target must be proven as `localhost:5432/accounting`.
- No real bank files, no customer data, no raw file bodies, and no statement bodies in evidence.
- Evidence may include format names, parsed row counts, warning counts, invalid row counts, duplicate warning counts, count deltas, statuses, and safe marker prefixes only.
- No persisted import unless a later prompt explicitly approves it.
- No match/categorize/ignore or reconciliation lifecycle mutation.

## Required Part 5 Approval Phrase

Already received from the user and must be validated at Part 5 execution:

`I approve DEV-09 Part 5 local-only synthetic statement import parser checks under marker DEV09-BANK-20260530T000000. No production, no beta, no customer data.`

## Verification Plan

Required for this part:

- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check` if anything is staged

Skipped by design:

- Targeted parser tests because no parser code changed.
- Full tests, full build, E2E, smoke, browser login, persisted import, migrations, seed/reset/delete, production/beta/customer-data checks, output/download/PDF, real email, ZATCA, backup/restore, and deploys.

## Next Step

Proceed to `DEV-09 Part 5: approved local synthetic statement import parser checks`.
