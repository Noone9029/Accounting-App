# DEV-12 Generated Documents Storage Retention Preflight

Date: 2026-05-30

Latest commit inspected: `0b3c1e4b Close DEV-11 inventory valuation COGS evidence`

Marker: `DEV12-DOC-20260530T000000`

## 1. Purpose And Scope

DEV-12 starts the generated documents storage retention evidence arc after DEV-11 closed local inventory valuation and COGS evidence. This Part 1 pass is documentation and read-only code inspection only. It inventories current generated-document model, storage, lifecycle, permission gates, output body-risk boundaries, retention gaps, storage readiness, backup relation, production gaps, and E2E readiness.

This preflight did not generate documents, download documents, archive PDFs, run report queries, mutate runtime data, create fixtures, run login/browser flows, migrate storage, change retention settings, or change app behavior.

This preflight does not prove production readiness, beta readiness, hosted/shared behavior, customer-data behavior, object-storage readiness, signed URL behavior, malware scanning, lifecycle policy, restore proof, legal retention compliance, broad E2E/smoke/full-test coverage, or accountant/legal approval.

## 2. Safety Rules For DEV-12

- Default DEV-12 work is local-only and marker-scoped.
- Future fixture marker: `DEV12-DOC-20260530T000000`.
- Future fixture names, document numbers, filenames, fake users, and fake organizations must start with or include `DEV12-DOC-`.
- No production, beta, hosted/shared, or customer data may be used unless a later prompt explicitly widens scope.
- Do not print DB URLs, auth headers, cookies, tokens, secrets, customer/vendor payload bodies, accounting payload bodies, generated-document bodies, PDF bytes, CSV bodies, `contentBase64`, signed XML, QR payloads, or attachment bodies.
- Safe evidence is metadata only: counts, status codes, filenames, MIME types, byte sizes, hash prefixes, safe ID prefixes, permission names, and redacted summaries.
- Do not deploy, provision, migrate, seed, reset, delete, change environment variables, or change Vercel/Supabase settings.
- Do not run login/browser flows unless a later prompt explicitly approves the audit-writing scope.
- Do not generate CSV/PDF/download/archive output until a later prompt explicitly approves that output check.
- Do not run E2E, smoke, full tests, full build, migrations, ZATCA, email, backup, restore, storage migration, cleanup, purge, or retention mutation in this preflight.
- Do not stage unrelated `apps/web/src/app/page.tsx`, `apps/web/src/app/ar/*`, `apps/web/src/app/pricing/*`, `apps/web/src/app/product/*`, `apps/web/src/app/readiness/*`, `apps/web/src/app/resources/*`, `apps/web/src/app/workflows/*`, `apps/web/src/components/marketing/*`, `graphify-out/*`, or `apps/graphify-out/*`.

## 3. Current Generated-Document Model

`GeneratedDocument` is a tenant-scoped archive metadata plus body record:

- `id`, `organizationId`, `documentType`, `sourceType`, `sourceId`, `documentNumber`, `filename`, `mimeType`.
- Storage fields: `storageProvider` string defaulting to `database`, nullable `storageKey`, nullable `contentBase64`, `contentHash`, and `sizeBytes`.
- Lifecycle fields: `status` with enum values `GENERATED`, `FAILED`, and `SUPERSEDED`; `generatedById`; `generatedAt`; `createdAt`.
- Relations: organization, optional generator user, and generated-document email outbox rows.
- Indexes: organization, document type, source tuple, status, and generator.

Document types currently include sales invoices, credit notes, customer payment receipts, customer refunds, customer statements, supplier statements, purchase orders, purchase bills, purchase debit notes, supplier payment receipts, supplier refunds, cash expenses, core report PDFs, and bank reconciliation reports.

## 4. Current Generated-Document Storage Behavior

