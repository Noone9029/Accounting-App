# DEV-08G Purchase Receipt Inventory Hardening Preflight

## Purpose And Scope

This document opens DEV-08G as a local-only purchase receipt and inventory integration hardening branch.

- Task: `DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`.
- Latest commit inspected: `218e445c Close DEV-08F inventory clearing purchase bill evidence`.
- Local `HEAD` matched `origin/main`: `218e445c1daec564d88a3a509710d13a31288c9f`.
- Branch inspected: `main`.
- Selected future marker: `DEV08G-AP-20260527T000000`.
- Runtime mutation performed: no.
- This preflight did not create a purchase order, receipt, stock movement, journal, supplier, item, warehouse, bill, generated document, audit-writing login flow, migration, seed/reset/delete, deploy, environment/provider/schema change, output, email, ZATCA artifact, backup/restore action, production check, beta check, hosted/shared-target check, or customer-data action.

## Repo State And Local-Only Proof

- `git status --short` showed only pre-existing unrelated untracked web/marketing and graphify paths. They were left untouched and unstaged.
- `git log -1 --oneline` returned `218e445c Close DEV-08F inventory clearing purchase bill evidence`.
- The active branch was `main`.
- `git fetch origin main` completed read-only remote refresh; `HEAD` and `origin/main` both resolved to `218e445c1daec564d88a3a509710d13a31288c9f`.
- No `*dev08f*` or `*dev08g*` temporary script file exists under `apps/api/scripts`.
- Repository search found no existing `DEV08G-AP-20260527T000000` marker usage, no existing `DEV_08G_*.md` evidence file, and only existing DEV-08G references that point to this Part 1 prompt.
- No database connection, Docker write, service import, Prisma client execution, login, browser flow, or write-capable runner was used by this preflight.

## DEV-08F Context

DEV-08F closed the local-only inventory-clearing purchase bill and linked purchase receipt branch:

- Final bill: `BILL-000009`, safe prefix `04b3f131`, `VOIDED`, `INVENTORY_CLEARING`, balance due `0.0000`.
- Final linked receipt: `PRC-000004`, safe prefix `993adc10`, `VOIDED`.
- Original receipt movement: safe prefix `a7708ad8`, `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`.
- Receipt void movement: safe prefix `426c6ba0`, `ADJUSTMENT_OUT`, quantity `10.0000`.
- Bill journal `JE-000064` is `REVERSED`; bill reversal `JE-000067` is `POSTED`.
- Receipt asset journal `JE-000065` is `REVERSED`; asset reversal `JE-000066` is `POSTED`.
- Proved path: linked inventory-clearing bill receipt, manual asset posting, asset reversal, receipt void, and bill void.
- Still unproved before DEV-08G: purchase-order receipt matching, standalone receipt behavior, over/under receipt and variance paths, PO-only and standalone asset-post blockers, broader inventory posting policy, AP outputs/email, authenticated UI/API QA, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.

## Purchase Receipt Service Map

Inspected code:

- `apps/api/src/purchase-receipts/purchase-receipt.service.ts`.
- `apps/api/src/purchase-receipts/purchase-receipt.controller.ts`.
- `apps/api/src/purchase-receipts/purchase-receiving-status.controller.ts`.
- `apps/api/src/purchase-receipts/dto/create-purchase-receipt.dto.ts`.
- `apps/api/src/purchase-receipts/purchase-receipt.service.spec.ts`.
- `apps/api/prisma/schema.prisma`.

Source selection:

- `CreatePurchaseReceiptDto` may include `purchaseOrderId`, `purchaseBillId`, or neither.
- `sourceKind(...)` rejects a DTO that references both a purchase order and a purchase bill.
- `purchaseOrder` source is chosen when `purchaseOrderId` is present.
- `purchaseBill` source is chosen when `purchaseBillId` is present.
- `standalone` source is chosen when neither purchase source id is present.

Source validation:

- Purchase-order receipts must reference an organization-owned purchase order.
- Purchase-order receipts reject `DRAFT` and `VOIDED` orders with `Purchase order must be approved or sent before receiving stock.` The implementation allows `APPROVED` and `SENT`; it does not require conversion to a bill.
- Purchase-bill receipts must reference an organization-owned `FINALIZED` purchase bill.
- Standalone receipts require `supplierId`; `findStandaloneSupplier(...)` requires an active `SUPPLIER` or `BOTH` contact in the organization.
- All receipts require an active warehouse in the organization.

Line preparation:

