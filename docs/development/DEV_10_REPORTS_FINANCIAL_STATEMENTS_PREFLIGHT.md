# DEV-10 Reports And Financial Statements Preflight

Date: 2026-05-30

Latest commit inspected: `96fea571 Close DEV-09 banking reconciliation evidence`

## 1. Purpose And Scope

This preflight starts DEV-10 from the latest DEV-09 banking/reconciliation closure. The goal is to map the current reports and financial statement surfaces, identify production gaps, and define the local evidence path before any report fixtures, runtime report checks, exports, PDF generation, downloads, archive rows, or permission-gate mutations are attempted.

This pass was read-only code and document inspection. No login, fixture creation, report query against runtime data, CSV export, PDF generation, generated-document archive creation, generated-document download, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production check, or customer-data action was performed.

## 2. Safety Rules For DEV-10

- Keep DEV-10 local-only unless a later prompt explicitly changes scope.
- Use synthetic fixtures only, with marker `DEV10-RPT-20260530T000000`, once Part 2 is exactly approved.
- Do not use production, beta, shared, or customer data for report evidence.
- Do not print report response bodies, CSV content, PDF bytes/base64, generated-document content, secrets, database URLs, tokens, customer/vendor names from non-synthetic data, or full request payloads.
- Treat report JSON reads as data-exposure checks and record only safe counts, hashes, status codes, selected totals, and sanitized identifiers.
- Treat CSV downloads as output actions. CSV should record status, content type, filename/header presence, byte count, hash, row count, and safe prefixes only.
- Treat PDF report endpoints as mutating output gates because they archive a generated-document row and may write an audit log through `GeneratedDocumentService`.
- Treat generated-document downloads as body-exposure gates. Record only metadata, byte counts, content hashes, safe filename/content-type fields, and archive ids.
- Do not run broad smoke, E2E, build, migration, seed/reset/delete, deploy, production-hosting research, ZATCA, email, backup, restore, or environment-changing commands inside DEV-10 unless a later prompt explicitly authorizes the specific action.
- Preserve unrelated worktree files, especially untracked marketing, web route, and `graphify-out` files.

## 3. Current Report Inventory