- `GeneratedDocumentService.archivePdf` always stores generated PDFs in the database by setting `storageProvider = "database"` and `contentBase64 = input.buffer.toString("base64")`.
- `contentHash` is SHA-256 over the PDF buffer and `sizeBytes` is the buffer byte length.
- `storageKey` is not set by `archivePdf`.
- `GeneratedDocumentService.download` reads `contentBase64` from the database and returns a `Buffer`.
- `StorageConfigurationService.generatedDocumentProvider` can read `GENERATED_DOCUMENT_STORAGE_PROVIDER`, but generated-document S3 writes are explicitly not implemented.
- `StorageService.readiness` warns that generated-document S3 storage is not implemented and that generated documents remain database-backed.
- `StorageService.migrationPlan` counts generated documents by `storageProvider = "database"` and `storageProvider = "s3"` but is dry-run/count-only.
- There is no generated-document object upload, object delete, signed URL, object key construction, malware scan, lifecycle rule, or restore operation in the generated-document service.

## 5. Current Generated-Document Lifecycle

- Archive creation is append-only through `archivePdf` or `archiveInvoicePdf`.
- List and detail are read-only metadata queries scoped by `organizationId`.
- Download streams the stored database body when `contentBase64` exists.
- `archivePdf` writes a `GeneratedDocument` create audit log with selected metadata. The audit sanitizer redacts keys containing `base64` or `contentbase64`.
- `FAILED` and `SUPERSEDED` exist as status enum values and filters but no generated-document service transition currently sets those statuses.
- Repeated generation creates another archive row; dedupe, latest-only, supersession, and version-label policy remain open.
- No generated-document delete, soft-delete, purge, cleanup, restore, or legal-hold API exists.

## 6. Current Generated-Document Permission Gates

- `GET /generated-documents` requires `generatedDocuments.view`.
- `GET /generated-documents/:id` requires `generatedDocuments.view`.
- `GET /generated-documents/:id/download` requires `generatedDocuments.download`.
- Core report CSV/PDF export requires either `reports.export` or `generatedDocuments.download`.
- Source-specific PDF stream/generate routes usually require the source document view/generate permission and also call `assertGeneratedDocumentDownloadPermission` on several AP and cash-expense source PDF paths.
- The web `/documents` route is mapped to `generatedDocuments.view` plus legacy `documents.view` route access, while the API generated-document endpoints use `generatedDocuments.*`.
- Storage readiness and migration-plan endpoints require `documentSettings.view` and `attachments.manage`.
- Backup readiness/evidence endpoints require `auditLogs.manageRetention`.
- Admin full access is honored by the shared permission helper and guard.

## 7. Current Document And Output Body-Risk Boundary

- Generated documents can contain customer, vendor, accounting, VAT, report, payment, receipt, statement, or invoice data.
- PDF bodies are stored in `contentBase64`; this must not be printed in evidence.
- Report CSV exports stream CSV bodies but do not create generated-document rows.
- Report PDFs, source PDFs, statements, and receipts stream PDF bytes and create archive rows.
- ZATCA invoice PDF archive currently returns a metadata-only PDF/A-3 boundary. It does not persist unsigned XML bodies, signed XML bodies, QR payload bodies, private keys, CSID tokens, certificate material, or ZATCA response bodies through the generated-document archive path.
- Audit metadata is sanitized for risky key fragments including `base64`, `contentbase64`, tokens, secrets, authorization, database URLs, and private keys.
- Backup evidence rejects secret/body fields and XML-like protected bodies before storing metadata.

## 8. Current Storage, Readiness, And Backup Relation

- Attachment storage has database and S3 service implementations. Attachment S3 can upload/read when fully configured.
- Generated-document storage does not use the attachment storage provider abstraction.
- `GET /storage/readiness` returns attachment storage readiness, generated-document storage readiness, boolean S3 config status, and warnings. It does not return secret values.
- `GET /storage/migration-plan` returns organization-scoped attachment and generated-document counts/bytes and `dryRunOnly: true`. It does not copy, upload, delete, rewrite, or migrate objects.
- The storage settings UI states migration execution is not implemented.
- Backup readiness covers metadata-only evidence requirements for database backup, PITR, migration history, object storage backup, generated-document backup, attachment backup, restore drill, restore verification, and RPO/RTO review.
- Backup readiness and restore drill plan are read-only; backup evidence create/verify/revoke mutates metadata-only evidence and writes audit logs, so those mutations are out of scope for Part 1.
- No backup or restore operation is executed by the application.

## 9. Current Retention And Deletion Policy Status

