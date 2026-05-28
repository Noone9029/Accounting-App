# DEV-08G Remaining Purchase Order Receipt Void Preflight

## Purpose And Scope

This document records DEV-08G Part 19: read-only preflight for voiding the remaining `4.0000` purchase-order receipt.

- Task: `DEV-08G Part 19: remaining purchase-order receipt void preflight`.
- Latest commit inspected before preflight: `91ccd67a Verify DEV-08G purchase order receipt void`.
- Local `HEAD` matched `origin/main`: `91ccd67aa0b742bc53815f0d98450a4c63fbf25f`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This preflight did not create, post, void, reverse, or mutate anything.

## Selected Receipt

- Receipt number: `PRC-000005`.
- Safe prefix: `1f412d79`.
- Status: `POSTED`.
- Quantity: `4.0000`.
- Inventory asset journal linked: `false`.
- Void stock movement linked: `false`.

## Stock Sufficiency

- Stock on hand before void: `4.0000`.
- Selected void quantity: `4.0000`.
- Expected stock on hand after void: `0.0000`.
- Stock sufficiency: yes.
- Expected void stock movement type: `ADJUSTMENT_OUT`.

## Expected Final PO Receiving State

- Expected received quantity after void: `0.0000`.
- Expected remaining quantity after void: `10.0000`.
- Expected receiving status after void: `NOT_STARTED`.
- Expected receipt matching status after void: `NOT_RECEIVED`.

## Baseline Counts

- Existing DEV-08G PO receipt void movements: `1`.
- Existing DEV-08G PO receipt void audit actions: `1`.
- Journal entries directly tied to the marker or PO source: `0`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Required Part 20 Approval Phrase

Exact approval phrase required before any Part 20 void mutation:

```text
I approve DEV-08G Part 20 local-only remaining purchase-order receipt void mutation under marker DEV08G-AP-20260527T000000 for the 4.0000 receipt. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 20 must still re-check it before importing write-capable services or running the guarded mutation path.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma preflight script run through `node -`.
- Inline read-only DEV-08G receipt void movement/audit count check run through `node -`.

## Commands Skipped

- Purchase receipt voiding.
- Inventory asset posting.
- Inventory asset reversal.
- Purchase receipt creation.
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

`DEV-08G Part 20: approved local remaining purchase-order receipt void mutation`

## Part 20 Mutation Note

DEV-08G Part 20 completed the approved local-only void mutation for the remaining `4.0000` purchase-order receipt.

- Mutation evidence: [DEV_08G_REMAINING_PO_RECEIPT_VOID_MUTATION_EVIDENCE.md](DEV_08G_REMAINING_PO_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Latest commit inspected before mutation: `90b69e4c Plan DEV-08G remaining purchase order receipt void`.
- Exact Part 20 approval phrase was checked before importing write-capable services.
- `PRC-000005` safe prefix `1f412d79` changed `POSTED -> VOIDED` with `voidedAt` present.
- Void stock movement safe prefix `9456b1ca` was created as `ADJUSTMENT_OUT` quantity `4.0000`.
- Non-voided DEV-08G PO receipt count is now `0`.
- Final PO state: received `0.0000`, remaining `10.0000`, receiving `NOT_STARTED`, matching `NOT_RECEIVED`.
- Journal entries tied to the marker or PO source remained `0`; generated documents for selected receipts or marker remained `0`; marker email rows remained `0`; broad existing ZATCA audit count was unchanged.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 21: remaining purchase-order receipt void evidence verification`.
