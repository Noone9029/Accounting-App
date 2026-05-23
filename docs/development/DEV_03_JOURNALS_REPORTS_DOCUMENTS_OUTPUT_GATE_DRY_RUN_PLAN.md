# DEV-03 Journals Reports Documents Output Gate Dry-Run Plan

## 1. Purpose And Scope

This DEV-03 Part 7 plan maps Journals, Fiscal Periods, Reports, Generated Documents, Audit, Storage, and related output-gate workflows before any local runtime mutation or output generation is approved.

This pass is planning-only. No login, fixture creation, journal mutation, fiscal period mutation, account/tax/admin setting mutation, report export, download, PDF generation, generated-document archive creation, audit export, backup/restore evidence mutation, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup/restore execution, or production check was performed.

Source evidence inspected:

- `CODEX_HANDOFF.md`
- `docs/development/DEV_03_STATE_MACHINE_QA_INVENTORY.md`
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`
- `docs/development/DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md`
- `docs/development/DEV_02_FINAL_HANDOFF.md`
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`
- `docs/development/DEV_01_FINAL_TRIAGE.md`
- `docs/development/DEVELOPMENT_COMPLETION_PLAN.md`
- `BUG_AUDIT.md`
- `README.md`
- `apps/api/prisma/schema.prisma`
- Journal, fiscal-period, account, tax-rate, report, generated-document, audit-log, document-settings, number-sequence, storage, and backup-readiness API controllers/services/specs under `apps/api/src`
- Journals, fiscal periods, accounts, tax rates, reports, documents, audit logs, document settings, number sequences, and storage routes/helpers/components under `apps/web/src`
- `tests/e2e/reports-flow.spec.ts` and `tests/e2e/storage-flow.spec.ts` as reference only; they were not run

## 2. Safety Rules For This Dry-Run Plan

- Keep DEV-03 Part 7 documentation-only.
- Do not login or run any flow that writes audit logs.
- Do not create fixture data yet.
- Do not create, edit, post, reverse, close, reopen, lock, export, download, generate PDF, archive a document, delete, send, upload, migrate, purge, restore, or mutate anything.
- Do not run E2E, smoke, migrations, seed/reset/delete, ZATCA, email, backup/restore, exports, downloads, PDF generation, deployment, production checks, or environment changes.
- Future mutation/output QA must be local-disposable only, explicitly approved, and use `DEV03-JRD-` fixture markers.
- Never log tokens, cookies, headers, database URLs, signed XML, QR payloads, attachment bodies, PDF bodies, CSV bodies, or customer/vendor/accounting payloads.
- Treat report/PDF/download/archive behavior as output-producing and deferred until a later prompt explicitly approves it.

## 3. Workflow Map

### Journals

- Routes: `/journal-entries`, `/journal-entries/new`.
- API endpoints/controllers/services: `AccountingController` and `AccountingService`; `GET /journal-entries`, `GET /journal-entries/count`, `POST /journal-entries`, `GET /journal-entries/:id`, `PATCH /journal-entries/:id`, `POST /journal-entries/:id/post`, `POST /journal-entries/:id/reverse`.
- Status/state fields: `JournalEntry.status` is `DRAFT`, `POSTED`, `VOIDED`, or `REVERSED`; `postedAt`, `postedById`, `reversalOfId`, `reversedBy`, `totalDebit`, and `totalCredit` are state evidence fields.
- Allowed transitions visible from code: create balanced `DRAFT`; update only draft journals; post `DRAFT -> POSTED`; reverse only posted journals by creating an opposite posted reversal journal and updating the source `POSTED -> REVERSED`; duplicate reversals are blocked.
- Permissions required: `journals.view` for list/count/detail; `journals.create` for create/update; `journals.post` for post; `journals.reverse` for reverse.
- Audit/log side effects if visible: `CREATE`, `UPDATE`, `POST`, and `REVERSE` audit logs are written by `AccountingService`.
- Accounting impact: posting and reversal affect all ledger reports through posted/reversed journal lines; draft journals should not affect reports.
- Reporting/output impact: general ledger, trial balance, P&L, balance sheet, and VAT summary use posted/reversed journal lines.
- Document/archive impact: none directly, but report PDF generation from these journals can create generated-document archive rows.
- QA priority: Critical.
- QA status: Planned only.

