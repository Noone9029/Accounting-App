# DEV-08B AP Debit Note And Supplier Refund Branch Preflight

Status: read-only preflight and mutation plan
Task: `DEV-08B Part 1: AP debit note and supplier refund branch preflight`
Proposed marker: `DEV08B-AP-20260526T060000`
Family: `ap`

## Purpose And Scope

- Start the DEV-08B AP debit-note and supplier-refund branch after the core DEV-08 AP bill/payment state-machine closure.
- Plan a local-only disposable fixture branch for purchase debit notes and supplier refunds.
- Do not create debit notes, supplier refunds, suppliers, bills, payments, purchase orders, receipts, cash expenses, stock movements, generated documents, emails, ZATCA artifacts, exports, archives, migrations, seeds, resets, deploys, environment changes, or login/browser audit-writing flows in this part.
- Mutation performed in Part 1: no.
- Database target opened in Part 1: no. This preflight used repository code and existing DEV-08 evidence documents only.

## Latest Commit Inspected

- `498cfffd Close DEV-08 AP state-machine evidence`
- Local `HEAD` matched `origin/main` at `498cfffd6b3d9c114d62b8c4d929ce4d1efd9d15` before this documentation change.
- Existing unrelated untracked web/marketing and graph output files were present and left untouched:
  - `apps/graphify-out/`
  - `apps/web/src/app/ar/`
  - `apps/web/src/app/marketing.test.tsx`
  - `apps/web/src/app/pricing/`
  - `apps/web/src/app/product/`
  - `apps/web/src/app/readiness/`
  - `apps/web/src/app/resources/`
  - `apps/web/src/app/workflows/`
  - `apps/web/src/components/marketing/`
  - `graphify-out/`

## DEV-08 Closure Summary

- DEV-08 core AP evidence is closed in [DEV_08_AP_STATE_MACHINE_CLOSURE.md](DEV_08_AP_STATE_MACHINE_CLOSURE.md).
- DEV-08 proved:
  - fake local AP supplier fixture
  - finalized direct-mode purchase bill
  - purchase bill journal with expense/asset, VAT receivable, and AP postings
  - supplier payment creation and direct bill allocation
  - supplier payment unapplied amount
  - apply supplier payment unapplied amount
  - reverse supplier payment unapplied allocation
  - supplier payment void/reversal
  - purchase bill void/reversal after supplier payment void
  - AP journal reversal behavior for the covered bill/payment chain
  - AP audit behavior for the covered chain
  - fixture-specific absence of output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup side effects
- DEV-08 final state that matters for DEV-08B:
  - `BILL-000007` safe prefix `d81ddd60` is `VOIDED`, total `1150.0000`, balance due `0.0000`.
  - Its original journal `JE-000049` is `REVERSED`; reversal journal `JE-000052` is `POSTED`.
  - The DEV-08 supplier payment `PAY-000006` safe prefix `622ad0b6` is `VOIDED`.
  - No DEV-08 purchase debit note or supplier refund was created.
- Conclusion: do not reuse `BILL-000007` for debit-note application. Debit-note apply requires a finalized non-voided purchase bill.

## Local-Only Safety Rules

- DEV-08B mutations must use a disposable local database target only.
- Future write scripts must refuse hosted or shared target patterns before any write-capable Prisma or service-layer use.
- Forbidden target patterns include Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, production, prod, live, staging, beta, user-testing, and customer-data labels.
- Future scripts must require the exact marker `DEV08B-AP-20260526T060000`, family `ap`, and the explicit approval phrase for the specific mutation part.
- Future scripts must print only safe summaries: marker, document numbers, safe id prefixes, status/totals, journal numbers/safe prefixes, audit action names, and side-effect counts.
- Future scripts must not print secrets, database URLs, tokens, cookies, auth headers, request/response bodies, vendor/customer data, signed XML, QR payloads, document bodies, or attachment bodies.

## AP Debit Note Code Paths Inspected

- Controller: [purchase-debit-note.controller.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts)
  - `POST /purchase-debit-notes` calls `PurchaseDebitNoteService.create`.
  - `POST /purchase-debit-notes/:id/finalize` calls `PurchaseDebitNoteService.finalize`.
  - `POST /purchase-debit-notes/:id/apply` calls `PurchaseDebitNoteService.apply`.
  - `POST /purchase-debit-notes/:id/allocations/:allocationId/reverse` calls `PurchaseDebitNoteService.reverseAllocation`.
  - `POST /purchase-debit-notes/:id/void` calls `PurchaseDebitNoteService.void`.
  - PDF/archive routes exist at `pdf-data`, `pdf`, and `generate-pdf`; DEV-08B must not call them unless a later output-specific ticket approves it.
