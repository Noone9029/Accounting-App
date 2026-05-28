# DEV-08G Standalone Receipt Void Evidence Verification

## Purpose And Scope

This document records DEV-08G Part 30: read-only verification of the standalone receipt void evidence.

- Task: `DEV-08G Part 30: standalone receipt void evidence verification`.
- Latest commit inspected before verification: `d194173e Void DEV-08G standalone receipt locally`.
- Local `HEAD` matched `origin/main`: `d194173e44a4c2e5b545c38165bdbf695bb73c4f`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This verification did not create, post, void, reverse, mutate, export, download, generate documents, send email, run ZATCA, run login/browser flows, run migrations, run seed/reset/delete, deploy, or change environment/provider/schema settings.

## Receipt Verification

- Receipt number: `PRC-000007`.
- Safe prefix: `d963e3c6`.
- Status: `VOIDED`.
- `voidedAt`: present.
- Inventory asset journal link: absent.
- Inventory asset reversal journal link: absent.

Original stock movement:

- Safe prefix: `2ebd05ff`.
- Type: `PURCHASE_RECEIPT_PLACEHOLDER`.
- Quantity: `3.0000`.
- Reference type: `PurchaseReceipt`.
- Reference receipt safe prefix: `d963e3c6`.

Void stock movement:

- Safe prefix: `33ab2606`.
- Type: `ADJUSTMENT_OUT`.
- Quantity: `3.0000`.
- Reference type: `PurchaseReceiptVoid`.
- Reference receipt safe prefix: `d963e3c6`.

## Side-Effect Verification

- Journal entries directly tied to the marker or standalone receipt: `0`.
- Generated documents for the standalone receipt or marker: `0`.
- Marker email outbox rows: `0`.
- Selected receipt ZATCA audit rows: `0`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

Audit counts for `PRC-000007`:

- `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED`: `1`.
- `PurchaseReceipt` `PURCHASE_RECEIPT_VOIDED`: `1`.
- Purchase receipt asset-post or asset-reversal audit actions: `0`.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git log -1 --oneline`.
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

`DEV-08G Part 31: purchase receipt inventory integration closure`
