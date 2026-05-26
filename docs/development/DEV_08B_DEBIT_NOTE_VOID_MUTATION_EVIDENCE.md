# DEV-08B Debit Note Void Mutation Evidence

## Purpose And Scope

This document records DEV-08B Part 15 approved local-only purchase debit note void/reversal evidence.

- Marker: `DEV08B-AP-20260526T060000`.
- Target purchase debit note: `PDN-000003`, total `460.0000`.
- Approved mutation performed: yes, exactly one purchase debit note void/reversal.
- Mutation service path: `PurchaseDebitNoteService.void(...)`.
- Call count: `1`.

## Approval Phrase Received

The exact approval phrase was present in the user-provided prompt:

`I approve DEV-08B Part 15 local-only purchase debit note void mutation under marker DEV08B-AP-20260526T060000 for purchase debit note PDN-000003 total 460.0000. No production, no beta, no customer data.`

## Local-Only Target Proof

- Docker Linux engine was available.
- Local containers were healthy before mutation:
  - `infra-postgres-1` on local port `5432`.
  - `infra-redis-1` on local port `6379`.
- The guarded temporary script accepted only protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Hosted, production, staging, beta/user-testing, shared, and customer-like target patterns were rejected before importing write-capable service code.
- No database URL, secret, token, cookie, auth header, request/response body, vendor/customer data, signed XML, QR payload, document body, attachment body, or email body was printed.

## Before State

| Area | Before state |
| --- | --- |
| Purchase debit note | `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, total `460.0000`, unapplied `460.0000` |
| Debit note journal | `JE-000054`, `POSTED`, no debit-note reversal journal |
| Supplier refund | `SRF-000003`, safe id prefix `39873ae4`, `VOIDED`, void reversal journal `JE-000056` |
| Posted refund blocker count | `0` |
| Purchase bill | `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, balance due `1150.0000`, reversal journal absent |
| Historical allocation | safe id prefix `7ec0dfb3`, amount `250.0000`, already reversed |
| Active debit-note allocation count | `0` |
| Journal count | `56` |

## Mutation Performed

The guarded temporary local script called:

`PurchaseDebitNoteService.void(organizationId, actorUserId, debitNoteId)`

The call was made exactly once for `PDN-000003`.

No debit note create/finalize/apply/reverse-allocation, supplier refund create/void, purchase bill mutation, supplier payment, purchase order, purchase receipt, stock movement, cash expense, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema change, or login/browser flow was called.

## After Debit Note State

| Field | Result |
| --- | --- |
| Debit note number | `PDN-000003` |
| Safe id prefix | `b93f96ee` |
| Status | `FINALIZED -> VOIDED` |
| Total | `460.0000` |
| Unapplied amount | `460.0000 -> 460.0000` |
| Original journal | `JE-000054` |
| Original journal status after void | `REVERSED` |
| Reversal journal | `JE-000057` |
| Reversal journal safe id prefix | `f1ab6c83` |
| Reversal journal status | `POSTED` |

## Refund, Allocation, And Bill State

| Area | Result |
| --- | --- |
| Supplier refund | `SRF-000003`, safe id prefix `39873ae4`, remained `VOIDED` |
| Supplier refund void reversal journal | `JE-000056` remained present |
| Supplier refund original journal | remained `REVERSED` |
| Posted refund blocker count | `0 -> 0` |
| Historical allocation | `7ec0dfb3`, amount `250.0000`, remained reversed |
| Allocation reversal fields | `reversedAt` set, `reversedById` set, reason `DEV-08B local-only debit note allocation reversal QA` |
| Active debit-note allocation count | `0 -> 0` |
| Purchase bill | `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED` |
| Purchase bill balance due | `1150.0000 -> 1150.0000` |
| Purchase bill reversal journal | absent |

## Journal And Accounting Result

- Organization journal count changed `56 -> 57`.
- Original debit note journal `JE-000054` was marked `REVERSED`.
- New debit note void reversal journal `JE-000057`, safe id prefix `f1ab6c83`, was `POSTED`.
- Reversal journal lines:

| Account | Debit | Credit |
| --- | ---: | ---: |
| `230` VAT Receivable | `60.0000` | `0.0000` |
| `111` Cash | `400.0000` | `0.0000` |
| `210` Accounts Payable | `0.0000` | `460.0000` |

Expected accounting non-effects were also confirmed:

- Purchase bill journal `JE-000053` remained unaffected.
- Supplier refund original journal `JE-000055` remained `REVERSED`.
- Supplier refund void reversal journal `JE-000056` remained posted.
- No purchase bill reversal journal was created.
- No supplier payment journal was created.

## Audit Result

Expected fixture audit actions now include:

- `PurchaseBill:PURCHASE_BILL_CREATED`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`.
- `PurchaseDebitNote:APPLY`.
- `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`.
- `SupplierRefund:SUPPLIER_REFUND_CREATED`.
- `SupplierRefund:SUPPLIER_REFUND_VOIDED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED`.

No duplicate debit-note apply/reverse-allocation audit, supplier refund creation/void audit, bill void audit, supplier payment audit, cleanup/delete audit, or login/browser audit-writing flow was created by this mutation.

## Forbidden Side-Effect Verification

Fixture-specific counts remained unchanged:

| Area | Before | After |
| --- | ---: | ---: |
| Supplier payments | `0` | `0` |
| Supplier payment allocations | `0` | `0` |
| Supplier payment unapplied allocations | `0` | `0` |
| Purchase orders | `0` | `0` |
| Purchase receipts | `0` | `0` |
| Stock movements | `0` | `0` |
| Cash expenses | `0` | `0` |
| Generated documents for bill/debit note/refund | `0` | `0` |
| Marker email outbox rows | `0` | `0` |
| Marker email provider events | `0` | `0` |
| Marker auth tokens | `0` | `0` |
| Fixture cleanup/delete audits | `0` | `0` |
| ZATCA metadata for bill/debit note | `0` | `0` |

Confirmed no output/PDF/archive/export/download, generated document, email send, supplier payment, purchase order, purchase receipt, stock movement, cash expense, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08b-debit-note-void.tmp.ts`.
- The script was removed with `apply_patch` after the mutation.
- `Test-Path apps/api/scripts/dev08b-debit-note-void.tmp.ts` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08b*'` returned no files.
- The temporary script was not staged.

## Deviations Or Blockers

- No mutation blocker was found.
- No retry mutation was run.
- Current `PurchaseDebitNoteService.void(...)` does not accept a reason argument, so no reason field was written. The mutation used the existing service path without inventing an unsupported field.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git ls-remote origin HEAD`.
- `git rev-parse HEAD`.
- `docker info --format '{{.ServerVersion}}'`.
- `docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'`.
- Targeted `Get-Content` reads for the temporary runner, `CODEX_HANDOFF.md`, Part 14 preflight, and related evidence.
- `corepack pnpm exec tsx scripts/dev08b-debit-note-void.tmp.ts --marker=DEV08B-AP-20260526T060000 --approval=...`.
- `Test-Path apps/api/scripts/dev08b-debit-note-void.tmp.ts`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08b*'`.

## Commands Skipped And Why

- Debit note create/finalize/apply/reverse-allocation: explicitly forbidden.
- Supplier refund create/void: explicitly forbidden for Part 15.
- Purchase bill mutation: explicitly forbidden.
- Supplier payment and other AP mutations: explicitly forbidden.
- Full tests, full build, E2E, and smoke: explicitly out of scope.
- Migrations and seed/reset/delete: explicitly forbidden.
- Deploys and environment changes: explicitly forbidden.
- Login/browser flows: explicitly forbidden.
- PDF/archive/export/download: explicitly forbidden.
- ZATCA: explicitly forbidden.
- Email: explicitly forbidden.
- Backup/restore and production-hosting research: explicitly forbidden.
- Targeted debit-note tests: skipped because no production code was changed; the temporary script was removed and only documentation remained.

## Next Recommended Thread

`DEV-08B Part 16: AP debit note refund closure`
