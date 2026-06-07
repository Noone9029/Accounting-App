# DEV-11 Clearing Variance Proposal Preflight

Date: 2026-05-30

Latest commit inspected: `a0c1e0e0 Verify DEV-11 purchase receipt inventory asset evidence`

Marker: `DEV11-INV-20260530T000000`

## 1. Purpose And Scope

This Part 10 preflight plans the approved local-only Part 11 clearing variance proposal lifecycle and posting checks for the DEV-11 marker fixture. It is read-only planning and code inspection only.

No runtime mutation, proposal creation, proposal submission, proposal approval, variance journal posting, variance journal reversal, proposal voiding, fixture creation, output generation, report output, CSV/PDF/download/archive generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer-data access, body output, secret output, or app behavior change was performed.

## 2. Safety Rules

- Part 11 must run only after validating the exact Part 11 approval phrase.
- Part 11 must prove the database target is local-only before mutation.
- Accepted local target remains `postgresql` on `localhost:5432/accounting`.
- Mutation scope is limited to the synthetic marker organization, marker purchase bill, and marker purchase receipt.
- Evidence output must stay limited to safe ID prefixes, counts, statuses, account codes, audit action names, event action names, and numeric summaries.
- No DB URLs, tokens, headers, cookies, request bodies, response bodies, audit bodies, customer/vendor payload bodies, inventory payload bodies, CSV/PDF bodies, generated-document base64, or attachment bodies may be printed.
- No CSV, PDF, download, archive, generated-document output, login, browser, E2E, smoke, migration, seed, reset, delete, deploy, ZATCA, email, backup, or restore path is needed for Part 11.

## 3. Marker Fixture Dependency

Part 11 depends on the existing marker fixture after the completed COGS and receipt asset post/reversal checks:

| Component | Verified value |
| --- | --- |
| Marker | `DEV11-INV-20260530T000000` |
| Organization safe ID | `837b9c13` |
| User safe ID | `e08ad608` |
| Purchase bill | `DEV11-INV-BILL-0001`, safe ID `6d84a149` |
| Purchase receipt | `DEV11-INV-PRC-0001`, safe ID `a413ac33` |
| Purchase bill status/mode | `FINALIZED`, `INVENTORY_CLEARING` |
| Purchase bill clearing debit | `90.0000` |
| Purchase receipt status | `POSTED` |
| Receipt asset posting final state | Source posted and reversed |
| Active receipt clearing credit after reversal | `0.0000` |
| Net clearing difference after reversal | `90.0000` |
| Existing variance proposals | `0` in the Part 3 baseline; Part 11 must re-check before creation |
| Fiscal period | May 2026 `OPEN` |
| Generated documents | `0` |

Current post-receipt-asset marker baselines are journal entries `5`, journal lines `10`, stock movements `3`, generated documents `0`, and audit logs `4`.

## 4. Clearing Variance Proposal Workflow Map

### Routes

- Web list route: `/inventory/variance-proposals`.
- Web new route: `/inventory/variance-proposals/new`.
- Web detail route: `/inventory/variance-proposals/[id]`.
- Source report route: `/inventory/reports/clearing-variance`.
- Source review route: `/inventory/reports/clearing-reconciliation`.
- Related source routes: `/purchases/bills/[id]` and `/inventory/purchase-receipts/[id]`.
- The clearing variance report offers a proposal link when the subject has `inventory.varianceProposals.create`.
- The new proposal route recomputes amount and accounts through the API for clearing sources; the browser form does not accept manual amount/account input for clearing-source proposals.
- The detail route loads proposal details, event timeline, and accounting preview, then exposes submit, approve, post, reverse, and void actions according to status and permissions.

### Endpoints, Controllers, And Services

