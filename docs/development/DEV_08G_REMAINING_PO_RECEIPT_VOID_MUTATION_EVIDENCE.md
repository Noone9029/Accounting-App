# DEV-08G Remaining Purchase Order Receipt Void Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 20: the approved local-only remaining purchase-order receipt void mutation for the `4.0000` receipt.

- Task: `DEV-08G Part 20: approved local remaining purchase-order receipt void mutation`.
- Latest commit inspected before mutation: `90b69e4c Plan DEV-08G remaining purchase order receipt void`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Allowed mutation used: exactly one `PurchaseReceiptService.void(...)` call for `PRC-000005`, the remaining `4.0000` PO receipt.
- This mutation did not create a purchase receipt, void the already-voided `6.0000` receipt again, post inventory asset, create a journal entry, create generated document/PDF/archive/export/download output, send email, create ZATCA artifacts, create a purchase bill, run a login/browser flow, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked by the guarded runner before mutation:

```text
I approve DEV-08G Part 20 local-only remaining purchase-order receipt void mutation under marker DEV08G-AP-20260527T000000 for the 4.0000 receipt. No production, no beta, no customer data.
```

## Local-Only Target Proof

- The guarded runner classified `apps/api/.env` as approved local database target before importing write-capable services:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- The runner refused non-local targets before loading `PurchaseReceiptService`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Service Call

The runner instantiated the real service after local-target and approval guards, then made one write-capable service call:

- `PurchaseReceiptService.void(...)`: `1`.

No `postInventoryAsset(...)`, `reverseInventoryAsset(...)`, purchase receipt create, purchase bill service, generated document service, email service, ZATCA service, migration, seed, reset, delete, deploy, or login/browser flow was called.

## Receipt Result

Voided receipt:

- Receipt number: `PRC-000005`.
- Safe prefix: `1f412d79`.
- Quantity: `4.0000`.
- Status before mutation: `POSTED`.
- Status after mutation: `VOIDED`.
- `voidedAt`: present.

Already-voided peer receipt:

- Receipt number: `PRC-000006`.
- Safe prefix: `942e4907`.
- Status after mutation: `VOIDED`.

Void stock movement:

- Safe prefix: `9456b1ca`.
- Type: `ADJUSTMENT_OUT`.
- Quantity: `4.0000`.
- Reference type: `PurchaseReceiptVoid`.
- Reference receipt safe prefix: `1f412d79`.

## Receiving And Matching Result

- Non-voided DEV-08G PO receipt count: `0`.
- Non-voided received quantity: `0.0000`.
- Remaining quantity: `10.0000`.
- Receiving status: `NOT_STARTED`.
- Receipt matching status: `NOT_RECEIVED`.

## Side-Effect Results

- Stock on hand: `4.0000 -> 0.0000`.
- Stock movements for the fixture item: `3 -> 4`.
- Journal entries directly tied to the marker or PO source: `0 -> 0`.
- Generated documents for selected receipts or marker: `0`.
- Email outbox rows for marker: `0`.
- Broad existing ZATCA audit count in the local org was unchanged: `23`.

Audit evidence:

- New selected-receipt `PurchaseReceipt` `PURCHASE_RECEIPT_VOIDED`: `1`.
- Total DEV-08G PO receipt `PURCHASE_RECEIPT_VOIDED` actions: `2`.
- No asset-post or asset-reversal audit action occurred.

## Runner Notes And Cleanup

- Temporary runner path: `apps/api/scripts/dev08g-part20-runner.ts`.
- The runner was removed after successful execution.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- Read-only prompt inspection with `Get-Content`.
- `corepack pnpm exec tsx scripts/dev08g-part20-runner.ts` with exact approval supplied through `DEV08G_PART20_APPROVAL`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08g*' -Force`.

## Commands Skipped

- Purchase receipt creation.
- Inventory asset posting.
- Inventory asset reversal.
- Purchase bill creation/conversion/finalization.
- Journal posting.
- Generated document, PDF/archive/export/download output.
- Email and ZATCA commands.
- Login/browser audit-writing flows.
- Migrations, seed/reset/delete, cleanup/delete, deploys, environment/provider/schema changes, production checks, beta checks, hosted/shared-target checks, customer-data checks, E2E, smoke, full tests, full build, `verify:repo`, and actual `verify:ci:local`.

## Verification Plan For This Documentation Slice

Run before commit:

- `corepack pnpm verify:diff`.
- `git diff --check`.
- `git diff --cached --check` after staging.

## Exact Next Prompt Title

`DEV-08G Part 21: remaining purchase-order receipt void evidence verification`

## Part 21 Verification Note

DEV-08G Part 21 independently verified the remaining purchase-order receipt void with read-only Prisma queries only.

- Verification evidence: [DEV_08G_REMAINING_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](DEV_08G_REMAINING_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Latest commit inspected before verification: `80e7030f Void DEV-08G remaining purchase order receipt locally`.
- Both DEV-08G PO receipts are `VOIDED`: `PRC-000005` safe prefix `1f412d79` and `PRC-000006` safe prefix `942e4907`.
- Original stock movements remain `PURCHASE_RECEIPT_PLACEHOLDER` quantities `4.0000` and `6.0000`.
- Void stock movements are `ADJUSTMENT_OUT` quantities `4.0000` and `6.0000`.
- Non-voided DEV-08G PO receipt count is `0`; received quantity is `0.0000`; remaining quantity is `10.0000`.
- Receiving status is `NOT_STARTED`; receipt matching status is `NOT_RECEIVED`.
- Journal, generated document, marker email, and selected receipt ZATCA counts remain `0`.
- Receipt audit actions show two `PURCHASE_RECEIPT_CREATED` actions and two `PURCHASE_RECEIPT_VOIDED` actions, with no asset-post/reversal audit actions.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 22: standalone purchase receipt preflight`.
