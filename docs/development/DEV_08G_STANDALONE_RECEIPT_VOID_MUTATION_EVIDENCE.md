# DEV-08G Standalone Receipt Void Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 29: the approved local-only standalone receipt void mutation.

- Task: `DEV-08G Part 29: approved local standalone receipt void mutation`.
- Latest commit inspected before mutation: `fd93bba7 Plan DEV-08G standalone receipt void`.
- Local `HEAD` matched `origin/main`: `fd93bba71d3cc6ce5549eddc3bb1c41dbccc6293`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Allowed mutation used: exactly one `PurchaseReceiptService.void(...)` call for the standalone receipt.
- This mutation did not create a purchase receipt, post inventory asset, reverse inventory asset, create a journal entry, create generated document/PDF/archive/export/download output, send email, create ZATCA artifacts, create a purchase bill, run a login/browser flow, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked before importing write-capable services:

```text
I approve DEV-08G Part 29 local-only standalone receipt void mutation under marker DEV08G-AP-20260527T000000 for quantity 3.0000. No production, no beta, no customer data.
```

## Local-Only Target Proof

- The guarded stdin runner classified `apps/api/.env` as approved local database target before importing write-capable services:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- The runner refused non-local targets before loading `PurchaseReceiptService`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Service Call

The runner instantiated the real service after local-target and approval guards, then made one write-capable service call:

- `PurchaseReceiptService.void(...)`: `1`.

No `PurchaseReceiptService.create(...)`, `postInventoryAsset(...)`, `reverseInventoryAsset(...)`, purchase bill service, generated document service, email service, ZATCA service, migration, seed, reset, delete, deploy, or login/browser flow was called.

## Receipt Result

- Receipt number: `PRC-000007`.
- Safe prefix: `d963e3c6`.
- Status before mutation: `POSTED`.
- Status after mutation: `VOIDED`.
- `voidedAt`: present.
- Inventory asset journal link: absent.

Void stock movement:

- Safe prefix: `33ab2606`.
- Type: `ADJUSTMENT_OUT`.
- Quantity: `3.0000`.
- Reference type: `PurchaseReceiptVoid`.
- Reference receipt safe prefix: `d963e3c6`.

## Side-Effect Results

- Stock on hand: `3.0000 -> 0.0000`.
- Stock movements for the selected item and warehouse: `5 -> 6`.
- Void stock movements for `PRC-000007`: `0 -> 1`.
- Journal entries directly tied to the marker or standalone receipt: `0 -> 0`.
- Generated documents for the standalone receipt or marker: `0 -> 0`.
- Marker email outbox rows: `0 -> 0`.
- Selected receipt ZATCA audit rows: `0 -> 0`.
- Selected receipt `PURCHASE_RECEIPT_CREATED` audit rows: `1 -> 1`.
- Selected receipt `PURCHASE_RECEIPT_VOIDED` audit rows: `0 -> 1`.
- Selected receipt asset-post/reversal audit rows: `0 -> 0`.

## Runner Notes And Cleanup

- The void mutation was run through an inline `tsx` stdin script, not a persisted script file.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline guarded `tsx` void-mutation script run from stdin with exact approval supplied through `DEV08G_PART29_APPROVAL`.
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

`DEV-08G Part 30: standalone receipt void evidence verification`
