# DEV-08K AP Email UI Design Preflight

## Purpose And Scope

- Task: `DEV-08K Part 13: AP email UI design preflight`.
- Latest commit inspected: `575e707d Verify DEV-08K AP email permissions`.
- Mode: read-only UI/code design preflight only.
- UI code changed: no.
- Runtime mutation performed: no.
- AP email endpoint called: no.
- Browser/login performed: no.
- Provider calls performed: no.
- Real email sent: no.

This preflight inspected the generated-document archive UI, AP source detail pages, email helper/types, permission helper, and AP email API/service boundaries. It did not change UI code, log in, run browser flows, create outbox rows, call providers, retry workers, webhooks, diagnostics sends, SMTP, ZATCA, migrations, seed/reset/delete, deploy, full tests, full build, E2E, smoke, backup/restore, or production-hosting research.

## Inputs Reviewed

- `CODEX_HANDOFF.md`.
- `docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_EVIDENCE_VERIFICATION.md`.
- `docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_CHECK_EVIDENCE.md`.
- `docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md`.
- `docs/development/DEV_08K_AP_EMAIL_SERVICE_EVIDENCE_VERIFICATION.md`.
- `docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md`.
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`.
- `BUG_AUDIT.md`.
- `README.md`.
- `apps/web/src/app/(app)/documents/page.tsx`.
- `apps/web/src/app/(app)/settings/email-outbox/page.tsx`.
- AP source detail pages for purchase orders, purchase bills, supplier payments, purchase debit notes, supplier refunds, and cash expenses as needed.
- `apps/web/src/lib/documents.ts`.
- `apps/web/src/lib/email.ts`.
- `apps/web/src/lib/permissions.ts`.
- `apps/web/src/lib/types.ts`.
- `apps/api/src/email/email.controller.ts`.
- `apps/api/src/email/email.service.ts`.
- `apps/api/src/email/ap-generated-document-email.types.ts`.
- `apps/api/src/email/dto/create-ap-generated-document-email.dto.ts`.
- `packages/shared/src/permissions.ts`.

## Current UI Surface

### `/documents`

- Lists generated documents from `GET /generated-documents`.
- Already exposes safe generated-document metadata: document id, document type, source type, document number, filename, status, generated date, and size.
- Already gates PDF downloads with `generatedDocuments.download`.
- Does not expose PDF body, base64, attachment body, email body, provider payloads, or source contact emails.
- Has the generated-document id needed by `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.

### AP Source Detail Pages

- Purchase order, purchase bill, supplier payment, supplier refund, purchase debit note, and cash expense detail pages already provide source-context actions and PDF download actions.
- These pages generally call source-specific PDF download endpoints and do not retain the generated-document id needed for the AP email endpoint.
- Adding AP email creation here would require an additional source-to-generated-document lookup or a new API response shape, which is broader than the minimal Part 14 implementation.

### `/settings/email-outbox`

- Already lists outbox entries and readiness/diagnostic surfaces.
- It is the right review/audit destination after a local AP email outbox row is created.
- It should not be the creation surface for source-specific AP generated-document emails; creation belongs beside the generated document row.

## Selected UI Placement

Part 14 should implement the minimal AP email action on `/documents` generated-document rows only.

Planned behavior:

- Show the action only for AP-supported generated documents:
  - `PurchaseOrder`
  - `PurchaseBill`
  - `SupplierPayment`
  - `SupplierRefund`
  - `PurchaseDebitNote`
  - `CashExpense`
- Show the action only when the generated document status is `GENERATED`.
- Require the user to enter a recipient email in the row-level UI rather than pre-filling a source/vendor contact email.
- Call `POST /email/ap-generated-documents/:generatedDocumentId/outbox` with only `{ recipientEmail }`.
- Display success with safe metadata only: local/mock/no-send result, provider `mock-no-send`, outbox id safe prefix if used in text, and attachment metadata already visible in the archive row.
- Offer a link to `/settings/email-outbox` for review after success.

AP source detail pages should remain download/source-context surfaces for Part 14. A future source-detail implementation can be designed after a source-to-generated-document lookup is available.

## Safe UI Wording

Use compact operational wording, not marketing copy:

- Action label: `Create local email outbox`.
- Helper text: `Local mock outbox only. No real email or provider send. PDF body is not shown.`
- Recipient label: `Recipient email`.
- Submit loading label: `Creating local outbox...`.
- Success copy: `Local AP email outbox row created. No real email was sent.`
- Unsupported/restricted rows: hide the creation action; do not print source contact email or permission details.

