# DEV-08G Standalone Receipt Void Preflight

## Purpose And Scope

This document records DEV-08G Part 28: read-only preflight for voiding the standalone purchase receipt.

- Task: `DEV-08G Part 28: standalone receipt void preflight`.
- Latest commit inspected before preflight: `a3647be4 Verify DEV-08G standalone receipt asset posting blocker`.
- Local `HEAD` matched `origin/main`: `a3647be42b7141af61d5357bf654e8a4cde4ecd5`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries only.
- This preflight did not create, post, void, reverse, mutate, export, download, generate documents, send email, run ZATCA, run login/browser flows, run migrations, run seed/reset/delete, deploy, or change environment/provider/schema settings.

## Selected Receipt

- Receipt number: `PRC-000007`.
- Safe prefix: `d963e3c6`.
- Status: `POSTED`.
- Quantity: `3.0000`.
- Inventory asset journal link: absent.
- Inventory asset reversal journal link: absent.
- Void stock movement link: absent.

## Stock Sufficiency

- Stock movements for the selected item and warehouse: `5`.
- Stock on hand before void: `3.0000`.
- Selected void quantity: `3.0000`.
- Expected stock on hand after void: `0.0000`.
- Stock sufficiency: yes.
- Expected void stock movement type: `ADJUSTMENT_OUT`.
- Expected void stock movement quantity: `3.0000`.
- Expected void reference type: `PurchaseReceiptVoid`.

## Baseline Counts

- Existing void stock movements for `PRC-000007`: `0`.
- Existing `PURCHASE_RECEIPT_VOIDED` audit rows for `PRC-000007`: `0`.
- Journal entries directly tied to the marker or standalone receipt: `0`.
- Generated documents for the standalone receipt or marker: `0`.
- Marker email outbox rows: `0`.
- Selected receipt ZATCA audit rows: `0`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Required Part 29 Approval Phrase

Exact approval phrase required before any Part 29 void mutation:

```text
I approve DEV-08G Part 29 local-only standalone receipt void mutation under marker DEV08G-AP-20260527T000000 for quantity 3.0000. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 29 must still re-check it before importing write-capable services or running the guarded mutation path.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git log -1 --oneline`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only Prisma preflight script run through `node -`.
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

`DEV-08G Part 29: approved local standalone receipt void mutation`

## Part 29 Mutation Note

DEV-08G Part 29 completed the approved local-only standalone receipt void mutation.

- Mutation evidence: [DEV_08G_STANDALONE_RECEIPT_VOID_MUTATION_EVIDENCE.md](DEV_08G_STANDALONE_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Latest commit inspected before mutation: `fd93bba7 Plan DEV-08G standalone receipt void`.
- Exact Part 29 approval phrase was checked before importing write-capable services.
- Exactly one `PurchaseReceiptService.void(...)` call was made.
- `PRC-000007` safe prefix `d963e3c6` changed `POSTED -> VOIDED` with `voidedAt` present.
- Void stock movement safe prefix `33ab2606` was created as `ADJUSTMENT_OUT` quantity `3.0000`.
- Stock on hand changed `3.0000 -> 0.0000`.
- Journal, generated document, marker email, selected receipt ZATCA, selected receipt create-audit, and asset-audit counts were unchanged; selected receipt void audit count changed `0 -> 1`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 30: standalone receipt void evidence verification`.
