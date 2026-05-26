# DEV-08B Supplier Refund Void Preflight

## Purpose And Scope

This document records DEV-08B Part 12 read-only preflight for a future local-only supplier refund void/reversal.

- Marker: `DEV08B-AP-20260526T060000`.
- Target refund for a future approved mutation: `SRF-000003`, amount `150.0000`.
- Mutation performed in this task: no.
- Supplier refund void, supplier refund creation, debit-note apply/reverse/void, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, backup/restore, and production-hosting research were not run.

## Latest Commit Inspected

- `a71815f1 Verify DEV-08B supplier refund evidence`.
- Local `HEAD` and `origin/main` matched at `a71815f1823f44d0454fdc606d44a1db30efaaf0` before this preflight.
- `git status --short` showed only unrelated untracked web/marketing and graphify output paths. They were not touched or staged.

## Local-Only Target Proof

- Docker Desktop/Linux engine was available: Docker server `28.5.1`, OSType `linux`.
- Local containers were healthy:
  - `infra-postgres-1`, healthy, mapped to `localhost:5432`.
  - `infra-redis-1`, healthy, mapped to `localhost:6379`.
- TCP checks succeeded for `localhost:5432` and `localhost:6379`.
- The read-only verifier accepted only protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- The verifier rejected hosted, production, staging, beta/user-testing, shared, or customer-like target patterns before importing Prisma.
- No database URL, secret, token, cookie, auth header, request/response body, vendor/customer data, signed XML, QR payload, document body, attachment body, or email body was printed.

## Current Refund, Debit Note, Bill, And Journal State

Read-only local Prisma evidence verified:

| Area | Current state |
| --- | --- |
| Supplier | `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER` |
| Supplier refund | `SRF-000003`, safe id prefix `39873ae4`, `POSTED`, amount `150.0000` |
| Refund source | `PURCHASE_DEBIT_NOTE`, source debit note `PDN-000003`, source supplier payment absent |
| Refund journal | `JE-000055`, `POSTED`, no `reversedBy`, no void reversal journal |
| Refund journal lines | debit `112 Bank Account` `150.0000`; credit `210 Accounts Payable` `150.0000` |
| Debit note | `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, total `460.0000`, unapplied `310.0000`, reversal journal absent |
| Purchase bill | `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, total `1150.0000`, balance due `1150.0000`, reversal journal absent |
| Historical allocation | safe id prefix `7ec0dfb3`, amount `250.0000`, reversed with reason `DEV-08B local-only debit note allocation reversal QA` |
| Active debit-note allocation count | `0` |

## Void/Reversal Code Path And Rules

Code inspected:

- `apps/api/src/supplier-refunds/supplier-refund.controller.ts`.
- `apps/api/src/supplier-refunds/supplier-refund.service.ts`.
- `apps/api/src/supplier-refunds/dto/create-supplier-refund.dto.ts`.
- `apps/api/src/supplier-refunds/supplier-refund-accounting.ts`.
- `apps/api/src/supplier-refunds/supplier-refund-rules.spec.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`.
- `apps/api/src/audit-log/audit-events.ts`.
- `apps/api/prisma/schema.prisma`.

Void route and service path:

- `POST /supplier-refunds/:id/void`.
- Controller calls `SupplierRefundService.void(organizationId, actorUserId, id)`.

Observed service rules:

- Already `VOIDED` refunds are returned idempotently.
- Only `POSTED` supplier refunds with an original journal can be voided.
- The service checks fiscal-period posting rules for the reversal date.
- The service updates the refund status from `POSTED -> VOIDED` and sets `voidedAt`.
- The service creates a reversal journal unless the original journal already has a `reversedBy` journal.
- The service updates the original supplier refund journal status to `REVERSED`.
- For debit-note-sourced refunds, the service restores `PurchaseDebitNote.unappliedAmount` by the refund amount.
- The debit-note restore guard rejects if the resulting unapplied amount would exceed the debit note total.
- The service logs `SupplierRefund:VOID`; `audit-events.ts` standardizes that to `SUPPLIER_REFUND_VOIDED`.

Existing tests covering the path:

- `supplier-refund-rules.spec.ts` covers supplier refund void and one-time reversal behavior.
- `supplier-refund-rules.spec.ts` covers purchase debit note refund void restoring debit note unapplied amount.

## Expected State After Approved Void

If Part 13 is approved and current preconditions remain true:

