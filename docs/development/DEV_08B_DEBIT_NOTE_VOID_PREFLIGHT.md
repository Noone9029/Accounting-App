# DEV-08B Debit Note Void Preflight

## Purpose And Scope

This document records DEV-08B Part 14 read-only preflight for a future local-only purchase debit note void/reversal.

- Marker: `DEV08B-AP-20260526T060000`.
- Target debit note for a future approved mutation: `PDN-000003`, total `460.0000`.
- Mutation performed in this task: no.
- Debit note void, supplier refund creation/void, debit-note apply/reverse, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, backup/restore, and production-hosting research were not run.

## Latest Commit Inspected

- `c6fe3f94 Void DEV-08B supplier refund locally`.
- Local `HEAD` was at the Part 13 commit before this preflight.
- `git status --short` showed only unrelated untracked web/marketing and graphify output paths. They were not touched or staged.

## Local-Only Target Proof

- The read-only verifier accepted only protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- The verifier rejected hosted, production, staging, beta/user-testing, shared, or customer-like target patterns before importing Prisma.
- The local Docker/Postgres/Redis readiness from Parts 12-13 remained the only runtime target used.
- No database URL, secret, token, cookie, auth header, request/response body, vendor/customer data, signed XML, QR payload, document body, attachment body, or email body was printed.

## Current Debit Note, Refund, Bill, Allocation, And Journal State

Read-only local Prisma evidence verified:

| Area | Current state |
| --- | --- |
| Supplier | `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER` |
| Purchase debit note | `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, total `460.0000`, unapplied `460.0000` |
| Debit note journal | `JE-000054`, `POSTED`, no `reversedBy`, no debit-note reversal journal |
| Debit note journal lines | debit `210 Accounts Payable` `460.0000`; credit `111 Cash` `400.0000`; credit `230 VAT Receivable` `60.0000` |
| Supplier refund | `SRF-000003`, safe id prefix `39873ae4`, `VOIDED`, void reversal journal `JE-000056` |
| Posted supplier refund blocker count | `0` |
| Purchase bill | `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, balance due `1150.0000`, reversal journal absent |
| Historical allocation | safe id prefix `7ec0dfb3`, amount `250.0000`, reversed with reason `DEV-08B local-only debit note allocation reversal QA` |
| Active debit-note allocation count | `0` |
| Current journal count | `56` |

## Void/Reversal Code Path And Rules

Code inspected:

- `apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note-accounting.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts`.
- `apps/api/src/supplier-refunds/supplier-refund.service.ts`.
- `apps/api/src/audit-log/audit-events.ts`.
- `apps/api/prisma/schema.prisma`.

Void route and service path:

- `POST /purchase-debit-notes/:id/void`.
- Controller calls `PurchaseDebitNoteService.void(organizationId, actorUserId, id)`.

Observed service rules:

- Already `VOIDED` debit notes are returned idempotently.
- Draft debit notes can be voided without reversal journal.
- Finalized debit notes require an existing finalization journal.
- The service checks fiscal-period posting rules for the reversal date.
- The service blocks voiding when active `PurchaseDebitNoteAllocation` rows exist.
- The service blocks voiding when posted `SupplierRefund` rows exist for the debit note.
- The service updates the debit note status from `FINALIZED -> VOIDED`.
- The service creates or reuses a reversal journal for the original debit note journal and marks the original journal `REVERSED`.
- The service logs `PurchaseDebitNote:VOID`; `audit-events.ts` standardizes that to `PURCHASE_DEBIT_NOTE_VOIDED`.

Existing tests covering the path:

- `purchase-debit-note-rules.spec.ts` covers the active-allocation void blocker.
- `purchase-debit-note-rules.spec.ts` covers reversal-journal creation behavior through the void transaction mock.

## Expected State After Approved Void

If Part 15 is approved and current preconditions remain true:

| Entity | Expected effect |
| --- | --- |
| Purchase debit note `PDN-000003` | status changes `FINALIZED -> VOIDED`; `reversalJournalEntryId` set |
| Debit note total/unapplied | total remains `460.0000`; unapplied remains `460.0000` unless current service changes only status/journal |
| Supplier refund `SRF-000003` | remains `VOIDED`; void reversal journal `JE-000056` remains present |
| Historical allocation `7ec0dfb3` | remains reversed; active allocation count remains `0` |
| Purchase bill `BILL-000008` | remains `FINALIZED`; balance due remains `1150.0000`; reversal journal remains absent |
| Supplier payment | no supplier payment or supplier payment allocation is created |

