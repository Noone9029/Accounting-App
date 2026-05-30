# DEV-12 Generated Document Metadata Check Evidence

Date: 2026-05-30

Latest commit inspected: `d23d2dea Preflight DEV-12 generated document metadata`

Marker: `DEV12-DOC-20260530T000000`

## 1. Approval Text Used

`I approve DEV-12 Part 5 local-only generated-document metadata list/detail checks under marker DEV12-DOC-20260530T000000. No production, no beta, no customer data, no download/body output.`

## 2. Local Target Proof

- Database target classification: `postgresql` on host `localhost`, port `5432`, database `accounting`.
- Local-only result: passed.
- Hosted/provider target refusal check: no Supabase, Neon, Render, Railway, RDS/AWS, DigitalOcean, Fly, Vercel, production, beta, or user-testing target was used.
- Marker fixture exists under organization safe ID prefix `a452101a` and generated-document safe ID prefix `663e5c68`.

## 3. Marker And Safe IDs

| Component | Safe value |
| --- | --- |
| Marker | `DEV12-DOC-20260530T000000` |
| Organization ID prefix | `a452101a` |
| Generated-document ID prefix | `663e5c68` |
| Generated-by ID prefix | `9f375f20` |
| Document number | `DEV12-DOC-TB-0001` |
| Filename | `DEV12-DOC-trial-balance.pdf` |

## 4. Pre-Check Counts

| Count | Before |
| --- | ---: |
| Marker generated documents | 1 |
| Generated-document audit logs | 1 |

## 5. List Metadata Check Result

`GeneratedDocumentService.list` was called for the marker organization with no filters and returned one marker document for the organization.

| Field | Value |
| --- | --- |
| Safe ID prefix | `663e5c68` |
| Document type | `REPORT_TRIAL_BALANCE` |
| Source type | `AccountingReport` |
| Source id | `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE` |
| Document number | `DEV12-DOC-TB-0001` |
| Filename | `DEV12-DOC-trial-balance.pdf` |
| MIME type | `application/pdf` |
| Storage provider | `database` |
| Storage key | `null` |
| Content hash prefix | `29bb1b32935c488b` |
| Size bytes | 129 |
| Status | `GENERATED` |

## 6. Detail Metadata Check Result

`GeneratedDocumentService.get` was called for the marker organization and marker generated-document id. The detail metadata matched the list metadata:

- Document type: `REPORT_TRIAL_BALANCE`.
- Source type/id: `AccountingReport` / `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE`.
- Storage provider/key: `database` / `null`.
- Status: `GENERATED`.
- Hash prefix/size: `29bb1b32935c488b` / `129`.

## 7. Filter And Status Check Result

| Filter | Marker result |
| --- | ---: |
| `documentType = REPORT_TRIAL_BALANCE` | 1 |
| `sourceType = AccountingReport` | 1 |
| `sourceId = DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE` | 1 |
| `status = GENERATED` | 1 |

## 8. Metadata Field Allowlist/Denylist Result

List/detail metadata keys matched the safe allowlist:

`contentHash`, `createdAt`, `documentNumber`, `documentType`, `filename`, `generatedAt`, `generatedById`, `id`, `mimeType`, `organizationId`, `sizeBytes`, `sourceId`, `sourceType`, `status`, `storageKey`, `storageProvider`.

Denied body fields present: none.

Denied fields checked:

- `contentBase64`
- `buffer`
- `body`
- `pdfBytes`
- `content`

## 9. Permission Gate Result

Token-free controller metadata inspection verified:

| Route method | Required permission |
| --- | --- |
| `GeneratedDocumentController.list` | `generatedDocuments.view` |
| `GeneratedDocumentController.get` | `generatedDocuments.view` |
| `GeneratedDocumentController.download` | `generatedDocuments.download` |

## 10. Audit And Count Stability Result

| Count | Before | After | Stable |
| --- | ---: | ---: | --- |
| Marker generated documents | 1 | 1 | Yes |
| Generated-document audit logs | 1 | 1 | Yes |

Runtime mutation performed: no.

Download/output performed: no.

## 11. Discrepancies And Blockers

No discrepancies or blockers were found.

## 12. No-Download/No-Body/No-Secret Guarantee

- No generated-document download was performed.
- `contentBase64` was not selected or printed.
- PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, provider payloads, DB URLs, auth headers, cookies, tokens, and secrets were not printed.

## 13. No Production/Beta/Customer-Data Guarantee

- All checks used the local marker organization and marker generated document.
- No production, beta, hosted/shared, or customer data was used.

## 14. Commands Run

- `git status --short --branch`
- `git log -1 --oneline`
- Read-only `.env` target classification without printing DB URL.
- Temporary metadata checker through `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev12-part5-metadata-check.temp.ts`

## 15. Commands Skipped

- Generated-document download
- `contentBase64` selection/output
- PDF byte output
- Archive/PDF/CSV generation
- Fixture creation
- Runtime mutation
- Storage migration
- Retention mutation
- E2E
- Smoke
- Full tests
- Full build
- Migrations
- Seed/reset/delete
- Deploys
- Environment changes
- Production/beta/customer-data access
- ZATCA
- Email
- Backup/restore
- Production-hosting research

## 16. Recommended Next Thread

`DEV-12 Part 6: generated-document metadata list detail evidence verification`
