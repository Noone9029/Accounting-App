# DEV-08F Inventory-Clearing Purchase Bill Fixture Mutation Evidence

## Purpose And Scope

This document records DEV-08F Part 2: approved local-only inventory-clearing purchase bill fixture creation mutation.

- Marker: `DEV08F-AP-20260527T000000`.
- Mutation performed: yes, local-only.
- Approved mutation: create one future `DRAFT` purchase bill in `INVENTORY_CLEARING` mode.
- Forbidden actions not run: production, beta, customer data, deployment, provider/env/schema changes, migrations, seed/reset/delete, login/browser audit-writing flow, PDF/archive/export/download, generated-document creation, email, ZATCA, supplier payment/refund, purchase debit note, purchase order conversion, purchase receipt creation, stock movement creation, cash expense, cleanup/delete, full tests, full build, E2E, or smoke.

## Approval And Local Target

- Exact approval phrase received and checked before the mutation:
  `I approve DEV-08F Part 2 local-only inventory-clearing purchase bill fixture creation mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- `apps/api/.env` was parsed without printing secrets.
- Accepted database target: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- Local Postgres and Redis listeners were present on ports `5432` and `6379`.
- Write-capable service imports occurred only after the local target guard passed.

## Mutation Result

`PurchaseBillService.create(...)` was called once.

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Purchase bill safe prefix | `04b3f131` |
| Status | `DRAFT` |
| Inventory posting mode | `INVENTORY_CLEARING` |
| Bill date | `2026-05-28` |
| Due date | `2026-06-27` |
| Supplier safe prefix | `287aec77` |
| Line safe prefix | `cb3d385a` |
| Tracked item safe prefix | `175a7c7f` |
| Line account | `511`, safe prefix `c97f0827` |
| Tax rate safe prefix | `172417be` |
| Quantity | `10.0000` |
| Unit price | `100.0000` |
| Subtotal | `1000.0000` |
| VAT | `150.0000` |
| Total | `1150.0000` |
| Balance due | `1150.0000` |

## Accounting And State Evidence

- The bill remained `DRAFT`.
- `journalEntryId`: absent.
- `reversalJournalEntryId`: absent.
- Purchase receipt count linked to the bill: `0`.
- Source-scoped journal entry count for the bill: `0`.
- Source-scoped stock movement count for the bill: `0`.
- Generated document count for the bill: `0`.

## Audit Evidence

- `PurchaseBill` audit actions for the bill:
  - `PURCHASE_BILL_CREATED`
- Create audit count for the bill: `1`.
- No void, finalize, delete, login/browser, generated-document, email, or ZATCA path was called.

## Forbidden Side-Effect Evidence

Source-scoped or marker-scoped counts after the mutation:

| Check | Count |
| --- | ---: |
| Purchase receipts linked to bill | `0` |
| Stock movements linked to bill | `0` |
| Journal entries linked to bill | `0` |
| Generated documents for bill | `0` |
| Purchase orders converted to bill | `0` |
| Purchase debit notes for bill | `0` |
| Supplier payment allocations for bill | `0` |
| Supplier payment unapplied allocations for bill | `0` |
| Supplier refunds from bill payments | `0` |
| Cash expenses by marker | `0` |

## Temporary Script Cleanup

- No temporary script file was created.
- `Get-ChildItem apps/api/scripts -Filter '*dev08f*' -Force` returned no DEV-08F temporary scripts.
- No `apps/api/scripts` file was staged.

## Runner Notes

- An initial runner failed before the service call because UUID prefix filters do not support `startsWith`; no mutation occurred in that failed attempt.
- The successful runner resolved IDs in memory, called `PurchaseBillService.create(...)` once, and created the bill.
- A post-service side-effect query then referenced a non-existent supplier payment `notes` field; a follow-up read-only, source-scoped verification produced the evidence above.
- Verified final marker state: one purchase bill under the marker, no duplicate purchase bill.

## Commands Run

- `Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue`.
- `Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue`.
- Local-target guarded stdin-only Prisma/service runner from `apps/api`.
- Local-target guarded stdin-only Prisma readback from `apps/api`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08f*' -Force`.

## Commands Skipped And Why

- Purchase bill finalization: reserved for DEV-08F Part 5.
- Purchase receipt creation: reserved for DEV-08F Part 8.
- Inventory asset posting/reversal and receipt/bill voiding: reserved for later approved DEV-08F prompts.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, shared-target, hosted-target, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 3: inventory-clearing purchase bill fixture evidence verification`

## Part 3 Verification Result

- DEV-08F Part 3 read-only verification is recorded in [DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_EVIDENCE_VERIFICATION.md).
- Verification conclusion: verified.
- Fixture remained `BILL-000009`, safe prefix `04b3f131`, `DRAFT`, `INVENTORY_CLEARING`, total and balance due `1150.0000`.
- `PurchaseBillService.accountingPreview(...)` returned `previewOnly: true`, `canFinalize: true`, and no blocking reasons.
- Preview journal remained balanced: Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Source-scoped purchase receipt, stock movement, journal entry, generated document, purchase debit note, supplier payment allocation, and supplier unapplied allocation counts remained `0`.
- Exact next prompt title: `DEV-08F Part 4: inventory-clearing purchase bill finalization preflight`.
