# Purchase Receipt Posting Readiness Audit

Audit date: 2026-05-14

## Scope

This audit reviews whether LedgerByte is ready to add explicit purchase receipt inventory asset posting. It does not enable posting, create inventory asset journals, change purchase bill accounting, add landed cost, add FIFO, or refactor accounting architecture.

## Current Behavior

- Purchase receipts create operational `PURCHASE_RECEIPT_PLACEHOLDER` stock movements only.
- Receipt accounting previews show Dr Inventory Asset / Cr Inventory Clearing when settings, mappings, and unit costs are present.
- Receipt previews always return `previewOnly: true` and `canPost: false`.
- Purchase bills currently post direct bill-line debits, VAT Receivable, and Accounts Payable.
- Purchase bills now store an `inventoryPostingMode`.
- `DIRECT_EXPENSE_OR_ASSET` remains the default and current finalization behavior.
- `INVENTORY_CLEARING` can be stored on draft bills only when inventory accounting settings are compatible, and its accounting preview uses Inventory Clearing for tracked inventory lines.
- `INVENTORY_CLEARING` finalization is blocked in this phase, so it cannot yet post clearing journals.
- Manual COGS posting exists for sales stock issues, but purchase receipt inventory asset posting does not exist.
- Financial reports consume posted journal entries only, so receipt previews and stock movements do not affect reports.

## Proposed Future Behavior

Future explicit receipt posting should create a reviewed journal:

- Dr Inventory Asset
- Cr Inventory Clearing

The matching bill workflow should later clear the liability through a compatible purchase bill journal:

- Dr Inventory Clearing
- Dr VAT Receivable, when applicable
- Cr Accounts Payable

This future model must not run automatically from receipt creation. It should follow the existing manual COGS pattern: preview, permission check, fiscal-period guard, transactional journal creation, source-document link, and reversible posting.

## Required Conditions Before Posting

- Inventory accounting is enabled for the organization.
- Valuation method is `MOVING_AVERAGE`.
- Purchase receipt posting mode remains `PREVIEW_ONLY` until a future posting feature is approved.
- Inventory Asset account is mapped, active, posting-enabled, tenant-owned, and type `ASSET`.
- Inventory Clearing account is mapped, active, posting-enabled, tenant-owned, type `LIABILITY` or `ASSET`, separate from Inventory Asset, and not AP code `210`.
- Receipt is posted, tenant-scoped, not voided, and has not already had receipt GL posted.
- Receipt lines have unit costs and source-line matching clarity.
- Posting date passes fiscal-period guard.
- Future duplicate-prevention fields and reversal fields exist on the purchase receipt model.
- Accountant has approved bill clearing, variance, VAT timing, void, and migration rules.
- Purchase bill clearing-mode finalization is implemented and proven not to change direct-mode behavior.

## Risks

- Existing finalized purchase bills already debit line accounts directly. Adding receipt posting can double-count Inventory Asset or Expense unless bill posting is adjusted or restricted.
- Inventory Clearing mode is preview-only today, so it does not yet provide a live clearing journal to match future receipt posting.
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
- What is the exact reversal date rule for receipt GL reversals?
- Should receipt posting be blocked when a linked purchase bill is already finalized under the current direct-line posting model?
- Should clearing-mode finalization be allowed only for unfinalized bills, or should it require a separate accountant-approved migration flag?
- How should debit notes, supplier returns, and partial receipt corrections interact with clearing?

## Recommended Implementation Order

1. Keep purchase receipt posting disabled and expose readiness only.
2. Add durable receipt GL posting fields in a future schema migration.
3. Add explicit `POST /purchase-receipts/:id/post-inventory` endpoint behind accountant/admin permission.
4. Block posting for finalized bills unless a compatible bill clearing method is present.
5. Implement purchase bill Inventory Clearing finalization after direct-mode regression tests are in place.
6. Add receipt GL reversal and block receipt void while receipt GL is active.
7. Add variance handling, VAT timing tests, and reconciliation reports.
8. Revisit landed cost, FIFO, returns, and serial/batch tracking after the clearing model is stable.

## Go/No-Go Checklist

- [x] Inventory Asset and Inventory Clearing account settings exist.
- [x] Inventory Clearing account validation rejects AP code `210` and same-account mapping.
- [x] Purchase receipt accounting preview shows the target journal but remains non-postable.
- [x] Bill/receipt matching visibility exists.
- [x] Manual COGS posting pattern exists for a future guarded implementation reference.
- [x] Purchase bill inventory posting mode field exists with direct mode default.
- [x] Purchase bill accounting preview endpoint shows direct vs clearing-mode journal shape without creating journals.
- [x] Readiness response exposes direct-mode and clearing-mode bill counts.
- [ ] Purchase receipt model has GL posting and reversal link fields.
- [ ] Purchase receipt posting and reversal endpoints exist.
- [ ] Purchase receipt void is blocked while receipt GL is active.
- [ ] Purchase bill clearing-mode finalization is implemented and accountant-approved.
- [ ] Existing finalized purchase bills have a migration or exclusion policy.
- [ ] Variance, VAT, landed cost, returns, and correction policies are approved.

## Recommendation

No-go for purchase receipt GL posting today. The system is ready for an explicit posting design task, but not ready to create inventory asset journals until bill clearing and migration rules are approved.
