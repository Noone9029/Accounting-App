# FX reporting and close controls

## Purpose

LedgerByte exposes accountant-review evidence for document-level foreign exchange without turning a report into a posting, rate-provider, banking, payment, or compliance workflow. This scope is for controlled user testing.

## Amount model

Official report totals are always in the organization base currency (AED or SAR). Foreign transaction amounts are supporting detail and are never summed across currencies.

An open foreign receivable or payable can carry three distinct values:

- transaction residual: open units in the document currency;
- source base residual: base amount retained on the immutable finalized source document; and
- current carrying base: source residual adjusted by the latest posted period-end revaluation.

AR/AP aging and open exposure use current carrying base for base-currency reconciliation. They preserve source base and transaction residuals as separate evidence. Invoice and bill detail labels transaction balance due in the transaction currency and current carrying value in base currency.

## Report surfaces

All routes require `reports.view`. CSV additionally requires the existing report-export or generated-document-download permission.

| Route | Evidence | Formats |
| --- | --- | --- |
| `/reports/fx/realized-activity` | Frozen customer/supplier allocation gain/loss, reversal, and missing-journal exceptions | JSON, CSV |
| `/reports/fx/unrealized-activity` | Revaluation line gross, reversed, and net effects | JSON, CSV |
| `/reports/fx/rate-snapshots` | Immutable rate snapshots and tenant-scoped usage counts | JSON, CSV |
| `/reports/fx/open-exposure` | Open AR/AP grouped per transaction currency with base carrying totals | JSON, CSV |

PDF requests are rejected explicitly. CSV protects formula-like cells. Every database read is organization-scoped.

JSON uses bounded pagination (up to 250 rows per page), and the web workspace exposes previous/next navigation. Realized activity first collects the complete safe filtered window, orders original and reversal events by their actual accounting-event dates, and only then pages; it fails closed above 10,000 events. Realized and unrealized summary cards are explicitly page-scoped; CSV totals cover the filtered export. CSV fails closed above 10,000 rows and asks the accountant to narrow the date or currency scope. Open exposure is a current-state report, so it rejects `from` and `to` instead of silently ignoring them. Rate-snapshot usage is counted with database grouping rather than loading every linked source row.

## Filter policy

- General Ledger: supports date, branch, account, cost center, project, and one normalized transaction currency. Its totals and running balances remain base currency.
- AR/AP aging: supports as-of date, branch, and one transaction currency. Transaction totals are grouped by currency.
- Trial Balance, Profit & Loss, Balance Sheet, VAT, Cash Flow, and management aggregates: reject transaction-currency filtering because a filtered aggregate would not be an honest financial statement.
- Dimensions compose with currency only where the source and report mathematics support both. Unsupported filters are rejected, not ignored.

## Reversal effects

Realized activity emits the original allocation and its later reversal as separate dated events. Direct allocations use the payment date and payment-void date; unapplied allocations use their allocation and reversal timestamps. Unrealized activity treats `DRAFT`, `REVIEWED`, and `FAILED` runs as unposted previews: their preview effect is visible but their recognized net effect is zero. Reversed revaluation runs retain gross and reversal evidence and contribute zero net gain/loss. Missing original or reversal journals remain visible as close exceptions.

## Close readiness

`GET /fx/close-readiness?asOf=YYYY-MM-DD` returns `NOT_APPLICABLE`, `READY`, or `BLOCKED`, blocker counts, and review routes.

Base-only organizations are `NOT_APPLICABLE`. For organizations with foreign activity, the guard checks:

- all four FX gain/loss accounts are configured as active posting accounts with the required revenue/expense types, and active posting AR `120` / AP `210` controls exist;
- each open foreign currency has a manual/import closing-rate snapshot dated on the close date;
- draft documents using manual rates have been reviewed and finalized or removed;
- every currently open foreign monetary source is covered by a posted revaluation line from the exact close-date run; and
- original and reversal realized gain/loss evidence has its journal.

Fiscal-period close and lock evaluate this service and conditionally change period state inside one serializable transaction. A blocker or concurrent state change prevents the mutation.

Historical close is conservative. Database-counted settlement, allocation/reversal, credit/debit-note, source-void, and later-revaluation activity after the requested close date blocks readiness unless an exact posted close-date revaluation already proves the frozen historical source scope. A backdated source finalized after the close boundary always remains a blocker because it could not have belonged to the frozen run. Current open-source coverage is counted against that posted run in the database; readiness never declares success from a truncated source list.

Historical AR/AP aging uses current residual/carrying data only when no relevant source activity or revaluation occurred after `asOf`. Backdated documents finalized later are rejected and excluded by the query cutoff. If later activity exists, the report rejects the request and directs the accountant to a current date instead of presenting today’s balances as historical truth.

## Archive and report-pack identity

Generated report PDFs store a canonical accounting context containing report kind, base currency, amount basis, dates, dimensions, transaction-currency filter, rate snapshot/source scope, and revaluation run/line/status scope. Canonical source identity is stable regardless of query insertion order.

Report-pack manifests preserve supported dates, dimensions, transaction currency, and base-currency context in their item query/scope and export links. A pack rejects a filter that its report cannot represent honestly. Pack download and archive execution remain disabled until the existing storage proof gates pass.

## Explicit exclusions

No live rate provider, bank feed, payment initiation, payment collection, OCR, email, webhook delivery, external storage activation, ZATCA submission, UAE FTA filing, or other compliance claim is enabled by this work.
