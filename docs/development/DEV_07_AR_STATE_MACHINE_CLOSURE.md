# DEV-07 AR State-Machine Closure

## Scope

This document closes the DEV-07 local AR customer payment allocation evidence chain. It consolidates what the committed evidence proves, what it does not prove, and the recommended next development family before moving to AP state-machine QA.

Part 14 is read-only documentation and verification only. No database mutation, login/browser flow, invoice/payment/allocation/refund/credit-note action, generated document, PDF/archive/export/download, email, ZATCA XML/signing/QR/submission, cleanup deletion, migration, seed/reset/delete, deployment, environment change, provider change, production, beta, shared-target, or customer-data action was performed.

## Commits Reviewed

- `e7906b07` - `Void DEV-07 customer payment` - latest local and `origin/main` commit at the start of Part 14.
- `cdc3557d` - `Plan DEV-07 customer payment void`.
- `6ed699db` - `Reverse DEV-07 unapplied allocation`.
- `d42b2c9c` - `Plan DEV-07 unapplied allocation reversal`.
- `c71b0809` - `Apply DEV-07 unapplied payment allocation`.
- `6922d65c` - earlier apply-unapplied evidence commit in the DEV-07/product-hardening chain.
- `2d3b4dfa` - `Plan DEV-07 unapplied payment allocation`.
- `33aeb97e` - `Verify DEV-07 AR customer payment evidence`.
- `dd1dbccb` - `Create DEV-07 AR customer payment`.
- `145ce74c` - `Plan DEV-07 customer payment creation`.
- `8def8956` - `Verify DEV-07 payment allocation invoice fixture evidence`.
- `b408cdc9` - `Create DEV-07 payment allocation invoice fixture`.
- `3831730e`, `3bac878c`, `2062d920`, `5634eaff` - fixture preflight verification and blocker retry evidence.
- `01403ab3` - `Plan DEV-07 payment allocation fixture`.
- `bc15f4e0` - `Plan DEV-07 AR payment allocation`.

## Evidence Documents Reviewed

- [CODEX_HANDOFF.md](../../CODEX_HANDOFF.md).
- [DEV_07_AR_CUSTOMER_PAYMENT_VOID_MUTATION_EVIDENCE.md](DEV_07_AR_CUSTOMER_PAYMENT_VOID_MUTATION_EVIDENCE.md).
- [DEV_07_AR_CUSTOMER_PAYMENT_VOID_PREFLIGHT.md](DEV_07_AR_CUSTOMER_PAYMENT_VOID_PREFLIGHT.md).
- [DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).
- [DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md](DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md).
- [DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_EVIDENCE.md](DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_EVIDENCE.md).
- [DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_MUTATION_PLAN.md](DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_MUTATION_PLAN.md).
- [DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md](DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md).
- [DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md](DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md).
- [DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md).
- [DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md).
- [DEVELOPMENT_COMPLETION_PLAN.md](DEVELOPMENT_COMPLETION_PLAN.md).
- [README.md](../../README.md).
- [BUG_AUDIT.md](../../BUG_AUDIT.md).

The prompt-listed `docs/development/DEV_07_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE.md` is not present in the checkout. The matching committed fixture evidence document is `docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md`.

## Timeline

- DEV-03 mapped the AR state-machine dry-run scope and identified customer payment create, direct allocation, unapplied allocation, reversal, refund blockers, void behavior, audit effects, accounting effects, and output gates as high-risk AR areas.
- DEV-06 completed the invoice lifecycle slice for `INVOICE-000001`: draft create/edit, finalize, posted journal, local ZATCA metadata boundary, void, and reversal journal evidence.
- DEV-07 Part 1 and Part 2 planned the payment allocation slice and chose a new finalized invoice fixture under marker `DEV03-AR-20260524T130000`.
- DEV-07 Part 3 through Part 3D handled local fixture preflight blockers without carrying mutation approval forward.
- DEV-07 Part 3E created and finalized `INVOICE-000002`.
- DEV-07 Part 4 verified `INVOICE-000002` as the payment allocation fixture.
- DEV-07 Part 5 planned customer payment creation.
- DEV-07 Part 6 created `PAYMENT-000001` with one direct `300.0000` allocation and `200.0000` unapplied.
- DEV-07 Part 7 verified the customer payment evidence without mutation.
- DEV-07 Part 8 planned applying the unapplied amount.
- DEV-07 Part 9 applied `200.0000` unapplied payment amount to `INVOICE-000002`.
- DEV-07 Part 10 planned the unapplied allocation reversal.
- DEV-07 Part 11 reversed the `200.0000` unapplied allocation.
- DEV-07 Part 12 planned customer payment void/reversal and confirmed the direct allocation does not block void.
- DEV-07 Part 13 voided `PAYMENT-000001`.
- DEV-07 Part 14 consolidates the evidence and performs no mutation.

