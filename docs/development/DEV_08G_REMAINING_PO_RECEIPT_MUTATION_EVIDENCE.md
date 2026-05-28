# DEV-08G Remaining Purchase Order Receipt Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 8: the approved local-only remaining purchase receipt mutation from the DEV-08G purchase order source.

- Task: `DEV-08G Part 8: approved local remaining purchase receipt from purchase order mutation`.
- Latest commit inspected before mutation: `5aa3bf7f Plan DEV-08G remaining purchase order receipt`.
- Local `HEAD` matched `origin/main`: `5aa3bf7febe11525c287cace0adb168397cfca3f`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Allowed mutation used: exactly one `PurchaseReceiptService.create(...)` call for quantity `6.0000`.
- This mutation did not post inventory asset, create a purchase bill, create a journal entry, create generated document/PDF/archive/export/download output, send email, create ZATCA artifacts, create supplier payment/refund/debit-note/cash-expense records, void a receipt, run a login/browser flow, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked by the guarded runner before mutation:

```text
I approve DEV-08G Part 8 local-only remaining purchase receipt from purchase order mutation under marker DEV08G-AP-20260527T000000 for quantity 6.0000. No production, no beta, no customer data.
```

## Local-Only Target Proof

- The guarded runner classified `apps/api/.env` as approved local database target before importing write-capable services:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- The runner refused non-local targets before loading `PurchaseReceiptService`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Pre-Mutation Checks

- Source purchase order safe prefix: `a3efc2e4`.
- Source purchase order status: `APPROVED`.
- Source purchase order line safe prefix: `22f17076`.
- Existing non-voided receipt lines before mutation: `1`.
- Received quantity before mutation: `4.0000`.
- Remaining quantity before mutation: `6.0000`.
- Selected receipt quantity: `6.0000`.

## Service Call

The runner instantiated the real service after local-target and approval guards, then made one write-capable service call:

- `PurchaseReceiptService.create(...)`: `1`.

No `postInventoryAsset(...)`, `reverseInventoryAsset(...)`, `void(...)`, purchase bill service, generated document service, email service, ZATCA service, migration, seed, reset, delete, deploy, or login/browser flow was called.

## Receipt Result

Purchase receipt:

- Receipt number: `PRC-000006`.
- Safe prefix: `942e4907`.
- Status: `POSTED`.
- Linked purchase order safe prefix: `a3efc2e4`.
- Linked purchase bill: absent.
- Inventory asset journal: absent.
- Inventory asset reversal journal: absent.

Receipt line:

- Safe prefix: `452f75a6`.
- Quantity: `6.0000`.
- Unit cost: `100.0000`.
- Source purchase order line safe prefix: `22f17076`.

Stock movement:

- Safe prefix: `e0ffd378`.
- Type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Quantity: `6.0000`.
- Reference type: `PurchaseReceipt`.
- Reference receipt safe prefix: `942e4907`.

## Receiving And Matching Result

- Receiving status: `COMPLETE`.
- Total non-voided received quantity: `10.0000`.
- Remaining quantity: `0.0000`.
- Receipt matching status: `FULLY_RECEIVED`.
- Matching receipt count: `2`.

## Side-Effect Results

Count deltas:

- Purchase receipts for the PO: `1 -> 2`.
- Stock movements for the fixture item: `1 -> 2`.
- Journal entries directly tied to the marker or PO source: `0 -> 0`.
- Generated documents for the fixture source ids or marker: `0 -> 0`.
- Email outbox rows for the marker: `0`.
- Email provider events for marker-linked outbox/provider references: `0`.
- ZATCA fixture audit actions: `0`.

Audit evidence:

- New `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED`: `1`.
- No `PurchaseReceipt` void, asset-post, or asset-reversal audit action occurred for the new receipt.

## Runner Notes And Cleanup

- Temporary runner path: `apps/api/scripts/dev08g-part8-runner.ts`.
- The runner was removed after successful execution.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- `corepack pnpm exec tsx scripts/dev08g-part8-runner.ts` with exact approval supplied through `DEV08G_PART8_APPROVAL`.
- `Get-ChildItem apps/api/scripts -File` filtered for `dev08g`.
- `git status --short`.

## Commands Skipped

- Inventory asset posting.
- Receipt voiding.
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

`DEV-08G Part 9: remaining purchase receipt evidence verification`

## Part 9 Verification Note

DEV-08G Part 9 independently verified the full PO receiving state with read-only Prisma queries only.

- Verification evidence: [DEV_08G_REMAINING_PO_RECEIPT_EVIDENCE_VERIFICATION.md](DEV_08G_REMAINING_PO_RECEIPT_EVIDENCE_VERIFICATION.md).
- Latest commit inspected before verification: `a3c12b99 Create DEV-08G remaining purchase order receipt`.
- First receipt `PRC-000005` safe prefix `1f412d79` remains `POSTED` for quantity `4.0000`.
- Second receipt `PRC-000006` safe prefix `942e4907` remains `POSTED` for quantity `6.0000`.
- Source stock movements remain `PURCHASE_RECEIPT_PLACEHOLDER`: `39a7350e` quantity `4.0000` and `e0ffd378` quantity `6.0000`.
- Total non-voided received quantity is `10.0000`; remaining quantity is `0.0000`.
- Receiving status is `COMPLETE`; receipt matching status is `FULLY_RECEIVED`.
- Asset journals, reversal journals, and void stock movements remain absent for both PO-only receipts.
- Purchase bills, directly tied journals, generated documents/output, email rows/events, and ZATCA fixture audit actions remain `0`.
- Fixture audit actions are limited to prior fixture creates/approval plus two `PurchaseReceipt:PURCHASE_RECEIPT_CREATED` actions.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 10: purchase order over-receipt blocker preflight`.
