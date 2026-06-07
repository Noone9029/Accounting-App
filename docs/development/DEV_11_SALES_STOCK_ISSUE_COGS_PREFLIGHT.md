# DEV-11 Sales Stock Issue COGS Preflight

Date: 2026-05-30

Latest commit inspected: `f5328bfa Verify DEV-11 inventory fixture evidence`

Marker: `DEV11-INV-20260530T000000`

## 1. Purpose And Scope

This Part 4 preflight plans the local-only DEV-11 sales stock issue COGS posting check for the marker fixture. It is read-only planning and code inspection only.

No runtime mutation, COGS posting, COGS reversal, stock issue void, fixture creation, login/browser flow, report query, CSV/PDF/download/archive generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer-data access, body output, secret output, or app behavior change was performed.

## 2. Safety Rules

- Part 5 must run only after validating the exact approval phrase and local-only target classification.
- Accepted local target remains `postgresql` on `localhost:5432/accounting`.
- Mutation scope is limited to the synthetic marker organization and marker sales stock issue.
- Output must stay redacted to target classification, safe ID prefixes, counts, statuses, and numeric summaries.
- No DB URLs, tokens, headers, cookies, request bodies, response bodies, customer/vendor payload bodies, CSV/PDF bodies, generated-document base64, or attachment bodies may be printed.
- No CSV, PDF, generated-document archive, download, login, browser, ZATCA, email, backup, restore, deploy, migration, seed, reset, or delete path is needed for Part 5.

## 3. Marker Fixture Dependency

Part 5 depends on the verified Part 2/Part 3 marker fixture:

| Component | Verified value |
| --- | --- |
| Marker | `DEV11-INV-20260530T000000` |
| Organization safe ID | `837b9c13` |
| User safe ID | `e08ad608` |
| Item | `DEV11-INV-WIDGET`, safe ID `27398986` |
| Warehouse | `DEV11-INV-MAIN`, safe ID `0b519fab` |
| Sales invoice | `DEV11-INV-SINV-0001` |
| Sales stock issue | `DEV11-INV-SSI-0001`, safe ID `c3d25519` |
| Issue status | `POSTED` |
| COGS status before Part 5 | Not posted |
| Quantity issued | `5.0000` |
| Moving-average unit cost | `10.0000` |
| Expected COGS | `50.0000` |
| Fiscal period | May 2026 `OPEN` |
| Generated documents | `0` |

## 4. Sales Stock Issue COGS Workflow Map

### Routes

- Web list route: `/inventory/sales-stock-issues`.
- Web new route: `/inventory/sales-stock-issues/new`.
- Web detail route: `/inventory/sales-stock-issues/[id]`.
- Detail route loads the stock issue and its COGS accounting preview together.
- Detail route shows `Post COGS` only when preview is postable and the subject has `inventory.cogs.post`.
- Detail route shows `Reverse COGS` only when COGS is posted, not reversed, and the subject has `inventory.cogs.reverse`.

### Endpoints, Controllers, And Services

- `GET /sales-stock-issues` requires `salesStockIssue.view`.
- `POST /sales-stock-issues` requires `salesStockIssue.create` and creates an operational posted stock issue without posting COGS.
- `GET /sales-stock-issues/:id` requires `salesStockIssue.view`.
- `GET /sales-stock-issues/:id/accounting-preview` requires `inventory.view`.
- `POST /sales-stock-issues/:id/post-cogs` requires `inventory.cogs.post`.
- `POST /sales-stock-issues/:id/reverse-cogs` requires `inventory.cogs.reverse`.
- `POST /sales-stock-issues/:id/void` requires `salesStockIssue.create`.
- `SalesStockIssueService.accountingPreview` builds a preview only; it does not create journal rows.
- `SalesStockIssueService.postCogs` transactionally creates one posted journal and then links it to the stock issue.
- `SalesStockIssueService.reverseCogs` creates one posted reversal journal, marks the source COGS journal `REVERSED`, and links the reversal to the stock issue.
- `SalesStockIssueService.void` blocks voiding while an active COGS journal exists and has not been reversed.

