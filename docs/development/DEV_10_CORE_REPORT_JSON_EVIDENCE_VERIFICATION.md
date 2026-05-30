# DEV-10 Core Report JSON Evidence Verification

Date: 2026-05-30

Latest commit inspected: `654ce43c Check DEV-10 core report JSON`

## Verification Method

This was a read-only evidence verification of DEV-10 Part 5. I reviewed:

- [DEV_10_CORE_REPORT_JSON_PREFLIGHT.md](DEV_10_CORE_REPORT_JSON_PREFLIGHT.md)
- [DEV_10_CORE_REPORT_JSON_CHECK_EVIDENCE.md](DEV_10_CORE_REPORT_JSON_CHECK_EVIDENCE.md)
- [DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md](DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md)
- [DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md)

No broad report checks were rerun. No fixture data was created, modified, deleted, exported, downloaded, rendered to PDF, archived, or queried through output endpoints.

## Local Target And Marker Consistency

Marker is consistent across the Part 2, Part 3, Part 4, and Part 5 evidence: `DEV10-RPT-20260530T000000`.

Local target proof is consistent: `postgresql` on `localhost:5432/accounting`, classified local-only.

## Per-Report Verification Status

| Report | Verification result |
| --- | --- |
| General Ledger | Pass. Evidence reports `9` accounts and `10` marker lines, matching the verified fixture journal count. |
| General Ledger cash account | Pass. Evidence reports account code `DEV10-1010`, `2` lines, and closing debit `750.0000`. |
| Trial Balance | Pass. Closing debit `2610.0000` equals closing credit `2610.0000`; balanced flag is `true`. |
| Trial Balance includeZero | Pass. Totals remain `2610.0000` debit and `2610.0000` credit. |
| Profit And Loss | Pass. Revenue `1000.0000` less COGS `250.0000` and expenses `400.0000` equals net profit `350.0000`. |
| Balance Sheet | Pass. Assets `1960.0000` equal total liabilities/equity `1960.0000`; retained earnings `350.0000` matches P&L net profit. |
| VAT Summary | Pass. Sales VAT `150.0000` minus purchase VAT `60.0000` equals net payable `90.0000`; non-official VAT note is present. |
| Dashboard Summary | Pass. Cash `750.0000`, AR `1150.0000`, AP `460.0000`, revenue `1000.0000`, net VAT payable `90.0000`, and ledger basis `POSTED_AND_REVERSED_JOURNALS` match fixture math. |

## Output Generation Proof

Part 5 evidence states:

- CSV called/generated: no.
- PDF called/generated: no.
- Generated-document archive created: no.
- Generated-document download performed: no.
- Generated-document count before checks: `0`.
- Generated-document count after checks: `0`.
- Generated-document delta: `0`.
- Full report payload bodies printed: no.

## Body And Secret Safety

The evidence uses selected totals, row counts, section counts, status values, safe account codes, and pass/fail summaries. It does not include CSV bodies, PDF bytes, generated-document base64, full report JSON bodies, DB URLs, auth headers, cookies, tokens, or secrets. A search found only policy wording for forbidden body/secret terms, not secret values or payload bodies.

## Temp Script Status

Temporary Part 5 runner: `apps/api/scripts/dev10-part5-core-report-json-check.temp.ts`

Status: removed. No `*dev10-part5*` script remains under `apps/api/scripts`.

## Discrepancies Or Blockers

No discrepancies or blockers were found in the Part 6 verification.

## Recommended Next Step

Continue with `DEV-10 Part 7: aging and VAT return report preflight`.
