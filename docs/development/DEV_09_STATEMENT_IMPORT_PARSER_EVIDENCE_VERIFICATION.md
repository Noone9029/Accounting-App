# DEV-09 Statement Import Parser Evidence Verification

Status: completed read-only verification
Date: 2026-05-30
Latest commit inspected: `b5d5dcd8 Check DEV-09 synthetic statement import parser`
Marker: `DEV09-BANK-20260530T000000`

## Scope

This part rechecked the Part 5 synthetic parser and preview evidence. It was read-only and did not persist an import.

Actions not performed: persisted import, statement transaction mutation, match, categorize, ignore, reconciliation mutation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, production/beta/shared target access, customer-data access, real bank file access, output generation, download, PDF generation, email, ZATCA, backup, restore, or body/secret printing.

## Local Target Proof

Read-only verifier target classification:

| Scheme | Host | Port | Database | Local |
| --- | --- | --- | --- | --- |
| `postgresql` | `localhost` | `5432` | `accounting` | yes |

## Parser Evidence Recheck

The parser results matched Part 5:

| Label | Detected format | Parsed rows | Warnings |
| --- | --- | ---: | ---: |
| CSV | `CSV` | 2 | 0 |
| JSON | `JSON` | 2 | 0 |
| OFX | `OFX` | 1 | 0 |
| CAMT | `CAMT` | 1 | 0 |
| MT940 | `MT940` | 1 | 0 |
| UNKNOWN | `UNKNOWN` | 0 | 1 |
| INVALID_JSON | `JSON` | 0 | 1 |

## Preview Evidence Recheck

The preview results matched Part 5:

| Preview | Row count | Valid rows | Invalid rows | Warnings |
| --- | ---: | ---: | ---: | ---: |
| Valid synthetic CSV | 2 | 2 | 0 | 0 |
| Duplicate in file | 2 | 1 | 1 | 0 |
| Existing duplicate | 1 | 1 | 0 | 1 |
| Invalid row | 1 | 0 | 1 | 0 |

## Persistence Recheck

Marker-scoped counts stayed unchanged during the Part 6 verifier:

| Family | Before | After | Delta |
| --- | ---: | ---: | ---: |
| statement imports | 1 | 1 | 0 |
| statement transactions | 3 | 3 | 0 |
| audit logs | 0 | 0 | 0 |
| journal entries | 1 | 1 | 0 |
| reconciliations | 0 | 0 | 0 |

## Verification Conclusion

- Parser counts match the Part 5 evidence.
- Duplicate in-file behavior matches the Part 5 evidence.
- Existing duplicate warning behavior matches the Part 5 evidence.
- Invalid input behavior matches the Part 5 evidence.
- No real file/customer data/body exposure occurred.
- No temp files or temp scripts remain after cleanup.

## Temporary Runner Cleanup

Temporary verifier used:

- `apps/api/scripts/dev09-part6-parser-verification.temp.ts`

Cleanup status:

- Removed after read-only verification.
- No committed script change is required for Part 6.

## Next Step

Proceed to `DEV-09 Part 7: bank transaction match categorize ignore preflight`.
