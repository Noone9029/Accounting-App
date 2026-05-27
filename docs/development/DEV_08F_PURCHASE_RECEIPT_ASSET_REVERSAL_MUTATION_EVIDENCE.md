# DEV-08F Purchase Receipt Inventory Asset Reversal Mutation Evidence

## Purpose And Scope

This document records DEV-08F Part 17: approved local-only reversal of the purchase receipt inventory asset posting.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Approved mutation: reverse the inventory asset journal for `PRC-000004`.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, receipt voiding, purchase bill voiding, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before mutation:
  `I approve DEV-08F Part 17 local-only purchase receipt inventory asset reversal mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Write-capable service imports occurred only after the local target guard passed.

## Before State

| Field | Result |
| --- | --- |
| Receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `POSTED` |
| Inventory asset journal safe prefix | `75a6c7c3` |
| Inventory asset reversal journal | absent |
| Asset reversal journals | `0` |
| Void stock movements | `0` |

## Mutation Result

`PurchaseReceiptService.reverseInventoryAsset(...)` was called once.

| Field | Result |
| --- | --- |
| Purchase receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `POSTED` |
| Inventory asset journal safe prefix | `75a6c7c3` |
| Inventory asset reversal journal safe prefix | `71495866` |
| `inventoryAssetReversedAt` | present |

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

## Audit And Side-Effect Evidence

Purchase receipt audit actions:

- `PURCHASE_RECEIPT_CREATED`
- `PURCHASE_RECEIPT_ASSET_POSTED`
- `PURCHASE_RECEIPT_ASSET_REVERSED`

Counts after reversal:

| Check | Count |
| --- | ---: |
| Asset reversal journals for receipt | `1` |
| Void stock movements for receipt | `0` |
| Generated documents for receipt | `0` |

## Temporary Script Cleanup

- No temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only service runner from `apps/api`.
- `PurchaseReceiptService.reverseInventoryAsset(...)` against `PRC-000004`.
- Source-scoped Prisma readback after reversal.

## Commands Skipped And Why

- Successful receipt void: reserved for DEV-08F Part 20 after Part 19 preflight.
- Purchase bill voiding: reserved for DEV-08F Part 23.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 18: purchase receipt inventory asset reversal evidence verification`

## Part 18 Verification Result

- DEV-08F Part 18 read-only asset reversal verification is recorded in [DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_EVIDENCE_VERIFICATION.md](DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_EVIDENCE_VERIFICATION.md).
- Verification conclusion: verified.
- `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; `inventoryAssetReversedAt` present; `voidedAt` absent.
- Original asset journal `JE-000065`, safe prefix `75a6c7c3`, remained `REVERSED`.
- Reversal journal `JE-000066`, safe prefix `71495866`, remained `POSTED`, balanced debit/credit `1000.0000`.
- Void stock movements and generated documents remained `0`.
- Exact next prompt title: `DEV-08F Part 19: purchase receipt void preflight`.
