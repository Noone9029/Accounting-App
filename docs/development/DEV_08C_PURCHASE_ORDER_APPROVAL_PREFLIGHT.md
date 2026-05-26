# DEV-08C Purchase Order Approval Preflight

## 1. Purpose And Scope

DEV-08C Part 4 plans the local-only approval of the DEV-08C draft purchase order fixture.

- Runtime mutation performed: no.
- Scope: read-only documentation, code, and local disposable database checks.
- Marker: `DEV08C-AP-20260526T000000`.
- Target purchase order: `PO-000141`, safe id prefix `d6abea75`.
- Do not approve or mutate until the exact Part 5 approval phrase is present in the mutation part.

## 2. Latest Commit Inspected

- `git log -1 --oneline`: `a35e9c01 Verify DEV-08C purchase order fixture evidence`.
- `git rev-parse HEAD`: `a35e9c01554b358c8eaba01a57ed30d1aeace6d6`.
- `git rev-parse origin/main`: `a35e9c01554b358c8eaba01a57ed30d1aeace6d6`.
- Local `HEAD` matched `origin/main` before Part 4 documentation edits.
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
- Hosted, production, beta, shared, and customer-like target fragments were refused by the read-only query before Prisma load.

## 4. Current Purchase Order State

| Check | Result |
| --- | --- |
| Marker-scoped purchase order count | `1` |
| Purchase order number | `PO-000141` |
| Purchase order safe id prefix | `d6abea75` |
| Supplier safe id prefix | `5ef871cd` |
| Supplier type | `SUPPLIER` |
| Supplier active | `yes` |
| Status | `DRAFT` |
| `approvedAt` | absent |
| `convertedBillId` | absent |
| Converted bill present | no |
| Line count | `1` |
| Account code | `111` |
| Account type | `ASSET` |
| Account active/posting | yes/yes |
| Tax rate | `VAT on Purchases 15%` |
| Tax scope/active | `PURCHASES`/yes |
| Subtotal | `1000.0000` |
| VAT | `150.0000` |
| Total | `1150.0000` |

## 5. Approval Eligibility

- Code path: `POST /purchase-orders/:id/approve`.
- Required permission: `purchaseOrders.approve`.
- Service method: `PurchaseOrderService.approve(...)`.
- Current status `DRAFT` is eligible.
- Service returns existing order only if it is already `APPROVED`.
- Service rejects any status other than `DRAFT` or already `APPROVED`.
- Positive/finalizable totals are required before approval; the fixture total is `1150.0000` and line count is `1`.
- Read-only preflight result: `approvalEligibleByReadModel = yes`.
- Existing approval audit count for the fixture: `0`.

## 6. Expected State Transition

If Part 5 is approved and executed exactly once:

- Purchase order status should change `DRAFT -> APPROVED`.
- `approvedAt` should be set.
- Purchase order total should remain `1150.0000`.
- `convertedBillId` should remain absent.
- No purchase bill should be created.
- No mark-sent, close, void, convert-to-bill, delete, PDF, or generated-document path should run.

## 7. Expected Accounting And Journal Result

- Purchase order approval is non-posting.
- Expected journal count for marker/PO after approval: `0`.
- No AP, VAT, expense/asset, inventory-clearing, bank/cash, reversal, or stock journal should be created.
- Purchase bill count linked to `PO-000141` should remain `0`.

## 8. Expected Audit Result

- Existing create audit count: `1`.
- Existing approval audit count: `0`.
- Expected Part 5 audit action: `PURCHASE_ORDER_APPROVED`.
- Expected approval audit count after Part 5: `1`.
- No `PURCHASE_ORDER_SENT`, `PURCHASE_ORDER_CLOSED`, `PURCHASE_ORDER_VOIDED`, `PURCHASE_ORDER_CONVERTED_TO_BILL`, or delete audit should be created by Part 5.

## 9. Expected Forbidden Side Effects

Current preflight side-effect counts:

| Check | Count |
| --- | ---: |
| Purchase bills linked to the purchase order | `0` |
| Journal entries tied to marker or PO number | `0` |
| Generated documents for the purchase order | `0` |
| Email outbox records containing the marker | `0` |
| Purchase receipts linked to the purchase order | `0` |
| Stock movements referencing the purchase order | `0` |

Expected Part 5 side effects: none beyond status, `approvedAt`, and one approval audit row.

## 10. Required Approval Phrase

`I approve DEV-08C Part 5 local-only purchase order approval mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`

## 11. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Targeted reads of [DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md](DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md), [DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md](DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md), [DEV_08C_PURCHASE_ORDER_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08C_PURCHASE_ORDER_FIXTURE_EVIDENCE_VERIFICATION.md), and [CODEX_HANDOFF.md](../../CODEX_HANDOFF.md).
- Targeted source reads for `PurchaseOrderService.approve(...)`, `purchase-order.controller.ts`, `purchase-order-rules.spec.ts`, and audit-event mapping.
- `docker info --format '{{.ServerVersion}} {{.OSType}}'`.
- `docker ps --filter name=infra-postgres-1 --filter name=infra-redis-1 --format '{{.Names}} {{.Status}} {{.Ports}}'`.
- `Test-NetConnection localhost -Port 5432`.
- `Test-NetConnection localhost -Port 6379`.
- `Get-ChildItem -Path apps/api/scripts -File` filtered for `*dev08c*`.
- Inline guarded `node -e` read-only Prisma preflight query.

## 12. Commands Skipped And Why

- `PurchaseOrderService.approve(...)` and all mutation services: forbidden for Part 4.
- API/web startup: not needed for read-only service/code/database preflight.
- Browser/login flows: forbidden because they can write audit logs.
- PDF/export/download/generate-PDF/archive commands: output-producing and forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Migrations, seed/reset/delete, Prisma reset, deploys, Vercel/Supabase changes, environment/provider/schema changes, backup/restore, production-hosting research, production, beta, shared, hosted, and customer-data targets: explicitly forbidden.

## 13. Blockers Or Discrepancies

- No blocker found for the approved Part 5 local-only approval mutation, provided the exact approval phrase is present.
- No discrepancy found between Part 2/Part 3 fixture evidence and the current read-only preflight state.

## 14. Exact Next Prompt Title

`DEV-08C Part 5: approved local purchase order approval mutation`