## Final Fixture State

- Marker/family: `DEV03-AR-20260524T130000`, `ar`.
- Payment: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `VOIDED`.
- Payment amount received: `500.0000`.
- Payment unapplied amount: `200.0000`; current service design does not zero this field during void.
- Payment original journal: `JOURNAL_ENTRY-000004`.
- Payment void reversal journal: `JOURNAL_ENTRY-000005`.
- Invoice: `INVOICE-000002`, safe id prefix `ddadfdd7`, status `FINALIZED`.
- Invoice total: `1150.0000`.
- Invoice final balance due: `1150.0000`.
- Direct allocation: one historical `CustomerPaymentAllocation` remains for `300.0000`.
- Unapplied allocation: one `CustomerPaymentUnappliedAllocation` remains for `200.0000`, safe prefix `8bc99925`, reversed with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- No new direct allocation, unapplied allocation, or credit-note allocation exists after void.

## AR Flows Proven

- A finalized invoice fixture can be created for the payment allocation path without reusing the voided DEV-06 invoice.
- A posted customer payment can be created against the fixture invoice.
- Direct allocation reduces finalized invoice balance due.
- Overpayment/unapplied amount is retained on the customer payment.
- Applying unapplied payment amount decreases `CustomerPayment.unappliedAmount` and `SalesInvoice.balanceDue`.
- Applying unapplied payment amount creates exactly one `CustomerPaymentUnappliedAllocation`.
- Applying unapplied payment amount creates no journal entry and does not alter the original direct allocation.
- Reversing the unapplied allocation restores payment unapplied amount and invoice balance due.
- Reversing the unapplied allocation marks the allocation reversed and creates no journal entry.
- A reversed unapplied allocation does not block payment void.
- Active direct allocations do not block customer payment void; the current service uses them to restore finalized invoice balances.
- Voiding the payment restores the direct allocation amount to the invoice balance due.
- Voiding the payment creates a reversal journal and marks the original payment journal reversed.
- The direct allocation row remains historical data because the schema has no reversal/status fields for `CustomerPaymentAllocation`.

## AR Flows Not Proven

DEV-07 does not prove full AR completion. Remaining AR gaps include:

- Customer refund create/void from customer payment or credit note sources.
- Credit note finalize/apply/reverse/void in the same local evidence chain.
- Receipt/PDF/archive/generated-document output routes.
- Email sending or email retry/provider behavior.
- ZATCA XML generation, signing, QR, clearance/reporting, or submission.
- Authenticated browser/UI route QA for the full customer payment lifecycle.
- Live controller/API smoke against the deployed beta or user-testing targets.
- Repeated/idempotency behavior beyond the specific service paths covered by existing tests and evidence.
- Allocation blocker behavior across every invoice/payment/credit-note combination.
- Fiscal-period and locked-period behavior in this exact local mutation chain.
- Cleanup deletion policy and cleanup executor behavior.
- Production, beta/user-testing, shared-target, hosted-database, or customer-data behavior.
- AP/payables state-machine behavior.

## Accounting And Journal Findings

