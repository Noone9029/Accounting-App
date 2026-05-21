# Bank Parser Validation Checklist

Date: 2026-05-22

Status: checklist for sanitized manual statement samples. This does not cover live feeds, external bank aggregators, automatic matching, or accounting postings.

Use this checklist for each sanitized CSV, OFX, CAMT XML, or MT940 sample before updating the compatibility matrix.

## Sample Safety

- [ ] Sample is sanitized and contains no real account numbers.
- [ ] Sample contains no real IBANs, BICs, routing numbers, or branch identifiers.
- [ ] Sample contains no real customer, supplier, employee, or counterparty names.
- [ ] Sample contains no real transaction references, document numbers, card fragments, payroll references, or private descriptions.
- [ ] Raw original file is not committed.
- [ ] Test output does not print the raw file body.

## Format Detection

- [ ] File is detected as the expected format: CSV, JSON, OFX, CAMT, MT940, or UNKNOWN.
- [ ] Unsupported or unknown files fail safely.
- [ ] Unsupported errors do not echo raw file content.
- [ ] The UI labels the flow as manual upload/paste only.
- [ ] No copy implies live bank feed integration.

## Parser Output

- [ ] Parsed row count matches the expected transaction count.
- [ ] Empty statement files return a clear warning.
- [ ] Invalid rows are flagged without blocking review of valid rows when partial preview is allowed.
- [ ] Row-level warnings identify missing or ambiguous fields without exposing raw body text.

## Date Parsing

- [ ] Booking date is parsed where present.
- [ ] Value date is parsed where booking date is absent and the format supports it.
- [ ] Date-time values are reduced to a statement date safely.
- [ ] Malformed dates produce a warning or validation error.
- [ ] No timezone conversion changes the intended statement date in the sanitized sample.

## Amount Parsing

- [ ] Signed amount columns parse correctly.
- [ ] Separate debit and credit columns parse correctly.
- [ ] Decimal comma amounts parse correctly where format uses comma decimals.
- [ ] Thousands separators do not corrupt the amount.
- [ ] Malformed amounts produce a warning or validation error.

## Debit/Credit Direction

- [ ] Credits increase statement balance.
- [ ] Debits decrease statement balance.
- [ ] CAMT `CRDT` and `DBIT` indicators are respected.
- [ ] MT940 `C` and `D` indicators are respected.
- [ ] Missing direction fields produce a warning rather than silent inference.

## Reference Extraction

- [ ] Bank reference or stable transaction id is extracted when available.
- [ ] OFX `FITID` is used when available.
- [ ] CAMT reference fallback order is documented for the sample.
- [ ] MT940 `//` reference is extracted when available.
- [ ] Missing references produce lower duplicate-key confidence.

## Description And Remittance

- [ ] Description, memo, name, or remittance text is extracted.
- [ ] Multi-line narrative fields are preserved as readable text where supported.
- [ ] Sanitized descriptions do not contain real people, vendors, customers, or documents.
- [ ] Missing descriptions produce a warning where appropriate.

## Currency And Balance

- [ ] Currency is extracted where the format supplies it.
- [ ] Unsupported currency is warned or rejected according to existing import rules.
- [ ] Opening and closing balance structures are detected or documented as not parsed.
- [ ] Balance values are parsed only where current parser support exists.
- [ ] Sensitive real balances are replaced before fixture commit.

## Duplicate Key Quality

- [ ] Duplicate candidate logic has a stable reference where possible.
- [ ] Date, amount, and description fallback is documented when no reference exists.
- [ ] Missing `FITID` or equivalent reference is treated as lower confidence.
- [ ] Compatibility matrix notes the duplicate key confidence.

## Import Metadata And Persistence

- [ ] `sourceType` preserves the detected manual source type.
- [ ] Import metadata captures row counts and status through existing fields.
- [ ] Parsed transaction rows persist through the existing manual import path only.
- [ ] Raw file bodies are not stored in beta.
- [ ] No database migration is required for parser validation.

## UI Preview

- [ ] Preview shows row count, invalid count, warnings, and duplicate candidate count.
- [ ] Preview table remains readable with sanitized sample columns.
- [ ] Error state tells the user to fix the file without displaying raw file content.
- [ ] Help copy says OFX/CAMT/MT940 support is limited for bank-specific variants.
- [ ] Help copy says raw bank file bodies are not archived in beta.

## Out Of Scope Confirmation

- [ ] No live bank feed was connected.
- [ ] No external bank aggregator was added.
- [ ] No automatic matching was implemented.
- [ ] No reconciliation matching logic changed.
- [ ] No bank ledger, journal, or report calculation changed.
- [ ] No production support or certified parser claim was added.
