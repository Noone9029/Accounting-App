# Inventory Returns Integration Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Inventory Returns Integration Sprint

## Summary

This sprint added explicit operational purchase-return inventory movement for safe receipt-linked returned goods. Purchase returns can now preview and post a `PURCHASE_RETURN_OUT` stock movement after approval/completion when tracked return lines are linked to posted purchase receipt lines and stock availability remains non-negative.

LedgerByte remains controlled beta/user-testing only. This sprint does not add automated accounting, AP/AR adjustment, VAT, ZATCA, valuation posting, landed cost, FIFO, supplier/customer email, payment automation, production hosting, or customer-data proof.

## Implemented Scope

- Added stock movement types `PURCHASE_RETURN_OUT` and reserved `SALES_RETURN_IN`.
- Added nullable purchase-return inventory posting metadata.
- Added unique purchase-return-line to stock-movement link.
- Added read-only purchase return inventory movement preview.
- Added explicit purchase return inventory movement post action.
- Added duplicate prevention at service and schema level.
- Added movement status and linked movement ID visibility on purchase return detail.
- Added stock movement labels and movement-report wording for return movement types.
- Added Supplier/AP Dashboard visibility for purchase returns awaiting inventory movement and movement-posted counts.
- Added valuation variance preview warning when a purchase return already has operational stock-out posted.
- Added audit logging for posted purchase return inventory movement.
- Added targeted API and frontend tests.

## Schema And Migration

Migration added:

- `apps/api/prisma/migrations/20260605203000_inventory_returns_integration/migration.sql`

Schema additions:

- `StockMovementType.PURCHASE_RETURN_OUT`
- `StockMovementType.SALES_RETURN_IN`
- `PurchaseReturn.inventoryReturnPostedAt`
- `PurchaseReturn.inventoryReturnPostedByUserId`
- `PurchaseReturnLine.stockMovementId`
- `StockMovement.purchaseReturnLine`
- User relation for purchase-return inventory movement posting.

The migration is additive. It does not reset data and does not alter accounting, AP/AR, VAT, ZATCA, valuation, landed-cost, FIFO, email, or payment tables.

## API Endpoints

New endpoints:

- `GET /purchase-returns/:id/inventory-return-preview`
- `POST /purchase-returns/:id/post-inventory-return`

Updated responses:

- Purchase return list/detail now include inventory movement status and linked movement IDs.
- Supplier/AP Dashboard includes returns awaiting inventory movement and movement-posted counts.
- Valuation variance preview can warn when linked purchase-return stock-out is already posted.

## Purchase Return Inventory Movement Behavior

- Preview is read-only and returns item, warehouse, return quantity, current on-hand, projected on-hand, blockers, and source purchase return context.
- Posting requires `APPROVED` or `COMPLETED` status.
- Posting requires inventory-tracked lines to be linked to posted purchase receipt lines with source stock movements.
- Posting decreases source receipt warehouse on-hand quantity through `PURCHASE_RETURN_OUT`.
- Non-tracked lines are skipped.
- Posting is blocked if no tracked receipt-linked lines exist.
- Posting is blocked when projected on-hand would become negative.
- Duplicate posting is blocked by header posted metadata and unique line movement links.
- Reversal is not supported yet; correction requires separate inventory adjustment policy/workflow.

## Sales Return Inventory Movement Behavior

Sales-side stock-in is deferred.

Reason:

- Existing credit notes have item and quantity data, but do not safely identify returned-stock warehouse, source delivery note line, or source sales stock issue line for inventory receipt.
- Posting stock-in from those records would risk creating inventory from an accounting credit without physical return validation.

The `SALES_RETURN_IN` movement type is reserved for a future explicit returned-goods document or credit-note extension.

## Supplier/AP Dashboard Integration

Supplier/AP Dashboard remains read-only.

It now shows:

- Purchase returns awaiting inventory movement.
- Purchase returns with inventory movement posted.
- Recent supplier activity labels that distinguish posted operational movement context.

It does not change payable balances and does not move inventory by itself.

## Valuation Variance Integration

Valuation variance preview remains read-only and preview-only.

It now can warn when a linked purchase return has operational stock-out movement posted. `RETURN_PENDING_CREDIT` rows remain preview-only and do not create supplier credit, refund, journal, or valuation posting.

## Permission Behavior