- Generated documents have no dedicated retention settings, retention duration, legal hold, purge, cleanup executor, deletion audit trail, or soft-delete flag.
- Attachment records have `ACTIVE` and `DELETED` statuses and a soft-delete path, but generated documents do not.
- Audit logs have retention settings and dry-run-only preview endpoints; automatic purge execution is explicitly not implemented.
- ZATCA signed artifact storage has metadata-only planning and legal/accounting retention review fields, but that does not implement generated-document retention.
- Product/legal policy is still needed for accounting and tax retention, customer-data deletion conflicts, immutable archive requirements, backup retention, object lifecycle, and legal hold.

## 10. Generated Documents Workflow Inventory

| Workflow | Routes involved | API/controllers/services involved | Prisma models/status fields involved | Permissions involved | Storage impact | Retention impact | Audit/logging impact | Output/body risk | Current evidence status | Production risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Report PDF archive | `/reports/*`, report detail pages | `GET /reports/:kind/pdf`; `ReportsController`; `ReportsService.coreReportPdf`; `GeneratedDocumentService.archivePdf` | `GeneratedDocument` with `REPORT_*`, `AccountingReport`, `GENERATED`, `contentBase64`, `contentHash`, `sizeBytes` | `reports.view` plus `reports.export` or `generatedDocuments.download` | Creates database/base64 PDF archive row | No retention policy or legal hold | `GeneratedDocument:CREATE` audit via archive service | Report PDF body and accounting payload risk | DEV-10 proved one local Trial Balance PDF archive under approval; Part 1 did not run it | High |
| Invoice PDF archive | `/sales/invoices/[id]` | `GET /sales-invoices/:id/pdf`; `POST /sales-invoices/:id/generate-pdf`; `SalesInvoiceService.pdf`; `archiveInvoicePdf` | `GeneratedDocument` with `SALES_INVOICE`, `SalesInvoice`, `GENERATED`; optional ZATCA metadata boundary | `salesInvoices.view` plus generated-document download assertion on generate path where used | Creates database/base64 invoice PDF archive row | No retention/legal-hold policy | `GeneratedDocument:CREATE` audit | Invoice body, customer/VAT data, and ZATCA metadata risk | Unit coverage for invoice archive and ZATCA boundary; no DEV-12 marker proof | Critical |
| Customer statement archive | `/contacts/[id]` customer statement actions | `GET /contacts/:id/statement.pdf`; `POST /contacts/:id/generate-statement-pdf`; `ContactLedgerService.statementPdf` | `GeneratedDocument` with `CUSTOMER_STATEMENT`, `CustomerStatement`, `GENERATED` | `contacts.view` plus source/generate download guard where route applies | Creates database/base64 customer statement archive row | No retention/legal-hold policy | `GeneratedDocument:CREATE` audit | Customer ledger statement PDF body risk | Service/unit references exist; no DEV-12 marker proof | High |
| Supplier statement archive | `/contacts/[id]` supplier statement actions | `GET /contacts/:id/supplier-statement.pdf`; `ContactLedgerService.supplierStatementPdf` | `GeneratedDocument` with `SUPPLIER_STATEMENT`, `SupplierStatement`, `GENERATED` | `contacts.view` plus source/generate download guard where route applies | Creates database/base64 supplier statement archive row | No retention/legal-hold policy | `GeneratedDocument:CREATE` audit | Supplier ledger statement PDF body risk | Service/unit references exist; no DEV-12 marker proof | High |
| AP document PDF archive | purchase order, bill, debit note, supplier payment, supplier refund, cash expense pages | Source `pdf` and `generate-pdf` endpoints; AP/cash services; `archivePdf`; download permission assertion helper | `GeneratedDocument` with AP/cash document types and source ids | Source view permission plus `generatedDocuments.download` guard on selected PDF/generate routes | Creates database/base64 AP PDF archive rows | No retention/legal-hold policy | `GeneratedDocument:CREATE` audit | Supplier/AP/cash document PDF body risk | DEV-08 AP arcs proved selected local AP output/email behavior; no DEV-12 marker proof | High |
| AR receipt/refund/credit-note archive | sales customer payment/refund/credit note pages | Source PDF endpoints; AR services; `archivePdf` | `GeneratedDocument` with AR document types and source ids | Source permissions and generated-document output gates | Creates database/base64 AR PDF archive rows | No retention/legal-hold policy | `GeneratedDocument:CREATE` audit | Customer/payment/refund PDF body risk | Existing service/spec coverage; no DEV-12 marker proof | High |
| Bank reconciliation report PDF archive | `/bank-reconciliations/[id]` | `GET /bank-reconciliations/:id/report.pdf`; `BankReconciliationService.reportPdf`; `archivePdf` | `GeneratedDocument` with `BANK_RECONCILIATION_REPORT`, `BankReconciliation`, `GENERATED` | `bankReconciliations.view` plus export/download guard in controller | Creates database/base64 report archive row | No retention/legal-hold policy | `GeneratedDocument:CREATE` audit | Bank reconciliation PDF body risk | DEV-09 planned report output but did not prove generated-document storage retention | High |
| Generated-document list | `/documents` | `GET /generated-documents`; `GeneratedDocumentController.list`; `GeneratedDocumentService.list` | `GeneratedDocument` metadata only; filters by type/source/status | `generatedDocuments.view` | No new storage row | No retention action | No visible audit write | Metadata can reveal source numbers and filenames | Unit coverage for org scoping; no DEV-12 marker proof | Medium |
| Generated-document detail | `/documents` row detail API path | `GET /generated-documents/:id`; service `get` | `GeneratedDocument` metadata select excludes `contentBase64` | `generatedDocuments.view` | No new storage row | No retention action | No visible audit write | Metadata/source identifier risk | Service coverage via org-scoped get/list patterns; no DEV-12 marker proof | Medium |
| Generated-document download | `/documents` download action | `GET /generated-documents/:id/download`; service `download`; web `downloadPdf` | Reads `contentBase64` and streams buffer | `generatedDocuments.download` | Reads database body; no new archive row | No retention action | No visible audit write | PDF body and base64-derived bytes risk | DEV-10 proved one approved local download hash; no DEV-12 marker proof | Critical |
| Document settings | `/settings/documents` | `GET/PATCH /organization-document-settings`; render settings methods | `OrganizationDocumentSettings` template/title/color/toggle fields | `documentSettings.view`; `documentSettings.manage` | Affects future PDF rendering only | Existing generated documents not changed | Update writes audit log | Future document content/presentation risk | Unit/UI coverage exists; no runtime mutation in Part 1 | Medium |
| Storage readiness | `/settings/storage` | `GET /storage/readiness`; `StorageService.readiness`; web storage page | Provider config status booleans, no generated-document mutation | `documentSettings.view` and `attachments.manage` | Read-only provider readiness and warnings | No retention action | No visible audit write | Secret leakage risk if redaction fails | Unit/E2E reference coverage exists; Part 1 did not call runtime API | High |
| Storage migration dry-run | `/settings/storage` | `GET /storage/migration-plan`; `StorageService.migrationPlan` | Aggregates `Attachment` and `GeneratedDocument` counts/bytes by provider | `documentSettings.view` and `attachments.manage` | Count-only; no upload/delete/rewrite | No retention action | No visible audit write | Count/size metadata only | Unit coverage exists; no DEV-12 marker proof | High |
| Backup/restore evidence relation | `/settings/storage` backup section | `GET /system/backup-readiness`; `GET /system/restore-drill-plan`; backup evidence endpoints | `BackupRestoreEvidence` statuses `DRAFT`, `VERIFIED`, `SUPERSEDED`, `REVOKED` | `auditLogs.manageRetention` | Metadata-only backup/readiness relation; no backup execution | Can record evidence types but no generated-document retention | Evidence mutations write audit logs | Secrets/body rejection boundary risk | Unit/UI coverage exists; Part 1 did not mutate evidence | High |
| ZATCA invoice PDF archive boundary | `/sales/invoices/[id]` ZATCA-related invoice PDF path | `SalesInvoiceService.pdf`; `archiveInvoicePdf`; `buildZatcaPdfA3ArchiveBoundary` | `GeneratedDocument` plus safe ZATCA metadata boundary object, not stored on row | Sales invoice/generated-document output permissions | Normal invoice PDF archived; no signed artifact body persistence | ZATCA retention policy remains separate metadata-only planning | Generated-document create audit only | Signed XML, QR, certificate, key, and response body risk | Unit coverage confirms metadata-only boundary; no production compliance | Critical |
| Generated-document object-storage gap | `/settings/storage`; archive services | `StorageService`; `GeneratedDocumentService.archivePdf` | `storageProvider` string remains `database`; no object key from archive | Storage admin permissions for readiness only | No generated-document S3 upload/read/delete path | No lifecycle/retention relation | No object-storage audit trail | Body stays in DB/base64 | Explicit code gap found | Critical |
| Generated-document retention gap | Future cleanup/retention routes absent | No generated-document retention service or executor | No generated-document retention fields; audit retention only | None for generated-document retention | No storage cleanup or purge | No legal hold, purge, soft delete, or retention clock | No deletion audit because no delete path | Destructive retention design risk | Explicit code gap found | Critical |

