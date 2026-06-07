# DEV-11 Purchase Receipt Inventory Asset Preflight

Date: 2026-05-30

Latest commit inspected: `f815bd1a Verify DEV-11 sales stock issue COGS evidence`

Marker: `DEV11-INV-20260530T000000`

## 1. Purpose And Scope

This Part 7 preflight plans the approved local-only Part 8 purchase receipt inventory asset posting checks for the DEV-11 marker fixture. It is read-only planning and code inspection only.

No runtime mutation, receipt asset posting, receipt asset reversal, purchase receipt void, fixture creation, report output, CSV/PDF/download/archive generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer-data access, body output, secret output, or app behavior change was performed.

## 2. Safety Rules

- Part 8 must run only after validating the exact Part 8 approval phrase.
- Part 8 must prove the database target is local-only before mutation.
- Accepted local target remains `postgresql` on `localhost:5432/accounting`.
- Mutation scope is limited to the synthetic marker organization and marker purchase receipt.
- Evidence output must stay limited to safe ID prefixes, counts, statuses, account codes, and numeric summaries.
- No DB URLs, tokens, headers, cookies, request bodies, response bodies, audit bodies, customer/vendor payload bodies, inventory payload bodies, CSV/PDF bodies, generated-document base64, or attachment bodies may be printed.
- No CSV, PDF, download, archive, generated-document output, login, browser, E2E, smoke, migration, seed, reset, delete, deploy, ZATCA, email, backup, or restore path is needed for Part 8.

## 3. Marker Fixture Dependency

Part 8 depends on the existing marker fixture after the completed COGS post/reversal checks:

| Component | Verified value |
| --- | --- |
| Marker | `DEV11-INV-20260530T000000` |
| Organization safe ID | `837b9c13` |
| User safe ID | `e08ad608` |
| Item | `DEV11-INV-WIDGET`, safe ID `27398986` |
| Warehouse | `DEV11-INV-MAIN`, safe ID `0b519fab` |
| Purchase bill | `DEV11-INV-BILL-0001`, safe ID `6d84a149` |
| Purchase receipt | `DEV11-INV-PRC-0001`, safe ID `a413ac33` |
| Purchase bill status/mode | `FINALIZED`, `INVENTORY_CLEARING` |
| Purchase receipt status | `POSTED` |
| Receipt asset posting before Part 8 | Not posted |
| Receipt quantity/value | `10.0000` units at `10.0000`, total `100.0000` |
| Bill clearing debit | `90.0000` |
| Fiscal period | May 2026 `OPEN` |
| Generated documents | `0` |

Current post-COGS marker baselines before Part 8 are journal entries `3`, journal lines `6`, stock movements `3`, generated documents `0`, and audit logs `2`.

## 4. Purchase Receipt Inventory Asset Workflow Map

### Routes

- Web list route: `/inventory/purchase-receipts`.
- Web new route: `/inventory/purchase-receipts/new`.
- Web detail route: `/inventory/purchase-receipts/[id]`.
- Related purchase bill route: `/purchases/bills/[id]`.
- Related review routes: `/inventory/reports/clearing-reconciliation` and `/inventory/reports/clearing-variance`.
- The receipt detail page loads the receipt, receipt accounting preview, and clearing reconciliation summary.
- The detail page shows `Post Inventory Asset` only when preview is postable and the subject has `inventory.receipts.postAsset`.
- The detail page shows `Reverse Inventory Asset Posting` only when the asset journal is posted, not reversed, and the subject has `inventory.receipts.reverseAsset`.

### Endpoints, Controllers, And Services

- `GET /purchase-receipts` requires `purchaseReceiving.view`.
- `POST /purchase-receipts` requires `purchaseReceiving.create` and creates an operational posted receipt without accounting journals.
- `GET /purchase-receipts/:id` requires `purchaseReceiving.view`.
- `GET /purchase-receipts/:id/accounting-preview` requires `inventory.view`.
- `POST /purchase-receipts/:id/post-inventory-asset` requires `inventory.receipts.postAsset`.
- `POST /purchase-receipts/:id/reverse-inventory-asset` requires `inventory.receipts.reverseAsset`.
- `POST /purchase-receipts/:id/void` requires `purchaseReceiving.create`.
- `GET /inventory/purchase-receipt-posting-readiness` is advisory/read-only and does not create journals.
- `PurchaseReceiptService.accountingPreview` creates no journal and returns eligibility, linked bill status/mode, receipt value, matching values, blockers, warnings, and preview journal lines.
- `PurchaseReceiptService.postInventoryAsset` transactionally creates one posted journal and links it to the receipt.
- `PurchaseReceiptService.reverseInventoryAsset` creates one posted reversal journal, marks the source asset journal `REVERSED`, and links the reversal to the receipt.
- `PurchaseReceiptService.void` blocks voiding while an active receipt asset journal exists and has not been reversed.