| Report name | UI route | API endpoint | Service method | Source tables/models | Filters | Permissions | Output modes | Mutation/output risk | Current known coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| General Ledger | `/reports/general-ledger` | `GET /reports/general-ledger`; `GET /reports/general-ledger/pdf` | `ReportsService.generalLedger`; `coreReportCsvFile`; `coreReportPdf` | `Account`, `JournalLine`, `JournalEntry` with `POSTED`/`REVERSED` entries | `from`, `to`, `accountId`, `branchId`, `includeZero`, `format=csv` | `reports.view`; CSV/PDF require `reports.export` or `generatedDocuments.download` | JSON, CSV, PDF, PDF archive | JSON exposes accounting detail; CSV exports row bodies; PDF creates `REPORT_GENERAL_LEDGER` archive row | `reports.service.spec.ts` builder/tenant coverage; `reports.controller.spec.ts` CSV/PDF/permission coverage; `report-pages.test.tsx` UI guidance; `tests/e2e/reports-flow.spec.ts` reference only |
| Trial Balance | `/reports/trial-balance` | `GET /reports/trial-balance`; `GET /reports/trial-balance/pdf` | `ReportsService.trialBalance`; `coreReportCsvFile`; `coreReportPdf` | `Account`, `JournalLine`, `JournalEntry` | `from`, `to`, `branchId`, `includeZero`, `format=csv` | `reports.view`; CSV/PDF require export/download permission | JSON, CSV, PDF, PDF archive | CSV/PDF expose balances; PDF creates `REPORT_TRIAL_BALANCE`; accountant layout still needs review | Builder balance test; controller export tests; CSV helper test; smoke script reference checks trial balance and generated-document archive |
| Profit And Loss | `/reports/profit-and-loss` | `GET /reports/profit-and-loss`; `GET /reports/profit-and-loss/pdf` | `ReportsService.profitAndLoss`; `coreReportCsvFile`; `coreReportPdf` | `Account` types `REVENUE`, `COST_OF_SALES`, `EXPENSE`; posted/reversed `JournalLine` | `from`, `to`, `branchId`, `format=csv` | `reports.view`; CSV/PDF require export/download permission | JSON, CSV, PDF, PDF archive | Report depends on posted inventory/COGS and revenue journals; PDF creates `REPORT_PROFIT_AND_LOSS` | Builder signs and inventory COGS tests; UI route/catalog coverage; smoke reference checks core totals |
| Balance Sheet | `/reports/balance-sheet` | `GET /reports/balance-sheet`; `GET /reports/balance-sheet/pdf` | `ReportsService.balanceSheet`; `coreReportCsvFile`; `coreReportPdf` | `Account`, posted/reversed `JournalLine`, retained earnings from P&L accounts | `asOf`, `branchId`, `format=csv` | `reports.view`; CSV/PDF require export/download permission | JSON, CSV, PDF, PDF archive | Retained earnings is calculated from all P&L activity through `asOf`; branch/date evidence is high risk; PDF creates `REPORT_BALANCE_SHEET` | Builder retained-earnings/balanced tests; inventory asset journal test; route/e2e reference coverage |
| VAT Summary | `/reports/vat-summary` | `GET /reports/vat-summary`; `GET /reports/vat-summary/pdf` | `ReportsService.vatSummary`; `coreReportCsvFile`; `coreReportPdf` | VAT accounts with codes `220` and `230`; posted/reversed journal lines | `from`, `to`, `branchId`, `format=csv` | `reports.view`; CSV/PDF require export/download permission | JSON, CSV, PDF, PDF archive | Not an official filing export; account-code dependency must be proven; PDF creates `REPORT_VAT_SUMMARY` | Builder note/account-code tests; route catalog explicitly flags non-official filing status |
| VAT Return | No committed frontend route | `GET /reports/vat-return` | `ReportsService.vatReturn` | `SalesInvoice` `FINALIZED`; `PurchaseBill` `FINALIZED` | `from`, `to`, `branchId` | `reports.view` | JSON only | API-only draft basis from finalized source docs; no CSV/PDF/archive path; does not submit a tax return | Builder tests for finalized-only, date range, branch, refundable VAT; controller route test |
| Aged Receivables | `/reports/aged-receivables` | `GET /reports/aged-receivables`; `GET /reports/aged-receivables/pdf` | `ReportsService.agedReceivables`; `coreReportCsvFile`; `coreReportPdf` | `SalesInvoice` `FINALIZED` with `balanceDue > 0`; customer `Contact` | `asOf`, `branchId`, `format=csv` | `reports.view`; CSV/PDF require export/download permission | JSON, CSV, PDF, PDF archive | Exposes open customer balances; no collection workflow; PDF creates `REPORT_AGED_RECEIVABLES` | Aging bucket builder tests; UI guide/links tests; E2E route reference |
| Aged Payables | `/reports/aged-payables` | `GET /reports/aged-payables`; `GET /reports/aged-payables/pdf` | `ReportsService.agedPayables`; `coreReportCsvFile`; `coreReportPdf` | `PurchaseBill` `FINALIZED` with `balanceDue > 0`; supplier `Contact` | `asOf`, `branchId`, `format=csv` | `reports.view`; CSV/PDF require export/download permission | JSON, CSV, PDF, PDF archive | Exposes open supplier balances; no payment-run workflow; PDF creates `REPORT_AGED_PAYABLES` | Aging bucket builder tests; UI guide/links tests; AP local evidence supports source-state expectations |
| Dashboard Summary | `/dashboard`; no committed `/reports/dashboard-summary` UI | `GET /dashboard/summary`; `GET /reports/dashboard-summary` | `DashboardService.summary`; `ReportsService.dashboardSummary` | Open `SalesInvoice`, open `PurchaseBill`, active `BankAccountProfile`, reportable `JournalLine`, inventory/compliance/storage sections in dashboard service | Dashboard route has implicit current period/as-of; reports API supports `from`, `to`, `asOf`, `branchId` | `/dashboard/summary` requires `dashboard.view`; `/reports/dashboard-summary` requires `reports.view` | JSON only | KPI definitions and dual endpoint permissions need accountant and role review; data can expose open AR/AP and cash balances | `ReportsService.dashboardSummary` tests; dashboard smoke reference; API/route catalog coverage |
| Report CSV output | Download buttons on seven report pages | `format=csv` on core report endpoints | `ReportsService.coreReportCsvFile`; `coreReportCsv` in `report-csv.ts` | Same source data as the selected core report | Same report filters plus `format=csv` | `reports.export` or `generatedDocuments.download`, with `reports.view` class guard | CSV download only; no archive row expected | Exports report bodies; must not log CSV body; should record type, length, hash, row count, safe prefixes only | `report-csv.spec.ts`; controller CSV content-type/permission tests; smoke script reference checks trial balance CSV |
| Report PDF output | Download buttons on seven report pages | `GET /reports/<kind>/pdf` | `ReportsService.coreReportPdf`; PDF renderers from `@ledgerbyte/pdf-core` | Same source data as selected core report plus organization and document settings | Same report filters except no `format` | `reports.export` or `generatedDocuments.download`, with `reports.view` class guard | PDF stream plus generated-document archive | Mutates `GeneratedDocument` and can write audit log; repeats appear to create new archive rows; must not log PDF bytes/base64 | `reports.service.spec.ts` archive test; controller PDF stream/content-type test; prior DEV-03 output-gate plan |
| Generated-document archive/download metadata | `/documents` | `GET /generated-documents`; `GET /generated-documents/:id`; `GET /generated-documents/:id/download` | `GeneratedDocumentService.list`; `get`; `download`; `archivePdf` | `GeneratedDocument`; optional `AuditLog` on archive creation | `documentType`, `sourceType`, `sourceId`, `status` | list/detail require `generatedDocuments.view`; download requires `generatedDocuments.download`; web route also allows `documents.view` path access | Metadata JSON and PDF download | Database/base64 storage remains default for generated documents; download exposes body; archive creation writes metadata/content hash/size | Generated-document rules specs; API catalog; DEV-03 output/storage plan |
| Report permission gates | `/reports`, report children, `/documents`, permission boundaries | All report and generated-document endpoints | `ReportsController`, `GeneratedDocumentController`, `PermissionGuard`, shared `PERMISSIONS` | `Role.permissions`, `OrganizationMember`, shared permission constants | Route/path based | `reports.view`, `reports.export`, `generatedDocuments.view`, `generatedDocuments.download`, `documents.view`, `dashboard.view` | Access control only | Restricted roles need matrix evidence; viewer currently has generated-document download but not `reports.export`; web/API document permissions diverge | `permission.guard.spec.ts`; `reports.controller.spec.ts`; `apps/web/src/lib/permissions.ts` tests/reference |