- `GET /inventory/reports/clearing-variance` requires `inventory.view`; it is read-only unless CSV format is requested.
- `GET /inventory/reports/clearing-reconciliation` requires `inventory.view`; it is read-only unless CSV format is requested.
- `GET /inventory/variance-proposals` requires `inventory.varianceProposals.view`.
- `POST /inventory/variance-proposals` requires `inventory.varianceProposals.create` and creates a manual draft proposal.
- `POST /inventory/variance-proposals/from-clearing-variance` requires `inventory.varianceProposals.create` and creates a draft from the current clearing variance and reconciliation reports.
- `GET /inventory/variance-proposals/:id` requires `inventory.varianceProposals.view`.
- `GET /inventory/variance-proposals/:id/events` requires `inventory.varianceProposals.view`.
- `GET /inventory/variance-proposals/:id/accounting-preview` requires `inventory.varianceProposals.view` and creates no journal.
- `POST /inventory/variance-proposals/:id/submit` requires `inventory.varianceProposals.create`.
- `POST /inventory/variance-proposals/:id/approve` requires `inventory.varianceProposals.approve`.
- `POST /inventory/variance-proposals/:id/post` requires `inventory.varianceProposals.post`.
- `POST /inventory/variance-proposals/:id/reverse` requires `inventory.varianceProposals.reverse`.
- `POST /inventory/variance-proposals/:id/void` requires `inventory.varianceProposals.void`.
- `InventoryVarianceProposalService.createFromClearingVariance` creates the proposal and event only; it does not create a journal.
- `InventoryVarianceProposalService.post` creates the posted journal and links it to the proposal.
- `InventoryVarianceProposalService.reverse` creates the reversal journal, marks the source journal `REVERSED`, and links the reversal to the proposal.

### Models And Status Fields

- `InventoryVarianceProposal.status`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `POSTED`, `REVERSED`, or `VOIDED`.
- `InventoryVarianceProposal.sourceType`: `CLEARING_VARIANCE` for the marker path.
- `InventoryVarianceProposal.reason`: expected marker reason is `CLEARING_BILL_WITHOUT_RECEIPT`.
- `InventoryVarianceProposal.purchaseBillId`, `purchaseReceiptId`, and `supplierId` link the proposal to the source evidence.
- `InventoryVarianceProposal.amount`: expected marker amount is `90.0000`.
- `InventoryVarianceProposal.debitAccountId` and `creditAccountId` are derived from clearing difference direction and inventory settings for clearing-source proposals.
- `InventoryVarianceProposal.journalEntryId` links the source variance journal after posting.
- `InventoryVarianceProposal.reversalJournalEntryId` links the reversal journal after reversal.
- `InventoryVarianceProposalEvent.action`: `CREATE`, `SUBMIT`, `APPROVE`, `POST`, `REVERSE`, or `VOID`.
- `JournalEntry.status`: source variance journal starts `POSTED`; reversal marks the source journal `REVERSED`.
- `JournalEntry.reversalOfId`: reversal journal points to the source variance journal.

### Permissions

- Viewing proposals, events, and accounting preview needs `inventory.varianceProposals.view`.
- Creating manual or clearing-source draft proposals needs `inventory.varianceProposals.create`.
- Submitting a draft proposal also uses `inventory.varianceProposals.create`.
- Approving needs `inventory.varianceProposals.approve`.
- Posting needs `inventory.varianceProposals.post`.
- Reversing needs `inventory.varianceProposals.reverse`.
- Voiding needs `inventory.varianceProposals.void`.
- Clearing variance and clearing reconciliation reports use `inventory.view`.
- Owner/Admin/Accountant roles include the variance proposal workflow permissions in the shared permission set; broad viewer roles should not be assumed to have mutation permissions.

### Settings Required

- `InventorySettings.enableInventoryAccounting` must be `true`.
- Inventory Clearing must map to an active posting account.
- A positive net clearing difference requires Inventory Adjustment Loss to map to an active posting account of type `EXPENSE` or `COST_OF_SALES`.
- A negative net clearing difference requires Inventory Adjustment Gain to map to an active posting account of type `REVENUE`.
- Debit and credit accounts must be different.
- The marker settings satisfy these requirements: Inventory Clearing `240`, Adjustment Loss `DEV11-5100`, and Adjustment Gain `DEV11-4100`.

