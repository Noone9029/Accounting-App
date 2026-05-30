# DEV-09 Statement Import Parser Check Evidence

Status: completed approved local synthetic parser/preview checks
Date: 2026-05-30
Latest commit inspected: `aeeb8c18 Plan DEV-09 statement import parser checks`
Marker: `DEV09-BANK-20260530T000000`

## Approval

Exact approval phrase received and validated before running the local synthetic checks:

`I approve DEV-09 Part 5 local-only synthetic statement import parser checks under marker DEV09-BANK-20260530T000000. No production, no beta, no customer data.`

## Local Target Proof

The runner classified the active database target without printing credentials or the full URL:

| Scheme | Host | Port | Database | Local |
| --- | --- | --- | --- | --- |
| `postgresql` | `localhost` | `5432` | `accounting` | yes |

No production, beta, hosted/shared, or customer-data target was used.

## Parser Results

All inputs were inline synthetic strings. No real bank file, uploaded file, customer file, or body dump was used.

| Label | Detected format | Parsed rows | Warnings | Detected columns |
| --- | --- | ---: | ---: | ---: |
| CSV | `CSV` | 2 | 0 | 8 |
| JSON | `JSON` | 2 | 0 | 6 |
| OFX | `OFX` | 1 | 0 | 6 |
| CAMT | `CAMT` | 1 | 0 | 6 |
| MT940 | `MT940` | 1 | 0 | 4 |
| UNKNOWN | `UNKNOWN` | 0 | 1 | 0 |
| INVALID_JSON | `JSON` | 0 | 1 | 0 |

## Preview Results

Preview checks ran against the marker bank profile and did not persist imports or transactions.

| Preview | Row count | Valid rows | Invalid rows | Warnings | Credits | Debits |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Valid synthetic CSV | 2 | 2 | 0 | 0 | 42.0000 | 12.5000 |
| Duplicate in file | 2 | 1 | 1 | 0 | 11.0000 | 0.0000 |
| Existing duplicate | 1 | 1 | 0 | 1 | 100.0000 | 0.0000 |
| Invalid row | 1 | 0 | 1 | 0 | 0.0000 | 0.0000 |

Duplicate/idempotency evidence:

- In-file duplicate preview produced one invalid row.
- Existing marker duplicate preview produced one warning without creating a row.
- Invalid input produced one invalid row without creating a row.
- This proves preview-level duplicate/invalid handling only; it is not a production bank-file idempotency certification.

## Persistence Check

Marker-scoped counts before and after parser/preview checks:

| Family | Before | After | Delta |
| --- | ---: | ---: | ---: |
| statement imports | 1 | 1 | 0 |
| statement transactions | 3 | 3 | 0 |
| audit logs | 0 | 0 | 0 |
| journal entries | 1 | 1 | 0 |
| reconciliations | 0 | 0 | 0 |

Persisted import run: no.

## Side-Effect Boundary

- Runtime mutation performed: no persisted import or domain mutation.
- Approved local synthetic checks performed: yes, parser and preview only.
- Production/beta/shared target used: no.
- Customer data used: no.
- Real bank file used: no.
- File/body/secret output printed: no.
- Match/categorize/ignore run: no.
- Reconciliation lifecycle run: no.
- E2E/smoke/full tests run: no.
- Targeted parser tests run: no, because no parser code changed.

## Temporary Runner Cleanup

Temporary runner used:

- `apps/api/scripts/dev09-part5-parser-check.temp.ts`

Cleanup status:

- Removed after the run.
- No committed script change is required for Part 5.

## Next Step

Proceed to `DEV-09 Part 6: statement import parser evidence verification`.
