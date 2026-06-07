# Inventory Valuation Variance Preview Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Inventory Valuation Variance Preview Sprint

## Summary

This sprint added a read-only valuation variance preview workflow for Purchases/AP and Inventory. Users can review preview differences between purchase receipts, purchase bills, purchase orders, purchase returns, and `NEEDS_VARIANCE_REVIEW` matching reviews, grouped by supplier and source context.

LedgerByte remains controlled beta/user-testing only. This sprint does not implement variance posting, automatic inventory adjustment, landed cost, FIFO, purchase return automation, debit note automation, supplier refund automation, supplier email, payment gateway work, production hosting, ZATCA, VAT filing, or any accounting/inventory mutation.

## Implemented Scope

- Added read-only valuation variance preview service and controller under Inventory.
- Added preview row types, severities, preview-only statuses, warnings, summaries, and supplier grouping.
- Added source-specific preview endpoints for purchase receipts, purchase bills, and matching reviews.
- Added the `/inventory/valuation-variances` frontend route with summary cards, filters, supplier groups, source links, and row-level preview context.
- Added source preview panels/links on purchase receipt detail, purchase bill detail, purchase return detail, purchase matching panels, and matching exception rows.
- Added policy documentation at `docs/development/INVENTORY_VALUATION_VARIANCE_PREVIEW_POLICY.md`.
- Added targeted backend and frontend tests.

## Schema And Migration

No schema or migration changes were made.

No Prisma Client generation was required for this sprint because the existing schema was only read.

## API Endpoints

New read-only endpoints:

- `GET /inventory/valuation-variances`
- `GET /inventory/valuation-variances/summary`
- `GET /inventory/valuation-variances/purchase-receipts/:id`
- `GET /inventory/valuation-variances/purchase-bills/:id`
- `GET /inventory/valuation-variances/matching-reviews/:id`

All endpoints require `inventory.view` and use organization-scoped reads.

## Frontend Routes And Components

New route:

- `/inventory/valuation-variances`

New component:

- `apps/web/src/components/inventory/valuation-variance-preview-panel.tsx`

Updated surfaces:

- Inventory sidebar navigation.
- Permission path mapping.
- Purchase receipt detail.
- Purchase bill detail.
- Purchase return detail.
- Purchase matching panel.
- Purchase matching exception center.

## Variance Types And Severity

Variance types:

- `PRICE_VARIANCE`
- `QUANTITY_VARIANCE`
- `RECEIPT_WITHOUT_BILL`
- `BILL_WITHOUT_RECEIPT`
- `OVER_RECEIVED_VALUE`
- `OVER_BILLED_VALUE`
- `RETURN_PENDING_CREDIT`
- `REVIEW_REQUIRED`

Severity:

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

Preview statuses:

- `PREVIEW_ONLY`
- `NEEDS_ACCOUNTANT_REVIEW`
- `NEEDS_MATCHING_REVIEW`
- `NEEDS_RETURN_REVIEW`
- `READY_FOR_POLICY_DECISION`

## Calculation Behavior

- Purchase order expected value is quantity multiplied by unit price.
- Purchase receipt value is quantity multiplied by unit cost.
- Purchase bill value is quantity multiplied by unit price.
- Purchase return value is quantity multiplied by return unit cost, falling back to linked receipt, bill, or order unit cost where available.
- Price variance uses weighted receipt unit cost less weighted bill unit cost multiplied by matched quantity.
- Quantity variance compares received quantity and billed quantity using the best available unit cost.
- Receipt-without-bill and bill-without-receipt rows are timing/review previews only.
- Over-received and over-billed rows are source-order overage previews only.
- Matching reviews marked `NEEDS_VARIANCE_REVIEW` are attached to related source groups or shown as review-required context.

## Supplier And Source Grouping

Preview rows are grouped by supplier. Each supplier group includes:

- Supplier ID and display name.
- Total variance amount.
- Variance count.
- Highest severity.
- Items affected.
- Source document links.
- Row-level quantities, values, variance type, severity, and suggested review action.

## Source Document Integration

Added safe preview visibility or links for:

