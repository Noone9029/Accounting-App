# DEV-08B Supplier Refund From Debit Note Preflight

## Purpose And Scope

This document records the read-only DEV-08B Part 9 preflight for creating a supplier refund from the remaining unapplied amount on the DEV-08B purchase debit note.

- Marker: `DEV08B-AP-20260526T060000`.
- Family: AP / DEV-08B.
- Planned future mutation: create exactly one supplier refund sourced from the DEV-08B purchase debit note.
- Mutation performed in this task: no.
- Supplier refund creation, supplier refund void, debit-note apply/reverse/void, supplier payment workflows, purchase bill mutation, PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, login/browser flows, backup/restore, and production-hosting research were not run.

## Latest Commit Inspected

- `246f3000 Reverse DEV-08B debit note allocation`.
- Local `HEAD` and `origin/main` matched at `246f3000bb17cc88306add89bd9c47c1d604ed02` before this preflight work.
- `git status --short` showed only unrelated untracked web/marketing and graphify output paths; they were not touched or staged.

## Current Debit-Note, Bill, And Allocation Evidence

Read-only local Prisma evidence on the disposable local database confirmed:

| Area | Evidence |
| --- | --- |
| Supplier | `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER` |
| Organization | Fake local AP-ready organization safe id prefix `db69e5a8` |
| Purchase bill | `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET` |
| Bill amounts | subtotal `1000.0000`, VAT `150.0000`, total `1150.0000`, balance due `1150.0000` |
| Bill blockers | no reversal journal, supplier payment allocation count `0`, supplier payment unapplied allocation count `0` |
| Purchase debit note | `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, linked to `BILL-000008` |
| Debit note amounts | subtotal `400.0000`, VAT `60.0000`, total `460.0000`, unapplied amount `460.0000` |
| Debit note blockers | no reversal journal, supplier refund count `0` |
| Allocation | one historical `PurchaseDebitNoteAllocation`, safe id prefix `7ec0dfb3`, amount `250.0000`, reversed |
| Active allocation count | `0` |
| Reversal fields | `reversedAt` set, `reversedById` set, reason `DEV-08B local-only debit note allocation reversal QA` |

The preferred refund amount `150.0000` does not exceed the current debit-note unapplied amount `460.0000`.

## Local-Only Safety Proof

- Docker Desktop/Linux engine was available: Docker server `28.5.1`, OSType `linux`.
- Local Postgres and Redis containers were healthy.
- Local TCP checks succeeded for `localhost:5432` and `localhost:6379`.
- The read-only Prisma verification accepted only database target `postgresql://<redacted>@localhost:5432/accounting`.
- The target classifier rejected hosted/prod/beta/shared/customer-data patterns and did not print database URLs, secrets, tokens, cookies, auth headers, request/response bodies, vendor/customer data, document bodies, signed XML, QR payloads, or attachment bodies.

## Supplier Refund Code Paths Inspected

- `apps/api/src/supplier-refunds/supplier-refund.controller.ts`.
- `apps/api/src/supplier-refunds/supplier-refund.service.ts`.
- `apps/api/src/supplier-refunds/dto/create-supplier-refund.dto.ts`.
- `apps/api/src/supplier-refunds/supplier-refund-accounting.ts`.
- `apps/api/src/supplier-refunds/supplier-refund-rules.spec.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`.
- `apps/api/src/purchase-debit-notes/purchase-debit-note-rules.spec.ts`.
- `apps/api/src/supplier-payments/supplier-payment.service.ts`.
- `apps/api/src/audit-log/audit-events.ts`.
- `apps/api/prisma/schema.prisma`.

Relevant routes and service methods:

- `POST /supplier-refunds` calls `SupplierRefundService.create(organizationId, actorUserId, dto)`.
- `GET /supplier-refunds/refundable-sources?supplierId=...` reads source availability; it was inspected but not called.
- `POST /supplier-refunds/:id/void` voids refunds; it was inspected for blockers but not called.
- `GET /supplier-refunds/:id/pdf` and `POST /supplier-refunds/:id/generate-pdf` are PDF/archive paths; they were identified and not called.

## Exact Planned Refund

- Source: DEV-08B purchase debit note `PDN-000003`, safe id prefix `b93f96ee`.
- Supplier: `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`.
- Refund amount: `150.0000`.
- Planned refund date: `2026-05-26`.
- Fiscal period: `2026`, safe id prefix `3211c06e`, status `OPEN`.
- Expected supplier refund number if current sequence remains unchanged: `SRF-000003`.
- Expected journal number if current sequence remains unchanged: `JE-000055`.
- Expected debit-note unapplied amount after refund: `460.0000 -> 310.0000`.
- Purchase bill `BILL-000008` should remain `FINALIZED` with balance due `1150.0000`; supplier refund does not apply to the bill.

