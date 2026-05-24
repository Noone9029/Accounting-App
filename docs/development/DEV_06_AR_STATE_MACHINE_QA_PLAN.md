# DEV-06 AR State-Machine QA Plan

## 1. Purpose And Scope

This document starts DEV-06 Sales/AR state-machine QA planning using the approved local-only `DEV03-AR` fixture records created in DEV-05.

Scope for Part 1 is limited to code/test inspection, fixture-state review, and choosing the safest first local mutation slice. No Sales/AR lifecycle mutation was executed in this part.

Part 1 did not create, edit, finalize, void, allocate, refund, reverse, export, download, generate PDF, archive, email, run ZATCA, login, create more fixtures, delete fixtures, run migrations, seed, reset, deploy, change environment variables, or use production, beta, user-testing, or customer data.

## 2. Current Local Fixture State

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture source: `DEV-05 Part 3C`.
- Evidence status: `DEV-05 Part 4` verified `12 / 12` expected marker-scoped records.
- Cleanup-plan status: `DEV-05 Part 5` validated marker-scoped cleanup identification and confirmed deletion remains unimplemented and unapproved.
- Current base records:
  - organization: `1`
  - user: `1`
  - role: `1`
  - organization membership: `1`
  - accounts: `4` (`AR`, `cash`, `revenue`, `VAT`)
  - tax rate: `1`
  - bank/cash profile: `1`
  - customer: `1`
  - service item: `1`
- Side-effect baseline from DEV-05 evidence:
  - sales invoices: `0`
  - customer payments: `0`
  - customer payment allocations: `0`
  - customer payment unapplied allocations: `0`
  - customer refunds: `0`
  - credit notes: `0`
  - credit note allocations: `0`
  - journal entries: `0`
  - generated documents: `0`
  - audit logs: `0`

The local fixtures are retained for DEV-06. Cleanup deletion remains blocked until a separate marker-scoped cleanup ticket is explicitly approved.

## 3. AR Workflow QA Batches

### Batch A: Invoice Draft Create/Edit

- Workflow: create one draft sales invoice, then edit that same draft.
- API surface: `POST /sales-invoices`, `PATCH /sales-invoices/:id`, `GET /sales-invoices/:id`.
- Service surface: `apps/api/src/sales-invoices/sales-invoice.service.ts`.
- Status fields: `SalesInvoice.status`, `balanceDue`, `journalEntryId`, `finalizedAt`.
- Expected lifecycle boundary: only `DRAFT` records are created or updated.
- Expected accounting effect: none; no journal should be posted.
- Expected output effect: none; no generated document or PDF/archive action should run.
- Expected audit effect: service-level create/update audit entries may be written if the local mutation run uses the same service path; this must be explicitly approved and recorded as local-only evidence.
- Priority: first.

### Batch B: Invoice Finalize Blockers

- Workflow: prove finalization preconditions and blockers before any finalization is allowed.
- API surface: `POST /sales-invoices/:id/finalize`.
- Guarded transitions: `DRAFT -> FINALIZED`; `VOIDED` cannot finalize; repeated finalize should be idempotent only for already-finalized invoices with journals.
- Expected accounting effect if later approved: posted journal debiting accounts receivable and crediting revenue/VAT; local ZATCA metadata may be created by service code.
- Current status: deferred. Finalize is a ledger-posting lifecycle mutation and is not approved by Part 1.

### Batch C: Invoice Void Blockers

- Workflow: validate draft/finalized void boundaries and active-allocation blockers.
- API surface: `POST /sales-invoices/:id/void`.
- Guarded transitions: `DRAFT -> VOIDED` with no reversal journal; `FINALIZED -> VOIDED` with reversal journal; active payment, unapplied payment, or credit-note allocations block finalized void.
- Expected accounting effect if later approved: finalized invoice void posts or reuses one reversal journal.
- Current status: deferred. Void is not approved by Part 1.

### Batch D: Customer Payment Allocation/Reversal

- Workflow: direct payment allocation, unapplied payment application, unapplied allocation reversal, payment void blockers.
- API surface: `POST /customer-payments`, `POST /customer-payments/:id/apply-unapplied`, `POST /customer-payments/:id/unapplied-allocations/:allocationId/reverse`, `POST /customer-payments/:id/void`.
- Expected accounting effect if later approved: payment creation posts a cash/bank debit and AR credit; apply/reverse unapplied allocation should not create journals; void creates reversal journal.
- Current status: deferred until a draft/finalized invoice fixture exists and payment mutation approval is granted.

