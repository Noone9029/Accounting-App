# DEV-08G Standalone Purchase Receipt Mutation Evidence

## Purpose And Scope

This document records DEV-08G Part 23: the approved local-only standalone purchase receipt mutation.

- Task: `DEV-08G Part 23: approved local standalone purchase receipt mutation`.
- Latest commit inspected before mutation: `8fd401ae Plan DEV-08G standalone purchase receipt`.
- Local `HEAD` matched `origin/main`: `8fd401ae0e04b9f1e516b376f37557b49deec55d`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Allowed mutation used: exactly one `PurchaseReceiptService.create(...)` call for one standalone receipt.
- This mutation did not link the receipt to a purchase order or purchase bill, post inventory asset, create a journal entry, create generated document/PDF/archive/export/download output, send email, create ZATCA artifacts, run a login/browser flow, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked by the guarded runner before mutation:

```text
I approve DEV-08G Part 23 local-only standalone purchase receipt mutation under marker DEV08G-AP-20260527T000000 for quantity 3.0000. No production, no beta, no customer data.
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

- `PurchaseReceiptService.create(...)`: `1`.

No `postInventoryAsset(...)`, `reverseInventoryAsset(...)`, purchase receipt void, purchase bill service, generated document service, email service, ZATCA service, migration, seed, reset, delete, deploy, or login/browser flow was called.

## Standalone Receipt Result

- Receipt number: `PRC-000007`.
- Safe prefix: `d963e3c6`.
- Status: `POSTED`.
- Supplier safe prefix: `f5deec9a`.
- Warehouse safe prefix: `197fac56`.
- Purchase order link: absent.
- Purchase bill link: absent.
- Inventory asset journal link: absent.
- Inventory asset reversal journal link: absent.

Receipt line:

- Item safe prefix: `3b8d7650`.
- Quantity: `3.0000`.
- Unit cost: `90.0000`.

Stock movement:

- Safe prefix: `2ebd05ff`.
- Type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Quantity: `3.0000`.
- Reference type: `PurchaseReceipt`.
- Reference receipt safe prefix: `d963e3c6`.

## Side-Effect Results

- Standalone DEV-08G purchase receipts: `0 -> 1`.
- Stock movements for the selected item and warehouse: `4 -> 5`.
- Journal entries directly tied to the marker or new receipt: `0 -> 0`.
- Generated documents for the new receipt or marker: `0`.
- Marker email outbox rows: `0`.
- Broad existing ZATCA audit count in the local org: `23 -> 23`.
- Selected receipt `PURCHASE_RECEIPT_CREATED` audit rows: `1`.
- Existing purchase receipt creation audit rows in the local org: `6 -> 7`.

## Runner Notes And Cleanup

- Temporary runner path: `apps/api/scripts/dev08g-part23-runner.ts`.
- The runner was removed after successful execution.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git log -1 --oneline`.
- Read-only prompt inspection with `Get-Content`.
- `corepack pnpm exec tsx scripts/dev08g-part23-runner.ts` with exact approval supplied through `DEV08G_PART23_APPROVAL`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08g*' -Force`.

## Commands Skipped

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

`DEV-08G Part 24: standalone purchase receipt evidence verification`
