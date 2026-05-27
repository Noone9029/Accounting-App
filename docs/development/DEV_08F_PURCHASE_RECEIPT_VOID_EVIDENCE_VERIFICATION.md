# DEV-08F Purchase Receipt Void Evidence Verification

## Purpose And Scope

This document records DEV-08F Part 21: read-only verification of the Part 20 purchase receipt void.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Target accepted by local guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No purchase bill void, stock movement mutation, journal mutation, generated document, PDF/archive/export/download, email, ZATCA, login/browser, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, hosted/shared target, customer-data, full test, full build, E2E, or smoke action was run.

## Verification Conclusion

Verified.

| Field | Result |
| --- | --- |
| Purchase receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `VOIDED` |
| `voidedAt` | present |
| Inventory asset journal safe prefix | `75a6c7c3` |
| Inventory asset journal status | `REVERSED` |
| Inventory asset reversal journal safe prefix | `71495866` |
| Inventory asset reversal journal status | `POSTED` |

Receipt line and void movement:

| Field | Result |
| --- | --- |
| Receipt line safe prefix | `61b842a9` |
| Original stock movement safe prefix | `a7708ad8` |
| Void stock movement safe prefix | `426c6ba0` |
| Void stock movement type | `ADJUSTMENT_OUT` |
| Quantity | `10.0000` |
| Total cost | `1000.0000` |

## Audit And Side-Effect Verification

Purchase receipt audit actions:

- `PURCHASE_RECEIPT_CREATED`
- `PURCHASE_RECEIPT_ASSET_POSTED`
- `PURCHASE_RECEIPT_ASSET_REVERSED`
- `PURCHASE_RECEIPT_VOIDED`

Counts:

| Check | Count |
| --- | ---: |
| Non-voided receipts for bill | `0` |
| Void stock movements for receipt | `1` |
| Generated documents for receipt | `0` |

## Temporary Script Cleanup

- No Part 21 temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma readback from `apps/api`.

## Commands Skipped And Why

- Purchase bill voiding: reserved for DEV-08F Part 23 after Part 22 preflight.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 22: inventory-clearing purchase bill void preflight`