### Models And Status Fields

- `SalesStockIssue.status`: `POSTED` or `VOIDED`.
- `SalesStockIssue.cogsJournalEntryId`: unique link to the active/source COGS journal.
- `SalesStockIssue.cogsPostedAt` and `SalesStockIssue.cogsPostedById`: COGS posting audit fields.
- `SalesStockIssue.cogsReversalJournalEntryId`: unique link to the COGS reversal journal.
- `SalesStockIssue.cogsReversedAt` and `SalesStockIssue.cogsReversedById`: COGS reversal audit fields.
- `JournalEntry.status`: COGS source journal starts as `POSTED`; reversal marks source journal `REVERSED`.
- `JournalEntry.reversalOfId`: reversal journal points to the source COGS journal.
- `SalesStockIssueLine.stockMovementId`: original operational stock decrease.
- `SalesStockIssueLine.voidStockMovementId`: populated only if the stock issue is later voided.

### Permissions

- Preview needs `inventory.view`.
- Posting needs `inventory.cogs.post`.
- Reversal needs `inventory.cogs.reverse`.
- Stock issue list/detail need `salesStockIssue.view`.
- Stock issue creation and void use `salesStockIssue.create`.
- Owner/Admin/Accountant roles include the COGS permissions in the shared permission set; sales/purchases/viewer-style roles should not be assumed to have posting or reversal rights.

### Settings Required

- `InventorySettings.enableInventoryAccounting` must be `true`.
- Valuation method must be `MOVING_AVERAGE`; FIFO remains placeholder-only for COGS.
- `inventoryAssetAccountId` must map to an active posting account.
- `cogsAccountId` must map to an active posting account.
- The source issue must be tenant-scoped, `POSTED`, not already COGS-posted, and have costable inventory-tracked lines.
- Moving-average cost data must exist from inbound stock movements at or before the issue date.

### Fiscal-Period Requirement

- COGS posting uses the stock issue `issueDate`.
- Posting date must fall inside an open fiscal period.
- Reversal uses the current reversal date and must also pass the fiscal-period guard.
- Closed, locked, missing, or invalid periods must block posting/reversal.

### Expected Journal Lines

For marker issue `DEV11-INV-SSI-0001`, preview and posting should produce exactly two journal lines:

| Line | Side | Account | Amount | Description shape |
| ---: | --- | --- | ---: | --- |
| 1 | Debit | COGS account `DEV11-5000` | `50.0000` | Sales stock issue COGS |
| 2 | Credit | Inventory Asset account `DEV11-1200` | `50.0000` | Sales stock issue inventory asset |

The journal should be posted in `SAR`, reference the stock issue number, and balance total debit `50.0000` to total credit `50.0000`.

### Reversal Behavior

- Reversal requires an active posted COGS journal.
- Reversal creates one posted reversal journal with opposite Dr/Cr lines.
- Source COGS journal becomes `REVERSED`.
- Stock issue fields `cogsReversalJournalEntryId`, `cogsReversedAt`, and `cogsReversedById` are populated.
- A second reversal must be rejected.

### Void Blocker Behavior

- If `cogsJournalEntryId` is set and `cogsReversalJournalEntryId` is still null, voiding must fail with the active COGS blocker.
- After COGS reversal, stock issue voiding may proceed if normal stock rules allow, but Part 5 should not void the marker issue unless a future prompt explicitly asks for that mutation.

### Audit And Log Behavior

- COGS posting writes an audit log with action `POST_COGS`, entity type `SalesStockIssue`, and the marker issue id.
- COGS reversal writes an audit log with action `REVERSE_COGS`, entity type `SalesStockIssue`, and the marker issue id.
- Part 5 evidence should count audit rows and actions, but must not print full `before` or `after` JSON payloads.

## 5. Read-Only Readiness Checks For Part 5

Before mutation, Part 5 should verify:

- Approval phrase exactly matches the Part 5 approval text.
- Local target is `localhost:5432/accounting`; reject production, beta, hosted, shared, or customer-like targets.
- Marker organization, user, item, warehouse, sales invoice, and sales stock issue exist.
- Marker sales stock issue is `POSTED`, not voided, and COGS has not been posted.
- Inventory accounting is enabled with `MOVING_AVERAGE`.
- COGS and Inventory Asset account mappings are present, active, and posting-eligible.
- Issue date falls in an open fiscal period.
- Preview status is `POSTABLE`, `canPost` is `true`, blocking reasons are empty, and total debit/credit are both `50.0000`.
- Pre-mutation counts are captured for journal entries, journal lines, stock movements, audit logs, generated documents, and marker issue posting fields.

## 6. Expected COGS Amount

The verified marker math is:

- Issued quantity: `5.0000`.
- Moving-average unit cost: `10.0000`.
- Expected COGS: `5.0000 * 10.0000 = 50.0000`.

## 7. Expected Journal Delta In Part 5

After successful COGS posting and before reversal:

| Area | Expected delta |
| --- | ---: |
| Journal entries | `+1` |
| Journal lines | `+2` |
| Audit logs | `+1` with `POST_COGS` |
| Generated documents | `0` |
| Stock movements | `0` |
| Inventory quantities | `0` |
| Operational inventory value | `0` |

Expected sales stock issue field changes after posting:

- `cogsJournalEntryId` populated.
- `cogsPostedAt` populated.
- `cogsPostedById` populated.
- `cogsReversalJournalEntryId` remains null until reversal.
- `cogsReversedAt` remains null until reversal.
- `cogsReversedById` remains null until reversal.

## 8. Expected Financial Statement Impact After COGS Post

- Profit and Loss COGS increases by `50.0000`.
- Inventory Asset decreases by `50.0000`.
- Trial Balance remains balanced because debit COGS equals credit Inventory Asset.
- Balance Sheet remains balanced because the asset decrease is matched by the current-period expense effect through retained earnings/net income.
- Operational quantity on hand remains `25.0000`; the COGS journal affects financial reports, not stock movement quantities.

## 9. Expected Reversal Impact

If Part 5 includes reversal:

- Journal entries increase by one more reversal journal.
- Journal lines increase by two more reversal lines.
- Audit logs increase by one more `REVERSE_COGS` row.
- Source COGS journal becomes `REVERSED`.
- Reversal journal is posted and points to the source COGS journal.
- Sales stock issue reversal fields are populated.
- Net COGS impact returns to `0.0000` versus the pre-Part-5 baseline.
- Net Inventory Asset impact returns to `0.0000` versus the pre-Part-5 baseline.
- Trial Balance and Balance Sheet remain balanced.
- Generated-document, CSV/PDF/archive/download, stock movement, and operational inventory quantity deltas remain `0`.

## 10. Forbidden Actions

- Do not run Part 5 without exact approval validation.
- Do not use production, beta, hosted, shared, or customer data.
- Do not create or alter fixtures outside the marker scope.
- Do not generate CSV, PDF, download, archive, generated-document output, attachments, emails, ZATCA artifacts, backups, restores, migrations, seeds, resets, deletes, deploys, or env changes.
- Do not run browser/login/E2E/smoke flows.
- Do not print secrets, DB URLs, tokens, headers, cookies, full payload bodies, or attachment/output bodies.
- Do not void the marker issue as part of Part 5 unless a later prompt explicitly authorizes void mutation.

## 11. Risks And Blockers

- Moving-average COGS is an operational estimate; there are no accounting-grade FIFO/cost layers yet.
- Reversal date uses the current date, so Part 5 must verify that the current date falls in an open fiscal period or skip reversal if the guard blocks it.
- Active COGS should block voiding; a Part 5 void-block check should be a safe expected-failure call only and must prove no state delta.
- Duplicate post and duplicate reversal checks should be expected-failure checks only and must prove no extra journal/audit/generated-document/stock-movement deltas.
- COGS posting must not alter sales invoice AR/revenue/VAT journals or operational stock movement quantities.

## 12. Recommended Next Thread

`DEV-11 Part 5: approved local sales stock issue COGS posting checks`
