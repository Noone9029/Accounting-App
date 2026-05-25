# DEV-08 Supplier Payment Void Preflight

## Purpose And Scope

This document records DEV-08 Part 11: a read-only preflight and mutation plan for voiding/reversing the DEV-08 supplier payment after the supplier payment unapplied allocation was reversed in Part 10.

No supplier payment void, supplier payment creation, supplier payment apply-unapplied, supplier payment reverse-unapplied, purchase bill mutation, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow was performed.

## Latest Commit Inspected

- Latest inspected commit: `0b4c343f Reverse DEV-08 supplier payment unapplied allocation`.
- `HEAD` matched `origin/main`: `0b4c343f2b1208e7c083de284013a945735d6e33`.
- Branch: `main`.
- Existing unrelated untracked web/marketing and graph output files were left untouched and unstaged.

## Current Payment, Bill, And Allocation Evidence

Read-only SQL was run inside local compose Postgres with `BEGIN READ ONLY`.

Supplier:

- Count: `1`
- Display label: `DEV08-AP-20260525T230000 Supplier`
- Safe id prefix: `0e36df97`
- Type/status: `SUPPLIER`, active
- Organization count: `1`

Supplier payment:

- Payment number: `PAY-000006`
- Safe id prefix: `622ad0b6`
- Status: `POSTED`
- Amount paid: `500.0000`
- Unapplied amount: `200.0000`
- Journal: `JE-000050`
- Journal safe id prefix: `b77bd6f7`
- Paid-through account: `112 Bank Account`
- Voided at: absent
- Void reversal journal: absent

Purchase bill:

