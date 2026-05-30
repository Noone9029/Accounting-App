# DEV-10 Core Report JSON Check Preflight

Date: 2026-05-30

Latest commit inspected: `23481ee4 Verify DEV-10 report fixtures`

## 1. Purpose And Scope

This preflight defines the DEV-10 Part 5 local JSON checks for core financial reports against the marker fixture `DEV10-RPT-20260530T000000`. It is planning only. No runtime report calls, login, fixture mutation, CSV export, PDF generation, generated-document archive, generated-document download, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production target, beta target, or customer data was used.

## 2. Safety Rules

- Query only the local marker organization created in Part 2 and verified in Part 3.
- Confirm the database target is `postgresql` on `localhost:5432/accounting` before any Part 5 read.
- Use service-level JSON checks where possible to avoid auth token/cookie exposure and login/audit-writing flows.
- Do not call `format=csv` or `/pdf` endpoints in Part 5.
- Do not call generated-document archive/download paths in Part 5.
- Do not print full JSON payloads. Record only report name, filters, counts, selected totals, pass/fail, and discrepancy summaries.
- Compare decimal strings exactly at four decimal places; do not use floating-point approximations as evidence.
- Keep production, beta, hosted/shared, and customer data out of scope.

## 3. Report Endpoint And Method Map

| Report | API endpoint | Service method | UI route | Part 5 output |
| --- | --- | --- | --- | --- |
| General Ledger | `GET /reports/general-ledger` | `ReportsService.generalLedger` | `/reports/general-ledger` | JSON summary only |
| Trial Balance | `GET /reports/trial-balance` | `ReportsService.trialBalance` | `/reports/trial-balance` | JSON summary only |
| Profit And Loss | `GET /reports/profit-and-loss` | `ReportsService.profitAndLoss` | `/reports/profit-and-loss` | JSON summary only |
| Balance Sheet | `GET /reports/balance-sheet` | `ReportsService.balanceSheet` | `/reports/balance-sheet` | JSON summary only |
| VAT Summary | `GET /reports/vat-summary` | `ReportsService.vatSummary` | `/reports/vat-summary` | JSON summary only |
| Dashboard Summary | `GET /reports/dashboard-summary` or service-level call | `ReportsService.dashboardSummary` | No committed report page; dashboard has `/dashboard` via `DashboardService.summary` | JSON summary only |

## 4. Fixture Marker And Dependencies

Fixture marker: `DEV10-RPT-20260530T000000`

Verified dependencies:

- One local synthetic organization.
- Nine active accounts: cash/bank, AR, AP, VAT output code `220`, VAT input code `230`, equity, revenue, COGS, and operating expense.
- Four posted balanced marker journals with ten journal lines.
- One finalized VAT-bearing sales invoice with open AR balance.
- One finalized VAT-bearing purchase bill with open AP balance.
- One active bank profile for dashboard cash summary.
- One branch fixture for later branch-filter checks.
- Generated-document count before output gates: `0`.

## 5. Planned Query Filters

| Report | Planned filters | Notes |
| --- | --- | --- |
| General Ledger | `from=2026-05-01`, `to=2026-05-31` | Expect marker accounts and ten marker lines. |
| General Ledger account-focused check | Same range plus marker cash account id resolved inside script | Record only safe account code and line count, not full line bodies. |
| Trial Balance | `from=2026-05-01`, `to=2026-05-31` | Expect closing debit equals closing credit. |
| Trial Balance include-zero check | Same range plus `includeZero=true` | Should not change totals; row count may include additional zero rows only if fixture has any. |
| Profit And Loss | `from=2026-05-01`, `to=2026-05-31` | Expect revenue, COGS, expense, and net profit. |
| Balance Sheet | `asOf=2026-05-30` | Expect balanced assets/liabilities/equity/retained earnings. |
| VAT Summary | `from=2026-05-01`, `to=2026-05-31` | Expect VAT output/input/net from accounts `220` and `230`. |
| Dashboard Summary | `from=2026-05-01`, `to=2026-05-31`, `asOf=2026-05-30` | Include only if service-level read remains local and body-safe. |

Branch-specific journal reports are not selected for Part 5 because the current `journalEntryBranchFilter` only maps selected source relations. That risk remains documented for later branch coverage.

## 6. Expected JSON Evidence

| Report | Evidence to record | Expected values |
| --- | --- | --- |
| General Ledger | account count, marker line count, selected account totals | `10` marker journal lines across fixture accounts |
| Trial Balance | row count, closing debit, closing credit, balanced flag | Debit `2610.0000`, credit `2610.0000`, balanced `true` |
| Profit And Loss | section count, revenue, COGS, expenses, net profit | Revenue `1000.0000`, COGS `250.0000`, expenses `400.0000`, net profit `350.0000` |
| Balance Sheet | section totals, retained earnings, equality flag | Assets `1960.0000`, liabilities `610.0000`, equity `1000.0000`, retained earnings `350.0000`, balanced `true` |
| VAT Summary | section count, sales VAT, purchase VAT, net VAT payable, non-official note presence | Sales VAT `150.0000`, purchase VAT `60.0000`, net payable `90.0000`, warning note present |
| Dashboard Summary | cash, receivables, payables, revenue, VAT, ledger basis | Cash `750.0000`, receivables `1150.0000`, payables `460.0000`, revenue `1000.0000`, net VAT payable `90.0000`, basis `POSTED_AND_REVERSED_JOURNALS` |

Part 5 evidence must record pass/fail and discrepancies only. It must not include full report bodies, full journal descriptions, full customer/vendor details, CSV content, PDF bytes, base64, secrets, DB URLs, tokens, cookies, or auth headers.

## 7. Tolerance And Precision Rules

- Treat report money fields as decimal strings.
- Expected values must be compared as exact four-decimal strings.
- Do not convert evidence to JavaScript floating-point numbers for final pass/fail.
- Currency remains `SAR` from the marker organization.
- Date filters use fixed UTC date labels: `2026-05-01`, `2026-05-30`, and `2026-05-31`.

## 8. Risks And Blockers

- Branch-scoped journal reports may omit manual/banking/inventory journal entries not connected through the currently listed source relations.
- VAT Summary and VAT Return can diverge if VAT account journals and finalized source documents diverge; Part 5 covers VAT Summary only.
- Dashboard Summary is service-level and not the same as the richer `/dashboard/summary` route from `DashboardService`.
- Full UI/browser behavior and E2E coverage remain out of scope for Part 5.
- Output gates remain out of scope until Part 10/Part 11.

## 9. Proposed Part 5 Execution Method

Use a temporary local script `apps/api/scripts/dev10-part5-core-report-json-check.temp.ts` that:

1. Loads and classifies the local DB target without printing the URL.
2. Finds the marker organization and required account ids.
3. Instantiates `ReportsService` with a local Prisma client.
4. Calls only JSON service methods: `generalLedger`, `trialBalance`, `profitAndLoss`, `balanceSheet`, `vatSummary`, and `dashboardSummary`.
5. Builds sanitized evidence with filters, counts, expected totals, actual totals, and pass/fail.
6. Confirms generated-document count remains unchanged at `0`.
7. Deletes the temp script before commit.

## 10. Recommended Next Step

Continue with `DEV-10 Part 5: approved local core financial report JSON checks` only because the exact Part 5 approval phrase has been supplied. Part 5 should remain local-only, JSON-only, and body-safe.
