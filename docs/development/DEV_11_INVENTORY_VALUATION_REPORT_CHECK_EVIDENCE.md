# DEV-11 Inventory Valuation Report Check Evidence

Date: 2026-05-30

Latest commit inspected: `45f7d361 Preflight DEV-11 inventory valuation reports`

Marker: `DEV11-INV-20260530T000000`

## 1. Approval Text Used

`I approve DEV-11 Part 14 local-only inventory valuation report checks under marker DEV11-INV-20260530T000000. No production, no beta, no customer data, no CSV, no PDF, no download/archive output.`

The exact approval text was validated before any report read.

## 2. Local Target Proof

| Check | Result |
| --- | --- |
| Database scheme | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Classification | `local-only accepted` |

The checker rejected non-local, hosted/provider-looking, production, beta, or customer-data targets before any database read. No hosted/provider target was used.

## 3. Marker And Safe IDs

| Component | Safe ID prefix |
| --- | --- |
| Organization | `837b9c13` |
| Item | `27398986` |
| Warehouse | `0b519fab` |
| Purchase bill | `6d84a149` |
| Purchase receipt | `a413ac33` |
| Sales stock issue | `c3d25519` |
| Variance proposal | `141aa064` |
| COGS source/reversal journals | `8459b09e` / `8b8c57c5` |
| Receipt asset source/reversal journals | `f85f869e` / `e3c196d7` |
| Variance source/reversal journals | `267366ad` / `1270a557` |

## 4. Pre-Check Counts

| Area | Before | After |
| --- | ---: | ---: |
| Organizations | 1 | 1 |
| Accounts | 9 | 9 |
| Inventory settings | 1 | 1 |
| Items | 1 | 1 |
| Warehouses | 1 | 1 |
| Stock movements | 3 | 3 |
| Purchase bills | 1 | 1 |
| Purchase receipts | 1 | 1 |
| Sales stock issues | 1 | 1 |
| Variance proposals | 1 | 1 |
| Variance proposal events | 5 | 5 |
| Journal entries | 7 | 7 |
| Journal lines | 14 | 14 |
| Generated documents | 0 | 0 |
| Audit logs | 9 | 9 |

## 5. Inventory Valuation Report Results

Service called: `InventoryService.stockValuationReport`.

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Row count | 1 | 1 |
| Valuation method | `MOVING_AVERAGE` | `MOVING_AVERAGE` |
| Calculation method | `MOVING_AVERAGE` | `MOVING_AVERAGE` |
| Quantity on hand | `25.0000` | `25.0000` |
| Average unit cost | `10.0000` | `10.0000` |
| Estimated value | `250.0000` | `250.0000` |
| Grand total estimated value | `250.0000` | `250.0000` |

The stock valuation report produced one operational-only warning, as expected for the current inventory accounting boundary.

## 6. Movement Summary Results

Service called: `InventoryService.movementSummaryReport`.

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Row count | 1 | 1 |
| Opening quantity | `0.0000` | `0.0000` |
| Inbound quantity | `30.0000` | `30.0000` |
| Outbound quantity | `5.0000` | `5.0000` |
| Closing quantity | `25.0000` | `25.0000` |
| Movement count | 3 | 3 |

Movement breakdown:

| Movement type | Inbound | Outbound | Net | Count |
| --- | ---: | ---: | ---: | ---: |
| `OPENING_BALANCE` | `20.0000` | `0.0000` | `20.0000` | 1 |
| `PURCHASE_RECEIPT_PLACEHOLDER` | `10.0000` | `0.0000` | `10.0000` | 1 |
| `SALES_ISSUE_PLACEHOLDER` | `0.0000` | `5.0000` | `-5.0000` | 1 |

## 7. Low-Stock Result

Service called: `InventoryService.lowStockReport`.

The marker item has reorder point `5.0000` and reorder quantity `10.0000`. The low-stock report returned `0` rows because marker quantity on hand is `25.0000`, above the reorder point. This is not a discrepancy.

## 8. Clearing Reconciliation Results

Service called: `InventoryClearingReportService.clearingReconciliationReport`.

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Row count | 1 | 1 |
| Status | `BILL_WITHOUT_RECEIPT_POSTING` | `BILL_WITHOUT_RECEIPT_POSTING` |
| Bill clearing debit | `90.0000` | `90.0000` |
| Active receipt clearing credit | `0.0000` | `0.0000` |
| Net clearing difference | `90.0000` | `90.0000` |
| Clearing account period debit | `280.0000` | `280.0000` |
| Clearing account period credit | `190.0000` | `190.0000` |
| Clearing account balance | `90.0000` | `90.0000` |
| Difference between GL and report | `0.0000` | `0.0000` |

## 9. Clearing Variance Results

Service called: `InventoryClearingReportService.clearingVarianceReport`.

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Row count | 2 | 2 |
| First matching variance amount | `90.0000` | `90.0000` |
| Total variance amount | `190.0000` | `190.0000` |

The second row is the expected reversed-receipt warning amount of `100.0000`; the approved variance proposal source/reversal journals do not remove that report warning because the receipt asset posting remains reversed.

## 10. GL, Trial Balance, P&L, Balance Sheet Results

Services called: `ReportsService.generalLedger`, `ReportsService.trialBalance`, `ReportsService.profitAndLoss`, and `ReportsService.balanceSheet`.