## Expected Journal And Accounting Result

Expected debit note void accounting:

- A new posted reversal journal should be created for original debit note journal `JE-000054`.
- If the current journal sequence remains unchanged, journal count should change `56 -> 57`.
- Original debit note journal `JE-000054` should be marked `REVERSED`.
- Reversal lines should invert the original debit note journal:

| Direction | Account | Amount |
| --- | --- | ---: |
| Debit | `111` Cash | `400.0000` |
| Debit | `230` VAT Receivable | `60.0000` |
| Credit | `210` Accounts Payable | `460.0000` |

Expected non-effects:

- Purchase bill journal `JE-000053` remains posted and unchanged.
- Supplier refund original journal `JE-000055` remains `REVERSED`.
- Supplier refund void reversal journal `JE-000056` remains posted and unchanged.
- No purchase bill reversal journal.
- No supplier payment journal.

## Expected Audit Result

Expected audit:

- One standardized `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED` audit action for `PDN-000003`.

Expected audit non-effects:

- No additional supplier refund creation or supplier refund void audit.
- No debit-note apply or allocation reverse audit created again.
- No bill void audit.
- No supplier payment audit.
- No cleanup/delete audit.
- No login/browser audit-writing flow.

## Expected Forbidden Side-Effect Result

Current read-only baseline:

| Area | Count |
| --- | ---: |
| Supplier payments | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Generated documents for bill/debit note/refund | `0` |
| ZATCA metadata for bill/debit note | `0` |

Expected after approved Part 15:

- No supplier payment.
- No purchase order.
- No purchase receipt.
- No stock movement.
- No cash expense.
- No generated document.
- No PDF/archive/export/download.
- No email outbox/provider event.
- No ZATCA XML/signing/QR/submission artifact.
- No cleanup/delete.
- No migration.
- No seed/reset/delete.
- No deploy.
- No environment/provider/schema change.
- No production, beta, shared-target, or customer-data action.

## Blockers

- No blocker was found for planning the approved Part 15 purchase debit note void mutation.
- Part 15 must still re-check exact approval phrase, local-only database target, debit note state, refund void state, allocation state, journal state, and forbidden side-effect baseline immediately before mutation.

## Approval Phrase Required For Part 15

`I approve DEV-08B Part 15 local-only purchase debit note void mutation under marker DEV08B-AP-20260526T060000 for purchase debit note PDN-000003 total 460.0000. No production, no beta, no customer data.`

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- Targeted `Get-Content` and `rg` reads for requested DEV-08B evidence/preflight docs, `CODEX_HANDOFF.md`, `DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, `README.md`, purchase debit note service/controller/spec/accounting, supplier refund service, audit events, and Prisma schema.
- `corepack pnpm exec tsx scripts/dev08b-debit-note-void-preflight-readonly.tmp.ts` from `apps/api`.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-debit-note-void-preflight-readonly.tmp.ts`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'`.

## Commands Skipped And Why

- Debit note void: explicitly not approved for Part 14.
- Supplier refund creation/void and debit-note apply/reverse: explicitly forbidden.
- Purchase bill mutation: explicitly forbidden.
- Supplier payment and other AP mutations: explicitly forbidden.
- Full tests, full build, E2E, and smoke: explicitly out of scope.
- Migrations and seed/reset/delete: explicitly forbidden.
- Deploys and environment changes: explicitly forbidden.
- Login/browser flows: explicitly forbidden because they can write audit logs.
- PDF/archive/export/download and generated-document archive creation: explicitly forbidden.
- ZATCA and email: explicitly forbidden.
- Backup/restore and production-hosting research: explicitly forbidden.

## Temporary Script Cleanup Proof

- Temporary read-only script path: `apps/api/scripts/dev08b-debit-note-void-preflight-readonly.tmp.ts`.
- The script was removed with `apply_patch` after its single read-only run.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-debit-note-void-preflight-readonly.tmp.ts` returned `False`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'` returned no files.

## Exact Next Prompt Title

`DEV-08B Part 15: approved local debit note void mutation`
