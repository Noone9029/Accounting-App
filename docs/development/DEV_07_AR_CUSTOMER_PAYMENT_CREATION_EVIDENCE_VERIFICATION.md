# DEV-07 AR Customer Payment Creation Evidence Verification

## Purpose And Scope

DEV-07 Part 7 verified the Part 6 customer payment creation evidence using read-only local checks only.

Scope stayed limited to the local disposable DEV03-AR fixture marker `DEV03-AR-20260524T130000`, family `ar`, target invoice `INVOICE-000002`, and payment `PAYMENT-000001`.

No customer payment creation, payment allocation mutation, unapplied allocation application, unapplied allocation reversal, customer payment void, invoice create/edit/finalize/void, refund, credit-note mutation, fixture creation/deletion, generated-document/PDF/archive/export/download, email, ZATCA XML/signing/QR/submission, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider-setting, schema, production, beta, shared-target, customer-data, or login/browser audit-writing flow was run.

## Local Target Safety Result

- Latest commit inspected before verification: `dd1dbccb Create DEV-07 AR customer payment`.
- `HEAD` and `origin/main` were aligned at `dd1dbccb`.
- Docker Desktop Linux engine was available: server `linux 28.5.1`.
- `infra-postgres-1` and `infra-redis-1` were healthy.
- `127.0.0.1:5432` and `127.0.0.1:6379` were reachable.
- The API database target guard parsed the configured database as local `localhost:5432`.
- The target guard found no forbidden hosted, production, beta, user-testing, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, or Neon target pattern.
- Existing unrelated dirty/untracked web marketing and graphify files remained untouched and unstaged.
- No tracked DEV-06 or DEV-07 temporary mutation script matched the tracked-file check under `apps/api/scripts`.

Result: local-only target safety passed.

## Fixture And Invoice Evidence

- Marker/family fixture organization exists: `DEV03-AR-ORG-20260524T130000`, currency `SAR`.
- Active fixture actor membership exists.
- Fixture customer exists: `DEV03-AR-CUSTOMER-20260524T130000`, type `CUSTOMER`, active `true`.
- Paid-through cash/asset account exists: `D3AR-60524T130000-CASH` / `DEV03-AR-ACCT-CASH-20260524T130000`, type `ASSET`, active `true`, posting allowed `true`, active bank/cash profile.
- Account `120` exists as type `ASSET`, active `true`, posting allowed `true`.
- `INVOICE-000002` exists under the fixture organization/customer.
- Safe invoice id prefix starts with `ddadfdd7`.
- `INVOICE-000002` status remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due is `850.0000`.
- `reversalJournalEntryId` remains absent.
- `INVOICE-000001` remains `VOIDED` and remains excluded from the happy-path payment allocation workstream.
- No invoice lifecycle mutation occurred in Part 7.

## Customer Payment Evidence

- Exactly one DEV-07 customer payment exists for the fixture organization.
- Payment number: `PAYMENT-000001`.
- Safe payment id prefix starts with `b39f4d38`.
- Payment belongs to the fixture organization/customer.
- Payment status: `POSTED`.
- Amount received: `500.0000`.
- Unapplied amount: `200.0000`.
- `journalEntryId`: present.
- `voidReversalJournalEntryId`: absent.
- `postedAt`: present.
- Description label: `DEV07-AR-PAYALLOC-PAYMENT-20260524T130000`.
- `PAYMENT` number sequence next number: `2`.

## Direct Allocation Evidence

- Exactly one `CustomerPaymentAllocation` exists.
- The allocation links `PAYMENT-000001` to `INVOICE-000002`.
- Amount applied: `300.0000`.
- The allocation did not target `INVOICE-000001`.
- `CustomerPaymentUnappliedAllocation` count remains `0`.
- No `APPLY_UNAPPLIED` action has occurred.

## Invoice Balance Evidence

- `INVOICE-000002` remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due remains `850.0000`, matching the Part 6 direct-allocation impact from `1150.0000` before payment to `850.0000` after payment creation.
- The future planned same-invoice unapplied allocation of `200.0000` remains unapplied and out of scope for Part 7.

## Journal And Accounting Evidence

- `JOURNAL_ENTRY-000004` exists.
- Journal belongs to the fixture organization and is linked to `PAYMENT-000001`.
- Journal reference: `PAYMENT-000001`.
- Journal status: `POSTED`.
- Total debit: `500.0000`.
- Total credit: `500.0000`.
- Journal is balanced.
- `reversalOfId`: absent.
- Journal lines:
  - Debit paid-through cash/asset account `D3AR-60524T130000-CASH`: `500.0000`.
  - Credit account `120` AR: `500.0000`.