- Invoice fixture finalization created the expected invoice journal before the customer payment chain.
- Customer payment creation created `JOURNAL_ENTRY-000004`, posted and balanced at debit `500.0000` and credit `500.0000`.
- Applying unapplied payment amount created no journal entry.
- Reversing the unapplied allocation created no journal entry.
- Voiding the customer payment created `JOURNAL_ENTRY-000005` as the reversal journal.
- `JOURNAL_ENTRY-000004` is now `REVERSED`.
- `JOURNAL_ENTRY-000005` is `POSTED`, references `PAYMENT-000001`, and reverses `JOURNAL_ENTRY-000004`.
- Fixture organization journal count changed from `4` to `5` during payment void.
- `JOURNAL_ENTRY` sequence next changed from `5` to `6` during payment void.
- No invoice reversal journal was created during payment void; `INVOICE-000002` remains finalized.

## Audit Findings

The final audit state for the DEV-07 payment chain is:

- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `1`.
- `CUSTOMER_PAYMENT_VOIDED`: `1`.
- Cleanup/delete audit actions: `0`.

The older Part 8 plan expected raw `APPLY_UNAPPLIED`, but current code standardizes customer payment allocation actions through `AUDIT_EVENTS`. No raw apply or reverse action was manually inserted.

## Output, Email, And ZATCA Findings

Across DEV-07 evidence, the following remained absent from the payment lifecycle mutations:

- Generated documents.
- Customer payment generated documents.
- Receipt PDF/archive records.
- Email outbox records.
- Email provider events.
- ZATCA signed artifact drafts.
- ZATCA submission logs.
- Customer refunds.
- Credit notes.
- Invoice void.
- Cleanup/delete actions.

`INVOICE-000002` has local `ZatcaInvoiceMetadata` from invoice finalization, but the DEV-07 payment chain did not create XML bodies, QR payloads, signatures, submissions, clearance/reporting records, or PDF/A-3 artifacts.

## Permission And Route Findings

- `POST /customer-payments/:id/apply-unapplied` is routed to `CustomerPaymentService.applyUnapplied(...)` and guarded by `PERMISSIONS.customerPayments.applyUnapplied`.
- `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse` is routed to `CustomerPaymentService.reverseUnappliedAllocation(...)` and guarded by `PERMISSIONS.customerPayments.reverseUnappliedAllocation`.
- The customer payment void route calls `CustomerPaymentService.void(...)`.
- DEV-07 local mutation evidence used service calls, not browser login or live remote route mutation.

## Blockers And Deviations

- No accounting blocker remains for the DEV-07 customer payment allocation and void evidence chain.
- The prompt-listed `DEV_07_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE.md` was not present; the matching reviewed evidence file is `DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md`.
- Part 13 temporary script exited non-zero after the void service call while building its final JSON output because the local evidence object referenced `actorMembershipCount` instead of the local variable name. The service call was not rerun. Read-only post-mutation SQL verified exactly one `CUSTOMER_PAYMENT_VOIDED` audit action, one reversal journal, one voided payment state, and the restored invoice balance.
- DEV-07 remains local-only evidence. It is not production, beta, hosted, browser, or customer-data proof.

## Recommended Next Development Family

Move to `DEV-08 AP state-machine QA`.

Reason: DEV-06 covered the local AR invoice lifecycle and DEV-07 covered the local AR customer payment direct allocation, unapplied allocation, unapplied reversal, and payment void/reversal chain. The next highest-value state-machine gap is AP/payables: purchase bill lifecycle, supplier payment allocation, supplier debit/credit behavior, supplier payment void/reversal, and AP output boundaries.

## Recommended Next Prompt Title

`DEV-08 Part 1: AP state-machine fixture and mutation preflight`

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- `rg --files docs/development | rg "DEV_07|DEV_03|DEVELOPMENT_COMPLETION_PLAN"`.
- `git log --oneline` searches for DEV-07 related commits.
- Targeted `rg` and `Get-Content` reads across the DEV-07 evidence chain, README, BUG_AUDIT, CODEX_HANDOFF, and DEVELOPMENT_COMPLETION_PLAN.

## Commands Skipped And Why

- Mutation scripts, service mutations, database writes, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, smoke, E2E, full tests, full build, exports/downloads/PDF generation, generated-document archive creation, ZATCA, email, backup/restore, and production-hosting research: explicitly out of scope for Part 14.
