# Bank Statement Compatibility Matrix

Date: 2026-06-13

Status: planning and sample-intake tracker. This matrix is not a parser certification, bank certification, or live bank integration claim.

LedgerByte currently supports manual upload or paste only. It has limited parser groundwork for CSV, JSON, XLSX, OFX, CAMT XML, and MT940, plus a downloadable canonical CSV template. Manual imports now include service-level duplicate/idempotency checks, reconciliation-overlap warnings/blocks, deterministic bank-rule suggestions for imported statement transactions, and explicit bank-deposit-batch matching for posted operational deposit batches, but bank-specific support is not certified until real sanitized exports from that institution are reviewed and tested.

Support levels:

- `not collected`: no sanitized sample has been provided.
- `sample collected`: a sanitized sample exists but has not been tested.
- `parser detected`: format detection works, but row parsing is not validated.
- `parser partially supported`: parser extracts some expected fields from a sanitized fixture.
- `parser validated on sanitized sample`: a sanitized fixture passed targeted parser tests.
- `unsupported`: format or variant is intentionally rejected.

## Current Fixture Coverage

These rows describe LedgerByte-owned sanitized fixtures only. They do not represent any bank-specific certification.

| Bank/institution | Country/region | Format | File extension | Sample status | Parser status | Tested fixture path | Date parsing status | Amount parsing status | Debit/credit direction status | Reference extraction status | Description/remittance extraction status | Balance extraction status | Duplicate key confidence | Warnings/limitations | Support level | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LedgerByte sanitized fixture | Generic | OFX SGML-style | `.ofx` | Sanitized fixture available | Parses common `STMTTRN` rows | `apps/api/src/bank-statements/fixtures/sample.ofx` | `DTPOSTED` covered | `TRNAMT` covered | Signed amount covered | `FITID` covered | `NAME`/`MEMO` covered | Not a primary coverage target | Strong when `FITID` exists | Generic fixture only; not bank-certified. | parser validated on sanitized sample | Manual upload/paste only. |
| LedgerByte sanitized fixture | Generic | OFX XML-style | `.ofx` | Sanitized fixture available | Parses XML-style `STMTTRN` rows | `apps/api/src/bank-statements/fixtures/sample-ofx-xml-missing-fitid.ofx` | `DTPOSTED` covered | `TRNAMT` covered | Signed amount covered | Missing `FITID` warning covered | `NAME`/`MEMO` covered | Not a primary coverage target | Lower when `FITID` is missing | Duplicate checks fall back to date, amount, and description. | parser validated on sanitized sample | Manual upload/paste only. |
| LedgerByte sanitized fixture | Generic | CAMT.053-like XML | `.xml` | Sanitized fixture available | Parses common `Ntry` rows | `apps/api/src/bank-statements/fixtures/sample-camt053.xml` | `BookgDt`/`ValDt` date covered | `Amt` covered | `CdtDbtInd` covered | Reference fallback covered where present | `RmtInf`/additional info covered | Limited | Medium; depends on available reference | Generic CAMT namespace variants only. | parser validated on sanitized sample | Manual upload/paste only. |
| LedgerByte sanitized fixture | Generic | CAMT.054-like XML | `.xml` | Sanitized fixture available | Parses notification-style `Ntry` rows | `apps/api/src/bank-statements/fixtures/sample-camt054.xml` | `DtTm` and date fallback covered | `Amt` with currency covered | `CRDT`/`DBIT` covered | `EndToEndId`/`TxId` fallback covered | `Ustrd`/`AddtlTxInf` covered | Limited | Medium; depends on reference fields | Entries missing `CdtDbtInd` are warned, not inferred. | parser validated on sanitized sample | Manual upload/paste only. |
| LedgerByte sanitized fixture | Generic | MT940 basic | `.mt940` | Sanitized fixture available | Parses `:61:` and `:86:` rows | `apps/api/src/bank-statements/fixtures/sample.mt940` | `YYMMDD` covered | Comma decimal covered | `C`/`D` covered | `//` reference covered | `:86:` covered | Opening/closing lines detected only indirectly | Medium; depends on reference text | Bank-specific structured `:86:` subfields need samples. | parser validated on sanitized sample | Manual upload/paste only. |
| LedgerByte sanitized fixture | Generic | MT940 multiline narrative | `.mt940` | Sanitized fixture available | Parses multiline `:86:` narrative rows | `apps/api/src/bank-statements/fixtures/sample-mt940-multiline.mt940` | `YYMMDD` covered | Comma decimal covered | `C`/`D` covered | `//` reference covered | Multiline `:86:` covered | Opening/closing lines detected only indirectly | Medium; depends on reference text | Not certified for bank-specific narrative tags. | parser validated on sanitized sample | Manual upload/paste only. |
| LedgerByte canonical template | Generic | XLSX first worksheet | `.xlsx` | Generated test workbook only | Parses canonical template headers from first worksheet | `apps/api/src/bank-statements/bank-statement-import-parser.spec.ts` | ISO strings and Excel date cells covered | Numeric amount/balance cells covered | Debit/credit columns and signed amount covered | `reference`/`bankReference` covered | `description`/`counterparty` covered | Covered when column exists | Medium; depends on references and descriptions | Extra worksheets are ignored with warning; bank-specific XLSX layouts are not certified. | parser validated on generated workbook | Manual upload only; no live feed. |

