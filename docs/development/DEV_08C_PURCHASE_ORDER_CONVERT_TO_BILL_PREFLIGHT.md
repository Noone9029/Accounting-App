# DEV-08C Purchase Order Convert-To-Bill Preflight

## 1. Purpose And Scope

DEV-08C Part 10 plans the local-only conversion of the sent DEV-08C purchase order into a draft purchase bill.

- Runtime mutation performed: no.
- Verification type: read-only documentation, source, and local disposable database preflight.
- Marker: `DEV08C-AP-20260526T000000`.
- No purchase order conversion, create, approve, mark-sent, close, void, bill finalization, cleanup, output generation, login, browser, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted, or customer-data action was performed.

## 2. Latest Commit Inspected

- `git log -1 --oneline`: `468186c5 Verify DEV-08C purchase order mark-sent evidence`.
- `git rev-parse HEAD`: `468186c51f00c408376bd99e8ca815c310d03b9f`.
- `git rev-parse origin/main`: `468186c51f00c408376bd99e8ca815c310d03b9f`.
- Local `HEAD` matched `origin/main` before Part 10 documentation edits.
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
| Marker-scoped purchase order count | `1` |
| Purchase order number | `PO-000141` |
| Purchase order safe id prefix | `d6abea75` |
| Supplier safe id prefix | `5ef871cd` |
| Supplier type | `SUPPLIER` |
| Supplier active | `yes` |
| Current status | `SENT` |
| `sentAt` | present |
| `convertedBillId` | absent |
| Converted bill present | no |
| Line count | `1` |
| Line 1 account safe prefix | `1b3fd542` |
| Line 1 account code | `111` |
| Line 1 item | absent |
| Line 1 conversion account available | yes, direct account |
| Line 1 tax rate | `VAT on Purchases 15%` |
| Subtotal | `1000.0000` |
| Tax total | `150.0000` |
| Total | `1150.0000` |

Current accounting state:

- Purchase bills linked to `PO-000141`: `0`.
- Journal entries tied to the marker or PO number: `0`.
- `PURCHASE_ORDER_CONVERTED_TO_BILL` audit rows: `0`.
- Generated document, email, purchase receipt, and stock movement side-effect counts: `0`.

## 5. Conversion Eligibility

- `PurchaseOrderService.convertToBill(...)` allows conversion only when the purchase order status is `APPROVED` or `SENT`.
- The current fixture status is `SENT`, so the Part 11 conversion mutation is status-eligible.
- The service rejects repeat conversion when `convertedBillId` is already set; current `convertedBillId` is absent.
- The service requires the supplier to remain active and type `SUPPLIER` or `BOTH`; current supplier is active `SUPPLIER`.
- The service requires every PO line to have either a direct `accountId` or an item `expenseAccountId`; the single line has direct account code `111`.
- The API route is `POST /purchase-orders/:id/convert-to-bill` and is guarded by `PERMISSIONS.purchaseOrders.convertToBill`.

## 6. Expected PO Before/After

Expected Part 11 purchase order effect:

| Field | Before | After |
| --- | --- | --- |
| Status | `SENT` | `BILLED` |
| `convertedBillId` | absent | present |
| `sentAt` | present | present |
| Total | `1150.0000` | `1150.0000` |
| Line count | `1` | `1` |

## 7. Expected Purchase Bill Result

Expected Part 11 bill effect:

- One draft purchase bill is created and linked to `PO-000141`.
- Purchase bill status: `DRAFT`.
- Purchase bill total: `1150.0000`.
- Purchase bill balance due: `1150.0000`.
- Purchase bill journal: absent because the bill remains draft.
- Purchase bill supplier, branch, currency, notes, terms, totals, and line data are copied from the purchase order.
- Purchase bill line account uses the PO line direct account `111`.

## 8. Expected Accounting/Journal Result

- Convert-to-bill creates an operational draft AP document, not a posted bill.
- Expected purchase order journal count after Part 11: `0`.
- Expected draft purchase bill journal after Part 11: absent.
- No AP liability, VAT, expense/asset, bank/cash, inventory-clearing, stock, or reversal journal is expected until a later bill finalization step.

## 9. Expected Audit Result

- `PurchaseOrderService.convertToBill(...)` logs action `CONVERT_TO_BILL` for entity type `PurchaseOrder`.
- Audit event mapping converts `PurchaseOrder:CONVERT_TO_BILL` to `PURCHASE_ORDER_CONVERTED_TO_BILL`.
- Expected Part 11 audit result: one `PURCHASE_ORDER_CONVERTED_TO_BILL` action for `PO-000141`.
- Existing expected audit rows before Part 11:
  - `PURCHASE_ORDER_CREATED`: `1`.
  - `PURCHASE_ORDER_APPROVED`: `1`.
  - `PURCHASE_ORDER_SENT`: `1`.
  - `PURCHASE_ORDER_CONVERTED_TO_BILL`: `0`.

## 10. Expected Forbidden Side Effects

Expected absent side effects after Part 11:

- Purchase bill finalization or journal posting.
- Purchase receipt or stock movement.
- Generated document, PDF, archive, export, or download.
- Email outbox or delivery action.
- ZATCA command, XML, QR, clearance, reporting, signed artifact, metadata, or network path.
- Supplier payment, supplier refund, purchase debit note, or cash expense.
- Cleanup, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted, or customer-data action.

## 11. Required Approval Phrase

`I approve DEV-08C Part 11 local-only purchase order convert-to-bill mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`

## 12. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `docker ps --filter name=infra-postgres-1 --filter name=infra-redis-1 --format '{{.Names}} {{.Status}} {{.Ports}}'`.
- `Test-NetConnection localhost -Port 5432`.
- `Test-NetConnection localhost -Port 6379`.
- Targeted reads/searches of Part 9 evidence, handoff, purchase order conversion service/controller code, conversion unit tests, audit event mapping, and Prisma schema fields.
- Inline guarded `node -e` read-only Prisma query from `apps/api`.

## 13. Commands Skipped And Why

- `PurchaseOrderService.convertToBill(...)` and the API convert-to-bill route: forbidden until Part 11 approval/mutation execution.
- Purchase order create, approve, mark-sent, close, void, delete, purchase bill finalization, cleanup/delete: outside Part 10 scope or reserved for later approved parts.
- API/web service startup: not needed for source and read-only Prisma preflight.
- Browser/login flows: forbidden because they can write audit logs.
- PDF/export/download/generate-PDF/archive commands: output-producing and forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Migrations, seed/reset/delete, Prisma reset, deploys, Vercel/Supabase changes, environment/provider/schema changes, backup/restore, and production-hosting research: explicitly forbidden.

## 14. Blockers Or Discrepancies

- No blocker found.
- No discrepancy found between Part 9 mark-sent evidence and current Part 10 read-only preflight.
- Part 11 should stop if the purchase order is no longer `SENT`, `convertedBillId` is set, a purchase bill already exists, the supplier is inactive or not supplier-capable, any line lacks a direct or item expense account, a marker/PO journal exists, or the target is not local-only.

## 15. Exact Next Prompt Title

`DEV-08C Part 11: approved local purchase order convert-to-bill mutation`