## 4. Financial Statement Dependency Map

- Journals: Core financial statements read `JournalLine` rows scoped to the active organization and `JournalEntry` statuses `POSTED` and `REVERSED`. Date filters map to `entryDate`; opening balances for GL/TB use lines before `from`; balance sheet uses lines through `asOf`.
- AR: Aged receivables and dashboard receivables read finalized customer invoices with positive `balanceDue`. Customer payments, credit notes, refunds, and void flows must already be reflected in invoice balances and posted journals before reports can prove them.
- AP: Aged payables and dashboard payables read finalized purchase bills with positive `balanceDue`. Supplier payments, debit notes, refunds, and void flows must already be reflected in bill balances and posted journals before reports can prove them.
- Banking/reconciliation: Bank categorization posts journals that can flow into GL/TB/P&L/balance sheet. Reconciliation close/void snapshots do not directly feed financial statements, but bank account profiles feed dashboard cash/account counts.
- Inventory/COGS: P&L and balance sheet only reflect inventory/COGS once the relevant inventory clearing, receipt asset, COGS, variance, or related journals are posted. Operational inventory reports are separate from core financial statements.
- Fiscal periods: Posting locks constrain future mutations, not report reads. DEV-10 fixtures must cover locked-date safety separately if later checks mutate or attempt blocked output gates.
- Tax accounts: VAT Summary depends on account codes `220` and `230`; VAT Return depends on finalized source documents. These two VAT surfaces can diverge if journals and source documents are not aligned.
- Branches: Source-document reports filter directly by `branchId`. Journal-based reports use `journalEntryBranchFilter`, which currently maps only selected AR/AP/cash-expense source relations, so manual journals, some banking journals, and some inventory-related postings may be excluded from branch-scoped financial reports unless explicitly tied to those relations.
- Generated documents: Report PDF endpoints call `archivePdf` with `sourceType: "AccountingReport"` and a `sourceId` derived from report kind and filters. Generated-document storage is database-backed by default and stores content as base64.

## 5. Production-Gap Register