### Fiscal Periods And Posting Locks

- Routes: `/fiscal-periods`.
- API endpoints/controllers/services: `FiscalPeriodController`, `FiscalPeriodService`, and `FiscalPeriodGuardService`; `GET /fiscal-periods`, `POST /fiscal-periods`, `GET /fiscal-periods/:id`, `PATCH /fiscal-periods/:id`, `POST /fiscal-periods/:id/close`, `POST /fiscal-periods/:id/reopen`, `POST /fiscal-periods/:id/lock`.
- Status/state fields: `FiscalPeriod.status` is `OPEN`, `CLOSED`, or `LOCKED`; `startsOn` and `endsOn` define the posting window.
- Allowed transitions visible from code: create open periods; edit non-locked periods; close only open periods; reopen only closed periods; lock open or closed periods; locked periods cannot be edited or reopened. If no fiscal periods exist, the posting guard allows posting; if periods exist, posting is blocked outside a matching open period and in closed/locked periods.
- Permissions required: `fiscalPeriods.view` for list/detail; `fiscalPeriods.manage` for create/update/close/reopen; `fiscalPeriods.lock` plus `fiscalPeriods.manage` for lock.
- Audit/log side effects if visible: `CREATE`, `UPDATE`, `CLOSE`, `REOPEN`, and `LOCK` audit logs are written by `FiscalPeriodService`.
- Accounting impact: posting locks gate manual journal posting/reversal and other posting-date workflows that use `FiscalPeriodGuardService`.
- Reporting/output impact: reports should reflect only posted/reversed journals allowed by period controls.
- Document/archive impact: no direct archive impact.
- QA priority: Critical.
- QA status: Planned only.

### Accounts, Tax Rates, And Admin Accounting Settings

- Routes: `/accounts`, `/tax-rates`, `/settings/number-sequences`.
- API endpoints/controllers/services: `ChartOfAccountsController`/`ChartOfAccountsService` for `/accounts`; `TaxRateController`/`TaxRateService` for `/tax-rates`; `NumberSequenceController`/`NumberSequenceService` for `/number-sequences`.
- Status/state fields: `Account.allowPosting`, `Account.isActive`, `Account.isSystem`, account parent hierarchy, `TaxRate.isActive`, `TaxRate.scope`, `TaxRate.category`, `NumberSequence.scope`, `prefix`, `nextNumber`, and `padding`.
- Allowed transitions visible from code: create/update accounts; delete only non-system unused accounts without dependent journal, child, invoice, item, payment, or bank profile records; create/update non-negative tax rates; update future number sequence prefix/padding/next number, with lowering `nextNumber` blocked.
- Permissions required: `accounts.view`/`accounts.manage`; `taxRates.view`/`taxRates.manage`; `numberSequences.view`/`numberSequences.manage`.
- Audit/log side effects if visible: account create/update/delete, tax-rate create/update, and number-sequence update write audit logs.
- Accounting impact: account/tax setup gates journal lines and AR/AP forms; number sequences affect future entry/document numbers.
- Reporting/output impact: account type and posted journal lines drive all accounting reports; tax-rate setup affects future VAT source records; number sequence changes affect future output numbering only.
- Document/archive impact: number sequence updates can affect future generated document numbers but do not rewrite existing records.
- QA priority: High.
- QA status: Planned only.

### Reports

