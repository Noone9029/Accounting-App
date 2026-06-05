# Purchase Matching Review Workflow Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Purchase Matching Policy and Review Workflow Sprint

## Summary

This sprint added a policy-backed purchase matching review workflow for PO-to-bill-to-receipt matching exceptions. Users can now track and classify matching exceptions without changing accounting, AP balances, inventory quantities, valuation, purchase documents, supplier payment state, or supplier communication.

LedgerByte remains controlled beta/user-testing only. This sprint does not make purchase matching production-complete and does not provide accountant approval.

## Implemented Scope

- Added schema-backed `PurchaseMatchingReview` tracking.
- Added review status and reason-code enums.
- Added purchase matching review list, detail, create, update, and lifecycle endpoints.
- Added review metadata to `GET /purchase-matching/exceptions`.
- Added review status filters and review-only actions to `/purchases/matching`.
- Added review status visibility to purchase matching panels on source purchase documents.
- Added audit logging for review creation, updates, and lifecycle transitions.
- Added a documented review policy at `docs/development/PURCHASE_MATCHING_REVIEW_POLICY.md`.
- Added targeted backend and frontend tests.

## Schema And Migration

- Added `PurchaseMatchingReviewStatus`.
- Added `PurchaseMatchingReviewReason`.
- Added `PurchaseMatchingReview`.
- Added migration `apps/api/prisma/migrations/20260605160000_purchase_matching_review_workflow/migration.sql`.

The migration is additive. It does not alter source purchase order, purchase bill, purchase receipt, AP, inventory, journal, or valuation tables.

## API Endpoints

Existing endpoint updated:

- `GET /purchase-matching/exceptions`

New endpoints:

- `GET /purchase-matching/reviews`
- `GET /purchase-matching/reviews/:id`
- `POST /purchase-matching/reviews`
- `PATCH /purchase-matching/reviews/:id`
- `POST /purchase-matching/reviews/:id/start`
- `POST /purchase-matching/reviews/:id/mark-waiting-for-supplier`
- `POST /purchase-matching/reviews/:id/mark-timing-difference`
- `POST /purchase-matching/reviews/:id/mark-needs-variance-review`
- `POST /purchase-matching/reviews/:id/mark-needs-return-review`
- `POST /purchase-matching/reviews/:id/resolve`
- `POST /purchase-matching/reviews/:id/cancel`

## Review Statuses And Reason Codes

Statuses:

- `OPEN`
- `IN_REVIEW`
- `WAITING_FOR_SUPPLIER`
- `WAITING_FOR_RECEIPT`
- `WAITING_FOR_BILL`
- `ACCEPTED_AS_TIMING_DIFFERENCE`
- `NEEDS_VARIANCE_REVIEW`
- `NEEDS_RETURN_REVIEW`
- `RESOLVED`
- `CANCELLED`

Reason codes:

- `QUANTITY_MISMATCH`
- `PRICE_MISMATCH`
- `RECEIPT_MISSING`
- `BILL_MISSING`
- `OVER_RECEIVED`
- `OVER_BILLED`
- `SUPPLIER_DISPUTE`
- `TIMING_DIFFERENCE`
- `DATA_ENTRY_REVIEW`
- `OTHER`

## Exception Center Integration

`GET /purchase-matching/exceptions` now includes safe review metadata when a matching review exists:

- Review ID.
- Review status.
- Reason code.
- Assigned user display metadata.
- Next review date.
- Reviewed timestamp.
- Short note summary only.

The exception center now supports review status and reason filters. Full note bodies are not exposed in the exception list.

## Source Panel Integration

Purchase matching panels now show review status and reason metadata when available, plus a link back to the matching exception center. Source panels do not include mutation actions for purchase orders, purchase bills, or purchase receipts.

## Permission Behavior

View reviews:

- Requires at least one of `purchaseOrders.view`, `purchaseBills.view`, or `purchaseReceiving.view`.

Manage reviews:

- Requires at least one of `purchaseOrders.update`, `purchaseBills.update`, or `purchaseReceiving.create`.

View-only users can see review status when they can open the exception center. Review action buttons are hidden from restricted users. No new permission strings were added.

## Audit Behavior

Audit events were added for:

- Review created.
- Review updated.
- Review started.
- Waiting for supplier.
- Accepted as timing difference.
- Needs variance review.
- Needs return review.
- Resolved.
- Cancelled.

Audit metadata records IDs, source type, exception type, severity, status change, and reason code. It does not log full note bodies, document bodies, PDF bodies, auth headers, tokens, cookies, or secrets.

## Non-Effect Behavior

This sprint does not:

- Create or reverse journal entries.
- Post variances.
- Change purchase bill, purchase order, or purchase receipt status.
- Change AP balances.
- Change inventory quantities.
- Create purchase returns.
- Create debit notes.
- Create supplier refunds.
- Change landed cost.
- Change FIFO or valuation layers.
- Send supplier email.
- Contact suppliers.
- Call ZATCA.
- File VAT.
- Run production, hosted, beta, customer-data, seed, reset, delete, cleanup, backup/restore, deployed E2E, or OS power workflows.

## Validation

Commands run:

- `corepack pnpm db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- purchase-matching.service.spec.ts purchase-matching.controller.spec.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- "purchases/matching/page.test.tsx" "purchase-matching-panel.test.tsx"`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `git diff --check`

Results:

- Prisma Client generation passed.
- Targeted purchase matching API tests passed.
- Targeted exception center and matching panel frontend tests passed.
- API typecheck passed.
- `git diff --check` passed.

Repo-wide web typecheck was not run because unrelated untracked marketing work remains expected to block it at `apps/web/src/app/marketing.test.tsx`.

## Marketing Blocker Status

`apps/web/src/app/marketing.test.tsx` remains unrelated and untracked. It was not deleted, modified, staged, or mixed into this sprint.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Remaining Gaps

- Accountant-approved matching tolerance thresholds.
- Multi-PO and partial bill matching policy.
- Review detail timeline beyond the exception center.
- Variance proposal handoff from review status.
- Purchase return and supplier debit note handoff from review status.
- Landed cost.
- Hosted/beta/customer-data proof.
- Broad AP/inventory smoke, E2E, load, and concurrency coverage.

## Recommended Next Sprint

Implement a purchase matching review detail/timeline page or accountant-calibrated tolerance policy. Keep variance posting, purchase returns, landed cost, and supplier communication in separate approval-gated sprints.