| Gap | Current state | DEV-10 evidence needed |
| --- | --- | --- |
| Report math/accountant review | Builder tests cover core math, but statement layouts and accountant wording remain not signed off. | Synthetic cross-report tie-outs for GL, TB, P&L, balance sheet, VAT, aging, and dashboard; accountant review checklist update after evidence. |
| Branch/date filter behavior | Date/as-of parsing exists. Branch filtering differs between source-document reports and journal-based reports. | Local branch fixtures proving included and excluded rows for document-backed and journal-backed reports, including manual/banking/inventory journal edge cases. |
| VAT return officialness limitations | VAT Summary states it is not an official filing report; VAT Return is API-only and does not submit a return. | Keep wording non-official; prove finalized-only source document basis; decide whether a frontend VAT Return route is needed before any production claim. |
| CSV/PDF/archive/download behavior | CSV returns streams without archive; PDF streams and archives generated documents. | Output gate checks with byte counts, hashes, content type, filenames, archive metadata, audit side effects, and no body logging. |
| Generated document storage | Generated-document content remains database/base64 by default. No generated-document S3 path or restore proof is present. | Metadata-only evidence for provider, storage key/content hash/size, archive counts, and download integrity; no base64/PDF body output. |
| Scheduled/email delivery | Reports have no scheduled report pack or email delivery workflow. | Explicitly classify as not implemented unless a future DEV arc adds provider-backed delivery. |
| Report packs | Individual reports exist; no month-end report pack builder, approval workflow, or bundled archive. | Define report-pack requirements separately; do not imply report-pack readiness from individual endpoints. |
| Restricted-role matrix | Shared permissions and default roles exist, but report/export/download behavior needs role-by-role evidence. | Test owner/admin/accountant/viewer/sales/purchases or synthetic custom roles for view/export/download denied/allowed outcomes. |
| Broad E2E/smoke/full-test coverage | Narrow specs and smoke/E2E references exist; Part 1 did not run them. | Later approved local checks should run only bounded report paths first, then document whether broader smoke/E2E remains deferred. |
| Production/beta/customer-data proof | DEV-09 and this preflight are local-only. | Do not claim production, beta, or customer-data behavior from DEV-10 local evidence. |

## 6. E2E Readiness Checklist

| Area | Required local synthetic fixtures | Report paths/API endpoints | Permission roles | Expected safe evidence | Data never to print |
| --- | --- | --- | --- | --- | --- |
| Core financial reports | Accounts across assets, liabilities, equity, revenue, COGS, expenses; posted and reversed journals; opening and period activity; branch A/B rows | `/reports/general-ledger`, `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet` and PDF routes later | Full access/accountant for view; export role for output gate | Status, selected totals, balance flag, account count, safe synthetic account codes, expected deltas | Full GL line bodies, request bodies, real names, secrets |
| VAT reports | VAT accounts `220`/`230`; finalized taxable sales invoice and purchase bill; draft/voided excluded docs; branch split | `/reports/vat-summary`, `/reports/vat-return` | `reports.view`; export/download only for VAT Summary output | Output/input/net VAT totals, finalized document counts, non-official warning presence | Full document bodies, tax invoice PDFs/XML, real VAT numbers |
| Aging reports | Finalized AR invoice and AP bill with partial/zero payments, credit/debit note effects, due dates across buckets, branch split | `/reports/aged-receivables`, `/reports/aged-payables` | `reports.view`; export/download for output gate | Bucket counts/totals, grand total, safe synthetic document numbers | Customer/vendor real names, full ledger histories |
| Dashboard summary | Open AR/AP, bank account profile, posted revenue/VAT/cash journals, inventory/compliance readiness inputs as needed | `/dashboard/summary`, `/reports/dashboard-summary` | `dashboard.view` and `reports.view` split | Section availability, selected totals, trend counts, warning codes | Full dashboard JSON body, real balances from non-synthetic orgs |
| CSV/PDF/output gates | Existing DEV-10 fixture data; generated-document baseline counts | `format=csv`, `/pdf`, `/generated-documents`, `/generated-documents/:id/download` | `reports.export`, `generatedDocuments.download`, denied role without either | Content type, filename, byte count, hash, row count, generated-document id/type/sourceId/status | CSV body, PDF bytes/base64, generated document content |
| Permission matrix | Synthetic users or service contexts for owner/admin/accountant/viewer/sales/purchases/custom denied role | Report and generated-document endpoints plus UI route access where feasible | Default roles and custom minimal roles | Allowed/denied status, required permission names, no response body | Tokens, cookies, session details, denied response bodies |

