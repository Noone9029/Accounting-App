# DEV-03 AR State-Machine Dry-Run Plan

## 1. Purpose And Scope

This document converts the Sales/AR state-machine inventory into a dry-run QA plan. It is planning only: no login, fixture creation, API mutation, PDF generation, archive creation, download, export, ZATCA action, email action, migration, seed, reset, delete, deploy, or environment change was performed.

Scope is limited to:

- Sales invoice draft/create/edit/finalize/void behavior.
- Customer payment create/allocation/unapplied allocation/reversal/void behavior.
- Customer refund create/void behavior from customer-payment or credit-note sources.
- Credit note create/edit/finalize/apply/reverse-allocation/void behavior.
- AR generated document, PDF, and archive gates as deferred output workflows.
- Visible permissions, audit-log side effects, accounting side effects, and fixture requirements for a later approved local-only mutation run.

## 2. Safety Rules For This AR Dry-Run Plan

- This plan is local-disposable only by default and does not approve mutation QA by itself.
- Do not use production, beta/user-testing, shared, or customer data.
- Do not login until a future batch explicitly approves login/audit-log writes.
- Do not create fixture records yet.
- Do not run seed/reset/delete, migrations, smoke, E2E, exports, downloads, PDF generation, ZATCA, email, backup/restore, deploys, or environment changes.
- Every future fixture name, display label, memo, note, or description must start with `DEV03-AR-` where the field accepts a human-readable marker.
- Any future evidence must avoid tokens, cookies, auth headers, DB URLs, request/response bodies containing customer/vendor data, signed XML, QR payloads, attachment bodies, and generated PDF bodies.
- Deletion endpoints are visible in code for draft records, but delete testing remains out of scope unless a future cleanup policy explicitly approves it.

## 3. AR Workflow Map

### Sales Invoices

- Routes: `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]`, `/sales/invoices/[id]/edit`.
- Web surfaces: `apps/web/src/app/(app)/sales/invoices/*` and `apps/web/src/components/forms/sales-invoice-form.tsx`.
- API controller/service: `apps/api/src/sales-invoices/sales-invoice.controller.ts`, `apps/api/src/sales-invoices/sales-invoice.service.ts`, and `apps/api/src/sales-invoices/sales-invoice-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /sales-invoices`
  - `PATCH /sales-invoices/:id`
  - `POST /sales-invoices/:id/finalize`
  - `POST /sales-invoices/:id/void`
  - `GET /sales-invoices/:id`, `/open`, `/credit-notes`, `/credit-note-allocations`, and `/customer-payment-unapplied-allocations` as read/assertion endpoints.
- Output endpoints to keep deferred:
  - `GET /sales-invoices/:id/pdf-data`
  - `GET /sales-invoices/:id/pdf`
  - `POST /sales-invoices/:id/generate-pdf`
  - ZATCA invoice endpoints on the detail page remain separate and forbidden for this AR dry-run.
- State fields: `SalesInvoice.status` (`DRAFT`, `FINALIZED`, `VOIDED`), `balanceDue`, `finalizedAt`, `journalEntryId`, `reversalJournalEntryId`.
- Allowed transitions visible from code:
  - Create invoice as `DRAFT`.
  - Edit only while `DRAFT`.
  - Finalize `DRAFT -> FINALIZED`; repeated finalize is idempotent only when a finalized invoice already has a journal.
  - Void `DRAFT -> VOIDED` without reversal journal.
  - Void `FINALIZED -> VOIDED` with a reversal journal; blocked by active customer payment allocations, active unapplied payment allocations, or active credit-note allocations.
  - Finalize from `VOIDED` is rejected.
- Permissions:
  - View/read/PDF-data/PDF/generate-PDF/list/open/allocation reads: `salesInvoices.view`.
  - Create: `salesInvoices.create`.
  - Edit/delete draft: `salesInvoices.update`.
  - Finalize: `salesInvoices.finalize`.
  - Void: `salesInvoices.void`.
