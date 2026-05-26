# DEV-08 AP State-Machine Closure

## Scope

This document closes the core DEV-08 local AP bill/payment evidence chain. It consolidates what the committed DEV-08 evidence proves, what it does not prove, and the recommended next AP branch before moving fully into banking/reconciliation.

Part 15 is read-only documentation and verification only. No database mutation, login/browser flow, supplier/bill/payment/allocation/refund/debit-note/purchase-order/purchase-receipt/cash-expense/stock movement action, generated document, PDF/archive/export/download, email, ZATCA XML/signing/QR/submission, cleanup deletion, migration, seed/reset/delete, deployment, environment change, provider change, production, beta, shared-target, or customer-data action was performed.

## Latest Commit Inspected

- `b99e068b` - `Void DEV-08 purchase bill`.
- Local `HEAD` matched `origin/main`: `b99e068bed1effefa5ed1909753696d08521644e`.
- Branch inspected: `main`.

## Evidence Documents Reviewed

- [CODEX_HANDOFF.md](../../CODEX_HANDOFF.md).
- [DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).
- [DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md](DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md).
- [DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md).
- [DEV_08_SUPPLIER_PAYMENT_VOID_PREFLIGHT.md](DEV_08_SUPPLIER_PAYMENT_VOID_PREFLIGHT.md).
- [DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md).
- [DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_PREFLIGHT.md](DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_PREFLIGHT.md).
- [DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md).
- [DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_PREFLIGHT.md](DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_PREFLIGHT.md).
- [DEV_08_SUPPLIER_PAYMENT_EVIDENCE_VERIFICATION.md](DEV_08_SUPPLIER_PAYMENT_EVIDENCE_VERIFICATION.md).
- [DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md](DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md).
- [DEV_08_SUPPLIER_PAYMENT_CREATION_PREFLIGHT.md](DEV_08_SUPPLIER_PAYMENT_CREATION_PREFLIGHT.md).
- [DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md).
- [DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md](DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md).
- [DEV_08_AP_STATE_MACHINE_PREFLIGHT.md](DEV_08_AP_STATE_MACHINE_PREFLIGHT.md).
- [DEV_07_AR_STATE_MACHINE_CLOSURE.md](DEV_07_AR_STATE_MACHINE_CLOSURE.md).
- [DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md).
- [DEVELOPMENT_COMPLETION_PLAN.md](DEVELOPMENT_COMPLETION_PLAN.md).
- [README.md](../../README.md).
- [BUG_AUDIT.md](../../BUG_AUDIT.md).

## Timeline Of DEV-08 Parts 1 Through 15

- Part 1 planned AP state-machine QA, chose the safe first AP fixture path, and deferred inventory-clearing, debit-note, supplier-refund, purchase-order, cash-expense, output, email, and ZATCA branches.
- Part 2 created one fake local supplier and one finalized direct-mode purchase bill under marker `DEV08-AP-20260525T230000`.
- Part 3 verified the AP fixture, VAT path, posted purchase bill journal, audit rows, temporary script absence, and forbidden side-effect non-effects.
- Part 4 planned supplier payment creation with a `500.0000` payment, `300.0000` direct allocation, and `200.0000` unapplied amount.
- Part 5 created `PAY-000006`, directly allocated `300.0000` to `BILL-000007`, and left `200.0000` unapplied.
- Part 6 verified supplier payment, direct allocation, payment journal, bill balance, audit, and non-effects.
- Part 7 planned applying the remaining `200.0000` supplier payment unapplied amount.
- Part 8 applied `200.0000` unapplied supplier payment amount to `BILL-000007`.
- Part 9 planned reversing that supplier payment unapplied allocation.
- Part 10 reversed the `200.0000` supplier payment unapplied allocation.
- Part 11 planned supplier payment void/reversal and confirmed the direct allocation plus reversed unapplied allocation state did not block void.
- Part 12 voided/reversed `PAY-000006`.
- Part 13 planned purchase bill void/reversal after supplier payment void and confirmed the historical direct allocation from a voided payment did not block bill void.
- Part 14 voided/reversed `BILL-000007`.
- Part 15 closes the core AP bill/payment evidence chain without mutation.

## Final Fixture State

Supplier:

- Display label: `DEV08-AP-20260525T230000 Supplier`.
- Safe id prefix: `0e36df97`.
- Type/status: active `SUPPLIER`.
- Organization: fake local AP-ready organization, safe id prefix `db69e5a8`.

Purchase bill:

- Bill number: `BILL-000007`.
- Safe id prefix: `d81ddd60`.
- Status: `VOIDED`.
- Mode: `DIRECT_EXPENSE_OR_ASSET`.
- Subtotal: `1000.0000`.
- Tax: `150.0000`.
- Total: `1150.0000`.
- Balance due: `0.0000` under current void behavior.
- Purchase order link: absent.
- Generated document/PDF/archive link: absent.
- Current schema does not store purchase bill `voidedAt`, `voidedById`, or void reason.

Purchase bill accounting:

