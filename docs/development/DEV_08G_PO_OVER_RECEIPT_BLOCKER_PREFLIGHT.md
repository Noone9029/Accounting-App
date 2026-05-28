# DEV-08G Purchase Order Over-Receipt Blocker Preflight

## Purpose And Scope

This document records DEV-08G Part 10: read-only preflight for the purchase order over-receipt negative check.

- Task: `DEV-08G Part 10: purchase order over-receipt blocker preflight`.
- Latest commit inspected before preflight: `55ff99ea Verify DEV-08G remaining purchase order receipt`.
- Local `HEAD` matched `origin/main`: `55ff99ea4e11ae978e7ad62909299b5b6cac5a92`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries and service-code inspection only.
- This preflight did not create, post, void, reverse, or mutate anything.

## Local-Only Target Proof

- `apps/api/.env` classified as approved local database target:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Current Source State

- Purchase order number: `PO-000003`.
- Purchase order safe prefix: `a3efc2e4`.
- Status: `APPROVED`.
- Source line safe prefix: `22f17076`.
- Source quantity: `10.0000`.
- Non-voided received quantity: `10.0000`.
- Remaining quantity: `0.0000`.
- Receiving status: `COMPLETE`.
- Receipt matching status: `FULLY_RECEIVED`.

## Expected Negative Check

- Future requested excess quantity: `1.0000`.
- Remaining quantity before the negative check: `0.0000`.
- Expected blocker message: `Receipt quantity cannot exceed the remaining source quantity.`
- Blocker code path: `PurchaseReceiptService.prepareLines(...)` compares the requested receipt quantity to `remainingReceiptQuantity(...)` before receipt creation and before stock movement creation.
- Expected persisted state after the negative check: unchanged.

## Baseline Counts

- Purchase receipts for the PO: `2`.
- Stock movements for the fixture item: `2`.
- Journal entries directly tied to the marker or PO source: `0`.
- Generated documents for the fixture source ids or marker: `0`.
- Marker receipt audit actions: `2`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Required Part 11 Approval Phrase

Exact approval phrase required before any Part 11 negative-check service call:

```text
I approve DEV-08G Part 11 local-only purchase order over-receipt blocker negative check under marker DEV08G-AP-20260527T000000 for excess quantity 1.0000. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 11 must still re-check it before importing write-capable services or running the guarded negative-check path.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma preflight script run through `node -`.
- Read-only service-code inspection of `PurchaseReceiptService.prepareLines(...)` and `remainingReceiptQuantity(...)`.

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

`DEV-08G Part 11: approved local purchase order over-receipt blocker negative check`
