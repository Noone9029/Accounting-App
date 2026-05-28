# DEV-08G Partial Purchase Order Receipt Evidence Verification

## Purpose And Scope

This document records DEV-08G Part 6: read-only verification of the Part 5 partial purchase order receipt evidence.

- Task: `DEV-08G Part 6: partial purchase receipt evidence verification`.
- Latest commit inspected before verification: `9b73a689 Create DEV-08G partial purchase order receipt`.
- Local `HEAD` matched `origin/main`: `9b73a6897077d8824577ef118a82ea4d589e4c40`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This verification did not create, post, void, reverse, or mutate anything.

## Local-Only Target Proof

- `apps/api/.env` classified as approved local database target:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Receipt State

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
- Void stock movement: absent.

Stock movement:

- Safe prefix: `39a7350e`.
- Type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Quantity: `4.0000`.
- Reference type: `PurchaseReceipt`.
- Reference receipt safe prefix: `1f412d79`.

## Receiving And Matching Result

- Service receiving status: `PARTIAL`.
- Operational interpretation: partially received.
- Received quantity: `4.0000`.
- Remaining source quantity: `6.0000`.
- Receipt matching status: `PARTIALLY_RECEIVED`.
- Matching receipt count: `1`.

## Side-Effect Results

- Purchase receipts for the PO: `1`.
- Stock movements for the fixture item: `1`.
- Journal entries directly tied to the marker or PO source: `0`.
- Generated documents for the fixture source ids or marker: `0`.
- Email outbox rows for the marker: `0`.
- Email provider events for marker-linked outbox/provider references: `0`.
- ZATCA fixture audit actions: `0`.

Audit actions now present for the fixture:

- `Contact` `CREATE`: `1`.
- `Item` `CREATE`: `1`.
- `PurchaseOrder` `PURCHASE_ORDER_CREATED`: `1`.
- `PurchaseOrder` `PURCHASE_ORDER_APPROVED`: `1`.
- `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED`: `1`.

No `PurchaseReceipt` void, asset-post, asset-reversal, generated-document, email, or ZATCA action was present.

## Temporary Script Cleanup

- `Get-ChildItem apps/api/scripts -File` filtered for `dev08g` returned no files.
- Part 6 used inline read-only Prisma verification and did not create a temporary script file.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma verification script run through `node -`.

## Commands Skipped

- Purchase receipt creation.
- Inventory asset posting.
- Inventory asset reversal.
- Receipt voiding.
- Purchase bill creation/conversion/finalization.
- Stock movement creation.
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

`DEV-08G Part 7: remaining purchase receipt from purchase order preflight`
