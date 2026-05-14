# Purchase Receipt Posting Readiness Audit

Audit date: 2026-05-14

## Scope

This audit tracks the readiness gate for purchase receipt inventory asset posting. Explicit compatible receipt posting is now implemented; automatic receipt posting, direct-mode posting, landed cost, FIFO, and architecture refactors remain out of scope.

## Current Behavior

- Purchase receipts create operational `PURCHASE_RECEIPT_PLACEHOLDER` stock movements only.
- Receipt accounting previews show Dr Inventory Asset / Cr Inventory Clearing when settings, mappings, and unit costs are present.
- Receipt previews always return `previewOnly: true`; `canPost` is true only for eligible receipts linked to finalized `INVENTORY_CLEARING` bills.
- Purchase bills currently post direct bill-line debits, VAT Receivable, and Accounts Payable.
- Purchase bills now store an `inventoryPostingMode`.
- `DIRECT_EXPENSE_OR_ASSET` remains the default and current finalization behavior.
- `INVENTORY_CLEARING` can be stored on draft bills only when inventory accounting settings are compatible, and its accounting preview uses Inventory Clearing for tracked inventory lines.
- `INVENTORY_CLEARING` finalization is implemented for compatible draft purchase bills and posts Dr Inventory Clearing / Dr VAT / Cr AP. It does not touch purchase receipts or stock movements.
- Manual COGS posting exists for sales stock issues.
- Manual receipt inventory asset posting exists for compatible clearing-mode purchase bills only.
- Financial reports consume posted journal entries only, so receipt previews and stock movements do not affect reports. Explicit receipt asset posting affects reports through its journal.

## Implemented Manual Behavior

Explicit receipt posting creates a reviewed journal:

- Dr Inventory Asset
- Cr Inventory Clearing

The compatible purchase bill clears the liability through:

- Dr Inventory Clearing
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

This model does not run automatically from receipt creation. It follows the manual COGS pattern: preview, permission check, fiscal-period guard, transactional journal creation, source-document link, and reversible posting.

## Required Conditions Before Posting

- Inventory accounting is enabled for the organization.
- Valuation method is `MOVING_AVERAGE`.
- Purchase receipt posting mode remains `PREVIEW_ONLY`; it allows manual review but not automatic posting.
- Inventory Asset account is mapped, active, posting-enabled, tenant-owned, and type `ASSET`.
- Inventory Clearing account is mapped, active, posting-enabled, tenant-owned, type `LIABILITY` or `ASSET`, separate from Inventory Asset, and not AP code `210`.
- Receipt is posted, tenant-scoped, not voided, and has not already had receipt GL posted.
- Receipt lines have unit costs and source-line matching clarity.
- Posting date passes fiscal-period guard.
- Duplicate-prevention fields and reversal fields exist on the purchase receipt model.
- Accountant has approved bill clearing, void, and direct-mode exclusion rules.
- Purchase bill clearing-mode finalization is implemented and proven not to change direct-mode behavior.

## Risks

- Existing finalized purchase bills already debit line accounts directly. Adding receipt posting can double-count Inventory Asset or Expense unless bill posting is adjusted or restricted.
- Inventory Clearing mode can create live purchase bill clearing journals; receipt-side inventory asset journals now exist only after explicit posting, so unposted receipts can leave clearing balances requiring review.
- Clearing balances can remain unreconciled if receipt and bill quantities, costs, or taxes do not match.
- Standalone receipts and PO-only receipts do not have enough accounting context for AP or clearing.
- Landed cost is missing, so receipt unit cost may omit freight, duty, and allocation charges.
- FIFO is placeholder-only, so receipt posting cannot create accounting-grade cost layers.
- Reversing operational receipts without reversing receipt GL would misstate Inventory Asset and Clearing.

## Unresolved Accounting Questions

- Should Inventory Clearing be liability-style for every tenant, or can an asset clearing account be acceptable by policy?
- Should inventory-tracked purchase bill lines post to clearing instead of the selected expense/asset account?
- How should existing finalized bills that already posted direct line debits be migrated or excluded?
- How should price, quantity, tax, discount, and currency variances be recorded?
- Should reversal date stay current-date for production, or should users select a reversal date?
- Should direct-mode receipt posting ever be supported through migration journals, or should it remain permanently blocked?
- Clearing-mode finalization is allowed only for explicitly selected draft bills. Historical finalized direct-mode bills still need a migration or exclusion policy.
- How should debit notes, supplier returns, and partial receipt corrections interact with clearing?

## Recommended Implementation Order

1. Keep automatic purchase receipt posting disabled and expose readiness.
2. Keep direct-mode regression tests around purchase bill finalization.
3. Maintain durable receipt GL posting fields and explicit posting/reversal endpoints.
4. Block posting for finalized direct-mode bills unless an approved migration/exclusion rule exists.
5. Keep receipt void blocked while receipt GL is active.
6. Add variance handling, VAT timing tests, and reconciliation reports.
7. Revisit landed cost, FIFO, returns, and serial/batch tracking after the clearing model is stable.

## Go/No-Go Checklist

- [x] Inventory Asset and Inventory Clearing account settings exist.
- [x] Inventory Clearing account validation rejects AP code `210` and same-account mapping.
- [x] Purchase receipt accounting preview shows the target journal and allows posting only for compatible clearing-mode bills.
- [x] Bill/receipt matching visibility exists.
- [x] Manual COGS posting pattern exists for a future guarded implementation reference.
- [x] Purchase bill inventory posting mode field exists with direct mode default.
- [x] Purchase bill accounting preview endpoint shows direct vs clearing-mode journal shape without creating journals.
- [x] Readiness response exposes direct-mode and clearing-mode bill counts.
- [x] Purchase receipt model has GL posting and reversal link fields.
- [x] Purchase receipt posting and reversal endpoints exist.
- [x] Purchase receipt void is blocked while receipt GL is active.
- [x] Purchase bill clearing-mode finalization is implemented with direct-mode regression coverage.
- [ ] Existing finalized purchase bills have a migration or exclusion policy.
- [ ] Variance, VAT, landed cost, returns, and correction policies are approved.

## Recommendation

Go for explicit manual receipt inventory asset posting only when the receipt is linked to a finalized `INVENTORY_CLEARING` purchase bill and preview eligibility passes. No-go remains for automatic receipt posting, direct-mode receipt posting, historical migration, landed cost, FIFO, and clearing reconciliation until those policies are approved.