- Purchase-order and purchase-bill receipt lines must reference the matching source line id.
- Source-line receipt item must exist, be inventory-tracked, and be active.
- A DTO `itemId`, when provided for a source-backed line, must match the source line item.
- Source-backed line `unitCost` defaults to source line `unitPrice` when not provided.
- Standalone lines require an explicit `itemId`, active inventory-tracked item, positive quantity, and optional non-negative unit cost.
- Empty prepared lines are rejected.

Remaining quantity and over-receipt behavior:

- `remainingReceiptQuantity(...)` starts with source line quantity and subtracts non-voided existing receipt lines.
- `prepareLines(...)` accumulates requested quantity per source line inside the transaction.
- A request above remaining source quantity is rejected with `Receipt quantity cannot exceed the remaining source quantity.`
- Because creation blocks excess quantity, DEV-08G should prove the over-receipt blocker as a negative check rather than expecting an over-received persisted state.

Receipt creation side effects:

- `create(...)` immediately creates `PurchaseReceipt.status = POSTED`.
- Each receipt line creates a `StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER` stock movement and links it to `PurchaseReceiptLine.stockMovementId`.
- Purchase receipt creation does not create a journal entry.
- Audit action is `CREATE` on entity type `PurchaseReceipt`.

Asset posting and reversal:

- `accountingPreview(...)` is preview-only.
- PO-only receipts add warning `Bill matching is not available until a purchase bill is linked.` and block posting with `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- Standalone receipts add warning `Standalone receipt cannot be financially posted until a bill or clearing workflow is selected.` and the same finalized inventory-clearing bill blocker.
- `postInventoryAsset(...)` requires a posted receipt, no existing asset journal, inventory accounting enabled, purchase receipt posting mode `PREVIEW_ONLY`, positive value, mapped inventory asset and clearing accounts, and a finalized linked `INVENTORY_CLEARING` purchase bill.
- Successful asset posting creates a balanced journal only; it does not mutate stock movements.
- `reverseInventoryAsset(...)` requires an active posted asset journal, creates a reversal journal, marks the original journal `REVERSED`, and records reversal fields on the receipt.

Void behavior:

- `void(...)` rejects already voided receipts.
- It rejects voiding a receipt with an active asset journal until the asset posting is reversed.
- It checks item quantity on hand per item and rejects if the void would make stock negative.
- Successful void changes `POSTED -> VOIDED`, creates `ADJUSTMENT_OUT` stock movements with `referenceType = PurchaseReceiptVoid`, links them to `voidStockMovementId`, and does not create a journal.
- Audit action is `VOID` on entity type `PurchaseReceipt`.

## Purchase Order Source Map

Inspected code:

- `apps/api/src/purchase-orders/purchase-order.service.ts`.
- `apps/api/src/purchase-receipts/purchase-receipt.service.ts`.
- `apps/api/prisma/schema.prisma`.
- DEV-08C purchase order conversion closure evidence.

Observed purchase-order requirements:

- Purchase orders are created as `DRAFT`.
- `approve(...)` changes `DRAFT -> APPROVED`; repeated approve on `APPROVED` returns the existing order.
- `markSent(...)` changes `APPROVED -> SENT`; repeated mark-sent on `SENT` returns the existing order.
- `convertToBill(...)` accepts `APPROVED` or `SENT`, creates a draft purchase bill, and changes the order to `BILLED`.
- Purchase receipt `loadSource(...)` only rejects `DRAFT` and `VOIDED` purchase orders, so `APPROVED` is enough for DEV-08G receipt testing.
- No purchase order conversion is needed for the first DEV-08G branch because the target is PO-sourced receiving and the PO-only matching warning before bill linkage.

Safest future PO fixture approach:

- Create one fake local supplier/contact if needed.
- Create or reuse one active inventory-tracked item if it is explicitly marker-scoped and local; otherwise create a marker-scoped item.
- Create or reuse one active warehouse only if policy allows and evidence can keep the target local; otherwise create a marker-scoped active warehouse.
- Create one purchase order with quantity `10.0000`, unit price `100.0000`, VAT `15%` if the local AP-ready setup safely supports it, and marker-bearing notes/description.
- Approve the purchase order and stop at `APPROVED` unless Part 2 discovers a service/UI requirement for `SENT`.
- Do not convert the PO to a bill in Part 2.

## Standalone Source Map

Standalone purchase receipts are operational stock receipts without a linked purchase order or purchase bill.

- DTO shape: no `purchaseOrderId`, no `purchaseBillId`, supplier id present, active warehouse id present, explicit item id on each line.
- Supplier requirement: active `SUPPLIER` or `BOTH` contact in the organization.
- Item requirement: organization-owned, active, inventory-tracked item.
- Warehouse requirement: organization-owned active warehouse.
- Unit cost: accepted as optional non-negative input; for DEV-08G standalone evidence, use explicit `100.0000` unit cost to make stock value and accounting preview deterministic.
- Accounting preview should remain design-only and block asset posting because there is no finalized linked inventory-clearing bill.

## Receiving And Matching Status Map

Receiving status:

- `purchaseOrderReceivingStatus(...)` and `purchaseBillReceivingStatus(...)` count only non-voided receipt lines.
- Inventory-tracked lines report source quantity, received quantity, and remaining quantity.
- Overall status is `NOT_STARTED` when no tracked line has received quantity, `PARTIAL` when some tracked quantity remains, and `COMPLETE` when all tracked source quantities are received.

Receipt matching status:

- `purchaseOrderReceiptMatchingStatus(...)` is operational-only and includes the warning that bill matching is unavailable until a purchase bill is linked.
- `receiptMatchingStatus(...)` reports `NOT_RECEIVED`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`, or `OVER_RECEIVED_WARNING`.
- For the chosen PO fixture, expected sequence is:
  - Before receipt: receiving `NOT_STARTED`, matching `NOT_RECEIVED`, remaining `10.0000`.
  - After quantity `4.0000`: receiving `PARTIAL`, matching `PARTIALLY_RECEIVED`, remaining `6.0000`.
  - After quantity `6.0000`: receiving `COMPLETE`, matching `FULLY_RECEIVED`, remaining `0.0000`.
  - Over-receipt attempt by `1.0000`: service rejects the mutation; persisted state should remain complete with two non-voided receipts until the later void parts.
  - After voiding the `6.0000` receipt: receiving/matching should return to partial with `4.0000` received and `6.0000` remaining.
  - After voiding the `4.0000` receipt: receiving/matching should return to not-started/not-received with no non-voided receipt lines.

