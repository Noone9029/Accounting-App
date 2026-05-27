# DEV-08E Cash Expense Void Mutation Evidence

## Purpose And Scope

This document records DEV-08E Part 5: the approved local-only cash expense void/reversal mutation.

- Latest commit inspected before mutation: `9c99e0fc Plan DEV-08E cash expense void`.
- Local `HEAD` matched `origin/main`: `9c99e0fc0d91e436a8d63005414c26fb1e4e53c7`.
- Branch inspected: `main`.
- Mutation performed: yes, local-only.
- Mutation scope: void the existing DEV-08E cash expense fixture exactly once.
- No cash expense create, delete/remove, PDF-data, PDF, generate-PDF, archive, export, download, generated document, email, ZATCA, supplier payment/refund, purchase bill, debit note, purchase order, purchase receipt, stock movement, inventory, cleanup/delete, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, hosted-database, or customer-data action was performed.

## Approval Phrase Received

Exact phrase received and checked by the guarded runner:

`I approve DEV-08E Part 5 local-only cash expense void mutation under marker DEV08E-AP-20260526T000000 for cash expense EXP-000002 total 1150.0000. No production, no beta, no customer data.`

Approval status: exact.

## Local-Only Target Proof

- `apps/api/.env` was classified before the mutation runner imported write-capable services.
- The temporary runner refused to proceed unless `DATABASE_URL` was local-like.
- The runner classified the database host as `localhost` and database name as `accounting`.
- Hosted/provider hints such as Supabase, pooler, AWS, Neon, Render, Railway, Fly, and Vercel were rejected by the guard.
- Read-only pre/post SQL used local Docker Postgres container `infra-postgres-1`.
- No DB URL, token, secret, cookie, auth header, request/response body, customer/vendor data, document body, attachment body, signed XML, QR payload, or email body was printed.

## Pre-Mutation State

Pre-mutation checks confirmed:

- Target marker: `DEV08E-AP-20260526T000000`.
- Marker cash expense count: `1`.
- Cash expense number: `EXP-000002`.
- Cash expense safe id prefix: `74886497`.
- Status: `POSTED`.
- Subtotal: `1000.0000`.
- Discount total: `0.0000`.
- Taxable total: `1000.0000`.
- Tax total: `150.0000`.
- Total: `1150.0000`.
- Paid-through account safe prefix: `32ab6f4d` (`112` from earlier evidence).
- Actor user safe prefix: `09f892d4`.
- Original journal: `JE-000062`, safe prefix `a2aa8290`, status `POSTED`.
- Original journal total debit/credit: `1150.0000` / `1150.0000`.
- Void reversal journal: absent.
- `voidedAt`: absent.
- Organization journal count: `62`.
- Marker journal count: `1`.
- `JOURNAL_ENTRY` sequence before mutation: prefix `JE-`, next number `63`, padding `6`.
- Cash expense create audit count: `1`.
- Cash expense void audit count: `0`.
- Cash expense delete audit count: `0`.

Original journal lines before mutation:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `511` | `1000.0000` | `0.0000` |
| 2 | `230` | `150.0000` | `0.0000` |
| 3 | `112` | `0.0000` | `1150.0000` |

## Mutation Performed

Temporary script:

- Path: `apps/api/scripts/dev08e-cash-expense-void.tmp.ts`.
- Execution directory: `apps/api`.
- Command shape: `corepack pnpm exec tsx scripts/dev08e-cash-expense-void.tmp.ts --approval=...`.
- The script checked the exact approval phrase before mutation.
- The script refused non-local DB targets before importing write-capable services.
- The script verified the target cash expense still existed, belonged to the marker, was `POSTED`, had total `1150.0000`, had an original journal, and had no void reversal journal.
- Service path called: `CashExpenseService.void(...)`.
- Service call count: `1`.
- `CashExpenseService.create(...)`: not called.
- `CashExpenseService.remove(...)`: not called.
- PDF/generate-PDF/export/archive/download/email/ZATCA paths: not called.
- Cleanup/delete path: not called.

## Cash Expense Before And After

Cash expense result:

- Cash expense number: `EXP-000002`.
- Safe id prefix: `74886497`.
- Status changed: `POSTED -> VOIDED`.
- `voidedAt`: present.
- Subtotal unchanged: `1000.0000`.
- Discount total unchanged: `0.0000`.
- Taxable total unchanged: `1000.0000`.
- Tax total unchanged: `150.0000`.
- Total unchanged: `1150.0000`.
- Original journal changed: `JE-000062` `POSTED -> REVERSED`.
- Void reversal journal created: `JE-000063`, safe prefix `391169e6`, status `POSTED`.

## Journal And Accounting Result

Journal result:

- Organization journal count changed `62 -> 63`.
- Marker journal count changed `1 -> 2`.
- `JOURNAL_ENTRY` sequence changed next number `63 -> 64`.
- Original journal `JE-000062`, safe prefix `a2aa8290`, is now `REVERSED`.
- Reversal journal `JE-000063`, safe prefix `391169e6`, is `POSTED`.
- Reversal journal reverses original journal safe prefix `a2aa8290`.
- Reversal journal is balanced at debit/credit `1150.0000`.

