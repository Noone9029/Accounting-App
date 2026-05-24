# DEV-06 AR Invoice Void Mutation Plan

## Purpose And Scope

Purpose: plan the next local-only mutation slice for voiding the finalized fixture sales invoice `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.

This is planning only. Part 7 did not void the invoice, call any void/reverse service method, create or edit invoices, create payments/refunds/credit notes/allocations, create journals, generate output, send email, run ZATCA XML/signing/QR/submission/clearance/reporting, delete fixtures, migrate, seed, reset, deploy, change environment variables, or use production/beta/customer data.

Evidence and planned checks are limited to safe summaries. Database URLs, tokens, cookies, auth headers, request/response bodies, customer/vendor bodies, signed XML, QR payloads, attachment bodies, PDF bodies, generated-document bodies, and real customer/vendor/accounting data must not be printed.

## Local-Only Safety Boundary

Part 8 must run only against the explicit local Docker/localhost PostgreSQL target after a guard confirms:

- database scheme is PostgreSQL.
- host is `localhost`, `127.0.0.1`, or equivalent local Docker target.
- no production, beta/user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, shared, or customer-data target marker is present.
- fixture marker is exactly `DEV03-AR-20260524T130000`.
- fixture family is exactly `ar`.
- invoice number is exactly `INVOICE-000001`.
- invoice safe id prefix starts with `6ebb2d71`.

No browser login/API login flow should be used for Part 8 because login writes auth audit logs. If a temporary script is used, it must resolve the fixture actor from marker-scoped records and call only the approved invoice void method once.

## Current Finalized Invoice Evidence Summary

Part 6 verified the current local fixture state:

- Invoice: `INVOICE-000001`.
- Safe invoice id prefix: `6ebb2d71`.
- Status: `FINALIZED`.
- `finalizedAt`: present.
- `journalEntryId`: present.
- `reversalJournalEntryId`: absent.
- Total: `287.5000`.
- Balance due: `287.5000`.
- Line count: `1`.
- Account `120`: active, posting allowed, type `ASSET`.
- Account `220`: active, posting allowed, type `LIABILITY`.
- Original revenue fixture account: active, posting allowed, type `REVENUE`.
- Journal: `JOURNAL_ENTRY-000001`, status `POSTED`, reference `INVOICE-000001`.
- Journal totals: debit `287.5000`, credit `287.5000`.
- Journal lines: debit account `120` `287.5000`, credit fixture revenue `250.0000`, credit account `220` `37.5000`.
- SalesInvoice audit actions: `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`.
- Fixture login/auth audit logs: `0`.
- Local `ZatcaInvoiceMetadata`: `1` row with type `STANDARD_TAX_INVOICE`.
- Generated documents, payments, refunds, credit notes, allocations, voids, reversals, email, ZATCA signed drafts/submission logs: `0`.
- ZATCA XML/signing/QR/submission/clearance/reporting did not run.

## Code Paths Inspected

- `apps/api/src/sales-invoices/sales-invoice.controller.ts`
  - `@Post(":id/void")`.
  - `@RequirePermissions(PERMISSIONS.salesInvoices.void)`.
  - `SalesInvoiceController.void(...)`.
- `apps/api/src/sales-invoices/sales-invoice.service.ts`
  - `SalesInvoiceService.void(...)`.
  - `SalesInvoiceService.createOrReuseReversalJournal(...)`.
  - `SalesInvoiceService.finalize(...)`, as the source of the original posted journal and local ZATCA metadata creation.
  - `SalesInvoiceService.pdf(...)` and `generatePdf(...)`, to confirm generated-document/PDF archive paths are separate from voiding.
  - `SalesInvoiceService.assertPostingDateAllowed(...)`.
- `apps/api/src/sales-invoices/sales-invoice-accounting.ts`
  - `buildSalesInvoiceJournalLines(...)`, confirming original AR/revenue/VAT line shape.
- `packages/accounting-core/src/index.ts`
  - `createReversalLines(...)`, confirming reversal lines swap each original debit and credit.
- `apps/api/src/fiscal-periods/fiscal-period-guard.service.ts`
  - `FiscalPeriodGuardService.assertPostingDateAllowed(...)`, confirming current-date reversal is blocked by closed/locked/missing fiscal periods when periods exist, and allowed if the organization has no fiscal periods.
- `apps/api/src/audit-log/audit-events.ts`
  - `SalesInvoice:VOID` maps to `SALES_INVOICE_VOIDED`.
- `packages/shared/src/permissions.ts`
  - `PERMISSIONS.salesInvoices.void` is `salesInvoices.void`.
- `apps/api/prisma/schema.prisma`
  - `SalesInvoice.status`, `journalEntryId`, `reversalJournalEntryId`, and `JournalEntry.reversalOfId` relations.
- `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts`
  - void idempotency, allocation blockers, draft void no-reversal behavior, and reversed allocation allowance.
- `apps/api/scripts/smoke-accounting.ts`
  - referenced only for existing active-payment and unapplied-allocation void blockers; not executed.
- `README.md` and `BUG_AUDIT.md`
  - confirmed documented invoice void lifecycle, transaction guard, and active allocation blocker behavior.

## Void Route, Method, And Guards

Normal API route:

```text
POST /sales-invoices/:id/void
```

Controller method:

```text
SalesInvoiceController.void(organizationId, user, id)
```

Service method:

```text
SalesInvoiceService.void(organizationId, actorUserId, id)
```

Normal API use requires:

- `JwtAuthGuard`.
- `OrganizationContextGuard`.
- `PermissionGuard`.
- `salesInvoices.void` permission.
- An authenticated user and active organization context.

Part 8 should not use the browser/API login path. A guarded local script can call the service directly after resolving the fixture organization and actor user from marker-scoped records.

## Void Preconditions

Code-level preconditions for finalized invoice void:

- The invoice exists in the given organization.
- If already `VOIDED`, the service returns the existing invoice idempotently and does not open a new transaction.
- `DRAFT` invoices can be marked `VOIDED` with balance due set to `0.0000` and no reversal journal.
- A finalized invoice must have `journalEntryId`; otherwise it throws `Finalized invoice is missing its journal entry.`
- Status must be `FINALIZED` for the reversal path.
- Reversal date is `new Date()` at void execution time.
- `assertPostingDateAllowed` must allow the reversal date.
- The invoice row is conditionally claimed from `FINALIZED` to `VOIDED` inside the transaction before allocation checks.
- Active non-voided customer payment allocations block voiding.
- Active unreversed unapplied payment allocations from non-voided payments block voiding.
- Active unreversed credit-note allocations from non-voided credit notes block voiding.
- The original journal entry must exist in the same organization.
- If the original journal already has `reversedBy`, the existing reversal journal id is reused.

Part 8 must also stop before mutation if any local fixture guard differs from the Part 6 baseline:

- target is not explicit local Docker/localhost.
- marker/family/invoice number/safe id prefix do not match.
- invoice status is not `FINALIZED`.
- `journalEntryId` is absent.
- `reversalJournalEntryId` already exists.
- invoice total or balance due differ from `287.5000`.
- account `120`, account `220`, or the fixture revenue account is missing/inactive/non-posting.
- any payment, refund, credit note, payment allocation, unapplied payment allocation, or credit-note allocation exists.
- generated documents, ZATCA signed drafts, ZATCA submission logs, or email records exist.
- fiscal period guard would block the current reversal date.
- existing side-effect counts differ from the Part 6 baseline.

## Expected Status Transition

Expected status transition for this fixture:

```text
FINALIZED -> VOIDED
```

Expected invoice field behavior from inspected code:

- `status`: changes to `VOIDED`.
- `balanceDue`: changes to `0.0000`.
- `journalEntryId`: remains pointing to the original journal.
- `reversalJournalEntryId`: becomes present and points to the reversal journal.
- `finalizedAt`: not cleared by the void code, so it should remain present.
- `total`: unchanged at `287.5000`.
- Invoice sequence next number: unchanged.
- No dedicated `voidedAt` field exists on `SalesInvoice`; void timing is represented through audit and journal timestamps.

## Expected Reversal Journal And Accounting Impact

The finalized invoice void path calls `createOrReuseReversalJournal(...)`.

Expected reversal journal behavior:

- A new posted reversal journal should be created because `JOURNAL_ENTRY-000001` currently has no `reversedBy`.
- The reversal journal entry number should be the next journal sequence value, expected `JOURNAL_ENTRY-000002` if the sequence remains unchanged before Part 8.
- Reversal journal status: `POSTED`.
- Reversal journal `entryDate`: current void execution timestamp.
- Reversal journal `postedAt`: current void execution timestamp.
- Reversal journal description: `Reversal of JOURNAL_ENTRY-000001`.
- Reversal journal reference: `INVOICE-000001`.
- Reversal journal `reversalOfId`: original journal id.
- Original journal remains present and is not deleted.
- Original journal status changes from `POSTED` to `REVERSED`.
- Invoice `reversalJournalEntryId` points to the reversal journal.
- Journal entry sequence advances by one.
- Invoice sequence does not advance.

Expected reversal totals:

- Total debit: `287.5000`.
- Total credit: `287.5000`.

Expected reversal lines, derived by swapping the Part 6 journal debits and credits:

- Debit fixture revenue account: `250.0000`.
- Debit account `220` VAT payable: `37.5000`.
- Credit account `120` accounts receivable: `287.5000`.

The inspected code reverses the exact original journal line account ids and amounts. It does not perform a fresh lookup by account code during voiding.

## Expected Audit Impact

The service logs:

```text
entityType: SalesInvoice
action: VOID
```

Audit event mapping converts this to:

```text
SALES_INVOICE_VOIDED
```

Expected Part 8 audit result:

- SalesInvoice audit log count for `INVOICE-000001`: `4`.
- Actions include:
  - `SALES_INVOICE_CREATED`.
  - `SALES_INVOICE_UPDATED`.
  - `SALES_INVOICE_FINALIZED`.
  - `SALES_INVOICE_VOIDED`.
- `SALES_INVOICE_VOIDED` count: `1`.
- Fixture login/auth audit logs remain `0` if Part 8 avoids login/browser flows.
- Full audit payload bodies must not be printed.

## Expected Local ZATCA Metadata Behavior

`SalesInvoiceService.finalize(...)` upserts local `ZatcaInvoiceMetadata`.

`SalesInvoiceService.void(...)` does not update, delete, submit, sign, regenerate, or otherwise touch `ZatcaInvoiceMetadata` in the inspected code.

Expected Part 8 result:

- Existing local `ZatcaInvoiceMetadata` row remains present.
- Count remains `1`.
- `zatcaInvoiceType` remains `STANDARD_TAX_INVOICE`.
- No ZATCA XML generation, signing, QR generation, clearance, reporting, submission, or signed artifact draft is expected.

If a future code change adds explicit ZATCA void/cancellation behavior, Part 8 must stop and require a new plan before mutation.

## Expected Document, PDF, ZATCA XML, And Email Behavior

The invoice PDF/archive paths are separate controller/service methods:

- `GET /sales-invoices/:id/pdf`.
- `POST /sales-invoices/:id/generate-pdf`.
- `SalesInvoiceService.pdf(...)`.
- `SalesInvoiceService.generatePdf(...)`.

The void path does not call those methods and does not call email or ZATCA XML/signing/submission paths.

Expected non-effects:

- Generated documents/PDF/archive records remain `0`.
- Email outbox/provider events remain `0`.
- ZATCA signed artifact drafts remain `0`.
- ZATCA submission logs remain `0`.
- No XML, signed XML, QR payload, clearance, or reporting artifact is generated.
- No payment, refund, credit note, or allocation is created.
- No cleanup deletion is run.

## Read-Only Preflight Checks For Part 8

Before mutation, Part 8 should run:

- `git status --short`.
- `git log -1 --oneline`.
- Docker Postgres/Redis status.
- `localhost:5432` reachability.
- explicit local database target guard without printing the database URL.
- targeted AR Jest suites:
  - `sales-invoice-rules.spec.ts`.
  - `customer-payment-rules.spec.ts`.
  - `customer-refund-rules.spec.ts`.
  - `credit-note-rules.spec.ts`.
- fixture-runner targeted test if fixture docs/code changed:
  - `dev04-fixture-runner.spec.ts`.
- `fixture:dev04:cleanup-plan` for family `ar` and marker `DEV03-AR-20260524T130000`, only in dry-run/counts-only mode.
- `corepack pnpm verify:diff`.

Read-only local fixture checks must verify:

- marker/family/invoice/safe prefix match.
- invoice status is `FINALIZED`.
- `finalizedAt` and `journalEntryId` are present.
- `reversalJournalEntryId` is absent.
- total and balance due are `287.5000`.
- original journal is `JOURNAL_ENTRY-000001`, status `POSTED`, reference `INVOICE-000001`, balanced at `287.5000`.
- journal lines still match Part 6 evidence.
- journal sequence next number remains `2`, if safely checkable.
- invoice sequence next number remains `2`.
- account `120`, account `220`, and fixture revenue account are active and posting allowed.
- payment/refund/credit-note/allocation/generated document/email/ZATCA signed artifact/submission counts remain `0`.
- local `ZatcaInvoiceMetadata` count remains `1`.
- fixture login/auth audit logs remain `0`.
- posting-date guard will allow the current reversal date.

If any preflight value differs, Part 8 must stop before mutation and document the blocker.

## Planned Temporary Script Shape For Part 8

Use one temporary local script under `apps/api/scripts`, for example:

```text
apps/api/scripts/dev06-ar-invoice-void.temp.ts
```

Script requirements:

- refuse non-local database targets before write-capable service use.
- accept only marker `DEV03-AR-20260524T130000`.
- accept only family `ar`.
- accept only invoice `INVOICE-000001`.
- verify invoice safe id prefix `6ebb2d71`.
- verify invoice status is `FINALIZED` immediately before voiding.
- verify `journalEntryId` is present.
- verify `reversalJournalEntryId` is absent.
- verify no payments, refunds, credit notes, allocations, generated documents, email records, ZATCA signed drafts, or ZATCA submission logs exist.
- verify account `120`, account `220`, and the fixture revenue account are active/posting.
- verify current-date posting guard will allow the reversal.
- resolve fixture organization and actor user from marker-scoped records.
- call `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` exactly once.
- do not call create, update, finalize, payment, refund, credit-note, allocation, PDF, generated-document, email, ZATCA XML/signing/submission, cleanup, migration, seed, reset, or delete paths.
- print safe summaries only: invoice number, status before/after, safe id prefix, original/reversal journal safe ids or numbers, journal count delta, reversal line summary, audit action names, ZATCA metadata count, and forbidden side-effect counts.
- remove the temporary script after execution.
- do not stage the temporary script.
- do not add root package scripts.

## Planned Post-Mutation Evidence Checks For Part 8

After the approved mutation, Part 8 should run read-only evidence checks:

Invoice:

- `INVOICE-000001` status is `VOIDED`.
- `finalizedAt` remains present.
- `journalEntryId` remains present and points to the original journal.
- `reversalJournalEntryId` is present and points to the reversal journal.
- total remains `287.5000`.
- balance due is `0.0000`.
- invoice sequence next number remains unchanged from preflight.

Journal:

- journal entries count for fixture org is `2`.
- original journal `JOURNAL_ENTRY-000001` remains present.
- original journal status is `REVERSED`.
- reversal journal exists and is `POSTED`.
- reversal journal reference is `INVOICE-000001`.
- reversal journal description is `Reversal of JOURNAL_ENTRY-000001`.
- reversal journal `reversalOfId` points to the original journal.
- reversal total debit is `287.5000`.
- reversal total credit is `287.5000`.
- reversal lines include debit fixture revenue `250.0000`, debit account `220` `37.5000`, and credit account `120` `287.5000`.
- journal entry sequence advanced by one, if safely checkable.

Audit:

- SalesInvoice audit logs for invoice are now `4`.
- `SALES_INVOICE_VOIDED` exists exactly once.
- fixture login/auth audit logs remain `0`.
- full audit payload bodies are not printed.

ZATCA/email/output/non-effects:

- local `ZatcaInvoiceMetadata` count remains `1`.
- `zatcaInvoiceType` remains `STANDARD_TAX_INVOICE`.
- generated documents/PDF/archive remain `0`.
- email outbox/provider events remain `0`.
- ZATCA signed drafts/submission logs/XML/signing/QR/clearance/reporting remain `0`.
- payments/refunds/credit notes/allocations remain `0`.
- cleanup deletion was not run.

## Forbidden Actions

Part 8 approval must still forbid:

- production, beta/user-testing, deployed, shared, or customer-data targets.
- invoice create/edit/finalize beyond the single approved void.
- another invoice void or repeated intentional void.
- payments, refunds, credit notes, and allocations.
- generated documents, PDF generation, export, download, archive, or attachment body inspection.
- email sending.
- ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- migrations, seed/reset/delete, cleanup deletion, backup/restore.
- deploys, provider setting changes, environment changes, production-hosting research.
- login/browser flows that write audit logs.

## Rollback And Cleanup Expectations

If Part 8 succeeds, `INVOICE-000001` should remain `VOIDED` in the local disposable fixture database as evidence for later read-only verification. The original and reversal journals should remain in place.

Manual deletion is not approved. Cleanup deletion remains a separate future approval and should not be used to hide or erase state-machine evidence.

If Part 8 fails before mutation, record safe no-state-change evidence and stop.

If Part 8 partially commits unexpectedly, stop, record safe counts only, and require a separate repair plan.

## Risks And Blockers

- Voiding a finalized invoice posts a reversal journal and changes accounting state, so it must not run without the exact Part 8 approval phrase.
- The original journal status is expected to change from `POSTED` to `REVERSED`; future evidence must not expect it to remain `POSTED`.
- The void path claims the invoice row before checking active allocations. If an allocation blocker appears, the transaction should roll back, but Part 8 should preflight counts first.
- The reversal date is current execution time; fiscal period state could block the mutation if periods are added or locked before Part 8.
- The void code does not itself check generated documents or signed ZATCA artifacts; Part 8 must stop if those records appear because the approved slice is narrower than output/ZATCA lifecycle cleanup.
- A previously created reversal journal or already-voided invoice changes the expected mutation; Part 8 must stop rather than intentionally exercising idempotency.

## Exact Approval Phrase Required Before Part 8

```text
I approve DEV-06 Part 8 local-only AR invoice void mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