- Service: [purchase-debit-note.service.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts)
  - `create` prepares lines, validates supplier/branch/original bill, creates a `DRAFT` debit note, sets `unappliedAmount` to the prepared total, and writes a purchase debit note create audit.
  - `finalize` requires `DRAFT`, fiscal-period posting allowance, finalizable totals, original-bill validation, AP account `210`, VAT receivable account `230`, then posts a debit-note journal and sets `FINALIZED`.
  - `apply` requires a `FINALIZED` debit note, same-supplier `FINALIZED` bill, amount no greater than debit note unapplied amount and bill balance due, decrements debit note unapplied amount, decrements bill balance due, and creates a `PurchaseDebitNoteAllocation`.
  - `reverseAllocation` requires an active allocation, finalized debit note, finalized bill, and safe balance/unapplied limits; it marks the allocation reversed and restores debit note unapplied amount and bill balance due.
  - `void` blocks finalized debit notes with active allocations or posted supplier refunds, then creates or reuses a reversal journal and marks the original journal reversed.
- Accounting helper: [purchase-debit-note-accounting.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note-accounting.ts)
  - Debit note finalization debits AP for the total.
  - It credits the expense/asset account for taxable line amounts.
  - It credits VAT receivable for tax, when tax is greater than zero.
  - It asserts the journal is balanced.
- DTOs:
  - `CreatePurchaseDebitNoteDto`: `supplierId`, optional `originalBillId`, optional `branchId`, `issueDate`, optional 3-letter `currency`, optional `notes`, optional `reason`, and one or more lines.
  - `PurchaseDebitNoteLineDto`: optional `itemId`, `description`, `accountId`, `taxRateId`, `sortOrder`; required `quantity`, `unitPrice`; optional `discountRate`.
  - `ApplyPurchaseDebitNoteDto`: `billId`, `amountApplied`.
  - `ReversePurchaseDebitNoteAllocationDto`: optional `reason`.
- Rules/spec coverage: [purchase-debit-note-rules.spec.ts](../../apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts)
  - Covers balanced debit-note journals, idempotent finalized behavior, draft edit blocking after finalize, tenant scoping, apply without journal, draft/over-amount/over-balance apply blockers, original bill supplier validation, allocation reversal, double reversal blocker, void blocker with active allocations, and supplier ledger rows.

## Supplier Refund Code Paths Inspected

- Controller: [supplier-refund.controller.ts](../../apps/api/src/supplier-refunds/supplier-refund.controller.ts)
  - `GET /supplier-refunds/refundable-sources` calls `SupplierRefundService.refundableSources`.
  - `POST /supplier-refunds` calls `SupplierRefundService.create`.
  - `POST /supplier-refunds/:id/void` calls `SupplierRefundService.void`.
  - PDF/archive routes exist at `pdf-data`, `pdf`, and `generate-pdf`; DEV-08B must not call them unless a later output-specific ticket approves it.
- Service: [supplier-refund.service.ts](../../apps/api/src/supplier-refunds/supplier-refund.service.ts)
  - `refundableSources` returns posted supplier payments with positive unapplied amount and finalized purchase debit notes with positive unapplied amount for the selected supplier.
  - `create` requires a positive amount, one valid source shape, posting-date allowance, active supplier, active posting asset received-into account, valid source claim, AP account `210`, then posts a refund journal and creates a `POSTED` supplier refund.
  - Payment-source refunds require `sourcePaymentId`, posted source payment, same supplier, sufficient payment unapplied amount, and decrement supplier payment unapplied amount.
  - Debit-note-source refunds require `sourceDebitNoteId`, finalized source debit note, same supplier, sufficient debit-note unapplied amount, and decrement purchase debit note unapplied amount.
  - `void` requires posted refund and existing journal, creates or reuses a reversal journal, marks the original refund journal reversed, restores the source unapplied amount, and marks the refund `VOIDED`.
  - For debit-note-source refund void, the source debit note must still be `FINALIZED` before source unapplied amount can be restored.
- Accounting helper: [supplier-refund-accounting.ts](../../apps/api/src/supplier-refunds/supplier-refund-accounting.ts)
  - Supplier refund creation debits the received-into asset account.
  - It credits AP account `210`.
  - It asserts the journal is balanced.
- DTO:
  - `CreateSupplierRefundDto`: `supplierId`, `sourceType`, optional `sourcePaymentId`, optional `sourceDebitNoteId`, `refundDate`, optional `currency`, `amountRefunded`, `accountId`, optional `description`.
