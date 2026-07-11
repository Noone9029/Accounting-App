# Wafeq competitor multi-currency foundation

## Evidence boundary

This is a LedgerByte product-positioning note based only on behavior proven in the repository through Phases 1–7. It is not a live or current Wafeq feature assessment, does not compare current Wafeq pricing or capabilities, and must not be used to claim parity or superiority. No uncited current-market statement is part of this document.

The useful product question is narrower: what multi-currency foundation can LedgerByte truthfully demonstrate today, and where does it still fail closed?

## Proven LedgerByte foundation

| Product area | Proven behavior |
| --- | --- |
| Currency model | Organization base currency remains accounting truth; supported documents retain transaction currency and the exact direction `base = transaction × rate` |
| Rate evidence | Positive plain-decimal input up to eight fractional places; manual/import snapshots are append-only; same-currency uses rate `1` |
| Documents | Foreign sales invoices, credit notes, purchase bills, purchase debit notes, and cash expenses preserve transaction components and post base-balanced journals |
| Settlements | Matching-currency customer/supplier full, partial, and unapplied-credit allocations preserve carrying, settlement, source, gain/loss, journal, reversal, and idempotency evidence |
| Period end | Accountant-controlled AR/AP revaluation preview, review, post, reversal, carrying layer, close-readiness guard, and read-only reports |
| Import | A reviewed master-data FX import previews product/service transaction price, captured rate evidence, and committed base-equivalent catalog price; commit is explicit and atomic |
| API | `/public-api/v1/currencies` and `/public-api/v1/fx-rates` are authenticated, tenant-scoped, read-only, permission-guarded, paginated/mapped resources |
| Audit | Focused FX events are written inside the same transaction as supported document, settlement, and revaluation mutations |
| Migration | Every schema change is additive; same-currency evidence is backfilled only where provable, and historical foreign settlements that require inference stop the migration |

The focused audit catalogue includes `DOCUMENT_FX_CONTEXT_CHANGED`, `DOCUMENT_FX_RATE_FROZEN`, `REALIZED_FX_POSTED`, `REALIZED_FX_REVERSED`, and the preview/review/post/reverse/supersede revaluation lifecycle. These events supplement the normal document, payment, journal, and audit trail; they do not replace it.

The additive backfill policy does not rewrite historical posted journals or finalized accounting amounts. Untouched foreign receivables/payables receive only provable transaction-open compatibility evidence. Historical foreign settlements that cannot be reconstructed from immutable evidence require reviewed treatment instead of manufactured rates.

## Current LedgerByte limitations

- Refund workflows remain base-currency-only. Customer and supplier refunds do not preserve or post foreign-currency refund/realized-FX evidence.
- Payment and document transaction currencies must match; cross-currency allocation is unsupported.
- Revaluation covers finalized foreign customer receivables and supplier payables, not bank/cash balances, inventory, fixed assets, revenue, or prepayments.
- The migration toolkit imports customer, supplier, product/service, and chart-of-account master data only. It does not import accounting documents, payments, refunds, journals, or opening balances.
- Public v1 FX is not unauthenticated public product access. It provides no API key/OAuth client rollout and no rate or financial mutation endpoint.
- Trial Balance, Profit & Loss, Balance Sheet, VAT, Cash Flow, and management aggregates reject transaction-currency filtering rather than present misleading totals.
- Historical revaluation, close, and aging views deliberately reject later activity they cannot reconstruct safely.

## Claims that are not authorized

No provider or compliance claim is made by this foundation. It enables no live or scheduled rate provider, provider call, hosted mutation, bank feed, payment initiation/collection, money movement, ZATCA submission, UAE FTA filing, automated compliance decision, external storage activation, email, OCR, or webhook delivery.

The name “Wafeq” identifies the internal competitor context only. Before any external comparison, a separately approved, dated, and cited market assessment must verify the competitor's current product. This document remains centered on LedgerByte evidence.

## Detailed policies

- [Multi-currency and FX accounting](../accounting/MULTI_CURRENCY_AND_FX_ACCOUNTING.md)
- [FX rate direction and rounding](../accounting/FX_RATE_DIRECTION_AND_ROUNDING.md)
- [Realized FX settlements](../accounting/REALIZED_FX_SETTLEMENTS.md)
- [Period-end FX revaluation](../accounting/PERIOD_END_FX_REVALUATION.md)
- [FX reporting and close controls](../accounting/FX_REPORTING_AND_CLOSE.md)
- [Local CSV import/export toolkit](../migration-toolkit/LOCAL_CSV_IMPORT_EXPORT.md)
- [Public API v1 readiness](../api/PUBLIC_API_V1_READINESS.md)
- [Audit log coverage review](../AUDIT_LOG_COVERAGE_REVIEW.md)
