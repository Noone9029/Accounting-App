# Purchase Receipt GL Posting Design

Audit date: 2026-05-14

## Status

This is a design document only. Purchase receipt GL posting is not implemented, no receipt inventory asset journals are created, and production purchase bill accounting remains unchanged by default.

The current groundwork adds `PurchaseBill.inventoryPostingMode` with:

- `DIRECT_EXPENSE_OR_ASSET`: default current behavior.
- `INVENTORY_CLEARING`: draft storage and accounting preview only; finalization is blocked until the future clearing workflow is implemented.

## A. Receipt Posting Journal

Future explicit receipt posting should create one posted journal for an eligible reviewed purchase receipt:

- Dr Inventory Asset
- Cr Inventory Clearing

The posting date should be the purchase receipt date and must pass the fiscal-period guard. The journal should be linked back to the purchase receipt and protected against duplicate posting.

Recommended future purchase receipt fields:

- `inventoryAssetJournalEntryId`
- `inventoryAssetReversalJournalEntryId`
- `inventoryAssetPostedAt`
- `inventoryAssetPostedById`
- `inventoryAssetReversedAt`
- `inventoryAssetReversedById`

## B. Future Bill Clearing Strategy

For inventory-tracked lines under a compatible future workflow, purchase bill finalization should clear Inventory Clearing instead of debiting the normal purchase expense or asset line directly:

- Dr Inventory Clearing
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

Non-inventory lines can continue using their selected expense or asset account. VAT reporting and supplier ledger behavior must remain tied to the posted purchase bill.

## C. Current Problem

Purchase bills currently post direct line debits, VAT, and AP:

- Dr selected bill line account
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

If a linked purchase receipt also posts Dr Inventory Asset / Cr Inventory Clearing while the purchase bill has already debited Inventory Asset or Expense, inventory or expense can be double-counted. Clearing can also remain uncleared because current purchase bill journals do not debit Inventory Clearing.

## D. Safe MVP Choice

The safe MVP is to allow purchase receipt GL posting only when the linked purchase bill has not yet been finalized or when the bill posting method is explicitly compatible with Inventory Clearing.

Recommended future blocking rules:

- Block receipt GL posting when linked to an already finalized bill posted under the current direct-line method.
- Block standalone receipts until a bill or approved clearing workflow exists.
- Block PO-only receipts until a compatible bill relationship exists.
- Block duplicate posting through a unique journal link.
- Block voiding a purchase receipt while receipt GL is active and unreversed.

Current compatibility rule:

- Direct-mode bills remain safe and unchanged.
- Clearing-mode bill previews show the future Dr Inventory Clearing / Dr VAT / Cr AP shape.
- Clearing-mode finalization is not enabled yet, so receipt posting remains no-go.

## E. Recommendation

Do not post purchase receipt GL entries for existing finalized bills unless a migration or clearing strategy exists. Implement explicit receipt posting only after the purchase bill clearing workflow, migration policy, reversal behavior, and accountant review checklist are approved.

## Future Endpoint Shape

Potential future endpoints:

- `POST /purchase-receipts/:id/post-inventory`
- `POST /purchase-receipts/:id/reverse-inventory`

Both endpoints should require accountant/admin permissions, organization context, fiscal-period checks, transactional journal creation, and idempotent duplicate rejection. Neither endpoint should mutate stock movements or purchase bill journals directly.
