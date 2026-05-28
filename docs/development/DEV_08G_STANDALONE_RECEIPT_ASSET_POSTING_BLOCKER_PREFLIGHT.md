# DEV-08G Standalone Receipt Asset Posting Blocker Preflight

## Purpose And Scope

This document records DEV-08G Part 25: read-only preflight for proving standalone receipt asset posting is blocked before any journal is created.

- Task: `DEV-08G Part 25: standalone receipt asset-posting blocker preflight`.
- Latest commit inspected before preflight: `3cf93b4a Verify DEV-08G standalone purchase receipt`.
- Local `HEAD` matched `origin/main`: `3cf93b4a943e7f9226fbc50779f7dc10c640c45c`.
- Branch inspected: `main`.
- Marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- Verification mode: read-only Prisma queries plus `PurchaseReceiptService.accountingPreview(...)`.
- This preflight did not call `postInventoryAsset(...)`, create a journal, create, post, void, reverse, mutate, export, download, generate documents, send email, run ZATCA, run login/browser flows, run migrations, run seed/reset/delete, deploy, or change environment/provider/schema settings.

## Selected Receipt

- Receipt number: `PRC-000007`.
- Safe prefix: `d963e3c6`.
- Status: `POSTED`.
- Purchase order link: absent.
- Purchase bill link: absent.
- Inventory asset journal link: absent.
- Inventory asset reversal journal link: absent.

## Preview Blocker

Read-only `PurchaseReceiptService.accountingPreview(...)` result:

- Posting status: `DESIGN_ONLY`.
- `canPost`: `false`.
- Expected blocker: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`

Expected Part 26 negative check:

- Attempt exactly one `PurchaseReceiptService.postInventoryAsset(...)` call.
- Expected error: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- Expected journal count after the blocked call: unchanged at `0`.
- Expected asset-post/reversal audit count after the blocked call: unchanged at `0`.

## Baseline Counts

- Stock movements for the selected item and warehouse: `5`.
- Journal entries directly tied to the marker or standalone receipt: `0`.
- Generated documents for the standalone receipt or marker: `0`.
- Marker email outbox rows: `0`.
- Selected receipt ZATCA audit rows: `0`.
- Selected receipt `PURCHASE_RECEIPT_CREATED` audit rows: `1`.
- Selected receipt asset-post/reversal audit rows: `0`.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.

## Required Part 26 Approval Phrase

Exact approval phrase required before any Part 26 negative-check service call:

```text
I approve DEV-08G Part 26 local-only standalone receipt asset-posting blocker negative check under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.
```

This phrase was included in the user's up-front DEV-08G approval bundle. Part 26 must still re-check it before importing write-capable services or running the guarded negative-check path.

## Commands Run

- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git log -1 --oneline`.
- Read-only prompt inspection with `Get-Content`.
- Inline read-only `tsx` preflight script run from stdin.
- `Get-ChildItem apps/api/scripts -Filter '*dev08g*' -Force`.

## Commands Skipped

- `PurchaseReceiptService.postInventoryAsset(...)`.
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

`DEV-08G Part 26: approved local standalone receipt asset-posting blocker negative check`

## Part 26 Negative Check Note

DEV-08G Part 26 completed the approved local-only standalone receipt asset-posting blocker negative check.

- Negative-check evidence: [DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Latest commit inspected before the negative check: `72612e87 Plan DEV-08G standalone receipt asset posting blocker`.
- Exact Part 26 approval phrase was checked before importing write-capable services.
- Exactly one `PurchaseReceiptService.postInventoryAsset(...)` call was attempted.
- Observed blocker: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- `PRC-000007` safe prefix `d963e3c6` remained `POSTED`.
- Inventory asset journal link remained absent.
- Stock movement, journal, generated document, marker email, selected receipt ZATCA, selected receipt create-audit, and asset-audit counts were unchanged.
- No `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 27: standalone receipt asset-posting blocker evidence verification`.
