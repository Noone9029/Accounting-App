# DEV-07 AR Customer Payment Creation Mutation Run

## Approval Phrase Received

```text
I approve DEV-07 Part 6 local-only AR customer payment creation mutation under marker DEV03-AR-20260524T130000 for invoice INVOICE-000002. No production, no beta, no customer data.
```

## Purpose And Scope

DEV-07 Part 6 executed exactly one approved local-only AR customer payment creation mutation against `INVOICE-000002`.

Scope stayed limited to the local disposable DEV03-AR fixture marker `DEV03-AR-20260524T130000`, family `ar`, and invoice `INVOICE-000002`.

The approved mutation was limited to:

- one `CustomerPaymentService.create(...)` call.
- amount received `500.0000`.
- one direct allocation to `INVOICE-000002` for `300.0000`.
- expected unapplied amount `200.0000`.
- one posted payment journal.

No unapplied allocation application, unapplied allocation reversal, customer payment void, invoice mutation, refund, credit note, fixture creation/deletion, output/PDF/archive, email, ZATCA XML/signing/QR/submission, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing flow was run.

## Local Target Safety Result

- Docker Desktop Linux engine was available.
- `infra-postgres-1` and `infra-redis-1` were healthy.
- `127.0.0.1:5432` and `127.0.0.1:6379` were reachable.
- The API database target guard parsed the configured database as local `localhost:5432`.
- The guard found no forbidden hosted, production, beta, user-testing, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, or Neon target pattern.

Result: local-only target safety passed.

## Preflight Checks

Repository preflight:

- Latest commit inspected: `145ce74c Plan DEV-07 customer payment creation`.
- `HEAD` and `origin/main` were aligned at `145ce74c`.
- Existing unrelated dirty/untracked web marketing and graphify files remained untouched and unstaged.
- No DEV-06 or DEV-07 temporary mutation script was tracked under `apps/api/scripts`.

Non-mutating verification preflight:

- Targeted AR Jest suites passed: `4` suites, `84` tests.
- Fixture-runner targeted Jest suite passed: `1` suite, `41` tests.
- `fixture:dev04:cleanup-plan` ran in plan-only mode for family `ar` and marker `DEV03-AR-20260524T130000`; it opened no database connection, created no data, performed no writes, ran no login, and ran no lifecycle mutation.
- `corepack pnpm verify:diff` passed. It reported only the existing unrelated worktree changes and the existing CRLF warning on `apps/web/src/app/page.tsx`.

Read-only local fixture preflight:

