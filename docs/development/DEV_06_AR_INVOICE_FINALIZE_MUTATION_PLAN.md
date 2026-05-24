# DEV-06 AR Invoice Finalize Mutation Plan

## Purpose And Scope

This document plans `DEV-06 Part 5`, the next approved local-only Sales/AR mutation slice: finalizing the existing local draft invoice `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.

This is planning only. Part 4 did not finalize the invoice, create or edit records, create fixtures, delete fixtures, run login/browser flows, generate output, send email, run ZATCA, run smoke/E2E, migrate, seed/reset/delete, deploy, change environment variables, or use production, beta, deployed targets, or customer data.

## Local-Only Safety Boundary

- Target must be an explicit local disposable database on `localhost:5432`.
- Marker must be exactly `DEV03-AR-20260524T130000`.
- Family must be `ar`.
- Invoice must be `INVOICE-000001` with safe id prefix `6ebb2d71`.
- Data must remain fake local fixture data only.
- No browser login flow is approved.
- No production, beta/user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, shared, or customer-data target may be used.
- No database URL, token, cookie, auth header, request/response body, customer/vendor data, signed XML, QR payload, attachment body, PDF body, or generated-document body may be recorded.

## Current Invoice Evidence Summary

Source evidence: [DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md](DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md).

- Latest pushed evidence commit before this plan: `ce20a315 Verify DEV-06 AR draft invoice evidence`.
- Fixture marker: `DEV03-AR-20260524T130000`.
- Fixture family: `ar`.
- Base fixture records verified: `12 / 12`.
- Existing draft invoice: `INVOICE-000001`.
- Safe invoice id prefix: `6ebb2d71`.
- Invoice status: `DRAFT`.
- Invoice total: `287.5`.
- Invoice balance due: `287.5`.
- Line count: `1`.
- Journal entries: `0`.
- Generated documents: `0`.
- Finalized invoices: `0`.
- Voided invoices: `0`.
- Customer payments/refunds/credit notes/allocations: `0`.
- ZATCA records: `0`.
- Email records: `0`.
- SalesInvoice audit logs: `2`, actions `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`.
- Auth/login audit logs: `0`.
- Invoice sequence next number: `2`.
- DEV-06 Part 3 was read-only and performed no mutation.

## Code Paths Inspected

- API route: `apps/api/src/sales-invoices/sales-invoice.controller.ts`.
  - `POST /sales-invoices/:id/finalize`.
  - Permission: `PERMISSIONS.salesInvoices.finalize`.
  - Guards: `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard` for normal API use.
- Service method: `apps/api/src/sales-invoices/sales-invoice.service.ts`.
  - `SalesInvoiceService.finalize(organizationId, actorUserId, id)`.
  - Uses `get`, transaction-scoped invoice lookup, posting-date guard, status claim, journal creation, invoice journal linking, ZATCA metadata upsert, and SalesInvoice audit logging.
- Accounting helper: `apps/api/src/sales-invoices/sales-invoice-accounting.ts`.
  - `buildSalesInvoiceJournalLines`.
- Accounting-core guards: `packages/accounting-core/src/index.ts`.
  - `assertFinalizableSalesInvoice`.
  - `calculateSalesInvoiceTotals`.
  - `assertBalancedJournal`.
- Fiscal period guard: `apps/api/src/fiscal-periods/fiscal-period-guard.service.ts`.
  - `assertPostingDateAllowed`.
- Audit logic: `apps/api/src/audit-log/audit-log.service.ts` and `apps/api/src/audit-log/audit-events.ts`.
  - `SalesInvoice:FINALIZE` maps to `SALES_INVOICE_FINALIZED`.
- Generated document/PDF logic: `apps/api/src/sales-invoices/sales-invoice.service.ts` `pdf` and `generatePdf`, plus `apps/api/src/generated-documents/generated-document.service.ts`.
- ZATCA logic:
  - Sales invoice finalization upserts `ZatcaInvoiceMetadata` with `STANDARD_TAX_INVOICE`.
  - Full XML/compliance generation lives in `apps/api/src/zatca/zatca.service.ts` and is a separate explicit action.
- Email logic: no email service call is present in the sales invoice finalize path.
- Tests inspected: `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts` plus the AR-adjacent targeted suites already used in DEV-06.

## Finalization Preconditions

Part 5 must prove these preconditions before any write:

- Local Docker PostgreSQL is healthy and `localhost:5432` is reachable.
- The explicit database target passes the local-only guard.
- The fixture organization, user, role/membership, AR account, revenue account, VAT account, cash account, tax rate, customer, and service item still exist under marker `DEV03-AR-20260524T130000`.
- The invoice is `INVOICE-000001`, belongs to the fixture organization/customer, and safe id prefix still matches `6ebb2d71`.
- Invoice status is `DRAFT`.
- `journalEntryId` is `null`.
- `reversalJournalEntryId` is `null`.
- `finalizedAt` is `null`.
- Invoice total is positive and has at least one positive line total.
- Posting date is allowed by fiscal period rules: if no fiscal periods exist, the guard allows posting; if periods exist, the invoice issue date must be inside an open period and not closed or locked.
- Posting account code `120` exists, is active, and allows posting for accounts receivable.
- Posting account code `220` exists, is active, and allows posting for VAT payable.
- The invoice line account remains an active posting revenue account.
- No customer payments, refunds, credit notes, or allocations exist for the fixture organization before finalization.

## Expected State Transition

Expected transition in Part 5:

- Before: `SalesInvoice.status = DRAFT`.
- Mutation: `SalesInvoiceService.finalize(...)`.
- After: `SalesInvoice.status = FINALIZED`.
- `finalizedAt`: set.
- `journalEntryId`: set to the newly created posted journal entry.
- `balanceDue`: remains equal to the invoice total because no payment, credit note, refund, or allocation is approved.
- `reversalJournalEntryId`: remains `null`.

The service treats already-finalized invoices with a journal idempotently, but Part 5 should not intentionally repeat finalization.

## Expected Accounting And Journal Impact

Finalization is expected to create one posted journal entry.

Expected journal summary for the current invoice, based on the verified invoice evidence and inspected posting code:

- Journal entry count increases from `0` to `1`.
- Journal entry status: `POSTED`.
- Journal entry reference: `INVOICE-000001`.
- Journal entry date: invoice issue date.
- Total debit: `287.5`.
- Total credit: `287.5`.
- Journal lines expected:
  - Debit accounts receivable account code `120`: `287.5`.
  - Credit revenue account from the invoice line: expected taxable amount `250`.
  - Credit VAT payable account code `220`: expected tax amount `37.5`.
- Invoice `journalEntryId` links to the new journal.
- Invoice number sequence should not advance.
- Journal entry number sequence should advance by one.
- No reversal journal should be created.

Part 5 must verify exact journal line amounts from the local database after finalization and record safe summaries only.

## Expected Audit Impact

Finalization is expected to create one additional SalesInvoice audit log.

Expected audit state after Part 5:

- SalesInvoice audit log count for `INVOICE-000001`: `3`.
- Existing actions remain:
  - `SALES_INVOICE_CREATED`
  - `SALES_INVOICE_UPDATED`
- New action:
  - `SALES_INVOICE_FINALIZED`
- Auth/login audit logs remain `0`.

Audit evidence must record only action names, entity type, count, and safe status fields. Do not record actor token, session metadata, IP headers, user agent bodies, or full before/after payload bodies.

## Expected Document, PDF, ZATCA, And Email Behavior

Expected behavior from inspected code:

- Generated documents: no generated document should be created by finalization itself.
- PDF/archive: no PDF, download, or archive route is called by finalization.
- ZATCA metadata: one local `ZatcaInvoiceMetadata` record is expected to be created or upserted for the invoice with type `STANDARD_TAX_INVOICE`.
- ZATCA XML/signing/submission: not expected and not approved; `ZatcaService.generateInvoiceCompliance` is a separate explicit action for finalized invoices.
- Email: no email service call is present in the sales invoice finalization path; email outbox/provider-event counts should remain `0`.

Part 5 must treat local ZATCA metadata as an expected finalization side effect, not as XML generation, signing, QR generation, submission, clearance, reporting, or production ZATCA behavior.

## Read-Only Preflight Checks For Part 5

Run these before any mutation in Part 5:

- `git status --short`.
- `git log -1 --oneline`.
- Local Docker/Postgres status check.
- `Test-NetConnection` for `localhost:5432`.
- Target guard check for explicit local disposable DB only.
- Targeted AR Jest suites:
  - `sales-invoice-rules.spec.ts`
  - `customer-payment-rules.spec.ts`
  - `customer-refund-rules.spec.ts`
  - `credit-note-rules.spec.ts`
- `fixture:dev04:cleanup-plan` for family `ar` and marker `DEV03-AR-20260524T130000`.
- `corepack pnpm verify:diff`.
- Read-only fixture and invoice evidence query confirming the current Part 3 baseline.

Stop immediately if:

- the database target is non-local, shared, production, beta/user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, or DigitalOcean.
- the marker or family is not exact.
- the invoice is not `DRAFT`.
- the fixture records no longer match the marker.
- unexpected payments, refunds, credit notes, allocations, generated documents, email records, or ZATCA XML/submission artifacts exist before finalization.
- posting-date guard would reject the invoice issue date.

## Planned Mutation Command Or Temporary Script Shape For Part 5

Preferred Part 5 mutation shape:

- Use one temporary local script under `apps/api/scripts/`.
- Give it a clearly temporary name such as `dev06-ar-invoice-finalize.temp.ts`.
- Refuse non-local database targets before importing or instantiating write-capable services.
- Accept only marker `DEV03-AR-20260524T130000`, family `ar`, and invoice `INVOICE-000001`.
- Resolve the fixture organization, fixture actor user, and invoice id from marker-scoped records.
- Verify all read-only preconditions again inside the script.
- Call `SalesInvoiceService.finalize(organizationId, actorUserId, invoiceId)` once.
- Print only safe summaries: invoice number, status before/after, safe id prefix, journal count delta, ZATCA metadata count, audit action names, and forbidden side-effect counts.
- Do not call PDF, generated-document, email, ZATCA XML/signing/submission, payment, refund, credit-note, allocation, void, cleanup, migration, seed, reset, or delete code paths.
- Remove the temporary script after the run and do not stage it unless a future prompt explicitly asks to keep a reusable read-only or mutation helper.

No root execute package script should be added.

## Planned Post-Mutation Evidence Checks For Part 5

After finalization in Part 5, run read-only evidence checks confirming:

- Invoice status is `FINALIZED`.
- `finalizedAt` is present.
- `journalEntryId` is present.
- `reversalJournalEntryId` remains absent.
- Balance due remains `287.5`.
- Journal entries: `1`.
- Reversal journal entries: `0`.
- Journal line debit/credit summary matches the expected accounts and amounts.
- Generated documents: `0`.
- Finalized invoices: `1`.
- Voided invoices: `0`.
- Customer payments/refunds/credit notes/allocations: `0`.
- ZATCA invoice metadata for the invoice: expected `1`.
- ZATCA signed artifact drafts/submission logs/XML generation: `0`.
- Email outbox/provider events: `0`.
- SalesInvoice audit logs for the invoice: `3`.
- New audit action includes `SALES_INVOICE_FINALIZED`.
- Auth/login audit logs remain `0`.
- Invoice sequence next number remains `2`.
- Journal entry sequence advanced by one.
- Temporary finalize script is removed and not staged.

## Forbidden Actions

Part 5 approval must still forbid:

- production, beta/user-testing, deployed, shared, or customer-data targets.
- login or browser audit-writing flows.
- fixture creation.
- creating another invoice.
- editing the invoice.
- voiding any invoice.
- payment creation or allocation.
- refunds.
- credit notes.
- exports.
- downloads.
- PDF generation.
- generated-document archive creation.
- email.
- ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- cleanup deletion.
- E2E.
- smoke.
- migrations.
- seed/reset/delete.
- deploys.
- environment changes.
- production-hosting research.

## Rollback And Cleanup Expectations

- Finalized invoices cannot be safely deleted as cleanup.
- Cleanup deletion remains unapproved.
- If Part 5 succeeds, the finalized local invoice should remain in the disposable database for Part 6 read-only evidence verification and later approved void/payment/credit-note QA.
- If a later cleanup is needed, it must be marker-scoped and separately approved.
- If finalization creates the expected posted journal and ZATCA metadata, rollback should be a future approved local invoice void/reversal test, not manual deletion.
- If finalization fails before a transaction commits, Part 5 should record no-state-change evidence and stop.
- If finalization partially commits unexpectedly, Part 5 must stop, record safe counts, and require a separate repair plan.

## Risks And Blockers

- Finalization posts ledger entries and changes invoice lifecycle state, so it must not run without the exact Part 5 approval phrase.
- The finalization path upserts local ZATCA invoice metadata even though real ZATCA behavior is not approved.
- Fiscal period locks may block posting depending on local fixture period state.
- The plan assumes posting accounts `120` and `220` still exist and allow posting in the fixture organization.
- The plan assumes the current invoice remains unchanged from Part 3 evidence.
- If a previous or manual local action changed the invoice, Part 5 must stop before mutation.
- A finalized invoice changes the future cleanup shape: cleanup must use approved void/reversal or a separately approved marker cleanup process.

## Exact Approval Phrase Required Before Part 5

```text
I approve DEV-06 Part 5 local-only AR invoice finalize mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

