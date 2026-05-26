# DEV-08D Supplier Refund From Payment Preflight

## 1. Purpose And Scope

This document records the DEV-08D Part 1 read-only preflight for the remaining AP supplier refund source branch: supplier refund sourced from a supplier payment.

- Latest commit inspected: `10d93efb Close DEV-08C purchase order conversion evidence`.
- Local `HEAD` matched `origin/main`: `10d93efba1039746e50c3cd17d61ca9ab666a17e`.
- Branch inspected: `main`.
- Mutation performed: no.
- No supplier refund, supplier payment, fixture, purchase bill, purchase order, debit note, cash expense, inventory, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted-target, customer-data, login, or browser/audit-writing action was performed.

## 2. Local-Only And No-Mutation Proof

- `apps/api/.env` database target classified as local: host `localhost`, database `accounting`.
- Docker showed local `infra-postgres-1` and `infra-redis-1` containers healthy.
- Read-only SQL was run through local Docker Postgres only.
- Query output was limited to safe prefixes, counts, statuses, and amounts.
- No temporary DEV-08C or DEV-08D scripts existed under `apps/api/scripts`.
- No temporary preflight script was created in this thread.
- Existing unrelated untracked paths were left untouched and unstaged:
  - `apps/graphify-out/`.
  - `graphify-out/`.
  - `apps/web/src/app/ar/`.
  - `apps/web/src/app/marketing.test.tsx`.
  - `apps/web/src/app/pricing/`.
  - `apps/web/src/app/product/`.
  - `apps/web/src/app/readiness/`.
  - `apps/web/src/app/resources/`.
  - `apps/web/src/app/workflows/`.
  - `apps/web/src/components/marketing/`.

## 3. Current DEV-08 Context

- DEV-08 core AP bill/payment chain is closed in [DEV_08_AP_STATE_MACHINE_CLOSURE.md](DEV_08_AP_STATE_MACHINE_CLOSURE.md).
- DEV-08B purchase debit note and supplier refund-from-debit-note branch is closed in [DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md](DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md).
- DEV-08C purchase order conversion/lifecycle branch is closed in [DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md](DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md).
- DEV-08C final main purchase order: `PO-000141`, safe prefix `d6abea75`, `BILLED`, converted bill `BILL-000422`.
- DEV-08C final converted bill: `BILL-000422`, safe prefix `f37c60b2`, `FINALIZED`, total and balance due `1150.0000`, posted journal `JE-003156`.
- DEV-08C close branch: `PO-000142`, safe prefix `d40b6716`, `CLOSED`.
- DEV-08C void branch: `PO-000143`, safe prefix `ffd4e3d7`, `VOIDED`.
- DEV-08C fake local supplier safe prefix: `5ef871cd`, active `SUPPLIER`.
- DEV-08 reference supplier payment `PAY-000006` is `VOIDED`, amount `500.0000`, unapplied `200.0000`, and must not be reused as an active supplier refund source.

## 4. Supplier Refund From Supplier Payment Code Path

`SupplierRefundService.refundableSources(...)`:

- Requires `supplierId`.
- Confirms the selected supplier is active and supplier-capable.
- Lists posted supplier payments with `unappliedAmount > 0.0000`.
- Lists finalized purchase debit notes with `unappliedAmount > 0.0000`.
- Returns separate `payments` and `debitNotes` collections.

`SupplierRefundService.create(...)` for `SUPPLIER_PAYMENT`:

- Requires `sourcePaymentId` and rejects simultaneous `sourceDebitNoteId`.
- Requires a positive `amountRefunded`.
- Calls the fiscal-period guard for `refundDate` when available.
- Requires an active supplier contact.
- Requires an active posting asset received-into account.
- Claims the source supplier payment in the same transaction.
- Requires the source payment to belong to the selected supplier.
- Requires the source payment status to be `POSTED`.
- Requires refund currency to match the source payment currency.
- Requires source payment `unappliedAmount >= amountRefunded`.
- Atomically decrements source payment `unappliedAmount`.
- Creates a posted supplier refund with `sourceType = SUPPLIER_PAYMENT`, `sourcePaymentId` set, `sourceDebitNoteId` null, and a posted journal.
- Logs `SupplierRefund:CREATE` after the transaction.

`SupplierRefundService.void(...)`:

- Allows only posted supplier refunds with a journal.
- Calls the fiscal-period guard for the reversal date when available.
- Marks the supplier refund `VOIDED`.
- Creates or reuses a reversal journal and marks the original refund journal `REVERSED`.
- For supplier-payment-sourced refunds, requires the source payment to remain `POSTED`.
- Restores source payment `unappliedAmount` without exceeding payment amount.
- Logs `SupplierRefund:VOID`.

`SupplierPaymentService.void(...)`:

- Allows only posted supplier payments with a journal.
- Blocks payment void when active unapplied allocations exist.
- Blocks payment void when posted supplier refunds exist for the payment.
- Restores directly allocated bill balances if no blockers remain.
- Creates or reuses a reversal journal and marks the original payment journal `REVERSED`.
- Logs `SupplierPayment:VOID`.