## 11. Existing Coverage Found

- `apps/api/src/generated-documents/generated-document-rules.spec.ts`: PDF archive metadata/content, organization-scoped list/download, filename sanitization, and metadata-only ZATCA PDF/A-3 boundary.
- `apps/api/src/generated-documents/generated-document-permissions.spec.ts`: generated-document download helper allows `generatedDocuments.download` or admin full access and rejects insufficient source-only permissions.
- `apps/api/src/reports/reports.service.spec.ts`: report PDF archive calls `GeneratedDocumentService.archivePdf` with `REPORT_*` metadata.
- `apps/api/src/reports/reports.controller.spec.ts`: report CSV/PDF output permission through `reports.export` or `generatedDocuments.download`.
- Source service specs across AR/AP/banking cover generated-document archive calls for selected invoices, receipts, bills, statements, refunds, debit notes, purchase orders, cash expenses, and bank reconciliation reports.
- `apps/api/src/storage/storage.service.spec.ts`: database/S3 readiness, generated-document S3 blocker warning, secret redaction, and dry-run migration counts.
- `apps/api/src/storage/storage.controller.spec.ts`: storage readiness endpoint permission metadata.
- `apps/api/src/system/backup-readiness.service.spec.ts`: read-only backup readiness, restore drill plan, metadata-only evidence, secret/body rejection, and evidence verify/revoke behavior.
- `apps/api/src/system/system.controller.spec.ts`: backup readiness endpoint permission metadata.
- `apps/api/src/audit-log/audit-log.service.spec.ts`: audit metadata redaction, retention defaults/update, dry-run preview, and sanitized CSV export.
- `apps/web/src/app/(app)/documents/page.test.tsx`: AP generated-document local mock no-send UI hides PDF body/base64.
- `apps/web/src/lib/documents.test.ts`: AP generated-document email eligibility and permission helper coverage.
- `apps/web/src/lib/pdf-download.test.ts`: generated-document archive download path helper and source PDF path helpers.
- `apps/web/src/lib/storage.test.ts` and `apps/web/src/components/storage/backup-readiness-safe-status.test.tsx`: storage/readiness UI helper coverage.
- `tests/e2e/reports-flow.spec.ts` and `tests/e2e/storage-flow.spec.ts`: browser E2E references for reports and storage pages only; they were not run in Part 1.