- `JOURNAL_ENTRY` number sequence next number: `5`.

## Audit Evidence

- CustomerPayment audit log count for `PAYMENT-000001`: `1`.
- `CUSTOMER_PAYMENT_CREATED` exists exactly once.
- No `APPLY_UNAPPLIED` audit action.
- No `REVERSE_UNAPPLIED_ALLOCATION` audit action.
- No `CUSTOMER_PAYMENT_VOIDED` audit action.
- Fixture organization login/auth audit actions remain `0`.
- No browser login flow was run.
- Full audit payload bodies, session metadata, tokens, auth headers, IP headers, and user-agent bodies were not recorded.

## Output, Email, And ZATCA Non-Effects

- `CustomerPaymentUnappliedAllocation`: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Credit note allocations: `0`.
- Generated documents: `0`.
- Receipt PDF/archive was not generated.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- No ZATCA XML generation, signing, QR generation, submission, clearance, or reporting evidence was found.
- Local `ZatcaInvoiceMetadata` for `INVOICE-000002` remains present: count `1`, type `STANDARD_TAX_INVOICE`, status `NOT_SUBMITTED`, no XML body, no QR body, no clearance timestamp, and no reporting timestamp.
- Cleanup deletion was not run.

## DEV-06 Non-Interference Evidence

- `INVOICE-000001` remains `VOIDED`.
- Safe invoice id prefix still starts with `6ebb2d71`.
- Total remains `287.5000`.
- Balance due remains `0.0000`.
- Original/reversal journal evidence remains safe.
- No DEV-06 lifecycle state changed due to Part 7.

## Temporary Script Cleanup Verification

- `apps/api/scripts/dev07-ar-customer-payment-create.temp.ts`: absent.
- The temporary script is not staged.
- The temporary script is not tracked.
- No root package script was added for this mutation.
- Existing unrelated dirty/untracked web marketing and graphify files remained untouched and unstaged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse --short HEAD`.
- `git rev-parse --short origin/main`.
- Required documentation reads for DEV-07 Part 7.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- Local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- Local `apps/api/.env` database target guard without printing the database URL.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-invoices/sales-invoice-rules.spec.ts src/customer-payments/customer-payment-rules.spec.ts src/customer-refunds/customer-refund-rules.spec.ts src/credit-notes/credit-note-rules.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev04-fixture-runner.spec.ts`.
- `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000`.
- `corepack pnpm verify:diff`.
- Docker `psql` read-only metadata query for table columns.
- Docker `psql` read-only `SELECT` query for fixture, invoice, payment, direct allocation, journal, audit, ZATCA metadata, DEV-06 non-interference, sequence, and side-effect evidence.
- Temporary script absence and tracked-file checks.
- `git diff --check`.
- `git diff --cached --check` after staging.

## Commands Skipped And Why

- Customer payment creation, direct payment allocation mutation, unapplied payment allocation, unapplied allocation reversal, customer payment void, customer refund, credit-note mutation, invoice create/edit/finalize/void, and repeated invoice void: forbidden in Part 7.
- Receipt data, receipt PDF data, receipt PDF, generate receipt PDF, PDF/generated-document/archive/export/download, email, and ZATCA XML/signing/QR/submission paths: forbidden output/network-sensitive paths.
- Fixture creation/deletion and cleanup deletion: forbidden in Part 7.
- E2E, smoke, migrations, seed/reset/delete, deploys, environment changes, provider setting changes, backup/restore, production-hosting research, and login/audit-writing browser flows: outside scope and forbidden by the Part 7 prompt.
- `verify:repo`, actual `verify:ci:local`, full tests, and full build: explicitly out of scope.

## Blockers Or Deviations

No evidence blocker remained. The local target, read-only fixture checks, and non-mutating verification commands passed.

## Conclusion

Evidence verified.

`PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, direct allocation `300.0000` to `INVOICE-000002`, and unapplied amount `200.0000`. `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, and balance due `850.0000`. `JOURNAL_ENTRY-000004` remains posted and balanced with Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.

No mutation was performed in Part 7. No unapplied allocation application, reversal, payment void, refund, credit note, invoice mutation, output/PDF/archive, email, ZATCA XML/signing/submission, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing flow occurred.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 8: unapplied payment allocation mutation plan
```
