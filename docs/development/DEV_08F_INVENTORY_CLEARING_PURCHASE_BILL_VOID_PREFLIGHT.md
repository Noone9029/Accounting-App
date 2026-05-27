# DEV-08F Inventory-Clearing Purchase Bill Void Preflight

## Purpose And Scope

This document records DEV-08F Part 22: read-only preflight for voiding the inventory-clearing purchase bill after receipt void.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Target accepted by local guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No purchase bill void, stock movement mutation, journal mutation, generated document, PDF/archive/export/download, email, ZATCA, login/browser, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, hosted/shared target, customer-data, full test, full build, E2E, or smoke action was run.

## Current Bill State

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Bill safe prefix | `04b3f131` |
| Status | `FINALIZED` |
| Inventory posting mode | `INVENTORY_CLEARING` |
| Balance due | `1150.0000` |
| Original journal | `JE-000064` |
| Original journal safe prefix | `3fff12bc` |
| Original journal status | `POSTED` |
| Reversal journal | absent |

Receipt state:

| Receipt | Safe prefix | Status |
| --- | --- | --- |
| `PRC-000004` | `993adc10` | `VOIDED` |

## Void Readiness

| Check | Count |
| --- | ---: |
| Active supplier payment allocations | `0` |
| Active purchase debit note allocations | `0` |
| Active supplier unapplied payment allocations | `0` |
| Non-voided receipts for bill | `0` |
| Generated documents for bill | `0` |

## Fiscal And Sequence Baseline

- Fiscal period for the bill void reversal date: `2026`.
- Fiscal period status: `OPEN`.
- Fiscal period date range: `2026-01-01` through `2026-12-31`.
- Expected bill reversal journal number if no intervening sequence write occurs before Part 23: `JE-000067`.

## Expected Part 23 Mutation

The approved Part 23 mutation should:

- Call `PurchaseBillService.void(...)` once.
- Change `BILL-000009` from `FINALIZED` to `VOIDED`.
- Set balance due to `0.0000`.
- Create one posted reversal journal reversing `JE-000064`.
- Mark original journal `JE-000064` as `REVERSED`.
- Not create purchase receipts, stock movements, generated documents, email, ZATCA, or cleanup/delete artifacts.

## Required Approval Phrase For Part 23

`I approve DEV-08F Part 23 local-only inventory-clearing purchase bill void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`

## Temporary Script Cleanup

- No Part 22 temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma readback from `apps/api`.

## Commands Skipped And Why

- `PurchaseBillService.void(...)`: reserved for approved DEV-08F Part 23.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 23: approved local inventory-clearing purchase bill void mutation`

## Part 23 Mutation Result

- DEV-08F Part 23 local-only bill void evidence is recorded in [DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).
- `PurchaseBillService.void(...)` was called once.
- `BILL-000009`, safe prefix `04b3f131`, changed `FINALIZED -> VOIDED`; balance due changed `1150.0000 -> 0.0000`.
- Original bill journal `JE-000064`, safe prefix `3fff12bc`, changed `POSTED -> REVERSED`.
- Bill reversal journal `JE-000067`, safe prefix `30f40b4c`, is `POSTED`, balanced debit/credit `1150.0000`, and reverses `JE-000064`.
- Non-voided receipts remained `0`; generated documents remained `0`; direct bill stock movements remained `0`.
- Exact next prompt title: `DEV-08F Part 24: inventory-clearing purchase bill void evidence verification`.