- Original purchase bill journal: `JE-000049`, safe id prefix `3dfa0a86`, now `REVERSED`.
- Purchase bill reversal journal: `JE-000052`, safe id prefix `b243cab0`, `POSTED` and balanced.
- Original journal lines:
  - Debit account `111 Cash` for `1000.0000`.
  - Debit account `230 VAT Receivable` for `150.0000`.
  - Credit account `210 Accounts Payable` for `1150.0000`.
- Reversal journal lines:
  - Debit account `210 Accounts Payable` for `1150.0000`.
  - Credit account `230 VAT Receivable` for `150.0000`.
  - Credit account `111 Cash` for `1000.0000`.

Supplier payment:

- Payment number: `PAY-000006`.
- Safe id prefix: `622ad0b6`.
- Final status: `VOIDED`.
- Amount paid: `500.0000`.
- Final unapplied amount: `200.0000`; current supplier payment void behavior does not zero this historical field.
- Paid-through account: `112 Bank Account`.
- Original supplier payment journal: `JE-000050`, safe id prefix `b77bd6f7`, now `REVERSED`.
- Supplier payment void reversal journal: `JE-000051`, safe id prefix `ebc58c26`, `POSTED`.

Allocations:

- Direct `SupplierPaymentAllocation` remains one historical record, safe id prefix `6ec44d14`, amount `300.0000`.
- `SupplierPaymentUnappliedAllocation` remains one record, safe id prefix `a8ee4e23`, amount `200.0000`, reversed.
- Reversal reason: `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- Active supplier payment unapplied allocation count: `0`.
- `PurchaseDebitNoteAllocation` count for the fixture: `0`.

## AP Flows Proven

- Fake local supplier fixture creation.
- Direct-mode finalized purchase bill creation.
- VAT purchase path using `1000.0000` direct line amount, `150.0000` VAT receivable, and `1150.0000` AP.
- Purchase bill finalization journal posting.
- Supplier payment creation/posting.
- Supplier payment direct bill allocation.
- Supplier payment unapplied amount retained on the payment.
- Applying supplier payment unapplied amount to a finalized bill.
- Applying supplier payment unapplied amount as a matching-only operation with no new journal.
- Reversing supplier payment unapplied allocation.
- Reversing supplier payment unapplied allocation as a matching-only operation with no new journal.
- Supplier payment void/reversal after the unapplied allocation was reversed.
- Supplier payment void restoring the active direct allocation amount to bill balance before bill void.
- Purchase bill void/reversal after supplier payment void.
- Original supplier payment and purchase bill journals are marked `REVERSED` by their void flows.
- Supplier payment and purchase bill reversal journals are posted and balanced.
- Covered AP audit behavior for supplier creation, purchase bill create/finalize/void, supplier payment create/void, raw apply-unapplied, and raw reverse-unapplied.
- Absence of fixture-specific output/email/ZATCA/refund/debit-note/purchase-order/purchase-receipt/inventory/cash-expense/cleanup side effects during the covered chain.

## AP Flows Not Proven

DEV-08 closes the core AP bill/payment chain only. It does not prove full AP completion. Remaining AP gaps include:

- Purchase debit note create/edit/finalize/apply/reverse-allocation/void.
- Supplier refund create/void from supplier payment source.
- Supplier refund create/void from purchase debit note source.
- Purchase order approve/mark-sent/close/void/convert-to-bill.
- Cash expense create/void lifecycle.
- Inventory-clearing purchase bill flow.
- Purchase receipt, inventory, and AP integration.
- AP PDF/archive/generated-document output routes.
- Supplier payment receipt PDF/archive routes.
- AP email delivery or email retry/provider behavior.
- ZATCA XML/signing/QR/submission behavior for AP-adjacent documents.
- Real browser-authenticated AP UI flow.
- Controller/API smoke against deployed beta/user-testing targets.
- Repeated/idempotency paths beyond the specific service evidence and existing tests.
- Fiscal-period lock blockers in this exact AP mutation chain.
- Permission-policy edge cases for AP state transitions.
- Cleanup deletion policy and cleanup executor behavior.
- Production, beta/user-testing, shared-target, hosted-database, or customer-data behavior.

## Accounting And Journal Findings

- Purchase bill finalization posts a balanced AP journal:
  - Debit direct line account `111` for `1000.0000`.
  - Debit VAT receivable account `230` for `150.0000`.
  - Credit AP account `210` for `1150.0000`.
- Supplier payment posting creates a balanced payment journal:
  - Debit AP account `210` for `500.0000`.
  - Credit paid-through account `112` for `500.0000`.
- Supplier payment apply-unapplied and reverse-unapplied are matching-only paths; they did not create journals or advance journal sequence.
- Supplier payment void creates a balanced reversal journal:
  - Debit account `112` for `500.0000`.
  - Credit AP account `210` for `500.0000`.
- Purchase bill void creates a balanced reversal journal:
  - Debit AP account `210` for `1150.0000`.
  - Credit VAT receivable account `230` for `150.0000`.
  - Credit account `111` for `1000.0000`.
- `JOURNAL_ENTRY` sequence advanced through the covered chain from `JE-000049` purchase bill finalization to next `53` after purchase bill void.
- No supplier refund, purchase debit note, purchase order, cash expense, inventory, output, or ZATCA journal was created by this chain.

## Audit Findings

Fixture-scoped audit evidence after Part 14:

- `Contact:CREATE`: `1`.
- `PurchaseBill:PURCHASE_BILL_CREATED`: `1`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`: `1`.
- `PurchaseBill:PURCHASE_BILL_VOIDED`: `1`.
- `SupplierPayment:SUPPLIER_PAYMENT_CREATED`: `1`.
- `SupplierPayment:APPLY_UNAPPLIED`: `1`.
- `SupplierPayment:SUPPLIER_PAYMENT_VOIDED`: `1`.
- `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION`: `1`.

