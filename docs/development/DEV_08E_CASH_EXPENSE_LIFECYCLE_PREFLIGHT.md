# DEV-08E Cash Expense Lifecycle Preflight

## Purpose And Scope

This document records the DEV-08E Part 1 read-only preflight for the local cash expense lifecycle.

- Latest commit inspected: `50df109c Close DEV-08D supplier refund payment evidence`.
- Local `HEAD` matched `origin/main`: `50df109c803d8ff4c233e0c5a68843e2dd00895d`.
- Branch inspected: `main`.
- Mutation performed: no.
- No cash expense was created, voided, deleted, exported, downloaded, archived, or rendered as PDF.
- No generated document, email, ZATCA, supplier payment, supplier refund, purchase bill, debit note, purchase order, purchase receipt, stock movement, inventory, bank transaction, cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, hosted-database, or customer-data action was performed.

## Local-Only And No-Mutation Proof

- `apps/api/.env` contains a `DATABASE_URL`; the value was classified only as metadata and was not printed.
- The classified database target was local-like and not hosted-like.
- Docker showed `infra-postgres-1` and `infra-redis-1` running locally; only Postgres read-only SQL was used.
- Read-only SQL was wrapped in `BEGIN READ ONLY`.
- The DEV-08E marker baseline for the selected local organization was empty across cash expenses, cash expense journals, generated documents, email rows/events, supplier payments/refunds, purchase bills, purchase debit notes, purchase orders, purchase receipts, stock movements, and cleanup/delete audits.
- `apps/api/scripts` had no leftover `dev08`, `cash-expense`, `supplier-refund`, or temporary script file from previous work.
- The only worktree dirt before this preflight was unrelated untracked web/marketing and graphify output; it was left untouched and unstaged.

## Current DEV-08 Context

- DEV-08 closed the core local AP bill/payment evidence chain.
- DEV-08B closed the local AP debit-note and supplier-refund-from-debit-note branch.
- DEV-08C closed the local purchase-order conversion/lifecycle branch.
- DEV-08D closed the local supplier-refund-from-supplier-payment branch.
- DEV-08D final source payment was `PAY-000007`, safe prefix `4b9c42b1`, `VOIDED`, amount paid and unapplied amount `500.0000`, original payment journal `JE-000058` `REVERSED`, payment void reversal journal `JE-000061` `POSTED`.
- DEV-08D final supplier refund was `SRF-000004`, safe prefix `dc8c4c9a`, `VOIDED`, amount `150.0000`, original refund journal `JE-000059` `REVERSED`, refund void reversal journal `JE-000060` `POSTED`, posted supplier refunds for payment `0`.
- Remaining AP gaps now include cash expense lifecycle, inventory-clearing purchase bills, purchase receipt/inventory integration, AP output/PDF/archive, AP email, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.

## Cash Expense Lifecycle Map

Controller endpoints in `apps/api/src/cash-expenses/cash-expense.controller.ts`:

- `GET /cash-expenses`: lists organization cash expenses; requires `cashExpenses.view`.
- `POST /cash-expenses`: creates a cash expense through `CashExpenseService.create(...)`; requires `cashExpenses.create`.
- `GET /cash-expenses/:id`: fetches a single cash expense; requires `cashExpenses.view`.
- `GET /cash-expenses/:id/pdf-data`: returns PDF data; requires `cashExpenses.view`.
- `GET /cash-expenses/:id/pdf`: renders and archives a PDF; requires `cashExpenses.view`.
- `POST /cash-expenses/:id/generate-pdf`: renders and archives a PDF; requires `cashExpenses.view`.
- `POST /cash-expenses/:id/void`: voids a posted cash expense; requires `cashExpenses.void`.
- `DELETE /cash-expenses/:id`: deletes only draft cash expenses without journal entries; requires `cashExpenses.void`.

Service create behavior in `apps/api/src/cash-expenses/cash-expense.service.ts`:

- Prepares lines before the transaction.
- Accepts optional supplier/contact and branch references.
- Requires `paidThroughAccountId`.
- Uses `SAR` when currency is omitted and uppercases the currency.
- Uses active items only when `itemId` is supplied.
- Defaults line account and purchase tax rate from the item when present.
- Requires a line account if no item account default exists.
- Allows line accounts only when active, posting-enabled, and type `EXPENSE`, `COST_OF_SALES`, or `ASSET`.
- Allows tax rates only when active and scope is `PURCHASES` or `BOTH`.
- Calculates totals using the existing invoice total helper.
- Rejects non-postable totals through the finalizable invoice assertion.
- Validates optional contact as active `SUPPLIER` or `BOTH`.
- Validates optional branch exists in the organization.
- Validates paid-through account as active posting `ASSET`.
- Checks the fiscal period guard for `expenseDate` inside the transaction before number sequencing.
- Creates a `CASH_EXPENSE` number, creates a posted journal, then creates the cash expense as `POSTED`.
- Writes `CashExpense:CREATE`, mapped to `CASH_EXPENSE_CREATED`, after the transaction.