- Rules/spec coverage: [supplier-refund-rules.spec.ts](../../apps/api/src/supplier-refunds/supplier-refund-rules.spec.ts)
  - Covers balanced refund journal, payment-source refund creation, debit-note-source refund creation, over-unapplied rejection, tenant scoping, refund void restoring payment source once, refund void restoring debit note source, and generated PDF archive behavior.

## Prisma Models Inspected

- `PurchaseBill`
- `PurchaseBillLine`
- `PurchaseDebitNote`
- `PurchaseDebitNoteLine`
- `PurchaseDebitNoteAllocation`
- `SupplierPayment`
- `SupplierPaymentAllocation`
- `SupplierPaymentUnappliedAllocation`
- `SupplierRefund`
- `JournalEntry`
- `JournalLine`
- `AuditLog`

## Recommended DEV-08B Fixture Target

- Reuse the same fake local AP-ready organization used by DEV-08, subject to a Part 2 local-only DB preflight.
- Create new marker-scoped DEV-08B records instead of reusing DEV-08 documents:
  - one new fake local supplier clearly labeled for `DEV08B-AP-20260526T060000`
  - one new finalized direct-mode purchase bill
  - one new finalized purchase debit note linked to the new bill as `originalBillId`
- Do not reuse `BILL-000007` because it is voided.
- Do not use purchase orders, purchase receipts, inventory clearing, supplier payments, cash expenses, generated documents, email, or ZATCA in the first DEV-08B debit-note branch.

## Proposed Economics

- Purchase bill:
  - direct-mode / expense-or-asset line
  - subtotal `1000.0000`
  - tax `150.0000`
  - total `1150.0000`
  - balance due after finalization `1150.0000`
  - AP account `210`
  - VAT receivable account `230`
  - expense/asset account `111`
- Purchase debit note:
  - linked to the new finalized purchase bill as the original bill
  - finalized total candidate `400.0000`
  - initially unapplied `400.0000`
  - preferred VAT path: one line with taxable amount `347.8261`, VAT `52.1739`, total `400.0000`, using the existing local purchase VAT rate if Part 2 confirms it.
  - safer zero-tax fallback: one line total `400.0000`, tax `0.0000`, only if the Part 2 local preflight shows purchase VAT dependencies are unavailable or unsafe.
- Debit note application:
  - apply `250.0000` to the new bill
  - bill balance due changes `1150.0000 -> 900.0000`
  - debit note unapplied amount changes `400.0000 -> 150.0000`
  - no journal expected for apply because the service treats allocation as matching-only.
- Debit note allocation reversal:
  - reverse the active `250.0000` `PurchaseDebitNoteAllocation`
  - bill balance due changes `900.0000 -> 1150.0000`
  - debit note unapplied amount changes `150.0000 -> 400.0000`
  - no journal expected for reversal because the service treats reversal as matching-state restoration only.
- Supplier refund from debit note:
  - after the apply/reversal branch has been proven, create a supplier refund from purchase debit note unapplied amount.
  - preferred amount: `150.0000` if DEV-08B chooses to re-apply `250.0000` before refund testing, leaving exactly `150.0000` unapplied.
  - alternative amount: `150.0000` from a fully unapplied `400.0000` debit note is also code-valid, but it does not prove the planned "remaining unapplied after application" branch unless the allocation is active at refund time.
  - Recommendation: after Part 8 reversal, add a read-only decision in Part 9 on whether to re-apply `250.0000` for the refund branch or create a second debit note; do not silently mix "reversal" and "remaining after apply" assumptions.

## Required Dependencies To Reverify Before Part 2 Mutation

- Marker must be exactly `DEV08B-AP-20260526T060000`.
- Family must be exactly `ap`.
- Existing DEV-08 AP-ready organization must still be fake/local and safe.
- Actor user and membership must be local-only and safe.
- A branch must be available if the purchase bill or debit note DTO path requires one.
- Fiscal period for chosen bill/debit-note/refund dates must be open or posting-allowed.
- Accounts must exist in the same fake local organization:
  - AP `210`, active, posting-enabled
  - VAT receivable `230`, active, posting-enabled
  - expense/asset line account `111`, active, posting-enabled
  - received-into asset/bank account candidate `112`, active, posting-enabled, for supplier refund
- Purchase VAT rate must exist, be active, and have scope `PURCHASES` or `BOTH` if VAT path is used.
- Number sequences should be read-only checked before Part 2:
  - purchase bill sequence for the new bill
  - purchase debit note sequence for the new debit note
  - supplier refund sequence before refund mutation
  - journal entry sequence before each journal-posting mutation

