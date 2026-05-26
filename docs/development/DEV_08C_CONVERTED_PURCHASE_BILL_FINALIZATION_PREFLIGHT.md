# DEV-08C Converted Purchase Bill Finalization Preflight

## 1. Purpose And Scope

DEV-08C Part 13 plans the local-only finalization of the converted draft purchase bill created from the DEV-08C purchase order.

- Runtime mutation performed: no.
- Verification type: read-only documentation, source, and local disposable database preflight.
- Marker: `DEV08C-AP-20260526T000000`.
- No purchase bill finalization, purchase order mutation, cleanup, output generation, login, browser, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted, or customer-data action was performed.

## 2. Latest Commit Inspected

- `git log -1 --oneline`: `ddb641be Verify DEV-08C purchase order conversion evidence`.
- `git rev-parse HEAD`: `ddb641beb5b844e6a3c22cf49f56148c1133f7de`.
- `git rev-parse origin/main`: `ddb641beb5b844e6a3c22cf49f56148c1133f7de`.
- Local `HEAD` matched `origin/main` before Part 13 documentation edits.
- `git status --short` showed only the pre-existing unrelated untracked web/marketing and graphify paths.

## 3. Local-Only Target Proof

- Docker engine: server `28.5.1`, OS type `linux`.
- Local containers:
  - `infra-postgres-1`: healthy, listening on localhost port `5432`.
  - `infra-redis-1`: healthy, listening on localhost port `6379`.
- Local port checks passed:
  - `localhost:5432`: `TcpTestSucceeded = True`.
  - `localhost:6379`: `TcpTestSucceeded = True`.
- Read-only database target classification before Prisma load:
  - protocol: `postgresql`.
  - host: `localhost`.
  - port: `5432`.
  - database: `accounting`.
  - local-only target accepted: yes.
- The read-only inline query refused hosted, production, beta, shared, and customer-like target fragments before loading Prisma.
- No database URL, credential, token, cookie, auth header, request/response body, vendor/customer data, signed XML, QR payload, document body, attachment body, or email body is recorded here.

## 4. Current PO State

| Check | Result |
| --- | --- |
| Purchase order number | `PO-000141` |
| Purchase order safe id prefix | `d6abea75` |
| Status | `BILLED` |
| Converted bill safe id prefix | `f37c60b2` |
| Total | `1150.0000` |

The purchase order should remain `BILLED` through Part 14 finalization.

## 5. Current Converted Bill State

| Check | Result |
| --- | --- |
| Bill number | `BILL-000422` |
| Bill safe id prefix | `f37c60b2` |
| Status | `DRAFT` |
| `journalEntryId` | absent |
| Journal relation | no |
| Total | `1150.0000` |
| Balance due | `1150.0000` |
| Inventory posting mode | `DIRECT_EXPENSE_OR_ASSET` |
| Bill date | `2026-05-26` |
| `finalizedAt` | absent |
| Line count | `1` |
| Line account code | `111` |
| Line account type | `ASSET` |
| Line account active/posting | yes / yes |
| Tax rate | `VAT on Purchases 15%` |
| Tax amount | `150.0000` |
| Line total | `1150.0000` |

## 6. Finalization Eligibility

- `PurchaseBillService.finalize(...)` allows finalization only for draft purchase bills without a journal entry.
- Current bill status is `DRAFT` and `journalEntryId` is absent.
- Fiscal period check:
  - Fiscal period count for the organization: `78`.
  - Bill date `2026-05-26` matches an `OPEN` fiscal period.
- Posting account checks:
  - Line account `111`: active, posting-enabled `ASSET`.
  - Accounts payable account `210`: active, posting-enabled `LIABILITY`.
  - VAT receivable account `230`: active, posting-enabled `ASSET`.
- Current inventory posting mode is `DIRECT_EXPENSE_OR_ASSET`, so inventory-clearing readiness and purchase receipt posting are not expected for this bill.
- Current marker/PO/bill journal count is `0`.
- Current `PURCHASE_BILL_FINALIZED` audit count for the converted bill is `0`.
- The API route is `POST /purchase-bills/:id/finalize` and is guarded by `PERMISSIONS.purchaseBills.finalize`.