Draft/delete behavior:

- The Prisma enum includes `DRAFT`, `POSTED`, and `VOIDED`.
- The Prisma model defaults `CashExpense.status` to `POSTED`.
- The service `create(...)` always writes `POSTED`.
- The web creation UI is labelled "Post cash expense" and calls the create API directly; it has no draft mode.
- The list/detail UI exposes void actions for `POSTED`; it does not expose delete.
- `remove(...)` can delete only `DRAFT` cash expenses without a journal entry, but no controller/UI/service create path currently reaches `DRAFT`.
- Local read-only DB counts found no `DRAFT` cash expenses.

Void behavior:

- `void(...)` returns immediately when the existing expense is already `VOIDED`.
- It rejects non-`POSTED` expenses and posted expenses without an original journal.
- It checks the fiscal period guard for the reversal date.
- It claims the row with `updateMany` from `POSTED` to `VOIDED` and sets `voidedAt`.
- It creates a posted reversal journal unless the original journal already has a `reversedBy` journal.
- It marks the original journal `REVERSED`.
- It stores `voidReversalJournalEntryId` on the cash expense.
- It writes `CashExpense:VOID`, mapped to `CASH_EXPENSE_VOIDED`, after the transaction.

## Cash Expense Accounting Map

`apps/api/src/cash-expenses/cash-expense-accounting.ts` builds the original journal:

- Groups line taxable amounts by line account.
- Debits each expense/cost-of-sales/asset line account for its taxable amount.
- Debits VAT receivable account `230` when tax total is greater than zero.
- Credits the paid-through asset account for the total.
- Asserts the journal is balanced before returning lines.

For a typical VAT cash expense of taxable `1000.0000`, VAT `150.0000`, total `1150.0000`:

- Debit expense account `1000.0000`.
- Debit VAT receivable account `230` for `150.0000`.
- Credit paid-through bank/cash asset account for `1150.0000`.

Void/reversal behavior:

- Uses `createReversalLines(...)` from accounting-core.
- Reversal journal lines exactly swap original debit and credit amounts.
- Original journal status becomes `REVERSED`.
- Reversal journal status is `POSTED`.

AP/inventory/banking behavior:

- Cash expense does not create accounts payable.
- Cash expense does not create supplier payments, supplier refunds, purchase bills, debit notes, purchase orders, purchase receipts, stock movements, or inventory entries.
- Supplier ledger rows for linked cash expenses are neutral payable rows with debit `0.0000`, credit `0.0000`, and balance impact `0.0000`.
- Bank account activity can identify journal entries sourced from `CashExpense` or `VoidCashExpense`.

## Web, Search, Permissions, And Coverage Map

Web routes:

- `apps/web/src/app/(app)/purchases/cash-expenses/page.tsx` lists cash expenses and exposes create/void actions based on permissions.
- `apps/web/src/app/(app)/purchases/cash-expenses/new/page.tsx` renders the posting form.
- `apps/web/src/components/forms/cash-expense-form.tsx` loads contacts, items, accounts, tax rates, branches, and bank profiles; filters supplier contacts, asset paid-through accounts, posting purchase accounts, and purchase tax rates; then posts a cash expense.
- `apps/web/src/app/(app)/purchases/cash-expenses/[id]/page.tsx` loads the cash expense and `pdf-data`, shows journal/reversal fields, exposes PDF download, and can void a posted expense when allowed.
- `apps/web/src/lib/permissions.ts` maps `/purchases/cash-expenses/new` to `cashExpenses.create` and cash expense detail/list routes to `cashExpenses.view`.

Search and ledgers:

- `apps/api/src/search/search.service.ts` includes cash expenses only for users with `cashExpenses.view`.
- `apps/api/src/contacts/contact-ledger.service.ts` includes posted/voided linked cash expenses as neutral supplier ledger rows.
- `apps/api/src/bank-accounts/bank-account.service.ts` maps journal sources for `CashExpense` and `VoidCashExpense`.

Existing tests:

- `apps/api/src/cash-expenses/cash-expense-rules.spec.ts` covers total calculation, balanced journal creation, posted cash expense creation, fiscal-period blocker, customer-only contact rejection, void reversal once, and neutral supplier ledger rows.
- `apps/web/src/lib/cash-expenses.test.ts` covers labels, badge classes, void availability, paid-through labels, and API path encoding.
- `apps/api/src/pdf-rendering.spec.ts` covers cash expense PDF buffer rendering.

Missing coverage:

- No local disposable runtime evidence exists yet for a DEV-08E cash expense fixture.
- No independent read-only evidence document exists yet for cash expense creation.
- No cash expense void preflight/evidence/verification exists yet.
- No authenticated browser AP cash expense QA is claimed.
- No output/PDF/archive execution should be claimed until a separate output-safe approval.
- No email or ZATCA behavior should be claimed for cash expenses.

## PDF And Archive Map

- `pdfData(...)` builds structured PDF data and does not archive.
- `pdf(...)` calls `pdfData(...)`, renders the PDF, sanitizes a filename, and calls `GeneratedDocumentService.archivePdf(...)` when available.
- `generatePdf(...)` delegates to `pdf(...)` and returns the generated document.
- The detail page's "Download PDF" button calls `GET /cash-expenses/:id/pdf`, which can create a generated-document archive row.
- This preflight did not call any PDF-data, PDF, generate-PDF, archive, export, or download endpoint.
- DEV-08E mutation/evidence parts should continue to verify generated-document/PDF/archive counts remain `0` unless a later output-safe prompt explicitly approves output execution.

## Safe Future Local Fixture Plan

Selected local disposable target:

- Marker: `DEV08E-AP-20260526T000000`.
- Organization: existing fake local AP-ready organization, safe prefix `db69e5a8`.
- Contact/supplier: none for Part 2. `contactId` should be omitted/null because cash expenses support unlinked immediate expense posting and this is the smallest safe mutation.
- Branch: none for Part 2. `branchId` should be omitted/null.
- Paid-through account candidate: `112 Bank Account`, active posting `ASSET`, safe prefix `32ab6f4d`.
- Expense account candidate: `511 General Expenses`, active posting `EXPENSE`, safe prefix `c97f0827`.
- VAT/tax-rate candidate: `VAT on Purchases 15%`, active purchase tax rate, safe prefix `172417be`.
- Actor user: existing local active owner user, safe prefix `09f892d4`; do not print tokens or use login/browser flows.
- Cash expense line: description containing the marker, quantity `1.0000`, unit price `1000.0000`, discount `0.0000`, VAT `15.0000`.
- Expected totals: subtotal `1000.0000`, taxable total `1000.0000`, tax total `150.0000`, total `1150.0000`.
- Expected next expense number if no sequence changes occur before Part 2: `EXP-000002`.
- Expected next journal number if no sequence changes occur before Part 2: `JE-000062`.
- Part 2 must re-verify all ids, sequences, and marker counts before mutation.

## Selected Part 2 Mutation Option

Selected option: Option A, create one posted local cash expense fixture only, no void.

Reason:

- The committed create path already posts immediately.
- `DRAFT` is not reachable through the normal service/UI create path.
- Creating and voiding in one mutation would collapse the evidence sequence and make independent creation evidence weaker.
- A single posted fixture gives Part 3 a clean read-only verification target and Part 4 a clean void preflight target.

Required approval phrase:

`I approve DEV-08E Part 2 local-only cash expense fixture creation mutation under marker DEV08E-AP-20260526T000000. No production, no beta, no customer data.`

## Part 2 Mutation Evidence Note

DEV-08E Part 2 completed the approved local-only Option A mutation. Evidence is recorded in [DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md](DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md).

- Cash expense created: `EXP-000002`, safe prefix `74886497`, status `POSTED`, total `1150.0000`.
- Journal created: `JE-000062`, safe prefix `a2aa8290`, `POSTED`, balanced debit/credit `1150.0000`.
- Forbidden side effects remained absent for generated documents, email rows/events, ZATCA artifacts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, cleanup/delete audits, and temporary scripts.
- Exact next prompt title: `DEV-08E Part 3: cash expense fixture evidence verification`.

## Future Part 2 Evidence Expectations

Expected mutation:

- One guarded local-only script or service invocation.
- `CashExpenseService.create(...)` called exactly once.
- No `CashExpenseService.void(...)`.
- No `CashExpenseService.remove(...)`.
- No PDF, generate-PDF, archive, export, download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, env, or provider call.

Expected cash expense state:

- One cash expense under marker `DEV08E-AP-20260526T000000`.
- Status `POSTED`.
- `postedAt` present.
- `voidedAt` absent.
- `voidReversalJournalEntryId` absent.
- `subtotal` `1000.0000`.
- `discountTotal` `0.0000`.
- `taxableTotal` `1000.0000`.
- `taxTotal` `150.0000`.
- `total` `1150.0000`.

