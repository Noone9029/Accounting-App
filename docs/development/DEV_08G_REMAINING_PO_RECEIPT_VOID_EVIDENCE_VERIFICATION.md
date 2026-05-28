# DEV-08G Remaining Purchase Order Receipt Void Evidence Verification

## Purpose And Scope

This document records DEV-08G Part 21: read-only verification that both DEV-08G purchase-order receipts are voided and the source returned to a not-received state.

- Task: `DEV-08G Part 21: remaining purchase-order receipt void evidence verification`.
- Latest commit inspected before verification: `80e7030f Void DEV-08G remaining purchase order receipt locally`.
- Local `HEAD` matched `origin/main`: `80e7030ffc88b4f30ef35b0021ed84f45c433559`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This verification did not create, post, void, reverse, mutate, export, download, generate documents, send email, run ZATCA, run login/browser flows, run migrations, run seed/reset/delete, deploy, or change environment/provider/schema settings.

## Receipt Verification

Both DEV-08G purchase-order receipts are voided:

- `PRC-000005`: safe prefix `1f412d79`, quantity `4.0000`, status `VOIDED`, `voidedAt` present.
- `PRC-000006`: safe prefix `942e4907`, quantity `6.0000`, status `VOIDED`, `voidedAt` present.

## Stock Movement Verification

Original receipt stock movements:

- Safe prefix `39a7350e`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `4.0000`, reference type `PurchaseReceipt`, receipt safe prefix `1f412d79`.
- Safe prefix `e0ffd378`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `6.0000`, reference type `PurchaseReceipt`, receipt safe prefix `942e4907`.

Void stock movements:

- Safe prefix `9456b1ca`, type `ADJUSTMENT_OUT`, quantity `4.0000`, reference type `PurchaseReceiptVoid`, receipt safe prefix `1f412d79`.
- Safe prefix `3317628d`, type `ADJUSTMENT_OUT`, quantity `6.0000`, reference type `PurchaseReceiptVoid`, receipt safe prefix `942e4907`.

## Source Receiving And Matching Verification

- Source purchase order: `PO-000003`.
- Non-voided DEV-08G PO receipt count: `0`.
- Received quantity: `0.0000`.
- Remaining quantity: `10.0000`.
- Receiving status: `NOT_STARTED`.
- Receipt matching status: `NOT_RECEIVED`.

## Side-Effect Verification

- Asset journal links on both receipts: absent.
- Journal entries directly tied to the marker or selected receipts: `0`.
- Generated documents for selected receipts or marker: `0`.
- Marker email outbox rows: `0`.
- Selected receipt ZATCA audit rows: `0`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

Audit counts:

- `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED`: `2`.
- `PurchaseReceipt` `PURCHASE_RECEIPT_VOIDED`: `2`.
- Purchase receipt asset-post or asset-reversal audit actions: `0`.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma verification script run through `node -`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08g*' -Force`.

## Commands Skipped

- Purchase receipt creation.
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

`DEV-08G Part 22: standalone purchase receipt preflight`
