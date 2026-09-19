# Reviewed perpetual inventory valuation

Implementation baseline: `90e0eaa4`, branch `codex/saudi-public-launch`. This document describes local implementation, not production deployment or accountant approval.

## Stock and cost contract

Each organization/item/warehouse has a durable quantity/value balance and sequence. Every new valued movement stores its immutable unit cost, total cost, sequence, and resulting quantity/value. Receipts add their known base-currency net value; issues consume the current remaining value divided by remaining quantity. Exact depletion consumes the remaining value to avoid orphaned rounding residue. Zero cost is valid; missing cost is not.

For example: receive 10 at 10, issue 8, then receive 10 at 20. The ledger must show quantity 12, value 220, average 18.3333. Later receipts cannot change the first issue's frozen cost of 80 or its COGS journal.

Bill-linked receipts allocate the finalized bill line's discounted `taxableAmount`, which is already in base currency. Partial receipts allocate cumulatively; the final receipt consumes the exact unallocated value. A USD 10 net line at SAR 3.75, quantity 7, received as 1/1/1/4, yields SAR 5.3571/5.3572/5.3571/21.4286. Receipt posting, matching and clearing reports use these frozen movement totals. Foreign-currency PO receipts require a finalized bill with reviewed FX context instead of treating the PO's transaction-currency unit price as base cost. Standalone receipts require a known base-currency cost.

Receipt accounting credits the clearing debit established by the original active bill journal, even if today's clearing mapping changes. The original debit must uniquely reconcile to tracked bill net value plus any other bill lines using the same account, and its posting account must remain active. Missing or ambiguous historical provenance blocks posting for accountant reconciliation. Stock receipt/issue creation also requires the original bill/invoice journal to remain posted.

## Returns and corrections

Sales returns require the original valued issue and restore its original allocated cost, with cumulative quantity/value caps. Their reviewed journals reverse the original issue's asset/COGS accounts, even if settings later change.

Purchase returns preserve the original receipt allocation in immutable `valuationSourceValue`. Stock leaves at carrying value; the original source credit and the carrying reduction appear separately in review. Their difference must post explicitly to a configured, active, distinct inventory gain/loss account. For example, original supplier credit 10.7143 and carrying reduction 16.1309 require a reviewed loss of 5.4166. The preview displays all amounts and named accounts. No variance journal posts automatically. An accountant must approve this policy and mappings before customer rollout; the system does not silently substitute carrying value for the original supplier credit. Supplier credit-note/AP/VAT settlement remains its separate document workflow.

Receipt/issue/adjustment/transfer voids preserve source costs. A correction that would create negative stock/value or leave value with no quantity fails and requires an explicit reviewed correction instead. Returns cannot exceed their original movement's remaining quantity. Dependent returns prevent reversing the source receipt or COGS posting through its dedicated workflow.

## Posting and concurrency

Stock changes do not post GL automatically. Receipt asset and issue COGS posting retain their dedicated review actions. Opening balances, adjustments and returns use Inventory → Accounting review. Opening stock requires an explicit equity account. Preview exposes exact journal lines; posting commits the journal, durable review marker and audit entry in one transaction. Replays reuse the existing posting.

Known zero-cost receipts and issues still require those explicit reviews. Posting records the existing reviewer/timestamp and audit entry atomically without allocating a journal number or creating a zero-value journal. The UI hides financial reversal when no journal exists; ordinary stock voids remain available within the source/period rules. Their returns require the original zero-cost review before their own review; a supplier return with a changed carrying value still needs the explicit gain/loss treatment above. Close and reconciliation accept a journal-less reviewed document only when every frozen movement has zero cost and its reviewer/timestamp remain present. Missing cost, unreviewed zero stock, and a missing positive-value journal remain blockers.

All stock mutations acquire a transaction-scoped organization lock before reading source quantities. Valuation and financial posting hold fiscal-period rows through commit and reject closed/locked dates. Movement dates cannot precede the latest valued movement for the same item/warehouse. Negative stock is rejected. A database trigger rejects changes or deletion of valued movements.