- Routes: `/reports`, `/reports/general-ledger`, `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/vat-summary`, `/reports/aged-receivables`, `/reports/aged-payables`.
- API endpoints/controllers/services: `ReportsController` and `ReportsService`; JSON and CSV via `GET /reports/:kind`; PDF via `GET /reports/:kind/pdf`.
- Status/state fields: reports derive from `JournalEntry.status` values `POSTED` and `REVERSED`; aged AR/AP reports derive from finalized invoices/bills with open balances.
- Allowed transitions visible from code: JSON report reads are non-mutating. CSV exports require export permission and return streamed CSV. PDF exports require export permission, render a PDF, and call `GeneratedDocumentService.archivePdf`.
- Permissions required: `reports.view` for report reads; CSV/PDF export requires either `reports.export` or `generatedDocuments.download`.
- Audit/log side effects if visible: report JSON/CSV reads do not visibly write audit logs; PDF archive creation writes a generated-document audit log through `GeneratedDocumentService`.
- Accounting impact: read-only unless report output generation archives a generated document; report accuracy depends on posted journals and finalized AR/AP states.
- Reporting/output impact: CSV/PDF exposes accounting data; PDF creates an archived generated-document record.
- Document/archive impact: PDF generation stores database-backed PDF content as a generated document with `DocumentType.REPORT_*`.
- QA priority: Critical.
- QA status: Planned only.

### Generated Documents, Archive, And Downloads

- Routes: `/documents`.
- API endpoints/controllers/services: `GeneratedDocumentController` and `GeneratedDocumentService`; `GET /generated-documents`, `GET /generated-documents/:id`, `GET /generated-documents/:id/download`.
- Status/state fields: `GeneratedDocument.status` is `GENERATED`, `FAILED`, or `SUPERSEDED`; metadata includes `documentType`, `sourceType`, `sourceId`, `documentNumber`, `filename`, `mimeType`, `storageProvider`, `contentHash`, `sizeBytes`, and `generatedAt`.
- Allowed transitions visible from code: list and detail are read-only; download returns stored content when present; `archivePdf` creates `GENERATED` records with database/base64 PDF content and sanitized filename.
- Permissions required: `generatedDocuments.view` for list/detail; `generatedDocuments.download` for download. The web route currently also treats `documents.view` as an access path for `/documents`, while the API uses generated-document permissions.
- Audit/log side effects if visible: `archivePdf` writes a `GeneratedDocument` create audit log; list/detail/download do not visibly write audit logs.
- Accounting impact: none directly.
- Reporting/output impact: archive rows are output evidence and may expose accounting, customer, vendor, or report data.
- Document/archive impact: PDF archive creation and download are the core side effects; full PDF bodies must never be logged in QA evidence.
- QA priority: Critical.
- QA status: Planned only.

### Audit, Export, And Retention Output Gates

- Routes: `/settings/audit-logs`.
- API endpoints/controllers/services: `AuditLogController` and `AuditLogService`; `GET /audit-logs`, `GET /audit-logs/:id`, `GET /audit-logs/export.csv`, `GET /audit-logs/retention-settings`, `PATCH /audit-logs/retention-settings`, `GET /audit-logs/retention-preview`, `POST /audit-logs/retention-dry-run`.
- Status/state fields: `AuditLogRetentionSettings.retentionDays`, `autoPurgeEnabled`, and `exportBeforePurgeRequired`; audit rows include sanitized `before`/`after` metadata.
- Allowed transitions visible from code: list/detail read sanitized audit logs; CSV export streams sanitized metadata; retention settings patch mutates retention configuration and writes an audit log; retention preview/dry-run returns counts and warnings and does not delete audit logs.
- Permissions required: `auditLogs.view` for list/detail/settings read; `auditLogs.export` for CSV export; `auditLogs.manageRetention` for retention patch, preview, and dry-run.
- Audit/log side effects if visible: retention settings update writes an audit log; reads/previews/CSV exports do not visibly write audit logs.
- Accounting impact: none directly, but audit evidence is required for state-machine QA accountability.
- Reporting/output impact: CSV export can expose actor/action/entity summaries and sanitized metadata; QA evidence must not record CSV bodies.
- Document/archive impact: no generated-document archive creation.
- QA priority: High.
- QA status: Planned only.

### Storage And Document Readiness Output Gates

