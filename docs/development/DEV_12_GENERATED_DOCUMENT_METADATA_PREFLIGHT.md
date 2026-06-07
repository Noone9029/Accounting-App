# DEV-12 Generated Document Metadata Preflight

Date: 2026-05-30

Latest commit inspected: `d89ff0ea Verify DEV-12 generated document fixture`

Marker: `DEV12-DOC-20260530T000000`

## 1. Purpose And Scope

This Part 4 preflight plans generated-document metadata list/detail checks for the DEV-12 marker fixture. It is read-only planning and code inspection only. It does not query runtime APIs, mutate data, download documents, archive PDFs, run storage migration, run retention actions, or print bodies/secrets.

Part 5 may run approved local-only metadata queries against the marker fixture. Download remains a separate output/body risk gate for Part 7/8.

## 2. Safety Rules

- Use only local marker fixture data under `DEV12-DOC-20260530T000000`.
- Do not download generated documents.
- Do not select or print `contentBase64`.
- Do not print PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, DB URLs, auth headers, cookies, tokens, or secrets.
- Do not archive PDFs, generate outputs, create fixtures, mutate storage, change retention settings, migrate storage, upload/delete objects, or change app behavior.
- Keep evidence to safe metadata: field names, safe ID prefixes, counts, statuses, filenames, MIME type, hash prefixes, byte size, and redacted summaries.

## 3. Marker Fixture Dependency

Part 5 depends on the Part 2/3 verified local marker fixture:

- Organization count: `1`.
- User count: `1`.
- Generated-document count: `1`.
- Safe generated-document ID prefix: `663e5c68`.
- Document type: `REPORT_TRIAL_BALANCE`.
- Source type: `AccountingReport`.
- Source id: `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE`.
- Document number: `DEV12-DOC-TB-0001`.
- Filename: `DEV12-DOC-trial-balance.pdf`.
- Storage provider: `database`.
- Status: `GENERATED`.
- Hash prefix: `29bb1b32935c488b`.
- Size bytes: `129`.

## 4. Generated-Document Metadata Workflow Map

| Area | Current behavior |
| --- | --- |
| List route/API/service | `GET /generated-documents` calls `GeneratedDocumentController.list`, then `GeneratedDocumentService.list`. |
| Detail route/API/service | `GET /generated-documents/:id` calls `GeneratedDocumentController.get`, then `GeneratedDocumentService.get`. |
| Frontend route/components | `/documents` loads `/generated-documents`, filters by document type/status, renders table metadata, and keeps download as a separate button gated by download permission. |
| Prisma selected fields | `id`, `organizationId`, `documentType`, `sourceType`, `sourceId`, `documentNumber`, `filename`, `mimeType`, `storageProvider`, `storageKey`, `contentHash`, `sizeBytes`, `status`, `generatedById`, `generatedAt`, `createdAt`. |
| Fields excluded from metadata | `contentBase64` is excluded from list/detail metadata selects. PDF bytes are not returned by list/detail. |
| Permissions | List/detail require `generatedDocuments.view`. Download requires `generatedDocuments.download`. |
| Filters/query params | `documentType`, `sourceType`, `sourceId`, and `status` are optional filters through `GeneratedDocumentQueryDto`. |
| Status handling | Valid status filters are `GENERATED`, `FAILED`, and `SUPERSEDED`. The fixture status is `GENERATED`. |
| Audit/log behavior | List/detail are read-only and do not visibly write audit logs. Archive creation writes generated-document audit logs, but Part 5 must not archive. |

## 5. Expected Marker Metadata Fields

Part 5 should expect list/detail metadata to include:

- Safe generated-document id prefix.
- Organization id prefix.
- `documentType = REPORT_TRIAL_BALANCE`.
- `sourceType = AccountingReport`.
- `sourceId = DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE`.
- `documentNumber = DEV12-DOC-TB-0001`.
- `filename = DEV12-DOC-trial-balance.pdf`.
- `mimeType = application/pdf`.
- `storageProvider = database`.
- `storageKey = null`.
- `contentHash` prefix `29bb1b32935c488b`.
- `sizeBytes = 129`.
- `status = GENERATED`.
- `generatedById` safe prefix.
- `generatedAt` and `createdAt`.

## 6. Expected Forbidden Body Fields

Part 5 list/detail evidence must not include:

- `contentBase64`
- `buffer`
- `body`
- `pdf`
- PDF bytes
- Base64 body values
- CSV bodies
- Attachment body/content
- Signed XML body
- QR payload body
- Provider payloads
- Secrets or connection strings

## 7. Expected List/Detail Permission Behavior

- API list/detail routes require `generatedDocuments.view`.
- API download route separately requires `generatedDocuments.download`.
- Web route access maps `/documents` to `generatedDocuments.view` and legacy `documents.view`, but backend list/detail remains `generatedDocuments.view`.
- Part 5 can verify permission gates by inspecting controller metadata or using token-free service/controller checks; it must not run login/browser flows.

## 8. Allowed Part 5 Checks

- Prove the DB target is local-only.
- Confirm the marker fixture exists.
- Query marker generated-document list metadata.
- Query marker generated-document detail metadata.
- Query supported filters: document type, source type, source id, and status.
- Verify metadata field allowlist excludes body fields.
- Verify status/storage/hash/size metadata.
- Verify permission metadata without login/audit-writing flows.
- Verify generated-document and audit-log counts are stable before/after.

## 9. Forbidden Part 5 Checks

- Do not download generated documents.
- Do not select or print `contentBase64`.
- Do not print PDF bytes or response bodies.
- Do not archive PDFs or generate CSV/PDF output.
- Do not create or mutate fixtures.
- Do not run storage migration, retention mutation, cleanup, purge, object upload/delete, E2E, smoke, full tests, full build, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup, restore, production, beta, hosted/shared, or customer-data checks.

## 10. Risks And Blockers

- Metadata fields still include source identifiers, filenames, hashes, and byte sizes; use marker-only local data.
- `contentHash` is safe metadata for the marker fixture, but evidence should use prefixes unless full hash is explicitly needed.
- Download is a separate body-output gate and must remain deferred until Part 8 approval.
- Repeated generation can create duplicate archive rows, but Part 5 must not generate or archive.
- List/detail do not prove object storage, retention, restore, malware scanning, lifecycle, signed URL, or production readiness.

## 11. Recommended Next Thread

`DEV-12 Part 5: approved local generated-document metadata list detail checks`