Expected accounting:

- One posted original journal.
- Debit account `511` for `1000.0000`.
- Debit account `230` for `150.0000`.
- Credit account `112` for `1150.0000`.
- Journal debit and credit both `1150.0000`.
- No reversal journal.

Expected audit:

- Exactly one `CashExpense:CREATE` / `CASH_EXPENSE_CREATED` audit for the fixture.
- No cash expense void/delete audit.
- No login/browser audit-writing flow.

Expected forbidden side effects:

- Generated documents for the fixture: `0`.
- Email outbox rows/provider events for the marker: `0`.
- ZATCA metadata/submission/signed-artifact rows for fixture ids: `0`.
- Supplier payments/refunds: `0`.
- Purchase bills/debit notes/orders/receipts: `0`.
- Stock movements/inventory entries: `0`.
- Cleanup/delete audits: `0`.
- Temporary scripts absent after execution and unstaged.

## Forbidden Side-Effect Baseline

Read-only local marker baseline for organization safe prefix `db69e5a8`:

| Check | Count |
| --- | ---: |
| Cash expenses for marker | 0 |
| Cash expense journals for marker | 0 |
| Generated documents for marker | 0 |
| Email outbox rows for marker | 0 |
| Email provider events for marker | 0 |
| Supplier payments for marker | 0 |
| Supplier refunds for marker | 0 |
| Purchase bills for marker | 0 |
| Purchase debit notes for marker | 0 |
| Purchase orders for marker | 0 |
| Purchase receipts for marker | 0 |
| Stock movements for marker | 0 |
| Cleanup/delete audits for marker | 0 |

Other local fixture facts:

- Target organization cash expense status counts before DEV-08E: one existing `VOIDED` cash expense, no `POSTED`, no `DRAFT`.
- Global local cash expense status counts before DEV-08E: one `POSTED`, sixty-four `VOIDED`, no `DRAFT`.

## Temporary Script Policy

Part 2 may use `apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts` only if it:

- Checks the exact approval phrase.
- Refuses non-local DB targets before importing write-capable services.
- Calls `CashExpenseService.create(...)` exactly once.
- Does not call void/remove/PDF/archive/export/download/email/ZATCA paths.
- Prints only sanitized safe prefixes, statuses, counts, and amounts.
- Removes itself before commit.
- Is not staged.

Part 3/4 may use read-only temporary scripts only if they refuse non-local targets, do not import or call mutating service paths, print sanitized summaries only, remove themselves before commit, and remain unstaged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git branch --show-current`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `rg --files apps/api/scripts | rg "dev08|cash-expense|supplier-refund|tmp"`.
- Targeted reads/searches of `CODEX_HANDOFF.md`, DEV-08/08B/08C/08D closure docs, `DEVELOPMENT_COMPLETION_PLAN.md`, `DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, and `README.md`.
- Targeted reads/searches of cash expense API, DTO, accounting, tests, Prisma schema, web routes, web helper/tests, permissions, contact ledger, bank account source mapping, audit event mapping, and PDF download helper.
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`.
- Redacted `apps/api/.env` local/hosted database classification.
- Read-only local SQL through `docker exec -i infra-postgres-1 psql -U accounting -d accounting -v ON_ERROR_STOP=1 -X -A -F "|"`.

## Commands Skipped

- Cash expense create, void, delete/remove, PDF-data, PDF, generate-PDF, archive, export, download, generated-document creation, supplier refund/payment mutation, purchase bill/debit-note/order/receipt mutation, inventory/stock/cash/bank mutation, cleanup/delete, migration, seed/reset/delete, deploy, env/provider/schema change, ZATCA, email, backup/restore, production-hosting research, production, beta, hosted, shared, and customer-data targets: explicitly forbidden.
- API/web startup: not needed for the read-only code and local DB preflight.
- Browser/login flows: forbidden because they can write audit logs.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this preflight.

## Blockers Or Discrepancies

- No blocker for Part 2 Option A was found.
- `DRAFT` exists in schema but is not reachable through the current create/UI path.
- The local DB has historical cash expense rows, so future evidence must be marker/fixture-scoped rather than broad organization-level only.
- An initial read-only SQL attempt used a statement-scoped CTE across multiple statements and another guessed an email column name incorrectly; both aborted without mutation and were rerun with corrected read-only queries.

## Exact Next Prompt Title

`DEV-08E Part 2: approved local cash expense fixture creation mutation`
