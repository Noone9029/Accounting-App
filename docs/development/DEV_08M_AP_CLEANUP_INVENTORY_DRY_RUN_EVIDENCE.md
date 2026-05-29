# DEV-08M AP Cleanup Inventory Dry-Run Evidence

## Purpose And Scope

- Task: `DEV-08M Part 2: approved local AP cleanup inventory dry-run`.
- Latest commit inspected: `41b38c41 Plan DEV-08M AP cleanup retention`.
- Approval phrase validated exactly:

```text
I approve DEV-08M Part 2 local-only AP cleanup inventory dry-run under marker DEV08M-AP-20260529T000000. No production, no beta, no customer data, no deletion.
```

- Runtime mutation performed: no.
- Deletion/update/archive/revoke/cleanup performed: no.
- Production, beta, hosted/shared, or customer data used: no.
- Real email, provider call, ZATCA, migration, seed/reset/delete, deploy, env change, browser/login, PDF/body/base64 read, backup/restore, full E2E, full smoke, full build, and full tests: not run.

## Local Target Proof

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

Local runtime note: Docker Desktop was started because the Windows PostgreSQL service could not be started from this session. Only the local `postgres` and `redis` compose services were started; API/web services were not started.

## Dry-Run Result

| Check | Result |
| --- | --- |
| Dry-run mode | `true` |
| Read-only mode | `true` |
| No deletion | `true` |
| Before/after table totals unchanged | `true` |
| Body/secret output printed | `false` |
| Marker count checked | `12` |
| Markers detected | `12` |

All DEV-08 through DEV-08L markers were detected in local count-only queries:

- `DEV08-AP-20260525T230000`
- `DEV08B-AP-20260526T060000`
- `DEV08C-AP-20260526T000000`
- `DEV08D-AP-20260526T000000`
- `DEV08E-AP-20260526T000000`
- `DEV08F-AP-20260527T000000`
- `DEV08G-AP-20260527T000000`
- `DEV08H-AP-20260528T000000`
- `DEV08I-AP-20260528T000000`
- `DEV08J-AP-20260528T000000`
- `DEV08K-AP-20260528T000000`
- `DEV08L-AP-20260529T000000`

## Counts By Entity Type

These are marker-scoped or source-linked counts. They are cleanup inventory counts only, not delete counts.

| Entity type | Count |
| --- | ---: |
| AP source documents | `64` |
| AP source document lines | `25` |
| Journals and journal lines | `67` |
| Allocations and reversals | `2` |
| Receipts and stock movements | `9` |
| Generated documents linked by AP source | `24` |
| Email outbox rows linked by source or generated document | `4` |
| Provider events linked to generated-document emails | `0` |
| Audit logs linked to AP source ids | `110` |
| ZATCA marker hits | `0` |
| Users, roles, and memberships marker hits | `6` |

## Marker Hit Summary

| Marker | Tables with count hits |
| --- | --- |
| `DEV08-AP-20260525T230000` | Contact, PurchaseBill, PurchaseBillLine, SupplierPayment, JournalEntry, JournalLine |
| `DEV08B-AP-20260526T060000` | Contact, PurchaseBill, PurchaseBillLine, PurchaseDebitNote, PurchaseDebitNoteLine, JournalEntry, JournalLine |
| `DEV08C-AP-20260526T000000` | Contact, PurchaseOrder, PurchaseOrderLine, PurchaseBill, JournalEntry, JournalLine |
| `DEV08D-AP-20260526T000000` | Contact, SupplierPayment, SupplierRefund, JournalEntry, JournalLine |
| `DEV08E-AP-20260526T000000` | CashExpense, CashExpenseLine, JournalLine |
| `DEV08F-AP-20260527T000000` | PurchaseBill, PurchaseBillLine, PurchaseReceipt, JournalEntry, JournalLine |
| `DEV08G-AP-20260527T000000` | Contact, PurchaseOrder, PurchaseOrderLine, PurchaseReceipt |
| `DEV08H-AP-20260528T000000` | PurchaseOrder, PurchaseBill, PurchaseDebitNote, CashExpense, SupplierPayment, SupplierRefund |
| `DEV08I-AP-20260528T000000` | User, Role |
| `DEV08J-AP-20260528T000000` | PurchaseOrder, PurchaseOrderLine, PurchaseBill, PurchaseBillLine, PurchaseReceipt, PurchaseDebitNote, PurchaseDebitNoteLine, PurchaseDebitNoteAllocation, CashExpense, CashExpenseLine, SupplierPayment, SupplierPaymentUnappliedAllocation, SupplierRefund, JournalEntry, JournalLine |
| `DEV08K-AP-20260528T000000` | EmailOutbox |
| `DEV08L-AP-20260529T000000` | Contact, PurchaseOrder, PurchaseBill, PurchaseReceipt, PurchaseDebitNote, CashExpense, SupplierPayment, SupplierRefund, JournalEntry, StockMovement |

