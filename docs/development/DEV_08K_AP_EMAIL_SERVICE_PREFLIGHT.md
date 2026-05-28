# DEV-08K AP Generated Document Email Service Preflight

## Purpose And Scope

- Task: `DEV-08K Part 4: AP generated-document email service preflight`.
- Latest commit inspected: `f860f444 Verify DEV-08K AP email schema design`.
- Runtime mutation performed: no.
- Service/API implementation performed: no.
- Email outbox rows created: no.
- Provider calls performed: no.

This was a read-only backend service/API design preflight. It did not implement an endpoint, create outbox rows, send email, call a provider, generate/download PDFs, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Selected Service/API Design

Add one AP-specific outbox endpoint in `EmailController`:

- `POST /email/ap-generated-documents/:generatedDocumentId/outbox`

Controller responsibilities:

- Require authenticated local organization context.
- Use `@RequirePermissions(PERMISSIONS.emailOutbox.view)` as the first static gate.
- Pass `AuthenticatedRequest` to the service so the service can enforce the full permission intersection.
- Accept `CreateApGeneratedDocumentEmailDto`.

Service method:

- `EmailService.createApGeneratedDocumentOutbox(organizationId, actorUserId, generatedDocumentId, dto, request)`

The route creates local metadata only. It must not call `this.provider.send(...)`, SMTP, retry worker, diagnostics send, webhook, suppression mutation, or any external provider path.

## Permission Design

Important existing behavior: `PermissionGuard` uses `hasAnyPermission(...)`, so multiple permissions in `@RequirePermissions(...)` are OR semantics, not AND semantics.

Therefore the implementation must enforce all AP email requirements inside `EmailService`:

- `emailOutbox.view`
- `generatedDocuments.download`
- the matching AP source view permission based on `GeneratedDocument.sourceType`:
  - `purchaseOrders.view`
  - `purchaseBills.view`
  - `supplierPayments.view`
  - `supplierRefunds.view`
  - `purchaseDebitNotes.view`
  - `cashExpenses.view`

The service should throw `ForbiddenException` if any required permission is missing. The response and test assertions must not expose role JSON, tokens, or request metadata.

## Validation Flow

The service should:

1. Load the generated document by organization and id with metadata only:
   - id
   - organization id
   - document type
   - source type
   - source id
   - document number
   - filename
   - mime type
   - content hash
   - size bytes
   - status
2. Reject missing generated documents.
3. Reject any generated document that is not `GeneratedDocumentStatus.GENERATED`.
4. Reject unsupported AP source/document pairs using `AP_GENERATED_DOCUMENT_EMAIL_SUPPORTED_SOURCES`.
5. Enforce `emailOutbox.view`, `generatedDocuments.download`, and matching AP source view permission.
6. Verify the AP source record still exists in the same organization.
7. Resolve recipient:
   - explicit `recipientEmail` from DTO if provided.
   - otherwise source supplier/contact email where a safe source contact exists.
   - otherwise reject with a clear validation error.
8. Validate recipient format.
9. Create one local outbox row with no provider call.

## Source Contact Resolution

Metadata-only source validation should use narrow selects:

| Source type | Source table | Source validation fields | Default recipient source |
| --- | --- | --- | --- |
| `PurchaseOrder` | `purchaseOrder` | id, organization id, supplier id, purchase order number | supplier contact email |
| `PurchaseBill` | `purchaseBill` | id, organization id, supplier id, bill number | supplier contact email |
| `SupplierPayment` | `supplierPayment` | id, organization id, supplier id, payment number | supplier contact email |
| `SupplierRefund` | `supplierRefund` | id, organization id, supplier id, refund number | supplier contact email |
| `PurchaseDebitNote` | `purchaseDebitNote` | id, organization id, supplier id, debit note number | supplier contact email |
| `CashExpense` | `cashExpense` | id, organization id, optional contact id, expense number | contact email if present |

Local fixture and UI QA should prefer explicit marker-scoped `.test` recipients to avoid relying on vendor/customer mailbox data.

## Outbox Row Design

The created row should use:

- `templateType`: `AP_GENERATED_DOCUMENT`
- `status`: `SENT_MOCK`
- `provider`: `mock-no-send`
- `providerMessageId`: `null`
- `attemptCount`: `0`
- `maxAttempts`: `0`
- `nextAttemptAt`: `null`
- `lastAttemptAt`: `null`
- `sentAt`: `null`
- `generatedDocumentId`: generated document id
- `sourceType`: generated document source type
- `sourceId`: generated document source id
- attachment metadata copied from generated-document metadata:
  - filename
  - mime type
  - size bytes
  - content hash

`bodyText` and `bodyHtml` should be short local/mock messaging only. They must not include PDF content, attachment body, `contentBase64`, supplier/customer details, request body, response body, signed XML, QR payload, or provider payloads.

## Response Design

Return sanitized metadata only:

- `localOnly: true`
- `noEmailSent: true`
- `providerCalled: false`
- `provider: "mock-no-send"`
- `emailOutbox`: selected list metadata plus generated-document/source/attachment fields
- `generatedDocument`: id, document type, source type/id, document number, filename, mime type, size, hash
- `redaction`: no body/base64/attachment body/provider payload

Do not return `bodyText`, `bodyHtml`, PDF bytes, `contentBase64`, raw source contact details, auth headers, cookies, tokens, or request/response bodies.

## Audit Design

Part 5 should add:

- `AUDIT_EVENTS.EMAIL_OUTBOX_CREATED`
- `EVENT_BY_ENTITY_AND_ACTION["EmailOutbox:CREATE"]`

Audit `after` metadata should contain only:

- outbox id
- template type
- status
- provider
- generated document id
- source type/id
- document type/number
- attachment filename/mime/size/hash
- no body, no recipient body, no PDF/attachment content, no provider payload

## Tests For Part 5

Targeted API tests should cover:

- valid AP generated document creates one sanitized `SENT_MOCK` outbox row and never calls provider `send`.
- missing generated document is rejected.
- unsupported source/document pair is rejected.
- non-generated document is rejected.
- missing source record is rejected.
- invalid or missing recipient is rejected.
- user with only `emailOutbox.view` is rejected because `generatedDocuments.download` and source view are missing.
- user with source view and download but no `emailOutbox.view` is rejected by the static controller gate or service helper.
- no attachment body, PDF body, or `contentBase64` appears in create payload or response.

## Part 5 Approval Phrase Status

Exact phrase received up front:

`I approve DEV-08K Part 5 local-only AP generated-document email service implementation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Commands Run

- `git status --short --branch`
- `git log -1 --oneline`
- Read `PermissionGuard`, `RequirePermissions`, `EmailController`, `EmailModule`, Part 2 schema/type evidence, and relevant AP generated-document service patterns.

## Commands Skipped

- Service/API implementation.
- Email outbox mutation, provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, PDF generation/download, body/base64 reads, attachment body reads, migrations, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 5: approved local AP generated-document email service implementation`