## 12. Missing Coverage

- No DEV-12 marker-scoped generated-document fixture exists yet.
- No DEV-12 proof of generated-document list/detail metadata for a marker fixture.
- No DEV-12 proof of generated-document download metadata/hash integrity for a marker fixture.
- No DEV-12 proof of restricted-role negative behavior for list/detail/download routes.
- No DEV-12 proof of storage readiness and migration dry-run results against marker data.
- No proof that generated-document S3/object-storage upload/read/delete/signed URL behavior works, because that path is not implemented.
- No generated-document retention policy, legal hold, cleanup, purge, soft-delete, or restore proof.
- No malware scanning, object versioning, lifecycle policy, immutable retention, or restore drill proof for generated-document bodies.
- No broad E2E, smoke, full tests, full build, hosted/beta/customer-data proof, load, or concurrency proof.
- No accountant/legal approval for generated-document tax/accounting retention durations or customer-data deletion conflict policy.

## 13. Highest-Risk Gaps

- Generated-document bodies remain database/base64-backed, which is acceptable for local/dev evidence but not production-scale proof.
- Generated-document object storage is not implemented even when `GENERATED_DOCUMENT_STORAGE_PROVIDER=s3` is configured.
- Download reads and streams full PDF bytes; evidence must prove hash/size without logging body or base64.
- No generated-document retention/legal hold/purge policy exists, creating accounting/tax retention and customer-data deletion conflicts.
- Repeated generation creates additional archive rows without dedupe, supersession, latest-label, or version policy.
- ZATCA PDF/A-3 archive remains metadata-only and must not be treated as compliant signed artifact persistence.
- Backup readiness is metadata-only and does not prove backup, restore, generated-document reachability after restore, or object-storage backup.
- Hosted/beta/customer-data behavior remains unproven and must not be inferred from local evidence.

