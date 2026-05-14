# Purchase Receipt GL Posting Design

Date: 2026-05-15

## Status

Explicit manual purchase receipt inventory asset posting is implemented for compatible receipts only. It is not automatic and it is not available for `DIRECT_EXPENSE_OR_ASSET` purchase bills.

Supported path:

- A purchase bill is finalized in `INVENTORY_CLEARING` mode.
- A purchase receipt is posted against that finalized bill.
- An accountant/user reviews `GET /purchase-receipts/:id/accounting-preview`.
- An authorized user explicitly calls `POST /purchase-receipts/:id/post-inventory-asset`.

Still out of scope:

- automatic purchase receipt posting
- direct-mode receipt posting
- historical bill migration
- landed cost
- FIFO
- serial/batch tracking

## A. Receipt Posting Journal

Manual receipt asset posting creates one posted journal:

- Dr Inventory Asset
- Cr Inventory Clearing

Amount is the sum of receipt line quantity multiplied by unit cost. The posting date is the purchase receipt date and must pass the fiscal-period guard.

`PurchaseReceipt` stores:

- `inventoryAssetJournalEntryId`
- `inventoryAssetReversalJournalEntryId`
- `inventoryAssetPostedAt`
- `inventoryAssetPostedById`
- `inventoryAssetReversedAt`
- `inventoryAssetReversedById`

Posting is transactional and duplicate posting is rejected.

## B. Bill Clearing Strategy

Compatible purchase bills use `INVENTORY_CLEARING` mode:

- Dr Inventory Clearing for inventory-tracked lines
- Dr selected line accounts for non-inventory lines
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

The receipt then moves the tracked value from Inventory Clearing into Inventory Asset. This keeps AP/VAT on the purchase bill and inventory asset recognition on the reviewed receipt.

## C. Direct-Mode Exclusion

`DIRECT_EXPENSE_OR_ASSET` purchase bills remain unchanged:

- Dr selected bill line account
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

Receipt asset posting is blocked for direct-mode bills because posting Dr Inventory Asset / Cr Inventory Clearing against a bill that already debited an expense or asset account can double-count inventory or expense and leave clearing unreconciled.

Existing finalized direct-mode bills are not migrated or retroactively changed.

## D. Eligibility Rules

Receipt asset posting requires:

- tenant-scoped posted purchase receipt
- receipt not voided
- no existing receipt asset journal
- linked tenant-scoped purchase bill
- linked bill finalized, not voided, and `INVENTORY_CLEARING`
- enabled inventory accounting
- `MOVING_AVERAGE` valuation
- valid active posting Inventory Asset account
- valid active posting Inventory Clearing account
- clearing account separate from Inventory Asset and Accounts Payable `210`
- at least one positive receipt line
- unit cost available for every line
- total receipt value greater than zero
- receipt date accepted by fiscal-period guard

The endpoint does not mutate stock movements, the purchase bill, AP, VAT, or supplier ledger.

## E. Reversal And Void Protection

`POST /purchase-receipts/:id/reverse-inventory-asset` creates a reversal journal using the existing journal reversal pattern. The reversal date is the current date for the MVP and must pass fiscal-period guard.

Purchase receipt void is blocked while a receipt asset journal is active and unreversed:

> Reverse inventory asset posting before voiding this purchase receipt.

After reversal, normal receipt void stock rules apply.

## F. Remaining Questions

- Inventory Clearing can now be reviewed with `GET /inventory/reports/clearing-reconciliation` and `GET /inventory/reports/clearing-variance`.
- The reports identify matched rows, partial rows, value variances, clearing-mode bills without active receipt asset postings, receipt asset postings without compatible clearing bills, and reversed receipt asset postings.
- The reports include clearing account GL activity summaries and CSV export, but they do not create adjustment or variance journals.
- How should price/quantity variances be posted when receipt cost differs from bill cost?
- How should landed cost allocation affect receipt asset posting?
- How should historical direct-mode bills be excluded or migrated if an organization later changes policy?

## Recommendation

Keep receipt asset posting explicit and accountant-reviewed. Use the clearing reconciliation and variance reports as review tools only. Do not enable automatic receipt GL posting or automatic variance journals until variance posting, landed cost policy, and historical migration rules are complete.

The 2026-05-15 integrity audit found the compatible manual receipt asset flow internally consistent and suitable as input for a future accountant-reviewed variance proposal workflow. That workflow should remain proposal/review based until an authorized user explicitly posts a journal.
