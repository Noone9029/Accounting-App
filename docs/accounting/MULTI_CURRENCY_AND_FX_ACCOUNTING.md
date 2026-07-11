# Multi-currency and FX accounting

## Purpose and evidence boundary

This document summarizes the multi-currency behavior proven by LedgerByte Phases 1–7 for controlled user testing. It is an accounting and product contract, not a claim that every accounting workflow is foreign-currency capable and not tax, regulatory, or accounting-standards compliance advice.

The organization base currency is the accounting truth for ledgers, journal headers, official report totals, open-balance reconciliation, and fiscal-period close. The transaction currency is supporting evidence retained beside the base amounts so an accountant can reproduce the captured conversion. Supported currencies are `SAR`, `AED`, `USD`, `EUR`, `GBP`, `BHD`, `KWD`, `OMR`, and `QAR`; same-currency activity uses rate `1`.

The invariant is:

```text
base amount = transaction amount × captured rate
```

See [FX rate direction and rounding](./FX_RATE_DIRECTION_AND_ROUNDING.md) for input, conversion, rounding, tax, discount, and worked-example rules.

## Proven workflow coverage

| Workflow | Proven foreign-currency behavior |
| --- | --- |
| Sales invoice | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |
| Credit note | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |
| Purchase bill | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |
| Purchase debit note | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |
| Cash expense | FX context is captured and frozen when the expense posts during creation |
| Customer payment | Full and partial allocation to a sales invoice in the same transaction/base currency, with realized gain/loss when non-zero |
| Supplier payment | Full and partial allocation to a purchase bill in the same transaction/base currency, with realized gain/loss when non-zero |
| Period-end revaluation | Accountant-controlled preview, review, post, and guarded reversal for open finalized foreign receivables and payables |
| Product/service import | Reviewed master-data price preview that commits the base equivalent only after explicit confirmation |

Payment and document transaction currencies must match. Later unapplied customer or supplier payment credit can be allocated only within the same transaction/base currency contract. Direct payment allocation, later unapplied allocation, allocation reversal, and payment void preserve the realized-FX evidence described in [Realized FX settlements](./REALIZED_FX_SETTLEMENTS.md).

Refund workflows remain base-currency-only. Customer and supplier refunds use the base-currency posting guard, rate `1`, and do not represent a foreign-currency refund or a realized-FX mutation.

## Immutable evidence and journals

Manual and imported rate snapshots are append-only. Correcting a rate creates a new snapshot; LedgerByte does not edit a snapshot or expose a rate-update endpoint. Same-currency evidence uses `SYSTEM_RATE_1` without a foreign snapshot. A supported foreign draft retains `currency`, `baseCurrency`, `exchangeRate`, `rateDate`, `rateSource`, and optional `rateSnapshotId`; finalization or posting freezes that context.

Posted journal headers and their debit/credit totals remain in base currency. Supported journal lines preserve transaction debit/credit, transaction currency, captured rate, optional tenant-owned snapshot, and bounded rounding-component evidence. Transaction amounts balance by currency, base debits equal base credits, and foreign base totals must reconcile to the captured rate within the documented component-rounding boundary. Reversal lines swap both base and transaction sides while preserving currency, rate, snapshot, tax, cost center, and project evidence. Posted source documents and journals are not rewritten to apply a later rate.

Focused transactional audit events supplement the existing document, payment, journal, and revaluation trail:

- `DOCUMENT_FX_CONTEXT_CHANGED` and `DOCUMENT_FX_RATE_FROZEN`;
- `REALIZED_FX_POSTED` and `REALIZED_FX_REVERSED`; and
- `FX_REVALUATION_PREVIEWED`, `FX_REVALUATION_REVIEWED`, `FX_REVALUATION_POSTED`, `FX_REVALUATION_REVERSED`, and `FX_REVALUATION_SUPERSEDED`.

See [Audit log coverage review](../AUDIT_LOG_COVERAGE_REVIEW.md) for exact emission and silence conditions and metadata-redaction limits.

## Revaluation, reports, and close

Open finalized foreign sales invoices and purchase bills can be revalued using selected immutable `MANUAL` or `IMPORT` closing-rate evidence. Revaluation keeps the original source base residual separate from the current carrying base, and later settlement clears the carrying basis while reducing source basis separately. See [Period-end FX revaluation](./PERIOD_END_FX_REVALUATION.md).

The realized-activity, unrealized-activity, rate-snapshot, and current open-exposure reports are read-only JSON/CSV surfaces. Official totals remain in base currency. General Ledger and AR/AP aging accept one supported transaction-currency filter where their mathematics preserve base totals; Trial Balance, Profit & Loss, Balance Sheet, VAT, Cash Flow, and management aggregates reject that filter. Close readiness fails closed on missing rates, configuration, revaluation coverage, or realized-FX journal evidence. See [FX reporting and close controls](./FX_REPORTING_AND_CLOSE.md).

## Import and API boundaries

The product/service CSV path is a reviewed master-data import, not an accounting-document import. It previews transaction price, rate evidence, and base equivalent, reports row-level errors, and requires `confirmReviewed: true` before an atomic concurrency-claimed commit. The base equivalent becomes the item catalog price. Existing imports without FX columns retain base-currency/rate-1 behavior. See [Local CSV import/export toolkit](../migration-toolkit/LOCAL_CSV_IMPORT_EXPORT.md).

`GET /public-api/v1/currencies` and `GET /public-api/v1/fx-rates` are authenticated, tenant-scoped, read-only, permission-guarded resources with explicit response mappers. They do not enable unauthenticated access, API keys, OAuth clients, rate mutation, raw Prisma output, or financial mutation. See [Public API v1 readiness](../api/PUBLIC_API_V1_READINESS.md).

## Migration and backfill policy

The FX schema progression is additive. Same-currency compatibility is backfilled at rate `1`; untouched finalized foreign invoices and bills receive only provable transaction-open evidence. The realized-settlement migration fails closed if historical foreign settlements would require an inferred recognition or settlement rate. Revaluation adds separate run, line, carrying, and allocation evidence. No migration rewrites historical posted journal amounts, finalized document accounting amounts, or open balances to manufacture FX history.

## Explicitly unsupported workflows

- foreign-currency customer or supplier refunds;
- foreign opening balances or unsupported manual-journal posting;
- accounting-document import, including invoices, bills, notes, payments, refunds, and journals;
- cross-currency payment allocation;
- period-end revaluation of bank/cash balances, inventory, fixed assets, revenue, or prepayments;
- transaction-currency filtering for financial statements that cannot represent it honestly;
- live or scheduled rate retrieval, provider calls, automatic posting, bank feeds, or payment initiation/collection;
- unauthenticated financial API access or public v1 financial mutation; and
- ZATCA submission, UAE FTA filing, or any other provider, tax, regulatory, or compliance outcome.