### Batch E: Customer Refund Source/Void

- Workflow: refund from a posted customer payment or finalized credit note source; void refund and restore source unapplied balance.
- API surface: `GET /customer-refunds/refundable-sources`, `POST /customer-refunds`, `POST /customer-refunds/:id/void`.
- Expected accounting effect if later approved: refund creation posts debit AR and credit paid-from asset; void creates reversal journal and restores source unapplied amount.
- Current status: deferred until source payment or credit-note fixtures exist and refund mutation approval is granted.

### Batch F: Credit Note Finalize/Apply/Reverse/Void

- Workflow: credit note draft create/edit, finalize, apply to invoice, reverse allocation, void.
- API surface: `POST /credit-notes`, `PATCH /credit-notes/:id`, `POST /credit-notes/:id/finalize`, `POST /credit-notes/:id/apply`, `POST /credit-notes/:id/allocations/:allocationId/reverse`, `POST /credit-notes/:id/void`.
- Expected accounting effect if later approved: finalize posts debit revenue/VAT and credit AR; apply/reverse allocation changes balances without a journal; finalized void creates reversal journal.
- Current status: deferred until invoice draft/finalized baseline and credit-note mutation approval exist.
- Permission note: `PATCH /credit-notes/:id` and draft delete currently require `creditNotes.create`; this remains a permission-policy question because no dedicated `creditNotes.update` permission is visible.

### Batch G: Output/PDF/Archive Gates

- Workflow: invoice PDF, payment receipt PDF, refund PDF, credit-note PDF, and generated-document archive gates.
- API surface: AR `pdf-data`, `pdf`, and `generate-pdf` or `generate-receipt-pdf` endpoints.
- Expected output effect if later approved: generated-document archive records or PDF bodies may be created.
- Current status: deferred. Part 1 does not approve exports, downloads, PDF generation, archive creation, or generated-document evidence.

## 4. Recommended First Mutation Slice

Recommended first slice: create and edit one draft sales invoice against the existing local `DEV03-AR-20260524T130000` fixture organization.

This is the safest first local-only action because it exercises the Sales/AR service validation and editable draft state without posting a journal, allocating payment, creating generated documents, generating PDF output, calling ZATCA, sending email, or touching cleanup deletion.

### Exact Fixture Records Required

- `DEV03-AR-ORG-20260524T130000`
- `DEV03-AR-USER-20260524T130000`
- `DEV03-AR-CUSTOMER-20260524T130000`
- `DEV03-AR-SERVICE-20260524T130000`
- `DEV03-AR-ACCT-AR-20260524T130000`
- `DEV03-AR-ACCT-REV-20260524T130000`
- `DEV03-AR-ACCT-VAT-20260524T130000`
- `DEV03-AR-ACCT-CASH-20260524T130000`
- `DEV03-AR-TAX-20260524T130000`

### Expected DB State Before

- Base fixture count remains `12`.
- No marker-scoped sales invoices exist.
- No marker-scoped customer payments, refunds, credit notes, allocations, journal entries, generated documents, or audit logs exist except audit logs that may be created by the future approved mutation run itself.
- Cleanup-plan still identifies only marker-scoped base fixtures.

### Expected DB State After A Future Approved Run

- One marker-scoped sales invoice exists with status `DRAFT`.
- The invoice has one service line tied to the DEV03-AR service item or revenue account.
- `balanceDue` equals the computed invoice total.
- `journalEntryId` is `null`.
- `finalizedAt` is `null`.
- No customer payments, refunds, credit notes, allocations, generated documents, PDFs, archived documents, emails, ZATCA network calls, cleanup deletes, or exports are created.
- If the approved path uses `SalesInvoiceService.create` and `SalesInvoiceService.update`, sanitized audit evidence for `CREATE` and `UPDATE` may exist; this must be treated as expected local-only evidence, not as a login/audit browser flow.

### Expected Accounting Effect

- No posted journal entries.
- No ledger balance changes.
- No AR allocation or payment balance changes.
- No inventory quantity/cost impact.

### Expected Audit Effect

- If the service path is used, local audit logs for `SalesInvoice` create/update are expected.
- Evidence must record only safe counts, action names, entity type, fixture marker, and status transitions.
- Do not expose tokens, cookies, authorization headers, DB URLs, request/response bodies, real customer data, signed XML, QR payloads, attachment bodies, or PDF bodies.