- Routes: `/settings/documents`, `/settings/storage`, `/settings/number-sequences`.
- API endpoints/controllers/services: `OrganizationDocumentSettingsController`/`OrganizationDocumentSettingsService`; `StorageController`/`StorageService`; `SystemController`/`BackupReadinessService`; `NumberSequenceController`/`NumberSequenceService`.
- Status/state fields: document settings template/color/title/toggle fields; storage readiness provider status; migration plan dry-run counts; backup evidence `DRAFT`, `VERIFIED`, `SUPERSEDED`, and `REVOKED`; number sequence future numbering fields.
- Allowed transitions visible from code: document settings patch updates future PDF render settings; storage readiness and migration plan are read-only/dry-run; backup readiness and restore drill plan are read-only; backup evidence create/verify/revoke mutates metadata-only evidence and writes audit logs; number sequence updates affect future numbering only.
- Permissions required: `documentSettings.view`/`documentSettings.manage`; storage readiness requires `documentSettings.view` and `attachments.manage`; backup readiness/evidence endpoints require `auditLogs.manageRetention`; number sequences require `numberSequences.view`/`numberSequences.manage`.
- Audit/log side effects if visible: document settings update, number sequence update, and backup evidence create/verify/revoke write audit logs.
- Accounting impact: document settings and storage readiness do not change ledger balances; backup evidence does not execute backups/restores.
- Reporting/output impact: document settings affect future PDFs; storage migration plan returns counts only; backup readiness returns readiness evidence only.
- Document/archive impact: generated document storage remains database-backed in this groundwork build; S3 generated-document storage is explicitly not enabled.
- QA priority: High.
- QA status: Planned only.

## 4. Proposed Local Disposable Fixtures

All future fixtures for this batch must start with `DEV03-JRD-` and must be created only after a later prompt explicitly approves local login, fixture creation, mutation, and output generation.

- Organization marker: `DEV03-JRD-ORG-<runId>`.
- User marker: `dev03.jrd.<runId>@ledgerbyte.local.test`.
- Account markers: `DEV03-JRD-ACCT-CASH-<runId>`, `DEV03-JRD-ACCT-REV-<runId>`, `DEV03-JRD-ACCT-EXP-<runId>`, `DEV03-JRD-ACCT-VAT-<runId>`.
- Tax rate marker: `DEV03-JRD-TAX-<runId>`.
- Journal marker: journal description/reference must include `DEV03-JRD-JE-<runId>`.
- Fiscal period marker: `DEV03-JRD-FY-OPEN-<runId>`, plus closed/locked fixture periods only when period-lock testing is approved.
- Report run marker, if applicable: filter notes/evidence label `DEV03-JRD-REPORT-<runId>`; do not write report-run records unless a future feature exists and is approved.
- Generated document marker: source document number or filename prefix `DEV03-JRD-DOC-<runId>`.
- Audit/export marker: audit filter/entity reference `DEV03-JRD-AUDIT-<runId>`.
- Backup/storage evidence marker, if separately approved: metadata-only note `DEV03-JRD-STORAGE-<runId>` with no secrets, URLs, document bodies, or attachment bodies.

## 5. Dry-Run Test Matrix