The UI must not show email body, PDF body, attachment body, base64, provider payload, request/response body, source contact email, customer/vendor data, token, cookie, auth header, signed XML, QR payload, private key, or CSID.

## Permission Gating Plan

Frontend visibility should require all relevant permissions:

| Requirement | Frontend check | Backend enforcement |
| --- | --- | --- |
| Can see generated documents | route guard for `/documents` | `GET /generated-documents` requires `generatedDocuments.view` |
| Can use the generated-document artifact | `generatedDocuments.download` | service requires `generatedDocuments.download` |
| Can create/review AP email outbox metadata | `emailOutbox.view` | controller requires `emailOutbox.view` |
| Can view the AP source record | source-specific permission by `sourceType` | service requires the source-specific permission |

Source-specific mapping should match `apps/api/src/email/ap-generated-document-email.types.ts`:

| Source type | Required source permission |
| --- | --- |
| `PurchaseOrder` | `purchaseOrders.view` |
| `PurchaseBill` | `purchaseBills.view` |
| `SupplierPayment` | `supplierPayments.view` |
| `SupplierRefund` | `supplierRefunds.view` |
| `PurchaseDebitNote` | `purchaseDebitNotes.view` |
| `CashExpense` | `cashExpenses.view` |

Full-access users should pass via the existing `can(...)` behavior. Restricted users missing any required permission should not see the action. Backend 403s remain authoritative.

## Expected Restricted States

- Missing `generatedDocuments.download`: no AP email creation action.
- Missing AP source view permission: no AP email creation action.
- Missing `emailOutbox.view`: no AP email creation action.
- Unsupported generated document source or non-AP document type: no AP email creation action.
- Non-`GENERATED` document status: no AP email creation action.

The row can continue showing the existing download permission message where the current archive UI already does so, but the AP email action should stay hidden when permissions are incomplete.

## Part 14 Implementation Shape

Recommended minimal files:

- `apps/web/src/app/(app)/documents/page.tsx`
  - add a row-level AP email outbox form/action for eligible rows.
  - keep existing download behavior.
  - keep safe metadata-only success/error states.
- `apps/web/src/lib/email.ts`
  - add a path/helper for the AP generated-document outbox endpoint if useful.
- `apps/web/src/lib/documents.ts` or `apps/web/src/lib/email.ts`
  - add helper functions for AP-supported source mapping and permission calculation.
- `apps/web/src/lib/types.ts`
  - add a narrow response type only if the component needs typed AP email creation response fields.
- Targeted tests near the changed helpers/components.

No schema change, backend change, provider change, real email send, or runtime migration is planned for Part 14.

## Targeted Tests For Part 14

- Full-permission user sees `Create local email outbox` for an AP `GENERATED` document.
- Restricted user missing `generatedDocuments.download` does not see the AP email action.
- Restricted user missing AP source view permission does not see the AP email action.
- Restricted user missing `emailOutbox.view` does not see the AP email action.
- Unsupported generated-document source/document type does not show the action.
- UI wording includes local/mock/no-real-send language.
- POST body contains only the explicit recipient email and does not include PDF/body/base64/attachment body.
- Success state does not render email body, attachment body, PDF body, or base64.

## Required Part 14 Approval Phrase

Status in current continuation thread: received exactly up front; re-validate before Part 14 write-capable implementation.

`I approve DEV-08K Part 14 local-only AP generated-document email UI implementation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Commands Run

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- Read DEV-08K Part 13 prompt from `E:\Downloads\dev08k_remaining_from_part12_arc_prompts.md`.
- Read required DEV-08K/DEV-08J/DEV-03/DEV-02 docs, `BUG_AUDIT.md`, and `README.md`.
- `rg --files apps/web/src | rg "(documents|email-outbox|purchase|supplier|generated|permissions|email)"`
- `rg -n "generatedDocuments|GeneratedDocument|documents|emailOutbox|EmailOutbox|permissions|download|action|menu|PurchaseBill|supplier" apps/web/src apps/api/src/email apps/api/src/generated-documents packages/shared/src/permissions.ts`
- Read targeted web/API files listed in the inputs reviewed section.

## Commands Skipped

- UI implementation.
- AP email endpoint calls.
- Login, browser/UI runtime flows, Playwright, and audit-writing authentication.
- Outbox row creation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 14: approved local AP generated-document email UI implementation`
