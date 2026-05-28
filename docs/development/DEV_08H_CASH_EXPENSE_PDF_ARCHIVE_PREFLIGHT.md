# DEV-08H Cash Expense PDF Archive Preflight

## Purpose And Scope

- Task: `DEV-08H Part 19: cash expense PDF archive preflight`.
- Latest commit inspected: `8642c966 Verify DEV-08H purchase-debit-note PDF archive`.
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no download, no email, no ZATCA.
- Marker: `DEV08H-AP-20260528T000000`.

## Selected Source

- Cash expense: `EXP-000065`.
- Safe prefix: `bd4d1330`.
- Status: `POSTED`.
- Total: `46.0000`.
- Taxable total: `40.0000`.
- Tax total: `6.0000`.
- Journal entry safe prefix: `c5f37e88`.
- Suitability: local fake posted cash expense source created specifically for DEV-08H AP output evidence.

## Route And Service Boundary

- Data route: `GET /cash-expenses/:id/pdf-data`, permission `cashExpenses.view`; read-only.
- Stream/archive route: `GET /cash-expenses/:id/pdf`, permission `cashExpenses.view`, service `CashExpenseService.pdf(...)`; renders PDF and archives a generated document.
- Explicit archive route: `POST /cash-expenses/:id/generate-pdf`, permission `cashExpenses.view`, service `CashExpenseService.generatePdf(...)`; delegates to `pdf(...)`.
- Expected generated document: `documentType=CASH_EXPENSE`, `sourceType=CashExpense`, `sourceId` safe prefix `bd4d1330`, `storageProvider=database`.
- Expected filename pattern: `cash-expense-EXP-000065.pdf`.
- Expected audit action from archive: `CREATE` on `GeneratedDocument`.
- ZATCA/PDF-A3 boundary: cash expense PDF archive is normal cash-expense PDF output only and has no ZATCA signing, XML, QR, clearance/reporting, or production-compliance claim.

## Baselines

- Cash-expense generated documents for selected source before mutation: `0`.
- Marker email outbox/provider-event rows: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Approval Phrase For Part 20

`I approve DEV-08H Part 20 local-only cash expense PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 20: approved local cash expense PDF archive mutation`