| Workflow | Preconditions | Later approved action to test | Expected state before | Expected state after | Expected ledger/accounting effect | Expected report/output effect | Expected generated-document/archive effect | Expected audit effect | Rollback/cleanup expectation | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Manual journal create | Logged-in fixture user, fixture org, active posting accounts, active tax rate if used | Create balanced draft journal | No `DEV03-JRD-JE-` journal exists | Draft journal exists with balanced lines | No posted ledger impact | Reports should not include draft lines | None | `JournalEntry:CREATE` audit log | Keep draft or later void/delete only if explicitly approved | Planned only |
| Manual journal validation | Same fixture setup | Attempt unbalanced journal | No invalid journal exists | Request rejected | No ledger impact | No report impact | None | No successful mutation audit expected | No cleanup beyond evidence note | Planned only |
| Manual journal post | Existing draft journal in open period | Post journal | `DRAFT`, balanced lines, posting date allowed | `POSTED`, `postedAt`, `postedById` set | Posted lines affect ledger balances | General ledger/trial balance/P&L/balance sheet/VAT may change | None | `JournalEntry:POST` audit log | Reverse through application if cleanup is approved | Planned only |
| Manual journal reverse | Existing posted journal not already reversed | Reverse journal | Source `POSTED`, no `reversedBy` | Reversal journal `POSTED`; source `REVERSED` | Opposite posted lines offset source | Reports include source and reversal lines | None | `JournalEntry:REVERSE` audit log | Reversal is terminal evidence; do not delete audit logs | Planned only |
| Duplicate reversal guard | Source journal already reversed | Attempt second reverse | Source has `reversedBy` | Request rejected | No duplicate reversal lines | No additional report effect | None | No successful mutation audit expected | No cleanup beyond evidence note | Planned only |
| Fiscal period create | Fixture org and manage permission | Create open period | No overlapping fixture period | `OPEN` period exists | Future posting dates can be constrained | Period appears in admin route | None | `FiscalPeriod:CREATE` audit log | Leave as marker-bearing fixture or lock only if approved | Planned only |
| Fiscal period close/reopen | Existing open fixture period | Close then reopen | `OPEN` | `CLOSED`, then `OPEN` | Closed period blocks posting while closed | Failed posting/report deltas should be explainable by lock | None | `CLOSE` and `REOPEN` audit logs | Reopen to open if cleanup requires continued posting | Planned only |
| Fiscal period lock | Existing open or closed fixture period | Lock period | `OPEN` or `CLOSED` | `LOCKED` and not reopenable/editable | Posting date in locked period blocked | No output side effect | None | `LOCK` audit log | Locked period is irreversible in current UI; use disposable period only | Planned only |
| Posting lock guard | Closed/locked fixture period and draft journal inside period | Attempt post/reverse using blocked posting date | Draft or posted source exists | Request rejected before status change | No new posted ledger effect | No report/output change | None | No successful mutation audit expected | Leave fixture state unchanged | Planned only |
| Account create/update/delete guard | Fixture org and account manage permission | Create/update/delete unused account | Account absent or editable | Created/updated or unused non-system deleted | Setup-only unless used by journals | Reports include account only after posted lines | None | Account create/update/delete audit logs | Prefer deactivate over delete unless deletion is explicitly in scope | Planned only |
| Tax rate create/update guard | Fixture org and tax manage permission | Create/update tax rate and reject negative rate | Tax rate absent or active | Valid update persists; negative rate rejected | Future tax-tagged lines only | VAT report impact only after posted lines | None | TaxRate create/update audit logs | Keep marker-bearing rate or deactivate if approved | Planned only |
| Number sequence update guard | Existing fixture sequence and manage permission | Update prefix/padding/next number; reject lowering next number | Current sequence visible | Valid future settings persist; unsafe lower value rejected | Future document numbers only | Future output filenames/numbers may change | Existing archives unchanged | NumberSequence update audit log | Restore only with forward-safe value if approved | Planned only |
| Report JSON read | Posted fixture journal and reports view permission | Load report JSON | Posted fixture data exists | Report returns fixture-derived totals | Read-only report view | Accounting data visible in UI/API | None | No visible audit write | No cleanup | Planned only |
| Report CSV export | Posted fixture journal and export/download permission | Download CSV | Report data exists | CSV stream returned | No ledger mutation | Accounting data exported | No generated-document record expected for CSV | No visible audit write | Do not log CSV body; record status/headers/count only | Planned only |
| Report PDF export/archive | Posted fixture journal and export/download permission | Download report PDF | Report data exists | PDF stream returned and archive row created | No ledger mutation | PDF output generated | `GeneratedDocument` row with `REPORT_*` type created | GeneratedDocument create audit log | Do not log PDF body; keep archive row as fixture evidence | Planned only |
| Generated document archive list/detail | Existing generated document fixture | List/detail archive metadata | Archive row exists | Metadata visible | None | Output metadata visible | No new archive record | No visible audit write | No cleanup | Planned only |
| Generated document download | Existing generated document fixture and download permission | Download archived PDF | Archive row has content | PDF stream returned | None | PDF data exposed | No new archive record | No visible audit write | Do not log PDF body; record status/filename only | Planned only |
| Audit log list/detail | Existing fixture audit logs | List/detail by marker | Audit rows exist | Sanitized rows visible | None | Audit evidence visible | None | No new audit write | Do not log raw metadata bodies | Planned only |
| Audit CSV export | Existing fixture audit logs and export permission | Download sanitized CSV | Filtered audit rows exist | CSV stream returned | None | Audit metadata exported | None | No visible audit write | Do not log CSV body | Planned only |
| Audit retention preview/dry-run | Retention manage permission | Run preview/dry-run | Retention settings exist | Counts and warnings returned | None | Dry-run counts visible | None | No deletion audit expected | No cleanup | Planned only |
| Audit retention settings update | Retention manage permission | Patch settings | Settings exist | Settings updated | None | Policy/config changes visible | None | Retention settings update audit log | Restore safe value only if approved | Planned only |
| Document settings update | Document settings manage permission | Patch display/template settings | Settings exist/default-created | Future render settings updated | None | Future PDF presentation changes | Existing archive rows unchanged | OrganizationDocumentSettings update audit log | Restore prior settings only if approved | Planned only |
| Storage readiness/migration plan | Document settings view and attachment manage permission | Read readiness and dry-run migration plan | Storage config exists | Readiness/counts returned | None | Storage readiness output visible | No objects moved | No visible audit write | No cleanup | Planned only |
| Backup evidence metadata gates | Audit retention manage permission and explicit backup-evidence approval | Create/verify/revoke metadata-only evidence | Evidence absent or draft | Evidence state changes | None | Readiness changes based on verified evidence | No backup/restore/archive execution | Backup evidence audit logs | Use marker-only metadata; never delete evidence by default | Planned only |

