# DEV-10 Report Fixture Mutation Evidence

Date: 2026-05-30

Latest commit inspected before mutation: `311f5dfd Preflight DEV-10 reports financial statements`

## Approval

Exact approval phrase captured:

`I approve DEV-10 Part 2 local-only reports fixture creation under marker DEV10-RPT-20260530T000000. No production, no beta, no customer data.`

## Local Target Proof

The Part 2 runner classified the database target before opening Prisma:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

No hosted Supabase, production, beta, shared, or customer-data URL was used. No Redis target was needed for this fixture creation.

## Marker

Marker used: `DEV10-RPT-20260530T000000`

## Fixture Rows Created

The marker organization did not already exist, so the runner created the synthetic fixture dataset.

| Row type | Count | Notes |
| --- | ---: | --- |
| Organizations | 1 | `DEV10-RPT-20260530T000000 Org` |
| Users | 1 | `dev10.rpt.20260530@ledgerbyte.local.test` |
| Memberships | 1 | Local synthetic member with a DEV-10 report role |
| Accounts | 9 | Cash/bank, AR, AP, VAT output, VAT input, equity, revenue, COGS, operating expense |
| Tax rates | 2 | Sales VAT 15 and Purchase VAT 15 |
| Branches | 1 | Synthetic Riyadh branch |
| Contacts | 2 | One synthetic customer and one synthetic supplier |
| Bank account profiles | 1 | Synthetic active bank profile for dashboard cash summary |
| Journal entries | 4 | All marker journals are posted |
| Journal lines | 10 | All marker journals balance |
| Sales invoices | 1 | Finalized, open balance, VAT-bearing |
| Purchase bills | 1 | Finalized, open balance, VAT-bearing |
| Generated documents | 0 | No CSV/PDF/archive/download output was generated |
| Audit logs | 0 | Direct local fixture creation did not invoke app audit-log services |

Safe id prefixes recorded by the runner:

| Record | Safe prefix |
| --- | --- |
| Organization | `cbc668af...` |
| User | `858fc0e4...` |
| Branch | `0763c6f5...` |

## Expected Report Math

Fixed report period: `2026-05-01` through `2026-05-31`

Fixed report as-of date: `2026-05-30`

| Report area | Expected value |
| --- | --- |
| General Ledger marker posted entries | `4` |
| General Ledger marker posted lines | `10` |
| Trial Balance closing debit | `2610.0000` |
| Trial Balance closing credit | `2610.0000` |
| Trial Balance balanced | `true` |
| P&L revenue | `1000.0000` |
| P&L cost of sales | `250.0000` |
| P&L expenses | `400.0000` |
| P&L net profit | `350.0000` |
| Balance Sheet assets | `1960.0000` |
| Balance Sheet liabilities | `610.0000` |
| Balance Sheet equity | `1000.0000` |
| Balance Sheet retained earnings | `350.0000` |
| Balance Sheet balanced | `true` |
| VAT output | `150.0000` |
| VAT input | `60.0000` |
| VAT net payable | `90.0000` |
| Aged Receivables open balance | `1150.0000` |
| Aged Receivables expected bucket as of `2026-05-30` | `1_30` |
| Aged Payables open balance | `460.0000` |
| Aged Payables expected bucket as of `2026-05-30` | `CURRENT` |

## Audit And Output Impact

- Runtime mutation performed: yes, local-only synthetic fixture rows were created.
- Audit-log impact visible from the runner: `0` marker organization audit logs.
- Report output generated: no.
- CSV generated or downloaded: no.
- PDF generated or downloaded: no.
- Generated-document archive rows created: no.
- Generated-document downloads performed: no.
- Email, ZATCA, backup, restore, deployment, migration, seed/reset/delete, E2E, smoke, and login flows were not used.

## Scripts Used

- Temporary runner used: `apps/api/scripts/dev10-part2-report-fixture.temp.ts`
- Temporary runner status: removed after successful fixture creation.

Direct Prisma creation was used because this prompt needed deterministic local report math and explicitly forbade login, E2E, smoke, CSV/PDF/download/archive output, and broad runtime flows. The resulting records match report-service invariants: finalized AR/AP source documents, posted balanced journals, active accounts, active tax rates, and active bank profile data.

## Production/Beta/Customer-Data Proof

This evidence is local-only. It does not prove production, beta, hosted, shared, customer-data, concurrency, load, or accountant-reviewed behavior.

## Recommended Next Step

Continue with `DEV-10 Part 3: report fixture evidence verification` as a read-only verification of the marker rows and expected math.

## Part 3 Verification Note

DEV-10 Part 3 completed on 2026-05-30 and is recorded in [DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md). The read-only verifier confirmed the marker organization on `localhost:5432/accounting`, counts matched the Part 2 fixture summary, all four marker journals were `POSTED` and balanced, generated-document count remained `0`, and no CSV/PDF/archive/download output was generated. No discrepancies or blockers were found.
