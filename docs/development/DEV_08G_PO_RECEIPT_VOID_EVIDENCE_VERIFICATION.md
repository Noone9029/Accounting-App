# DEV-08G Purchase Order Receipt Void Evidence Verification

## Purpose And Scope

This document records DEV-08G Part 18: read-only verification of the `6.0000` purchase-order receipt void.

- Task: `DEV-08G Part 18: purchase-order receipt void evidence verification`.
- Latest commit inspected before verification: `87ed54a9 Void DEV-08G purchase order receipt locally`.
- Local `HEAD` matched `origin/main`: `87ed54a970269622b5ebed26862b94f769321057`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This verification did not create, post, void, reverse, or mutate anything.

## Verification Result

The `6.0000` receipt void is verified.

- `PRC-000006` is `VOIDED`.
- `PRC-000005` remains `POSTED`.
- Void stock movement exists for quantity `6.0000`.
- Receiving and matching returned to partial.
- No journal, generated document, email, or ZATCA side effect exists.

## Receipt And Stock State

- `PRC-000005`, safe prefix `1f412d79`, status `POSTED`, quantity `4.0000`, no void movement.
- `PRC-000006`, safe prefix `942e4907`, status `VOIDED`, quantity `6.0000`, `voidedAt` present.
- Void stock movement safe prefix: `3317628d`.
- Void stock movement type: `ADJUSTMENT_OUT`.
- Void stock movement quantity: `6.0000`.

## Receiving And Matching Result

- Non-voided received quantity: `4.0000`.
- Remaining quantity: `6.0000`.
- Receiving status: `PARTIAL`.
- Receipt matching status: `PARTIALLY_RECEIVED`.

## Side-Effect Results

- Journal entries directly tied to marker or PO source: `0`.
- Generated documents for the receipts or marker: `0`.
- Email outbox rows for marker: `0`.
- ZATCA fixture audit actions for the receipts: `0`.

Audit actions for the two PO receipts:

- `PurchaseReceipt` `PURCHASE_RECEIPT_CREATED`: `2`.
- `PurchaseReceipt` `PURCHASE_RECEIPT_VOIDED`: `1`.

## Temporary Script Cleanup

- `Get-ChildItem apps/api/scripts -File` filtered for `dev08g` returned no files.
- Part 18 used inline read-only Prisma verification and did not create a temporary script file.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma verification script run through `node -`.

## Commands Skipped

- Purchase receipt voiding.
- Inventory asset posting.
- Inventory asset reversal.
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

`DEV-08G Part 19: remaining purchase-order receipt void preflight`