- Preview requires `inventory.view`.
- Posting requires `stockMovements.create`.
- Purchase return view/manage permissions are unchanged.
- View-only users can see movement status when they have inventory visibility.
- Restricted users without `stockMovements.create` cannot post inventory return movement.

No new permission strings were added.

## Audit Behavior

Added audit event:

- `PURCHASE_RETURN_INVENTORY_MOVEMENT_POSTED`

Audit metadata includes return ID, return number, supplier ID, movement IDs, item IDs, warehouse IDs, quantities, and non-effect flags. It does not log full payload bodies.

## Non-Effect Behavior

This sprint does not:

- Create accounting journals.
- Reverse accounting journals.
- Change AP balances.
- Change AR balances.
- Change bill or invoice balances.
- Create purchase debit notes.
- Create supplier refunds.
- Create customer refunds.
- Post variances.
- Update landed cost.
- Create FIFO/cost layers.
- Affect VAT reports.
- Affect financial statements.
- Send email.
- Call ZATCA.
- Automate delivery logistics.
- Change production hosting, Vercel, Supabase, runtime DB roles, object storage, backup/restore, or customer-data handling.

## Validation

Commands run:

- `corepack pnpm db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- purchase-return-rules.spec.ts purchase-return.controller.spec.ts stock-movement.service.spec.ts supplier-ap-dashboard.service.spec.ts inventory-valuation-variance-preview.service.spec.ts --runInBand`
- `corepack pnpm --filter @ledgerbyte/web test -- purchases/returns/[id]/page.test.tsx inventory.test.ts purchases/ap-dashboard/page.test.tsx --runInBand`

Current results:

- Prisma Client generation passed.
- Targeted API tests passed: 5 suites, 33 tests.
- Targeted frontend command passed: 2 matched suites, 17 tests.

Pending final validation after documentation:

- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `git diff --check`

## Marketing Typecheck Blocker

Repo-wide web typecheck remains expected to be blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- `HomePage` is reported as `() => void` at lines 35 and 65.

Marketing files were not modified.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Remaining Gaps

- Sales return stock-in needs a safe returned-goods source model.
- Purchase return inventory movement reversal is not implemented.
- Accountant review is still required before automated debit notes/refunds or valuation accounting.
- FIFO/cost layers and landed cost remain future work.
- Broad AP/inventory browser workflow QA remains open.

## 2026-06-06 Follow-Up

The Sales Inventory Return Document Sprint added the safe returned-goods source model for customer-side stock-in.

Sales return stock-in is now implemented through dedicated `SalesInventoryReturn` documents and explicit `SALES_RETURN_IN` movement posting. Credit notes remain reference/accounting documents and are not used alone to infer warehouse/source movement.

Remaining return-movement gaps after that follow-up:

- Purchase and sales return movement reversal.
- Accountant-approved future COGS/revenue reversal policy.
- Source visibility panels on delivery note, sales invoice, and sales stock issue details.
- FIFO/cost layers and landed cost.
- Broad browser workflow QA and hosted/customer-data proof.
- Hosted/beta/customer-data proof remains open.

## 2026-06-06 FIFO Preview Follow-Up

The FIFO Cost-Layer Groundwork Sprint now reads `PURCHASE_RETURN_OUT` and `SALES_RETURN_IN` stock movement rows conservatively for preview. Missing return cost/source traces are surfaced as FIFO preview warnings instead of inferred accounting precision.

This follow-up does not implement return movement reversal, active FIFO valuation, COGS reversal, journal posting, AP/AR adjustments, VAT effects, ZATCA behavior, or financial-statement updates.

## 2026-06-06 Traceability Follow-Up

The Serial Batch Bin Location Groundwork Sprint adds setup records for serial, batch, expiry, and bin/location tracking and introduces safe blockers for advanced-tracked items in return movement paths that do not yet capture complete tracking metadata.

Non-tracked purchase-return and sales-return stock movement compatibility remains unchanged. This follow-up does not implement return movement reversal, tracked return line capture, historical backfill, inventory valuation updates, active FIFO, COGS reversal, journal posting, AP/AR adjustments, VAT effects, ZATCA behavior, or financial-statement updates.

## Recommended Next Sprint

Implement a dedicated Sales Returns / Returned Goods operational document that captures customer, source credit note/invoice, warehouse, returned quantities, source stock issue or delivery reference, duplicate prevention, preview, permissions, audit, and no-accounting boundaries before enabling `SALES_RETURN_IN`.
