# DEV-08G Purchase Order Receipt Void Preflight

## Purpose And Scope

This document records DEV-08G Part 16: read-only preflight for voiding the DEV-08G purchase-order receipts.

- Task: `DEV-08G Part 16: purchase-order receipts void preflight`.
- Latest commit inspected before preflight: `558e5a59 Verify DEV-08G purchase order receipt asset posting blocker`.
- Local `HEAD` matched `origin/main`: `558e5a59ca8af2b4c9359ff8d8bf8b5d61cf98fb`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This preflight did not create, post, void, reverse, or mutate anything.

## Current Receipt State

- `PRC-000005`, safe prefix `1f412d79`, status `POSTED`, quantity `4.0000`, no asset journal, no void movement.
- `PRC-000006`, safe prefix `942e4907`, status `POSTED`, quantity `6.0000`, no asset journal, no void movement.

## Selected Part 17 Void

- Selected receipt to void first: `PRC-000006`.
- Selected receipt safe prefix: `942e4907`.
- Selected receipt quantity: `6.0000`.
- Expected void stock movement type: `ADJUSTMENT_OUT`.
- Stock on hand before void: `10.0000`.
- Expected stock on hand after void: `4.0000`.
- Stock sufficiency: yes.
- Expected receiving status after void: `PARTIAL`.
- Expected receipt matching status after void: `PARTIALLY_RECEIVED`.
- Expected remaining source quantity after void: `6.0000`.

## Baseline Counts

- Existing void stock movements for DEV-08G PO receipts: `0`.
- Existing receipt void audit actions for DEV-08G PO receipts: `0`.
- Journal entries directly tied to the marker or PO source: `0`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Required Part 17 Approval Phrase

Exact approval phrase required before any Part 17 void mutation:

```text
I approve DEV-08G Part 17 local-only purchase-order receipt void mutation under marker DEV08G-AP-20260527T000000 for the 6.0000 receipt. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 17 must still re-check it before importing write-capable services or running the guarded mutation path.

## Commands Run

- `git status --short --branch`.
- `git log -2 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma preflight script run through `node -`.

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

`DEV-08G Part 17: approved local purchase-order receipt void mutation`