Receipt, issue and warehouse-transfer creation require a stable `Idempotency-Key` header (8–128 letters, digits, dots, underscores, colons or hyphens). A key is scoped to organization and route. Same-key/same-payload retries return the original document; a different payload conflicts. The browser retains the key after uncertain failure and clears it only after confirmed success. Existing document transitions use their durable state claims.

## Reconciliation and rollout boundary

Accounting review compares durable inventory value with the configured inventory asset GL balance and identifies pending receipt, COGS and movement reviews. An existing legacy movement without a valued balance blocks further stock writes for that item/warehouse; reports expose missing valuation. The migration does not reconstruct or reprice old movements. Existing organizations require an accountant-reviewed cutover and reconciliation before enabling this lane. Changing the asset account after stock history begins is blocked.

Fiscal close and lock acquire the inventory organization lock, reject unresolved inventory through period end, and compare the last immutable item/warehouse snapshots at that date with the asset GL through the same end of day. A difference blocks the fiscal state change. Generic journal reversal rejects inventory-linked journals, including receipt/COGS originals and reversals; use the source workflow or a reviewed open-period correction.

Reopening uses a conditional CLOSED-to-OPEN claim under the same organization lock, with its audit in the transaction. A stale reopen request cannot overwrite a concurrently committed LOCKED state; the real-DB test deliberately pauses after the old CLOSED read, commits a lock, then verifies reopen fails and leaves LOCKED unchanged.

Generic reversal also rejects original and reversal journals owned by inventory-clearing bills or bills/invoices with tracked items or stock history, including before the first receipt/issue. Other document journals retain existing behavior. The original source journal status is rechecked under the inventory lock before stock creation so an older reversed source cannot generate new stock.

Purchase bill and sales invoice voids acquire the same inventory lock before loading the financial source. Active linked receipts/issues or posted inventory returns block voiding; the message directs the reviewer to the source inventory workflow or a credit/debit note for returned goods. Drafts and documents without stock dependencies retain their normal void behavior. The dependency check covers direct document references and return-line references through the original receipt/issue.

The first scope is tracked products without batch, serial, bin or expiry tracking, manual reviewed GL posting, known costs, chronological entries and nonnegative stock. No hosted migrations, provider actions or customer data changes are part of this implementation proof.

## Acceptance evidence

Root coordinates one resource-bounded check at a time. Target suites:

- `apps/api/src/inventory/inventory-valuation.spec.ts`: sequential math, source allocation, exact depletion, missing/zero costs, negative/orphan rejection, command identity.
- `apps/api/src/inventory/inventory-movement-accounting.service.spec.ts`: original accounts/costs, review permissions and prerequisites, retry, zero value, explicit purchase-return variance.
- `apps/api/src/inventory/inventory-close-readiness.spec.ts`: no-inventory case, legacy and pending blockers, historical cutoff and reconciliation difference.
- `apps/api/src/inventory/inventory-source-void-guard.spec.ts`: purchase bill/invoice voids reject active receipts, issues and posted returns before financial mutations; existing purchase-bill/sales-invoice rules suites retain no-stock void coverage.
- `apps/api/src/inventory/inventory-valuation.local-db.spec.ts`: immutable PostgreSQL ledger, competing stock issues, closed/backdated/tenant/source limits, idempotent commit/replay, legacy cutover, and actual receipt/issue/return/transfer/manual-GL lifecycle with reconciliation.
- `apps/api/src/inventory/inventory-zero-review.local-db.spec.ts`: explicit zero-cost receipt/issue/return review, close/lock blockers, no financial journals, repeated-post rejection, audit rollback, negative-cost denial and stock voids without a financial reversal.

The DB suite runs only when `INVENTORY_TEST_DATABASE_URL` names a disposable loopback test/proof/inventory database. The root harness owns all migrations and teardown. It uses synthetic data only. Tests are invoked with Jest `--runInBand` inside the aggregate 20 GB RAM / half logical CPU job; do not run them concurrently with another heavy operation. The branch's final handoff records executed checks and current results.
