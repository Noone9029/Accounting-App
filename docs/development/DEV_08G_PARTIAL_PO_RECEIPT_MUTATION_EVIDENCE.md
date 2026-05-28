# DEV-08G Partial Purchase Order Receipt Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 5: the approved local-only partial purchase receipt mutation from the DEV-08G purchase order source.

- Task: `DEV-08G Part 5: approved local partial purchase receipt from purchase order mutation`.
- Latest commit inspected before mutation: `f7f939d0 Plan DEV-08G partial purchase order receipt`.
- Local `HEAD` matched `origin/main`: `f7f939d01778095db7b21ab2e53043a6d447eaa1`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Allowed mutation used: exactly one `PurchaseReceiptService.create(...)` call for quantity `4.0000`.
- This mutation did not post inventory asset, create a purchase bill, create a journal entry, create generated document/PDF/archive/export/download output, send email, create ZATCA artifacts, create supplier payment/refund/debit-note/cash-expense records, void a receipt, run a login/browser flow, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked by the guarded runner before mutation:

```text
I approve DEV-08G Part 5 local-only partial purchase receipt from purchase order mutation under marker DEV08G-AP-20260527T000000 for quantity 4.0000. No production, no beta, no customer data.
```

## Local-Only Target Proof

- The guarded runner classified `apps/api/.env` as approved local database target before importing write-capable services:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- The runner refused non-local targets before loading `PurchaseReceiptService`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Pre-Mutation Checks

- Source purchase order number: `PO-000003`.
- Purchase order safe prefix: `a3efc2e4`.
- Purchase order status: `APPROVED`.
- Converted bill: absent.
- Purchase order line safe prefix: `22f17076`.
- Item safe prefix: `3b8d7650`.
- Item status: `ACTIVE`.
- Item inventory tracking: `true`.
- Warehouse safe prefix: `197fac56`.
- Existing purchase receipts for the source before mutation: `0`.
- Existing non-voided receipt lines for the source line before mutation: `0`.
- Remaining source quantity before mutation: `10.0000`.
- Selected receipt quantity: `4.0000`.

## Service Call

The runner instantiated the real service after local-target and approval guards, then made one write-capable service call:

- `PurchaseReceiptService.create(...)`: `1`.

No `postInventoryAsset(...)`, `reverseInventoryAsset(...)`, `void(...)`, purchase bill service, generated document service, email service, ZATCA service, migration, seed, reset, delete, deploy, or login/browser flow was called.

## Receipt Result

Purchase receipt:

- Receipt number: `PRC-000005`.
- Safe prefix: `1f412d79`.
- Status: `POSTED`.
- Linked purchase order safe prefix: `a3efc2e4`.
- Linked purchase bill: absent.
- Inventory asset journal: absent.
- Inventory asset reversal journal: absent.

Receipt line:

- Safe prefix: `17eecfdc`.
- Quantity: `4.0000`.
- Unit cost: `100.0000`.
- Source purchase order line safe prefix: `22f17076`.

Stock movement:

- Safe prefix: `39a7350e`.
- Type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Quantity: `4.0000`.
- Reference type: `PurchaseReceipt`.
- Reference receipt safe prefix: `1f412d79`.

## Receiving And Matching Result

- Receiving status: `PARTIAL`.
- Received quantity: `4.0000`.
- Remaining quantity: `6.0000`.
- Receipt matching status: `PARTIALLY_RECEIVED`.
- Matching receipt count: `1`.
- Expected warning present: `Bill matching is not available until a purchase bill is linked.`

Asset preview:

- `canPost`: `false`.
- Blocking reason confirmed: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`

## Side-Effect Results

Count deltas:

- Purchase receipts for the PO: `0 -> 1`.
- Stock movements for the fixture item: `0 -> 1`.
- Journal entries directly tied to the marker or PO source: `0 -> 0`.
- Generated documents for the fixture source ids or marker: `0 -> 0`.
- Email outbox rows for the marker: `0`.
- Email provider events for marker-linked outbox/provider references: `0`.
- ZATCA fixture audit actions: `0`.

Audit evidence:

- `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED`: `1`.
- No `PurchaseReceipt` void, asset-post, or asset-reversal audit action occurred.

## Runner Notes And Cleanup

- Temporary runner path: `apps/api/scripts/dev08g-part5-runner.ts`.
- The runner was removed after successful execution.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt and service inspection with `Get-Content` and `rg`.
- `corepack pnpm exec tsx scripts/dev08g-part5-runner.ts` with exact approval supplied through `DEV08G_PART5_APPROVAL`.
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

`DEV-08G Part 6: partial purchase receipt evidence verification`

## Part 6 Verification Note

DEV-08G Part 6 independently verified this Part 5 receipt with read-only Prisma queries only.

- Verification evidence: [DEV_08G_PARTIAL_PO_RECEIPT_EVIDENCE_VERIFICATION.md](DEV_08G_PARTIAL_PO_RECEIPT_EVIDENCE_VERIFICATION.md).
- Latest commit inspected before verification: `9b73a689 Create DEV-08G partial purchase order receipt`.
- Receipt `PRC-000005` safe prefix `1f412d79` remains `POSTED`.
- Receipt line safe prefix `17eecfdc` remains quantity `4.0000`, unit cost `100.0000`, and linked to source PO line safe prefix `22f17076`.
- Stock movement safe prefix `39a7350e` remains `PURCHASE_RECEIPT_PLACEHOLDER` quantity `4.0000`.
- Service receiving status is `PARTIAL` with `4.0000` received and `6.0000` remaining.
- Receipt matching status remains `PARTIALLY_RECEIVED`.
- Inventory asset journal, reversal journal, and void stock movement remain absent.
- Directly tied journals, generated documents/output, email rows/events, and ZATCA fixture audit actions remain `0`.
- Fixture audit actions are limited to prior fixture creates/approval plus `PurchaseReceipt:PURCHASE_RECEIPT_CREATED`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 7: remaining purchase receipt from purchase order preflight`.
