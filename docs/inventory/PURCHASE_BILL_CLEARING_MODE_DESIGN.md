# Purchase Bill Inventory Clearing Mode Design

Date: 2026-05-14

## Status

This phase implements accountant-reviewed purchase bill finalization for the explicit `INVENTORY_CLEARING` mode while keeping purchase receipt GL posting disabled.

No purchase receipt inventory asset journals are posted in this phase, and purchase bill finalization remains production-safe by preserving the current direct mode.

## Modes

### DIRECT_EXPENSE_OR_ASSET

This is the default and existing behavior:

- Dr selected purchase bill line account
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

Existing bills and newly created bills stay in this mode unless a user explicitly selects Inventory Clearing.

### INVENTORY_CLEARING

This is a future-compatible mode for inventory-tracked purchase lines:

- Dr Inventory Clearing for inventory-tracked purchase bill lines
- Dr selected line account for non-inventory lines
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

Current implementation supports preview, draft storage, and explicit finalization when the bill is still draft and inventory clearing settings pass validation. It does not post inventory asset entries from receipts.

## Future Receipt Posting Preconditions

Explicit purchase receipt GL posting should remain blocked until:

- Inventory accounting is enabled.
- Inventory Asset and Inventory Clearing accounts are mapped and validated.
- Valuation method is `MOVING_AVERAGE`.
- Purchase receipt posting mode is still review-gated.
- The linked purchase bill is in a compatible clearing mode or has not been finalized.
- Duplicate receipt posting and reversal fields exist on `PurchaseReceipt`.
- Fiscal period guard, void protection, and reversal rules are implemented.
- Accountant approval covers VAT timing, partial receipts, price variances, quantity variances, and migration policy.

## Migration Strategy

Existing finalized purchase bills should not be changed retroactively. They already posted direct line debits, VAT, and AP. Posting a linked receipt to Dr Inventory Asset / Cr Inventory Clearing against those bills can double-count inventory or expense and leave clearing unreconciled.

Recommended migration rule:

- Treat existing finalized direct-mode bills as excluded from future receipt GL posting unless a separate accountant-approved migration journal is created.
- Permit future receipt posting only for new documents that use a compatible bill clearing workflow.
- Preserve all historical journal entries and expose direct-mode counts in readiness so accountants can estimate migration work.

## Accountant Review Checklist

- Confirm Inventory Clearing account treatment: liability-style is recommended.
- Confirm tracked inventory bill lines should debit clearing instead of purchase expense or inventory asset.
- Confirm non-inventory lines remain direct to the selected expense or asset account.
- Confirm VAT timing and tax report behavior.
- Confirm partial receipt and partial bill matching rules.
- Confirm variance accounts and materiality thresholds.
- Confirm reversal dates and void blocking behavior.
- Confirm historical finalized direct-mode bill exclusion or migration policy.

## Implementation Order

1. Keep receipt GL posting disabled.
2. Add purchase bill mode storage and preview.
3. Show readiness counts for direct and clearing-mode bills.
4. Review mode behavior with accountant.
5. Implement clearing-mode finalization only after tests prove DIRECT mode is unchanged. Completed in the current phase.
6. Add receipt inventory asset posting fields and explicit posting/reversal endpoints.
7. Add clearing reconciliation and variance reporting.
