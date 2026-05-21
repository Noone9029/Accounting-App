# Sanitized Bank Sample Collection Guide

Date: 2026-05-22

Status: beta sample-intake guidance. This guide does not authorize storing raw bank files or using LedgerByte as a production bank feed.

## Purpose

LedgerByte needs sanitized real-world statement exports to validate manual import parsing for CSV, OFX, CAMT XML, and MT940 variants. The goal is to preserve file structure while removing sensitive data before a sample is committed, attached to an issue, or shared for review.

## Files Needed

Collect small manual exports where possible:

- CSV statement export.
- OFX statement export.
- CAMT.053 or CAMT.054 XML export.
- MT940 export.
- A file with both debit and credit transactions.
- A file with opening and closing balances if safe.
- A file with references, remittance text, or memo fields if safe.
- A file with local currency and, later, a separate sanitized FX example if the product scope expands.

One to five rows per file is usually enough for parser validation.

## Manual Export Guidance

- Export from the bank portal manually.
- Do not connect LedgerByte to a live bank feed.
- Do not share bank credentials, browser sessions, cookies, tokens, or screenshots of authenticated bank pages.
- Save the export outside the repository first.
- Sanitize the copy before moving it into `apps/api/src/bank-statements/fixtures/`.
- Keep the original raw file private and outside LedgerByte unless a separate approved retention policy exists.

## Remove Before Sharing

Remove or replace:

- Account numbers.
- IBANs.
- BICs/SWIFT codes.
- Routing numbers and bank branch identifiers.
- Customer, supplier, employee, and counterparty names.
- Addresses, phone numbers, emails, VAT IDs, CR numbers, and national identifiers.
- Real transaction references, payment IDs, card fragments, check numbers, and payroll references.
- Balances if they are sensitive.
- Descriptions that identify real people, vendors, customers, invoices, salaries, loans, or taxes.
- Any bank support notes, portal export IDs, user IDs, tokens, or metadata that identifies the account holder.

## Preserve If Safe

Keep the structural details that help parser validation:

- File format and tag structure.
- Header/footer line order.
- Date formats.
- Debit/credit markers.
- Amount formats, decimal separators, and sign conventions.
- Currency markers.
- Transaction tag structure.
- Reference field position, but with fake values.
- Memo/remittance field position, but with fake text.
- Opening/closing balance structure when the amount can be replaced safely.
- Multi-line narratives where the line structure matters.

## Fake Replacement Patterns

Use obvious fake values that cannot be mistaken for real banking data:

- Account id: `FAKEACCOUNT`
- IBAN-like placeholder: `FAKE-IBAN-0001`
- BIC-like placeholder: `FAKE-BIC`
- Counterparty: `FAKE COUNTERPARTY`
- Reference: `FAKE-REF-0001`
- End-to-end id: `FAKE-E2E-0001`
- Transaction id: `FAKE-TX-0001`
- Balance amount: `1000.00`, `0.00`, or another clearly artificial value.
- Description: `Manual sample receipt`, `Manual sample fee`, `Manual sample payment`.

Do not use real-looking random IBANs or bank account numbers. Even synthetic values can look real in screenshots and support tickets.

## Sanitization Examples

### CSV

Before sanitization:

```csv
Date,Description,Reference,Debit,Credit,Balance
2026-05-15,ORIGINAL_VENDOR_NAME ORIGINAL_DOCUMENT,ORIGINAL_BANK_REFERENCE,,250.00,ORIGINAL_BALANCE
```

After sanitization:

```csv
Date,Description,Reference,Debit,Credit,Balance
2026-05-15,Manual sample receipt,FAKE-REF-0001,,250.00,1000.00
```

### OFX

Before sanitization:

```xml
<ACCTID>ORIGINAL_ACCOUNT_NUMBER</ACCTID>
<FITID>ORIGINAL_REFERENCE</FITID>
<NAME>ORIGINAL_COUNTERPARTY</NAME>
<MEMO>ORIGINAL_PAYMENT_MEMO</MEMO>
```

After sanitization:

```xml
<ACCTID>FAKEACCOUNT</ACCTID>
<FITID>FAKE-OFX-0001</FITID>
<NAME>FAKE COUNTERPARTY</NAME>
<MEMO>Manual OFX sample payment</MEMO>
```

### CAMT XML

Before sanitization:

```xml
<IBAN>ORIGINAL_IBAN_VALUE</IBAN>
<EndToEndId>ORIGINAL_END_TO_END_ID</EndToEndId>
<Ustrd>ORIGINAL_REMITTANCE_TEXT</Ustrd>
```

After sanitization:

```xml
<Othr><Id>FAKEACCOUNT</Id></Othr>
<EndToEndId>FAKE-E2E-0001</EndToEndId>
<Ustrd>Manual CAMT sample remittance</Ustrd>
```

### MT940

Before sanitization:

```text
:25:ORIGINAL_ACCOUNT_NUMBER
:61:2605150515C1234,56NTRFORIGINAL//ORIGINAL_BANK_REFERENCE
:86:ORIGINAL_COUNTERPARTY_AND_DOCUMENT_DETAILS
```

After sanitization:

```text
:25:FAKEACCOUNT
:61:2605150515C1234,56NTRFFAKE//FAKE-MT940-0001
:86:Manual MT940 sample receipt
```

## Intake Checklist

- The file is a sanitized copy, not the original bank export.
- No real account numbers, IBANs, BICs, names, references, or identifying descriptions remain.
- The sample is small and contains only rows needed to validate parser behavior.
- The filename does not contain a real bank account, customer name, or export timestamp if that timestamp is sensitive.
- The sample has been reviewed before commit.
- The compatibility matrix row is updated honestly.
- The raw original remains outside the repository.

## Repository Policy

- Do not commit raw bank statement files unless they are sanitized.
- Do not print raw bank file bodies in logs, test output, issues, pull requests, or support notes.
- Do not archive raw file bodies in beta.
- Keep beta storage limited to parsed rows and import metadata.
- Treat sample parser validation as fixture-only evidence, not certified bank support.