## 6. Output-Gate Matrix

| Output action | Permission required | Writes generated-document/archive records | Exposes customer/vendor/accounting data | Evidence that can be recorded safely | What must not be logged |
| --- | --- | --- | --- | --- | --- |
| Report JSON read | `reports.view` | No | Yes, accounting totals and report rows | Route, status, fixture marker, row/count summary, sanitized totals if fake | Full response bodies from non-fixture data |
| Report CSV export | `reports.export` or `generatedDocuments.download` | No | Yes | HTTP status, content type, filename header, fixture marker, row count if derived safely | CSV body, real account/customer/vendor data, tokens/headers |
| Report PDF download | `reports.export` or `generatedDocuments.download` | Yes, through `GeneratedDocumentService.archivePdf` | Yes | HTTP status, content type, filename header, archive metadata id/type/status/size/hash prefix only if fake | PDF body, base64 content, real account/customer/vendor data |
| Generated document list/detail | `generatedDocuments.view` | No | Metadata can reveal source numbers | Filter path, status, document type, source type, fake marker, count | Full source identifiers from non-fixture records, contentBase64 |
| Generated document download | `generatedDocuments.download` | No | Yes | HTTP status, content type, filename header, size only for fake fixture outputs | PDF body, base64, object storage key if sensitive, customer/vendor content |
| Audit log list/detail | `auditLogs.view` | No | Sanitized actor/entity/action metadata | Action/entity/status summary for fixture marker | Raw metadata dumps, actor emails from non-fixture users, IP/user-agent if sensitive |
| Audit log CSV export | `auditLogs.export` | No | Sanitized audit metadata | HTTP status, filename header, fixture marker, count | CSV body, raw before/after, tokens, headers, customer/vendor payloads |
| Audit retention preview/dry-run | `auditLogs.manageRetention` | No | Counts only | Counts, dry-run flag, warnings | Raw audit rows or metadata |
| Document settings patch | `documentSettings.manage` | No | Future PDF presentation settings | Field names changed and status, using fake org | Full payload if it includes real branding/customer info |
| Storage readiness read | `documentSettings.view` and `attachments.manage` | No | Storage/provider status and counts | Boolean readiness, blocking reason labels, dry-run flag | Secrets, URLs, bucket names if sensitive |
| Backup readiness read | `auditLogs.manageRetention` | No | Evidence summaries only | Read-only flags, missing evidence types, blocker labels | Secrets, DB URLs, restore payloads, signed XML/QR/document/attachment bodies |
| Backup evidence create/verify/revoke | `auditLogs.manageRetention` | No generated-document archive; mutates metadata-only evidence | Metadata evidence only | Evidence type, status transition, marker | Secrets, provider credentials, backup contents, restore contents |

