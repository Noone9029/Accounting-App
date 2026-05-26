# DEV-08 AP State-Machine Preflight

## Purpose And Scope

DEV-08 starts the local AP state-machine QA chain after the DEV-06 invoice lifecycle and DEV-07 AR customer payment allocation evidence chain. This Part 1 pass is read-only planning and preflight only.

No database mutation, AP fixture creation, supplier, bill, supplier payment, refund, debit note, cash expense, purchase order, journal, inventory receipt, generated document, PDF/archive/export/download, email, ZATCA artifact, migration, seed/reset/delete, deploy, environment change, provider change, production, beta/user-testing, shared-target, hosted-database, customer-data, or login/browser flow was performed.

## DEV-07 Lessons Applied To AP

- Use a fake local marker and fixture-only records instead of production, beta, shared, hosted, or customer data.
- Split every state transition into preflight, approved mutation, evidence verification, and closure instead of chaining writes.
- Prove accounting and non-accounting effects separately: journal entries, balances, allocations, audit actions, generated documents, email, and ZATCA/output boundaries.
- Stop before mutation if any preflight state differs from the expected baseline.
- Keep temporary mutation scripts single-purpose, guarded by exact marker, family, local database target checks, and exact approval phrase.
- Prefer a minimal fixture that reaches the state-machine path cleanly before adding purchase orders, inventory clearing, refunds, debit notes, or output routes.

## Latest Commit Inspected

- `8711cf6d` - `Close DEV-07 AR state-machine evidence`.

## AP Code Paths Inspected

### Purchase Orders

Inspected:

- `apps/api/src/purchase-orders/purchase-order.controller.ts`
- `apps/api/src/purchase-orders/purchase-order.service.ts`
- `apps/api/src/purchase-orders/dto/*`
- `apps/api/src/purchase-orders/purchase-order-rules.spec.ts`

Observed state machine:

- Draft purchase order creation and draft updates.
- Approval.
- Mark sent.
- Close.
- Void.
- Convert to purchase bill.
- PDF/PDF-data/generate-PDF output routes.

Purchase orders are useful later, but they are not the safest first DEV-08 fixture because they introduce approval/sent/close/convert state before the core AP bill and supplier payment allocation path.

### Purchase Bills

Inspected:

- `apps/api/src/purchase-bills/purchase-bill.controller.ts`
- `apps/api/src/purchase-bills/purchase-bill.service.ts`
- `apps/api/src/purchase-bills/purchase-bill-accounting.ts`
- `apps/api/src/purchase-bills/dto/*`
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`

Observed state machine:

- Draft purchase bill creation and draft updates.
- Accounting preview.
- Finalization.
- Void/reversal.
- Open bill lookup with supplier filter.
- PDF/PDF-data/generate-PDF output routes.

Accounting behavior:

- Direct expense/asset bills post debit lines to expense or asset accounts.
- Purchase tax posts to VAT receivable account `230` when tax applies.
- Accounts payable posts to account `210`.
- Inventory-clearing bills have extra prerequisites and are not the safest first fixture.
- Void creates a reversal journal, marks the original journal reversed, zeroes bill balance due, and blocks if active supplier payment allocations, active supplier payment unapplied allocations, or active purchase debit note allocations exist.

### Supplier Payments

Inspected:

- `apps/api/src/supplier-payments/supplier-payment.controller.ts`
- `apps/api/src/supplier-payments/supplier-payment.service.ts`
- `apps/api/src/supplier-payments/supplier-payment-accounting.ts`
- `apps/api/src/supplier-payments/dto/*`
- `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`

Observed state machine:

- Posted supplier payment creation.
- Direct allocations to finalized purchase bills.
- Unapplied amount for overpayments.
- Apply unapplied supplier payment amount to a bill.
- Reverse unapplied supplier payment allocation.
- Void/reversal.
- Receipt/PDF-data/generate-receipt-PDF output routes.

Accounting behavior:

- Supplier payment create posts debit accounts payable and credit cash/bank.
- Apply-unapplied and reverse-unapplied are allocation-only paths and create no journal entry.
- Void creates a reversal journal, marks the original supplier payment journal reversed, restores direct bill balances, and blocks if active unapplied allocations or posted supplier refunds exist.
- `SupplierPaymentAllocation` remains historical data; the inspected schema does not expose a reversal/status field for direct allocations.

### Supplier Refunds

Inspected:

- `apps/api/src/supplier-refunds/supplier-refund.controller.ts`
- `apps/api/src/supplier-refunds/supplier-refund.service.ts`
- `apps/api/src/supplier-refunds/dto/*`
- `apps/api/src/supplier-refunds/supplier-refund-rules.spec.ts`

Observed state machine:

- Refundable source lookup from posted supplier payments and finalized purchase debit notes with unapplied amounts.
- Posted supplier refund creation.
- Void/reversal.

Accounting behavior:

- Refund creation posts debit asset and credit accounts payable.
- Void restores the source unapplied amount and creates or links a reversal journal.
- Posted supplier refunds block supplier payment void and purchase debit note void.

Supplier refunds should be deferred until after the bill/payment allocation chain is proven.

### Purchase Debit Notes

Inspected:

- `apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts`
- `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`
- `apps/api/src/purchase-debit-notes/dto/*`
- `apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts`

Observed state machine:

- Draft debit note creation and draft updates.
- Finalization.
- Apply to a purchase bill.
- Reverse debit note allocation.
- Void/reversal.
- PDF/PDF-data/generate-PDF output routes.

Accounting behavior:

- Debit note finalization reduces AP and credits expense/asset/VAT receivable lines.
- Apply and reverse allocation are matching-only paths and create no journal entry.
- Void blocks if active allocations or posted supplier refunds exist, then creates a reversal journal.

Debit notes are important AP coverage, but they add a second credit/refund source and should follow the bill/payment chain.

### Cash Expenses

Inspected:

- `apps/api/src/cash-expenses/cash-expense.controller.ts`
- `apps/api/src/cash-expenses/cash-expense.service.ts`
- `apps/api/src/cash-expenses/dto/*`
- `apps/api/src/cash-expenses/cash-expense-rules.spec.ts`

Observed state machine:

- Posted cash expense creation.
- Void/reversal.
- PDF/PDF-data/generate-PDF output routes.

Cash expenses are AP-adjacent, but they do not exercise purchase bill balance due, supplier payment allocation, or unapplied supplier payment behavior. They are not the recommended first fixture.

### Prisma Models

Inspected `apps/api/prisma/schema.prisma` for:

- `PurchaseBill`
- `PurchaseBillLine`
- `PurchaseOrder`
- `PurchaseOrderLine`
- `SupplierPayment`
- `SupplierPaymentAllocation`
- `SupplierPaymentUnappliedAllocation`
- `SupplierRefund`
- `PurchaseDebitNote`
- `PurchaseDebitNoteAllocation`
- `CashExpense`
- `JournalEntry`
- `AuditLog`

The AP models support the intended chain: finalized purchase bill, supplier payment with direct allocation and unapplied amount, supplier payment unapplied allocation, reversal, supplier payment void, and later debit-note/refund interactions.

## Fixture Runner Readiness

The existing DEV-04 fixture runner was inspected through `apps/api/scripts/dev04-fixture-runner.ts` and related tests.

Useful read-only support exists:

- Family enum includes `ap`.
- `plan`, `dry-run`, and `cleanup-plan` modes can parse an AP family marker shape.
- The existing family list includes `ar`, `ap`, `bank`, `inv`, and `jrd`.

The runner is not currently safe or complete for AP fixture mutation:

- Execute mode is explicitly restricted to the approved `ar` skeleton.
- AP `buildFamilyPlan` does not define AP proposed records.
- Marker validation currently accepts `DEV03-` or `DEV04-` prefixes, while DEV-08 uses marker `DEV08-AP-20260525T230000`.
- The current execute skeleton was built for local DEV-03 AR base fixture creation and should not be assumed to create AP fixtures.

Recommendation: Part 2 should use one guarded local temporary AP fixture script with exact marker, exact approval phrase, family `ap`, local-only database target validation, and a single controlled AP fixture mutation. A separate future code task can extend the fixture runner for DEV-08 AP if reusable runner support is preferred.

## Recommended First AP Fixture

Recommended marker:

`DEV08-AP-20260525T230000`

Recommended first fixture target:

- One fake local supplier dedicated to DEV-08.
- One direct-mode purchase bill, finalized.
- One service or expense-style line, not inventory-clearing.
- Accounts payable account `210`.
- VAT receivable account `230` if a safe purchase tax dependency is available.
- Expense or asset account for the purchase bill line.
- Cash/bank asset account available for a later supplier payment.
- No purchase order conversion.
- No purchase receipt.
- No inventory clearing.
- No supplier payment yet.
- No debit note, refund, output/PDF/archive, email, or ZATCA.

Suggested fixture economics if dependencies are safe:

- Subtotal: `1000.0000`.
- Tax: `150.0000`.
- Total: `1150.0000`.
- Balance due after finalization: `1150.0000`.

If purchase tax dependencies are not safe in the local fixture org, use a zero-tax fallback for Part 2 and reserve purchase VAT for a later focused AP tax fixture.

## Proposed DEV-08 Sequence

1. DEV-08 Part 1: AP state-machine fixture and mutation preflight.
2. DEV-08 Part 2: approved local AP fixture creation mutation.
3. DEV-08 Part 3: AP fixture evidence verification.
4. DEV-08 Part 4: supplier payment creation and allocation preflight.
5. DEV-08 Part 5: approved local supplier payment creation mutation with one direct bill allocation and an unapplied amount.
6. DEV-08 Part 6: supplier payment evidence verification.
7. DEV-08 Part 7: supplier payment unapplied allocation preflight.
8. DEV-08 Part 8: approved local supplier payment unapplied allocation mutation.
9. DEV-08 Part 9: supplier payment unapplied allocation reversal preflight.
10. DEV-08 Part 10: approved local supplier payment unapplied allocation reversal mutation.
11. DEV-08 Part 11: supplier payment void/reversal preflight.
12. DEV-08 Part 12: approved local supplier payment void/reversal mutation.
13. DEV-08 Part 13: purchase bill void/reversal preflight after payment reversal/void.
14. DEV-08 Part 14: approved local purchase bill void/reversal mutation, only if safe.
15. DEV-08 Part 15: AP state-machine closure and evidence consolidation.

Recommended later AP branch after the core bill/payment chain:

- Purchase debit note finalize/apply/reverse/void.
- Supplier refund create/void from supplier payment or debit note sources.
- Purchase order convert-to-bill.
- Cash expense lifecycle.
- Inventory-clearing bill flow.
- Output/PDF/archive/email boundaries.

## Local-Only Guard Requirements

Part 2 should not run until all of these are true:

- The exact approval phrase is present.
- `git status --short` and `git log -1 --oneline` are recorded.
- The marker is exactly `DEV08-AP-20260525T230000`.
- The family is exactly `ap`.
- Docker Desktop/Linux engine and local Postgres/Redis dependencies are available if the local stack is required.
- The database target is proven local-only before importing write-capable services.
- The target is not Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, production, prod, live, staging, beta, user-testing, shared, hosted, or customer data.
- The temp script refuses to run without the exact marker, family, and approval.
- The temp script creates only the approved AP fixture records.
- The temp script does not call supplier payment, supplier refund, debit note, purchase order output, cash expense, generated document, email, ZATCA, cleanup, migration, seed, reset, delete, or deploy paths.
- The temp script is removed after execution and remains unstaged/untracked.

## Expected Journals And Accounts

For the recommended direct-mode purchase bill fixture:

- Purchase bill finalization should create one posted purchase bill journal.
- Debit: expense or asset line account for the pretax amount.
- Debit: VAT receivable account `230` if purchase tax applies.
- Credit: accounts payable account `210`.
- Purchase bill balance due should equal the finalized bill total.

For later supplier payment coverage:

- Supplier payment create should create one posted payment journal.
- Debit: accounts payable account `210`.
- Credit: cash/bank asset account.
- Direct allocation should reduce purchase bill balance due.
- Overpayment should leave `SupplierPayment.unappliedAmount`.
- Applying unapplied supplier payment amount should reduce `SupplierPayment.unappliedAmount` and `PurchaseBill.balanceDue`, create one `SupplierPaymentUnappliedAllocation`, and create no journal.
- Reversing that unapplied allocation should restore the payment unapplied amount and bill balance due, mark the allocation reversed, and create no journal.
- Voiding the supplier payment should create a reversal journal, mark the original payment journal reversed, and restore direct bill balances according to current service behavior.
- Voiding the purchase bill should create a reversal journal, mark the original bill journal reversed, and zero or otherwise update bill balance according to current service behavior after blockers are cleared.

## Expected Audit Actions

Standardized mappings already exist for:

- `PURCHASE_BILL_CREATED`
- `PURCHASE_BILL_UPDATED`
- `PURCHASE_BILL_FINALIZED`
- `PURCHASE_BILL_VOIDED`
- `SUPPLIER_PAYMENT_CREATED`
- `SUPPLIER_PAYMENT_VOIDED`
- `PURCHASE_DEBIT_NOTE_CREATED`
- `PURCHASE_DEBIT_NOTE_UPDATED`
- `PURCHASE_DEBIT_NOTE_FINALIZED`
- `PURCHASE_DEBIT_NOTE_VOIDED`
- `SUPPLIER_REFUND_CREATED`
- `SUPPLIER_REFUND_VOIDED`
- `PURCHASE_ORDER_CREATED`
- `PURCHASE_ORDER_UPDATED`
- `PURCHASE_ORDER_APPROVED`
- `PURCHASE_ORDER_MARKED_SENT`
- `PURCHASE_ORDER_CLOSED`
- `PURCHASE_ORDER_VOIDED`
- `PURCHASE_ORDER_CONVERTED_TO_BILL`
- `CASH_EXPENSE_CREATED`
- `CASH_EXPENSE_VOIDED`

Known audit standardization gap:

- `SupplierPayment:APPLY_UNAPPLIED` appears to use raw `APPLY_UNAPPLIED` unless a future code-hardening task adds a standardized mapping.
- `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION` appears to use raw `REVERSE_UNAPPLIED_ALLOCATION` unless a future code-hardening task adds a standardized mapping.
- `PurchaseDebitNote:APPLY` and `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` appear to use raw allocation actions unless future mappings are added.

The audit gap does not block the first purchase bill fixture, but it should be captured before supplier payment apply/reverse mutation evidence.

## Output, Email, And ZATCA Boundaries

DEV-08 AP mutation parts must avoid:

- Purchase bill PDF/PDF-data/generate-PDF routes.
- Supplier payment receipt-data/receipt-PDF-data/receipt.pdf/generate-receipt-PDF routes.
- Supplier refund PDF output routes.
- Purchase debit note PDF output routes.
- Purchase order PDF output routes.
- Cash expense PDF output routes.
- Generated document archive creation.
- Email outbox/provider writes.
- ZATCA XML/signing/QR/submission artifacts.

AP purchase and supplier payment mutations should not create receipt/PDF/archive, email, or ZATCA artifacts automatically. That boundary should be explicitly checked in each mutation evidence step.

## Known Blockers And Unknowns

- The current fixture runner is not execute-ready for DEV-08 AP fixture creation.
- The exact local disposable database target and existing fixture organization/actor/account dependencies must be reverified before Part 2.
- The local fixture org may need safe fake supplier, expense/asset account, AP account, VAT receivable account, tax rate, and bank/cash account dependencies before bill finalization.
- Fiscal-period or posting-date locks can block purchase bill finalization and supplier payment posting.
- Inventory-clearing purchase bills require inventory accounting to be enabled, moving-average valuation, purchase receipt posting mode `PREVIEW_ONLY`, clearing account mapping, and at least one inventory-tracked line. This should be deferred.
- Purchase bill void is blocked by active supplier payment allocations, active supplier payment unapplied allocations, and active purchase debit note allocations.
- Supplier payment void is blocked by active unapplied allocations and posted supplier refunds.
- Purchase debit note void is blocked by active allocations and posted supplier refunds.
- AP allocation audit events are less standardized than the AR customer payment allocation events.
- Permission granularity may need future hardening for supplier payment apply/reverse and debit-note apply/update/delete routes.
- No production, beta/user-testing, hosted database, browser, customer-data, or deployment behavior is proven by this preflight.

## Required Approval Phrase For Part 2

If the next task proceeds with local AP fixture creation, use this exact approval phrase:

`I approve DEV-08 Part 2 local-only AP fixture creation mutation under marker DEV08-AP-20260525T230000. No production, no beta, no customer data.`

## Part 2 Evidence Note

DEV-08 Part 2 completed the approved local AP fixture creation mutation. Evidence is recorded in [DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md](DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md).

Part 2 created one fake local supplier and one finalized direct-mode purchase bill under marker `DEV08-AP-20260525T230000`. The VAT path was used, the bill total and balance due are `1150.0000`, one posted purchase bill journal was created, and supplier payment/refund/debit-note/purchase-order/purchase-receipt/inventory/cash-expense/output/email/ZATCA/cleanup side-effect counts remained unchanged.

## Part 3 Evidence Verification Note

DEV-08 Part 3 completed read-only verification of the Part 2 AP fixture evidence. Evidence is recorded in [DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md).

Part 3 confirmed the expected supplier, purchase bill, VAT path, posted AP journal, audit rows, temporary script absence, and fixture-specific absence of supplier payment, refund, debit-note, purchase-order, receipt, stock movement, cash-expense, generated-document, email, ZATCA, and cleanup/delete side effects.

## Exact Next Prompt Title

`DEV-08 Part 4: supplier payment creation and allocation preflight`

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` reads for the requested handoff, DEV-07, DEV-03 AP, DEV-04, DEV-05, development completion, README, and BUG_AUDIT documents.
- `rg --files` over AP module directories.
- Targeted `rg` and `Get-Content` reads for purchase order, purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, audit event, permission, fixture runner, and Prisma schema paths.

One initial Windows glob-based `rg` command and one PowerShell-quoted `rg` command failed during exploration; both were corrected with directory-based and single-quoted searches. No mutation or write-capable service method was run.

## Commands Skipped And Why

- AP fixture creation, AP mutations, write-capable service calls, local DB writes, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, exports/downloads/PDF generation, generated-document archive creation, ZATCA, email, backup/restore, production-hosting research, smoke, E2E, full tests, and full build: explicitly out of scope for read-only Part 1.

## Part 15 Closure Note

DEV-08 Part 15 closed the core AP bill/payment state-machine evidence chain. Closure is recorded in [DEV_08_AP_STATE_MACHINE_CLOSURE.md](DEV_08_AP_STATE_MACHINE_CLOSURE.md).

- Mutation performed in Part 15: no.
- Core AP bill/payment chain status: completed for the local fixture evidence path.
- Covered: fake supplier, direct-mode finalized purchase bill, AP/VAT purchase bill journal, supplier payment creation, direct allocation, unapplied amount application, unapplied allocation reversal, supplier payment void/reversal, purchase bill void/reversal after payment void, journal behavior, audit behavior, and output/email/ZATCA non-effects.
- Not covered: purchase debit notes, supplier refunds, purchase orders, cash expenses, inventory-clearing bills, purchase receipts/inventory integration, AP output/email routes, real browser-authenticated AP UI flow, repeated/idempotency paths, fiscal-period locks, permission edge cases, or production/beta/customer-data behavior.
- Recommended next prompt title: `DEV-08B Part 1: AP debit note and supplier refund branch preflight`.