## Expected Debit Note Journal Behavior

- Creating a purchase debit note should create a `DRAFT` debit note and no journal.
- Finalizing the debit note should create one posted journal.
- VAT path expected journal for total `400.0000`:
  - debit AP account `210` for `400.0000`
  - credit expense/asset account `111` for `347.8261`
  - credit VAT receivable account `230` for `52.1739`
  - journal balanced and posted
- Zero-tax fallback expected journal for total `400.0000`:
  - debit AP account `210` for `400.0000`
  - credit expense/asset account `111` for `400.0000`
  - journal balanced and posted
- Voiding a finalized debit note should create a reversal journal and mark the original debit-note journal `REVERSED`, but only after active allocations and posted supplier refunds are cleared.

## Expected Debit Note Application Behavior

- Apply requires:
  - purchase debit note status `FINALIZED`
  - purchase bill status `FINALIZED`
  - same supplier
  - amount does not exceed debit note unapplied amount
  - amount does not exceed bill balance due
- Applying `250.0000` should:
  - decrement debit note unapplied amount by `250.0000`
  - decrement bill balance due by `250.0000`
  - create one `PurchaseDebitNoteAllocation`
  - create no journal
  - write audit action `APPLY` on entity type `PurchaseDebitNote`

## Expected Debit Note Allocation Reversal Behavior

- Reversal requires:
  - allocation exists for the target debit note and organization
  - allocation `reversedAt` is absent
  - debit note status is `FINALIZED`
  - bill status is `FINALIZED`
  - restoring balances will not exceed debit note total or bill total
- Reversing the active `250.0000` allocation should:
  - set allocation `reversedAt`
  - set `reversedById`
  - store the provided `reason`
  - increment debit note unapplied amount by `250.0000`
  - increment bill balance due by `250.0000`
  - create no journal
  - write audit action `REVERSE_ALLOCATION` on entity type `PurchaseDebitNoteAllocation`

## Expected Supplier Refund Behavior

- Refundable debit-note source requires:
  - `sourceType` `PURCHASE_DEBIT_NOTE`
  - `sourceDebitNoteId`
  - same supplier
  - debit note status `FINALIZED`
  - amount not greater than debit note unapplied amount
  - active posting asset received-into account
  - AP account `210`
  - posting-date allowance
- Creating a `150.0000` debit-note-source supplier refund should:
  - decrement debit note unapplied amount by `150.0000`
  - create one `SupplierRefund` in `POSTED` state
  - create one posted refund journal
  - debit received-into asset/bank account `112` for `150.0000`
  - credit AP account `210` for `150.0000`
  - write standardized supplier refund create audit
- Voiding that supplier refund should:
  - require the refund to be `POSTED`
  - require the source debit note to remain `FINALIZED`
  - set refund status `VOIDED`
  - create or reuse one reversal journal
  - mark the original supplier refund journal `REVERSED`
  - restore debit note unapplied amount by `150.0000`
  - write standardized supplier refund void audit

## Expected Debit Note Void Blockers

- A finalized purchase debit note is blocked from voiding if any active `PurchaseDebitNoteAllocation` exists.
- A finalized purchase debit note is blocked from voiding if any posted `SupplierRefund` points to it.
- Draft debit notes can be voided without a reversal journal.
- Finalized debit notes require an original journal and posting-date allowance before reversal.
- Correct DEV-08B order should be:
  - reverse active debit note allocations first
  - void posted supplier refunds first
  - then void the finalized purchase debit note

## Expected Supplier Refund Void Blockers

- Only posted supplier refunds with an original journal can be voided.
- A debit-note-source supplier refund can only be voided while the source debit note is still `FINALIZED`.
- A payment-source supplier refund can only be voided while the source supplier payment is still `POSTED`.
- Supplier refund void restores source unapplied amount only if doing so cannot exceed the source amount limit.

## Audit Behavior And Standardization Gaps

- Standardized audit mappings exist for:
  - `PurchaseDebitNote:CREATE` -> `PURCHASE_DEBIT_NOTE_CREATED`
  - `PurchaseDebitNote:UPDATE` -> `PURCHASE_DEBIT_NOTE_UPDATED`
  - `PurchaseDebitNote:FINALIZE` -> `PURCHASE_DEBIT_NOTE_FINALIZED`
  - `PurchaseDebitNote:VOID` -> `PURCHASE_DEBIT_NOTE_VOIDED`
  - `SupplierRefund:CREATE` -> `SUPPLIER_REFUND_CREATED`
  - `SupplierRefund:VOID` -> `SUPPLIER_REFUND_VOIDED`