- Marker/family fixture organization exists: `DEV03-AR-ORG-20260524T130000`, currency `SAR`.
- Active fixture actor membership exists.
- Customer exists: `DEV03-AR-CUSTOMER-20260524T130000`, type `CUSTOMER`, active `true`.
- `INVOICE-000002` exists, safe id prefix `ddadfdd7`, status `FINALIZED`, total `1150.0000`, balance due `1150.0000`, no reversal journal, and belongs to the fixture customer.
- `INVOICE-000001` remains `VOIDED`, safe id prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`, and is excluded from the happy path.
- Paid-through cash account `D3AR-60524T130000-CASH` / `DEV03-AR-ACCT-CASH-20260524T130000` exists as active, posting allowed, type `ASSET`, with active bank/cash profile.
- Account `120` / `DEV03-AR-ACCT-120-20260524T130000` exists as active, posting allowed, type `ASSET`.
- Existing customer payments, direct payment allocations, unapplied payment allocations, refunds, credit notes, generated documents, email records, ZATCA signed drafts, and ZATCA submission logs were `0`.
- Fiscal period count was `0`, so the posting-date guard allowed the selected payment date.
- `PAYMENT` number sequence was absent as expected.
- `JOURNAL_ENTRY` number sequence was ready to issue `JOURNAL_ENTRY-000004`.

Result: preflight passed.

## Mutation Performed

One temporary local script was created at:

```text
apps/api/scripts/dev07-ar-customer-payment-create.temp.ts
```

The script:

- refused non-local database targets before write-capable service use.
- accepted only marker `DEV03-AR-20260524T130000` and family `ar`.
- resolved the fixture organization, actor user, customer, `INVOICE-000002`, paid-through cash account, and account `120`.
- verified `INVOICE-000002` safe id prefix `ddadfdd7`, `FINALIZED` status, balance due `1150.0000`, and absent reversal journal.
- verified `INVOICE-000001` remained `VOIDED` and was not used.
- verified no existing customer payments or forbidden side-effect records existed before mutation.
- verified the payment date was allowed by the fiscal-period guard.
- called `CustomerPaymentService.create(organizationId, actorUserId, dto)` exactly once.

DTO shape:

- `customerId`: fixture customer id.
- `accountId`: fixture paid-through cash/asset account id.
- `currency`: `SAR`.
- `paymentDate`: local current safe date accepted by the posting-date guard.
- `amountReceived`: `500.0000`.
- `description`: `DEV07-AR-PAYALLOC-PAYMENT-20260524T130000`.
- `allocations`: exactly one allocation to `INVOICE-000002` for `300.0000`.

The script did not call `applyUnapplied`, `reverseUnappliedAllocation`, `CustomerPaymentService.void`, receipt/PDF/archive/generated-document/email/ZATCA XML/signing/submission/refund/credit-note/invoice mutation/cleanup/migration/seed/reset/delete paths.

## Payment Evidence

- Customer payment count for the fixture organization is now `1`.
- Payment number: `PAYMENT-000001`.
- Safe payment id prefix: `b39f4d38`.
- Status: `POSTED`.
- Amount received: `500.0000`.
- Unapplied amount: `200.0000`.
- `journalEntryId`: present.
- `voidReversalJournalEntryId`: absent.
- `postedAt`: present.
- `PAYMENT` number sequence next number: `2`.

## Direct Allocation Evidence

- Direct `CustomerPaymentAllocation` count is now `1`.
- The allocation links `PAYMENT-000001` to `INVOICE-000002`.
- Amount applied: `300.0000`.
- `CustomerPaymentUnappliedAllocation` count remains `0`.

## Invoice Balance Evidence

- `INVOICE-000002` remains `FINALIZED`.
- Safe invoice id prefix remains `ddadfdd7`.
- Total remains `1150.0000`.
- Balance due decreased from `1150.0000` to `850.0000`.
- `reversalJournalEntryId` remains absent.
- `INVOICE-000001` remains `VOIDED`, safe prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`.

## Journal And Accounting Evidence

- One new posted payment journal exists.
- Journal number: `JOURNAL_ENTRY-000004`.
- Journal reference: `PAYMENT-000001`.
- Journal status: `POSTED`.
- Total debit: `500.0000`.
- Total credit: `500.0000`.
- Journal is balanced.
- Journal entry sequence next number: `5`.

Payment journal lines:

- Debit paid-through cash/asset account `D3AR-60524T130000-CASH`: `500.0000`.
- Credit account `120` AR: `500.0000`.

## Audit Evidence

- CustomerPayment audit log count for `PAYMENT-000001`: `1`.
- Audit action: `CUSTOMER_PAYMENT_CREATED`.
- `CUSTOMER_PAYMENT_CREATED` exists exactly once.
- No `APPLY_UNAPPLIED` audit action.
- No `REVERSE_UNAPPLIED_ALLOCATION` audit action.
- No `CUSTOMER_PAYMENT_VOIDED` audit action.
- Login/auth audit actions for the fixture organization remain `0`.
- Full audit payload bodies, session metadata, tokens, auth headers, IP headers, and user-agent bodies were not recorded.

## Output, Email, And ZATCA Non-Effects

- `CustomerPaymentUnappliedAllocation`: `0`.
- Generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Local `ZatcaInvoiceMetadata` for `INVOICE-000002` remains `1`, type `STANDARD_TAX_INVOICE`, status `NOT_SUBMITTED`.
- ZATCA XML generation, signing, QR generation, submission, clearance, and reporting paths were not run.
- Customer refunds: `0`.
- Credit notes: `0`.
- Credit note allocations: `0`.
- Cleanup deletion: not run.