### Models And Status Fields

- `PurchaseReceipt.status`: `POSTED` or `VOIDED`.
- `PurchaseReceipt.inventoryAssetJournalEntryId`: unique link to the active/source receipt asset journal.
- `PurchaseReceipt.inventoryAssetPostedAt` and `PurchaseReceipt.inventoryAssetPostedById`: posting audit fields.
- `PurchaseReceipt.inventoryAssetReversalJournalEntryId`: unique link to the receipt asset reversal journal.
- `PurchaseReceipt.inventoryAssetReversedAt` and `PurchaseReceipt.inventoryAssetReversedById`: reversal audit fields.
- `PurchaseReceipt.purchaseBillId`: must link to a compatible finalized purchase bill for the supported path.
- `PurchaseBill.inventoryPostingMode`: must be `INVENTORY_CLEARING`.
- `JournalEntry.status`: source asset journal starts `POSTED`; reversal marks the source journal `REVERSED`.
- `JournalEntry.reversalOfId`: reversal journal points to the source asset journal.
- `PurchaseReceiptLine.stockMovementId`: original operational stock increase; asset posting should not create or change stock movements.

### Permissions

- Preview needs `inventory.view`.
- Asset posting needs `inventory.receipts.postAsset`.
- Asset reversal needs `inventory.receipts.reverseAsset`.
- Receipt list/detail need `purchaseReceiving.view`.
- Receipt creation and void use `purchaseReceiving.create`.
- Owner/Admin/Accountant roles include receipt asset posting/reversal permissions in the shared permission set; broad receiving or viewer roles should not be assumed to have posting rights.

### Settings Required

- `InventorySettings.enableInventoryAccounting` must be `true`.
- `InventorySettings.valuationMethod` must be `MOVING_AVERAGE`.
- `InventorySettings.purchaseReceiptPostingMode` must be `PREVIEW_ONLY`.
- Inventory Asset must map to an active posting account.
- Inventory Clearing must map to an active posting account.
- Inventory Clearing must be separate from Inventory Asset and AP code `210`.
- Every receipt line must have unit cost.
- Total receipt value must be greater than zero.

### Clearing-Mode Bill Requirement

The supported path requires:

- Linked purchase bill exists in the same tenant.
- Linked purchase bill status is `FINALIZED`.
- Linked purchase bill mode is `INVENTORY_CLEARING`.
- Receipt lines are linked to bill lines for reviewable bill/receipt matching.

For the marker fixture, the purchase bill clearing journal already debited Inventory Clearing `90.0000` and credited AP `90.0000`.

### Receipt Status Requirement

- Source receipt must be tenant-scoped and `POSTED`.
- Source receipt must not be voided.
- Source receipt must not already have `inventoryAssetJournalEntryId`.
- Source receipt should remain operationally posted after asset post/reversal; Part 8 should not void it.

### Fiscal-Period Requirement

- Asset posting uses the purchase receipt `receiptDate`.
- Posting date must fall inside an open fiscal period.
- Reversal uses the current reversal date and must also pass the fiscal-period guard.
- Closed, locked, missing, or invalid periods must block posting/reversal.

### Expected Journal Lines

For marker receipt `DEV11-INV-PRC-0001`, preview and posting should produce exactly two journal lines:

| Line | Side | Account | Amount | Description shape |
| ---: | --- | --- | ---: | --- |
| 1 | Debit | Inventory Asset `DEV11-1200` | `100.0000` | Purchase receipt inventory asset |
| 2 | Credit | Inventory Clearing `240` | `100.0000` | Inventory clearing |

The journal should be posted in `SAR`, reference the purchase receipt number, and balance total debit `100.0000` to total credit `100.0000`.

### Reversal Behavior

- Reversal requires an active posted receipt asset journal.
- Reversal creates one posted reversal journal with opposite lines: Dr Inventory Clearing, Cr Inventory Asset.
- Source receipt asset journal becomes `REVERSED`.
- Receipt fields `inventoryAssetReversalJournalEntryId`, `inventoryAssetReversedAt`, and `inventoryAssetReversedById` are populated.
- A second reversal must be rejected.

### Void Blocker Behavior

- If `inventoryAssetJournalEntryId` is set and `inventoryAssetReversalJournalEntryId` is still null, voiding must fail with the active receipt asset blocker.
- After reversal, normal receipt void stock rules apply, but Part 8 should not void the marker receipt unless a future prompt explicitly authorizes void mutation.

### Direct-Mode/Standalone/PO-Only Blockers

- `DIRECT_EXPENSE_OR_ASSET` bills are blocked because their accounting already debits the selected expense/asset line account; adding Dr Inventory Asset / Cr Inventory Clearing could double-count and leave clearing unreconciled.
- Standalone receipts are blocked because no finalized clearing-mode purchase bill exists.
- Purchase-order-only receipts are blocked because purchase orders are non-accounting documents and bill matching is unavailable until a purchase bill is linked.
- Part 8 should only verify these blocker behaviors if safe marker-scoped records already exist. It should not create broad direct-mode, standalone, or PO-only fixtures unless strictly necessary and marker-scoped.

