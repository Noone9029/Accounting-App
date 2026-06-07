# Purchase Returns Workflow Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Purchase Returns Workflow Sprint

## Summary

This sprint added a controlled, non-posting purchase returns workflow for Purchases/AP and Inventory. Users can create and manage operational supplier returns, link them to suppliers, purchase bills, purchase orders, purchase receipts, and `NEEDS_RETURN_REVIEW` matching reviews, and track lifecycle status without changing accounting, AP balances, inventory quantities, VAT, source documents, or matching review status.

LedgerByte remains controlled beta/user-testing only. This sprint does not make purchase returns production-complete and does not provide accountant approval.

## Implemented Scope

- Added `PurchaseReturn` and `PurchaseReturnLine` schema.
- Added `PurchaseReturnStatus`.
- Added purchase return number sequencing with `PRN-` examples.
- Added purchase return list, next-number, detail, create, update, and lifecycle API endpoints.
- Added tenant-scoped source validation for supplier, bill, order, receipt, and matching review links.
- Added source-line quantity validation for linked bill/order/receipt lines.
- Added audit events for return create/update/submit/approve/complete/cancel/void.
- Added purchase return list/new/detail/edit frontend routes under Purchases.
- Added matching exception center links for return reviews and linked purchase returns.
- Added purchase matching panel visibility for linked return metadata.
- Added supplier transaction and supplier ledger visibility as zero-effect rows.
- Added policy documentation at `docs/development/PURCHASE_RETURNS_POLICY.md`.
- Added targeted backend and frontend tests.

## Schema And Migration

Migration added:

- `apps/api/prisma/migrations/20260605190000_purchase_returns_workflow/migration.sql`

Schema additions:

- `PurchaseReturnStatus`
- `NumberSequenceScope.PURCHASE_RETURN`
- `PurchaseReturn`
- `PurchaseReturnLine`

Relations were added to suppliers, users, purchase bills, purchase orders, purchase receipts, purchase matching reviews, purchase debit notes, supplier refunds, and items.

The migration is additive. It does not change source document status fields, accounting tables, stock movement tables, AP balance fields, VAT report tables, or generated document storage.

## API Endpoints

New endpoints:

- `GET /purchase-returns`
- `GET /purchase-returns/next-number`
- `GET /purchase-returns/:id`
- `POST /purchase-returns`
- `PATCH /purchase-returns/:id`
- `POST /purchase-returns/:id/submit`
- `POST /purchase-returns/:id/approve`
- `POST /purchase-returns/:id/complete`
- `POST /purchase-returns/:id/cancel`
- `POST /purchase-returns/:id/void`

Updated read-only integration:

- `GET /purchase-matching/exceptions` now can include linked purchase return metadata when a matching review has a related return.
- Supplier activity/ledger surfaces can show purchase returns as zero-effect operational rows.

## Frontend Routes And Components

New routes:

- `/purchases/returns`
- `/purchases/returns/new`
- `/purchases/returns/[id]`
- `/purchases/returns/[id]/edit`

New component:

- `apps/web/src/components/forms/purchase-return-form.tsx`

Updated surfaces:

- Purchases sidebar navigation.
- Global search.
- Permission path mapping.
- `/purchases/matching`
- Purchase matching panels on source documents.

## Lifecycle Behavior

- `DRAFT` can be edited and submitted.
- `SUBMITTED` can be approved or cancelled.
- `APPROVED` can be completed or voided.
- `COMPLETED`, `VOIDED`, and `CANCELLED` block draft editing.
- Lifecycle actions update only purchase return document state and audit logs.

## Source Linkage Behavior

Purchase returns can link to:

- Supplier directly.
- Purchase bill.
- Purchase order.
- Purchase receipt.
- Purchase matching review with `NEEDS_RETURN_REVIEW`.

Source documents are validated for organization and supplier ownership. Source lines are validated before source-linked quantities are accepted. Source documents are not mutated.

## Matching Review Integration

Matching exception rows now show:

