# DEV-08K AP Email UI Implementation Evidence

## Purpose And Scope

- Task: `DEV-08K Part 14: approved local AP generated-document email UI implementation`.
- Latest commit inspected: `52a18b35 Plan DEV-08K AP email UI`.
- Approval phrase status: received exactly before implementation.
- Runtime outbox mutation performed: no.
- AP email endpoint called during tests: no.
- Provider calls performed: no.
- Real email sent: no.
- Browser/login performed: no.
- Schema changed: no.

This implementation added minimal AP generated-document email UI wiring on `/documents`. It did not create outbox rows, call a real email provider, send real email, run login/browser flows, print or surface bodies/base64/provider payloads, run retry workers, run webhooks, run diagnostics sends, run ZATCA, change schema, run migrations, seed/reset/delete, deploy, or use production, beta, hosted/shared, or customer data.

## Approval Phrase

Confirmed exact phrase:

`I approve DEV-08K Part 14 local-only AP generated-document email UI implementation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## UI Changes Made

### `/documents` Generated Document Rows

- Added a row-level `Create local email outbox` form for eligible AP generated documents.
- The form requires an explicit recipient email typed into the UI; it does not prefill source/vendor contact email.
- The form posts only `{ recipientEmail }` to `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.
- The row text states: `Local mock outbox only. No real email or provider send. PDF body is not shown.`
- Success text states that a local AP email outbox row was created and no real email was sent, then links to `/settings/email-outbox` for review.
- Existing generated-document PDF download behavior remains unchanged.

### Helper/Permission Wiring

- Added `apGeneratedDocumentOutboxPath(...)` in `apps/web/src/lib/email.ts`.
- Added AP generated-document email eligibility helpers in `apps/web/src/lib/documents.ts`.
- Frontend visibility now requires:
  - `generatedDocuments.download`
  - `emailOutbox.view`
  - the matching AP source view permission
  - supported AP source/document type
  - generated-document status `GENERATED`

Supported source mapping matches the backend AP email service boundary:

| Source type | Document type | Required source permission |
| --- | --- | --- |
| `PurchaseOrder` | `PURCHASE_ORDER` | `purchaseOrders.view` |
| `PurchaseBill` | `PURCHASE_BILL` | `purchaseBills.view` |
| `SupplierPayment` | `SUPPLIER_PAYMENT_RECEIPT` | `supplierPayments.view` |
| `SupplierRefund` | `SUPPLIER_REFUND` | `supplierRefunds.view` |
| `PurchaseDebitNote` | `PURCHASE_DEBIT_NOTE` | `purchaseDebitNotes.view` |
| `CashExpense` | `CASH_EXPENSE` | `cashExpenses.view` |

Backend enforcement remains authoritative through the existing `emailOutbox.view`, `generatedDocuments.download`, and AP source-view checks.

## Tests

Targeted tests added/updated:

- `apps/web/src/app/(app)/documents/page.test.tsx`
  - verifies the AP email row action renders local/mock/no-real-send wording.
  - verifies explicit recipient submission does not include body/base64/attachment/PDF payload fields.
  - verifies restricted/unsupported rows hide the action.
- `apps/web/src/lib/documents.test.ts`
  - verifies full-permission eligibility.
  - verifies missing `generatedDocuments.download`, `emailOutbox.view`, or AP source view permission blocks the UI action.
  - verifies unsupported or non-`GENERATED` documents are blocked.
- `apps/web/src/lib/email.test.ts`
  - verifies AP generated-document outbox endpoint construction.
  - verifies `AP_GENERATED_DOCUMENT` template label.

Final targeted test command:

`corepack pnpm exec jest --config jest.config.cjs src/lib/documents.test.ts src/lib/email.test.ts --testPathPatterns=documents/page.test.tsx`

Result: `3` test suites passed, `18` tests passed.

## No-Send And Exposure Result

- No real email was sent.
- No provider call was made.
- No AP email endpoint call was made during tests.
- No outbox row was created by Part 14.
- No email body, attachment body, PDF body, base64, provider payload, request/response body, source contact email, customer/vendor data, token, cookie, auth header, signed XML, QR payload, private key, or CSID was printed or surfaced by the UI tests.
- The UI submits only explicit `recipientEmail`; it does not submit PDF/body/base64 fields.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- Read DEV-08K Part 14 prompt from `E:\Downloads\dev08k_remaining_from_part12_arc_prompts.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_UI_DESIGN_PREFLIGHT.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_SERVICE_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, and `README.md`.
- Read targeted web/API files for documents, email helpers, permissions, and AP email service/controller behavior.
- Red-step targeted tests failed before helper/component implementation because `canCreateApGeneratedDocumentEmail`, `apGeneratedDocumentOutboxPath`, and `GeneratedDocumentApEmailAction` did not exist yet.
- `corepack pnpm exec jest --config jest.config.cjs src/lib/documents.test.ts src/lib/email.test.ts --testPathPatterns=documents/page.test.tsx`
- `corepack pnpm --filter @ledgerbyte/web lint`

## Commands Skipped Or Not Completed

- `corepack pnpm --filter @ledgerbyte/web lint` did not complete because an unrelated untracked `apps/web/src/app/marketing.test.tsx` type error treats `HomePage` as a JSX component while the current untracked page shape returns `void`. This was outside DEV-08K and was left untouched.
- Browser/login/runtime UI flow was not run in Part 14.
- AP email endpoint calls and outbox creation were not run in Part 14.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, ZATCA, PDF generation/download, body/base64 reads, attachment body reads, migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, and production-hosting research were not run.

## Exact Next Prompt Title

`DEV-08K Part 15: AP email UI evidence verification`

## Part 15 Verification Note

- Part 15 read-only/code-level verification is recorded in [DEV_08K_AP_EMAIL_UI_EVIDENCE_VERIFICATION.md](DEV_08K_AP_EMAIL_UI_EVIDENCE_VERIFICATION.md).
- The `/documents` row action is gated through `canCreateApGeneratedDocumentEmail(document, can)`.
- Targeted tests passed again: `3` suites and `18` tests.
- Permission visibility was verified for full-permission, missing `generatedDocuments.download`, missing `emailOutbox.view`, missing AP source view, unsupported source/document type, and non-`GENERATED` document cases.
- Local read-only count verification stayed unchanged: email outbox rows `228`, AP generated-document email rows `1`, selected generated-document email rows `1`, provider events `0`.
- No AP email endpoint call, outbox creation, provider call, real email send, browser/login flow, or body/base64 exposure occurred.
- Temporary cleanup was verified: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 16: AP email local UI outbox QA preflight`.
