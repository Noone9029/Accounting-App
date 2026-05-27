# DEV-08F Purchase Receipt Void Preflight

## Purpose And Scope

This document records DEV-08F Part 19: read-only preflight for voiding the purchase receipt after inventory asset reversal.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Target accepted by local guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No receipt void, stock movement mutation, journal mutation, generated document, PDF/archive/export/download, email, ZATCA, login/browser, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, hosted/shared target, customer-data, full test, full build, E2E, or smoke action was run.

## Current Receipt State

| Field | Result |
| --- | --- |
| Purchase receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `POSTED` |
| Warehouse safe prefix | `197fac56` |
| Inventory asset journal safe prefix | `75a6c7c3` |
| Inventory asset journal status | `REVERSED` |
| Inventory asset reversal journal safe prefix | `71495866` |
| Inventory asset reversal journal status | `POSTED` |
| `voidedAt` | absent |

## Stock Sufficiency

| Field | Result |
| --- | --- |
| Item safe prefix | `175a7c7f` |
| Current quantity on hand | `23.0000` |
| Required void quantity | `10.0000` |
| Sufficient for void | `true` |
| Expected void stock movement type | `ADJUSTMENT_OUT` |

Current counts:

| Check | Count |
| --- | ---: |
| Void stock movements for receipt | `0` |
| Receipt void audits | `0` |
| Generated documents for receipt | `0` |

## Expected Part 20 Mutation

The approved Part 20 mutation should:

- Call `PurchaseReceiptService.void(...)` once.
- Change `PRC-000004` from `POSTED` to `VOIDED`.
- Set `voidedAt`.
- Create one outbound `ADJUSTMENT_OUT` stock movement for quantity `10.0000`.
- Link the outbound movement as the receipt line `voidStockMovementId`.
- Not create or change inventory asset journals because asset reversal has already occurred.

## Required Approval Phrase For Part 20

`I approve DEV-08F Part 20 local-only purchase receipt void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`

## Temporary Script Cleanup

- No Part 19 temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma readback from `apps/api`.
- Read-only stock movement quantity-on-hand calculation for the receipt item and warehouse.

## Commands Skipped And Why

- `PurchaseReceiptService.void(...)`: reserved for approved DEV-08F Part 20.
- Purchase bill voiding: reserved for DEV-08F Part 23.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 20: approved local purchase receipt void mutation`
