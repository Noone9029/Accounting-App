# Bank Statement Parser Fixtures

These fixtures are sanitized parser samples for manual bank statement import tests. They are not production bank exports and do not certify support for any specific bank.

## Safety Rules

- Do not commit raw bank statement files.
- Do not commit real account numbers, IBANs, BICs, names, addresses, bank references, card fragments, payroll details, or identifying descriptions.
- Do not add real bank credentials, cookies, tokens, screenshots, or support exports.
- Keep fixtures small and clearly fake.
- Use obvious fake values such as `FAKEACCOUNT`, `FAKE-REF-0001`, `FAKE-E2E-0001`, and `FAKE COUNTERPARTY`.
- Preserve file structure, date formats, amount formats, debit/credit markers, currency markers, and tag layout where those details are needed for parser validation.

## Naming Convention

Use short lowercase names that describe the format and variant:

- `sample.ofx`
- `sample-ofx-xml-missing-fitid.ofx`
- `sample-camt053.xml`
- `sample-camt054.xml`
- `sample.mt940`
- `sample-mt940-multiline.mt940`

For bank-specific sanitized samples, use a fake/non-identifying variant name until the compatibility matrix records the target bank separately, for example:

- `sample-csv-debit-credit-columns.csv`
- `sample-camt053-remittance-fallback.xml`
- `sample-mt940-structured-86.mt940`

Do not include real bank account identifiers or customer names in filenames.

## Fixture Categories

- CSV debit/credit column samples.
- CSV signed-amount samples.
- OFX SGML-style transaction samples.
- OFX XML-style transaction samples.
- CAMT.053 statement samples.
- CAMT.054 notification/advice samples.
- MT940 basic `:61:`/`:86:` samples.
- MT940 multiline narrative samples.
- Unsupported or malformed samples for safe rejection tests.

## Adding A Fixture

1. Start from a sanitized copy only.
2. Confirm no real bank data remains.
3. Keep only the rows needed for the parser behavior under review.
4. Add or update a parser test that reads the fixture and asserts normalized output or safe rejection.
5. Update `docs/banking/BANK_STATEMENT_COMPATIBILITY_MATRIX.md` honestly.
6. Keep support wording as fixture-only unless a separate review approves bank-specific language.

## Test Command

Run the targeted parser tests:

```powershell
corepack pnpm --filter @ledgerbyte/api test -- bank-statement-import-parser.spec.ts bank-statement.service.spec.ts
```

These tests must not print raw fixture bodies or persist rows to a database.
