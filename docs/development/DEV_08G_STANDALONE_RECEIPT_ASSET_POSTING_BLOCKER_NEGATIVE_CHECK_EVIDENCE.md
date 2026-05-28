# DEV-08G Standalone Receipt Asset Posting Blocker Negative Check Evidence

## Purpose And Scope

This document records DEV-08G Part 26: the approved local-only standalone receipt asset-posting blocker negative check.

- Task: `DEV-08G Part 26: approved local standalone receipt asset-posting blocker negative check`.
- Latest commit inspected before the negative check: `72612e87 Plan DEV-08G standalone receipt asset posting blocker`.
- Local `HEAD` matched `origin/main`: `72612e87751b4f51b5c3fdf15ce05f4df30b6ac5`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation attempted: yes, exactly one expected-to-fail asset-posting service call.
- Persisted mutation result: blocked; no receipt state change, no journal, no generated document, no email, no ZATCA, and no asset audit action.
- This negative check did not create a purchase receipt, void a receipt, reverse inventory asset, create a purchase bill, run migration/seed/reset/delete, deploy, change environment/provider/schema settings, use production, use beta, use hosted/shared targets, or use customer data.

## Approval Phrase Status

Exact approval phrase received in the DEV-08G approval bundle and checked before importing write-capable services:

```text
I approve DEV-08G Part 26 local-only standalone receipt asset-posting blocker negative check under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.
```

## Local-Only Target Proof

- The guarded stdin runner classified `apps/api/.env` as approved local database target before importing write-capable services:
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
- The runner refused non-local targets before loading `PurchaseReceiptService`.
- No database URL, token, cookie, auth header, request body, response body, customer/vendor data, document body, attachment body, email body, signed XML, or QR payload was printed.

## Negative Check Result

The runner instantiated the real service after local-target and approval guards, then made one expected-to-fail service call:

- `PurchaseReceiptService.postInventoryAsset(...)`: `1`.

Observed blocker:

```text
Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.
```

No `PurchaseReceiptService.create(...)`, `PurchaseReceiptService.void(...)`, `reverseInventoryAsset(...)`, purchase bill service, generated document service, email service, ZATCA service, migration, seed, reset, delete, deploy, or login/browser flow was called.

## State Unchanged Proof

Selected receipt:

- Receipt number: `PRC-000007`.
- Safe prefix: `d963e3c6`.
- Status: `POSTED -> POSTED`.
- Purchase bill link: absent.
- Inventory asset journal link: absent.

Unchanged counts:

- Stock movements for the selected item and warehouse: `5 -> 5`.
- Journal entries directly tied to the marker or standalone receipt: `0 -> 0`.
- Generated documents for the standalone receipt or marker: `0 -> 0`.
- Marker email outbox rows: `0 -> 0`.
- Selected receipt ZATCA audit rows: `0 -> 0`.
- Selected receipt `PURCHASE_RECEIPT_CREATED` audit rows: `1 -> 1`.
- Selected receipt asset-post/reversal audit rows: `0 -> 0`.

## Runner Notes And Cleanup

- The negative check was run through an inline `tsx` stdin script, not a persisted script file.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Read-only prompt inspection with `Get-Content`.
- Inline guarded `tsx` negative-check script run from stdin with exact approval supplied through `DEV08G_PART26_APPROVAL`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08g*' -Force`.

## Commands Skipped

- Purchase receipt creation.
- Purchase receipt voiding.
- Inventory asset reversal.
- Purchase bill creation/conversion/finalization.
- Journal posting beyond the single expected-to-fail blocker check.
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

`DEV-08G Part 27: standalone receipt asset-posting blocker evidence verification`