## Exact DTO And Service Call Shape

Current `CreateSupplierRefundDto` supports only these fields:

```ts
{
  supplierId: string;
  sourceType: SupplierRefundSourceType;
  sourcePaymentId?: string;
  sourceDebitNoteId?: string;
  refundDate: string;
  currency?: string;
  amountRefunded: string;
  accountId: string;
  description?: string;
}
```

Planned Part 10 call shape:

```ts
await supplierRefundService.create(organizationId, actorUserId, {
  supplierId: "<DEV-08B supplier id>",
  sourceType: SupplierRefundSourceType.PURCHASE_DEBIT_NOTE,
  sourceDebitNoteId: "<PDN-000003 id>",
  refundDate: "2026-05-26T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "150.0000",
  accountId: "<account 112 Bank Account id>",
  description: "DEV-08B local-only supplier refund from debit note QA",
});
```

Unsupported fields will not be sent: no `reference`, `notes`, `branchId`, or `sourcePaymentId` for this debit-note-sourced refund.

## Selected Bank/Asset Account

Selected received-into account:

- Account code: `112`.
- Name: `Bank Account`.
- Safe id prefix: `32ab6f4d`.
- Type: `ASSET`.
- Active: yes.
- Posting allowed: yes.
- Organization: same fake local AP-ready organization as the supplier, bill, and debit note.

This is safe for Part 10 because `SupplierRefundService.findReceivedIntoAccount(...)` requires an active posting `ASSET` account in the same organization.

## Preconditions Required Before Mutation

Part 10 must re-check these conditions immediately before any write-capable service use:

- The exact approval phrase is present.
- Marker is exactly `DEV08B-AP-20260526T060000`.
- Database target is still local-only `localhost:5432` and does not match hosted/prod/beta/shared/customer-data patterns.
- Supplier `d11c76db` still exists, is active, and has type `SUPPLIER`.
- `PDN-000003` still exists, belongs to the marker supplier, is `FINALIZED`, has no reversal journal, and has at least `150.0000` unapplied.
- `BILL-000008` still exists, is `FINALIZED`, and has no reversal journal.
- Allocation `7ec0dfb3` remains reversed and no active `PurchaseDebitNoteAllocation` exists.
- No supplier refund exists for the DEV-08B debit note or supplier.
- Account `112 Bank Account` still exists, is active, is posting-enabled, and has type `ASSET`.
- Fiscal period for `2026-05-26` is open.
- No supplier payment, purchase order, purchase receipt, stock movement, cash expense, generated document, email, ZATCA, cleanup/delete, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, shared, or customer-data side effect occurred since this preflight.

## Expected Supplier Refund Effect

If Part 10 is approved and preconditions remain true:

- Exactly one `SupplierRefund` is created.
- Status is `POSTED`.
- Amount refunded is `150.0000`.
- Source is `PURCHASE_DEBIT_NOTE`.
- `sourceDebitNoteId` points to `PDN-000003`.
- `sourcePaymentId` is absent.
- `accountId` points to account `112 Bank Account`.
- `journalEntryId` is present.
- `voidReversalJournalEntryId` is absent.
- No supplier payment is created.

## Expected Debit Note Effect

- `PDN-000003` remains `FINALIZED`.
- Total remains `460.0000`.
- Unapplied amount changes `460.0000 -> 310.0000`.
- A posted supplier refund source claim exists through the new `SupplierRefund`.
- Debit-note reversal journal remains absent.
- The historical reversed allocation `7ec0dfb3` remains reversed.
- No new debit-note allocation is created.

## Expected Bill Effect

- `BILL-000008` remains `FINALIZED`.
- Total remains `1150.0000`.
- Balance due remains `1150.0000`.
- Reversal journal remains absent.
- No supplier payment allocation or supplier payment unapplied allocation is created.

## Expected Journal And Accounting Effect

Current code creates a new posted journal for supplier refund creation.

Expected Part 10 journal:

| Direction | Account | Amount |
| --- | --- | ---: |
| Debit | `112` Bank Account | `150.0000` |
| Credit | `210` Accounts Payable | `150.0000` |

Other accounting effects:

- Journal should be `POSTED` and balanced.
- If sequences are unchanged, journal number should be `JE-000055`.
- Purchase bill journal `JE-000053` remains `POSTED` and unchanged.
- Debit-note journal `JE-000054` remains `POSTED` and unchanged.
- No debit-note reversal journal.
- No purchase bill reversal journal.
- No supplier payment journal.

## Expected Audit Effect

