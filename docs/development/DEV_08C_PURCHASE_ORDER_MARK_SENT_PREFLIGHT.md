# DEV-08C Purchase Order Mark-Sent Preflight

## 1. Purpose And Scope

DEV-08C Part 7 plans the local-only mark-sent transition for the approved DEV-08C purchase order.

- Runtime mutation performed: no.
- Verification type: read-only documentation, source, and local disposable database preflight.
- Marker: `DEV08C-AP-20260526T000000`.
- No purchase order mark-sent, create, approve, close, void, convert, bill finalization, cleanup, output generation, login, browser, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted, or customer-data action was performed.

## 2. Latest Commit Inspected

- `git log -1 --oneline`: `da7acf1b Verify DEV-08C purchase order approval evidence`.
- `git rev-parse HEAD`: `da7acf1b9e5a5c7bac5abb2fb3306fb303b2278f`.
- `git rev-parse origin/main`: `da7acf1b9e5a5c7bac5abb2fb3306fb303b2278f`.
- Local `HEAD` matched `origin/main` before Part 7 documentation edits.
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

## 4. Current Purchase Order State

| Check | Result |
| --- | --- |
| Marker-scoped purchase order count | `1` |
| Purchase order number | `PO-000141` |
| Purchase order safe id prefix | `d6abea75` |
| Supplier safe id prefix | `5ef871cd` |
| Supplier type | `SUPPLIER` |
| Supplier active | `yes` |
| Current status | `APPROVED` |
| `approvedAt` | present |
| `sentAt` | absent |
| `convertedBillId` | absent |
| Converted bill present | no |
| Line count | `1` |
| Account code | `111` |
| Account type | `ASSET` |
| Tax rate | `VAT on Purchases 15%` |
| Subtotal | `1000.0000` |
| Tax total | `150.0000` |
| Total | `1150.0000` |

Current accounting state:

- Purchase bills linked to `PO-000141`: `0`.
- Journal entries tied to the marker or PO number: `0`.
- `PURCHASE_ORDER_SENT` audit rows: `0`.
- Generated document, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, and cash expense side-effect counts: `0`.

## 5. Mark-Sent Eligibility

- `PurchaseOrderService.markSent(...)` loads the current purchase order, returns idempotently if the order is already `SENT`, and otherwise requires status `APPROVED`.
- For statuses other than `APPROVED` and `SENT`, the service throws `Only approved purchase orders can be marked as sent.`
- The current fixture status is `APPROVED`, so the Part 8 mark-sent mutation is eligible.
- The API route is `POST /purchase-orders/:id/mark-sent` and is guarded by `PERMISSIONS.purchaseOrders.approve`.

## 6. Expected State Transition

Expected Part 8 mutation effect:

- Status changes `APPROVED -> SENT`.
- `sentAt` changes from absent to present.
- `approvedAt` remains present.
- `convertedBillId` remains absent.
- Totals and lines remain unchanged.
- No purchase bill is created.
- No journal is created.
- No inventory effect occurs.
- No output, email, or ZATCA path is invoked.

## 7. Expected Accounting/Journal Result

- Mark-sent is an operational state transition only.
- Expected purchase bill count linked to the PO after Part 8: `0`.
- Expected marker/PO journal count after Part 8: `0`.
- No AP, VAT, expense/asset, bank/cash, inventory-clearing, stock, or reversal journal is expected.

## 8. Expected Audit Result

- `PurchaseOrderService.markSent(...)` logs action `MARK_SENT` for entity type `PurchaseOrder`.
- Audit event mapping converts `PurchaseOrder:MARK_SENT` to `PURCHASE_ORDER_SENT`.
- Expected Part 8 audit result: one `PURCHASE_ORDER_SENT` action for `PO-000141`.
- Existing expected audit rows before Part 8:
  - `PURCHASE_ORDER_CREATED`: `1`.
  - `PURCHASE_ORDER_APPROVED`: `1`.
  - `PURCHASE_ORDER_SENT`: `0`.

## 9. Expected Forbidden Side Effects

Expected absent side effects after Part 8:

- Purchase bill conversion or finalization.
- Journal creation.
- Purchase receipt or stock movement.
- Generated document, PDF, archive, export, or download.
- Email outbox or delivery action.
- ZATCA command, XML, QR, clearance, reporting, signed artifact, metadata, or network path.
- Supplier payment, supplier refund, purchase debit note, or cash expense.
- Cleanup, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted, or customer-data action.

## 10. Required Approval Phrase

`I approve DEV-08C Part 8 local-only purchase order mark-sent mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`

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
- Targeted reads/searches of Part 6 evidence, purchase order service/controller code, purchase order rule tests, audit event mapping, and Prisma schema fields.
- Inline guarded `node -e` read-only Prisma query from `apps/api`.

Two failed read-only command attempts occurred before the successful inline query:

- The first failed before any database access because root-level `dotenv` was unavailable.
- The second loaded Prisma after local target classification, then failed on a read-only side-effect count field name; no mutation was performed.

## 12. Commands Skipped And Why

- `PurchaseOrderService.markSent(...)` and the API mark-sent route: forbidden until Part 8 approval/mutation execution.
- Purchase order create, approve, close, void, convert-to-bill, delete, purchase bill finalization, cleanup/delete: outside Part 7 scope or reserved for later approved parts.
- API/web service startup: not needed for source and read-only Prisma preflight.
- Browser/login flows: forbidden because they can write audit logs.
- PDF/export/download/generate-PDF/archive commands: output-producing and forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Migrations, seed/reset/delete, Prisma reset, deploys, Vercel/Supabase changes, environment/provider/schema changes, backup/restore, and production-hosting research: explicitly forbidden.

## 13. Blockers Or Discrepancies

- No blocker found.
- No discrepancy found between Part 6 approval evidence and current Part 7 read-only preflight.
- Part 8 should stop if the purchase order is no longer `APPROVED`, `sentAt` is already set, a converted bill exists, a purchase bill exists, a marker/PO journal exists, or the target is not local-only.

## 14. Evidence Note

Part 8 completed the approved local mark-sent mutation and recorded evidence in [DEV_08C_PURCHASE_ORDER_MARK_SENT_MUTATION_EVIDENCE.md](DEV_08C_PURCHASE_ORDER_MARK_SENT_MUTATION_EVIDENCE.md).

## 15. Exact Next Prompt Title

`DEV-08C Part 8: approved local purchase order mark-sent mutation`