## 7. Commands That May Be Needed Later, But Must Not Be Run Now

These are planning references only. They require future explicit approval before execution:

- Start local Docker/API/web using `docs/development/DEV_01_LOCAL_QA_RUNBOOK.md`.
- Future targeted non-mutating unit tests such as `corepack pnpm --filter @ledgerbyte/api test -- reports` or exact Jest file filters for accounting, fiscal periods, reports, generated documents, audit logs, storage, system, document settings, and number sequences.
- Future local API integration checks against disposable `DEV03-JRD-` data.
- Future authenticated browser or shell checks only after login/audit-writing approval.
- Future output checks for CSV/PDF/download/archive only after explicit output approval.

Commands still forbidden by default: migrations, seed/reset/delete, deploys, env changes, production checks, login flows, smoke, E2E, real ZATCA, real email, backup execution, restore execution, object-storage migration execution, customer-data mutation, report export/download/PDF generation, generated-document archive creation, and audit CSV export.

## 8. Existing Coverage Found

- `apps/api/src/accounting/journal-rules.spec.ts`: balanced journal validation, non-draft edit block, reversal-line construction, duplicate reversal handling, count scoping, and closed-period posting guard coverage.
- `apps/api/src/fiscal-periods/fiscal-period.service.spec.ts`: period creation/range overlap validation, close/reopen/lock transitions, locked-period reopen block, open/closed/locked posting guard behavior, and no-period posting allowance.
- `apps/api/src/chart-of-accounts/chart-of-accounts-rules.spec.ts`: account delete guard for used/system accounts and unused non-system deletion.
- `apps/api/src/tax-rates/tax-rate-rules.spec.ts`: negative tax-rate create/update rejection.
- `apps/api/src/number-sequences/number-sequence.service.spec.ts`: next-number behavior, transaction-client usage, list formatting, invalid update rejection, audit log on update, tenant-scoped detail, and example formatting.
- `apps/api/src/reports/reports.service.spec.ts`: report builders for general ledger, trial balance, P&L, balance sheet, VAT, aging, tenant scoping, inventory-related posted journal reflections, and generated report PDF archive behavior.
- `apps/api/src/reports/reports.controller.spec.ts`: report route permission, CSV/PDF content type, export permission via `reports.export` or `generatedDocuments.download`, and forbidden export without export/download permission.
- `apps/api/src/reports/report-csv.spec.ts`: CSV escaping and report CSV helper output.
- `apps/api/src/generated-documents/generated-document-rules.spec.ts`: PDF archive metadata/content, organization-scoped download, and filename sanitization.
- `apps/api/src/audit-log/audit-log.service.spec.ts`: metadata redaction, list filters, detail scoping, retention defaults/validation/update audit, retention dry-run counts, and sanitized CSV export.
- `apps/api/src/audit-log/audit-log.controller.spec.ts`: audit-log view/export/retention permission metadata.
- `apps/api/src/document-settings/organization-document-settings-rules.spec.ts`: default settings, invalid color/template rejection, and render settings mapping.
- `apps/api/src/storage/storage.service.spec.ts`: database/S3 readiness, secret redaction, and dry-run migration counts.
- `apps/api/src/storage/storage.controller.spec.ts`: storage readiness permission metadata.
- `apps/api/src/system/backup-readiness.service.spec.ts`: read-only readiness, restore drill plan, metadata-only evidence creation, secret/body rejection, and evidence verify/revoke behavior.
- `apps/api/src/system/system.controller.spec.ts`: backup readiness endpoint permission metadata.
- `apps/web/src/lib/reports.test.ts`, `apps/web/src/components/reports/report-pages.test.tsx`, `apps/web/src/lib/audit-logs.test.ts`, `apps/web/src/lib/storage.test.ts`, `apps/web/src/components/documents/document-guidance.test.tsx`, and `apps/web/src/lib/permissions.test.ts`: helper, permission, and guidance coverage.
- `tests/e2e/reports-flow.spec.ts` and `tests/e2e/storage-flow.spec.ts`: browser E2E references only; not run in this thread.

