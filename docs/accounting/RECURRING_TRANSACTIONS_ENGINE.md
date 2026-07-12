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

Runs expose `PENDING`, `CLAIMED`, `GENERATED`, `BLOCKED`, `SKIPPED`, or `FAILED`, attempt count, safe failure code/message, trigger, and generated target. Known database concurrency errors are retried or returned as safe conflicts, not raw Prisma errors. Retriable failures use exponential backoff and stop automatically after five attempts as terminal `GENERATION_RETRY_EXHAUSTED` evidence; they cannot starve new due work forever.

The hosted worker is a bounded `GET /internal/recurring-worker` Vercel cron target. It fails closed unless the request carries the configured `CRON_SECRET`, processes at most 25 runs per invocation, and never posts the generated target. Worker recovery claims durable `PENDING` runs, retriable `FAILED` runs, and stale `CLAIMED` runs before preparing new occurrences. A timeout can therefore delay work, but it cannot authorize silent posting or erase run evidence. The five-minute schedule requires a Vercel plan that supports sub-daily cron; deployment preflight must verify that plan and the secret without printing the value.

Legacy `/recurring-invoices` routes intentionally retain their existing sales-invoice permissions for compatibility. The adapter rejects every generalized template type except `SALES_INVOICE`; new generalized lifecycle and run routes use the dedicated recurring permission family. Legacy Generate Now uses the template occurrence date, preserves the item revenue account and default sales tax, and advances the schedule only after successful draft generation. An explicitly retried blocked occurrence keeps the same occurrence identity.

## Dimensions and foreign currency

Normalized lines preserve accounts, items, tax rates, cost centers and projects. Generated document and journal lines keep those dimensions. Base-currency schedules use rate one. Foreign templates require a fixed positive rate, an approved tenant/currency-pair snapshot, or accountant evidence at run time. There is no live exchange-rate lookup; missing evidence blocks the run before a draft is created.

## Readiness

`GET /recurring-transactions/readiness` returns active/due templates, failed/blocked runs, generated drafts awaiting review, missing references, absent FX evidence, and locked-period occurrences. It is advisory and does not globally block fiscal close. A later accountant month-end close workspace may consume it.

This is burner/demo user-testing functionality, not production, tax, regulatory, provider, backup, PITR, or restore proof.
