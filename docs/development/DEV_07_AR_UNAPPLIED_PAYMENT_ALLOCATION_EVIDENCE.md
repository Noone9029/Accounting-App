# DEV-07 AR Unapplied Payment Allocation Evidence

## Purpose And Scope

DEV-07 Part 9 records the local-only evidence for applying the remaining unapplied amount from `PAYMENT-000001` to `INVOICE-000002` under marker `DEV03-AR-20260524T130000`, family `ar`.

Approval phrase received:

```text
I approve DEV-07 Part 9 local-only AR unapplied customer payment allocation mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001 and invoice INVOICE-000002. No production, no beta, no customer data.
```

This evidence stays limited to the local disposable database. No production, beta/user-testing, hosted, shared, or customer data target was used.

## Local-Only Target Proof

- Latest commit inspected before this evidence update: `1dc3a35d Constrain bank account currency selection`.
- Docker Desktop Linux engine was available: server `linux 28.5.1`.
- The repo-local `postgres` and `redis` compose services were started because no local containers were running.
- Local containers after startup:
  - `infra-postgres-1`, image `postgres:16-alpine`, healthy, mapped to `0.0.0.0:5432`.
  - `infra-redis-1`, image `redis:7-alpine`, healthy, mapped to `0.0.0.0:6379`.
- `127.0.0.1:5432` and `127.0.0.1:6379` were reachable.
- The API database target guard parsed the configured database host as `localhost`, port `5432`.
- The target guard found no forbidden hosted, production, beta, user-testing, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, or Neon target pattern.
- Existing unrelated dirty/untracked web marketing and graphify files remained untouched and unstaged.

## Preflight Evidence

Read-only preflight found the local database already in the Part 9 post-allocation state. Because a second `CustomerPaymentService.applyUnapplied(...)` call would violate the exactly-once requirement, no additional apply call was run in this continuation.

Verified preflight and post-state:

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture organization count: `1`.
- Active fixture actor membership count: `1`.
- Fixture customer count: `1`, type `CUSTOMER`, active `true`.
- `PAYMENT-000001` count: `1`.
- Payment safe id prefix: `b39f4d38`.
- Payment status: `POSTED`.
- Payment amount received: `500.0000`.
- Payment unapplied amount: `0.0000`.
- Payment journal entry present: `true`.
- Payment void reversal journal present: `false`.
- `INVOICE-000002` count: `1`.
- Invoice safe id prefix: `ddadfdd7`.
- Invoice status: `FINALIZED`.
- Invoice total: `1150.0000`.
- Invoice balance due: `650.0000`.
- Invoice reversal journal present: `false`.
- Payment and invoice same customer: `true`.
- `INVOICE-000001` remains `VOIDED`, safe id prefix `6ebb2d71`.

## Mutation Performed

The local database already showed the approved mutation result before any write-capable service was invoked in this continuation:

- Current `CustomerPaymentUnappliedAllocation` count for `PAYMENT-000001`: `1`.
- Current active unapplied allocation amount: `200.0000`.
- Allocation safe id prefix: `8bc99925`.
- Allocation reversed: `false`.
- Reversal reason present: `false`.
- Allocation created at: `2026-05-25 12:58:39.408` database time.

No second mutation was performed in this continuation. No temporary mutation script was created, imported, or run after preflight showed the one approved result already existed.

## Payment Before And After

Expected before state from DEV-07 Part 8 and prior evidence:

- `PAYMENT-000001` status: `POSTED`.
- Amount received: `500.0000`.
- Unapplied amount: `200.0000`.
- Journal entry: `JOURNAL_ENTRY-000004`.
- Void reversal journal: absent.

Verified current after state:

- `PAYMENT-000001` status: `POSTED`.
- Amount received: `500.0000`.
- Unapplied amount: `0.0000`.
- Journal entry present: `true`.
- Void reversal journal present: `false`.
- `PAYMENT` sequence next number: `2`.

## Invoice Before And After

Expected before state from DEV-07 Part 8 and prior evidence:

- `INVOICE-000002` status: `FINALIZED`.
- Total: `1150.0000`.
- Balance due: `850.0000`.
- Reversal journal: absent.

Verified current after state:

- `INVOICE-000002` status: `FINALIZED`.
- Total: `1150.0000`.
- Balance due: `650.0000`.
- Reversal journal present: `false`.

## Allocation Before And After

Expected before state from DEV-07 Part 8 and prior evidence:

- Direct `CustomerPaymentAllocation`: exactly one record linking `PAYMENT-000001` to `INVOICE-000002` for `300.0000`.
- `CustomerPaymentUnappliedAllocation`: `0`.

Verified current after state:

- Direct `CustomerPaymentAllocation` count remains `1`.
- Direct allocation amount sum remains `300.0000`.
- `CustomerPaymentUnappliedAllocation` count is `1`.
- Unapplied allocation amount sum is `200.0000`.
- Unapplied allocation is active and unreversed.

## Journal And Accounting Non-Effect

Applying unapplied payment amount remains matching-only in the current service code.

Verified current accounting evidence:

- Fixture organization journal count: `4`.
- `JOURNAL_ENTRY-000004` count: `1`.
- `JOURNAL_ENTRY-000004` status: `POSTED`.
- `JOURNAL_ENTRY-000004` reference: `PAYMENT-000001`.
- `JOURNAL_ENTRY-000004` total debit: `500.0000`.
- `JOURNAL_ENTRY-000004` total credit: `500.0000`.
- Journal line summary: `D3AR-60524T130000-CASH` debit `500.0000`, account `120` credit `500.0000`.
- `JOURNAL_ENTRY` sequence next number: `5`.

No new journal entry was created by the unapplied allocation result.

## Audit Effect

Current code standardizes customer payment unapplied allocation audit actions through `apps/api/src/audit-log/audit-events.ts` and `AuditLogService.log(...)`.

Verified current audit evidence for `PAYMENT-000001`:

- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- Raw `APPLY_UNAPPLIED`: `0`.
- Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `0`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.
- Customer payment audit action order: `CUSTOMER_PAYMENT_CREATED,CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`.
- Standardized apply audit created at: `2026-05-25 12:58:39.429` database time.

Deviation from the older Part 8 plan: the plan expected a raw `APPLY_UNAPPLIED` action, but the current repository state intentionally standardizes the action to `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`. No raw audit row was manually inserted.

## Output, Email, ZATCA, Refund, Credit Note, And Cleanup Non-Effects

Verified current side-effect counts:

- Generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA metadata for `INVOICE-000002`: `1`, status `NOT_SUBMITTED`.
- ZATCA XML body present: `false`.
- ZATCA QR body present: `false`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Credit note allocations: `0`.
- Cleanup deletion: not run.

No receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, refund, credit note, invoice void, payment void, reverse allocation, or cleanup deletion was run in this continuation.

## Temporary Script Cleanup Proof

- `apps/api/scripts/dev07-ar-unapplied-payment-apply.temp.ts`: absent.
- No tracked `apps/api/scripts/*temp*` file exists.
- The temporary script path is not staged.
- No root package script was added.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- Required DEV-07 documentation and code inspection with `Get-Content` and `rg`.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`.
- `Test-NetConnection` checks for `127.0.0.1:5432` and `127.0.0.1:6379`.
- `docker compose -f infra/docker-compose.yml up -d postgres redis`.
- Local `apps/api/.env` database target guard without printing the database URL.
- Docker `psql` read-only queries for fixture, invoice, payment, allocation, journal, audit, ZATCA metadata, sequence, and forbidden side-effect evidence.
- Temporary script absence, tracked-file, and staged-file checks.

## Commands Skipped And Why

- `CustomerPaymentService.applyUnapplied(...)`: skipped in this continuation because read-only preflight found the approved allocation already existed; a second call would violate the exactly-once mutation boundary.
- Customer payment creation, direct payment allocation creation, reverse unapplied allocation, customer payment void, refund, credit note, invoice create/edit/finalize/void, receipt/PDF/archive/generated-document/email/ZATCA paths, cleanup deletion, migration, seed/reset/delete, deploy, environment changes, provider changes, backup/restore, production-hosting research, full tests, full build, smoke, E2E, and login/browser audit-writing flows: forbidden or out of scope.
- Targeted customer-payment tests: skipped because no production code or test code was changed in this evidence-only continuation.

## Remaining Blockers Or Deviations

- No state blocker remains for the local Part 9 allocation result: payment, invoice, allocation, journal, output, email, ZATCA, refund, credit-note, and cleanup evidence match the intended accounting outcome.
- Audit wording differs from the older DEV-07 plan because the current repository standardizes the action to `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`; raw `APPLY_UNAPPLIED` remains `0`.
- The next code-focused/local-evidence step should treat the standardized audit action as the current source of truth unless a new ticket intentionally changes audit behavior.

## Conclusion

DEV-07 Part 9 local evidence is complete. `PAYMENT-000001` remains `POSTED`, amount received remains `500.0000`, and unapplied amount is `0.0000`. `INVOICE-000002` remains `FINALIZED`, total remains `1150.0000`, and balance due is `650.0000`. The direct allocation remains one record for `300.0000`, one active `CustomerPaymentUnappliedAllocation` exists for `200.0000`, no new journal exists, and forbidden output/email/ZATCA/refund/credit-note/cleanup paths remain untouched.

## Recommended Next Step

Next prompt title:

```text
DEV-07 Part 10: AR unapplied allocation reversal preflight
```

## Part 10 Reversal Preflight Note

DEV-07 Part 10 completed the read-only AR unapplied allocation reversal preflight in [DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md](DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md).

- Mutation performed: no.
- Current payment state remains `PAYMENT-000001` `POSTED`, amount received `500.0000`, unapplied amount `0.0000`, journal `JOURNAL_ENTRY-000004`, and no void reversal journal.
- Current invoice state remains `INVOICE-000002` `FINALIZED`, total `1150.0000`, balance due `650.0000`, and no reversal journal.
- Current allocation state remains one direct allocation for `300.0000` and one active unapplied allocation for `200.0000`.
- Future approved reversal is expected to restore payment unapplied amount to `200.0000`, restore invoice balance due to `850.0000`, mark the active unapplied allocation reversed with reason, and create no journal entry.
- Current audit behavior expects one future `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` audit action on entity type `CustomerPaymentUnappliedAllocation`.

Next prompt title:

```text
DEV-07 Part 11: approved local AR unapplied allocation reversal mutation
```
