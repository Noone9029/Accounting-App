# DEV-06 AR Invoice Void Mutation Run

## Approval Phrase Received

```text
I approve DEV-06 Part 8 local-only AR invoice void mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.
```

## Purpose And Scope

Purpose: execute exactly one approved local-only Sales/AR mutation to void the finalized fixture invoice `INVOICE-000001` under marker `DEV03-AR-20260524T130000`, then record safe evidence.

Scope was limited to one guarded call to `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` against the local disposable fixture database.

This run did not create, edit, or finalize invoices; did not intentionally repeat voiding; did not create payments, refunds, credit notes, or allocations; did not generate, export, download, archive, or inspect PDF/document bodies; did not send email; did not run ZATCA XML/signing/QR/submission/clearance/reporting; did not run cleanup deletion; did not run migrations, seed/reset/delete, E2E, smoke, deploys, environment changes, or production/beta/customer-data checks.

## Local Target Safety Result

- Docker status check found local `infra-postgres-1` and `infra-redis-1` containers running and healthy.
- `localhost:5432` reachability check succeeded.
- The `apps/api/.env` database URL guard accepted only a PostgreSQL target on `localhost:5432`.
- The guard found no forbidden production, beta, user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, shared, or customer-data pattern.
- No database URL, token, cookie, auth header, request/response body, customer/vendor body, signed XML, QR payload, attachment body, PDF body, or generated-document body was printed.

## Preflight Checks

Repository state:

- Latest commit inspected before mutation: `3c9214c3 Plan DEV-06 AR invoice void mutation`.
- Pre-existing unrelated dirty/untracked web marketing and graphify files were left untouched.
- No prior temporary finalize/retry/blocker/void script was tracked or staged.

Allowed non-mutating checks before mutation:

- Targeted AR Jest suites passed: `4` suites, `84` tests.
- Fixture runner targeted Jest suite passed: `1` suite, `41` tests.
- `fixture:dev04:cleanup-plan` for family `ar` and marker `DEV03-AR-20260524T130000` stayed plan-only with `NO DATA CREATED`, `NO DATABASE WRITES`, no database connection, no login, and no cleanup deletion.
- `corepack pnpm verify:diff` passed before mutation.

Read-only local fixture preflight:

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture organization existed.
- Invoice: `INVOICE-000001`.
- Safe invoice id prefix: `6ebb2d71`.
- Status before mutation: `FINALIZED`.
- `finalizedAt`: present.
- `journalEntryId`: present.
- `reversalJournalEntryId`: absent.
- Total: `287.5000`.
- Balance due: `287.5000`.
- Account `120`: `DEV03-AR-ACCT-120-20260524T130000`, active, posting allowed, `ASSET`.
- Account `220`: `DEV03-AR-ACCT-220-20260524T130000`, active, posting allowed, `LIABILITY`.
- Fixture revenue account: `DEV03-AR-ACCT-REV-20260524T130000`, active, posting allowed, `REVENUE`.
- Original journal: `JOURNAL_ENTRY-000001`, `POSTED`, reference `INVOICE-000001`, debit `287.5000`, credit `287.5000`.
- Original journal lines: debit account `120` `287.5000`; credit fixture revenue `250.0000`; credit account `220` `37.5000`.
- Journal entries: `1`.
- Reversal journals: `0`.
- Voided invoices: `0`.
- SalesInvoice audit actions: `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`.
- `SALES_INVOICE_VOIDED`: `0`.
- Fixture login/auth audit logs: `0`.
- Local `ZatcaInvoiceMetadata`: `1`, type `STANDARD_TAX_INVOICE`.
- Generated documents, payments, refunds, credit notes, payment allocations, payment unapplied allocations, credit note allocations, email outbox, email provider events, ZATCA signed drafts, and ZATCA submission logs: `0`.
- Fiscal periods for fixture organization: `0`, so the current-date posting guard allowed the reversal date.
- Number sequences: invoice next number `2`; journal entry next number `2`.

## Mutation Performed

Temporary script used:

