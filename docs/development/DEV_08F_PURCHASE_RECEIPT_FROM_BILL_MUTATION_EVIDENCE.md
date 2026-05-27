# DEV-08F Purchase Receipt From Inventory-Clearing Bill Mutation Evidence

## Purpose And Scope

This document records DEV-08F Part 8: approved local-only purchase receipt creation from the finalized inventory-clearing purchase bill.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Approved mutation: create one purchase receipt linked to `BILL-000009`.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, inventory asset journal posting, receipt voiding, purchase bill voiding, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before mutation:
  `I approve DEV-08F Part 8 local-only purchase receipt from inventory-clearing bill mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Write-capable service imports occurred only after the local target guard passed.

## Before State

| Check | Result |
| --- | ---: |
| Purchase receipts linked to `BILL-000009` | `0` |
| DEV-08F marker stock movements | `0` |
| Purchase bill journal count | `1` |
| Generated documents for purchase receipt | `0` |

## Mutation Result

`PurchaseReceiptService.create(...)` was called once.

| Field | Result |
| --- | --- |
| Purchase receipt | `PRC-000004` |
| Receipt safe prefix | `993adc10` |
| Status | `POSTED` |
| Purchase bill safe prefix | `04b3f131` |
| Supplier safe prefix | `287aec77` |
| Warehouse safe prefix | `197fac56` |
| Receipt date | `2026-05-28` |
| Line count | `1` |
| Inventory asset journal | absent |
| Inventory asset reversal journal | absent |

Receipt line:

| Field | Result |
| --- | --- |
| Receipt line safe prefix | `61b842a9` |
| Item safe prefix | `175a7c7f` |
| Purchase bill line safe prefix | `cb3d385a` |
| Quantity | `10.0000` |
| Unit cost | `100.0000` |

## Stock Movement Evidence

| Field | Result |
| --- | --- |
| Stock movement safe prefix | `a7708ad8` |
| Type | `PURCHASE_RECEIPT_PLACEHOLDER` |
| Quantity | `10.0000` |
| Unit cost | `100.0000` |
| Total cost | `1000.0000` |
| Reference type | `PurchaseReceipt` |
| Reference safe prefix | `993adc10` |

## Accounting And Audit Evidence

- Purchase receipt asset journal count: `0`.
- Purchase bill journal count remained `1`.
- Generated documents for the receipt: `0`.
- Purchase receipt audit actions:
  - `PURCHASE_RECEIPT_CREATED`

## Temporary Script Cleanup

- No temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only service runner from `apps/api`.
- `PurchaseReceiptService.create(...)` against `BILL-000009`.
- Source-scoped Prisma readback after receipt creation.

## Commands Skipped And Why

- Purchase receipt inventory asset posting: reserved for DEV-08F Part 11.
- Purchase receipt voiding and asset reversal paths: reserved for later approved DEV-08F prompts.
- Purchase bill voiding: reserved for DEV-08F Part 23.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 9: purchase receipt evidence verification`

## Part 9 Verification Result

- DEV-08F Part 9 read-only receipt verification is recorded in [DEV_08F_PURCHASE_RECEIPT_FROM_BILL_EVIDENCE_VERIFICATION.md](DEV_08F_PURCHASE_RECEIPT_FROM_BILL_EVIDENCE_VERIFICATION.md).
- Verification conclusion: verified.
- `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, linked to `BILL-000009`, with no inventory asset journal yet.
- Stock movement `a7708ad8` remained `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, total cost `1000.0000`.
- Receiving status became `COMPLETE`; matching status became `FULLY_RECEIVED`; value difference remained `0.0000`.
- Read-only asset posting preview returned `canPost: true`, no blocking reasons, and balanced preview Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Exact next prompt title: `DEV-08F Part 10: purchase receipt inventory asset posting preflight`.