- Bill number: `BILL-000007`
- Safe id prefix: `d81ddd60`
- Status: `FINALIZED`
- Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`
- Subtotal: `1000.0000`
- Tax total: `150.0000`
- Total: `1150.0000`
- Balance due: `850.0000`
- Purchase order link: absent
- Reversal journal: absent
- Bill journal: `JE-000049`

Allocations:

- Direct `SupplierPaymentAllocation` count: `1`
- Direct allocation safe prefix: `6ec44d14`
- Direct allocation amount: `300.0000`
- `SupplierPaymentUnappliedAllocation` total count: `1`
- Active unapplied allocation count: `0`
- Reversed unapplied allocation count: `1`
- Reversed unapplied allocation safe prefix: `a8ee4e23`
- Reversed unapplied allocation amount: `200.0000`
- `reversedAt`: set
- `reversedById`: set
- `reversalReason`: `DEV-08 local-only reversal QA for supplier payment unapplied allocation`

Current journal/accounting state:

- Supplier payment journal `JE-000050` is `POSTED`.
- `JE-000050` total debit: `500.0000`.
- `JE-000050` total credit: `500.0000`.
- `JE-000050` lines:
  - Debit AP account `210 Accounts Payable` for `500.0000`.
  - Credit paid-through account `112 Bank Account` for `500.0000`.
- No reversal journal exists for `JE-000050`.
- Organization journal entries: `50`.
- `JOURNAL_ENTRY` sequence next: `51`.
- `PAYMENT` sequence next: `7`.
- Fiscal period covering the current posting date: `2026:OPEN`.

Current audit state:

- `SupplierPayment:SUPPLIER_PAYMENT_CREATED` exists once for `PAY-000006`.
- `SupplierPayment:APPLY_UNAPPLIED` exists once for `PAY-000006`.
- `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION` exists once for allocation `a8ee4e23`.
- `SupplierPayment:SUPPLIER_PAYMENT_VOIDED` for `PAY-000006`: `0`.
- Posted supplier refunds sourced from `PAY-000006`: `0`.

Current forbidden side-effect counts for this fixture:

- Generated documents for the payment or bill: `0`
- Email outbox records containing the DEV-08 marker: `0`
- ZATCA signed artifact drafts since payment creation: `0`
- ZATCA submission logs since payment creation: `0`
- Supplier refunds: `0`
- Purchase debit notes: `0`
- Purchase orders: `0`
- Purchase receipts: `0`
- Cash expenses: `0`
- Stock movements since bill creation: `0`
- Auth tokens since payment creation: `0`

Organization baseline counts remain non-zero for existing local AP-ready data and must be compared before/after in Part 12:

- ZATCA signed artifact drafts: `1`
- ZATCA submission logs: `7`

## Local-Only Safety Proof

- Docker engine was available with Linux containers.
- Local compose services `infra-postgres-1` and `infra-redis-1` were healthy.
- Read-only database checks used the local compose Postgres container.
- The read-only transaction reported `transaction_read_only = on`.
- No hosted, production, beta, user-testing, shared, or customer-data target was used.
- Database URLs, credentials, tokens, cookies, auth headers, request/response bodies, vendor/customer data, signed XML, QR payloads, and document bodies are not recorded in this evidence.

## Code Paths Inspected

- `apps/api/src/supplier-payments/supplier-payment.controller.ts`
  - `POST /supplier-payments/:id/void`
  - `@RequirePermissions(PERMISSIONS.supplierPayments.void)`
  - Calls `SupplierPaymentService.void(organizationId, user.id, id)`.
  - No request body or void DTO is accepted by the controller.
- `apps/api/src/supplier-payments/supplier-payment.service.ts`
  - `void(...)`
  - `createOrReuseReversalJournal(...)`
  - `assertPostingDateAllowed(...)`
  - Direct allocation bill-balance restoration logic.
  - Active unapplied allocation blocker.
  - Posted supplier refund blocker.
- `apps/api/src/supplier-payments/supplier-payment-accounting.ts`
  - Original supplier payment journal direction.
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`
  - Supplier payment void test proving bill balance restoration and reversal journal creation.
  - Fiscal-period guard test coverage for posting paths.
  - Apply/reverse-unapplied tests proving those paths are matching-only.
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`
  - Bill void blocker with active supplier payment allocations.
- `apps/api/prisma/schema.prisma`
  - `SupplierPayment`
  - `SupplierPaymentAllocation`
  - `SupplierPaymentUnappliedAllocation`
  - `PurchaseBill`
  - `JournalEntry`
  - `JournalLine`
  - `FiscalPeriod`
  - `AuditLog`
- `apps/api/src/audit-log/audit-events.ts`
  - `SupplierPayment:VOID` maps to standardized `SUPPLIER_PAYMENT_VOIDED`.

## Whether Void Is Safe Or Blocked

Void is safe to plan for Part 12 if the same preflight state still holds at mutation time.

The current service design allows voiding this payment because:

- Supplier payment `PAY-000006` is `POSTED`.
- Supplier payment `PAY-000006` has original journal `JE-000050`.
- No active `SupplierPaymentUnappliedAllocation` remains for this payment.
- The previous `200.0000` unapplied allocation is reversed.
- No posted `SupplierRefund` exists for `PAY-000006`.
- The remaining direct allocation is not a blocker; the service restores allocated bill balances during void.
- `BILL-000007` is `FINALIZED`.
- Current bill balance `850.0000` satisfies the service guard for restoring the direct `300.0000` allocation without exceeding the bill total.
- The fiscal period covering the current posting date is `OPEN`.

## Exact Planned Void If Safe

Future Part 12 should call only:

```ts
await supplierPaymentService.void(organizationId, actorUserId, supplierPaymentId);
```

Planned target:

- Supplier payment: `PAY-000006`
- Supplier payment safe id prefix: `622ad0b6`
- Purchase bill affected by direct allocation restoration: `BILL-000007`
- Direct allocation to restore: `300.0000`
- Marker: `DEV08-AP-20260525T230000`
- Family: `ap`

There is no supported void DTO/body in the current controller/service path. Do not invent `reason`, `voidReason`, `notes`, or similar fields for Part 12.

The Part 12 guarded script should instantiate the same service path with `FiscalPeriodGuardService` so the posting-date guard remains active.

## Preconditions Required Before Mutation

Part 12 must stop before mutation if any of these differ:

- Approval phrase is absent or changed.
- Database target is not local-only.
- Docker/local Postgres health is not confirmed if local DB access is used.
- Marker is not exactly `DEV08-AP-20260525T230000`.
- Family is not exactly `ap`.
- `PAY-000006` is not the only DEV-08 supplier payment for the fixture supplier.
- `PAY-000006` is not `POSTED`.
- `PAY-000006` amount paid is not `500.0000`.
- `PAY-000006` unapplied amount is not `200.0000`.
- `PAY-000006` journal is not `JE-000050`.
- `PAY-000006` already has `voidReversalJournalEntryId`.
- `BILL-000007` is not `FINALIZED`.
- `BILL-000007` total is not `1150.0000`.
- `BILL-000007` balance due is not `850.0000`.
- Direct `SupplierPaymentAllocation` count is not exactly `1` for `300.0000`.
- Any active `SupplierPaymentUnappliedAllocation` exists.
- The prior `SupplierPaymentUnappliedAllocation` is not reversed.
- Any posted `SupplierRefund` exists for `PAY-000006`.
- Any forbidden side effect appears.
- Fiscal period guard would block the reversal posting date.

## Expected Payment Effect

If approved in Part 12:

- `PAY-000006` changes from `POSTED` to `VOIDED`.
- Amount paid remains historically `500.0000`.
- Unapplied amount is expected to remain `200.0000` because the current `void(...)` service does not update `unappliedAmount`.
- `voidedAt` is set.
- `voidedById` is not set because the current schema does not have that field.
- Void reason is not stored because the current schema/controller/service do not support it.
- `journalEntryId` remains linked to original journal `JE-000050`.
- `voidReversalJournalEntryId` is set to the new reversal journal.

## Expected Bill Effect

If approved in Part 12:

- `BILL-000007` remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due changes from `850.0000` to `1150.0000`.
- Purchase bill journal `JE-000049` remains unchanged.
- Purchase bill reversal journal remains absent.
- Purchase order link remains absent.

## Expected Allocation Effect

If approved in Part 12:

- Direct `SupplierPaymentAllocation` safe prefix `6ec44d14` remains a historical record for `300.0000`.
- The direct allocation is not deleted and is not marked reversed by current schema design.
- Reversed `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` remains reversed.
- No new supplier payment allocation is created.
- No new supplier payment unapplied allocation is created.
- No purchase debit note allocation is created.

## Expected Journal And Accounting Effect

If approved in Part 12:

- A new supplier payment reversal journal is created.
- Expected reversal journal number: `JE-000051`, if the `JOURNAL_ENTRY` sequence is unchanged at mutation time.
- Original supplier payment journal `JE-000050` changes from `POSTED` to `REVERSED`.
- Reversal journal reverses `JE-000050`:
  - Debit paid-through account `112 Bank Account` for `500.0000`.
  - Credit AP account `210 Accounts Payable` for `500.0000`.
- Reversal journal total debit is `500.0000`.
- Reversal journal total credit is `500.0000`.
- Reversal journal is balanced and `POSTED`.
- Purchase bill journal `JE-000049` remains unchanged.
- No purchase bill reversal journal is created.
- If no other journal is created before Part 12, `JOURNAL_ENTRY` sequence should move from next `51` to next `52`.

## Expected Audit Effect

If approved in Part 12:

- `SupplierPayment:SUPPLIER_PAYMENT_CREATED` remains once for `PAY-000006`.
- `SupplierPayment:APPLY_UNAPPLIED` remains once for `PAY-000006`.
- `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION` remains once for allocation `a8ee4e23`.
- One standardized `SupplierPayment:SUPPLIER_PAYMENT_VOIDED` audit action is created for `PAY-000006`.
- No supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing action is expected.

## Expected Forbidden Side-Effect Non-Effects

If approved in Part 12, these must remain absent for the DEV-08 fixture:

- Generated document
- Receipt/PDF/archive/export/download
- Email outbox/provider event
- ZATCA XML/signing/QR/submission artifact
- Supplier refund
- Purchase debit note
- Purchase order
- Purchase receipt
- Stock movement
- Cash expense
- Cleanup deletion
- Migration
- Seed/reset/delete
- Deploy
- Environment/provider/schema change
- Production, beta, shared-target, or customer-data action

The AP-ready local organization has existing local ZATCA baselines (`1` signed artifact draft and `7` submission logs), so Part 12 must compare before/after counts rather than treating the baseline as a new side effect.

## Blockers Or Deviations

- No blocker found for the planned supplier payment void.
- Current code does not accept or persist a void reason for supplier payments.
- Current code does not set `voidedById` for supplier payments.
- Current code does not zero `unappliedAmount` during void; the expected value after void is therefore `200.0000`.
- Direct supplier payment allocations remain historical records after void; the bill balance restoration is the accounting effect.
- Part 12 must stop if any active `SupplierPaymentUnappliedAllocation` or posted `SupplierRefund` appears before mutation.

## Required Approval Phrase For Part 12

```text
I approve DEV-08 Part 12 local-only supplier payment void/reversal mutation under marker DEV08-AP-20260525T230000 for the DEV-08 supplier payment linked to BILL-000007. No production, no beta, no customer data.
```

## Exact Next Prompt Title

```text
DEV-08 Part 12: approved local supplier payment void/reversal mutation
```

## Commands Run

- `git fetch origin main`
- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git branch --show-current`
- `docker info --format '{{.OSType}} {{.ServerVersion}}'`
- `docker compose -f infra/docker-compose.yml ps`
- Read-only SQL using `docker exec -i infra-postgres-1 psql ...` with `BEGIN READ ONLY`
- Code/document inspection commands for the supplier payment void route, service, accounting helper, tests, schema, audit mapping, and handoff

