# DEV-08K AP Generated Document Email Design Preflight

## Purpose And Scope

- Task: `DEV-08K Part 1: AP generated-document email design preflight`.
- Latest commit inspected: `25ae0b5b Close DEV-08J repeated blocker evidence`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08K-AP-20260528T000000`.
- Runtime mutation performed: no.
- Schema/code/email/outbox/provider mutation performed: no.

This was a read-only design preflight. It did not create email rows, call any provider, generate or download PDFs, run real ZATCA, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, shared, hosted, or customer data.

## Current Boundary

- DEV-08H proved there was no safe AP generated-document email/outbox path.
- DEV-08I proved AP output permission behavior for generated-document archive/download flows.
- DEV-08J hardened AP source PDF routes so source PDF stream/generate paths require both AP source view and `generatedDocuments.download`.
- `EmailTemplateType` currently supports only `ORGANIZATION_INVITE`, `PASSWORD_RESET`, and `TEST_EMAIL`.
- `EmailOutbox` currently stores subject/body delivery metadata but has no generated-document reference, source reference, or attachment metadata fields.
- Existing generic `POST /email/test-send`, retry, provider-event, and suppression flows are not AP document email flows.

## AP Document Families

The local AP generated-document email path should support the existing AP output document types only:

| Document type | Source type | Existing generated-document source |
| --- | --- | --- |
| `PURCHASE_ORDER` | `PurchaseOrder` | purchase order source PDF/archive |
| `PURCHASE_BILL` | `PurchaseBill` | purchase bill source PDF/archive |
| `SUPPLIER_PAYMENT_RECEIPT` | `SupplierPayment` | supplier payment receipt PDF/archive |
| `SUPPLIER_REFUND` | `SupplierRefund` | supplier refund PDF/archive |
| `PURCHASE_DEBIT_NOTE` | `PurchaseDebitNote` | purchase debit note source PDF/archive |
| `CASH_EXPENSE` | `CashExpense` | cash expense source PDF/archive |

Sales, AR, reports, statements, bank reports, ZATCA signed artifacts, and attachment uploads are out of this DEV-08K AP scope.

## Design Decision

Add a dedicated AP generated-document email outbox path that records local/mock outbox metadata only. It must not call the active email provider, SMTP, retry worker, webhook path, or any real external email system.

Part 2 should add schema/type support:

- `EmailTemplateType.AP_GENERATED_DOCUMENT`.
- Nullable `EmailOutbox.generatedDocumentId` referencing `GeneratedDocument`.
- Nullable `EmailOutbox.sourceType` and `EmailOutbox.sourceId`.
- Nullable attachment metadata snapshot fields:
  - `attachmentFilename`
  - `attachmentMimeType`
  - `attachmentSizeBytes`
  - `attachmentContentHash`
- Indexes for `(organizationId, generatedDocumentId)` and `(organizationId, sourceType, sourceId)`.
- Web types and label support for the new template and metadata fields.

The fields are nullable to preserve existing invite, password-reset, and test-email rows. No existing email contract should break.

## Service/API Scope

Part 5 should add one AP-specific backend endpoint under the email boundary:

- `POST /email/ap-generated-documents/:generatedDocumentId/outbox`

Required permissions:

- `emailOutbox.view`
- `generatedDocuments.download`
- the matching AP source view permission for the generated document source:
  - `purchaseOrders.view`
  - `purchaseBills.view`
  - `supplierPayments.view`
  - `supplierRefunds.view`
  - `purchaseDebitNotes.view`
  - `cashExpenses.view`

Required behavior:

- Load the generated document by organization and id using metadata only.
- Accept only `GeneratedDocumentStatus.GENERATED`.
- Accept only the six AP document/source pairs listed above.
- Validate that the source record still exists in the same organization.
- Use an explicit recipient email from the request or the source supplier/contact email when safe and present.
- Validate recipient format.
- Create exactly one `EmailOutbox` row with status `SENT_MOCK`, provider `mock-no-send`, no provider message id, no retry scheduling, and no real provider call.
- Store attachment metadata only from `GeneratedDocument`; never copy or log `contentBase64`, PDF bytes, attachment body, email request bodies, or response bodies.
- Return sanitized metadata only: ids/prefix-safe document fields, status, provider, template, attachment filename/mime/size/hash, source type/id, and no body content.

## Recipient And Source Handling

- Purchase order, purchase bill, supplier payment, supplier refund, and purchase debit note resolve to supplier contact context.
- Cash expense resolves to the optional supplier/contact context; if no contact email exists, explicit local recipient input is required.
- Local QA should use a marker-scoped `.test` recipient, not production, beta, customer, or vendor mailbox data.
- The service may store raw recipient email in `EmailOutbox.toEmail` because that is existing email outbox behavior, but evidence docs must print only safe prefixes or masked values.

## Redaction Policy

- Do not print secrets, tokens, auth headers, cookies, request bodies, response bodies, DB URLs, vendor/customer details, email bodies, PDF bodies, `contentBase64`, attachment bodies, signed XML, QR payloads, private keys, CSIDs, or provider payloads.
- Audit metadata should include ids, document/source types, filename, mime type, size, hash, and no body material.
- UI detail views may continue to show email body for existing records, but AP UI evidence should not quote bodies.

## Audit Policy

Part 5 should add an explicit audit event for AP outbox creation:

- `EMAIL_OUTBOX_CREATED`
- entity type `EmailOutbox`
- action mapping `EmailOutbox:CREATE`

The audit `after` payload should be sanitized AP email metadata only, with no body, PDF content, attachment body, provider payload, or raw request data.

## UI Scope

Part 14 should add minimal AP source-page UI actions only after backend evidence is verified:

- Show an email action only when the user has the source view permission, `generatedDocuments.download`, and `emailOutbox.view`.
- Use the existing generated-document/source PDF action as the precondition; do not generate a PDF inside the email action unless the backend explicitly requires an existing generated-document id.
- Display local/mock/no-real-send wording.
- Do not display PDF bodies, base64, or attachment bodies.

## Tests

Targeted backend tests should cover:

- valid AP generated document creates sanitized outbox metadata.
- missing generated document is blocked.
- unsupported source/document pair is blocked.
- missing source record is blocked.
- missing/invalid recipient is blocked.
- no provider call occurs.
- no attachment body is stored outside the existing generated document archive.
- permission metadata on the controller requires email outbox, generated-document download, and source view permission.

Targeted web tests should cover:

- AP email action is visible with the required permissions.
- AP email action is absent without `emailOutbox.view`.
- AP email action is absent without `generatedDocuments.download`.
- UI copy says local/mock/no real send.

## Part 2 Approval Phrase Status

Exact phrase received up front:

`I approve DEV-08K Part 2 local-only AP generated-document email schema design mutation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Commands Run

