# DEV-12 Generated Document Download Gate Preflight

Date: 2026-05-30

Latest commit inspected: `670fdb9d Verify DEV-12 generated document metadata evidence`

Marker: `DEV12-DOC-20260530T000000`

## 1. Purpose And Scope

This Part 7 preflight plans the DEV-12 generated-document download gate check for the local marker fixture. It is documentation and read-only code inspection only. It does not download generated documents, print bodies, mutate runtime data, create fixtures, archive PDFs, migrate storage, run retention actions, or change app behavior.

Part 8 may run the approved local-only download check against the synthetic marker document, but evidence must remain limited to headers, filename, byte length, hash equality, safe ID prefixes, and count stability.

## 2. Safety Rules

- Use only the local marker fixture `DEV12-DOC-20260530T000000`.
- Do not download generated documents in this Part 7 preflight.
- Do not print `contentBase64`, PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, DB URLs, auth headers, cookies, tokens, or secrets.
- Do not archive PDFs, create fixtures, mutate runtime data, run storage migration, run retention actions, upload/delete objects, or change app behavior.
- Do not run E2E, smoke, full tests, full build, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup, restore, production, beta, hosted/shared, or customer-data checks.

## 3. Marker Fixture Dependency

Part 8 depends on the Part 2 through Part 6 verified local marker fixture:

- Generated-document safe ID prefix: `663e5c68`.
- Organization safe ID prefix: `a452101a`.
- Document type: `REPORT_TRIAL_BALANCE`.
- Source type/id: `AccountingReport` / `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE`.
- Document number: `DEV12-DOC-TB-0001`.
- Filename: `DEV12-DOC-trial-balance.pdf`.
- MIME type: `application/pdf`.
- Storage provider/key: `database` / `null`.
- Status: `GENERATED`.
- Stored hash prefix: `29bb1b32935c488b`.
- Stored size bytes: `129`.
- Marker generated-document count: `1`.
- Generated-document audit-log count: `1`.

## 4. Download Workflow Map

| Area | Current behavior |
| --- | --- |
| Route/API/service | `GET /generated-documents/:id/download` calls `GeneratedDocumentController.download`, then `GeneratedDocumentService.download`. |
| Selected DB fields | Download selects `id`, `filename`, `mimeType`, and `contentBase64` for the organization-scoped document id. |
| Body-output path | The service decodes `contentBase64` into a `Buffer`; the controller returns `StreamableFile(buffer)`. |
| Expected response metadata | `Content-Type` is the document MIME type, `Content-Disposition` is `attachment; filename="<filename>"`, and `Content-Length` is the buffer byte length. |
| Permission required | API download route requires `generatedDocuments.download`. Source PDF/generate helpers also use `assertGeneratedDocumentDownloadPermission` in selected output paths. |
| Frontend behavior | `/documents` renders the download button only when `PERMISSIONS.generatedDocuments.download` is present, then calls `downloadPdf(generatedDocumentDownloadPath(id), filename)`. |
| Frontend fetch behavior | `downloadAuthenticatedFile` sends bearer auth and active organization headers, reads the response as a `Blob`, creates an object URL, clicks a temporary anchor, and revokes the object URL. |
| Audit/log behavior | `archivePdf` writes `GeneratedDocument:CREATE` audit logs; list/detail/download do not visibly write generated-document audit logs in the inspected service/controller path. |

## 5. Expected Download Result In Part 8

| Check | Expected result |
| --- | --- |
| Content type | `application/pdf` |
| Filename | `DEV12-DOC-trial-balance.pdf` |
| Byte length | `129` |
| Hash | Downloaded buffer SHA-256 must equal stored `contentHash`; known stored prefix is `29bb1b32935c488b`. |
| Archive delta | `0` new generated-document rows. |
| Audit delta | `0` generated-document audit-log rows unless code changes to log downloads before Part 8. |
| Body output | No PDF bytes, no base64, no blob/body text, and no full response body printed. |

## 6. Positive Permission Path

Part 8 may verify positive permission behavior without login/browser flows by using the controller metadata and the shared helper:

- `GeneratedDocumentController.download` is decorated with `@RequirePermissions(PERMISSIONS.generatedDocuments.download)`.
- `assertGeneratedDocumentDownloadPermission` allows `generatedDocuments.download`.
- `assertGeneratedDocumentDownloadPermission` also allows `admin.fullAccess` through shared permission handling.

## 7. Restricted-Role Negative Path

Part 8 may verify restricted behavior without login/browser flows by using token-free permission helper/controller metadata checks:

- A request with only source view permission is rejected by `assertGeneratedDocumentDownloadPermission`.
- A generated-document viewer without `generatedDocuments.download` should not see the frontend download button.
- API route metadata requires `generatedDocuments.download`; `generatedDocuments.view` alone is insufficient for the download route.
- A missing or organization-mismatched document id should return `Generated document not found.` without revealing body fields.

## 8. Body-Output Prohibition

Part 8 may execute the marker download only to compute metadata integrity checks:

- Compute SHA-256 and byte length in memory.
- Report only hash equality, safe hash prefix or safe full hash if required, byte length, content type, filename, status, and count deltas.
- Do not print `contentBase64`, PDF bytes, response body text, blob content, base64 values, attachment bodies, signed XML, QR payloads, provider payloads, DB URLs, auth headers, cookies, tokens, or secrets.

## 9. Allowed Part 8 Checks

- Prove the DB target is local-only before running any download.
- Verify the marker generated document exists and remains database-backed.
- Count marker generated documents and generated-document audit logs before and after.
- Call the service download path for the marker synthetic generated document only.
- Compute downloaded buffer byte length and SHA-256 hash without printing the buffer.
- Verify expected MIME type and filename.
- Verify route/helper permission requirements by metadata/helper checks without login/browser flows.
- Verify missing or mismatched id behavior if it does not expose body content and does not mutate.
- Verify no archive or audit count delta.

## 10. Forbidden Part 8 Checks

- Do not use production, beta, hosted/shared, or customer data.
- Do not download any non-marker generated document.
- Do not print PDF bytes, base64, response bodies, or `contentBase64`.
- Do not create/archive/generate new PDFs or generated documents.
- Do not mutate runtime data, storage settings, retention settings, or backup evidence.
- Do not run storage migration, retention cleanup/purge/delete, object upload/delete, signed URL generation, E2E, smoke, full tests, full build, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup, restore, login, or browser flows.

## 11. Risks And Blockers

- Download reads the full body from database `contentBase64`; evidence must remain metadata/hash/size only.
- Database/base64 generated-document storage is local/dev evidence only and does not prove object-storage readiness.
- There is no visible download audit log in the generated-document service, so Part 8 should expect no audit delta.
- Hash and byte length verify integrity for this tiny synthetic fixture only; they do not prove customer-data behavior, hosted behavior, restore proof, malware scanning, lifecycle policy, or production readiness.
- If `generatedDocuments.download` permission metadata changes before Part 8, stop and document the discrepancy.

## 12. Recommended Next Thread

`DEV-12 Part 8: approved local generated-document download gate checks`
