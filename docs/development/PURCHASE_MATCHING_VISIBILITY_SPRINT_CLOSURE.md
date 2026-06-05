# Purchase Matching Visibility Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Purchase Matching Visibility Sprint

## Summary

This sprint added read-only purchase matching visibility across purchase orders, purchase bills, and purchase receipts. The work helps users understand how ordered, billed, and received quantities relate without posting accounting entries, changing inventory, mutating source documents, or executing any production workflow.

LedgerByte remains controlled beta/user-testing only. This sprint does not make Purchases/AP or Inventory production-complete.

## Implemented Scope

- Added a read-only `purchase-matching` API module.
- Added matching endpoints for purchase order, purchase bill, and purchase receipt detail views.
- Added a shared purchase matching panel in the web app.
- Wired the panel into existing purchase order detail, purchase bill detail, and purchase receipt detail routes.
- Added targeted API and frontend tests for matching calculations and panel rendering.

## API Changes

- `GET /purchase-matching/purchase-orders/:id`
- `GET /purchase-matching/purchase-bills/:id`
- `GET /purchase-matching/purchase-receipts/:id`

All endpoints are read-only and use the existing JWT, organization context, and permission guards.

## Frontend Changes

The matching panel now shows:

- Ordered quantity.
- Billed quantity.
- Received quantity.
- Remaining to bill.
- Remaining to receive.
- Over-billed quantity.
- Over-received quantity.
- Linked purchase order, bill, and receipt source references.
- Line-level warnings and safe status labels.

Routes updated:

- `/purchases/purchase-orders/[id]`
- `/purchases/bills/[id]`
- `/inventory/purchase-receipts/[id]`

## Matching Behavior

The matching service compares existing purchase order lines, purchase bill lines, and purchase receipt lines. Voided bills and receipts are excluded from active matching quantities.

Supported status labels:

- Matched
- Partially matched
- Not received
- Not billed
- Over received
- Over billed
- Receipt pending bill
- Bill pending receipt
- Review required

The purchase order view maps linked purchase bills and receipts back to purchase order lines by sort order, unique item, and unique description fallback. If a bill or receipt line cannot be mapped safely, the service records a review warning instead of guessing.

## Non-Effect Behavior

This sprint does not:

- Post journals.
- Book purchase variances.
- Change AP balances.
- Change inventory quantities.
- Create purchase returns.
- Create landed cost.
- Mutate purchase orders, purchase bills, or purchase receipts.
- Send email.
- Trigger payment gateway behavior.
- Call ZATCA.
- Run production, hosted, beta, or customer-data workflows.
- Run seed, reset, delete, or sample-data execution.

## Permissions And Tenant Scoping

- Purchase order matching uses `purchaseOrders.view`.
- Purchase bill matching uses `purchaseBills.view`.
- Purchase receipt matching uses `purchaseReceiving.view`.
- All matching reads are scoped by the active organization context.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- purchase-matching.service.spec.ts --runInBand`
- `corepack pnpm --filter @ledgerbyte/web test -- purchase-matching-panel.test.tsx --runInBand`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web test -- bills --runInBand`
- `git diff --check`

The direct Windows/Jest path invocation for `src/app/(app)/purchases/bills/[id]/page.test.tsx` was attempted but blocked before Jest by shell parsing of the route path. The `bills` pattern fallback passed and covered the bill route tests.

Repo-wide web typecheck was not run because unrelated untracked marketing work is still expected to block it at `apps/web/src/app/marketing.test.tsx`.

## Skipped Work

- Optional `/purchases/matching` exception list was deferred.
- No schema change was required, so `db:generate` was not needed.
- No product posting behavior was changed.
- No broad app QA, E2E, smoke, or production workflow was run.
- No OS shutdown, restart, sleep, hibernate, logout, lock-screen, or power command was run.

## Remaining Gaps

- Accountant review is still needed for matching status wording and tolerance policy.
- Matching is visibility-only; it does not provide an exception approval queue.
- Multi-PO matching and variance booking remain out of scope.
- Landed cost, purchase returns, automatic variance posting, hosted/beta/customer-data proof, and broad E2E/smoke/full-test coverage remain open.

## Recommended Next Sprint

Add a read-only purchase matching exception list for AP review, grouped by supplier and severity, with filters for over-billed, over-received, bill-pending-receipt, receipt-pending-bill, and review-required records. Keep it non-posting until accountant policy and approval workflow are defined.

## Follow-Up Completed

The Purchase Matching Exception Center Sprint added the read-only exception workspace and API described above. See `docs/development/PURCHASE_MATCHING_EXCEPTION_CENTER_SPRINT_CLOSURE.md`.