- Purchase receipt detail.
- Purchase bill detail.
- Purchase return detail.
- Purchase matching panel.
- Purchase matching exception rows.

Source panels show preview amount, type, severity, and the non-posting helper text where preview rows are available. Purchase return detail links through the generic preview search because no mutation or return-specific posting endpoint was introduced.

## Matching Review Integration

Matching reviews with `NEEDS_VARIANCE_REVIEW` can point to valuation variance preview.

The preview does not:

- Resolve matching reviews.
- Change review status.
- Start a review.
- Mark reviews complete.
- Post variance.
- Create returns.
- Contact suppliers.

## Permission Behavior

- Users without `inventory.view` cannot view the valuation variance page or API.
- Source document links are shown only when the user has the relevant source view permission.
- No new permission strings were added.
- No mutation actions are available.

## Audit Behavior

No lifecycle audit events were added because ordinary valuation variance preview views are read-only.

Future explicit review-recording belongs to the purchase matching review workflow, not this preview sprint.

## Accounting And Inventory Non-Effect Behavior

This sprint does not:

- Post journals.
- Reverse journals.
- Change AP balances.
- Change purchase bill balances.
- Change inventory quantities.
- Change moving average.
- Create FIFO layers.
- Book variances.
- Create purchase returns.
- Create debit notes.
- Create supplier refunds.
- Change landed cost.
- Send email.
- Call ZATCA.
- Affect VAT reports.
- Affect financial statements.
- Mutate matching reviews automatically.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- inventory-valuation-variance-preview.service.spec.ts inventory.controller.spec.ts --runInBand`
- `corepack pnpm --filter @ledgerbyte/web test -- valuation-variances/page.test.tsx valuation-variance-preview-panel.test.tsx purchase-matching-panel.test.tsx purchases/matching/page.test.tsx --runInBand`
- `corepack pnpm --filter @ledgerbyte/web test -- 'purchases.*bills.*page.test.tsx' --runInBand`
- `corepack pnpm --filter @ledgerbyte/web test -- 'purchases.*returns.*page.test.tsx' --runInBand`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `git diff --check`

Results:

- Targeted API tests passed.
- Targeted frontend tests passed.
- Purchase bill detail tests passed.
- Purchase return detail tests passed.
- API typecheck passed.
- `git diff --check` passed with line-ending warnings only.

## Marketing Blocker Status

`apps/web/src/app/marketing.test.tsx` remains unrelated untracked marketing work and was not modified.

Repo-wide web typecheck remains expected to be blocked by that unrelated file reporting `HomePage` as `() => void` at lines 35 and 65.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Remaining Gaps

- Accountant-reviewed variance thresholds and tolerance policy.
- Explicit review-recording action, if product wants one, in the matching review workflow.
- Future variance posting workflow.
- Future inventory adjustment workflow.
- Future landed cost.
- Future FIFO/cost-layer implementation.
- Future debit note/refund automation.
- Browser QA beyond targeted mocked tests.
- Hosted/beta/customer-data proof.

## Recommended Next Sprint

Run an accountant-calibrated purchase variance tolerance and policy-decision sprint. Keep it non-posting unless the approved scope explicitly includes a separate variance posting workflow with audit, permissions, accounting tests, and inventory reconciliation tests.

## Follow-Up Note

The 2026-06-05 Inventory Returns Integration Sprint can show when a linked purchase return has posted operational stock-out movement. `RETURN_PENDING_CREDIT` remains preview-only and does not create debit notes, supplier refunds, journals, AP adjustments, VAT entries, variance postings, landed cost, FIFO layers, email, ZATCA calls, or production/customer-data behavior.

## Follow-Up Note - Landed Cost Preview

The 2026-06-06 Landed Cost Preview Sprint added a read-only link from `/inventory/valuation-variances` to `/inventory/landed-cost` for cases where a variance review may need cost allocation modeling. The valuation variance workflow remains read-only and does not post variances, update inventory valuation, change AP balances, create landed cost documents, create FIFO layers, affect VAT, call ZATCA, send email, or mutate source documents.