- Standardized mappings were not found for:
  - `PurchaseDebitNote:APPLY`
  - `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`
- Expected current behavior for debit-note apply/reverse allocation audit is raw action storage unless a later code change standardizes these events.
- No login/browser audit-writing flow should be used in DEV-08B; future mutation scripts should pass the approved local actor directly through service calls.

## Output, Email, And ZATCA Boundaries

- Purchase debit note output routes exist and can generate/archive PDFs through `PurchaseDebitNoteService.pdf` and `generatePdf`.
- Supplier refund output routes exist and can generate/archive PDFs through `SupplierRefundService.pdf` and `generatePdf`.
- DEV-08B state-machine mutation parts must not call output/PDF/archive/export/download routes unless a later output-specific approval says so.
- Neither debit-note service mutation path nor supplier-refund service mutation path sends email or runs ZATCA XML/signing/submission directly.
- Future evidence must still count fixture-specific generated documents, email outbox/provider events, ZATCA signed artifacts/submission logs, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, cleanup/delete actions, migrations, seed/reset/delete, deploys, and environment/provider/schema changes.

## Known Blockers Or Unknowns

- The DEV-08 bill `BILL-000007` is voided and cannot be reused for debit-note application.
- DEV-08B should reuse the AP-ready fake local organization only after a Part 2 local-only target check confirms it is still local/disposable and has the expected accounts, tax, fiscal period, actor, and membership.
- Debit note total `400.0000` with a VAT path depends on the existing purchase VAT setup and service rounding. The candidate taxable amount is `347.8261`, tax `52.1739`, total `400.0000`; Part 2 should verify this before mutation.
- Debit-note apply/reverse allocation audit actions appear raw, not standardized.
- Supplier refund from debit-note testing has an ordering tension:
  - reversing the debit-note allocation restores the debit note to fully unapplied `400.0000`
  - testing a refund of the "remaining `150.0000` after applying `250.0000`" requires either keeping the allocation active until refund or re-applying/using a second debit-note branch
  - this must be explicitly decided in the Part 9 supplier refund preflight, not assumed.
- Number sequence exact next values were not read from the database in this read-only docs/code pass and must be checked before each approved mutation.
- Fiscal-period lock behavior was inspected as service calls to `assertPostingDateAllowed`; exact local period state must be verified before future writes.

## Proposed DEV-08B Sequence

1. DEV-08B Part 1: AP debit note and supplier refund branch preflight.
2. DEV-08B Part 2: approved local AP debit note fixture creation mutation.
3. DEV-08B Part 3: AP debit note fixture evidence verification.
4. DEV-08B Part 4: debit note apply-to-bill preflight.
5. DEV-08B Part 5: approved local debit note apply-to-bill mutation.
6. DEV-08B Part 6: debit note apply evidence verification.
7. DEV-08B Part 7: debit note allocation reversal preflight.
8. DEV-08B Part 8: approved local debit note allocation reversal mutation.
9. DEV-08B Part 9: supplier refund from debit note preflight.
10. DEV-08B Part 10: approved local supplier refund from debit note mutation.
11. DEV-08B Part 11: supplier refund evidence verification.
12. DEV-08B Part 12: supplier refund void/reversal preflight.
13. DEV-08B Part 13: approved local supplier refund void/reversal mutation.
14. DEV-08B Part 14: debit note void/reversal preflight.
15. DEV-08B Part 15: approved local debit note void/reversal mutation.
16. DEV-08B Part 16: AP debit note/refund closure.

## Required Approval Phrase For Part 2

`I approve DEV-08B Part 2 local-only AP debit note fixture creation mutation under marker DEV08B-AP-20260526T060000. No production, no beta, no customer data.`

## Part 2 Evidence Note

- DEV-08B Part 2 approved local AP debit note fixture creation mutation completed.
- Evidence is recorded in [DEV_08B_AP_DEBIT_NOTE_FIXTURE_MUTATION_EVIDENCE.md](DEV_08B_AP_DEBIT_NOTE_FIXTURE_MUTATION_EVIDENCE.md).
- VAT path was used for both the purchase bill and purchase debit note: `BILL-000008` total `1150.0000`; `PDN-000003` total and unapplied amount `460.0000`.
- No debit note allocation, supplier refund, supplier payment, purchase order, purchase receipt, stock movement, cash expense, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.

## Exact Next Prompt Title

`DEV-08B Part 3: AP debit note fixture evidence verification`
