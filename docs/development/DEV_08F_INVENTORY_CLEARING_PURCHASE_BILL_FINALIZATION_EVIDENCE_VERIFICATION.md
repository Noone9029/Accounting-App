# DEV-08F Inventory-Clearing Purchase Bill Finalization Evidence Verification

## Purpose And Scope

This document records DEV-08F Part 6: read-only verification of the Part 5 purchase bill finalization mutation.

- Marker: `DEV08F-AP-20260527T000000`.
- Runtime mutation performed: no.
- Target accepted by local guard: PostgreSQL on local host `localhost`, port `5432`, database `accounting`.
- No purchase receipt creation, stock movement, journal mutation, generated document, PDF/archive/export/download, email, ZATCA, login/browser, migration, seed/reset/delete, deploy, env/provider/schema, production, beta, hosted/shared target, customer-data, full test, full build, E2E, or smoke action was run.

## Verification Conclusion

Verified.

| Field | Result |
| --- | --- |
| Purchase bill | `BILL-000009` |
| Purchase bill safe prefix | `04b3f131` |
| Status | `FINALIZED` |
| Inventory posting mode | `INVENTORY_CLEARING` |
| `finalizedAt` | present |
| Total | `1150.0000` |
| Balance due | `1150.0000` |
| Journal entry safe prefix | `3fff12bc` |
| Reversal journal entry | absent |
| Linked purchase receipts | `0` |

## Journal Verification

| Field | Result |
| --- | --- |
| Journal entry | `JE-000064` |
| Journal safe prefix | `3fff12bc` |
| Status | `POSTED` |
| Reversed by | absent |
| Total debit | `1150.0000` |
| Total credit | `1150.0000` |

Journal lines:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `240` inventory clearing | `1000.0000` | `0.0000` |
| 2 | `230` VAT receivable | `150.0000` | `0.0000` |
| 3 | `210` accounts payable | `0.0000` | `1150.0000` |

## Audit And Side-Effect Verification

Purchase bill audit actions:

- `PURCHASE_BILL_CREATED`
- `PURCHASE_BILL_FINALIZED`

Source-scoped counts:

| Check | Count |
| --- | ---: |
| DEV-08F marker bills | `1` |
| Purchase receipts linked to bill | `0` |
| Stock movements linked to bill | `0` |
| Journal entries linked to bill | `1` |
| Generated documents for bill | `0` |
| Purchase debit notes for bill | `0` |
| Supplier payment allocations for bill | `0` |
| Supplier payment unapplied allocations for bill | `0` |

## Temporary Script Cleanup

- No Part 6 temporary script file was created.
- No `*dev08f*` temporary script exists under `apps/api/scripts`.

## Commands Run

- Local-target guarded stdin-only Prisma readback from `apps/api`.

## Commands Skipped And Why

- Purchase receipt creation: reserved for DEV-08F Part 8 after Part 7 preflight.
- Inventory asset posting, reversal, receipt voiding, and bill voiding: reserved for later approved DEV-08F prompts.
- PDF/archive/export/download, email, ZATCA, login/browser flows, migrations, seed/reset/delete, deploys, env/provider/schema changes, production, beta, hosted/shared targets, and customer-data actions: explicitly forbidden.
- Full tests, full build, E2E, and smoke: outside this prompt.

## Exact Next Prompt Title

`DEV-08F Part 7: purchase receipt from inventory-clearing bill preflight`
