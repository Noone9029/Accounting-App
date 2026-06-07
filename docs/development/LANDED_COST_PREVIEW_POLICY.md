# Landed Cost Preview Policy

Date: 2026-06-06

Product: LedgerByte

## Purpose

Landed cost preview is a read-only planning workflow for estimating how freight, customs, duty, insurance, handling, brokerage, storage, and other landed costs could be allocated across inventory-relevant purchase receipt or purchase bill lines.

The preview exists before landed cost posting, inventory valuation updates, FIFO/cost layers, automatic AP adjustment, or accounting automation. It is not a landed cost document and is not a posting workflow.

## Supported Sources

Supported in this sprint:

- `PURCHASE_RECEIPT`
- `PURCHASE_BILL`

Deferred:

- `PURCHASE_ORDER`

Purchase orders are accepted as a source type but return a blocker because open-order landed cost modeling needs separate accountant policy for unreceived/unbilled quantities.

## Cost Categories

Supported categories:

- `FREIGHT`
- `CUSTOMS_DUTY`
- `INSURANCE`
- `HANDLING`
- `BROKERAGE`
- `STORAGE`
- `OTHER`

Cost line supplier IDs are optional. When supplied, they must belong to the organization and be active suppliers.

## Allocation Methods

Supported methods:

- `BY_VALUE`: allocate by each eligible line's base inventory value.
- `BY_QUANTITY`: allocate by each eligible line's quantity.
- `EQUAL`: allocate evenly across eligible lines.
- `MANUAL`: use user-provided line allocation amounts.

Weight and volume allocation are intentionally not implemented because the current item/source data does not safely provide those bases.

## Rounding Approach

- Money and unit-cost outputs are rounded to 4 decimal places.
- Automatic allocation methods round each line allocation to 4 decimal places.
- The final eligible line receives the rounding remainder so total allocated landed cost reconciles to total entered landed cost.
- Manual allocation totals are compared at 4 decimal places and must equal total entered landed cost.

## Eligibility And Blockers

Only inventory-tracked source lines are eligible.

The preview returns blockers when:

- No inventory lines exist.
- Quantity basis is zero.
- Value basis is zero for value allocation.
- Manual allocation total does not equal total landed cost.
- Manual allocation references an unknown source line.
- Source type is unsupported for this sprint.

Returned purchase quantity is shown as context when available. It does not reduce source quantity or change allocation in this sprint.

## Accounting Boundary

The preview never:

- Posts journals.
- Creates or reverses journals.
- Changes AP balances.
- Changes purchase bill balances.
- Creates supplier payments.
- Creates debit notes.
- Creates supplier refunds.
- Affects VAT reports.
- Affects financial statements.

Future posting requires separate accountant-approved policy, schema, permissions, audit events, reconciliation behavior, and tests.

## Inventory Valuation Boundary

The preview never:

- Updates inventory item cost.
- Updates moving average.
- Creates FIFO/cost layers.
- Creates stock movements.
- Changes inventory quantities.
- Changes inventory valuation reports.
- Mutates purchase receipts, purchase bills, purchase orders, matching reviews, valuation variance previews, or return documents.

Future valuation updates require accountant review and must be implemented outside this preview workflow.

## VAT, ZATCA, Email, And Payment Boundary

The preview never:

- Affects VAT reports or VAT filing.
- Calls ZATCA.
- Sends email.
- Creates payment links.
- Creates supplier payment automation.

## Permissions

Existing permissions are reused:

- `inventory.view` is required to access landed cost preview.
- `purchaseReceiving.view` is required for purchase receipt sources.
- `purchaseBills.view` is required for purchase bill sources.
- `purchaseOrders.view` is required for purchase order source attempts.

No new permission strings were added.

## Audit Behavior

Ordinary landed cost preview views are read-only planning actions and are not audited.

Future saved landed cost documents, posting approvals, valuation updates, AP adjustments, or accountant decisions would need explicit audit events.

## Future Requirements Before Posting

Before LedgerByte can post or persist landed cost:

- Accountant must approve allocation policy, rounding, source eligibility, return handling, tax treatment, and multi-currency handling.
- Schema must define saved landed cost documents and lifecycle state.
- Posting permissions and dual-control review must be designed.
- Journal, AP, inventory valuation, VAT, and financial statement effects must be documented and tested.
- FIFO/cost-layer and moving-average behavior must be designed separately.
- Reversal/void behavior must be designed before any posting path ships.