This approval must be treated as limited to one local-only invoice finalization mutation for the existing draft invoice. It does not approve voiding, payment allocation, refunds, credit notes, export/download/PDF/archive, email, ZATCA XML/signing/submission, cleanup deletion, migrations, seed/reset/delete, deployment, environment changes, production, beta/user-testing, or customer data.

## Recommended Next Step

Proceed to `DEV-06 Part 5: approved local AR invoice finalize mutation` only after the exact approval phrase is received.

## Part 5 Preflight Result

The exact approval phrase was received and Part 5 started the approved local-only finalize run, but it stopped before mutation.

Run evidence: [DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md](DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md).

Part 5 did not finalize `INVOICE-000001`. The guarded temporary script found that the fixture organization has the expected four marker-scoped accounts, but it lacks the active posting account codes `120` and `220` required by the current `SalesInvoiceService.finalize(...)` implementation. The existing fixture AR and VAT accounts use `D3AR-...` codes.

State after the stopped preflight:

- Invoice status: still `DRAFT`.
- Journal entries: still `0`.
- SalesInvoice audit actions: still `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; no `SALES_INVOICE_FINALIZED`.
- ZATCA metadata: still `0`.
- Forbidden side effects: still `0` for generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email, ZATCA XML/signing/submission artifacts, and cleanup deletion.
- Temporary script: removed and not staged.

Do not proceed to `DEV-06 Part 6: verify AR invoice finalize evidence` until a future approved run actually finalizes the invoice.

Next prompt title: `DEV-06 Part 5B: resolve AR invoice finalize posting-account blocker`.

## Part 5B Posting Account Blocker Resolution

Part 5B resolved the local fixture blocker without finalizing `INVOICE-000001`.

Resolution evidence: [DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md](DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md).

Findings:

- Finalization requires active posting account code `120` for accounts receivable and `220` for VAT payable.
- Those codes are intended default chart account codes in `DEFAULT_ACCOUNTS`.
- The existing fixture accounts used incompatible marker-scoped `D3AR-...` codes for the current finalize service path.
- Adding `120` and `220` to the local DEV03-AR fixture organization was safe because the repair stayed inside the disposable fixture org and did not alter production accounting behavior.
- Changing `SalesInvoiceService.finalize(...)` was deferred as larger and riskier than the fixture blocker warranted.

Resolution:

- Account `120` now exists in the fixture org as `DEV03-AR-ACCT-120-20260524T130000`, active and posting allowed.
- Account `220` now exists in the fixture org as `DEV03-AR-ACCT-220-20260524T130000`, active and posting allowed.
- The fixture runner now includes these service-required posting account dependencies for future AR fixtures.

No invoice finalization occurred in Part 5B. `INVOICE-000001` remains `DRAFT`; total and balance due remain `287.5000`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain absent. Journal entries, finalized invoices, `SALES_INVOICE_FINALIZED` audit logs, ZATCA metadata, generated documents, payments, refunds, credit notes, allocations, email records, ZATCA XML/signing/submission artifacts, and cleanup deletion remain `0`.

Next prompt title: `DEV-06 Part 5C: approved local AR invoice finalize mutation retry`.

## Part 5C Finalize Mutation Retry Result

Part 5C retried the approved local finalize mutation and finalized `INVOICE-000001`.

Retry evidence: [DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md](DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md).

Result:

- Invoice status became `FINALIZED`.
- `finalizedAt` and `journalEntryId` became present.
- `reversalJournalEntryId` remained absent.
- Total and balance due remained `287.5000`.
- A posted journal entry was created with total debit `287.5000` and total credit `287.5000`.
- Journal lines debited account `120` for `287.5000`, credited the fixture revenue account for `250.0000`, and credited account `220` for `37.5000`.
- SalesInvoice audit actions are now `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, and `SALES_INVOICE_FINALIZED`.
- One local `ZatcaInvoiceMetadata` record exists for `STANDARD_TAX_INVOICE`.
- Forbidden side effects stayed `0` for generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email, ZATCA signed drafts/submission logs, ZATCA XML/signing/QR/submission, and cleanup deletion.