## 9. Missing Coverage

- End-to-end disposable fixture coverage for manual journal create/post/reverse with fiscal period open/closed/locked states.
- Cross-workflow posting lock checks for AR/AP/banking/inventory workflows against closed and locked fixture periods.
- Browser-runtime authenticated QA for journal/fiscal period/account/tax/report/document/audit/settings screens.
- API integration coverage proving report JSON/CSV/PDF permission behavior with a real local fixture user and role set.
- Output-gate coverage proving report PDF generation creates expected generated-document metadata and audit events without logging PDF bodies.
- Generated-document download coverage proving permission denial and successful fake-fixture download evidence.
- Audit CSV export coverage against fixture-only logs with evidence redaction rules.
- Document settings and number-sequence mutation coverage with rollback/restoration evidence.
- Storage readiness and backup-evidence metadata mutation coverage separated from real backup/restore execution.
- Policy decision on whether report CSV exports should themselves create audit events.

## 10. Risks And Blockers

- Login writes audit logs and still requires explicit approval before authenticated runtime QA.
- Fixture creation is not approved yet, so no journal, period, report, archive, audit, or storage evidence states were exercised.
- Report PDF endpoints intentionally create generated-document archive rows; they must be treated as mutating output gates, not read-only checks.
- Report CSV and audit CSV exports expose accounting/audit data; evidence must avoid recording bodies.
- Fiscal period lock is irreversible in the current UI; only disposable fixture periods should be used for lock tests.
- Account deletion is destructive and should remain out of default QA unless a future disposable deletion test is explicitly approved.
- Audit retention settings patch mutates configuration and writes an audit log; retention preview/dry-run is safer but still authenticated and permission-gated.
- Backup evidence create/verify/revoke mutates metadata-only evidence and writes audit logs; backup readiness/restore drill reads do not run backups/restores.
- Storage readiness can report database storage as local/dev acceptable while warning it is not production-scale; do not convert that into a production readiness claim.
- Browser Use local URL policy remains a known blocker for in-app browser local route visits in this Codex environment.

## 11. Proposed Next Step

Proceed with `DEV-03 Part 8: final state-machine QA triage`.

Part 8 should consolidate DEV-03 Parts 1 through 7 into a final state-machine QA triage, separate planning-only coverage from executable future QA batches, list remaining blockers by severity, and recommend the next implementation/QA ticket before any local disposable mutation or output generation is approved.

## 12. Open Questions

- Should report CSV exports and audit CSV exports write their own access audit events, or is permission gating plus HTTP access logging sufficient for the current product phase?
- Should generated-document download events be audit-logged separately from archive creation?
- Should `documents.view` continue to grant web route access to `/documents` when the API uses `generatedDocuments.view` for generated-document list/detail?
- Should backup evidence management remain tied to `auditLogs.manageRetention`, or should it move to a dedicated backup/readiness permission later?
- Should fiscal period lock remain irreversible forever, or should a controlled unlock/reopen policy exist for local/admin recovery?
- Should number sequence updates require dual approval because lowering is blocked but forward jumps can still affect future document numbering?
- Should report PDF archive rows be generated on every PDF request or deduplicated by report kind/filter/user/date in a later ticket?

## 13. Recommended Next Step

Start `DEV-03 Part 8: final state-machine QA triage`.
