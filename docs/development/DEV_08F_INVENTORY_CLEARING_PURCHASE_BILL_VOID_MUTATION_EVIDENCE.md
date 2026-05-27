# DEV-08F Inventory-Clearing Purchase Bill Void Mutation Evidence

## Purpose And Scope

This document records DEV-08F Part 23: approved local-only voiding of the inventory-clearing purchase bill after receipt void.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Approved mutation: void `BILL-000009` exactly once after its linked receipt was voided.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before mutation:
  `I approve DEV-08F Part 23 local-only inventory-clearing purchase bill void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Write-capable service imports occurred only after the local target guard passed.

## Before State

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Bill safe prefix | `04b3f131` |
| Status | `FINALIZED` |
| Balance due | `1150.0000` |
| Original journal safe prefix | `3fff12bc` |
| Reversal journal | absent |
| Non-voided receipts for bill | `0` |
| Bill reversal journals | `0` |
| Generated documents for bill | `0` |

## Mutation Result

`PurchaseBillService.void(...)` was called once.

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Bill safe prefix | `04b3f131` |
| Status | `VOIDED` |
| Balance due | `0.0000` |
| Original journal safe prefix | `3fff12bc` |
| Reversal journal safe prefix | `30f40b4c` |
| Linked receipt | `PRC-000004`, `VOIDED` |

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

## Audit And Side-Effect Evidence

Purchase bill audit actions:

- `PURCHASE_BILL_CREATED`
- `PURCHASE_BILL_FINALIZED`
- `PURCHASE_BILL_VOIDED`

Counts after bill void:

| Check | Count |
| --- | ---: |
| Non-voided receipts for bill | `0` |
| Bill reversal journals | `1` |
| Generated documents for bill | `0` |
| Stock movements directly for bill | `0` |

## Temporary Script Cleanup

- No temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only service runner from `apps/api`.
- `PurchaseBillService.void(...)` against `BILL-000009`.
- Source-scoped Prisma readback after bill void.

## Commands Skipped And Why

- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 24: inventory-clearing purchase bill void evidence verification`

## Part 24 Verification Result

- DEV-08F Part 24 read-only bill void verification is recorded in [DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_EVIDENCE_VERIFICATION.md](DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_EVIDENCE_VERIFICATION.md).
- Verification conclusion: verified.
- `BILL-000009`, safe prefix `04b3f131`, remained `VOIDED`, balance due `0.0000`.
- Original bill journal `JE-000064`, safe prefix `3fff12bc`, remained `REVERSED`.
- Bill reversal journal `JE-000067`, safe prefix `30f40b4c`, remained `POSTED`, balanced debit/credit `1150.0000`.
- Linked receipt `PRC-000004`, safe prefix `993adc10`, remained `VOIDED`.
- Non-voided receipts, generated documents, and direct bill stock movements remained `0`.
- Exact next prompt title: `DEV-08F Part 25: inventory-clearing purchase bill and receipt closure`.