## 14. Proposed Local-Only Fixture Marker For Future DEV-12 Parts

- Marker: `DEV12-DOC-20260530T000000`.
- Fixture names, document numbers, source IDs, and filenames must start with `DEV12-DOC-`.
- Fake local user/email pattern: `dev12.doc.20260530t000000@ledgerbyte.local.test`.
- Fixture data must be synthetic local-only data.
- No production, beta, hosted/shared, external object storage, or customer data is allowed.
- Fixture evidence should include safe ID prefixes, document type, filename, MIME type, storage provider, hash prefix, byte size, status, and timestamps only.

## 15. Proposed DEV-12 Arc

1. Part 2: approved local generated-document fixture creation.
2. Part 3: generated-document fixture evidence verification.
3. Part 4: generated-document metadata/list/detail preflight.
4. Part 5: approved local generated-document metadata/list/detail checks.
5. Part 6: generated-document metadata/list/detail evidence verification.
6. Part 7: generated-document download gate preflight.
7. Part 8: approved local generated-document download gate checks.
8. Part 9: generated-document download gate evidence verification.
9. Part 10: storage readiness and migration dry-run preflight.
10. Part 11: approved local storage readiness and migration dry-run checks.
11. Part 12: storage readiness and migration dry-run evidence verification.
12. Part 13: retention/legal hold/cleanup policy preflight.
13. Part 14: generated documents storage retention closure.

## 16. E2E Readiness Checklist

| Area | Required readiness |
| --- | --- |
| Fixture data | Marker organization, fake local user, at least one tiny synthetic generated document, no customer/vendor payloads, database storage provider, hash/size metadata, and stable marker counts. |
| Routes | `/documents`, source PDF routes, `/settings/documents`, `/settings/storage`, and report PDF routes only after explicit output approval. |
| API endpoints | `GET /generated-documents`, `GET /generated-documents/:id`, `GET /generated-documents/:id/download`, storage readiness, migration plan, document settings, and safe source PDF/generate paths. |
| Roles/permissions | Owner/Admin/Accountant positive paths; restricted users without `generatedDocuments.view`, `generatedDocuments.download`, `reports.export`, `documentSettings.view`, `attachments.manage`, or `auditLogs.manageRetention` for negative paths. |
| Positive paths | Create/reuse marker fixture, list metadata, detail metadata, verify download headers/hash/size without body output, verify storage readiness/dry-run count-only behavior, and verify no count drift. |
| Restricted-role negative paths | Forbid list/detail without view, forbid download without download, forbid report output without export/download, and forbid storage readiness without storage permissions. |
| No-body/no-secret policy | Assertions and docs may include status, count, safe ID prefix, filename, MIME type, byte size, hash prefix, storage provider, and redaction results only. |
| Storage/retention posture | Treat database storage as local/dev only. Do not claim object-storage, signed URL, lifecycle, legal hold, purge, restore, backup, malware scan, or production retention readiness. |
| Cleanup posture | Preserve marker data by default. Any cleanup must be future approval-gated, dry-run-first, count-only, tenant/marker-scoped, and legal-hold aware. |

## 17. Production Gap Register

