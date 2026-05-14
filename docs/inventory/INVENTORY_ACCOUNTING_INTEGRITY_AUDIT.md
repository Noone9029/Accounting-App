# Inventory Accounting Integrity Audit

Audit date: 2026-05-15

Commit audited: `4eb0188 Add inventory clearing reconciliation reports`

## Scope

This audit reviewed the implemented inventory accounting chain after manual COGS posting, explicit purchase receipt asset posting, purchase bill inventory-clearing mode, and read-only clearing reconciliation/variance reports.

Files and areas inspected:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/inventory/*`
- `apps/api/src/purchase-receipts/*`
- `apps/api/src/sales-stock-issues/*`
- `apps/api/src/purchase-bills/*`
- `apps/api/src/reports/*`
- `apps/api/src/stock-movements/*`
- `apps/api/src/warehouse-transfers/*`
- `apps/api/src/inventory-adjustments/*`
- `packages/shared/src/permissions.ts`
- Frontend inventory, purchase receipt, sales stock issue, purchase bill, report, permission, and sidebar helpers/pages
- `apps/api/scripts/smoke-accounting.ts`
- Inventory accounting design documents

No deployment, Vercel, or Supabase setup was reviewed or changed in this task.

## Current Inventory Accounting Scope

Inventory remains operational-first. Stock movements are the source for quantities and operational valuation estimates; journal entries are created only by explicit financial actions:

- Purchase bill finalization posts AP/VAT/direct line accounts or Inventory Clearing depending on `PurchaseBill.inventoryPostingMode`.
- Manual purchase receipt asset posting posts Dr Inventory Asset / Cr Inventory Clearing for eligible receipts linked to finalized `INVENTORY_CLEARING` bills.
- Manual sales stock issue COGS posting posts Dr COGS / Cr Inventory Asset for eligible posted stock issues.
- Reversal endpoints create posted reversal journals and mark original journals `REVERSED`.
- Clearing reconciliation and variance reports are read-only and do not create journals.

There is still no automatic COGS posting, no automatic purchase receipt asset posting, no automatic variance posting, no landed cost, no FIFO cost layers, and no serial/batch tracking.

## Operational Inventory Flow

Warehouses, stock movements, inventory adjustments, transfers, purchase receipts, and sales stock issues are operational quantity workflows.

- Direct stock movement creation is limited to opening balances.
- Inventory adjustments create stock movements only when approved; voiding approved adjustments creates opposite stock movements.
- Warehouse transfers create paired transfer-out/transfer-in movements; voiding creates opposite movements.
- Purchase receipt creation writes `PURCHASE_RECEIPT_PLACEHOLDER` inbound movements.
- Sales stock issue creation writes `SALES_ISSUE_PLACEHOLDER` outbound movements.
- These operational flows do not create `JournalEntry` rows by themselves.

Verdict: internally consistent for the current phase. Operational movement services are isolated from GL posting except through explicit manual accounting actions.

## Purchase Bill Direct Mode

Mode: `DIRECT_EXPENSE_OR_ASSET`

Journal behavior on finalization:

- Dr selected purchase bill line accounts
- Dr VAT Receivable when tax exists
- Cr Accounts Payable

Reports affected:

- Trial Balance, General Ledger, Balance Sheet, P&L, and VAT summary reflect the posted purchase bill journal according to account types.

Receipt posting eligibility:

- Receipts linked to direct-mode bills are blocked from manual receipt asset posting.
- Direct-mode bills are excluded from the main clearing reconciliation unless explicitly requested as `DIRECT_MODE_EXCLUDED`.
- If an anomalous receipt asset journal exists against a direct-mode bill, the variance report flags it as `RECEIPT_WITHOUT_CLEARING_BILL`.

Verdict: direct-mode behavior is preserved and protected from receipt asset double-counting.

## Purchase Bill Inventory Clearing Mode

Mode: `INVENTORY_CLEARING`

Journal behavior on finalization:

- Dr Inventory Clearing for inventory-tracked bill lines
- Dr selected line accounts for non-inventory lines
- Dr VAT Receivable when tax exists
- Cr Accounts Payable

Manual receipt asset posting journal:

- Dr Inventory Asset
- Cr Inventory Clearing

Clearing logic:

- Matching bill and receipt values should net Inventory Clearing to zero for that flow.
- Active receipt clearing credit excludes voided receipts and excludes receipt asset postings that have been reversed.
- Reversed receipt asset postings remain visible as variance/audit warnings.

Reports affected:

- Trial Balance and General Ledger naturally include bill clearing, receipt asset, COGS, and reversal journals.
- Balance Sheet reflects Inventory Asset only after receipt asset posting.
- Inventory Clearing reconciliation reports open differences between bill clearing debits and active receipt asset credits.

Verdict: clearing-mode bill finalization and manual receipt asset posting are internally consistent for reviewed, compatible flows.

## Sales Stock Issue COGS Flow

Operational behavior:

- A sales stock issue creates outbound operational stock movements.
- It does not post COGS automatically.

Manual COGS journal:

- Dr mapped COGS account
- Cr mapped Inventory Asset account

Reversal and void protection:

- Reversal creates a posted reversal journal dated to the current date and marks the original COGS journal `REVERSED`.
- Voiding a sales stock issue is blocked while COGS is active and unreversed.
- After COGS reversal, the stock issue can be voided if stock rules allow.

Reports affected:

- P&L reflects COGS only through posted COGS journals and their reversal journals.
- Stock movement reports remain operational and do not feed P&L.

Verdict: manual COGS posting is isolated, permission-gated, reversible, and protected against accidental active-COGS voids.

## Double-Counting Review

Reviewed risk areas:

- Direct-mode bills plus receipt asset posting: blocked by preview/posting eligibility.
- Clearing-mode bills plus receipt asset posting: expected path; clearing report compares values.
- Duplicate receipt asset posting: blocked by source journal link and transactional update claim.
- Duplicate receipt asset reversal: blocked by reversal link and original journal reversal relation.
- Duplicate COGS posting: blocked by source journal link and transactional update claim.
- Duplicate COGS reversal: blocked by reversal link and original journal reversal relation.
- Voided receipts/issues after posting: receipt/issue voids are blocked while posting is active; after reversal, operational void is allowed.
- Reversed receipt asset postings: excluded from active clearing credit and surfaced in variance warnings.
- Reversed COGS postings: original and reversal journal lines net through report status handling.
- Report endpoints and preview endpoints: smoke verifies they do not create journals.

No code-level double-counting defect was found in the audited paths.

## Report Consistency

Financial reports use posted and reversed journal rows so an original journal marked `REVERSED` and its posted reversal journal remain visible and net together.

Verified consistency expectations:

- Trial Balance remains balanced after clearing bill finalization, receipt asset posting, COGS posting, and reversals because each workflow creates balanced journals.
- P&L reflects COGS only after manual COGS posting and nets it out after COGS reversal.
- Balance Sheet reflects Inventory Asset only after manual receipt asset posting and nets it out after asset reversal.
- Inventory Clearing reconciliation compares finalized clearing bill debits to active receipt asset credits.
- Clearing GL balance and report-computed open difference tie out for the covered flow in smoke.
- Operational stock valuation remains separate from Balance Sheet inventory asset value.

Residual report risks:

- Date-filtered clearing tie-out can show timing differences when bill date, receipt date, and reversal date fall in different periods.
- Moving-average COGS remains an operational estimate, not a full accounting-grade cost-layer system.
- Multi-currency inventory accounting is not designed; current smoke and default posting paths are SAR-oriented.

## Permission Boundary Review

Backend guards:

- `POST /sales-stock-issues/:id/post-cogs` requires `inventory.cogs.post`.
- `POST /sales-stock-issues/:id/reverse-cogs` requires `inventory.cogs.reverse`.
- `POST /purchase-receipts/:id/post-inventory-asset` requires `inventory.receipts.postAsset`.
- `POST /purchase-receipts/:id/reverse-inventory-asset` requires `inventory.receipts.reverseAsset`.
- Inventory clearing reports require `inventory.view`.

Default roles:

- Owner/Admin/Accountant include manual posting and reversal permissions.
- Sales, Purchases, and Viewer do not include COGS or receipt asset posting/reversal permissions by default.

Frontend:

- Detail pages show posting/reversal buttons only when the preview state and user permissions allow the action.
- Report pages are exposed under inventory view navigation only.

Verdict: permission boundaries match the current accountant-reviewed manual posting model.

## Fiscal Period Review

Posting-date behavior:

- Purchase bill finalization uses bill date and is fiscal-period guarded.
- Purchase bill void reversal uses current date and is fiscal-period guarded.
- Receipt asset posting uses receipt date and is fiscal-period guarded.
- Receipt asset reversal uses current date and is fiscal-period guarded.
- COGS posting uses sales stock issue date and is fiscal-period guarded.
- COGS reversal uses current date and is fiscal-period guarded.
- Report, readiness, matching, and preview endpoints create no journals and are not fiscal-period blocked.

Verdict: journal-producing inventory accounting paths use the fiscal-period guard consistently.

## Smoke Coverage

The existing smoke flow covers:

- Inventory accounting settings and readiness.
- Direct-mode purchase bill preview/finalization behavior.
- Inventory-clearing bill finalization and Dr Inventory Clearing / Cr AP journal shape.
- Purchase receipt accounting preview no-journal behavior.
- Manual purchase receipt asset posting, trial-balance/general-ledger impact, active-posting void block, reversal, and void after reversal.
- Manual COGS posting, P&L impact, active-COGS void block, reversal, and void after reversal.
- Clearing reconciliation/variance reports and CSV exports.
- No journal creation from preview/report endpoints.

Verdict: smoke coverage is appropriate for the current integrity gate and should be reused before adding variance journal proposals.

## Known Limitations

- No automatic COGS posting.
- No automatic purchase receipt asset posting.
- No automatic variance or correction journals.
- No direct-mode receipt asset posting or historical direct-mode migration.
- No landed cost allocation.
- FIFO remains placeholder-only.
- No serial/batch tracking.
- No accounting-grade inventory cost layers.
- No dedicated inventory returns workflow.
- Moving-average COGS is an operational estimate requiring accountant review.

## Go/No-Go For Variance Journal Proposal Workflow

Recommendation: **GO for design and implementation of an accountant-reviewed variance journal proposal workflow**, with strict limits.

Allowed next phase:

- Propose variance journal entries from clearing reconciliation rows.
- Keep proposals draft/review-only until explicitly approved or posted by an authorized accountant.
- Continue blocking automatic variance posting.
- Keep direct-mode historical bills excluded unless a separate migration policy is approved.

Do not proceed yet with:

- Automatic variance posting.
- Automatic receipt asset posting.
- Landed cost capitalization.
- FIFO cost layers.
- Direct-mode historical migration.

Required controls for the next phase:

- Proposal source must reference the reconciliation/variance row, purchase bill, receipt, and source journals.
- Proposal must show exact Dr/Cr lines and report impact before posting.
- Proposal posting must be fiscal-period guarded and permission-gated.
- Proposal reversal/void behavior must be explicit.
- Tests must prove no proposal or report endpoint creates journals automatically.
