# DEV-10 Aging And VAT Return Check Evidence

Date: 2026-05-30

Latest commit inspected before checks: `d99be86c Preflight DEV-10 aging VAT reports`

## Approval

Exact approval phrase captured:

`I approve DEV-10 Part 8 local-only aging and VAT return report checks under marker DEV10-RPT-20260530T000000. No production, no beta, no customer data, no CSV, no PDF.`

## Local Target Proof

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

Marker used: `DEV10-RPT-20260530T000000`

Generated-document count before checks: `0`

## Checks Performed

The Part 8 runner used local service-level `ReportsService` JSON calls only. It did not call CSV, PDF, generated-document archive, generated-document download, login, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production, beta, hosted, shared, or customer-data paths.

| Report | Query filters | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| Aged Receivables | `asOf=2026-05-30` | row count `1`, bucket `1_30`, bucket total `1150.0000`, grand total `1150.0000` | row count `1`, bucket `1_30`, bucket total `1150.0000`, grand total `1150.0000` | Pass |
| Aged Payables | `asOf=2026-05-30` | row count `1`, bucket `CURRENT`, bucket total `460.0000`, grand total `460.0000` | row count `1`, bucket `CURRENT`, bucket total `460.0000`, grand total `460.0000` | Pass |
| VAT Return | `from=2026-05-01`, `to=2026-05-31` | basis `FINALIZED_SOURCE_DOCUMENTS`, sales count `1`, sales taxable `1000.0000`, output VAT `150.0000`, sales gross `1150.0000`, purchase count `1`, purchase taxable `400.0000`, input VAT `60.0000`, purchase gross `460.0000`, net/payable `90.0000`, refundable `0.0000` | matched expected values | Pass |
| Branch-filtered source-document reports | marker branch with same aging and VAT date filters | AR rows `1`, AR total `1150.0000`, AP rows `1`, AP total `460.0000`, VAT sales docs `1`, VAT purchase docs `1`, VAT net payable `90.0000` | matched expected values | Pass |

## Decimal And Date-Bucket Handling

- Aging checks used fixed `asOf=2026-05-30`.
- Aged Receivables due date `2026-05-20` produced bucket `1_30`.
- Aged Payables due date `2026-06-15` produced bucket `CURRENT`.
- VAT Return money values were compared as exact four-decimal strings.
- No floating-point tolerance was used as final evidence.

## Output And Archive Proof

- CSV called/generated: no.
- PDF called/generated: no.
- Generated-document archive created: no.
- Generated-document download performed: no.
- Generated-document count before checks: `0`.
- Generated-document count after checks: `0`.
- Generated-document delta: `0`.
- Full report payload bodies printed: no.

## Scripts Used

- Temporary runner used: `apps/api/scripts/dev10-part8-aging-vat-check.temp.ts`
- Temporary runner status: removed after successful checks.

## Discrepancies

No discrepancies or blockers were found. All selected aging and VAT Return JSON checks passed.

## Recommended Next Step

Continue with `DEV-10 Part 9: aging and VAT return evidence verification`.

## Part 9 Verification Note

DEV-10 Part 9 completed on 2026-05-30 and is recorded in [DEV_10_AGING_VAT_RETURN_EVIDENCE_VERIFICATION.md](DEV_10_AGING_VAT_RETURN_EVIDENCE_VERIFICATION.md). The read-only evidence review confirmed that Aged Receivables, Aged Payables, VAT Return, and branch-filtered source-document totals match Part 2 fixture math, generated-document delta stayed `0`, no output generation occurred, no full payload bodies or secrets were present, and no Part 8 temp script remains. No discrepancies or blockers were found.
