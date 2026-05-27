# DEV-08F Purchase Receipt Inventory Asset Reversal Evidence Verification

## Purpose And Scope

This document records DEV-08F Part 18: read-only verification of the Part 17 purchase receipt inventory asset reversal.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Target accepted by local guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No receipt void, stock movement mutation, journal mutation, generated document, PDF/archive/export/download, email, ZATCA, login/browser, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, hosted/shared target, customer-data, full test, full build, E2E, or smoke action was run.

## Verification Conclusion

Verified.

| Field | Result |
| --- | --- |
| Purchase receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `POSTED` |
| Inventory asset journal safe prefix | `75a6c7c3` |
| Inventory asset reversal journal safe prefix | `71495866` |
| `inventoryAssetReversedAt` | present |
| `voidedAt` | absent |

Original asset journal:

| Field | Result |
| --- | --- |
| Journal entry | `JE-000065` |
| Journal safe prefix | `75a6c7c3` |
| Status | `REVERSED` |
| Reversed by safe prefix | `71495866` |

Reversal journal:

| Field | Result |
| --- | --- |
| Journal entry | `JE-000066` |
| Journal safe prefix | `71495866` |
| Status | `POSTED` |
| Reversal of safe prefix | `75a6c7c3` |
| Total debit | `1000.0000` |
| Total credit | `1000.0000` |

Reversal lines:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `130` inventory asset | `0.0000` | `1000.0000` |
| 2 | `240` inventory clearing | `1000.0000` | `0.0000` |

## Audit And Side-Effect Verification

Purchase receipt audit actions:

- `PURCHASE_RECEIPT_CREATED`
- `PURCHASE_RECEIPT_ASSET_POSTED`
- `PURCHASE_RECEIPT_ASSET_REVERSED`

Counts:

| Check | Count |
| --- | ---: |
| Asset journals for receipt | `1` |
| Asset reversal journals for receipt | `1` |
| Void stock movements for receipt | `0` |
| Generated documents for receipt | `0` |

## Temporary Script Cleanup

- No Part 18 temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma readback from `apps/api`.

## Commands Skipped And Why

- Successful receipt void: reserved for DEV-08F Part 20 after Part 19 preflight.
- Purchase bill voiding: reserved for DEV-08F Part 23.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 19: purchase receipt void preflight`