## DEV-06 Non-Interference Evidence

- `INVOICE-000001` remains `VOIDED`.
- Safe invoice id prefix remains `6ebb2d71`.
- Total remains `287.5000`.
- Balance due remains `0.0000`.
- Existing original/reversal journal evidence remains safe.
- No DEV-06 lifecycle mutation was introduced by Part 6.

## Temporary Script Cleanup And Tracked-File Verification

- Temporary script path: `apps/api/scripts/dev07-ar-customer-payment-create.temp.ts`.
- Temporary script was removed after execution.
- `Test-Path apps/api/scripts/dev07-ar-customer-payment-create.temp.ts`: `False`.
- Tracked temp mutation script check: no matching tracked DEV-06/DEV-07 temp script under `apps/api/scripts`.
- Temporary script was not staged.
- No root package script was added.
- Existing unrelated dirty/untracked web marketing and graphify files remained untouched and unstaged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse --short HEAD`.
- `git rev-parse --short origin/main`.
- Required documentation reads for DEV-07 Part 6.
- Read-only code inspection with `Get-Content`, `Select-String`, and `rg`.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- Local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- Local `apps/api/.env` database target guard without printing the database URL.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-invoices/sales-invoice-rules.spec.ts src/customer-payments/customer-payment-rules.spec.ts src/customer-refunds/customer-refund-rules.spec.ts src/credit-notes/credit-note-rules.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev04-fixture-runner.spec.ts`.
- `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000`.
- `corepack pnpm verify:diff`.
- Docker `psql` read-only `SELECT` queries for preflight fixture, invoice, sequence, side-effect, and posting-date evidence.
- `corepack pnpm --dir apps/api exec -- tsx scripts/dev07-ar-customer-payment-create.temp.ts`.
- Docker `psql` read-only `SELECT` queries for post-mutation payment, allocation, invoice, journal, audit, ZATCA metadata, DEV-06 non-interference, sequence, and forbidden side-effect evidence.
- Temporary script absence/tracked-file checks.

## Commands Skipped And Why

- `applyUnapplied`, unapplied allocation reversal, customer payment void, customer refund, credit-note mutation, invoice create/edit/finalize/void, and repeated invoice void: outside the approved Part 6 mutation.
- Receipt data, receipt PDF data, receipt PDF, generate receipt PDF, PDF/generated-document/archive/export/download, email, and ZATCA XML/signing/QR/submission paths: forbidden output/network-sensitive paths.
- E2E, smoke, migrations, seed/reset/delete, cleanup deletion, deploys, environment changes, provider setting changes, backup/restore, production-hosting research, and login/audit-writing browser flows: outside scope and forbidden by the Part 6 prompt.
- `verify:repo`, actual `verify:ci:local`, full tests, and full build: explicitly out of scope.

## Blockers Or Deviations

No final blocker remained. The approved customer payment creation mutation completed after local guards and preflight checks passed.

Deviation:

- One post-mutation read-only SQL evidence query stopped on a `ZatcaInvoiceMetadata` column name typo before returning evidence. It was inside a read-only transaction and did not mutate data. A corrected read-only query verified the final evidence.

## Conclusion

DEV-07 Part 6 completed the approved local-only AR customer payment creation mutation.

Exactly one posted customer payment was created: `PAYMENT-000001`, safe id prefix `b39f4d38`, amount received `500.0000`, direct allocation `300.0000` to `INVOICE-000002`, and unapplied amount `200.0000`. `INVOICE-000002` remains `FINALIZED` and its balance due decreased from `1150.0000` to `850.0000`. The payment journal `JOURNAL_ENTRY-000004` is posted and balanced.

No unapplied allocation application, reversal, payment void, refund, credit note, invoice mutation, output/PDF/archive, email, ZATCA XML/signing/submission, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing flow occurred.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 7: verify AR customer payment creation evidence
```