- `Return review needed` for `NEEDS_RETURN_REVIEW`.
- Linked purchase return metadata when a return exists.
- An explicit create-return link for permitted users when a review exists and no return is linked.

Creating a return from a review does not resolve or mutate the matching review.

## Supplier Integration

Supplier transaction history includes purchase returns with zero total and zero payable balance effect.

Supplier ledger rows can include purchase returns as neutral operational rows with:

- Debit `0.0000`.
- Credit `0.0000`.
- Running balance unchanged.
- `nonPosting: true` metadata.

## Permission Behavior

View purchase returns:

- Requires at least one of `purchaseOrders.view`, `purchaseBills.view`, or `purchaseReceiving.view`.

Create/update/lifecycle:

- Requires at least one of `purchaseBills.create`, `purchaseBills.update`, or `purchaseReceiving.create`.

No new permission strings were added.

## Audit Behavior

Audit events were added for:

- Purchase return created.
- Purchase return updated.
- Purchase return submitted.
- Purchase return approved.
- Purchase return completed.
- Purchase return cancelled.
- Purchase return voided.

Audit metadata records safe IDs, return number, supplier ID, status, reason, and source references. It does not log secrets, auth headers, cookies, full note bodies, PDFs, or document bodies.

## Accounting And Inventory Non-Effect Behavior

This sprint does not:

- Create or reverse journals.
- Change AP balances.
- Change purchase bill balances.
- Create purchase debit notes automatically.
- Create supplier refunds automatically.
- Change inventory quantities.
- Create stock movements.
- Book variances.
- Change landed cost.
- Change FIFO/cost layers.
- Affect VAT reports or financial statements.
- Send supplier email.
- Call ZATCA.
- Run production, hosted, beta, customer-data, seed, reset, delete, cleanup, backup/restore, deployed E2E, or OS power workflows.

## Validation

Commands run:

- `corepack pnpm db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- purchase-returns purchase-matching contact`
- `corepack pnpm --filter @ledgerbyte/web test -- purchase-returns purchase-matching-panel purchases/matching`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `git diff --check`

Results:

- Prisma Client generation passed.
- Targeted API tests passed.
- Targeted frontend tests passed.
- API typecheck passed.
- Web typecheck is blocked only by unrelated untracked marketing work at `apps/web/src/app/marketing.test.tsx` lines 35 and 65, where `HomePage` is typed as `() => void`.
- `git diff --check` passed with line-ending warnings only.

## Marketing Blocker Status

`apps/web/src/app/marketing.test.tsx` remains unrelated untracked marketing work and was not deleted, modified, staged, or mixed into this sprint.

Repo-wide web typecheck remains expected to be blocked by that unrelated file reporting `HomePage` as `() => void` at lines 35 and 65.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Remaining Gaps

- Purchase return PDF/archive.
- Dedicated source-options endpoint for return form prefill.
- Supplier detail UI polish for return row labels if broader browser QA finds gaps.
- Accountant-approved return reason/tolerance policy.
- Automatic debit note, supplier refund, and inventory return workflows.
- Variance posting and landed cost.
- Hosted/beta/customer-data proof.
- Broad AP/inventory E2E, smoke, load, and concurrency coverage.

## Recommended Next Sprint

Add purchase return PDF/archive output or implement a dedicated purchase return source-options endpoint with browser QA. Keep debit note/refund automation, inventory movement, variance posting, landed cost, supplier email, and production workflows separate.

## Follow-Up Note

The 2026-06-05 Inventory Valuation Variance Preview Sprint can surface purchase returns as `RETURN_PENDING_CREDIT` preview context. Purchase returns still do not create debit notes, supplier refunds, inventory movements, AP adjustments, journals, or variance postings automatically.

The 2026-06-05 Inventory Returns Integration Sprint added explicit operational `PURCHASE_RETURN_OUT` stock movement for safe receipt-linked inventory-tracked purchase return lines. This is user-triggered stock movement only; purchase returns still do not automatically create debit notes, supplier refunds, AP adjustments, journals, VAT entries, variance postings, landed cost, FIFO layers, email, ZATCA calls, or production/customer-data behavior.
