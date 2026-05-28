# DEV-08G Standalone Purchase Receipt Preflight

## Purpose And Scope

This document records DEV-08G Part 22: read-only preflight for a standalone purchase receipt using the DEV-08G supplier, item, and warehouse.

- Task: `DEV-08G Part 22: standalone purchase receipt preflight`.
- Latest commit inspected before preflight: `9522b098 Verify DEV-08G remaining purchase order receipt void`.
- Local `HEAD` matched `origin/main`: `9522b098d32405e370ce1f888be769ee934b2e4f`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only prompt, service-code, schema, and Prisma inspection only.
- This preflight did not create, post, void, reverse, mutate, export, download, generate documents, send email, run ZATCA, run login/browser flows, run migrations, run seed/reset/delete, deploy, or change environment/provider/schema settings.

## Selected Standalone Receipt Inputs

The standalone receipt will reuse safe fake DEV-08G fixture records:

- Supplier safe prefix: `f5deec9a`; type `SUPPLIER`; active `true`.
- Item safe prefix: `3b8d7650`; status `ACTIVE`; inventory tracking `true`.
- Warehouse safe prefix: `197fac56`; code `MAIN`; status `ACTIVE`.
- Source fixture used to identify these records: `PRC-000005` safe prefix `1f412d79`, linked to `PO-000003`.

## Planned Standalone Receipt

- Planned receipt quantity: `3.0000`.
- Planned unit cost: `90.0000`.
- Expected receipt number from current local sequence: `PRC-000007`.
- Expected `purchaseOrderId`: absent.
- Expected `purchaseBillId`: absent.
- Expected stock movement type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Expected stock movement quantity: `3.0000`.
- Expected stock on hand change for the selected item/warehouse: `0.0000 -> 3.0000`.

## Service Behavior Confirmed From Code

`PurchaseReceiptService.create(...)` behavior for standalone receipts was inspected:

- Standalone source is selected when `purchaseOrderId` and `purchaseBillId` are absent.
- Standalone purchase receipts require `supplierId`.
- Standalone receipt lines require `itemId`.
- The item must belong to the organization, be active, and be inventory-tracked.
- The warehouse must belong to the organization and be active.
- The created receipt should have no purchase order or purchase bill link.
- The created stock movement should be `PURCHASE_RECEIPT_PLACEHOLDER`.

Expected standalone accounting preview behavior:

- Posting status: `DESIGN_ONLY`.
- Blocking reason includes: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- Standalone receipt cannot be financially posted until a bill or clearing workflow is selected.

## Baseline Counts

- Existing standalone DEV-08G purchase receipts: `0`.
- Stock movements for the selected item and warehouse: `4`.
- Journal entries directly tied to the marker: `0`.
- Generated documents tied to the marker: `0`.
- Marker email outbox rows: `0`.
- Broad existing ZATCA audit count in the local org: `23`.
- Existing purchase receipt creation audit rows in the local org: `6`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Required Part 23 Approval Phrase

Exact approval phrase required before any Part 23 standalone receipt mutation:

```text
I approve DEV-08G Part 23 local-only standalone purchase receipt mutation under marker DEV08G-AP-20260527T000000 for quantity 3.0000. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 23 must still re-check it before importing write-capable services or running the guarded mutation path.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git log -1 --oneline`.
- Read-only prompt inspection with `Get-Content`.
- Read-only service and schema inspection with `Get-Content` and `rg`.
- Inline read-only Prisma preflight script run through `node -`.
- One initial inline read-only Prisma query failed on an invalid `PurchaseOrder.warehouse` include; no mutation occurred, and the corrected query selected the warehouse through the existing purchase receipt fixture.

## Commands Skipped

- Standalone purchase receipt creation.
- Purchase receipt voiding.
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

`DEV-08G Part 23: approved local standalone purchase receipt mutation`
