# DEV-08G Remaining Purchase Order Receipt Preflight

## Purpose And Scope

This document records DEV-08G Part 7: read-only preflight for creating the remaining purchase receipt from the DEV-08G purchase order source.

- Task: `DEV-08G Part 7: remaining purchase receipt from purchase order preflight`.
- Latest commit inspected before preflight: `28fd0592 Verify DEV-08G partial purchase order receipt`.
- Local `HEAD` matched `origin/main`: `28fd0592bd77ebfbc9010ba2692605f4f0fa3bcf`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This preflight did not create, post, void, reverse, or mutate anything.

## Local-Only Target Proof

- `apps/api/.env` classified as approved local database target:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Current Source And Receipt State

Source purchase order:

- Purchase order number: `PO-000003`.
- Safe prefix: `a3efc2e4`.
- Status: `APPROVED`.
- Purchase order line safe prefix: `22f17076`.
- Source line quantity: `10.0000`.
- Item safe prefix: `3b8d7650`.
- Warehouse safe prefix selected for Part 8: `197fac56`.

Current partial receipt:

- Receipt number: `PRC-000005`.
- Safe prefix: `1f412d79`.
- Status: `POSTED`.
- Quantity: `4.0000`.
- Stock movement safe prefix: `39a7350e`.
- Inventory asset journal linked: `false`.
- Void stock movement linked: `false`.

Current receiving and matching:

- Received quantity: `4.0000`.
- Remaining quantity: `6.0000`.
- Receiving status: `PARTIAL`.
- Receipt matching status: `PARTIALLY_RECEIVED`.

## Selected Part 8 Mutation Plan

- Selected receipt quantity: `6.0000`.
- Selected quantity equals current remaining source quantity: yes.
- Expected receipt status after mutation: `POSTED`.
- Expected stock movement type after mutation: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Expected received quantity after mutation: `10.0000`.
- Expected remaining quantity after mutation: `0.0000`.
- Expected receiving status after mutation: `COMPLETE`.
- Expected receipt matching status after mutation: `FULLY_RECEIVED`.
- Expected journal count delta on create: `0`.
- Expected inventory asset posting on create: `false`.
- Expected generated document/output, email, and ZATCA delta: `0`.

## Baseline Counts

- Purchase receipts for the PO: `1`.
- Stock movements for the fixture item: `1`.
- Journal entries directly tied to the marker or PO source: `0`.
- Generated documents for the fixture source ids or marker: `0`.
- Email outbox rows for the marker: `0`.
- Email provider events for marker-linked outbox/provider references: `0`.
- ZATCA fixture audit actions: `0`.
- Fixture-scoped audit actions: `5`.
- Marker receipt audit for `PRC-000005`: `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED` once.

## Required Part 8 Approval Phrase

Exact approval phrase required before any Part 8 mutation:

```text
I approve DEV-08G Part 8 local-only remaining purchase receipt from purchase order mutation under marker DEV08G-AP-20260527T000000 for quantity 6.0000. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 8 must still re-check it before importing write-capable services or running the guarded mutation path.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma preflight script run through `node -`.
- Inline read-only marker receipt audit check run through `node -`.

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

`DEV-08G Part 8: approved local remaining purchase receipt from purchase order mutation`
