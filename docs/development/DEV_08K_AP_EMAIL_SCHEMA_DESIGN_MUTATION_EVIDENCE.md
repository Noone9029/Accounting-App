# DEV-08K AP Email Schema Design Mutation Evidence

## Purpose And Scope

- Task: `DEV-08K Part 2: approved local AP generated-document email schema design mutation`.
- Latest commit inspected: `4eba5eac Plan DEV-08K AP generated document email`.
- Approval phrase status: exact phrase received up front and checked before schema/type edits.
- Marker: `DEV08K-AP-20260528T000000`.
- Runtime data mutation performed: no.
- Email outbox rows created: no.
- Provider calls performed: no.
- Migration applied to a database: no.

This part added additive schema/type support only. It did not create an AP email service, enqueue outbox rows, send email, call SMTP/provider code, generate/download PDFs, run real ZATCA, seed/reset/delete data, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Approval Phrase

`I approve DEV-08K Part 2 local-only AP generated-document email schema design mutation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Schema And Type Changes

Prisma schema:

- Added `EmailTemplateType.AP_GENERATED_DOCUMENT`.
- Added nullable generated-document/source metadata to `EmailOutbox`:
  - `generatedDocumentId`
  - `sourceType`
  - `sourceId`
- Added nullable attachment metadata snapshot fields to `EmailOutbox`:
  - `attachmentFilename`
  - `attachmentMimeType`
  - `attachmentSizeBytes`
  - `attachmentContentHash`
- Added a nullable relation from `EmailOutbox.generatedDocumentId` to `GeneratedDocument.id`.
- Added indexes on `(organizationId, generatedDocumentId)` and `(organizationId, sourceType, sourceId)`.
- Added migration file `apps/api/prisma/migrations/20260528100000_add_ap_generated_document_email_metadata/migration.sql`.

API types:

- Added `CreateApGeneratedDocumentEmailDto` with optional validated `recipientEmail`.
- Added AP email source metadata types and the six supported AP source/document pairs:
  - `PurchaseOrder` / `PURCHASE_ORDER`
  - `PurchaseBill` / `PURCHASE_BILL`
  - `SupplierPayment` / `SUPPLIER_PAYMENT_RECEIPT`
  - `SupplierRefund` / `SUPPLIER_REFUND`
  - `PurchaseDebitNote` / `PURCHASE_DEBIT_NOTE`
  - `CashExpense` / `CASH_EXPENSE`
- Added the planned local metadata-only provider marker `mock-no-send`.

Web types:

- Added `AP_GENERATED_DOCUMENT` to `EmailTemplateType`.
- Added the new nullable generated-document/source/attachment metadata fields to `EmailOutboxEntry`.
- Added the label `AP generated document`.

## Generated Client Status

- First `corepack pnpm db:generate` attempt failed because an existing local Accounting App API process held Prisma's generated query engine DLL on Windows.
- Only the local Accounting App API processes were stopped; web dev server on port `3000` was left running.
- Second `corepack pnpm db:generate` completed successfully.
- No migration was applied and no database schema was changed in the local database during this part.

## No Email Or Provider Proof

- No AP email service/controller path was implemented in Part 2.
- No `EmailOutbox` rows were created.
- No `EmailProviderEvent` rows were created.
- No active provider `send(...)`, SMTP, retry worker, diagnostics send, webhook, or suppression mutation path was called.
- No generated-document rows, PDF bytes, `contentBase64`, attachment bodies, email bodies, request bodies, response bodies, tokens, cookies, auth headers, DB URLs, signed XML, or QR payloads were printed.

## Verification

Passed:

- `corepack pnpm db:generate` after stopping the stale local API lock holder.
- `corepack pnpm --filter @ledgerbyte/api typecheck`.
- `git diff --check`.

Blocked by unrelated untracked work:

- `corepack pnpm --filter @ledgerbyte/web typecheck` failed on pre-existing untracked `apps/web/src/app/marketing.test.tsx`, where `HomePage` is currently typed as `() => void` and cannot be used as a JSX component. This file was not changed or staged.

Pending final Part 2 gate before commit:

- `corepack pnpm verify:diff`.
- `git diff --cached --check` after staging intended files.

## Commands Skipped

- Prisma migrate/deploy/db push and any database schema application.
- Seed/reset/delete, fixture mutation, email outbox mutation, provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, deploys, env/provider setting changes, backup/restore, production-hosting research, full tests, full build, E2E, smoke, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 3: AP email schema design evidence verification`

## Part 3 Follow-Up

- Part 3 verification is recorded in [DEV_08K_AP_EMAIL_SCHEMA_DESIGN_EVIDENCE_VERIFICATION.md](DEV_08K_AP_EMAIL_SCHEMA_DESIGN_EVIDENCE_VERIFICATION.md).
- Read-only local snapshot confirmed DEV-08K marker email rows `0`, provider events `0`, generated documents `870`, and local AP email migration applied `false`.
- No temporary `*dev08k*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 4: AP generated-document email service preflight`.