## Dependency Order

This is a planning order only. No deletion is approved.

1. Report only; no deletion approved.
2. Email provider events.
3. Email outbox rows.
4. Generated document metadata/content rows.
5. Audit/auth rows.
6. Allocation/reversal rows.
7. Journal lines and journal entries.
8. Stock movements and receipt lines.
9. AP source document lines.
10. AP source documents.
11. Users, roles, memberships.
12. Organization-level ZATCA metadata/logs.

## Preserve/Delete Classification

Preserve by default:

- Accounting source documents.
- Journals and journal lines.
- Allocations and reversals.
- Receipts and stock movements.
- Generated documents.
- Email outbox/provider events.
- Audit/auth logs.
- Users, roles, and memberships.
- ZATCA metadata/logs.

Deletion candidates: none.

Deletion approved: no.

## Blockers

- No destructive cleanup executor is approved in DEV-08M Part 2.
- Generated-document duplicate behavior still needs the Part 4 product policy decision.
- Real provider email and production/beta/customer-data cleanup are out of scope.

## Temporary Script Cleanup

- Temporary runner path: `apps/api/scripts/dev08m-part2-cleanup-inventory-dry-run.temp.ts`.
- Final `Test-Path` result after deletion: `False`.
- Final `Get-ChildItem apps/api/scripts -Filter '*dev08m*'` result: no matching temp scripts printed.

## Commands Run

- `Start-Process -FilePath 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -WindowStyle Hidden`
- `docker compose -f infra/docker-compose.yml up -d postgres redis`
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`
- `Get-NetTCPConnection -LocalPort 5432 -State Listen`
- `Get-NetTCPConnection -LocalPort 6379 -State Listen`
- Local env parsing for sanitized database target only.
- `corepack pnpm --dir apps/api exec tsx scripts/dev08m-part2-cleanup-inventory-dry-run.temp.ts`
- `Remove-Item` for the temporary runner after path verification.
- `Test-Path -LiteralPath 'apps\api\scripts\dev08m-part2-cleanup-inventory-dry-run.temp.ts'`
- `Get-ChildItem -LiteralPath 'apps\api\scripts' -Filter '*dev08m*'`

## Commands Skipped

- Delete/update/archive/revoke/cleanup execution.
- Migrations, seed/reset/delete, deploys, environment/provider/schema changes, backup/restore, production-hosting research, full E2E, full smoke, full build, and full tests.
- Login/browser/API endpoint calls.
- PDF generation, generated-document downloads, attachment downloads, report exports, body/base64 reads, and request/response body output.
- Real email, provider calls, SMTP, retry workers, webhooks, diagnostics sends, and real AP delivery.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, and QR payload handling.
- Production, beta, hosted/shared, or customer-data actions.

## Exact Next Prompt Title

`DEV-08M Part 3: AP cleanup inventory dry-run evidence verification`

## Part 3 Verification Note

- DEV-08M Part 3 verification is recorded in [DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE_VERIFICATION.md](DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE_VERIFICATION.md).
- Read-only live verification detected all `12` markers and matched the Part 2 count evidence exactly.
- Entity counts remained unchanged during verification.
- Cleanup/delete/archive/revoke occurred: `false`.
- Body/secret/customer-data output printed: `false`.
- Temporary verifier `apps/api/scripts/dev08m-part3-dry-run-verification.temp.ts` was deleted and `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08M Part 4: generated-document duplicate output policy preflight`.