Original journal lines after mutation:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `511` | `1000.0000` | `0.0000` |
| 2 | `230` | `150.0000` | `0.0000` |
| 3 | `112` | `0.0000` | `1150.0000` |

Reversal journal lines:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `511` | `0.0000` | `1000.0000` |
| 2 | `230` | `0.0000` | `150.0000` |
| 3 | `112` | `1150.0000` | `0.0000` |

Result:

- The reversal debits the paid-through asset account `112`.
- The reversal credits expense account `511`.
- The reversal credits VAT receivable account `230`.
- No AP liability, supplier balance, purchase bill, or debit note was created.

## Audit Result

Fixture-scoped audit counts after mutation:

- `CashExpense:CASH_EXPENSE_CREATED`: `1`.
- `CashExpense:CASH_EXPENSE_VOIDED`: `1`.
- Cash expense delete audit: `0`.
- Cleanup/delete audit: `0`.
- Login/browser audit-writing flow: not run.

## Forbidden Side-Effect Verification

Fixture/marker-scoped read-only verification after mutation:

| Check | Count |
| --- | ---: |
| Generated documents for cash expense | 0 |
| Email outbox rows for marker | 0 |
| Email provider events for marker | 0 |
| ZATCA metadata for fixture | 0 |
| ZATCA submission logs for fixture | 0 |
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

- `apps/api/scripts/dev08e-cash-expense-void.tmp.ts` was removed after the one mutation run.
- `Test-Path -LiteralPath "apps/api/scripts/dev08e-cash-expense-void.tmp.ts"` returned `False`.
- `rg --files apps/api/scripts | rg "dev08e|cash-expense|tmp"` returned no results.
- `git status --short -- apps/api/scripts/dev08e-cash-expense-void.tmp.ts` returned no entry.
- The temporary script was not staged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git branch --show-current`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `rg --files apps/api/scripts | rg "dev08e|cash-expense|tmp"`.
- `Get-Content` reads of `CODEX_HANDOFF.md`, `DEV_08E_CASH_EXPENSE_VOID_PREFLIGHT.md`, `DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md`, `DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md`, `DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, `README.md`, Prisma schema, and cash expense dependency services.
- Redacted local DB target classification from `apps/api/.env`.
- Read-only local SQL preflight through `docker exec -i infra-postgres-1 psql -U accounting -d accounting -v ON_ERROR_STOP=1 -X -A -F "|"`.
- `corepack pnpm exec tsx scripts/dev08e-cash-expense-void.tmp.ts --approval=...` from `apps/api`.
- `Remove-Item -LiteralPath "apps/api/scripts/dev08e-cash-expense-void.tmp.ts"`.
- `Test-Path -LiteralPath "apps/api/scripts/dev08e-cash-expense-void.tmp.ts"`.
- Read-only post-mutation SQL verification through local Docker Postgres.

## Commands Skipped

- Cash expense create and delete/remove: forbidden for this prompt.
- PDF-data, PDF, generate-PDF, archive, export, download, and generated-document creation: forbidden for this prompt.
- Supplier refund/payment mutation, purchase bill/debit-note/order/receipt mutation, and inventory/stock mutation: forbidden for this prompt.
- Cleanup/delete: forbidden for this prompt.
- Login/browser flows: forbidden because they can write audit logs.
- Migrations, seed/reset/delete, deploy, env/provider/schema change, ZATCA, email, backup/restore, production-hosting research, production, beta, hosted, shared, and customer-data targets: explicitly forbidden.
- API/web startup: not required for the service-layer local mutation.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.

## Deviations Or Blockers

- No blocker remains for DEV-08E Part 6.
- The first pre-mutation side-effect SQL count used `check` as an alias, which PostgreSQL rejected. It ran before the mutation, wrote nothing, and was rerun with the non-reserved alias `check_name`.
- The mutation runner printed only sanitized prefixes, statuses, counts, and amounts.

## Next Recommended Thread

`DEV-08E Part 6: cash expense void evidence verification`

## Part 6 Verification Note

DEV-08E Part 6 independently verified this mutation evidence in [DEV_08E_CASH_EXPENSE_VOID_EVIDENCE_VERIFICATION.md](DEV_08E_CASH_EXPENSE_VOID_EVIDENCE_VERIFICATION.md).

- Verification conclusion: `Verified`.
- Runtime mutation performed in Part 6: no.
- Cash expense `EXP-000002`, safe prefix `74886497`, remained `VOIDED` with `voidedAt` present and total `1150.0000`.
- Original journal `JE-000062`, safe prefix `a2aa8290`, remained `REVERSED`.
- Void reversal journal `JE-000063`, safe prefix `391169e6`, remained `POSTED` and balanced at debit/credit `1150.0000`.
- Reversal lines exactly reversed the original journal lines.
- Cash expense create audit remained `1`; void audit remained `1`; delete audit remained `0`.
- Forbidden side effects and DEV-08E temporary scripts remained absent.
- Exact next prompt title: `DEV-08E Part 7: cash expense lifecycle closure`.
