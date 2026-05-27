# DEV-08F Purchase Receipt Void Mutation Evidence

## Purpose And Scope

This document records DEV-08F Part 20: approved local-only voiding of the purchase receipt after inventory asset reversal.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Approved mutation: void `PRC-000004` exactly once after asset reversal.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, purchase bill voiding, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before mutation:
  `I approve DEV-08F Part 20 local-only purchase receipt void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Write-capable service imports occurred only after the local target guard passed.

## Before State

| Field | Result |
| --- | --- |
| Receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `POSTED` |
| `voidedAt` | absent |
| Void stock movements | `0` |
| Receipt void audits | `0` |

## Mutation Result

`PurchaseReceiptService.void(...)` was called once.

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

## Void Stock Movement Evidence

| Field | Result |
| --- | --- |
| Receipt line safe prefix | `61b842a9` |
| Original stock movement safe prefix | `a7708ad8` |
| Void stock movement safe prefix | `426c6ba0` |
| Void stock movement type | `ADJUSTMENT_OUT` |
| Quantity | `10.0000` |
| Unit cost | `100.0000` |
| Total cost | `1000.0000` |
| Reference type | `PurchaseReceiptVoid` |
| Reference safe prefix | `993adc10` |

## Audit And Side-Effect Evidence

Purchase receipt audit actions:

- `PURCHASE_RECEIPT_CREATED`
- `PURCHASE_RECEIPT_ASSET_POSTED`
- `PURCHASE_RECEIPT_ASSET_REVERSED`
- `PURCHASE_RECEIPT_VOIDED`

Counts after void:

| Check | Count |
| --- | ---: |
| Void stock movements for receipt | `1` |
| Receipt void audits | `1` |
| Generated documents for receipt | `0` |

## Temporary Script Cleanup

- No temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only service runner from `apps/api`.
- `PurchaseReceiptService.void(...)` against `PRC-000004`.
- Source-scoped Prisma readback after receipt void.

## Commands Skipped And Why

- Purchase bill voiding: reserved for DEV-08F Part 23 after Part 22 preflight.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 21: purchase receipt void evidence verification`
