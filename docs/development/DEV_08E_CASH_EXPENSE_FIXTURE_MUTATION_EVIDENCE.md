# DEV-08E Cash Expense Fixture Mutation Evidence

## Purpose And Scope

This document records DEV-08E Part 2: the approved local-only cash expense fixture creation mutation.

- Latest commit inspected before mutation: `f4c856fa Plan DEV-08E cash expense lifecycle`.
- Local `HEAD` matched `origin/main`: `f4c856faf496c37fca0e97172b46d3cb95a6f750`.
- Branch inspected: `main`.
- Mutation performed: yes, local-only.
- Mutation scope: create one posted cash expense fixture only.
- No cash expense void, delete/remove, PDF-data, PDF, generate-PDF, archive, export, download, generated document, email, ZATCA, supplier payment/refund, purchase bill, debit note, purchase order, purchase receipt, stock movement, inventory, cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, hosted-database, or customer-data action was performed.

## Approval Phrase Received

Exact phrase received and checked by the guarded runner:

`I approve DEV-08E Part 2 local-only cash expense fixture creation mutation under marker DEV08E-AP-20260526T000000. No production, no beta, no customer data.`

Approval status: exact.

## Local-Only Target Proof

- The temporary runner loaded `apps/api/.env` locally and refused to proceed unless `DATABASE_URL` was local-like.
- The runner classified the database host as `localhost` and database name as `accounting`.
- Hosted/provider hints such as Supabase, Vercel, pooler, AWS, Neon, Render, Railway, and Fly were rejected by the guard.
- Docker local Postgres and Redis were already running; no container lifecycle command was needed.
- No DB URL, token, secret, cookie, auth header, request/response body, customer/vendor data, document body, attachment body, signed XML, QR payload, or email body was printed.

## Pre-Mutation State

Pre-mutation read-only checks confirmed:

- Latest pushed commit was the Part 1 preflight commit `f4c856fa`.
- Current branch was `main`.
- Local `HEAD` matched `origin/main`.
- No DEV-08E marker cash expense existed.
- No DEV-08E marker journal existed.
- No `*dev08e*`, `*cash-expense*`, or temporary script remained under `apps/api/scripts`.
- Target organization safe prefix: `db69e5a8`.
- Fiscal period covering `2026-05-26`: open.
- Paid-through account: code `112`, safe prefix `32ab6f4d`, type `ASSET`, active, posting-enabled.
- Expense account: code `511`, safe prefix `c97f0827`, type `EXPENSE`, active, posting-enabled.
- VAT account: code `230`, safe prefix `41e36736`, active, posting-enabled.
- Purchase VAT tax rate: safe prefix `172417be`, rate `15.0000`, scope `PURCHASES`, active.
- Actor user: active local owner membership, safe prefix `09f892d4`.
- Number sequences before mutation: `CASH_EXPENSE` next `2`, `JOURNAL_ENTRY` next `62`.

## Mutation Performed

Temporary script:

- Path: `apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts`.
- Execution directory: `apps/api`.
- Command shape: `corepack pnpm exec tsx scripts/dev08e-cash-expense-fixture.tmp.ts --marker=DEV08E-AP-20260526T000000 --approval=...`.
- The script checked the exact marker and approval phrase before mutation.
- The script refused non-local DB targets before importing write-capable services.
- The script instantiated `CashExpenseService` with local Prisma, audit, number-sequence, and fiscal-period guard dependencies.
- Service path called: `CashExpenseService.create(...)`.
- Service call count: `1`.
- `CashExpenseService.void(...)`: not called.
- `CashExpenseService.remove(...)`: not called.
- PDF/generate-PDF/export/archive/email/ZATCA paths: not called.
- Cleanup/delete path: not called.

DTO shape used, with ids redacted to safe references:

- `contactId`: `null`.
- `branchId`: `null`.
- `expenseDate`: `2026-05-26T00:00:00.000Z`.
- `currency`: `SAR`.
- `paidThroughAccountId`: account `112`, safe prefix `32ab6f4d`.
- `description`: marker-bearing local fixture description.
- `notes`: marker-bearing local fixture notes.
- Line 1:
  - Description: marker-bearing general expense line.
  - Account: `511`, safe prefix `c97f0827`.
  - Quantity: `1.0000`.
  - Unit price: `1000.0000`.
  - Discount rate: `0.0000`.
  - Tax rate: safe prefix `172417be`, `15.0000`.

## Cash Expense Created

Created fixture:

- Marker: `DEV08E-AP-20260526T000000`.
- Cash expense number: `EXP-000002`.
- Safe id prefix: `74886497`.
- Status: `POSTED`.
- Subtotal: `1000.0000`.
- Discount total: `0.0000`.
- Taxable total: `1000.0000`.
- Tax total: `150.0000`.
- Total: `1150.0000`.
- Paid-through account: `112`.
- Contact: absent.
- Branch: absent.
- Posted journal: `JE-000062`, safe prefix `a2aa8290`.
- Void reversal journal: absent.