- `git fetch origin`
- `git status --short --branch`
- `git log --oneline -8 --decorate`
- `git rev-parse HEAD`
- `rg` inspections across email, generated-document, AP output, permissions, and web email-outbox code.
- Read required DEV-08H, DEV-08I, DEV-08J, DEV-02, `CODEX_HANDOFF.md`, `BUG_AUDIT.md`, and `README.md` context as needed.

## Commands Skipped

- Schema/code mutation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, and SMTP.
- PDF generation/download, body/base64 reads, attachment body reads, ZATCA network/signing/clearance/reporting/PDF-A3.
- Migrations, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, and production-hosting research.

## Exact Next Prompt Title

`DEV-08K Part 2: approved local AP generated-document email schema design mutation`

## Part 2 Follow-Up

- Part 2 evidence is recorded in [DEV_08K_AP_EMAIL_SCHEMA_DESIGN_MUTATION_EVIDENCE.md](DEV_08K_AP_EMAIL_SCHEMA_DESIGN_MUTATION_EVIDENCE.md).
- The selected design was implemented as additive nullable `EmailOutbox` schema/type metadata plus AP email DTO/source metadata types.
- Prisma client generation succeeded after stopping a stale local Accounting App API process that held the Prisma query engine DLL.
- No migration was applied, no outbox row was created, and no provider call was made.
- Exact next prompt title: `DEV-08K Part 3: AP email schema design evidence verification`.
