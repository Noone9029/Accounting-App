# DEV-07 AR Payment Allocation Invoice Fixture Evidence Verification

## Purpose And Scope

DEV-07 Part 4 verified the payment-allocation invoice fixture created in Part 3E using local read-only checks only.

No invoice create, edit, finalize, void, customer payment creation, payment allocation, unapplied allocation, refund, credit note, fixture creation, fixture deletion, cleanup deletion, generated document, PDF/archive/export/download, email, ZATCA XML/signing/QR/submission, migration, seed/reset/delete, deploy, environment, provider-setting, schema, production, beta, shared-target, customer-data, or login/browser audit-writing action was run.

## Local Target Safety Result

- Latest commit inspected: `b408cdc9 Create DEV-07 payment allocation invoice fixture`.
- `HEAD` and `origin/main` both resolved to `b408cdc9`.
- Docker Desktop Linux engine was available: server `linux 28.5.1`.
- Local containers were healthy and reachable:
  - `infra-postgres-1`, mapped to `0.0.0.0:5432`.
  - `infra-redis-1`, mapped to `0.0.0.0:6379`.
- `127.0.0.1:5432` and `127.0.0.1:6379` were reachable.
- The API database target guard parsed as local PostgreSQL on `localhost:5432`.
- The guard found no forbidden hosted, production, beta, user-testing, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, shared, or customer-data target pattern.

## Fixture Dependency Evidence

Read-only fixture dependency checks verified:

- Marker/family organization: `DEV03-AR-ORG-20260524T130000`, safe id prefix `bceae558`, base currency `SAR`.
- Fixture actor membership: `DEV03-AR-USER-20260524T130000`, active membership, role `DEV03-AR-ROLE-20260524T130000`.
- Customer: `DEV03-AR-CUSTOMER-20260524T130000`, safe id prefix `76fb1dcb`, type `CUSTOMER`, active `true`.
- Service item: `DEV03-AR-SERVICE-20260524T130000`, type `SERVICE`, status `ACTIVE`, selling price `100.0000`.
- Service item revenue account: `D3AR-60524T130000-REV`, `DEV03-AR-ACCT-REV-20260524T130000`, type `REVENUE`, active `true`, posting `true`.
- Sales tax rate: `DEV03-AR-TAX-20260524T130000`, scope `SALES`, rate `15.0000`, active `true`.
- Account `120`: `DEV03-AR-ACCT-120-20260524T130000`, type `ASSET`, active `true`, posting `true`.
- Account `220`: `DEV03-AR-ACCT-220-20260524T130000`, type `LIABILITY`, active `true`, posting `true`.
- Paid-through cash account: `D3AR-60524T130000-CASH`, `DEV03-AR-ACCT-CASH-20260524T130000`, type `ASSET`, active `true`, posting `true`, bank/cash profile `DEV03-AR-CASH-20260524T130000`, status `ACTIVE`.
- `INVOICE-000001` remained `VOIDED` and excluded from happy-path payment allocation.
- `INVOICE-000002` existed as the single DEV-07 payment-allocation invoice fixture candidate.

## New Invoice Fixture Evidence

Read-only invoice checks verified:

- DEV-07 invoice fixture count: `1`.
- Invoice number: `INVOICE-000002`.
- Safe invoice id prefix: `ddadfdd7`.
- Status: `FINALIZED`.
- `finalizedAt`: present.
- `journalEntryId`: present.
- `reversalJournalEntryId`: absent.
- Subtotal/revenue: `1000.0000`.
- Tax: `150.0000`.
- Total: `1150.0000`.
- Balance due: `1150.0000`.
- Line count: `1`.
- Line shape: quantity `10.0000`, unit price `100.0000`, tax amount `150.0000`, line total `1150.0000`.
- Invoice sequence next number: `3`.

## Journal And Accounting Evidence

Read-only journal checks verified:

- Journal `JOURNAL_ENTRY-000003` exists and belongs to the fixture organization.
- The journal is linked to `INVOICE-000002`.
- Reference: `INVOICE-000002`.
- Status: `POSTED`.
- Total debit: `1150.0000`.
- Total credit: `1150.0000`.
- Balanced: yes.
- `reversalOfId`: absent.
- Journal entry sequence next number: `4`.
- Journal lines:
  - Debit account `120` / `DEV03-AR-ACCT-120-20260524T130000`: `1150.0000`.
  - Credit fixture revenue account `D3AR-60524T130000-REV` / `DEV03-AR-ACCT-REV-20260524T130000`: `1000.0000`.
  - Credit account `220` / `DEV03-AR-ACCT-220-20260524T130000`: `150.0000`.

## Audit Evidence

Read-only audit checks verified:

- SalesInvoice audit log count for `INVOICE-000002`: `2`.
- SalesInvoice actions for `INVOICE-000002`:
  - `SALES_INVOICE_CREATED`.
  - `SALES_INVOICE_FINALIZED`.
- `SALES_INVOICE_VOIDED` for `INVOICE-000002`: `0`.
- Customer payment and unapplied allocation audit actions for the DEV-07 slice: `0`.
- Fixture organization auth/login audit logs: `0`.
- No browser login flow was run.
- Full audit payload bodies, session metadata, tokens, auth headers, IP headers, and user-agent bodies were not printed or recorded.

## ZATCA Metadata Evidence

Read-only ZATCA checks verified:

- Local `ZatcaInvoiceMetadata` count for `INVOICE-000002`: `1`.
- `zatcaInvoiceType`: `STANDARD_TAX_INVOICE`.
- `zatcaStatus`: `NOT_SUBMITTED`.
- `generatedAt`: absent.
- `clearedAt`: absent.
- `reportedAt`: absent.
- XML body field presence: false.
- QR body field presence: false.
- ZATCA signed artifact drafts for `INVOICE-000002`: `0`.
- ZATCA submission logs for `INVOICE-000002`: `0`.

ZATCA XML generation, signing, QR generation, submission, clearance, and reporting paths were not run.

## DEV-06 Non-Interference Evidence

Read-only DEV-06 checks verified:

- `INVOICE-000001` remains `VOIDED`.
- Safe invoice id prefix remains `6ebb2d71`.
- Total remains `287.5000`.
- Balance due remains `0.0000`.
- `journalEntryId`: present.
- `reversalJournalEntryId`: present.
- Original journal `JOURNAL_ENTRY-000001` remains `REVERSED`, reference `INVOICE-000001`.
- Reversal journal `JOURNAL_ENTRY-000002` remains `POSTED`, reference `INVOICE-000001`.

No DEV-06 invoice lifecycle state changed due to Part 4 verification.

## No Forbidden Side Effects Evidence

Read-only fixture organization counts:

- Customer payments: `0`.
- Customer payment allocations: `0`.
- Customer payment unapplied allocations: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Credit note allocations: `0`.
- Generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Cleanup deletion: not run.

## Temporary Script Cleanup Verification

- `apps/api/scripts/dev07-ar-payment-allocation-invoice-fixture.temp.ts`: absent.
- The temporary script is not staged.
- The temporary script is not tracked.
- No root package script was added for the mutation.
- Existing unrelated dirty/untracked web marketing and graphify files remained untouched and unstaged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse --short HEAD`.
- `git rev-parse --short origin/main`.
- Required documentation reads for DEV-07 Part 4.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- Local `127.0.0.1:5432` and `127.0.0.1:6379` reachability checks.
- Local `apps/api/.env` database target guard without printing the database URL.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-invoices/sales-invoice-rules.spec.ts src/customer-payments/customer-payment-rules.spec.ts src/customer-refunds/customer-refund-rules.spec.ts src/credit-notes/credit-note-rules.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev04-fixture-runner.spec.ts`.
- `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000`.
- `corepack pnpm verify:diff`.
- Docker `psql` read-only `SELECT` queries for fixture dependency, invoice, journal, audit, ZATCA metadata, DEV-06 non-interference, sequence, and forbidden side-effect evidence.
- Temporary script absence, tracked-file, staged-file, and root package script checks.

## Commands Skipped And Why