Known audit standardization gap:

- `SupplierPayment:APPLY_UNAPPLIED` is raw in current evidence.
- `SupplierPaymentUnappliedAllocation:REVERSE_UNAPPLIED_ALLOCATION` is raw in current evidence.
- This differs from the more standardized AR customer payment allocation audit behavior and should be considered for a future hardening ticket.

No duplicate purchase bill finalization audit, duplicate supplier payment void audit, supplier refund audit, purchase debit note audit, purchase order audit, cash expense audit, cleanup/delete audit, or login/browser audit-writing flow was created by this chain.

## Output, Email, And ZATCA Findings

- No generated documents were created for the DEV-08 bill or payment.
- No purchase bill PDF/archive/export/download path ran.
- No supplier payment receipt PDF/archive/export/download path ran.
- No email outbox/provider event was created for the marker.
- No ZATCA XML/signing/QR/submission artifact was created by the DEV-08 chain.
- The AP-ready fake local organization had existing organization-level local ZATCA baseline rows: `1` signed artifact draft and `7` submission logs. DEV-08 evidence consistently treated those as baseline and checked fixture-specific non-effects.

## Safety And Non-Effect Findings

- All mutation parts used explicit approval phrases and local-only target guards before write-capable service imports.
- Temporary mutation scripts were removed after their runs and were not committed.
- The known unrelated untracked web/marketing and graphify files were left untouched and unstaged.
- No production, beta/user-testing, hosted database, shared target, customer data, deployment, migration, seed/reset/delete, environment/provider/schema change, login/browser flow, backup/restore, export/download/PDF/archive, email, ZATCA, cleanup deletion, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, or inventory mutation was performed outside the explicitly approved local chain.

## Blockers And Deviations

- No blocker remains for closing the core DEV-08 AP bill/payment chain.
- Part 2 selected an existing fake local AP-ready SDK validation organization because the exact DEV-07 AR fixture organization lacked AP account `210`, VAT receivable account `230`, and purchase VAT setup. This was documented and kept local-only.
- The direct bill line used account `111 Cash`, which is service-valid as a direct expense-or-asset line in the selected fixture organization but is not ideal AP semantics. A future fixture hardening task should prefer a dedicated expense account when AP base dependencies are explicitly approved.
- Part 14 service mutation completed, but its temporary script failed during a post-mutation assertion because one organization-level supplier refund audit count was too broad for the AP-ready local organization baseline. The mutation was not rerun; follow-up read-only SQL verified the exact fixture-scoped final state.

## Remaining AP Branches

The next AP evidence branches should cover:

- DEV-08B followed this core AP bill/payment closure and covered the local purchase debit note and supplier refund-from-debit-note branch. See [DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md](DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md).
- DEV-08C followed this closure and covered the local purchase order conversion/lifecycle branch. See [DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md](DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md).
- DEV-08D followed this closure and covered the local supplier refund-from-supplier-payment branch. See [DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md](DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md).
- Debit-note and refund blockers for supplier payment void and purchase bill void.
- Purchase order repeated/idempotency/blocker paths beyond the DEV-08C happy-path evidence.
- Cash expense lifecycle.
- Inventory-clearing purchase bill and purchase receipt integration, after inventory/AP policy and fixture prerequisites are explicitly approved.
- AP output/PDF/archive and email behavior, under separate output-safe approvals.
- AP permission, idempotency, fiscal-period lock, and UI/API smoke/browser branches.

## Recommended Next Development Family

Recommended next family: `DEV-08B AP debit note and supplier refund branch`.

Reason: the core AP bill/payment chain is complete, but purchase debit notes and supplier refunds are still AP-side blockers that affect bill/payment void behavior. Covering them before moving fully into banking will close the remaining AP allocation/refund risks that directly interact with the state-machine chain proven here.

## Recommended Next Prompt Title

`DEV-08B Part 1: AP debit note and supplier refund branch preflight`

## Later AP Branch Closure Note

- DEV-08B, DEV-08C, and DEV-08D have now closed the purchase debit note refund branch, purchase order conversion/lifecycle branch, and supplier refund from supplier payment branch.
- Current recommended next AP branch after DEV-08D closure: `DEV-08E Part 1: cash expense lifecycle preflight`.