General Ledger account summary:

| Account | Period debit | Period credit | Closing debit | Closing credit | Lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| AP `210` | `0.0000` | `90.0000` | `0.0000` | `90.0000` | 1 |
| Inventory Clearing `240` | `280.0000` | `190.0000` | `90.0000` | `0.0000` | 5 |
| COGS `DEV11-5000` | `50.0000` | `50.0000` | `0.0000` | `0.0000` | 2 |
| Inventory Asset `DEV11-1200` | `150.0000` | `150.0000` | `0.0000` | `0.0000` | 4 |
| Adjustment Loss `DEV11-5100` | `90.0000` | `90.0000` | `0.0000` | `0.0000` | 2 |
| Adjustment Gain `DEV11-4100` | `0.0000` | `0.0000` | `0.0000` | `0.0000` | 0 |

Trial Balance result:

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Account count | 9 | 9 |
| Period debit | `570.0000` | `570.0000` |
| Period credit | `570.0000` | `570.0000` |
| Closing debit | `90.0000` | `90.0000` |
| Closing credit | `90.0000` | `90.0000` |
| Balanced | `true` | `true` |

Profit and Loss result:

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Revenue | `0.0000` | `0.0000` |
| Cost of sales | `0.0000` | `0.0000` |
| Expenses | `0.0000` | `0.0000` |
| Net profit | `0.0000` | `0.0000` |
| COGS `DEV11-5000` amount | `0.0000` | `0.0000` |
| Adjustment Loss `DEV11-5100` amount | `0.0000` | `0.0000` |

Balance Sheet result:

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Total assets | `0.0000` | `0.0000` |
| Total liabilities and equity | `0.0000` | `0.0000` |
| Retained earnings | `0.0000` | `0.0000` |
| Difference | `0.0000` | `0.0000` |
| Balanced | `true` | `true` |
| Inventory Asset `DEV11-1200` | `0.0000` | `0.0000` |
| Inventory Clearing `240` | `-90.0000` | `-90.0000` |
| AP `210` | `90.0000` | `90.0000` |

The operational stock valuation of `250.0000` and the Inventory Asset GL closing balance of `0.0000` intentionally differ. Operational stock movements estimate current quantity/value; financial statements use posted and reversed journals only.

## 11. Dashboard Summary Result

Service called: `ReportsService.dashboardSummary`.

The dashboard summary was checked only as a high-level JSON summary:

| Metric | Actual |
| --- | ---: |
| Ledger basis | `POSTED_AND_REVERSED_JOURNALS` |
| Receivables total/count | `125.0000` / 1 |
| Payables total/count | `90.0000` / 1 |
| Cash and bank balance/account count | `0.0000` / 0 |
| Revenue current period | `0.0000` |
| VAT output/input/net | `0.0000` / `0.0000` / `0.0000` |

No dashboard source-document bodies were printed.

## 12. Discrepancies/Blockers

No application discrepancies or blockers were found.

Expected clarifications:

- Low-stock returned `0` rows because the marker item is above its reorder point.
- Clearing variance total is `190.0000` because it includes the `90.0000` clearing difference plus the expected `100.0000` reversed-receipt warning amount.
- Operational inventory valuation remains `250.0000` while Inventory Asset GL remains `0.0000`; this is the intended operational-vs-accounting boundary for DEV-11 after all approved posting checks were reversed.

## 13. No CSV/PDF/Download/Archive/Body Output Guarantee

The check used only in-process JSON service methods and direct count/account-summary reads. It did not call CSV methods, PDF methods, generated-document download/archive paths, browser routes, login flows, or controller export paths.

The checker output contained only safe target classification, safe ID prefixes, counts, report names, statuses, account codes, and numeric totals. It did not print DB URLs, tokens, auth headers, cookies, secrets, request bodies, response bodies, report row bodies, customer/vendor payload bodies, audit bodies, CSV bodies, PDF bytes, generated-document base64, or attachment bodies.

## 14. No Production/Beta/Customer-Data Guarantee

All reads ran against the synthetic marker organization on `localhost:5432/accounting`. No production, beta, hosted/shared, provider, or customer-data target was used.

## 15. Commands Run

- `git log -1 --oneline`
- `corepack pnpm --dir apps/api exec -- tsx scripts/dev11-part14-inventory-report-check.temp.ts`
- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check`

## 16. Commands Skipped

- Runtime mutation commands
- Fixture creation
- Posting/reversal/void/proposal lifecycle actions
- CSV generation
- PDF generation
- Generated-document download/archive reads
- Browser/login flows
- Permission checks requiring login/audit writes
- E2E
- Smoke
- Full tests
- Full build
- Migrations
- Seed/reset/delete
- Deploys
- Environment changes
- ZATCA
- Email
- Backup/restore
- Production/beta/customer-data access

## 17. Recommended Next Thread

`DEV-11 Part 15: inventory valuation report evidence verification`

## 18. Verification Note

Part 15 read-only verification is recorded in [DEV_11_INVENTORY_VALUATION_REPORT_EVIDENCE_VERIFICATION.md](DEV_11_INVENTORY_VALUATION_REPORT_EVIDENCE_VERIFICATION.md). It verified the Part 14 report evidence against direct marker counts, operational movement math, journal account aggregates, generated-document/audit baselines, and no-body/no-secret output checks with no discrepancies.