```text
apps/api/scripts/dev06-ar-invoice-void.temp.ts
```

The script:

- loaded only the local API `.env` file.
- refused non-local or forbidden database targets before write-capable service use.
- accepted only marker `DEV03-AR-20260524T130000`, family `ar`, organization `DEV03-AR-ORG-20260524T130000`, invoice `INVOICE-000001`, and safe invoice id prefix `6ebb2d71`.
- verified the invoice was `FINALIZED` immediately before voiding.
- verified `journalEntryId` was present, `reversalJournalEntryId` was absent, and the original journal was `POSTED`.
- verified account `120`, account `220`, and fixture revenue were active posting accounts.
- verified forbidden side-effect counts were `0` before the service call.
- verified local ZATCA metadata count was `1`.
- verified the current-date posting guard allowed reversal.
- resolved the actor user from the fixture organization membership.
- called `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` exactly once.
- did not call create, update, finalize, payment, refund, credit-note, allocation, PDF, generated-document, email, ZATCA XML/signing/submission, cleanup, migration, seed, reset, or delete paths.

## Invoice State Before And After

Before:

- Invoice: `INVOICE-000001`.
- Status: `FINALIZED`.
- Total: `287.5000`.
- Balance due: `287.5000`.
- `finalizedAt`: present.
- `journalEntryId`: present.
- `reversalJournalEntryId`: absent.

After:

- Invoice: `INVOICE-000001`.
- Status: `VOIDED`.
- Total: `287.5000`.
- Balance due: `0.0000`.
- `finalizedAt`: present.
- `journalEntryId`: present and still linked to the original journal.
- `reversalJournalEntryId`: present.
- Invoice sequence next number remained `2`.

## Reversal Journal And Accounting Evidence

Original journal after void:

- `JOURNAL_ENTRY-000001`.
- Status: `REVERSED`.
- Reference: `INVOICE-000001`.
- Total debit: `287.5000`.
- Total credit: `287.5000`.
- `reversalOfId`: absent.
- Original journal was not deleted.

Reversal journal:

- `JOURNAL_ENTRY-000002`.
- Status: `POSTED`.
- Reference: `INVOICE-000001`.
- Description: `Reversal of JOURNAL_ENTRY-000001`.
- Total debit: `287.5000`.
- Total credit: `287.5000`.
- `reversalOfId`: present and points to the original journal.
- Journal entry sequence advanced to next number `3`.

Reversal lines:

- Debit account `220` VAT: `37.5000`.
- Debit fixture revenue account `DEV03-AR-ACCT-REV-20260524T130000`: `250.0000`.
- Credit account `120` AR: `287.5000`.

The reversal journal is balanced.

## Audit Evidence