Next prompt title: `DEV-06 Part 6: verify AR invoice finalize evidence`.

## Part 6 Finalize Evidence Verification Result

Part 6 verified the Part 5C finalization evidence with read-only local checks.

Verification evidence: [DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md](DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md).

Part 6 performed no mutation. `INVOICE-000001` remains `FINALIZED`; `finalizedAt` and `journalEntryId` remain present; `reversalJournalEntryId` remains absent; total and balance due remain `287.5000`; invoice sequence next number remains `2`.

The expected accounting evidence remains valid: one posted journal entry `JOURNAL_ENTRY-000001` exists for reference `INVOICE-000001`, total debit `287.5000`, total credit `287.5000`, with journal lines debit account `120` `287.5000`, credit fixture revenue `250.0000`, and credit account `220` `37.5000`.

Audit and local ZATCA metadata evidence remain valid: SalesInvoice audit actions include `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, and `SALES_INVOICE_FINALIZED`; one local `ZatcaInvoiceMetadata` row exists for `STANDARD_TAX_INVOICE`.

Forbidden side effects remain `0` for generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email, ZATCA signed drafts/submission logs, ZATCA XML/signing/QR/submission, and cleanup deletion.

Next prompt title: `DEV-06 Part 7: plan local AR invoice void mutation`.
