# DEV-08F Inventory-Clearing Purchase Bill Fixture Evidence Verification

## Purpose And Scope

This document records DEV-08F Part 3: read-only verification of the Part 2 inventory-clearing purchase bill fixture.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Database target accepted by guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No production, beta, customer data, login/browser, PDF/archive/export/download, generated-document, email, ZATCA, migration, seed/reset/delete, deploy, env/provider/schema, full test, full build, E2E, smoke, or cleanup/delete action was run.

## Verification Conclusion

Verified.

The marker resolves to exactly one purchase bill, and it remains the expected local draft fixture.

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Purchase bill safe prefix | `04b3f131` |
| Status | `DRAFT` |
| Inventory posting mode | `INVENTORY_CLEARING` |
| Subtotal | `1000.0000` |
| VAT | `150.0000` |
| Total | `1150.0000` |
| Balance due | `1150.0000` |
| Journal entry | absent |
| Reversal journal entry | absent |
| Linked purchase receipts | `0` |

## Line Evidence

| Field | Result |
| --- | --- |
| Line safe prefix | `cb3d385a` |
| Item safe prefix | `175a7c7f` |
| Item inventory tracking | `true` |
| Line account | `511` |
| Tax rate safe prefix | `172417be` |
| Quantity | `10.0000` |
| Unit price | `100.0000` |
| Tax amount | `150.0000` |
| Line total | `1150.0000` |

## Read-Only Accounting Preview

`PurchaseBillService.accountingPreview(...)` was called read-only.

- `previewOnly`: `true`.
- `canFinalize`: `true`.
- Blocking reasons: none.
- Preview warning includes that the preview does not create journals.

Expected finalization preview:

| Line | Side | Account | Amount |
| ---: | --- | --- | ---: |
| 1 | Debit | `240` inventory clearing | `1000.0000` |
| 2 | Debit | `230` VAT receivable | `150.0000` |
| 3 | Credit | `210` accounts payable | `1150.0000` |

Preview totals:

- Total debit: `1150.0000`.
- Total credit: `1150.0000`.

## Audit And Side-Effect Verification

- Purchase bill audit actions for the fixture:
  - `PURCHASE_BILL_CREATED`
- No finalize, void, delete, login/browser, output, email, or ZATCA action was observed for the bill.

Source-scoped counts:

| Check | Count |
| --- | ---: |
| Purchase receipts linked to bill | `0` |
| Stock movements linked to bill | `0` |
| Journal entries linked to bill | `0` |
| Generated documents for bill | `0` |
| Purchase debit notes for bill | `0` |
| Supplier payment allocations for bill | `0` |
| Supplier payment unapplied allocations for bill | `0` |

## Temporary Script Cleanup

- No Part 3 temporary script file was created.
- The Part 2 temporary-script policy remains satisfied: no `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma/service readback from `apps/api`.
- `PurchaseBillService.accountingPreview(...)` against the Part 2 bill.

## Commands Skipped And Why

- Purchase bill finalization: reserved for DEV-08F Part 5 after Part 4 preflight.
- Purchase receipt creation and inventory asset posting: reserved for later approved DEV-08F prompts.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 4: inventory-clearing purchase bill finalization preflight`
