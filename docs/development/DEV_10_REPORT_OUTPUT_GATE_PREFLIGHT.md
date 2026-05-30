# DEV-10 Report Output Gate Preflight

Date: 2026-05-30

Latest commit inspected: `486fdd1f Verify DEV-10 aging VAT evidence`

## 1. Purpose And Scope

This preflight defines DEV-10 Part 11 output/archive/download and permission-gate checks for report CSV, report PDF, and generated-document metadata against the local marker fixture `DEV10-RPT-20260530T000000`. It is planning only. No runtime output generation, CSV call, PDF call, generated-document archive, generated-document download, login, fixture mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production target, beta target, customer data, or body output was used.

## 2. Safety Rules

- Confirm the target is `postgresql` on `localhost:5432/accounting` before Part 11 output checks.
- Use only the marker organization and marker report filters.
- Print no CSV body, PDF body, generated-document base64, full report JSON payload, customer/vendor/accounting payload body, DB URL, secret, token, cookie, or auth header.
- Record only status/result, content type, filename, byte length, SHA-256 hash if needed, generated-document metadata, row count/header presence, permission result, and generated-document count delta.
- Treat PDF report generation as an approved local mutation because `ReportsService.coreReportPdf` calls `GeneratedDocumentService.archivePdf`.
- Treat generated-document download as body exposure; record only byte count/hash/content type/filename and never print the body.
- Do not run E2E, smoke, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup, restore, production checks, or browser login.

## 3. Output Endpoint Map

| Path type | Endpoint/method | Expected behavior | Part 11 evidence |
| --- | --- | --- | --- |
| JSON read endpoints | Core report service methods and `GET /reports/<kind>` | Read-only report data | Already covered in Parts 5/8; no new JSON body output needed |
| CSV export | `GET /reports/<kind>?format=csv`; `ReportsService.coreReportCsvFile` | Returns CSV stream/content; should not create generated-document row | report kind, filters, filename, content type, byte length, row count/header presence, generated-document delta `0` for CSV step |
| PDF output/archive | `GET /reports/<kind>/pdf`; `ReportsService.coreReportPdf` | Returns PDF buffer and archives generated-document row | report kind, filters, filename, content type, byte length, document type/source/sourceId/status/storageProvider/size/hash |
| Generated-document list/detail | `GET /generated-documents`; `GET /generated-documents/:id`; service `list`/`get` | Returns metadata only, excluding base64 | metadata count/type/source/sourceId/status/storage fields only |
| Generated-document download | `GET /generated-documents/:id/download`; service `download` | Streams stored PDF body | filename, MIME type, byte length, SHA-256 hash only; no body |

## 4. Permission Matrix

| Actor/profile | Required permissions | Expected positive paths | Expected negative paths |
| --- | --- | --- | --- |
| Owner/Admin/Accountant equivalent | `reports.view`, `reports.export`, `generatedDocuments.view`, `generatedDocuments.download` | CSV, PDF/archive, generated-document list/detail/download | None for selected paths |
| Viewer equivalent | `reports.view`, `generatedDocuments.view`, `generatedDocuments.download`, but no `reports.export` in default role | CSV/PDF allowed by controller if `generatedDocuments.download` is present | No denial expected unless using a stricter synthetic restricted role |
| Restricted report viewer | `reports.view` only | JSON read only | CSV/PDF should be forbidden because neither `reports.export` nor `generatedDocuments.download` is present |
| No generated-document download | `generatedDocuments.view` only | list/detail metadata only | download should be forbidden |

Part 11 should use token-free controller/service-level permission simulation where possible. If creating or mutating roles would be required, document the blocker instead of adding unsafe role setup.

## 5. Planned Evidence Shape For Part 11

Record only:

- Approval phrase and local target proof.
- Marker and selected report filters.
- Pre-check generated-document count.
- CSV selected report kind, filename, content type `text/csv; charset=utf-8`, byte length, row count/header presence, and no-body flag.
- PDF selected report kind, filename, content type `application/pdf`, byte length, PDF prefix boolean only, generated-document metadata, and no-body flag.
- Generated-document list/detail metadata for the newly archived marker report.
- Generated-document download metadata: filename, MIME type, byte length, SHA-256 hash, and no-body flag.
- Permission positive/negative results by simulated permission set.
- Generated-document count delta.
- Audit/log impact if visible from generated-document archive service.
- Temp script status.

## 6. Expected Archive Behavior

- CSV output should not create generated-document rows.
- PDF output should create one generated-document row for the selected marker report.
- The archived row should use `sourceType: "AccountingReport"`.
- The archived row should use a report document type such as `REPORT_TRIAL_BALANCE`.
- The archived row should use `storageProvider: "database"` in this local build.
- Download should read the existing generated-document content and should not create an additional generated-document row.

## 7. Risks And Blockers

- PDF archive mutates the local database by creating generated-document metadata/content.
- Generated documents remain database/base64-backed locally; body retention and object-storage policy remain production gaps.
- Permission simulation must avoid login/token/cookie output and avoid broad role mutations.
- Repeated PDF generation may create additional archive rows rather than reusing an existing row.
- Accountant review of PDF layout remains outside this output gate.

## 8. Proposed Part 11 Temporary Script

Use `apps/api/scripts/dev10-part11-output-gates.temp.ts` to:

1. Load and classify the local DB target without printing the URL.
2. Resolve the marker organization and verified fixture.
3. Count marker generated documents before output checks.
4. Call `ReportsService.coreReportCsvFile` for one selected report, likely `trial-balance`.
5. Call `ReportsService.coreReportPdf` for the same report with `GeneratedDocumentService`.
6. Read generated-document list/detail/download through `GeneratedDocumentService` and record metadata/hash only.
7. Simulate report export permissions with the controller helper behavior or equivalent permission-set function without login.
8. Delete the temp script before commit.

## 9. Recommended Next Step

Continue with `DEV-10 Part 11: approved local report output/archive/download gate checks` because the exact Part 11 approval phrase has been supplied. Keep execution local-only, marker-scoped, and no-body-output.

## Part 11 Evidence Note

DEV-10 Part 11 completed on 2026-05-30 and is recorded in [DEV_10_REPORT_OUTPUT_GATE_MUTATION_EVIDENCE.md](DEV_10_REPORT_OUTPUT_GATE_MUTATION_EVIDENCE.md). The exact Part 11 approval phrase was captured before checks. The local output gate used `trial-balance` with marker filters. CSV metadata returned without creating an archive row, PDF output created exactly one `REPORT_TRIAL_BALANCE` generated-document row, generated-document download hash matched archive hash, restricted report export checks were forbidden, generated-document metadata permissions were confirmed, and no CSV/PDF/base64/download body was printed.