This approval must be treated as limited to one local-only invoice void mutation for the existing finalized fixture invoice. It does not approve invoice create/edit/finalize, repeated voiding, payments, refunds, credit notes, allocations, export/download/PDF/archive, email, ZATCA XML/signing/QR/submission/clearance/reporting, cleanup deletion, migrations, seed/reset/delete, deployment, environment changes, production, beta/user-testing, or customer data.

## Recommended Next Step

Part 8 was later approved and completed. Proceed with `DEV-06 Part 9: verify AR invoice void evidence`.

## Part 8 Void Mutation Result

`DEV-06 Part 8` executed the approved local-only void mutation for `INVOICE-000001`.

Run evidence: [DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md](DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md).

Result summary:

- Status became `VOIDED`.
- Balance due became `0.0000`.
- `finalizedAt` and `journalEntryId` remain present.
- `reversalJournalEntryId` is present.
- Original journal `JOURNAL_ENTRY-000001` changed from `POSTED` to `REVERSED`.
- Reversal journal `JOURNAL_ENTRY-000002` is `POSTED`, references `INVOICE-000001`, and is balanced at debit `287.5000` and credit `287.5000`.
- Reversal lines debit account `220` VAT `37.5000`, debit fixture revenue `250.0000`, and credit account `120` AR `287.5000`.
- `SALES_INVOICE_VOIDED` was created exactly once.
- Existing local `ZatcaInvoiceMetadata` remained present with type `STANDARD_TAX_INVOICE`.
- Forbidden side effects stayed `0` for generated documents, payments, refunds, credit notes, allocations, email, ZATCA signed drafts/submission logs, ZATCA XML/signing/QR/submission, and cleanup deletion.

Next prompt title: `DEV-06 Part 9: verify AR invoice void evidence`.

## Part 9 Void Evidence Verification Result

`DEV-06 Part 9` completed read-only verification of the Part 8 void evidence.

Verification evidence: [DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md](DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md).

Part 9 performed no mutation. `INVOICE-000001` remains `VOIDED`; balance due remains `0.0000`; original journal `JOURNAL_ENTRY-000001` remains `REVERSED`; reversal journal `JOURNAL_ENTRY-000002` remains `POSTED` and balanced; SalesInvoice audit evidence remains valid with exactly one `SALES_INVOICE_VOIDED`; local ZATCA metadata remains present; and forbidden side effects remain zero.

Next prompt title: `DEV-06 Part 10: AR state-machine final triage`.