## Journal And Accounting Result

Journal:

- Journal number: `JE-000062`.
- Safe id prefix: `a2aa8290`.
- Status: `POSTED`.
- Total debit: `1150.0000`.
- Total credit: `1150.0000`.
- Balanced: yes.

Journal lines:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `511` | `1000.0000` | `0.0000` |
| 2 | `230` | `150.0000` | `0.0000` |
| 3 | `112` | `0.0000` | `1150.0000` |

Result:

- The cash expense debited the expense account and VAT receivable account.
- The cash expense credited the paid-through asset account.
- No AP liability or supplier balance was created.
- No reversal journal was created in Part 2.

## Audit Result

Fixture-scoped audit counts:

- `CashExpense:CASH_EXPENSE_CREATED`: `1`.
- Cash expense void/delete audit: `0`.
- Login/browser audit-writing flow: not run.

## Forbidden Side-Effect Verification

Fixture/marker-scoped read-only verification after mutation:

| Check | Count |
| --- | ---: |
| Generated documents for cash expense | 0 |
| Email outbox rows for marker | 0 |
| Email provider events for marker | 0 |
| ZATCA metadata for fixture | 0 |
| ZATCA signed artifact drafts for fixture | 0 |
| Supplier payments for marker | 0 |
| Supplier refunds for marker | 0 |
| Purchase bills for marker | 0 |
| Purchase debit notes for marker | 0 |
| Purchase orders for marker | 0 |
| Purchase receipts for marker | 0 |
| Stock movements for marker | 0 |
| Cleanup/delete audits for marker | 0 |

No PDF/archive/export/download route was called, so generated-document archive count remained `0`.

## Temporary Script Cleanup Proof

- `apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts` was removed after the one mutation run.
- `Test-Path -LiteralPath "apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts"` returned `False`.
- `rg --files apps/api/scripts | rg "dev08e|cash-expense|tmp"` returned no results.
- `git status --short -- apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts` returned no entry.
- The temporary script was not staged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git branch --show-current`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `rg --files apps/api/scripts | rg "dev08e|cash-expense|tmp"`.
- `Get-Content` reads of `CODEX_HANDOFF.md`, `DEV_08E_CASH_EXPENSE_LIFECYCLE_PREFLIGHT.md`, DEV-08/08B/08C/08D closure docs, `DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, and `README.md`.
- Redacted local DB target classification through the temporary guarded runner.
- Read-only local SQL preflight through `docker exec -i infra-postgres-1 psql -U accounting -d accounting -v ON_ERROR_STOP=1 -X -A -F "|"`.
- `corepack pnpm exec tsx scripts/dev08e-cash-expense-fixture.tmp.ts --marker=DEV08E-AP-20260526T000000 --approval=...` from `apps/api`.
- `Remove-Item -LiteralPath "apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts"`.
- `Test-Path -LiteralPath "apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts"`.
- Read-only post-mutation SQL verification through local Docker Postgres.

## Commands Skipped

- Cash expense void, delete/remove, PDF-data, PDF, generate-PDF, archive, export, download, generated-document creation, supplier refund/payment mutation, purchase bill/debit-note/order/receipt mutation, inventory/stock mutation, cleanup/delete, migration, seed/reset/delete, deploy, env/provider/schema change, ZATCA, email, backup/restore, production-hosting research, production, beta, hosted, shared, and customer-data targets: explicitly forbidden.
- API/web startup: not required for the service-layer local mutation.
- Browser/login flows: forbidden because they can write audit logs.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.

## Deviations Or Blockers

- No blocker remains for DEV-08E Part 3.
- The fixture intentionally used no contact and no branch because the cash expense service supports unlinked immediate paid expenses and that was the smallest safe Part 2 mutation.
- The runner JSON printed decimal values without trailing zero padding because Prisma decimal values stringify compactly; the independent read-only SQL verification confirmed the expected `1000.0000`, `150.0000`, and `1150.0000` amounts.

## Next Recommended Thread

`DEV-08E Part 3: cash expense fixture evidence verification`

## Part 3 Verification Note

DEV-08E Part 3 independently verified this mutation evidence in [DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md).

- Verification conclusion: `Verified`.
- Runtime mutation performed in Part 3: no.
- Cash expense `EXP-000002`, safe prefix `74886497`, remained `POSTED` for total `1150.0000`.
- Journal `JE-000062`, safe prefix `a2aa8290`, remained `POSTED` and balanced at debit/credit `1150.0000`.
- Cash expense create audit remained `1`; void/delete audit remained `0`.
- Forbidden side effects and DEV-08E temporary scripts remained absent.
- Exact next prompt title: `DEV-08E Part 4: cash expense void preflight`.
