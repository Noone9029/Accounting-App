# DEV-10 Core Report JSON Check Evidence

Date: 2026-05-30

Latest commit inspected before checks: `8f35bf56 Preflight DEV-10 core report JSON checks`

## Approval

Exact approval phrase captured:

`I approve DEV-10 Part 5 local-only core report JSON checks under marker DEV10-RPT-20260530T000000. No production, no beta, no customer data, no CSV, no PDF.`

## Local Target Proof

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

Marker used: `DEV10-RPT-20260530T000000`

The marker fixture existed and had been verified before these checks. Generated-document count before the JSON checks was `0`.

## Checks Performed

The Part 5 runner used local service-level `ReportsService` calls and did not call CSV, PDF, generated-document archive, generated-document download, login, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production, beta, hosted, shared, or customer-data paths.

| Report | Query filters | Expected | Actual | Counts | Result |
| --- | --- | --- | --- | --- | --- |
| General Ledger | `from=2026-05-01`, `to=2026-05-31` | `9` accounts, `10` marker lines | `9` accounts, `10` marker lines | account count `9`; marker line count `10` | Pass |
| General Ledger cash account | `from=2026-05-01`, `to=2026-05-31`, account code `DEV10-1010` | `1` account, `2` lines, closing debit `750.0000` | `1` account, `2` lines, closing debit `750.0000` | line count `2` | Pass |
| Trial Balance | `from=2026-05-01`, `to=2026-05-31` | closing debit `2610.0000`, closing credit `2610.0000`, balanced `true` | closing debit `2610.0000`, closing credit `2610.0000`, balanced `true` | row count `9` | Pass |
| Trial Balance includeZero | `from=2026-05-01`, `to=2026-05-31`, `includeZero=true` | closing debit `2610.0000`, closing credit `2610.0000` | closing debit `2610.0000`, closing credit `2610.0000` | row count `9` | Pass |
| Profit And Loss | `from=2026-05-01`, `to=2026-05-31` | revenue `1000.0000`, COGS `250.0000`, expenses `400.0000`, net profit `350.0000` | revenue `1000.0000`, COGS `250.0000`, expenses `400.0000`, net profit `350.0000` | section count `3` | Pass |
| Balance Sheet | `asOf=2026-05-30` | assets `1960.0000`, liabilities `610.0000`, equity `1000.0000`, retained earnings `350.0000`, balanced `true` | assets `1960.0000`, liabilities `610.0000`, equity `1000.0000`, retained earnings `350.0000`, total liabilities/equity `1960.0000`, balanced `true` | sections present | Pass |
| VAT Summary | `from=2026-05-01`, `to=2026-05-31` | sales VAT `150.0000`, purchase VAT `60.0000`, net VAT payable `90.0000`, non-official note present | sales VAT `150.0000`, purchase VAT `60.0000`, net VAT payable `90.0000`, non-official note present | section count `2` | Pass |
| Dashboard Summary | `from=2026-05-01`, `to=2026-05-31`, `asOf=2026-05-30` | cash `750.0000`, receivables `1150.0000`, payables `460.0000`, revenue `1000.0000`, net VAT payable `90.0000`, basis `POSTED_AND_REVERSED_JOURNALS` | cash `750.0000`, receivables `1150.0000`, payables `460.0000`, revenue `1000.0000`, net VAT payable `90.0000`, basis `POSTED_AND_REVERSED_JOURNALS` | selected dashboard sections checked | Pass |

## Decimal And Rounding Handling

All money checks compared exact four-decimal strings from report results against the Part 2 fixture math. No floating-point tolerance or rounded display values were used as final evidence.

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

- Temporary runner used: `apps/api/scripts/dev10-part5-core-report-json-check.temp.ts`
- Temporary runner status: removed after successful checks.

## Discrepancies

No discrepancies or blockers were found. All selected core report JSON checks passed.

## Recommended Next Step

Continue with `DEV-10 Part 6: core financial report JSON evidence verification`.
