# DEV-08F Inventory-Clearing Purchase Bill Finalization Mutation Evidence

## Purpose And Scope

This document records DEV-08F Part 5: approved local-only finalization of the inventory-clearing purchase bill fixture.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Approved mutation: finalize the existing DEV-08F inventory-clearing purchase bill exactly once.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, purchase receipt creation, stock movement creation, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before mutation:
  `I approve DEV-08F Part 5 local-only inventory-clearing purchase bill finalization mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Write-capable service imports occurred only after the local target guard passed.

## Before State

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Purchase bill safe prefix | `04b3f131` |
| Status | `DRAFT` |
| Journal entry | absent |
| Purchase receipts linked to bill | `0` |
| Stock movements linked to bill | `0` |
| Journal entries linked to bill | `0` |
| Generated documents for bill | `0` |

## Mutation Result

`PurchaseBillService.finalize(...)` was called once.

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Purchase bill safe prefix | `04b3f131` |
| Status | `FINALIZED` |
| Inventory posting mode | `INVENTORY_CLEARING` |
| `finalizedAt` | present |
| Balance due | `1150.0000` |
| Journal entry safe prefix | `3fff12bc` |
| Reversal journal entry | absent |
| Linked purchase receipts | `0` |

## Journal Evidence

| Field | Result |
| --- | --- |
| Journal entry | `JE-000064` |
| Journal safe prefix | `3fff12bc` |
| Status | `POSTED` |
| Total debit | `1150.0000` |
| Total credit | `1150.0000` |

Journal lines:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `240` inventory clearing | `1000.0000` | `0.0000` |
| 2 | `230` VAT receivable | `150.0000` | `0.0000` |
| 3 | `210` accounts payable | `0.0000` | `1150.0000` |

## Audit Evidence

Purchase bill audit actions for the fixture:

- `PURCHASE_BILL_CREATED`
- `PURCHASE_BILL_FINALIZED`

## Forbidden Side-Effect Evidence

Source-scoped counts after finalization:

| Check | Count |
| --- | ---: |
| Purchase receipts linked to bill | `0` |
| Stock movements linked to bill | `0` |
| Generated documents for bill | `0` |
| Purchase debit notes for bill | `0` |
| Supplier payment allocations for bill | `0` |
| Supplier payment unapplied allocations for bill | `0` |

Expected journal entry count for the bill is now `1`.

## Temporary Script Cleanup

- No temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only service runner from `apps/api`.
- `PurchaseBillService.finalize(...)` against `BILL-000009`.
- Source-scoped Prisma readback after finalization.

## Commands Skipped And Why

- Purchase receipt creation: reserved for DEV-08F Part 8.
- Inventory asset posting, reversal, receipt voiding, and bill voiding: reserved for later approved DEV-08F prompts.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 6: inventory-clearing purchase bill finalization evidence verification`
