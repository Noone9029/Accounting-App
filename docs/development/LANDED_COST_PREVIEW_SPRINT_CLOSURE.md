# Landed Cost Preview Sprint Closure

Date: 2026-06-06

Product: LedgerByte

Sprint: Landed Cost Preview Sprint

## Summary

This sprint added read-only landed cost preview for inventory-relevant purchase receipt and purchase bill lines. Users can enter estimated landed cost lines, choose an allocation method, and see preview landed unit costs and line values before any posting or valuation workflow exists.

LedgerByte remains controlled beta/user-testing only. This sprint does not implement landed cost posting, inventory valuation updates, FIFO/cost layers, automatic AP adjustment, supplier payment automation, debit note/refund automation, VAT filing, real ZATCA, supplier email, payment gateway work, or production infrastructure.

## Implemented Scope

- Added landed cost preview API under Inventory.
- Added allocation methods for value, quantity, equal, and manual allocation.
- Added categories for freight, customs/duty, insurance, handling, brokerage, storage, and other costs.
- Added source support for purchase receipts and purchase bills.
- Added purchase order source blocker for this sprint.
- Added return quantity context from purchase return lines.
- Added `/inventory/landed-cost` frontend route.
- Added source links from purchase receipt detail and purchase bill detail.
- Added a landed cost preview link and availability signal on Supplier/AP Dashboard.
- Added a valuation variance page link to landed cost preview.
- Added landed cost preview policy documentation.

## API Endpoints

New read-only endpoints:

- `GET /inventory/landed-cost/preview`
- `POST /inventory/landed-cost/preview`
- `GET /inventory/landed-cost/purchase-receipts/:id/preview`
- `GET /inventory/landed-cost/purchase-bills/:id/preview`

The `POST` endpoint accepts preview input but does not persist anything.

## Frontend Routes And Components

New route:

- `/inventory/landed-cost`

Updated surfaces:

- Inventory sidebar navigation.
- Route permission mapping.
- Purchase receipt detail.
- Purchase bill detail.
- Inventory valuation variance preview page.
- Supplier/AP Dashboard.

## Source Support

Supported:

- `PURCHASE_RECEIPT`
- `PURCHASE_BILL`

Deferred:

- `PURCHASE_ORDER`

Purchase order preview returns an unsupported-source blocker because open-order landed cost policy needs accountant review before modeling unreceived/unbilled cost.

## Landed Cost Categories

- `FREIGHT`
- `CUSTOMS_DUTY`
- `INSURANCE`
- `HANDLING`
- `BROKERAGE`
- `STORAGE`
- `OTHER`

## Allocation Methods

- `BY_VALUE`: base line value.
- `BY_QUANTITY`: source line quantity.
- `EQUAL`: equal split across eligible inventory lines.
- `MANUAL`: user-entered source-line allocation amounts.

## Calculation Behavior

- Only inventory-tracked source lines are eligible.
- Base receipt value uses receipt line unit cost, falling back to linked bill/order cost only when receipt unit cost is missing.
- Base bill value uses bill line quantity multiplied by bill line unit price.
- Costs are rounded to 4 decimal places.
- Automatic methods reconcile total allocated landed cost by applying the rounding remainder to the final eligible line.
- Manual allocations must equal total landed cost at 4 decimal places.
- Returned purchase quantity is surfaced as context only.

## Blockers And Warnings

The preview returns blockers for:

- No inventory lines.
- Zero quantity.
- Zero value basis for value allocation.
- Unsupported purchase order source.
- Manual allocation mismatch.
- Manual allocation unknown source line.

Warnings state that the workflow is read-only/planning-only and does not mutate accounting, inventory, AP, VAT, ZATCA, email, or source documents.

## Permission Behavior

Existing permissions are reused:

- `inventory.view` is required for the page and API.
- `purchaseReceiving.view` is required for purchase receipt source previews.
- `purchaseBills.view` is required for purchase bill source previews.
- `purchaseOrders.view` is required for purchase order source attempts.

Source links are hidden when the user lacks the relevant source permission. No mutation permissions are used because no mutation actions exist.

## Audit Behavior

No audit events were added. Ordinary landed cost previews are read-only planning views, not lifecycle events.

## Non-Effect Behavior

This sprint does not:

- Persist landed cost previews.
- Create landed cost documents.
- Create journals.
- Update inventory valuation.
- Update inventory item cost.
- Update moving average.
- Create FIFO/cost layers.
- Change inventory quantities.
- Affect AP balances.
- Affect purchase bill balances.
- Create supplier payments.
- Create debit notes or refunds.
- Affect VAT reports.
- Affect financial statements.
- Mutate purchase receipts, bills, orders, returns, matching reviews, or valuation variance previews.
- Send email.
- Call ZATCA.

## Schema And Migrations

No Prisma schema changes or migrations were added.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- inventory-landed-cost-preview.service.spec.ts --runInBand` - passed, 1 suite / 11 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- landed-cost/page.test.tsx --runInBand` - passed, 1 suite / 5 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - blocked only by unrelated `apps/web/src/app/marketing.test.tsx` `HomePage` JSX component errors at lines 35 and 65.
- `git diff --check` - passed; emitted line-ending warnings only.

## Known Blocker

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx` reports `HomePage` as `() => void` at lines 35 and 65.

Marketing files were not modified by this sprint.

## OS Power Commands

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power commands were run.

## Remaining Gaps

- No saved landed cost document lifecycle.
- No landed cost posting.
- No inventory valuation update.
- No moving-average update.
- No FIFO/cost layers.
- No multi-currency landed cost conversion.
- No weight/volume allocation.
- No accountant-approved posting policy.
- No reversal/void policy for posted landed cost.
- No broad browser workflow QA.
- No hosted/customer-data proof.

## 2026-06-06 FIFO Preview Follow-Up

The FIFO Cost-Layer Groundwork Sprint added a read-only link from Landed Cost Preview to FIFO Cost-Layer Preview.

This does not change landed cost behavior. Landed cost preview still does not persist landed cost documents, capitalize landed costs into inventory layers, post journals, update moving average, update stock valuation, affect AP, affect VAT, call ZATCA, or update financial statements.

## Recommended Next Sprint

Recommended next sprint:

> Run a focused landed-cost browser workflow QA and accountant policy review sprint for purchase receipt/bill source selection, cost-line entry, allocation methods, blockers, return context, and safe wording. Keep it read-only and do not implement posting, inventory valuation updates, AP adjustments, VAT effects, email, ZATCA, production hosting, or FIFO/cost layers.
