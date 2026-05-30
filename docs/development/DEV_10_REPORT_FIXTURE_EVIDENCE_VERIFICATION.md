# DEV-10 Report Fixture Evidence Verification

Date: 2026-05-30

Latest commit inspected before verification: `77e55d1a Create DEV-10 report fixtures`

## Scope

This was a read-only verification of the marker-scoped DEV-10 report fixture. No fixture rows were created, modified, deleted, exported, downloaded, rendered to PDF, archived, or queried through report output endpoints.

## Marker And Local Target

Marker verified: `DEV10-RPT-20260530T000000`

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

No production, beta, hosted, shared, or customer-data target was referenced.

## Read-Only Verification Method

A temporary read-only Prisma verifier counted marker rows and checked posted/balanced journal status. The script did not call report JSON, CSV, PDF, generated-document archive, generated-document download, login, E2E, smoke, migration, seed/reset/delete, deploy, ZATCA, email, backup, or restore paths. The temporary verifier was removed after the check.

## Counts Checked

| Row type | Verified count |
| --- | ---: |
| Organizations | 1 |
| Users | 1 |
| Memberships | 1 |
| Accounts | 9 |
| Tax rates | 2 |
| Branches | 1 |
| Contacts | 2 |
| Journal entries | 4 |
| Journal lines | 10 |
| Sales invoices | 1 |
| Purchase bills | 1 |
| Generated documents | 0 |
| Audit logs | 0 |

## Balance And Status Checks

| Entry | Status | Line count | Balanced |
| --- | --- | ---: | --- |
| `DEV10-RPT-JE-001` | `POSTED` | 2 | `true` |
| `DEV10-RPT-JE-002` | `POSTED` | 3 | `true` |
| `DEV10-RPT-JE-003` | `POSTED` | 3 | `true` |
| `DEV10-RPT-JE-004` | `POSTED` | 2 | `true` |

All marker journals are posted and balanced. Posted statuses match report eligibility for the core journal-backed report services.

## Expected Totals Checked

The Part 2 expected math is internally consistent:

- Trial Balance expected closing debit and credit both equal `2610.0000`.
- P&L expected net profit is `350.0000` from revenue `1000.0000`, COGS `250.0000`, and expenses `400.0000`.
- Balance Sheet expected assets `1960.0000` equals liabilities `610.0000` plus equity `1000.0000` plus retained earnings `350.0000`.
- VAT expected output `150.0000` minus input `60.0000` equals net payable `90.0000`.
- Aged Receivables expected open balance is `1150.0000` in bucket `1_30` as of `2026-05-30`.
- Aged Payables expected open balance is `460.0000` in bucket `CURRENT` as of `2026-05-30`.

## Generated Documents And Output Proof

- Generated-document count for the marker organization before output gates: `0`.
- Report CSV generated: no.
- Report PDF generated: no.
- Generated-document archive created: no.
- Generated-document download performed: no.
- Full payload bodies printed: no.

## Discrepancies

No discrepancies or blockers were found in the Part 3 fixture verification.

## Temp Script Status

Temporary verifier used: `apps/api/scripts/dev10-part3-fixture-verification.temp.ts`

Temporary verifier status: removed after the read-only verification.

## Recommended Next Step

Continue with `DEV-10 Part 4: core financial report JSON check preflight`.