## 7. Expected Accounting/Journal Result

Expected Part 14 finalization effect:

- Purchase bill status changes `DRAFT -> FINALIZED`.
- `finalizedAt` is set.
- One posted journal entry is created and linked to `BILL-000422`.
- Bill balance due remains `1150.0000`.
- Purchase order remains `BILLED`; no purchase-order status change is expected.
- Expected journal lines:
  - Debit line account `111`: `1000.0000`.
  - Debit VAT receivable account `230`: `150.0000`.
  - Credit accounts payable account `210`: `1150.0000`.
- Expected journal totals:
  - Total debit: `1150.0000`.
  - Total credit: `1150.0000`.
- No inventory movement or receipt posting is expected because the bill is `DIRECT_EXPENSE_OR_ASSET`.

## 8. Expected Audit Result

- `PurchaseBillService.finalize(...)` logs action `FINALIZE` for entity type `PurchaseBill`.
- Audit event mapping converts `PurchaseBill:FINALIZE` to `PURCHASE_BILL_FINALIZED`.
- Expected Part 14 audit result: one `PURCHASE_BILL_FINALIZED` action for `BILL-000422`.
- No new purchase order audit action is expected.

## 9. Expected Forbidden Side Effects

Expected absent side effects after Part 14:

- Purchase order status change.
- Purchase receipt or stock movement.
- Generated document, PDF, archive, export, or download.
- Email outbox or delivery action.
- ZATCA command, XML, QR, clearance, reporting, signed artifact, metadata, or network path.
- Supplier payment, supplier refund, purchase debit note, or cash expense.
- Cleanup, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted, or customer-data action.

## 10. Required Approval Phrase

`I approve DEV-08C Part 14 local-only converted purchase bill finalization mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`

## 11. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `docker info --format '{{.ServerVersion}} {{.OSType}}'`.
- `docker ps --filter name=infra-postgres-1 --filter name=infra-redis-1 --format '{{.Names}} {{.Status}} {{.Ports}}'`.
- `Test-NetConnection localhost -Port 5432`.
- `Test-NetConnection localhost -Port 6379`.
- `Get-ChildItem -Path apps/api/scripts -File` filtered for `*dev08c*`.
- Targeted reads/searches of Part 12 evidence, handoff, purchase bill finalize service/controller code, fiscal period guard, purchase bill posting tests, and audit event mapping.
- Inline guarded `node -e` read-only Prisma query from `apps/api`.

## 12. Commands Skipped And Why

- `PurchaseBillService.finalize(...)` and the API finalize route: forbidden until Part 14 approval/mutation execution.
- Purchase order create, approve, mark-sent, close, void, convert-to-bill, delete, purchase bill update/void, cleanup/delete: outside Part 13 scope or reserved for later approved parts.
- API/web service startup: not needed for source and read-only Prisma preflight.
- Browser/login flows: forbidden because they can write audit logs.
- PDF/export/download/generate-PDF/archive commands: output-producing and forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Migrations, seed/reset/delete, Prisma reset, deploys, Vercel/Supabase changes, environment/provider/schema changes, backup/restore, and production-hosting research: explicitly forbidden.

## 13. Blockers Or Discrepancies

- No blocker found.
- No discrepancy found between Part 12 conversion evidence and current Part 13 read-only preflight.
- Part 14 should stop if the purchase bill is no longer `DRAFT`, a journal entry already exists, the fiscal period is not open/allowed, required posting accounts `210` or `230` are missing, the line account is not active/posting, a marker/PO/bill journal already exists, or the target is not local-only.

## 14. Evidence Note

Part 14 completed the approved local converted purchase bill finalization mutation and recorded evidence in [DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md](DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md).

## 15. Exact Next Prompt Title

`DEV-08C Part 14: approved local converted purchase bill finalization mutation`