### Audit And Log Behavior

- Asset posting calls audit input action `POST_INVENTORY_ASSET`, persisted as standardized audit event `PURCHASE_RECEIPT_ASSET_POSTED`.
- Asset reversal calls audit input action `REVERSE_INVENTORY_ASSET`, persisted as standardized audit event `PURCHASE_RECEIPT_ASSET_REVERSED`.
- Part 8 evidence should count audit rows and action names only; it must not print audit `before` or `after` JSON bodies.

## 5. Expected Receipt Asset Posting Amount

The marker receipt contains `10.0000` units at unit cost `10.0000`, so expected receipt asset posting amount is:

`10.0000 * 10.0000 = 100.0000`

## 6. Expected Journal Delta In Part 8

After successful asset posting and before reversal:

| Area | Expected delta |
| --- | ---: |
| Journal entries | `+1` |
| Journal lines | `+2` |
| Audit logs | `+1` with `PURCHASE_RECEIPT_ASSET_POSTED` |
| Stock movements | `0` |
| Generated documents | `0` |
| Inventory quantities | `0` |

Expected receipt field changes after posting:

- `inventoryAssetJournalEntryId` populated.
- `inventoryAssetPostedAt` populated.
- `inventoryAssetPostedById` populated.
- `inventoryAssetReversalJournalEntryId` remains null until reversal.
- `inventoryAssetReversedAt` remains null until reversal.
- `inventoryAssetReversedById` remains null until reversal.

If Part 8 reverses the asset posting, final deltas from the pre-Part-8 baseline should be journal entries `+2`, journal lines `+4`, audit logs `+2`, stock movements `0`, and generated documents `0`.

## 7. Expected Clearing Account Effect

Before asset posting, the marker bill clearing journal has Inventory Clearing debit `90.0000`, and the receipt has no active receipt asset clearing credit.

After asset posting and before reversal:

- Inventory Clearing credit from receipt asset journal: `100.0000`.
- Net clearing difference against the marker bill: `90.0000 - 100.0000 = -10.0000`.
- The negative difference reflects the marker receipt value exceeding the bill clearing debit by `10.0000`.

After reversal, the receipt asset journal pair should net to zero, and active receipt asset clearing credit should return to `0.0000` for the marker receipt.

## 8. Expected Financial Statement Effect

After asset posting and before reversal:

- Inventory Asset increases by `100.0000`.
- Inventory Clearing decreases by `100.0000` through the credit.
- Trial Balance remains balanced because debit equals credit.
- Balance Sheet remains balanced because the asset increase is offset by the clearing liability/contra-clearing movement.
- Operational inventory quantities and stock movements remain unchanged.

After reversal:

- Net Inventory Asset effect returns to `0.0000` versus the pre-Part-8 baseline.
- Net Inventory Clearing effect returns to `0.0000` versus the pre-Part-8 receipt asset baseline.
- Trial Balance and Balance Sheet remain balanced.

## 9. Forbidden Actions

- Do not run Part 8 without exact approval validation.
- Do not use production, beta, hosted, shared, or customer data.
- Do not create or alter fixtures outside the marker scope.
- Do not create direct-mode/standalone/PO-only fixtures unless strictly necessary, marker-scoped, and approved by the Part 8 prompt boundaries.
- Do not generate CSV, PDF, download, archive, generated-document output, attachments, emails, ZATCA artifacts, backups, restores, migrations, seeds, resets, deletes, deploys, or env changes.
- Do not run browser/login/E2E/smoke/full-test/full-build flows.
- Do not print secrets, DB URLs, tokens, headers, cookies, full payload bodies, audit metadata bodies, or attachment/output bodies.
- Do not void the marker receipt as part of Part 8 unless a later prompt explicitly authorizes void mutation.

## 10. Risks And Blockers

- Receipt asset posting is manual and accountant-reviewed; automatic receipt posting remains out of scope.
- Moving-average and receipt unit cost data are operational estimates; landed cost and FIFO/cost layers are not implemented.
- Direct-mode, standalone, and PO-only receipts should remain blocked unless a future accounting design changes them.
- Reversal date uses the current date, so Part 8 must verify that the current date falls in an open fiscal period or skip reversal if the guard blocks it.
- Active receipt asset posting should block voiding; a Part 8 void-block check should be an expected-failure precondition check only and must prove no state delta.
- Receipt asset posting must not alter the purchase bill AP/VAT journal, supplier ledger, stock movements, or operational quantities.

## 11. Recommended Next Thread

`DEV-11 Part 8: approved local purchase receipt inventory asset posting checks`