### Clearing Variance Report Dependency

- Clearing reconciliation computes `netClearingDifference = billClearingDebit - receiptClearingCredit`.
- A clearing-mode finalized bill with no active receipt asset posting is classified as `BILL_WITHOUT_RECEIPT_POSTING`.
- Receipt asset reversal leaves active receipt clearing credit at `0.0000`.
- The marker bill clearing debit is `90.0000`, so the current expected net clearing difference is `90.0000`.
- Clearing variance rows are derived from reconciliation rows and keep rows where `varianceAmount > 0` or warnings exist.
- Reversed receipt asset postings add a warning row, but the service `findVarianceRow` returns the first matching positive row for the marker bill/receipt pair.
- Part 11 should avoid CSV format and should perform only small numeric reads needed to verify ledger effect.

### Proposal Lifecycle

- Create from clearing variance: creates one `DRAFT` proposal and one `CREATE` event, with no journal.
- Submit: `DRAFT -> PENDING_APPROVAL`, creates one `SUBMIT` event, with no journal.
- Approve: `PENDING_APPROVAL -> APPROVED`, creates one `APPROVE` event, with no journal.
- Preview: allowed to view before posting, but `canPost` should be true only after approval and only when fiscal-period/account blockers are absent.
- Post: `APPROVED -> POSTED`, creates one posted journal, links `journalEntryId`, and creates one `POST` event.
- Reverse: `POSTED -> REVERSED`, creates one posted reversal journal, marks source journal `REVERSED`, links `reversalJournalEntryId`, and creates one `REVERSE` event.
- Void: allowed only for `DRAFT`, `PENDING_APPROVAL`, or `APPROVED`; blocked for `POSTED` until reversed and blocked for terminal `REVERSED`.

### Expected Journal Lines On Post

For marker purchase bill `DEV11-INV-BILL-0001` and receipt `DEV11-INV-PRC-0001`, the expected clearing-source proposal journal is:

| Line | Side | Account | Amount | Description shape |
| ---: | --- | --- | ---: | --- |
| 1 | Debit | Inventory Adjustment Loss `DEV11-5100` | `90.0000` | Inventory variance proposal |
| 2 | Credit | Inventory Clearing `240` | `90.0000` | Inventory variance proposal |

The journal should be posted in `SAR`, reference the proposal number, and balance total debit `90.0000` to total credit `90.0000`.

### Reversal Behavior

- Reversal requires a posted proposal with an active posted source journal.
- Reversal creates one posted reversal journal with opposite lines: Dr Inventory Clearing, Cr Inventory Adjustment Loss.
- Source variance journal becomes `REVERSED`.
- Proposal fields `reversalJournalEntryId`, `reversedAt`, `reversedById`, and optional `reversalReason` are populated.
- A second reversal must be rejected.

### Void Behavior

- Voiding a posted proposal must fail with `Reverse variance proposal journal before voiding this proposal.` and no state delta.
- Voiding a reversed proposal must fail with `Reversed variance proposals are terminal.` and no state delta.
- Part 11 should not destroy evidence by voiding a draft/approved proposal unless the lifecycle intentionally stops before post, which is not the expected path.

### Fiscal-Period Requirement

- Posting uses `InventoryVarianceProposal.proposalDate`.
- Reversal uses the current reversal date.
- Both posting and reversal call the fiscal-period guard.
- If fiscal periods exist, posting/reversal dates must fall inside open periods and must not be closed or locked.
- The marker fixture has an open May 2026 fiscal period; Part 11 must still verify the current local date is allowed before reversal.

### Audit And Log Behavior

