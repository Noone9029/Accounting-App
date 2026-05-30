# DEV-10 Aging And VAT Return Evidence Verification

Date: 2026-05-30

Latest commit inspected: `ff560cd9 Check DEV-10 aging VAT reports`

## Verification Method

This was a read-only evidence verification of DEV-10 Part 8. I reviewed:

- [DEV_10_AGING_VAT_RETURN_PREFLIGHT.md](DEV_10_AGING_VAT_RETURN_PREFLIGHT.md)
- [DEV_10_AGING_VAT_RETURN_CHECK_EVIDENCE.md](DEV_10_AGING_VAT_RETURN_CHECK_EVIDENCE.md)
- [DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md](DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md)
- [DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md)

No aging/VAT report checks were rerun. No fixture data was created, modified, deleted, exported, downloaded, rendered to PDF, archived, or queried through output endpoints.

## Marker And Target Consistency

Marker is consistent: `DEV10-RPT-20260530T000000`.

Local target proof is consistent: `postgresql` on `localhost:5432/accounting`, classified local-only.

## Per-Report Verification Status

| Report | Verification result |
| --- | --- |
| Aged Receivables | Pass. Evidence reports one row, bucket `1_30`, bucket total `1150.0000`, and grand total `1150.0000`, matching Part 2 fixture math. |
| Aged Payables | Pass. Evidence reports one row, bucket `CURRENT`, bucket total `460.0000`, and grand total `460.0000`, matching Part 2 fixture math. |
| VAT Return | Pass. Evidence reports basis `FINALIZED_SOURCE_DOCUMENTS`, output VAT `150.0000`, input VAT `60.0000`, net/payable `90.0000`, refundable `0.0000`, and one finalized sales and purchase source document. |
| Branch-filtered source-document reports | Pass. Evidence reports one AR row, one AP row, one VAT sales document, one VAT purchase document, and matching totals for the marker branch. |

## Date-Bucket And VAT Math Verification

- Aged Receivables due date `2026-05-20` with `asOf=2026-05-30` matches bucket `1_30`.
- Aged Payables due date `2026-06-15` with `asOf=2026-05-30` matches bucket `CURRENT`.
- VAT Return sales taxable `1000.0000` and output VAT `150.0000` match the finalized sales invoice fixture.
- VAT Return purchase taxable `400.0000` and input VAT `60.0000` match the finalized purchase bill fixture.
- Net VAT payable `90.0000` equals output VAT `150.0000` minus input VAT `60.0000`.

## Output Generation Proof

Part 8 evidence states:

- CSV called/generated: no.
- PDF called/generated: no.
- Generated-document archive created: no.
- Generated-document download performed: no.
- Generated-document count before checks: `0`.
- Generated-document count after checks: `0`.
- Generated-document delta: `0`.
- Full report payload bodies printed: no.

## Body And Secret Safety

The evidence uses selected totals, row counts, bucket names, date filters, source-document counts, and pass/fail summaries. It does not include full report JSON bodies, customer/supplier body data, CSV bodies, PDF bytes, generated-document base64, DB URLs, auth headers, cookies, tokens, or secrets. A search found only policy wording for forbidden body/secret terms, not secret values or payload bodies.

## Temp Script Status

Temporary Part 8 runner: `apps/api/scripts/dev10-part8-aging-vat-check.temp.ts`

Status: removed. No `*dev10-part8*` script remains under `apps/api/scripts`.

## Discrepancies Or Blockers

No discrepancies or blockers were found in the Part 9 verification.

## Recommended Next Step

Continue with `DEV-10 Part 10: report output, CSV, PDF, archive, and permission gate preflight`.