- Audit/log side effects: service logs `CREATE`, `UPDATE`, `FINALIZE`, `VOID`, and `DELETE` actions for `SalesInvoice`.
- Accounting impact:
  - Finalize posts a balanced journal: debit accounts receivable, credit revenue line accounts, and credit VAT payable when tax exists.
  - Finalize creates or updates standard invoice ZATCA metadata locally as a side effect, but does not approve any real ZATCA network behavior.
  - Finalized void creates or reuses one reversal journal and marks the original journal reversed.
  - Draft void changes invoice state and balance only.
- Output/document impact:
  - PDF data is read-only from a document-body perspective.
  - `GET /pdf` and `POST /generate-pdf` call archive behavior through generated documents, so they are output-producing and remain deferred.

### Customer Payments

- Routes: `/sales/customer-payments`, `/sales/customer-payments/new`, `/sales/customer-payments/[id]`.
- Web surfaces: `apps/web/src/app/(app)/sales/customer-payments/*` and `apps/web/src/lib/customer-payments.ts`.
- API controller/service: `apps/api/src/customer-payments/customer-payment.controller.ts`, `apps/api/src/customer-payments/customer-payment.service.ts`, and `apps/api/src/customer-payments/customer-payment-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /customer-payments`
  - `POST /customer-payments/:id/apply-unapplied`
  - `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`
  - `POST /customer-payments/:id/void`
  - `GET /customer-payments/:id`, `/customer-payments/:id/unapplied-allocations`, and invoice read endpoints as assertions.
- Output endpoints to keep deferred:
  - `GET /customer-payments/:id/receipt-data`
  - `GET /customer-payments/:id/receipt-pdf-data`
  - `GET /customer-payments/:id/receipt.pdf`
  - `POST /customer-payments/:id/generate-receipt-pdf`
- State fields: `CustomerPayment.status` (`DRAFT`, `POSTED`, `VOIDED`), `unappliedAmount`, `journalEntryId`, `voidReversalJournalEntryId`, `postedAt`, `voidedAt`, `CustomerPaymentAllocation`, and `CustomerPaymentUnappliedAllocation.reversedAt`.
- Allowed transitions visible from code:
  - Create a posted customer payment; direct allocations reduce finalized invoice balances.
  - Overpayments remain on `unappliedAmount`.
  - Apply unapplied payment credit to a same-customer finalized open invoice without another journal.
  - Reverse unapplied allocation, marking allocation reversed and restoring payment and invoice balances without another journal.
  - Void posted payment once with reversal journal; restore direct invoice allocation balances.
  - Void is blocked by posted customer refunds and active unapplied allocations.
- Permissions:
  - View/list/detail/receipt data/PDF/unapplied reads: `customerPayments.view`.
  - Create and apply unapplied payment credit: `customerPayments.create`.
  - Reverse unapplied allocation, void, and delete draft: `customerPayments.void`.
