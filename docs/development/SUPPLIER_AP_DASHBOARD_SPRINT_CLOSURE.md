# Supplier/AP Dashboard Improvements Sprint Closure

Date: 2026-06-05

Product: LedgerByte

Sprint: Supplier/AP Dashboard Improvements Sprint

## Summary

This sprint added a read-only Supplier/AP Dashboard workspace for Purchases/AP and supplier detail review. The dashboard brings together supplier payable totals, overdue and due-soon bills, open purchase orders, purchase matching exceptions, open matching reviews, purchase returns, valuation variance previews, and recent supplier activity.

LedgerByte remains controlled beta/user-testing only. This sprint does not implement variance posting, automatic AP adjustment, automatic inventory adjustment, landed cost, FIFO, automatic debit notes, supplier refunds, supplier email, payment gateway work, production hosting, ZATCA, VAT filing, or any AP/inventory mutation automation.

## Implemented Scope

- Added a read-only Supplier/AP dashboard API under Contacts.
- Added a `/purchases/ap-dashboard` frontend workspace under Purchases.
- Added Purchases navigation and global search exposure for Supplier/AP Dashboard.
- Added supplier detail AP summary visibility.
- Grouped supplier activity into financial posting and operational/non-posting sections.
- Added a dashboard attention policy document.
- Added targeted backend and frontend tests.

## API Endpoints

New read-only endpoints:

- `GET /contacts/suppliers/ap-dashboard`
- `GET /contacts/suppliers/:id/ap-summary`

The endpoints reuse existing permissions and organization-scoped reads. They return permission-aware links and safe aggregates without adding new permission strings.

## Frontend Routes And Components

New route:

- `/purchases/ap-dashboard`

Updated surfaces:

- Purchases sidebar navigation.
- Global search.
- Route permission mapping.
- Supplier detail page.
- Supplier activity table rendering.

## AP Attention Categories

The dashboard attention categories are:

- Bills overdue.
- Bills due soon.
- Purchase orders awaiting receipt.
- Purchase receipts awaiting bill.
- Bills awaiting receipt.
- Matching exceptions critical/high.
- Matching reviews open or waiting.
- Purchase returns awaiting approval/completion.
- Valuation variance previews needing review.

Default attention settings:

- Due soon: next 7 days.
- Overdue: before the current day.
- Top row cap: 5 rows per list or top-supplier panel.
- Critical/high rows are surfaced first.

Policy doc:

- `docs/development/SUPPLIER_AP_DASHBOARD_ATTENTION_POLICY.md`

## Supplier Summary Behavior

Supplier detail now can show a Supplier AP Summary panel with:

- Outstanding payable balance.
- Overdue bill total and count.
- Open purchase orders.
- Purchase receipts pending bill.
- Purchase bills pending receipt.
- Open purchase returns.
- Open matching reviews.
- Valuation variance preview count.
- Recent AP activity.

Supplier ledger math is unchanged. Purchase return rows remain zero-effect operational activity.

## Supplier Activity Grouping

Supplier activity is grouped into:

- Financial posting activity: purchase bills, supplier payments, purchase debit notes, and supplier refunds.
- Operational/non-posting activity: purchase orders and purchase returns from the supplier transaction feed, plus AP dashboard recent activity rows for purchase receipts, matching reviews, and valuation variance previews when visible.

Operational rows are labelled non-posting and include the safe wording:

> Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.

## Permission Behavior

Existing permissions are reused:

- `contacts.view` controls supplier links.
- `purchaseBills.view` controls bill visibility and bill links.
- `purchaseOrders.view` controls purchase order visibility and purchase order links.
- `purchaseReceiving.view` controls purchase receipt visibility and receipt links.
- Purchase matching uses the existing purchase matching view policy.
- `inventory.view` controls valuation variance preview visibility and links.
- `supplierPayments.view`, `purchaseDebitNotes.view`, and `supplierRefunds.view` control those financial activity rows.

If the user lacks permission for a source route, links and sensitive row details are hidden. Safe aggregate counts may still appear when the source policy allows it.

## Non-Effect Behavior

This sprint does not:

- Post journals.
- Reverse journals.
- Change AP balances.
- Change bill balances.
- Create supplier payments.
- Create debit notes.
- Create supplier refunds.
- Create, approve, or complete purchase returns automatically.
- Change inventory quantities.
- Change inventory valuation.
- Book variances.
- Change landed cost.
- Send email.
- Call ZATCA.
- Affect VAT reports.
- Mutate source documents.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- supplier-ap-dashboard --runInBand` - passed, 2 suites / 4 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- ap-dashboard party-pages parties --runInBand` - passed, 5 suites / 16 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - blocked only by unrelated `apps/web/src/app/marketing.test.tsx` `HomePage` JSX component errors at lines 35 and 65.
- `git diff --check` - passed; emitted line-ending warnings only.

## Known Blocker

Repo-wide web typecheck is expected to remain blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx` reports `HomePage` as `() => void` at lines 35 and 65.

Marketing files were not modified by this sprint.

## OS Power Commands

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power commands were run.

## Remaining Gaps

- No supplier email or remittance sending.
- No supplier payment automation.
- No automatic debit note or supplier refund generation.
- No AP variance posting.
- No landed cost or FIFO implementation.
- No automatic inventory movement from returns or variances.
- No hosted/customer-data proof.
- No broad E2E or deployed smoke run.
- No accountant sign-off on dashboard thresholds yet.

## Recommended Next Sprint

Recommended next sprint:

> Run a focused Purchases/AP browser workflow QA sprint for supplier AP dashboard, matching exceptions, returns, valuation variance previews, and supplier detail drilldowns using mocked browser coverage only, without changing posting behavior, inventory behavior, supplier email, ZATCA, VAT, hosted infrastructure, or production settings.

## Follow-Up Note

The 2026-06-05 Inventory Returns Integration Sprint added read-only dashboard visibility for purchase returns awaiting operational inventory movement and movement-posted counts. The Supplier/AP Dashboard remains read-only and does not post journals, adjust AP balances, create debit notes/refunds, move inventory by itself, book variances, affect VAT, call ZATCA, send email, or change landed cost/FIFO behavior.

## Follow-Up Note - Landed Cost Preview

The 2026-06-06 Landed Cost Preview Sprint added a read-only dashboard link and availability signal for landed cost preview. The Supplier/AP Dashboard still does not aggregate landed cost amounts, post journals, adjust AP balances, change bill balances, mutate inventory valuation, create landed cost documents, create FIFO layers, affect VAT, call ZATCA, send email, or mutate source documents.