- SalesInvoice audit log count for the invoice became `4`.
- Audit actions: `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, `SALES_INVOICE_VOIDED`.
- `SALES_INVOICE_VOIDED` exists exactly once.
- Fixture login/auth audit logs remained `0`.
- Full audit payload bodies were not printed.

## ZATCA Metadata Evidence

- Local `ZatcaInvoiceMetadata` count remained `1`.
- `zatcaInvoiceType` remained `STANDARD_TAX_INVOICE`.
- The void path did not run ZATCA XML generation, signing, QR generation, submission, clearance, or reporting.
- ZATCA signed drafts and submission logs remained `0`.

## No Forbidden Side Effects Evidence

Post-mutation read-only counts:

- Generated documents: `0`.
- Customer payments: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Customer payment allocations: `0`.
- Customer payment unapplied allocations: `0`.
- Credit note allocations: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA signed drafts: `0`.
- ZATCA submission logs: `0`.
- Cleanup deletion: not run.

## Temporary Script Cleanup And Tracked-File Verification

- `apps/api/scripts/dev06-ar-invoice-void.temp.ts` was removed after the single execution.
- `Test-Path apps/api/scripts/dev06-ar-invoice-void.temp.ts` returned `False`.
- `git status --short apps/api/scripts/dev06-ar-invoice-void.temp.ts` returned no tracked or staged script.
- `git ls-files apps/api/scripts/dev06-ar-invoice-void.temp.ts` returned no tracked script.
- No root package script was added for this mutation.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git ls-files apps/api/scripts/dev06-ar-invoice-void.temp.ts apps/api/scripts/dev06-ar-invoice-finalize-retry.temp.ts apps/api/scripts/dev06-ar-invoice-finalize.temp.ts apps/api/scripts/dev06-ar-posting-account-repair.temp.ts`.
- Targeted documentation/code inspection with `rg` and `Get-Content`.
- `docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- Local database target guard against `apps/api/.env` without printing the URL.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-invoices/sales-invoice-rules.spec.ts src/customer-payments/customer-payment-rules.spec.ts src/customer-refunds/customer-refund-rules.spec.ts src/credit-notes/credit-note-rules.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev04-fixture-runner.spec.ts`.
- `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000`.
- `corepack pnpm verify:diff`.
- Read-only preflight SQL through local Docker Postgres.
- `corepack pnpm exec tsx scripts/dev06-ar-invoice-void.temp.ts` from `apps/api`.
- Temporary script cleanup/tracked-file checks.
- Read-only post-mutation SQL through local Docker Postgres.
- Post-documentation targeted AR Jest suites: `4` suites, `84` tests passed.
- Post-documentation fixture-runner targeted Jest suite: `1` suite, `41` tests passed.
- Post-documentation `fixture:dev04:cleanup-plan` stayed plan-only with `NO DATA CREATED` and `NO DATABASE WRITES`.
- Post-documentation `corepack pnpm verify:diff` passed.
- Post-documentation `git diff --check` passed.
- `git diff --cached --check` was run after staging intended files.

## Commands Skipped And Why

Skipped because they were outside the Part 8 approval boundary:

- `verify:repo`.
- Actual `verify:ci:local`.
- Full tests.
- Full build.
- E2E.
- Smoke.
- Migrations.
- Seed/reset/delete.
- Deploys.
- Environment changes.
- Login/browser audit-writing flows.
- Fixture creation.
- Invoice create, edit, or finalize.
- Repeated invoice void.
- Payment allocation.
- Refund.
- Credit note mutation.
- Export/download/PDF/archive/generated-document output.
- Email.
- ZATCA XML/signing/QR/submission/clearance/reporting.
- Backup/restore.
- Production-hosting research.
- Cleanup deletion.

## Blockers Or Deviations

No mutation blocker was found.

Deviation note: `corepack pnpm verify:diff` reported the existing unrelated dirty/untracked web marketing and graphify files in `git status --short`, and printed the existing line-ending warning for `apps/web/src/app/page.tsx`. The command exited successfully; those unrelated files were left untouched and unstaged.

## Conclusion

The approved local-only void mutation completed successfully.

`INVOICE-000001` transitioned from `FINALIZED` to `VOIDED`; balance due became `0.0000`; original journal `JOURNAL_ENTRY-000001` became `REVERSED`; reversal journal `JOURNAL_ENTRY-000002` was posted and balanced; `SALES_INVOICE_VOIDED` was added exactly once; local ZATCA metadata remained present; and forbidden AR, output, email, ZATCA signing/submission, and cleanup side effects remained zero.

## Recommended Next Step

Part 9 was later completed as read-only evidence verification. Proceed with `DEV-06 Part 10: AR state-machine final triage`.

## Part 9 Void Evidence Verification Result

`DEV-06 Part 9` verified the Part 8 void evidence using read-only local checks.

Verification evidence: [DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md](DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md).

Part 9 performed no mutation. The invoice remains `VOIDED`, the original journal remains `REVERSED`, the reversal journal remains `POSTED` and balanced, `SALES_INVOICE_VOIDED` remains present exactly once, existing local `ZatcaInvoiceMetadata` remains present with type `STANDARD_TAX_INVOICE`, and forbidden side effects remain `0`.

Next prompt title: `DEV-06 Part 10: AR state-machine final triage`.
