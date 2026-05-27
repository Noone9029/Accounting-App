# DEV-08F Inventory-Clearing Purchase Bill Void Evidence Verification

## Purpose And Scope

This document records DEV-08F Part 24: read-only verification of the Part 23 inventory-clearing purchase bill void.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Target accepted by local guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No runtime mutation, generated document, PDF/archive/export/download, email, ZATCA, login/browser, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, hosted/shared target, customer-data, full test, full build, E2E, or smoke action was run.

## Verification Conclusion

Verified.

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Bill safe prefix | `04b3f131` |
| Status | `VOIDED` |
| Balance due | `0.0000` |
| Original journal safe prefix | `3fff12bc` |
| Reversal journal safe prefix | `30f40b4c` |

Linked receipt:

| Receipt | Safe prefix | Status |
| --- | --- | --- |
| `PRC-000004` | `993adc10` | `VOIDED` |

## Journal Verification

Original bill journal:

| Field | Result |
| --- | --- |
| Journal entry | `JE-000064` |
| Journal safe prefix | `3fff12bc` |
| Status | `REVERSED` |
| Reversed by safe prefix | `30f40b4c` |

Bill reversal journal:

| Field | Result |
| --- | --- |
| Journal entry | `JE-000067` |
| Journal safe prefix | `30f40b4c` |
| Status | `POSTED` |
| Reversal of safe prefix | `3fff12bc` |
| Total debit | `1150.0000` |
| Total credit | `1150.0000` |

Reversal lines:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `210` accounts payable | `1150.0000` | `0.0000` |
| 2 | `230` VAT receivable | `0.0000` | `150.0000` |
| 3 | `240` inventory clearing | `0.0000` | `1000.0000` |

## Audit And Side-Effect Verification

Purchase bill audit actions:

- `PURCHASE_BILL_CREATED`
- `PURCHASE_BILL_FINALIZED`
- `PURCHASE_BILL_VOIDED`

Purchase receipt audit actions:

- `PURCHASE_RECEIPT_CREATED`
- `PURCHASE_RECEIPT_ASSET_POSTED`
- `PURCHASE_RECEIPT_ASSET_REVERSED`
- `PURCHASE_RECEIPT_VOIDED`

Counts:

| Check | Count |
| --- | ---: |
| DEV-08F marker bills | `1` |
| Non-voided receipts for bill | `0` |
| Bill reversal journals | `1` |
| Generated documents for bill | `0` |
| Stock movements directly for bill | `0` |

## Temporary Script Cleanup

- No Part 24 temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma readback from `apps/api`.

## Commands Skipped And Why

- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 25: inventory-clearing purchase bill and receipt closure`