## Commands Skipped And Why

- Supplier payment void: skipped because Part 11 is preflight only.
- Supplier payment creation, apply-unapplied, and reverse-unapplied: skipped because those DEV-08 mutations are already complete.
- Purchase bill mutation, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, and ZATCA routes: skipped by safety limits.
- Full tests, full build, smoke, E2E, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, backup/restore, and production-hosting research: skipped by task scope.

## Remaining DEV-08 Risks

- Part 12 still needs approval-gated local mutation and after-state evidence.
- Purchase bill void/reversal remains unproven after supplier payment void.
- Supplier refund and purchase debit note interactions remain unproven.
- Output/PDF/archive, email, and ZATCA flows remain deliberately outside this AP payment state-machine chain.

## Part 12 Mutation Evidence Note

DEV-08 Part 12 completed the approved local-only supplier payment void/reversal mutation. Evidence is recorded in [DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md).

- Mutation performed: yes. `SupplierPaymentService.void(...)` was called exactly once for `PAY-000006`.
- Payment result: `PAY-000006` changed from `POSTED` to `VOIDED`, safe id prefix `622ad0b6`, amount paid remained `500.0000`, unapplied amount remained `200.0000`, `voidedAt` was set, original journal remained `JE-000050`, and void reversal journal `JE-000051` was created.
- Bill result: `BILL-000007` remained `FINALIZED`, safe id prefix `d81ddd60`, total remained `1150.0000`, balance due changed `850.0000 -> 1150.0000`, and purchase bill reversal journal remained absent.
- Allocation result: direct `SupplierPaymentAllocation` `6ec44d14` remained a historical allocation for `300.0000`; reversed `SupplierPaymentUnappliedAllocation` `a8ee4e23` remained reversed; no new allocation or debit-note allocation was created.
- Accounting result: original supplier payment journal `JE-000050` changed to `REVERSED`; reversal journal `JE-000051`, safe id prefix `ebc58c26`, posted with debit `112` for `500.0000` and credit `210` for `500.0000`; purchase bill journal `JE-000049` remained posted and unchanged.
- Audit result: standardized `SUPPLIER_PAYMENT_VOIDED` exists once for `PAY-000006`; no supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Forbidden side effects: no generated document, PDF/archive/export/download, email, ZATCA change, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, purchase bill void, fixture cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.
- Exact next prompt title: `DEV-08 Part 13: purchase bill void/reversal preflight after supplier payment void`.