- Audit/log side effects: service logs `CREATE`, `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, `VOID`, and `DELETE` actions for customer payment workflows.
- Accounting impact:
  - Payment create posts debit bank/cash or other paid-through asset account, credit accounts receivable.
  - Direct payment allocation reduces invoice `balanceDue`.
  - Unapplied application/reversal changes matching balances only and should not create journals.
  - Payment void creates or reuses one reversal journal and restores directly allocated invoice balances.
- Output/document impact:
  - Receipt data and receipt PDF generation are deferred.
  - Receipt PDF endpoints archive generated documents and must not be run without output approval.

### Customer Refunds

- Routes: `/sales/customer-refunds`, `/sales/customer-refunds/new`, `/sales/customer-refunds/[id]`.
- Web surfaces: `apps/web/src/app/(app)/sales/customer-refunds/*` and `apps/web/src/lib/customer-refunds.ts`.
- API controller/service: `apps/api/src/customer-refunds/customer-refund.controller.ts`, `apps/api/src/customer-refunds/customer-refund.service.ts`, and `apps/api/src/customer-refunds/customer-refund-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `GET /customer-refunds/refundable-sources`
  - `POST /customer-refunds`
  - `POST /customer-refunds/:id/void`
  - `GET /customer-refunds/:id` and source payment/credit-note reads as assertions.
- Output endpoints to keep deferred:
  - `GET /customer-refunds/:id/pdf-data`
  - `GET /customer-refunds/:id/pdf`
  - `POST /customer-refunds/:id/generate-pdf`
- State fields: `CustomerRefund.status` (`DRAFT`, `POSTED`, `VOIDED`), `sourceType` (`CUSTOMER_PAYMENT`, `CREDIT_NOTE`), `sourcePaymentId`, `sourceCreditNoteId`, `journalEntryId`, `voidReversalJournalEntryId`, `postedAt`, `voidedAt`.
- Allowed transitions visible from code:
  - Create posted refund from a posted customer payment with unapplied balance.
  - Create posted refund from a finalized credit note with unapplied balance.
  - Source claim reduces payment or credit-note `unappliedAmount`.
  - Void posted refund once, restoring the source unapplied amount and creating or reusing a reversal journal.
  - Reject refunds above source unapplied amount, voided sources, wrong-customer sources, and stale source claims.
- Permissions:
  - View/list/refundable sources/detail/PDF-data/PDF/generate-PDF: `customerRefunds.view`.
  - Create: `customerRefunds.create`.
  - Void/delete draft: `customerRefunds.void`.
- Audit/log side effects: service logs `CREATE`, `VOID`, and `DELETE` actions for `CustomerRefund`.
- Accounting impact:
  - Refund create posts debit accounts receivable, credit paid-from asset account.
  - Refund void creates or reuses one reversal journal and restores payment or credit-note source balance.
- Output/document impact:
  - Refund PDF endpoints are output-producing and remain deferred.

### Credit Notes

- Routes: `/sales/credit-notes`, `/sales/credit-notes/new`, `/sales/credit-notes/[id]`, `/sales/credit-notes/[id]/edit`.
- Web surfaces: `apps/web/src/app/(app)/sales/credit-notes/*`, `apps/web/src/components/forms/credit-note-form.tsx`, and `apps/web/src/lib/credit-notes.ts`.
- API controller/service: `apps/api/src/credit-notes/credit-note.controller.ts`, `apps/api/src/credit-notes/credit-note.service.ts`, and `apps/api/src/credit-notes/credit-note-accounting.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /credit-notes`
  - `PATCH /credit-notes/:id`
  - `POST /credit-notes/:id/finalize`
  - `POST /credit-notes/:id/apply`
  - `POST /credit-notes/:id/allocations/:allocationId/reverse`
  - `POST /credit-notes/:id/void`
  - `GET /credit-notes/:id`, `/allocations`, and invoice-side credit-note allocation reads as assertions.
- Output endpoints to keep deferred:
  - `GET /credit-notes/:id/pdf-data`
  - `GET /credit-notes/:id/pdf`
  - `POST /credit-notes/:id/generate-pdf`
- State fields: `CreditNote.status` (`DRAFT`, `FINALIZED`, `VOIDED`), `unappliedAmount`, `finalizedAt`, `journalEntryId`, `reversalJournalEntryId`, `originalInvoiceId`, and `CreditNoteAllocation.reversedAt`.
- Allowed transitions visible from code:
  - Create as `DRAFT`.
  - Edit only while `DRAFT`.
  - Finalize `DRAFT -> FINALIZED`; repeated finalize is idempotent only when a finalized credit note already has a journal.
  - Apply finalized credit note to a same-customer finalized open invoice without another journal.
  - Reverse active allocation, restoring credit note and invoice balances without another journal.
  - Void `DRAFT -> VOIDED` without reversal journal.
  - Void `FINALIZED -> VOIDED` with reversal journal; blocked by active allocations and posted refunds.
  - Reject applications for draft/voided notes, different-customer invoices, over-application, and stale claims.
- Permissions:
  - View/list/detail/PDF-data/PDF/generate-PDF/allocation reads: `creditNotes.view`.
  - Create: `creditNotes.create`.
  - Edit/delete draft currently also require `creditNotes.create`, which is a permission-policy question because there is no dedicated `creditNotes.update`.
  - Finalize and apply: `creditNotes.finalize`.
  - Reverse allocation and void: `creditNotes.void`.
- Audit/log side effects: service logs `CREATE`, `UPDATE`, `FINALIZE`, `APPLY`, `REVERSE_ALLOCATION`, `VOID`, and `DELETE`; reverse allocation uses `CreditNoteAllocation` as the entity type.
- Accounting impact:
  - Finalize posts a balanced journal: debit revenue accounts, debit VAT payable when tax exists, and credit accounts receivable.
  - Apply/reverse allocation changes matching balances only and should not create journals.
  - Finalized void creates or reuses one reversal journal and blocks until active allocations/refunds are cleared.
- Output/document impact:
  - Credit note PDF endpoints are output-producing and remain deferred.

## 4. Proposed Local Disposable Fixtures

All names, display labels, notes, descriptions, and memo-like markers should start with `DEV03-AR-`. Recommended run marker format: `DEV03-AR-<YYYYMMDDHHmm>-<shortId>`.

- Organization marker: `DEV03-AR-Org-<runId>` in a local disposable database only.
- User marker: display name `DEV03-AR-User-<runId>`; email can use lower-case local-test form such as `dev03-ar-<runId>@ledgerbyte.local.test`.
- Role/permission marker: `DEV03-AR-Role-<runId>` with only the AR permissions being tested, if role-specific checks are approved.
- Customer marker: `DEV03-AR-Customer-<runId>` with active customer or both contact type, no real tax ID, no real address, and no real phone/email.
- Item/service marker: `DEV03-AR-Service-<runId>` with a disposable sales price, sales tax rate, and revenue account mapping.
- Tax marker: `DEV03-AR-Tax-<runId>` if the local fixture org needs an explicit sales tax rate. Use fake, clearly non-production tax labels only.
- Account markers:
  - `DEV03-AR-Receivable-<runId>` for the org's AR account if fixture-created.
  - `DEV03-AR-VAT-Payable-<runId>` for VAT payable if fixture-created.
  - `DEV03-AR-Revenue-<runId>` for invoice and credit-note line posting.
  - `DEV03-AR-Bank-<runId>` or `DEV03-AR-Cash-<runId>` for payment/refund paid-through or paid-from asset accounts.
- Fiscal period marker: future run must prove the posting date is inside an open local disposable fiscal period; do not open, close, or unlock periods without explicit approval.
- Invoice markers:
  - `DEV03-AR-Invoice-Draft-<runId>`
  - `DEV03-AR-Invoice-Finalize-<runId>`
  - `DEV03-AR-Invoice-Void-Draft-<runId>`
  - `DEV03-AR-Invoice-Void-Finalized-<runId>`
  - If invoice numbers are sequence-generated, put the marker in notes/terms and record the generated number only as local evidence.
- Payment markers:
  - `DEV03-AR-Payment-Direct-<runId>`
  - `DEV03-AR-Payment-Unapplied-<runId>`
  - `DEV03-AR-Payment-Void-<runId>`
- Refund markers:
  - `DEV03-AR-Refund-PaymentSource-<runId>`
  - `DEV03-AR-Refund-CreditSource-<runId>`
- Credit note markers:
  - `DEV03-AR-CreditNote-Draft-<runId>`
  - `DEV03-AR-CreditNote-Apply-<runId>`
  - `DEV03-AR-CreditNote-Void-<runId>`
- Output markers: generated-document/PDF archive markers are deferred; do not create AR output fixtures until an output-gate batch approves it.

## 5. Dry-Run Test Matrix

| Workflow | Preconditions | Later approved action to test | Expected state before | Expected state after | Expected ledger/accounting effect | Expected audit effect | Expected document/output effect | Rollback/cleanup expectation | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sales invoice draft create | Local disposable org, user, customer, revenue account, optional item/tax, open period evidence | `POST /sales-invoices` | No invoice marker exists | Invoice `DRAFT`, `balanceDue = total`, no journal | No journal posted | `CREATE SalesInvoice` | None | Marked draft can be voided or retained for cleanup evidence; no delete unless approved | Planned only |
| Sales invoice draft edit | Existing `DEV03-AR-` draft invoice | `PATCH /sales-invoices/:id` | Invoice `DRAFT` | Still `DRAFT`, lines/totals recomputed | No journal posted | `UPDATE SalesInvoice` | None | Draft remains disposable | Planned only |
| Sales invoice finalize | Existing draft invoice with valid lines/accounts/open period | `POST /sales-invoices/:id/finalize` | `DRAFT`, no journal | `FINALIZED`, `finalizedAt`, `journalEntryId`, `balanceDue = total` | Dr AR, Cr revenue, Cr VAT payable if tax exists; ZATCA metadata upserted locally | `FINALIZE SalesInvoice` | None | Finalized invoice cannot be deleted; later cleanup must use void/reversal path if approved | Planned only |
| Sales invoice repeated finalize | Already finalized invoice with journal | Repeat `POST /finalize` | `FINALIZED`, has journal | Same invoice and journal returned | No second journal | No duplicate lifecycle evidence expected beyond request handling | None | Confirm idempotency evidence only | Planned only |
| Sales invoice draft void | Existing draft invoice with no journal | `POST /sales-invoices/:id/void` | `DRAFT` | `VOIDED`, `balanceDue = 0` | No reversal journal | `VOID SalesInvoice` | None | Voided draft retained as cleanup proof | Planned only |
| Sales invoice finalized void | Finalized invoice with no active payment, unapplied payment, or credit-note allocations | `POST /sales-invoices/:id/void` | `FINALIZED`, posted journal exists | `VOIDED`, `balanceDue = 0`, reversal journal linked | Reversal journal posted; original journal reversed | `VOID SalesInvoice` | None | Voided invoice retained as cleanup proof | Planned only |
| Sales invoice void blocked by direct payment allocation | Finalized invoice with active `CustomerPaymentAllocation` | `POST /sales-invoices/:id/void` | `FINALIZED`, payment allocation active | Request rejected; invoice remains `FINALIZED` | No new journal | Error evidence only; no state-change audit expected | None | Clear by approved payment void path only | Planned only |
| Sales invoice void blocked by unapplied payment allocation | Finalized invoice with active `CustomerPaymentUnappliedAllocation` | `POST /sales-invoices/:id/void` | `FINALIZED`, unapplied allocation active | Request rejected; invoice remains `FINALIZED` | No new journal | Error evidence only | None | Clear by approved unapplied allocation reversal only | Planned only |
| Sales invoice void blocked by credit note allocation | Finalized invoice with active `CreditNoteAllocation` | `POST /sales-invoices/:id/void` | `FINALIZED`, credit allocation active | Request rejected; invoice remains `FINALIZED` | No new journal | Error evidence only | None | Clear by approved credit allocation reversal only | Planned only |
| Customer payment direct allocation create | Finalized open invoice, asset paid-through account, open period | `POST /customer-payments` with allocation | No payment exists; invoice balance open | Payment `POSTED`, allocation created, invoice balance reduced | Dr paid-through asset, Cr AR | `CREATE CustomerPayment` | None | Later cleanup requires payment void if approved | Planned only |
| Customer payment overpayment/unapplied create | Finalized invoice or customer with amount received above allocations | `POST /customer-payments` with partial/no allocation | No payment exists | Payment `POSTED`, `unappliedAmount > 0` | Dr paid-through asset, Cr AR for full receipt | `CREATE CustomerPayment` | None | Later cleanup requires refund, apply/reverse, or void path approval | Planned only |
| Apply unapplied customer payment | Posted payment with unapplied balance and same-customer finalized open invoice | `POST /customer-payments/:id/apply-unapplied` | Payment has unapplied balance; invoice has balance due | Unapplied allocation active, payment unapplied decreases, invoice balance decreases | No new journal | `APPLY_UNAPPLIED CustomerPayment` | None | Reverse allocation before voiding payment/invoice | Planned only |
| Reverse unapplied payment allocation | Active unapplied allocation | `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse` | Allocation active | Allocation has `reversedAt`, payment/invoice balances restored | No new journal | `REVERSE_UNAPPLIED_ALLOCATION CustomerPayment` | None | Reversed allocation retained as cleanup evidence | Planned only |
| Customer payment void | Posted payment with no posted refunds and no active unapplied allocations | `POST /customer-payments/:id/void` | Payment `POSTED` | Payment `VOIDED`, reversal journal linked, direct invoice allocations restored | Reversal journal posted; original journal reversed | `VOID CustomerPayment` | None | Voided payment retained as cleanup proof | Planned only |
| Customer payment void blocked by refund | Posted payment used as source for posted customer refund | `POST /customer-payments/:id/void` | Payment `POSTED`, refund active | Request rejected; payment remains `POSTED` | No new journal | Error evidence only | None | Clear by approved refund void first | Planned only |
| Customer refund from payment | Posted payment with unapplied balance, paid-from asset account, open period | `POST /customer-refunds` with `CUSTOMER_PAYMENT` source | Source payment `POSTED`, unapplied available | Refund `POSTED`, source payment unapplied decreases | Dr AR, Cr paid-from asset | `CREATE CustomerRefund` | None | Later cleanup requires refund void | Planned only |
| Customer refund from credit note | Finalized credit note with unapplied balance, paid-from asset account, open period | `POST /customer-refunds` with `CREDIT_NOTE` source | Source credit note `FINALIZED`, unapplied available | Refund `POSTED`, source credit note unapplied decreases | Dr AR, Cr paid-from asset | `CREATE CustomerRefund` | None | Later cleanup requires refund void | Planned only |
| Customer refund void | Posted refund with source still present | `POST /customer-refunds/:id/void` | Refund `POSTED` | Refund `VOIDED`, reversal journal linked, source unapplied restored | Reversal journal posted; original journal reversed | `VOID CustomerRefund` | None | Voided refund retained as cleanup proof | Planned only |
| Credit note draft create/edit | Local customer, optional finalized original invoice, revenue account, tax rate | `POST /credit-notes`; `PATCH /credit-notes/:id` | No credit note or draft credit note | Credit note `DRAFT`, totals recomputed, `unappliedAmount = total` | No journal until finalize | `CREATE CreditNote`; `UPDATE CreditNote` | None | Draft can be voided or retained for cleanup evidence; no delete unless approved | Planned only |
| Credit note finalize | Draft credit note with valid lines/open period | `POST /credit-notes/:id/finalize` | `DRAFT`, no journal | `FINALIZED`, journal linked, `unappliedAmount = total` | Dr revenue, Dr VAT payable if tax exists, Cr AR | `FINALIZE CreditNote` | None | Later cleanup requires void after clearing allocations/refunds | Planned only |
| Credit note apply | Finalized credit note with unapplied balance and same-customer finalized open invoice | `POST /credit-notes/:id/apply` | Credit note unapplied available; invoice balance open | Allocation active, credit note unapplied decreases, invoice balance decreases | No new journal | `APPLY CreditNote` | None | Reverse allocation before credit note/invoice void | Planned only |
| Credit note allocation reverse | Active credit note allocation | `POST /credit-notes/:id/allocations/:allocationId/reverse` | Allocation active | Allocation has `reversedAt`, credit note and invoice balances restored | No new journal | `REVERSE_ALLOCATION CreditNoteAllocation` | None | Reversed allocation retained as cleanup evidence | Planned only |
| Credit note void | Draft or finalized credit note with no active allocations/refunds | `POST /credit-notes/:id/void` | `DRAFT` or `FINALIZED` | `VOIDED`; finalized note has reversal journal | Draft: no journal. Finalized: reversal journal and original journal reversed | `VOID CreditNote` | None | Voided credit note retained as cleanup proof | Planned only |
| Credit note void blocked by allocation/refund | Finalized credit note with active allocation or posted refund | `POST /credit-notes/:id/void` | `FINALIZED`, allocation/refund active | Request rejected; credit note remains `FINALIZED` | No new journal | Error evidence only | None | Clear allocation/refund through approved reversal/void path first | Planned only |
| AR output/archive gates | Existing finalized invoice/payment/refund/credit note and explicit output approval | PDF/archive endpoints | Existing AR record | Generated document metadata/content may be created | No ledger journal expected | Generated-document/audit behavior must be confirmed separately | PDF body/archive created; forbidden in this plan | Cleanup must prove generated documents are disposable or avoided | Planned only |

## 6. Commands That May Be Needed Later, But Must Not Be Run Now

These commands are candidates for a later approved AR mutation or targeted-verification run. They were not run in this thread.

- `corepack pnpm verify:local:api -- sales-invoice-rules customer-payment-rules customer-refund-rules credit-note-rules`
- `corepack pnpm verify:local:web -- sales-invoice-form customer-payments customer-refunds credit-notes`
- `corepack pnpm --filter @ledgerbyte/api test -- sales-invoice-rules`
- `corepack pnpm --filter @ledgerbyte/api test -- customer-payment-rules`
- `corepack pnpm --filter @ledgerbyte/api test -- customer-refund-rules`
- `corepack pnpm --filter @ledgerbyte/api test -- credit-note-rules`
- Future local-only API integration checks against disposable `DEV03-AR-` fixtures, only after explicit login/audit and mutation approval.
- Future shell/API health checks may be used before mutation QA, but they are readiness proof only.
- E2E, smoke, migrations, seed/reset/delete, ZATCA, email, exports/downloads/PDF generation, backup/restore, deployed beta checks, and production checks remain forbidden by default.

## 7. Existing Coverage Found

- `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts` covers invoice totals, line validation, edit/finalize guards, idempotent finalize, concurrent finalize claim, ZATCA metadata creation on finalize, closed-period finalization block, journal creation failure, finalized-update rejection, draft delete/finalized delete rejection, finalized/draft void behavior, active allocation void blockers, void after reversed credit allocation, voided-finalize rejection, PDF data, PDF archive generation, tenant scoping, and item protection.
- `apps/api/src/customer-payments/customer-payment-rules.spec.ts` covers balanced payment journals, invalid amount/reference rejection, allocation balance guards, stale allocation claims, posted payment journal and invoice balance reduction, closed-period payment block, partial/unapplied payment, unapplied application without a journal, invalid/stale unapplied applications, unapplied allocation reversal/restoration, void/reversal behavior, refund and active-unapplied void blockers, idempotent void, receipt data, receipt PDF data, and receipt archive generation.
- `apps/api/src/customer-refunds/customer-refund-rules.spec.ts` covers balanced refund journals, payment-source refunds, credit-note-source refunds, over-refund rejection, voided-source rejection, wrong-customer rejection, stale source claim rejection, tenant scoping, refund void/source restoration, stale void restoration guards, and refund PDF archiving.
- `apps/api/src/credit-notes/credit-note-rules.spec.ts` covers credit note totals, balanced finalization journals, idempotent finalize, finalized-update rejection, draft delete, finalization journal creation, void reversal, allocation without another journal, draft/voided apply rejection, different-customer rejection, over-apply rejection, stale allocation claims, active allocation/refund void blockers, void after reversed allocation, allocation reversal/restoration, double/stale reversal rejection, linked original invoice validation, tenant-scoped invoice credit-note listing, and PDF archiving.
- Web unit/page coverage exists for invoice workflow guidance, customer payment workflow guidance, sales invoice query prefill, customer-payment helper validation, customer-refund helper validation, and credit-note helper validation.
- Smoke and E2E references exist for AR workflows, but they are not safe default gates because they require login, services, fixture/state mutation, output generation, and broader smoke behavior.

## 8. Missing Coverage

- No approved local disposable AR fixture setup exists yet.
- No approved login/audit-writing run exists for AR state-machine QA.
- Browser-runtime authenticated AR QA remains blocked by Browser Use local URL policy and login/audit policy.
- Cross-module manual evidence is missing for ledger journal line assertions after create/finalize/void/refund flows.
- Permission-denial tests are incomplete for each AR state transition at API and UI layers.
- Output gates need separate approval because PDF routes can archive generated documents.
- Credit-note edit/delete permission naming needs a policy decision because it currently uses `creditNotes.create`.
- ZATCA invoice side effects on finalize are covered by API spec, but real ZATCA behavior remains out of DEV-03 AR scope.
- Deletion cleanup is not approved, so future cleanup must rely on approved void/reversal paths or a separately approved local-only cleanup method.

## 9. Risks And Blockers

- Login writes audit logs; future AR runtime QA must explicitly approve that expected local-only audit evidence.
- All AR mutation workflows affect ledger balances, receivable balances, source unapplied balances, or generated-document archives.
- PDF routes are not harmless display checks: service code archives generated PDFs through generated documents.
- Sales invoice finalize creates local ZATCA metadata as a side effect; this must be expected evidence, not a real ZATCA claim.
- Customer payment void and invoice/credit-note void depend on active allocation/refund blockers; tests must run in a controlled order.
- Fiscal-period posting locks can block AR posting, refund, or void actions if the posting date is outside an open period.
- Chart-of-accounts dependencies are strict: AR/VAT accounts and revenue/asset accounts must exist in the disposable org.
- Concurrent/stale claim behavior is high-risk and covered by specs, but a manual/local API run would need careful isolation to avoid ambiguous evidence.
- Existing smoke scripts exercise AR and output flows, but they are too broad and mutating for this thread.
- Browser Use local route policy remains a blocker for in-app authenticated browser walkthroughs.

## 10. Proposed DEV-03 Part 3.5 Or Part 4 Next Step

Policy recommendation: proceed to `DEV-03 Part 4: AP state-machine QA dry-run plan`.

Reasoning:

- DEV-03 Part 2 defined safe fixture/login/audit policy, but did not approve login, fixture creation, or mutation.
- This AR plan now identifies the AR fixture graph and later assertion matrix without executing it.
- AP needs the same dry-run planning before choosing a cross-module fixture implementation strategy.
- A future `DEV-03 Part 3.5: AR fixture implementation plan` is useful only if the user explicitly wants AR mutation QA before AP planning.

## 11. Open Questions

- Should future AR mutation QA use API-level transactional tests first, then manual local API calls, or should it start with a disposable local org through the UI/API?
- Should audit-log assertions be mandatory for every AR mutation, including `APPLY_UNAPPLIED` and `REVERSE_ALLOCATION`, or only lifecycle actions like finalize/void/refund?
- Should `GET /sales-invoices/:id/pdf`, `GET /customer-payments/:id/receipt.pdf`, `GET /customer-refunds/:id/pdf`, and `GET /credit-notes/:id/pdf` require an output permission stronger than module `view` because they archive generated documents?
- Should `creditNotes.update` be added later, or should edit/delete draft credit notes intentionally stay under `creditNotes.create`?
- Should future cleanup use void/reversal-only evidence, or should a separately approved local-only cleanup helper be designed?
- Should invoice finalize ZATCA metadata upsert be asserted in AR state-machine QA or deferred fully to a ZATCA-specific ticket?
- Should Sales role test coverage explicitly confirm it cannot finalize/void while Accountant/Admin can?

## 12. Recommended Next Step

Proceed with `DEV-03 Part 4: AP state-machine QA dry-run plan`.

Do not run AR login, fixture creation, mutations, PDF/archive generation, smoke, E2E, migrations, seed/reset/delete, ZATCA, email, backup/restore, deployment, environment changes, or production checks until a future ticket explicitly approves the exact local-only scope.