| Gap | Current evidence status | Production risk | Required next step |
| --- | --- | --- | --- |
| Object storage for generated documents | Not implemented; archive path always database/base64 | Database bloat, backup/restore load, and operational storage limits | Design and implement generated-document storage provider abstraction, object keys, upload/read/delete, and migration |
| Database/base64 migration | Dry-run counts only | Existing archives cannot be moved safely | Design count-only planning, reversible migration, hash verification, and rollback |
| Signed URLs | Not implemented | Downloads require API buffer streaming and no direct object access model | Design tenant-scoped, short-lived signed URL policy only after object storage exists |
| Lifecycle policy | Not implemented | Bodies may accumulate indefinitely | Define lifecycle by document type/source/status/legal hold before any executor |
| Legal hold | Not implemented | Deletion could violate legal/accounting preservation | Add policy model and approval gates before destructive cleanup |
| Tax/accounting retention approval | Not approved | Retention duration guesses could be legally unsafe | Obtain legal/accounting review and document exact policy |
| Customer-data deletion conflict | Not resolved | Privacy deletion can conflict with accounting/tax retention | Define conflict policy and audit trail |
| Malware scanning | Not implemented for generated documents | Stored PDFs could contain unsafe content if external inputs later influence generation | Design scan/attestation path for uploads and generated outputs as required |
| Restore proof | Metadata-only planning | Restore could lose bodies or break download integrity | Run approved non-production restore drill with hash/size checks |
| Backup proof | Metadata-only planning | Generated documents may be excluded from backup/restore coverage | Capture verified generated-document backup and restore evidence |
| Purge executor | Not implemented | No controlled deletion path | Design dry-run-first, marker/tenant scoped executor with immutable audit |
| Versioning/supersede policy | Status exists, no transition | Users may download/send outdated duplicate archives | Define append-only vs supersede/latest UX policy |
| PDF/A-3/ZATCA artifact boundary | Metadata-only invoice PDF boundary | Could overclaim compliance | Keep signed artifact persistence separate and approval-gated |
| Hosted/beta/customer-data proof | Not performed | Local proofs may not hold on deployed targets | Separate approval, target proof, sanitized data, and no-body evidence rules |
| Broad E2E/smoke/full-test | Not run in Part 1 | Regression risk outside selected paths | Run only after fixture and target approvals |
| Load/concurrency | Not proven | Duplicate rows, large PDFs, and concurrent downloads may stress storage | Add load/concurrency tests after local fixture proof |
| Accountant/legal review | Not complete | Policy claims may be unsafe | Prepare evidence packet for review before production claims |

## 18. Open Questions

- Should generated-document creation remain append-only forever, or should supersession/latest-version behavior be added?
- Should generated-document downloads write audit events separately from archive creation?
- Should report PDF generation dedupe by report kind/filter/date/user or always create a new archive row?
- Which document types require immutable retention, legal hold, or tax/accounting retention beyond default evidence preservation?
- What should happen when a customer-data deletion request intersects with invoice/report/statement archive retention?
- Should generated-document storage share the attachment S3 implementation or use a separate object key and retention policy?
- What minimum restore proof is needed before generated documents can be called backup-ready?
- What role should manage retention/legal hold for generated documents: audit retention admin, document settings admin, or a new permission?

## 19. Recommended Next Thread

`DEV-12 Part 2: approved local generated-document fixture creation`

## 20. Commands Run

- `git fetch --prune`
- `git status --short --branch`
- `git log -1 --oneline`
- `git log -1 --oneline origin/codex/dev-11-inventory-valuation-cogs`
- Read-only code and documentation inspection commands using `Get-Content` and `rg`.

## 21. Commands Skipped

- `verify:repo`
- `verify:ci:local` actual
- Full tests
- Full build
- E2E
- Smoke
- Migrations
- Seed/reset/delete
- Deploys
- Environment changes
- Login/audit-writing flows
- Fixture creation
- Generated-document mutations
- Archive generation
- Download checks
- Storage migration
- Retention mutation
- Cleanup/purge/delete
- Report queries
- CSV/PDF/download/archive generation
- ZATCA
- Email
- Backup/restore
- Production-hosting research