- Invoice create, edit, finalize, void, and repeated void: forbidden in Part 4.
- Customer payment creation, direct payment allocation, unapplied allocation, unapplied allocation reversal, customer payment void, customer refund, and credit-note mutation: forbidden in Part 4.
- Generated document, PDF/archive/export/download, email, and ZATCA XML/signing/QR/submission paths: forbidden output/network-sensitive paths.
- E2E, smoke, migrations, seed/reset/delete, cleanup deletion, deploys, environment changes, provider setting changes, backup/restore, production-hosting research, and login/audit-writing browser flows: outside scope and forbidden by the Part 4 prompt.
- `verify:repo`, actual `verify:ci:local`, full tests, and full build: explicitly out of scope.

## Blockers Or Deviations

No evidence blocker remained. The local target and read-only fixture checks passed.

Deviations:

- One initial read-only SQL command stopped on a quoted camelCase column typo before returning evidence. It was inside a read-only transaction and did not mutate data.
- An initial actor-membership query used an overly narrow email pattern and returned `0`; a corrected read-only query verified one active fixture actor membership.

## Conclusion

Evidence verified. `INVOICE-000002` remains the single finalized DEV-07 payment-allocation invoice fixture, with safe id prefix `ddadfdd7`, total and balance due `1150.0000`, posted journal `JOURNAL_ENTRY-000003`, expected SalesInvoice audit actions, and local-only ZATCA metadata.

No payment, allocation, refund, credit note, output, email, ZATCA signed/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing mutation was performed.

## Part 5 Customer Payment Creation Plan Note

DEV-07 Part 5 created [DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_PLAN.md](DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_PLAN.md) as planning/read-only work.

- Mutation performed: no.
- Local target safety and read-only fixture evidence remained valid.
- Planned Part 6 payment amount: `500.0000`.
- Planned direct allocation during payment creation: `300.0000` to `INVOICE-000002`.
- Expected unapplied amount after payment creation: `200.0000`.
- Expected invoice balance after payment creation: `850.0000`.
- Expected payment journal: Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`.
- Expected audit/output/ZATCA boundary: `CUSTOMER_PAYMENT_CREATED` only; no `APPLY_UNAPPLIED`, receipt PDF/archive, generated document, email, ZATCA XML/signing/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 6: approved local AR customer payment creation mutation
```

## Part 6 Customer Payment Creation Mutation Note

DEV-07 Part 6 completed the approved local-only customer payment creation mutation against `INVOICE-000002`.

- Evidence doc: [DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md](DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md).
- Mutation performed: yes, one `CustomerPaymentService.create(...)` call.
- Payment created: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `POSTED`.
- Direct allocation: `300.0000` to `INVOICE-000002`.
- Unapplied amount retained: `200.0000`.
- Invoice evidence after mutation: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`.
- Payment journal evidence: `JOURNAL_ENTRY-000004`, `POSTED`, reference `PAYMENT-000001`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`.
- Audit/ZATCA/output boundary: `CUSTOMER_PAYMENT_CREATED` exists exactly once; local invoice ZATCA metadata remains `NOT_SUBMITTED`; no receipt PDF/archive, generated document, email, ZATCA signed/submission artifact, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow occurred.
- Temporary Part 6 script was removed and is not staged or tracked.

Next prompt title:

```text
DEV-07 Part 7: verify AR customer payment creation evidence
```

## Part 7 Customer Payment Creation Evidence Verification Note

DEV-07 Part 7 verified the customer payment creation evidence read-only in [DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md](DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md).

- Mutation performed: no.
- `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`, and no reversal journal.
- `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`.
- Direct allocation remains one `CustomerPaymentAllocation` to `INVOICE-000002` for `300.0000`; no `CustomerPaymentUnappliedAllocation` exists yet.
- Payment journal remains `JOURNAL_ENTRY-000004`, `POSTED`, reference `PAYMENT-000001`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`.
- Audit/ZATCA/output boundary remains valid: `CUSTOMER_PAYMENT_CREATED` exists exactly once; local invoice ZATCA metadata remains `NOT_SUBMITTED`; no receipt PDF/archive, generated document, email, ZATCA signed/submission artifact, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow occurred.
- Temporary Part 6 script remains absent, unstaged, and untracked.

Next prompt title:

```text
DEV-07 Part 8: unapplied payment allocation mutation plan
```
