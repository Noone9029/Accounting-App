# DEV-08G Purchase Order Receipt Void Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 17: the approved local-only purchase-order receipt void mutation for the `6.0000` receipt.

- Task: `DEV-08G Part 17: approved local purchase-order receipt void mutation`.
- Latest commit inspected before mutation: `151e3388 Plan DEV-08G purchase order receipt void`.
- Local `HEAD` matched `origin/main`: `151e338819cb5562b346425664b998e5c9a4bddf`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Allowed mutation used: exactly one `PurchaseReceiptService.void(...)` call for `PRC-000006`, the `6.0000` PO receipt.
- This mutation did not void the `4.0000` receipt, post inventory asset, create a journal entry, create generated document/PDF/archive/export/download output, send email, create ZATCA artifacts, create a purchase bill, run a login/browser flow, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked by the guarded runner before mutation:

```text
I approve DEV-08G Part 17 local-only purchase-order receipt void mutation under marker DEV08G-AP-20260527T000000 for the 6.0000 receipt. No production, no beta, no customer data.
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

- Receipt number: `PRC-000006`.
- Safe prefix: `942e4907`.
- Status after mutation: `VOIDED`.
- `voidedAt`: present.

Receipt intentionally left posted:

- Receipt number: `PRC-000005`.
- Safe prefix: `1f412d79`.
- Status after mutation: `POSTED`.

Void stock movement:

- Safe prefix: `3317628d`.
- Type: `ADJUSTMENT_OUT`.
- Quantity: `6.0000`.
- Reference type: `PurchaseReceiptVoid`.
- Reference receipt safe prefix: `942e4907`.

## Receiving And Matching Result

- Non-voided received quantity: `4.0000`.
- Remaining quantity: `6.0000`.
- Receiving status: `PARTIAL`.
- Receipt matching status: `PARTIALLY_RECEIVED`.

## Side-Effect Results

- Stock movements for the fixture item: `2 -> 3`.
- Journal entries directly tied to the marker or PO source: `0 -> 0`.
- Generated documents for selected receipt or marker: `0`.
- Email outbox rows for marker: `0`.
- ZATCA fixture audit actions for selected receipt: `0`.

Audit evidence:

- New `PurchaseReceipt` `PURCHASE_RECEIPT_VOIDED`: `1`.
- No asset-post or asset-reversal audit action occurred.

## Runner Notes And Cleanup

- Temporary runner path: `apps/api/scripts/dev08g-part17-runner.ts`.
- The runner was removed after successful execution.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- `corepack pnpm exec tsx scripts/dev08g-part17-runner.ts` with exact approval supplied through `DEV08G_PART17_APPROVAL`.
- `Get-ChildItem apps/api/scripts -File` filtered for `dev08g`.
- `git status --short`.

## Commands Skipped

- Voiding the `4.0000` receipt.
- Inventory asset posting.
- Inventory asset reversal.
- Purchase receipt creation.
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

`DEV-08G Part 18: purchase-order receipt void evidence verification`

## Part 18 Verification Note

DEV-08G Part 18 independently verified the `6.0000` receipt void with read-only Prisma queries only.

- Verification evidence: [DEV_08G_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](DEV_08G_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Latest commit inspected before verification: `87ed54a9 Void DEV-08G purchase order receipt locally`.
- `PRC-000006` safe prefix `942e4907` remains `VOIDED` with `voidedAt` present.
- `PRC-000005` safe prefix `1f412d79` remains `POSTED`.
- Void stock movement safe prefix `3317628d` remains `ADJUSTMENT_OUT` quantity `6.0000`.
- Non-voided received quantity is `4.0000`; remaining quantity is `6.0000`.
- Receiving status is `PARTIAL`; receipt matching status is `PARTIALLY_RECEIVED`.
- Journal, generated document, email, and ZATCA counts remain `0`.
- Receipt audit actions now show two `PURCHASE_RECEIPT_CREATED` actions and one `PURCHASE_RECEIPT_VOIDED` action.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 19: remaining purchase-order receipt void preflight`.
