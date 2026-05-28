# DEV-08G Partial Purchase Order Receipt Preflight

## Purpose And Scope

This document records DEV-08G Part 4: read-only preflight for creating a local-only partial purchase receipt from the DEV-08G purchase order source.

- Task: `DEV-08G Part 4: partial purchase receipt from purchase order preflight`.
- Latest commit inspected before preflight: `792c9237 Verify DEV-08G purchase order receipt source fixture`.
- Local `HEAD` matched `origin/main`: `792c9237600f040f64812f704af9221056c495e6`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries and filesystem checks only.
- This preflight did not create a purchase receipt, purchase bill, stock movement, journal entry, generated document, PDF/archive/export/download, email, ZATCA artifact, supplier payment, supplier refund, purchase debit note, cash expense, fixture, cleanup/delete action, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production target, beta target, hosted/shared target, or customer data.

## Local-Only Target Proof

- `apps/api/.env` classified as approved local database target:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Source Purchase Order State

- Purchase order number: `PO-000003`.
- Purchase order safe prefix: `a3efc2e4`.
- Status: `APPROVED`.
- Converted bill linked: `false`.
- Total: `1150.0000`.
- Supplier safe prefix: `f5deec9a`.
- Supplier type: `SUPPLIER`.
- Supplier active: `true`.

Purchase order line:

- Safe prefix: `22f17076`.
- Item safe prefix: `3b8d7650`.
- Item status: `ACTIVE`.
- Item inventory tracking: `true`.
- Quantity: `10.0000`.
- Unit price: `100.0000`.
- Tax rate: `15.0000`.
- Tax scope: `PURCHASES`.
- Account code: `111`.
- Account type: `ASSET`.

Warehouse:

- Safe prefix: `197fac56`.
- Code: `MAIN`.
- Status: `ACTIVE`.

## Receiving Baseline

- Purchase receipt count for the PO: `0`.
- Non-voided receipt line count for the PO line: `0`.
- Received quantity: `0.0000`.
- Remaining quantity: `10.0000`.
- Receiving status: `NOT_STARTED`.
- Receipt matching status: `NOT_RECEIVED`.

## Selected Part 5 Mutation Plan

- Selected receipt quantity: `4.0000`.
- Source quantity: `10.0000`.
- Expected received quantity after mutation: `4.0000`.
- Expected remaining quantity after mutation: `6.0000`.
- Expected receipt status: `POSTED`.
- Expected stock movement type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Expected receiving status after mutation: `PARTIAL`.
- Expected receipt matching status after mutation: `PARTIALLY_RECEIVED`.
- Expected asset posting allowed: `false`.
- Expected asset posting blocker: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`

## Baseline Side-Effect Counts

- Purchase receipts for the PO: `0`.
- Stock movements for the fixture item: `0`.
- Journal entries directly tied to the marker or PO source: `0`.
- Generated documents for the fixture source ids or marker: `0`.
- Email outbox rows for the marker: `0`.
- Email provider events for marker-linked outbox/provider references: `0`.
- Output count: `0`.
- ZATCA fixture audit actions: `0`.
- Total existing fixture-scoped audit actions from Parts 2-3 baseline: `4`.
- Purchase receipt audit actions for the marker: `0`.

## Required Part 5 Approval Phrase

Exact approval phrase required before any Part 5 mutation:

```text
I approve DEV-08G Part 5 local-only partial purchase receipt from purchase order mutation under marker DEV08G-AP-20260527T000000 for quantity 4.0000. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 5 must still re-check it before importing write-capable services or running the guarded mutation path.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma preflight script run through `node -`.

## Commands Skipped

- Purchase receipt creation.
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

`DEV-08G Part 5: approved local partial purchase receipt from purchase order mutation`

## Part 5 Mutation Note

DEV-08G Part 5 completed the approved local-only partial purchase receipt mutation.

- Mutation evidence: [DEV_08G_PARTIAL_PO_RECEIPT_MUTATION_EVIDENCE.md](DEV_08G_PARTIAL_PO_RECEIPT_MUTATION_EVIDENCE.md).
- Latest commit inspected before mutation: `f7f939d0 Plan DEV-08G partial purchase order receipt`.
- Approval phrase status: exact Part 5 approval phrase was supplied and checked before mutation.
- Service call: exactly one `PurchaseReceiptService.create(...)`.
- Created purchase receipt `PRC-000005` safe prefix `1f412d79`, status `POSTED`.
- Receipt line safe prefix `17eecfdc`, quantity `4.0000`, unit cost `100.0000`, source PO line safe prefix `22f17076`.
- Stock movement safe prefix `39a7350e`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `4.0000`.
- Receiving changed to `PARTIAL` with `4.0000` received and `6.0000` remaining.
- Receipt matching changed to `PARTIALLY_RECEIVED` with the expected no-linked-bill warning.
- Inventory asset posting was not run; preview remained blocked because no finalized linked inventory-clearing bill exists.
- Directly tied journal entries, generated documents/output, email rows/events, and ZATCA fixture audit actions remained `0`.
- Receipt audit action: `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED` once.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 6: partial purchase receipt evidence verification`.