| Entity | Expected effect |
| --- | --- |
| Supplier refund `SRF-000003` | status changes `POSTED -> VOIDED`; `voidedAt` set; `voidReversalJournalEntryId` set |
| Debit note `PDN-000003` | remains `FINALIZED`; total remains `460.0000`; unapplied changes `310.0000 -> 460.0000`; debit-note reversal journal remains absent |
| Purchase bill `BILL-000008` | remains `FINALIZED`; balance due remains `1150.0000`; reversal journal remains absent |
| Historical allocation `7ec0dfb3` | remains reversed; active allocation count remains `0` |
| Supplier payment | no supplier payment is created and no supplier payment allocation is created |

## Expected Journal And Accounting Result

Expected supplier refund void accounting:

- A new posted reversal journal should be created for original refund journal `JE-000055`.
- If the current journal sequence remains unchanged, the reversal journal should be the next journal number.
- Original refund journal `JE-000055` should be marked `REVERSED`.
- Reversal lines should invert the original refund journal:

| Direction | Account | Amount |
| --- | --- | ---: |
| Debit | `210` Accounts Payable | `150.0000` |
| Credit | `112` Bank Account | `150.0000` |

Expected non-effects:

- Purchase bill journal `JE-000053` remains posted and unchanged.
- Purchase debit note journal `JE-000054` remains posted and unchanged.
- No debit-note reversal journal.
- No purchase bill reversal journal.
- No supplier payment journal.

## Expected Audit Result

Expected audit:

- One standardized `SupplierRefund:SUPPLIER_REFUND_VOIDED` audit action for `SRF-000003`.

Expected audit non-effects:

- No duplicate supplier refund creation audit.
- No debit-note apply/reverse/void audit created by the supplier refund void.
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

Expected after approved Part 13:

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

- No blocker was found for planning the approved Part 13 supplier refund void mutation.
- Part 13 must still re-check exact approval phrase, local-only database target, refund state, debit note state, journal state, and forbidden side-effect baseline immediately before mutation.

## Approval Phrase Required For Part 13

`I approve DEV-08B Part 13 local-only supplier refund void mutation under marker DEV08B-AP-20260526T060000 for supplier refund SRF-000003 amount 150.0000. No production, no beta, no customer data.`

## Commands Run

- `git fetch origin --prune`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Targeted `Get-Content` and `rg` reads for requested DEV-08B evidence/preflight docs, `CODEX_HANDOFF.md`, `DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, `README.md`, supplier refund service/controller/DTO/spec/accounting, purchase debit note service, audit events, and Prisma schema.
- `docker info --format "DockerServer={{.ServerVersion}} OSType={{.OSType}}"`.
- `docker ps --filter "name=infra-postgres-1" --filter "name=infra-redis-1" --format "{{.Names}} {{.Status}} {{.Ports}}"`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- `corepack pnpm exec tsx scripts/dev08b-supplier-refund-void-preflight-readonly.tmp.ts` from `apps/api`.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-supplier-refund-void-preflight-readonly.tmp.ts`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'`.

## Commands Skipped And Why

- Supplier refund void: explicitly not approved for Part 12.
- Supplier refund creation: explicitly forbidden.
- Debit-note apply/reverse/void and purchase bill mutation: explicitly forbidden.
- Supplier payment and other AP mutations: explicitly forbidden.
- Full tests, full build, E2E, and smoke: explicitly out of scope.
- Migrations and seed/reset/delete: explicitly forbidden.
- Deploys and environment changes: explicitly forbidden.
- Login/browser flows: explicitly forbidden because they can write audit logs.
- PDF/archive/export/download and generated-document archive creation: explicitly forbidden.
- ZATCA and email: explicitly forbidden.
- Backup/restore and production-hosting research: explicitly forbidden.

## Temporary Script Cleanup Proof

- Temporary read-only script path: `apps/api/scripts/dev08b-supplier-refund-void-preflight-readonly.tmp.ts`.
- The script was removed with `apply_patch` after its single read-only run.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-supplier-refund-void-preflight-readonly.tmp.ts` returned `False`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'` returned no files.

## Part 13 Evidence Note

- DEV-08B Part 13 executed exactly one approved local supplier refund void mutation for `SRF-000003`.
- Mutation result: `SRF-000003` changed `POSTED -> VOIDED`, debit note `PDN-000003` unapplied restored `310.0000 -> 460.0000`, and reversal journal `JE-000056` was created.
- Mutation evidence: [DEV_08B_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md](DEV_08B_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md).

## Exact Next Prompt Title

`DEV-08B Part 13: approved local supplier refund void mutation`