- `SupplierRefundService.create(...)` logs `action: "CREATE"`, `entityType: "SupplierRefund"`.
- `audit-events.ts` standardizes `SupplierRefund:CREATE` to `SUPPLIER_REFUND_CREATED`.
- Expected evidence after Part 10: one `SupplierRefund:SUPPLIER_REFUND_CREATED` audit action for the new refund.
- No supplier refund void audit.
- No debit-note apply or reverse-allocation audit is created again.
- No debit-note void audit.
- No purchase bill void audit.
- No supplier payment audit.
- No login/browser audit-writing flow.

Current fixture audit actions before refund:

- `Contact:CREATE`.
- `PurchaseBill:PURCHASE_BILL_CREATED`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`.
- `PurchaseDebitNote:APPLY`.
- `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`.

## Expected Forbidden Side-Effect Non-Effects

Read-only Part 9 side-effect baseline:

| Area | Count |
| --- | ---: |
| Supplier refunds for debit note | `0` |
| Supplier refunds for supplier | `0` |
| Supplier payments for supplier | `0` |
| Purchase orders for supplier | `0` |
| Purchase receipts for supplier | `0` |
| Cash expenses for supplier | `0` |
| Stock movements with fixture marker/source ids | `0` |
| Generated documents for bill/debit note | `0` |
| Marker email outbox rows | `0` |
| Marker email provider events | `0` |
| Marker auth tokens | `0` |
| Fixture cleanup/delete audits | `0` |
| ZATCA invoice metadata for bill/debit note | `0` |

Organization-level local ZATCA submission logs remain an existing baseline count of `7`; this preflight did not create fixture-specific ZATCA XML, signing, QR, or submission artifacts.

Expected Part 10 non-effects:

- No generated document.
- No PDF/archive/export/download.
- No email outbox/provider event.
- No ZATCA XML/signing/QR/submission artifact.
- No supplier payment.
- No purchase order.
- No purchase receipt.
- No stock movement.
- No cash expense.
- No cleanup deletion.
- No migration.
- No seed/reset/delete.
- No deploy.
- No environment/provider/schema change.
- No production, beta, shared-target, or customer-data action.

## Known Blockers Or Deviations

- No mutation blocker was found for the planned `150.0000` debit-note-sourced supplier refund.
- The first read-only inline Prisma query used the wrong `PurchaseBill` relation name (`supplierPaymentAllocations` instead of `paymentAllocations`) and failed before returning fixture state. It was corrected and rerun read-only; no mutation path was called.
- After the supplier refund is created, `PurchaseDebitNoteService.void(...)` is expected to block debit-note void while a posted supplier refund exists. The DEV-08B sequence should void the supplier refund before trying debit-note void.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse --abbrev-ref HEAD`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Targeted reads of the requested DEV-08B handoff/evidence documents, `README.md`, and `BUG_AUDIT.md`.
- Targeted `rg`, `Select-String`, and `Get-Content` inspection of supplier refund, purchase debit note, supplier payment, audit, and Prisma code paths.
- `docker info --format "DockerServer={{.ServerVersion}} OSType={{.OSType}}"`.
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- Read-only inline Prisma preflight query from `apps/api` (first attempt failed on relation-name mismatch).
- Corrected read-only inline Prisma preflight query from `apps/api`.

## Commands Skipped

- Supplier refund creation.
- Supplier refund void.
- Debit-note apply/reverse/void.
- Supplier payment workflows.
- Purchase bill mutation.
- PDF/archive/export/download routes.
- Email.
- ZATCA.
- Full tests.
- Full build.
- E2E.
- Smoke.
- Migrations.
- Seed/reset/delete.
- Deploys.
- Environment changes.
- Login/browser flows.
- Backup/restore.
- Production-hosting research.

## Required Approval Phrase For Part 10

`I approve DEV-08B Part 10 local-only supplier refund from debit note mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B purchase debit note with refund amount 150.0000. No production, no beta, no customer data.`

## Part 10 Evidence Note

- DEV-08B Part 10 approved local supplier refund from debit note mutation is recorded in [DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_MUTATION_EVIDENCE.md](DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_MUTATION_EVIDENCE.md).
- Mutation performed in Part 10: yes, exactly one `SupplierRefundService.create(...)` call.
- Supplier refund `SRF-000003`, safe id prefix `39873ae4`, was created as `POSTED` for `150.0000` from `PDN-000003`.
- `PDN-000003` remained `FINALIZED`; unapplied amount changed `460.0000 -> 310.0000`.
- `BILL-000008` remained `FINALIZED`; balance due stayed `1150.0000`.
- Supplier refund journal `JE-000055`, safe id prefix `6cae838d`, posted and balanced with debit account `112` `150.0000` and credit AP account `210` `150.0000`.
- Standardized `SupplierRefund:SUPPLIER_REFUND_CREATED` audit was created.
- No output/email/ZATCA/payment/purchase-order/inventory/cash-expense/cleanup side effect occurred.

## Exact Next Prompt Title

`DEV-08B Part 10: approved local supplier refund from debit note mutation`