## Accounting, Stock, And Audit Expectations

Expected stock behavior:

- Purchase-order and standalone receipt creation should create `PURCHASE_RECEIPT_PLACEHOLDER` movements.
- Receipt void should create matching `ADJUSTMENT_OUT` movements, subject to stock sufficiency.
- Void should not delete original stock movement evidence.

Expected accounting behavior:

- Purchase order fixture creation/approval has no journal.
- Purchase receipt creation has no journal.
- PO-only receipt asset posting negative check should fail before creating a journal.
- Standalone receipt asset posting negative check should fail before creating a journal.
- Receipt voids in this branch should have no journal because the branch intentionally avoids successful asset posting.

Expected audit behavior:

- Purchase order fixture should create `PurchaseOrder` `CREATE` and `APPROVE` audit actions; `MARK_SENT` only if Part 2 intentionally marks sent.
- Purchase receipt creation should create `PurchaseReceipt` `CREATE` audit actions.
- Over-receipt and asset-posting negative checks should not create success-state audit actions.
- Receipt voids should create `PurchaseReceipt` `VOID` audit actions.
- No login/browser audit-writing flow is allowed in DEV-08G unless a later prompt explicitly approves it.

## Selected DEV-08G Sequence

1. Part 2: create the local-only approved PO receipt source fixture.
2. Part 3: read-only verify the source fixture.
3. Part 4: read-only preflight partial PO receipt.
4. Part 5: create a partial PO receipt for quantity `4.0000`.
5. Part 6: read-only verify partial PO receipt evidence.
6. Part 7: read-only preflight remaining PO receipt.
7. Part 8: create the remaining PO receipt for quantity `6.0000`.
8. Part 9: read-only verify full PO receiving evidence.
9. Part 10: read-only preflight over-receipt negative check.
10. Part 11: attempt excess receipt quantity `1.0000` and verify the expected blocker.
11. Part 12: read-only verify over-receipt blocker evidence.
12. Part 13: read-only preflight PO-only asset-posting blocker.
13. Part 14: attempt PO-only asset posting and verify the expected blocker.
14. Part 15: read-only verify PO-only asset-posting blocker evidence.
15. Part 16: read-only preflight voiding the `6.0000` PO receipt.
16. Part 17: void the `6.0000` PO receipt.
17. Part 18: read-only verify the `6.0000` PO receipt void.
18. Part 19: read-only preflight voiding the `4.0000` PO receipt.
19. Part 20: void the `4.0000` PO receipt.
20. Part 21: read-only verify the `4.0000` PO receipt void.
21. Part 22: read-only preflight standalone receipt.
22. Part 23: create standalone receipt quantity `3.0000`.
23. Part 24: read-only verify standalone receipt evidence.
24. Part 25: read-only preflight standalone asset-posting blocker.
25. Part 26: attempt standalone asset posting and verify the expected blocker.
26. Part 27: read-only verify standalone asset-posting blocker evidence.
27. Part 28: read-only preflight standalone receipt void.
28. Part 29: void standalone receipt quantity `3.0000`.
29. Part 30: read-only verify standalone receipt void evidence.
30. Part 31: close DEV-08G.