- Proposal workflow creates `InventoryVarianceProposalEvent` rows for lifecycle actions.
- Audit input actions map to persisted audit events:
  - `CREATE` -> `INVENTORY_VARIANCE_PROPOSAL_CREATED`
  - `SUBMIT` -> `INVENTORY_VARIANCE_PROPOSAL_SUBMITTED`
  - `APPROVE` -> `INVENTORY_VARIANCE_PROPOSAL_APPROVED`
  - `POST` -> `INVENTORY_VARIANCE_PROPOSAL_POSTED`
  - `REVERSE` -> `INVENTORY_VARIANCE_PROPOSAL_REVERSED`
  - `VOID` -> `INVENTORY_VARIANCE_PROPOSAL_VOIDED`
- Part 11 evidence should count action names only; it must not print audit `before` or `after` JSON bodies.

## 5. Expected Proposal Amount And Account Mapping

The marker state after receipt asset reversal is:

`billClearingDebit 90.0000 - activeReceiptClearingCredit 0.0000 = netClearingDifference 90.0000`

Because the net clearing difference is positive, the service maps the proposal to:

| Field | Expected value |
| --- | --- |
| Proposal amount | `90.0000` |
| Reason | `CLEARING_BILL_WITHOUT_RECEIPT` |
| Debit account | Inventory Adjustment Loss `DEV11-5100` |
| Credit account | Inventory Clearing `240` |

## 6. Expected Journal Delta In Part 11

Before reversal:

| Area | Expected delta |
| --- | ---: |
| Inventory variance proposals | `+1` |
| Proposal events | `+4` for create, submit, approve, post |
| Journal entries | `+1` |
| Journal lines | `+2` |
| Audit logs | `+4` |
| Stock movements | `0` |
| Generated documents | `0` |

If Part 11 reverses the posted proposal, final deltas from the pre-Part-11 baseline should be proposal rows `+1`, proposal events `+5`, journal entries `+2`, journal lines `+4`, audit logs `+5`, stock movements `0`, and generated documents `0`.

## 7. Expected Financial Statement Effect

After variance proposal posting and before reversal:

- Inventory Adjustment Loss increases by `90.0000`.
- Inventory Clearing is credited by `90.0000`, offsetting the marker bill's active clearing debit.
- Trial Balance remains balanced because debit equals credit.
- Profit and Loss reflects the adjustment loss.
- Balance Sheet clearing balance decreases by the same amount.
- Operational inventory quantities, stock movements, and operational stock valuation are unchanged.

After reversal:

- The source variance journal is marked `REVERSED`.
- The reversal journal posts Dr Inventory Clearing `90.0000` / Cr Inventory Adjustment Loss `90.0000`.
- Net effect from the source plus reversal pair returns to `0.0000`.
- Trial Balance remains balanced and generated-document count remains unchanged.

## 8. Forbidden Actions

- Do not run Part 11 without exact approval validation.
- Do not use production, beta, hosted, shared, or customer data.
- Do not create or alter fixtures outside the marker scope.
- Do not create broad blocker fixtures.
- Do not generate CSV, PDF, download, archive, generated-document output, attachments, emails, ZATCA artifacts, backups, restores, migrations, seeds, resets, deletes, deploys, or env changes.
- Do not run browser/login/E2E/smoke/full-test/full-build flows.
- Do not print secrets, DB URLs, tokens, headers, cookies, full payload bodies, audit metadata bodies, or attachment/output bodies.
- Do not void the marker proposal after posting/reversal except as a safe expected-failure blocker check with proven no delta.

## 9. Risks And Blockers

- Clearing variance proposals are manual accountant-review controls; automatic variance posting remains out of scope.
- The marker receipt asset posting is reversed, so the report can surface both an open clearing difference and a reversed-receipt warning. Part 11 must select the intended first matching positive marker row and document any additional warning row as context only.
- Reversal date uses the current date, so reversal can be blocked if the current local date is outside an open fiscal period.
- Reversed journals and reversal journals must be interpreted carefully when summarizing financial-statement impact.
- Creating a duplicate proposal for the same source may be allowed by schema; Part 11 should identify any existing marker proposal before creating another one.
- The workflow is local-only evidence, not production/beta/customer-data proof.

## 10. Recommended Next Thread

`DEV-11 Part 11: approved local clearing variance proposal posting checks`
