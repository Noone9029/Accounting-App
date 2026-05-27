# DEV-08F Purchase Receipt Void Blocker Negative Check Evidence

## Purpose And Scope

This document records DEV-08F Part 14: approved local-only purchase receipt void blocker negative check.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation attempted: yes, local-only negative check.
- Expected result: `PurchaseReceiptService.void(...)` fails because the receipt has an active inventory asset journal that has not been reversed.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, successful receipt voiding, purchase bill voiding, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before the negative check:
  `I approve DEV-08F Part 14 local-only purchase receipt void blocker negative check under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Write-capable service imports occurred only after the local target guard passed.

## Negative Check Result

`PurchaseReceiptService.void(...)` was called once.

- Expected failure: yes.
- Blocked: yes.
- Blocker message:
  `Reverse inventory asset posting before voiding this purchase receipt.`

## Before And After State

| Field | Before | After |
| --- | --- | --- |
| Receipt | `PRC-000004` | `PRC-000004` |
| Receipt safe prefix | `993adc10` | `993adc10` |
| Status | `POSTED` | `POSTED` |
| Inventory asset journal safe prefix | `75a6c7c3` | `75a6c7c3` |
| Inventory asset journal status | `POSTED` | `POSTED` |
| Inventory asset journal reversed by | absent | absent |
| Inventory asset reversal journal | absent | absent |
| `voidedAt` | absent | absent |
| Void stock movements | `0` | `0` |
| Receipt void audits | `0` | `0` |
| Asset reversal journals | `0` | `0` |

## Temporary Script Cleanup

- No temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only service runner from `apps/api`.
- `PurchaseReceiptService.void(...)` once, caught as the expected blocker.
- Source-scoped Prisma readback after the blocked call.

## Commands Skipped And Why

- Receipt asset reversal: reserved for DEV-08F Part 17 after Part 16 preflight.
- Successful receipt void: reserved for DEV-08F Part 20 after asset reversal.
- Purchase bill voiding: reserved for DEV-08F Part 23.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 15: purchase receipt void blocker evidence verification`

## Part 15 Verification Result

- DEV-08F Part 15 read-only void blocker verification is recorded in [DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md](DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md).
- Verification conclusion: verified.
- `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; `voidedAt` remained absent.
- `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED`, unreversed; inventory asset reversal journal remained absent.
- Void stock movements, receipt void audits, asset reversal journals, and generated documents remained `0`.
- Exact next prompt title: `DEV-08F Part 16: purchase receipt inventory asset reversal preflight`.