## Proposed Part 2 Mutation Target

Part 2 should create one fresh marker-scoped local purchase order source fixture:

- Marker: `DEV08G-AP-20260527T000000`.
- One fake local active supplier/contact if needed.
- One active inventory-tracked item if needed.
- One active warehouse if needed and policy allows.
- One purchase order line for quantity `10.0000`, unit price `100.0000`, VAT `15%` if the selected local fixture setup supports a safe purchase tax dependency.
- Final purchase order status: prefer `APPROVED`; use `SENT` only if Part 2 proves it is needed.
- No purchase receipt, purchase bill, stock movement, journal, generated document, email, or ZATCA action in Part 2.

## Expected Forbidden Side Effects

Across Part 2 and the later DEV-08G mutation prompts, evidence should keep these absent unless a later prompt explicitly changes scope:

- Production, beta/user-testing, hosted/shared-target, or customer data.
- Schema changes, migrations, seed/reset/delete, broad cleanup, or destructive commands.
- Vercel/Supabase settings changes, deploys, environment changes, provider changes, or production-hosting research.
- Login or browser flows that write audit logs.
- Generated document, PDF/archive/export/download output.
- Real ZATCA XML/signing/QR/clearance/reporting artifacts.
- Real email outbox/provider sends.
- Purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, unrelated AP/AR/banking mutations, and cleanup/delete actions unless specifically approved by a future prompt.

## Required Part 2 Approval Phrase

Exact approval phrase required before any Part 2 mutation:

```text
I approve DEV-08G Part 2 local-only purchase order receipt source fixture mutation under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.
```

Part 2 must stop before mutation if this exact phrase has not been received. The approval must be checked after repo/local-target preflight and before importing write-capable services or running a guarded mutation path.

## Commands Run

- `git status --short`.
- `git status --short --branch`.
- `git log -1 --oneline`.
- `git branch --show-current`.
- `git remote -v`.
- `git fetch origin main`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `Get-ChildItem apps/api/scripts` filtered for `dev08f` and `dev08g`.
- `rg` searches for DEV-08G markers, source-kind handling, receiving/matching status, stock movement behavior, purchase-order transitions, purchase receipt tests, and web/API receipt surfaces.
- Read-only file inspection of the listed handoff, closure, runbook, service, controller, DTO, spec, and Prisma schema files.

## Commands Skipped

- `verify:repo`, `verify:ci:local`, full tests, full build, E2E, smoke, migrations, seed/reset/delete, deploys, env changes, login/audit-writing flows, ZATCA, email, backup/restore, exports/downloads/PDF generation, production-hosting research, production checks, beta checks, and browser flows.
- Any fixture creation, purchase order mutation, purchase receipt mutation, stock movement mutation, journal mutation, supplier/item/warehouse mutation, generated document mutation, cleanup/delete mutation, or service write.

## Verification Plan For This Documentation Slice

Run before commit:

- `corepack pnpm verify:diff`.
- `git diff --check`.
- `git diff --cached --check` if anything is staged.

## Exact Next Prompt Title

Part 2 follow-up:

- DEV-08G Part 2 completed the local-only purchase order receipt source fixture mutation.
- Evidence file: [DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Created supplier safe prefix `f5deec9a`, item safe prefix `3b8d7650`, and purchase order `PO-000003` safe prefix `a3efc2e4`.
- Final purchase order status: `APPROVED`.
- Reused active warehouse safe prefix `197fac56`.
- Purchase receipts, purchase bills, stock movements, journal entries, generated documents, email rows, supplier payments/refunds, purchase debit notes, and cash expenses remained absent for the marker/source.

`DEV-08G Part 3: purchase order receipt source fixture evidence verification`
