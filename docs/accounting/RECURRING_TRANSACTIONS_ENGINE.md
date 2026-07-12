# Recurring Transactions Engine

LedgerByte uses one tenant-scoped engine for sales invoices, purchase bills, expense proposals, and manual journals. Existing `/recurring-invoices` routes remain compatibility adapters over sales-invoice templates; legacy tables are retained while additive migration safety is proved.

## Accounting policy

- Sales invoices generate as `DRAFT` through the normal sales-invoice service.
- Purchase bills generate as `DRAFT` through the normal purchase-bill service.
- Cash expenses are immediate-post in the current product, so schedules create a `RecurringExpenseProposal`. A permitted reviewer may explicitly create the expense through the normal workflow.
- Manual journals generate as `DRAFT`; debit and credit totals must balance before activation and again at execution.
- Generation is never approval or posting. It sends no email and never moves money.

Every run stores the template version and a safe source snapshot. Template edits affect future runs only; prior targets and run evidence are not recalculated. Archived templates stay visible but cannot run. Generated drafts use their normal correction workflow, while posted documents use existing reversal, credit-note, or debit-note paths.

## Identity, concurrency, and failure evidence

One template occurrence can produce at most one successful target. A database uniqueness constraint protects `templateId + scheduledFor`; manual runs additionally require an idempotency key. Due work is claimed with row locking, serializable transactions, bounded serialization retries, and the uniqueness constraint as the final duplicate barrier.

Runs expose `PENDING`, `CLAIMED`, `GENERATED`, `BLOCKED`, `SKIPPED`, or `FAILED`, attempt count, safe failure code/message, trigger, and generated target. Known database concurrency errors are retried or returned as safe conflicts, not raw Prisma errors.

## Dimensions and foreign currency

Normalized lines preserve accounts, items, tax rates, cost centers and projects. Generated document and journal lines keep those dimensions. Base-currency schedules use rate one. Foreign templates require a fixed positive rate, an approved tenant/currency-pair snapshot, or accountant evidence at run time. There is no live exchange-rate lookup; missing evidence blocks the run before a draft is created.

## Readiness

`GET /recurring-transactions/readiness` returns active/due templates, failed/blocked runs, generated drafts awaiting review, missing references, absent FX evidence, and locked-period occurrences. It is advisory and does not globally block fiscal close. A later accountant month-end close workspace may consume it.

This is burner/demo user-testing functionality, not production, tax, regulatory, provider, backup, PITR, or restore proof.
