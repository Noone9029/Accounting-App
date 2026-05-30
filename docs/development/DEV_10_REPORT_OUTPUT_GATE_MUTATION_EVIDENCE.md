# DEV-10 Report Output Gate Mutation Evidence

Date: 2026-05-30

Latest commit inspected before checks: `b394fae0 Preflight DEV-10 report output gates`

## Approval

Exact approval phrase captured:

`I approve DEV-10 Part 11 local-only report output archive download gate checks under marker DEV10-RPT-20260530T000000. No production, no beta, no customer data, no body output.`

## Local Target Proof

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

Marker used: `DEV10-RPT-20260530T000000`

Selected report: `trial-balance`

Filters: `from=2026-05-01`, `to=2026-05-31`

## Generated-Document Count

| Checkpoint | Count | Delta |
| --- | ---: | ---: |
| Before output checks | 0 | - |
| After CSV check | 0 | 0 |
| After PDF/archive check | 1 | +1 |
| After generated-document download check | 1 | 0 |
| Total delta | 1 | +1 |

CSV did not create a generated-document row. PDF generation created exactly one marker report generated-document row. Download did not create another row.

## CSV Check

| Field | Value |
| --- | --- |
| Report kind | `trial-balance` |
| Filename | `trial-balance-2026-05-30.csv` |
| Content type | `text/csv; charset=utf-8` |
| Byte length | `1054` |
| Row count | `15` |
| Title present | `true` |
| Accountant header present | `true` |
| CSV body printed | `false` |

## PDF And Archive Check

| Field | Value |
| --- | --- |
| Report kind | `trial-balance` |
| Filename | `trial-balance-2026-05-30.pdf` |
| Content type | `application/pdf` |
| Byte length | `3496` |
| SHA-256 | `ca5cbc62ef7f3cdc0c7a0c68e8c5e11c8aca30d841f5b0ef4d448d2f14805eb6` |
| PDF prefix present | `true` |
| PDF body printed | `false` |

Generated-document metadata:

| Field | Value |
| --- | --- |
| Document id prefix | `e32f9a1e...` |
| Document type | `REPORT_TRIAL_BALANCE` |
| Source type | `AccountingReport` |
| Source id | `trial-balance?from=2026-05-01&to=2026-05-31` |
| Filename | `trial-balance-2026-05-30.pdf` |
| MIME type | `application/pdf` |
| Storage provider | `database` |
| Size bytes | `3496` |
| Content hash | `ca5cbc62ef7f3cdc0c7a0c68e8c5e11c8aca30d841f5b0ef4d448d2f14805eb6` |
| Status | `GENERATED` |
| List count for source | `1` |
| Detail matches archive metadata | `true` |

## Download Metadata Check

| Field | Value |
| --- | --- |
| Filename | `trial-balance-2026-05-30.pdf` |
| MIME type | `application/pdf` |
| Byte length | `3496` |
| SHA-256 | `ca5cbc62ef7f3cdc0c7a0c68e8c5e11c8aca30d841f5b0ef4d448d2f14805eb6` |
| Download hash matches archive hash | `true` |
| Download body printed | `false` |

## Permission Gate Checks

Token-free controller/metadata checks returned:

| Gate | Result |
| --- | --- |
| Report CSV with `reports.export` | `allowed` |
| Report CSV with `generatedDocuments.download` | `allowed` |
| Report CSV with `reports.view` only | `forbidden` |
| Report PDF with `reports.view` only | `forbidden` |
| Generated-document list metadata | requires `generatedDocuments.view` |
| Generated-document detail metadata | requires `generatedDocuments.view` |
| Generated-document download metadata | requires `generatedDocuments.download` |

No login, auth token, cookie, browser, or role mutation was used for permission evidence.

## Audit And Log Impact

The output gate script injected `GeneratedDocumentService` without an `AuditLogService`, so the visible effect for this local check was the generated-document archive row only. No app login or audit-writing browser/API flow was used.

## Body-Output Safety

- CSV body printed: no.
- PDF body printed: no.
- Generated-document base64 printed: no.
- Generated-document download body printed: no.
- Full customer/vendor/accounting payload bodies printed: no.
- DB URLs, auth headers, cookies, tokens, and secrets printed: no.

## Scripts Used

- Temporary runner used: `apps/api/scripts/dev10-part11-output-gates.temp.ts`
- Temporary runner status: removed after successful checks.

## Production/Beta/Customer-Data Proof

This evidence is local-only and marker-scoped. It does not prove production, beta, hosted/shared, customer-data, accountant-reviewed, object-storage, concurrency, load, or report-pack behavior.

## Recommended Next Step

Continue with `DEV-10 Part 12: report output/archive/download evidence verification`.
