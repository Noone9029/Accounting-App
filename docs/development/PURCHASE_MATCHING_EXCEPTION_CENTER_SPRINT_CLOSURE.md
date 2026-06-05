# Purchase Matching Exception Center Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Purchase Matching Exception Center Sprint

## Summary

This sprint added a central read-only purchase matching exception center for Purchases/AP and Inventory. It aggregates PO-to-bill-to-receipt mismatches across purchase orders, purchase bills, and purchase receipts so users can review supplier-facing matching exceptions without changing accounting, AP, inventory, or source documents.

LedgerByte remains controlled beta/user-testing only. This sprint does not make Purchases/AP, Inventory, or purchase matching production-complete.

## Implemented Scope

- Added `GET /purchase-matching/exceptions`.
- Added supplier-grouped and severity-grouped exception aggregation.
- Added summary counts for total, severity, over-billed, over-received, pending bill/receipt, partially matched, not received, not billed, and review-required exceptions.
- Added simple read-only filters for supplier, severity, exception type, source type, search, and limit.
- Added `/purchases/matching` as the Purchase Matching Exceptions frontend route.
- Added Purchases navigation and global-search exposure for the exception center.
- Added cross-links from existing purchase matching detail panels to the exception center.
- Added targeted backend and frontend tests.

## API Endpoint

- `GET /purchase-matching/exceptions`

The endpoint is read-only, tenant-scoped by organization context, and protected by the existing JWT, organization context, and permission guards.

## Exception Types

- `OVER_BILLED`
- `OVER_RECEIVED`
- `NOT_RECEIVED`
- `NOT_BILLED`
- `PARTIALLY_MATCHED`
- `RECEIPT_PENDING_BILL`
- `BILL_PENDING_RECEIPT`
- `REVIEW_REQUIRED`

## Severity Rules

- `CRITICAL`: over billed, over received.
- `HIGH`: bill pending receipt, receipt pending bill, review required.
- `MEDIUM`: partially matched, not received, not billed.
- `LOW`: reserved for future informational exceptions.

The endpoint sorts by severity, supplier name, oldest/latest relevant date ordering used by the item comparator, and source number.

## Supplier Grouping And Filters

Each supplier group includes:

- Supplier ID and name.
- Total exception count.
- Highest severity.
- Outstanding review count.
- Exception rows.

Each exception row includes source metadata, related PO/bill/receipt numbers and links, ordered/billed/received quantities, remaining quantities, exception type, severity, and latest relevant date when available.

Filters supported:

- `supplierId`
- `severity`
- `exceptionType`
- `sourceType`
- `search`
- `limit`

## Frontend Route

- `/purchases/matching`

The page shows:

- Read-only helper text.
- Summary cards.
- Supplier, severity, exception type, source type, and search filters.
- Supplier-grouped exception rows.
- Permission-aware links to purchase orders, purchase bills, purchase receipts, and supplier/contact records.
- Safe empty state: `No purchase matching exceptions found for the selected filters.`

## Permission Behavior

- API access requires at least one of:
  - `purchaseOrders.view`
  - `purchaseBills.view`
  - `purchaseReceiving.view`
- The frontend route uses the same broad read boundary.
- Row links are hidden as links when the user lacks the relevant target permission.
- Supplier/contact links require `contacts.view`.

No new permission strings were added.

## Non-Effect Behavior

This sprint does not:

- Create journal entries.
- Reverse journal entries.
- Post AP adjustments.
- Change purchase bill, purchase order, or receipt status.
- Change AP balances.
- Change inventory quantities.
- Create purchase returns.
- Create debit notes.
- Create supplier refunds.
- Book variances.
- Change landed cost.
- Send email.
- Call ZATCA.
- Run production, hosted, beta, customer-data, seed, reset, delete, cleanup, backup/restore, deployed E2E, or OS power workflows.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- purchase-matching.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- "purchases/matching/page.test.tsx"`
- `corepack pnpm --filter @ledgerbyte/web test -- "purchase-matching-panel.test.tsx"`
- `corepack pnpm --filter @ledgerbyte/web test -- "sidebar.test.tsx"`
- `corepack pnpm --filter @ledgerbyte/web test -- "global-search.test.tsx"`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `git diff --check`

Final results:

- Targeted purchase matching API tests passed.
- Targeted exception center frontend tests passed.
- Targeted matching panel frontend test passed.
- Targeted sidebar frontend test passed.
- Targeted global search frontend test passed with existing React `act(...)` console warnings from the global search debounce test.
- API typecheck passed.
- `git diff --check` passed with line-ending warnings only.

Repo-wide web typecheck was not run because unrelated untracked marketing work remains expected to block it at `apps/web/src/app/marketing.test.tsx`.

## Marketing Blocker Status

`apps/web/src/app/marketing.test.tsx` remains unrelated and untracked. It was not deleted, modified, staged, or mixed into this sprint.

## Remaining Gaps

- Accountant-reviewed matching tolerance/status policy.
- Exception review assignment, acknowledgement, and approval workflow.
- Multi-PO matching policy.
- Variance proposal integration from exception center.
- Landed cost.
- Purchase returns.
- Hosted/beta/customer-data proof.
- Broad AP/inventory smoke, E2E, load, and concurrency coverage.

## Recommended Next Sprint

Implement an accountant-reviewed purchase matching policy and review workflow design. Keep it read-only at first, then separately design variance proposal handoff, landed cost, and purchase returns after policy approval.

## Follow-Up Status - 2026-06-05

The Purchase Matching Policy and Review Workflow Sprint added schema-backed review tracking, review status metadata in the exception center, source-panel review visibility, and audit logging. The exception center remains read-only for accounting, AP, inventory, source purchase documents, variance posting, landed cost, purchase returns, supplier communication, ZATCA, hosted workflows, and OS power actions.