### Cleanup/Retention Note

The draft invoice should remain in the local disposable database for follow-up DEV-06 evidence verification and later lifecycle QA. Deleting the draft or running cleanup remains unapproved.

## 5. Commands And Tests To Run Before Any Mutation

Recommended pre-mutation checks for DEV-06 Part 2:

```powershell
git status --short
git log -1 --oneline
corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-invoices/sales-invoice-rules.spec.ts src/customer-payments/customer-payment-rules.spec.ts src/customer-refunds/customer-refund-rules.spec.ts src/credit-notes/credit-note-rules.spec.ts
$env:LEDGERBYTE_DEV04_DATABASE_URL='postgresql://ledgerbyte:ledgerbyte@localhost:5432/ledgerbyte_dev'; corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000; Remove-Item Env:\LEDGERBYTE_DEV04_DATABASE_URL
corepack pnpm verify:diff
```

Before any write, DEV-06 Part 2 must also prove:

- local Docker PostgreSQL is running and reachable on `localhost:5432`.
- the explicit database target is local/disposable.
- the marker is exactly `DEV03-AR-20260524T130000` or another explicitly approved `DEV03-AR-...` marker.
- the family is `ar` only.
- the planned operation is draft invoice create/edit only.
- no production, beta, user-testing, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, deployed database, or customer-data target is in use.

## 6. Commands And Tests That Remain Forbidden

Do not run these in DEV-06 Part 1, and do not run them in Part 2 without explicit approval that expands scope:

- sales invoice finalize.
- sales invoice void.
- customer payment create, allocate, apply, reverse, or void.
- customer refund create or void.
- credit note create, edit, finalize, apply, reverse allocation, or void.
- exports, downloads, PDF generation, generated-document archive creation, or attachment workflows.
- login or authenticated browser flows that write audit logs.
- fixture creation beyond the approved existing DEV03-AR base records.
- cleanup deletion.
- root execute fixture scripts or seed/reset/delete commands.
- migrations or schema changes.
- full E2E, smoke, full build, actual `verify:repo`, or actual `verify:ci:local`.
- deploys, environment changes, Vercel/Supabase setting changes, production checks, beta checks, ZATCA, email, backup, or restore.

## 7. Risks And Blockers

- The first mutation will write a local sales invoice and likely audit entries if service-layer code is used; this requires explicit user approval before Part 2.
- Deletion cleanup is not approved, so the draft invoice must be retained or handled by a later approved cleanup plan.
- Login remains blocked. A service/direct local API path is preferable for the first slice if it avoids browser login and app authentication flows.
- Output routes are not harmless for QA because PDF generation can archive generated documents.
- Finalize remains high-risk because it posts ledger journals and may create local ZATCA metadata.
- Payment, refund, and credit-note QA depend on finalized invoice or source balances and should run only after the draft invoice path is verified and a separate posting/allocation approval is granted.
- Permission-policy questions remain for credit-note edit/delete permission naming and for whether output/download routes need stronger permissions than module view.

## 8. Exact Approval Phrase Required Before First AR Mutation Run

Use this exact approval phrase before running the DEV-06 Part 2 mutation slice:

```text
I approve DEV-06 Part 2 local-only AR draft invoice create/edit mutation against disposable local fixtures. No production, no beta, no customer data.
```

This approval should be treated as limited to one local draft invoice create/edit slice against the approved `DEV03-AR-20260524T130000` fixture family. It does not approve finalization, voiding, allocations, refunds, credit notes, output generation, cleanup deletion, login/browser audit flows, production/beta targets, or customer data.

## 9. Recommended Next Step

Proceed to `DEV-06 Part 2: approved local AR draft invoice create/edit mutation` only after the exact approval phrase is received.

If approval is not provided, continue with mocked AR tests and documentation-only planning. No AR mutation should run from this Part 1 plan alone.

## Part 2 Draft Invoice Mutation Note

`DEV-06 Part 2` completed the approved local-only draft invoice create/edit mutation against marker `DEV03-AR-20260524T130000`.

Run evidence: [DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md](DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md).

Part 2 created one draft sales invoice and edited the same draft invoice. It did not finalize, void, allocate payment, create refunds, create credit notes, export, download, generate PDF, archive generated documents, send email, run ZATCA, delete fixtures, run cleanup deletion, run login/browser audit flows, run migrations, seed/reset/delete, deploy, change environment variables, use production, use beta/user-testing, or use customer data.