## 5. Controller, Permissions, And Output Boundary

Supplier refund endpoints:

- `GET /supplier-refunds`: `supplierRefunds.view`.
- `GET /supplier-refunds/refundable-sources`: `supplierRefunds.view`.
- `POST /supplier-refunds`: `supplierRefunds.create`.
- `GET /supplier-refunds/:id/pdf-data`: `supplierRefunds.view`.
- `GET /supplier-refunds/:id/pdf`: `supplierRefunds.view`.
- `POST /supplier-refunds/:id/generate-pdf`: `supplierRefunds.view`.
- `GET /supplier-refunds/:id`: `supplierRefunds.view`.
- `POST /supplier-refunds/:id/void`: `supplierRefunds.void`.
- `DELETE /supplier-refunds/:id`: `supplierRefunds.void`.

Output boundary:

- `pdfData` is a read path that assembles PDF data.
- `pdf` renders a PDF and archives through `GeneratedDocumentService.archivePdf(...)`.
- `generatePdf` archives generated output.
- No output/PDF/archive route was run in this preflight.

## 6. Tests Inspected

Existing supplier refund tests cover:

- Balanced supplier refund journal lines.
- Supplier-payment-sourced refund creation and source payment `unappliedAmount` decrement.
- Purchase-debit-note-sourced refund creation.
- Rejecting refunds above source unapplied amount.
- Tenant-scoped supplier refund lookup.
- Supplier refund void restoring supplier payment unapplied amount.
- Supplier refund void restoring purchase debit note unapplied amount.
- Generated supplier refund PDF archive behavior.

Existing supplier payment tests cover:

- Balanced AP-clearing payment journal lines.
- Posted supplier payment creation and bill balance reduction.
- Closed fiscal period blocker for payment creation.
- Unapplied supplier payments.
- Supplier payment over-allocation rejection.
- Supplier payment void and bill balance restoration.
- Applying unapplied supplier payment amount without a journal.
- Reversing unapplied supplier payment allocation without a journal.

Missing or not directly asserted by current focused tests:

- Supplier refund source-shape rejection cases for mixed or missing source ids.
- Supplier-payment-sourced refund supplier mismatch rejection.
- Non-posted supplier payment rejection in refund creation.
- Currency mismatch rejection.
- Supplier payment void blocker when a posted supplier refund exists.
- Controller permission tests for supplier refund source and void endpoints.
- Fiscal-period blocker tests for supplier refund creation and void.

## 7. Current Safe Source Availability

Read-only local evidence:

- DEV-08D marker counts were all zero for contacts, supplier payments, supplier refunds, purchase bills, purchase orders, purchase debit notes, and cash expenses.
- DEV-08D posted supplier payment sources with unapplied amount: `0`.
- Existing posted supplier payments with unapplied amount in the local database: `64`, but they are not DEV-08D-marked and were not treated as safe disposable sources.
- DEV-08 payment reference `PAY-000006` safe prefix `622ad0b6` is `VOIDED`, amount `500.0000`, unapplied `200.0000`, posted supplier refund count `0`; it is not a valid active source.
- In the local DEV-08C organization, account `112` is active/posting `ASSET`, and account `210` is active/posting `LIABILITY`.

Conclusion: no already-existing DEV-08D-safe posted supplier payment source is available.

## 8. Selected Part 2 Mutation Option

Selected option: Option A - create a fresh local supplier payment refund source fixture only, leaving supplier refund creation for a later approved mutation.

Reason:

- It is the smallest safe next mutation.
- It avoids reusing unmarked local records.
- It avoids reusing voided `PAY-000006`.
- It isolates supplier payment source setup before proving supplier refund creation.
- It keeps the Part 2 mutation to one fake supplier plus one posted supplier payment with fully unapplied amount.

Rejected options:

- Option B was not selected because creating source and refund in one mutation would combine two behaviors before the source fixture is independently verified.
- Option C was not selected because no existing DEV-08D-safe disposable posted supplier payment source exists.

## 9. Proposed Fixture Plan

Marker:

- `DEV08D-AP-20260526T000000`.

Part 2 fixture target:

- Create one fake local supplier with the marker in display fields.
- Create one `POSTED` supplier payment under the same marker.
- `amountPaid`: `500.0000`.
- `unappliedAmount`: `500.0000`.
- `currency`: `SAR`.
- `allocations`: none.
- No purchase bill required for the source fixture.
- Paid-through account candidate: active posting asset account `112`.
- AP account requirement: active posting account `210`.

Expected Part 2 supplier payment journal:

- Debit AP account `210` for `500.0000`.
- Credit paid-through asset account `112` for `500.0000`.
- Posted and balanced at debit/credit `500.0000`.

## 10. Future Supplier Refund Mutation Target

Future approved supplier refund creation should call `SupplierRefundService.create(...)` exactly once with:

- `sourceType`: `SUPPLIER_PAYMENT`.
- `sourcePaymentId`: the DEV-08D posted source payment id.
- `sourceDebitNoteId`: absent.
- `amountRefunded`: `150.0000`.
- `currency`: `SAR`.
- `accountId`: active posting asset account `112`.

Expected future state after refund creation:

- Source supplier payment remains `POSTED`.
- Source supplier payment `unappliedAmount`: `500.0000 -> 350.0000`.
- Supplier refund is `POSTED`.
- Supplier refund amount is `150.0000`.
- Supplier refund source is the DEV-08D supplier payment.
- No purchase bill balance changes.
- No supplier payment allocation creation.
- No purchase debit note involvement.
- No purchase order involvement.
- No purchase receipt, stock movement, inventory, or cash expense involvement.

Expected future supplier refund journal:

- Debit received-into asset account `112` for `150.0000`.
- Credit AP account `210` for `150.0000`.
- Posted and balanced at debit/credit `150.0000`.

Expected audit:

- Part 2: one supplier/contact create audit and one `SupplierPayment:CREATE` audit, subject to current service behavior.
- Future refund creation: one `SupplierRefund:CREATE` audit.
- No login/browser audit-writing flow.
- No cleanup/delete audit.

## 11. Forbidden Side-Effect Baseline

Read-only marker baseline for `DEV08D-AP-20260526T000000`:

- Generated documents: `0`.
- Email outbox rows: `0`.
- Email provider events: `0`.
- ZATCA metadata: `0`.
- ZATCA submission logs: `0`.
- Purchase receipts: `0`.
- Stock movements: `0`.
- Cleanup/delete audits: `0`.

Future evidence should re-check at least:

- Supplier refunds for marker/source payment.
- Supplier payments for marker.
- Purchase bills for marker.
- Purchase orders.
- Purchase receipts.
- Stock movements.
- Cash expenses.
- Generated documents.
- Email outbox rows/provider events.
- Auth tokens if relevant.
- Cleanup/delete audits.
- ZATCA metadata/submission logs for fixture documents.
- Temporary scripts under `apps/api/scripts`.

## 12. Temporary Script Policy

If Part 2 uses a guarded temporary mutation script:

- Place it under `apps/api/scripts`.
- Validate the exact approval phrase.
- Refuse non-local database targets before importing write-capable services.
- Print only sanitized safe prefixes, statuses, counts, and amounts.
- Do not print DB URLs, tokens, auth headers, secrets, request bodies, response bodies, vendor/customer data, document bodies, XML, QR payloads, attachment bodies, or email bodies.
- Run the script only once for the approved mutation.
- Remove it before commit.
- Prove removal with `Test-Path` and `Get-ChildItem apps/api/scripts -Filter '*dev08d*'`.
- Do not stage the temporary script.

## 13. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git branch --show-current`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08*'`.
- Targeted reads of `CODEX_HANDOFF.md`, DEV-08/08B/08C closure docs, `DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md`, `DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`, `DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `DEVELOPMENT_COMPLETION_PLAN.md`, `BUG_AUDIT.md`, and `README.md`.
- Targeted reads/searches of supplier refund/payment services, controllers, DTOs, accounting helpers, tests, and Prisma schema.
- Local database target classification from `apps/api/.env` without printing the database URL.
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`.
- Read-only local SQL checks for marker counts, eligible source availability, DEV-08 `PAY-000006`, account candidates, and forbidden side-effect baseline.

## 14. Commands Skipped

- Supplier refund creation: forbidden for preflight.
- Supplier payment creation: forbidden for preflight.
- Fixture creation: forbidden for preflight.
- Purchase bill, purchase order, debit note, cash expense, purchase receipt, stock movement, allocation, reversal, void, finalize, approve, close, convert, receive, post, match, categorize, ignore, transfer, refund, export, download, send, upload, delete, cleanup, migration, seed/reset/delete, deploy, and environment/provider/schema changes: forbidden.
- API/web startup: not required for this docs/read-only preflight.
- Login/browser flows: skipped because they can write audit logs.
- PDF/export/download/archive/output generation: forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Production-hosting research and production/beta/shared/hosted/customer-data checks: explicitly forbidden.

## 15. Blockers Or Discrepancies

- No DEV-08D-safe posted supplier payment source exists yet.
- The first read-only marker query used a non-existent `PurchaseDebitNote.terms` column and stopped before returning marker counts; it was corrected against the Prisma schema and rerun read-only.
- Existing local posted supplier payments with unapplied amount are not sufficient for Option C because they are not DEV-08D-marked disposable sources.

## 16. Required Approval Phrase For Part 2

`I approve DEV-08D Part 2 local-only supplier payment refund source fixture mutation under marker DEV08D-AP-20260526T000000. No production, no beta, no customer data.`

## 17. Exact Next Prompt Title

`DEV-08D Part 2: approved local supplier payment refund source fixture mutation`
