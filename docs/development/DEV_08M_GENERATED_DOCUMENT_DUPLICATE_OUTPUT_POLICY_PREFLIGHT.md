# DEV-08M Generated Document Duplicate Output Policy Preflight

## Scope

- Task: `DEV-08M Part 4: generated-document duplicate output policy preflight`.
- Latest commit inspected: `d83c1a8d Verify DEV-08M AP cleanup inventory dry run`.
- Marker for this arc: `DEV08M-AP-20260529T000000`.
- Runtime mutation performed: no.
- Code change performed: no.
- PDF generation, generated-document download, email, ZATCA, cleanup, delete, archive, revoke, deploy, migration, seed/reset/delete, production, beta, or customer-data action performed: no.

## Code Inspection

- `GeneratedDocumentService.archivePdf(...)` always calls `prisma.generatedDocument.create(...)`.
- The archived row stores sanitized filename, `application/pdf`, `storageProvider=database`, base64 content, SHA-256 content hash, byte count, status `GENERATED`, generated-by metadata, and a create audit log.
- `GeneratedDocument` has indexes for organization, type, source, status, and generator, but no uniqueness constraint for `organizationId + sourceType + sourceId + documentType`.
- `GeneratedDocumentStatus` already includes `GENERATED`, `FAILED`, and `SUPERSEDED`, but current generated-document archiving does not mark previous rows as superseded.
- AP PDF/archive paths for purchase orders, purchase bills, supplier payment receipts, supplier refunds, purchase debit notes, and cash expenses all render a fresh PDF buffer and delegate to `GeneratedDocumentService.archivePdf(...)`.
- Source PDF/generate routes are already permission-hardened by DEV-08J/DEV-08K work; this preflight did not change those gates.

## Prior Evidence Considered

- DEV-08H proved a repeated purchase-order `generatePdf(...)` call created a second generated-document archive row for the same source.
- DEV-08H recorded the repeated purchase-order output with the same filename but different hash and size.
- DEV-08J proved repeated output generation for purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense also created one additional generated-document row per source.
- DEV-08J recorded prior-hash matches as `no` for all five repeated AP output families in that sweep.
- DEV-08M Part 2/3 count-only inventory classified generated-document rows as preserve-by-default evidence and found no approved deletion candidates.

## Policy Options

| Option | Pros | Risks |
| --- | --- | --- |
| Append-only versioned archive rows | Matches current code and evidence; preserves every generated artifact; avoids schema/migration churn; keeps audit history simple. | Multiple rows for one source can appear in document lists; future UI may need clearer version labeling. |
| Reuse latest generated row | Reduces duplicate rows. | Repeated output is not byte-identical in existing evidence; reuse could hide a newly generated artifact and make audit/download history misleading. |
| Supersede older rows | Uses the existing `SUPERSEDED` status and can keep one current row. | Mutates prior evidence, needs explicit audit/legal retention semantics, affects document filtering, and needs email/outbox rules for older generated documents. |
| Add explicit regenerate/version UI | Makes user intent clearer and could label generated versions. | Larger product/UI/API scope than DEV-08M; still requires retention and supersession policy before implementation. |

## Paid V1 Recommendation

Treat repeated generated-document rows as append-only versioned archive behavior for paid v1.

Do not implement reuse or supersede behavior in DEV-08M. The safest current policy is to preserve every generated PDF archive row as evidence, because repeated rendering has already produced different hashes and byte counts. A future product ticket can add explicit version labels, "latest" filtering, or supersession semantics once legal/audit retention, email delivery references, and document-list UX are designed together.

## Part 5 Decision

- The exact Part 5 approval phrase was available from the user.
- Part 5 is skipped because this preflight does not recommend a narrow code change.
- Part 6 is also skipped because there is no Part 5 implementation to verify.
- Next prompt is Part 7.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5`
- `rg -n "async .*generatePdf|generatePdf\(|archivePdf\(|GeneratedDocumentStatus|SUPERSEDED|supersed|idempot|duplicate" apps/api/src apps/web/src docs/development -g "*.ts" -g "*.tsx" -g "*.md"`
- `Get-Content` inspections for generated-document service, Prisma schema, AP PDF services, DEV-08H duplicate evidence, DEV-08J duplicate sweep evidence, and DEV-08J closure.

## Commands Skipped

- Part 5 code implementation.
- Part 6 implementation verification.
- Runtime PDF generation, generated-document download, body/base64 output, report/document export, attachment download, login/browser/API endpoint mutation, cleanup/delete/update/archive/revoke execution.
- Migrations, seed/reset/delete, full tests, full build, full E2E, full smoke, deploys, environment/provider/schema changes, backup/restore, and production-hosting research.
- Real email, SMTP/provider sends, retry workers, provider webhooks, diagnostics sends, real AP delivery, real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, QR payload handling, production, beta, hosted/shared, or customer-data actions.

## Exact Next Prompt Title

`DEV-08M Part 7: AP cleanup executor preflight`