## Target Bank Intake Tracker

These rows are placeholders for likely beta target banks and regions. Every row remains `not collected` until a sanitized export is received and reviewed.

| Bank/institution | Country/region | Format | File extension | Sample status | Parser status | Tested fixture path | Date parsing status | Amount parsing status | Debit/credit direction status | Reference extraction status | Description/remittance extraction status | Balance extraction status | Duplicate key confidence | Warnings/limitations | Support level | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Al Rajhi Bank | Saudi Arabia | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| Saudi National Bank | Saudi Arabia | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| Riyad Bank | Saudi Arabia | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| Saudi Awwal Bank | Saudi Arabia | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| Arab National Bank | Saudi Arabia | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| Bank Albilad | Saudi Arabia | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| Emirates NBD | UAE/GCC | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| ADCB | UAE | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| FAB | UAE | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| HBL | Pakistan | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |
| MCB Bank | Pakistan | CSV/OFX/CAMT/MT940 if exported | TBD | Not collected | Not tested | None | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Need sanitized export before any claim. | not collected | Do not use real account numbers, IBANs, names, or references. |

## Update Rules

- Add a target-bank row only after a sanitized sample has been checked against the sample collection guide.
- Do not store or link raw, unsanitized bank files in the repository.
- Do not mark a bank as validated from generic fixtures.
- Do not use the word certified unless a separate bank/compliance review has explicitly approved that wording.
- Keep raw file bodies out of logs, issue reports, pull requests, screenshots, and support tickets.
- Parser validation does not imply automatic matching, live bank feeds, external bank aggregation, or accounting posting changes.
- Bank rules are deterministic review suggestions for imported manual statement rows. They do not certify a bank parser, add a live feed, call bank APIs, initiate payments, silently reconcile rows, or silently ignore rows.
- Bank deposit batches are LedgerByte treasury workflow records that can be explicitly matched to one imported credit row. They do not certify a parser, add live feeds, call bank APIs, initiate payments, add card settlements, add full cheque lifecycle, or create journal-backed clearing movement yet.
- Duplicate/idempotency hardening is service-level only. No DB-level unique statement fingerprint/index exists yet.

## 2026-06-13 Bank Deposit Batch Update

- Added operational bank deposit batches for grouping receipt-like items into a bank account deposit total.
- Matching is explicit and limited to same-bank-account, same-currency, same-amount imported credit statement rows.
- Closed reconciliation periods block deposit-batch match, unmatch, and linked void changes.
- The additive schema is limited to deposit batches and deposit lines.
- No live feeds, bank APIs, credentials, payment initiation, card settlements, full cheque lifecycle, silent auto-match, automatic reconciliation, VAT/ZATCA/report changes, or production banking readiness was added.
- Journal-backed clearing movement is deferred because the current customer payment flow posts directly to the paid-through account and no confirmed undeposited-funds/clearing account model exists.

## 2026-06-13 Bank Rules Update

- Added organization-scoped deterministic bank rules with optional bank account profile scope.
- Rule conditions can inspect normalized manual statement fields such as direction, description, reference, bank reference, counterparty, amount, currency, source format, and date range.
- Dry-run returns suggestions without mutating statement transactions.
- Explicit apply reuses existing categorize, ignore, or match behavior and records rule-application audit metadata.
- This does not add live feeds, bank APIs, bank credentials, deposits, card settlements, cheques, payment initiation, silent auto-reconciliation, silent auto-ignore, or production banking readiness.

## 2026-06-13 Import Safety Update

- Duplicate identity uses bank account profile, transaction date, signed amount, currency, normalized description, normalized reference, normalized bank reference, and normalized counterparty.
- Bank reference is preferred for high-confidence duplicate detection when present.
- Duplicate rows inside one uploaded file are flagged before import.
- Existing statement transactions are detected as high-confidence or possible duplicates and are blocked in full import mode.
- Partial import can skip invalid, duplicate, and closed-reconciliation rows while reporting skipped counts explicitly.
- Rows overlapping closed reconciliations are blocked; rows overlapping open reconciliations warn the operator before close.
- This does not add live feeds, bank APIs, bank credentials, deposits, card settlements, cheques, payment initiation, or production banking readiness.