## 7. Proposed DEV-10 Arc

1. Part 2: approved local reports fixture creation
2. Part 3: report fixture evidence verification
3. Part 4: core financial report JSON preflight
4. Part 5: approved local core financial report JSON checks
5. Part 6: core financial report JSON evidence verification
6. Part 7: aging and VAT return preflight
7. Part 8: approved local aging and VAT return checks
8. Part 9: aging and VAT return evidence verification
9. Part 10: report output/archive/permission gate preflight
10. Part 11: approved local report output/archive/download gate checks
11. Part 12: report output/archive/download evidence verification
12. Part 13: reports and financial statements closure

## 8. Open Questions

- Should branch-filtered journal reports include manual journals, bank categorization journals, bank transfer journals, inventory receipt asset journals, COGS journals, and variance journals that are not connected to the relations currently listed in `journalEntryBranchFilter`?
- Should VAT Return remain API-only and explicitly draft-only, or should DEV-10 add a later frontend/report route before closure?
- Should repeated report PDF generation create a new archive row every time, or should there be an idempotent sourceId/filter-based reuse policy?
- Should `generatedDocuments.download` continue to authorize report CSV/PDF exports, or should report export and generated-document download stay separate for restricted roles?
- Should `/documents` web access continue allowing `documents.view` while generated-document APIs require `generatedDocuments.view`?
- What accountant-review artifact is required before Trial Balance, P&L, Balance Sheet, VAT Summary, and aging PDFs can be called production-ready?
- What is the expected beta posture for generated-document database/base64 storage before object-storage validation is complete?

## 9. Recommended Next Step

Continue to `DEV-10 Part 2: approved local reports fixture creation` only after the exact Part 2 approval phrase is present. Part 2 should create narrow local synthetic fixtures under marker `DEV10-RPT-20260530T000000` and should record only redacted counts, ids, and expected report math needed for later JSON/output checks.

## Part 2 Fixture Creation Note

DEV-10 Part 2 completed on 2026-05-30 and is recorded in [DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md](DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md). The exact Part 2 approval phrase was captured before mutation. The local target was classified as `postgresql` on `localhost:5432/accounting`. The marker fixture `DEV10-RPT-20260530T000000` created one synthetic organization, one user/membership, nine accounts, two tax rates, one branch, two contacts, one bank profile, four posted balanced journal entries, ten journal lines, one finalized sales invoice, and one finalized purchase bill. No report CSV, PDF, generated-document archive, generated-document download, production/beta target, customer data, login, E2E, smoke, migration, seed/reset/delete, deploy, ZATCA, email, backup, or restore action was used.

## Part 4 Core Report JSON Preflight Note

DEV-10 Part 4 completed on 2026-05-30 and is recorded in [DEV_10_CORE_REPORT_JSON_PREFLIGHT.md](DEV_10_CORE_REPORT_JSON_PREFLIGHT.md). The planned Part 5 JSON checks cover General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, and Dashboard Summary by service-level local reads only. The plan explicitly excludes CSV, PDF, generated-document archive/download paths, full payload body output, login, E2E, smoke, production/beta targets, and customer data.

## Part 7 Aging And VAT Return Preflight Note

DEV-10 Part 7 completed on 2026-05-30 and is recorded in [DEV_10_AGING_VAT_RETURN_PREFLIGHT.md](DEV_10_AGING_VAT_RETURN_PREFLIGHT.md). The planned Part 8 JSON checks cover Aged Receivables, Aged Payables, and VAT Return against the verified marker fixture. The plan uses `asOf=2026-05-30` for aging, `from=2026-05-01` and `to=2026-05-31` for VAT Return, and excludes CSV, PDF, archive, download, full payload body output, production/beta targets, and customer data.

## Part 10 Output Gate Preflight Note

DEV-10 Part 10 completed on 2026-05-30 and is recorded in [DEV_10_REPORT_OUTPUT_GATE_PREFLIGHT.md](DEV_10_REPORT_OUTPUT_GATE_PREFLIGHT.md). The planned Part 11 checks cover CSV metadata, PDF/archive metadata, generated-document list/detail/download metadata, and token-free permission simulation. The plan treats PDF generation as an approved local archive mutation, expects CSV to create no archive row, and forbids CSV/PDF/base64/body output.
