# Period-end FX revaluation

## Status and scope

This control is intended for LedgerByte user testing. It revalues open foreign-currency customer receivables and supplier payables at an accountant-selected closing rate. It does not include bank balances, cash, inventory, fixed assets, tax filing, provider integrations, or automatic rate retrieval.

This control does not establish tax, regulatory, or accounting-standards compliance. An organization remains responsible for its accounting policy, review, and external reporting obligations.

Every rate is existing immutable `MANUAL` or `IMPORT` evidence. A live rate provider remains disabled. Revaluation never runs on a schedule and never posts silently.

## Accounting decision

LedgerByte keeps two bases for each open foreign monetary item:

- Source base balance: the residual base-currency amount on the finalized invoice or bill. Revaluation never rewrites it.
- Carrying base balance: a separate tenant-scoped monetary layer adjusted by posted revaluations.

The rate direction is:

```text
base amount = transaction-currency amount × captured rate
```

For example, an open USD 100 customer receivable carried at AED 365 and revalued at 3.75 becomes AED 375. The AED 10 increase is an unrealized gain:

```text
Dr Accounts receivable     AED 10
  Cr Unrealized FX gain             AED 10
```

For a payable, the economic direction is reversed. A higher carrying amount is an unrealized loss; a lower carrying amount is an unrealized gain.

Journal lines are functional-currency-only lines with rate `1`. The revaluation line retains the selected closing-rate snapshot, source transaction amount, original source basis, prior carrying basis, revalued basis, and gain/loss calculation.

## Lifecycle and controls

The lifecycle is deliberately explicit:

```text
DRAFT -> REVIEWED -> POSTED -> REVERSED
```

`FAILED` is a terminal evidence state for an unposted draft/review that an accountant explicitly replaces with a newly validated preview for the same date. The replacement action releases the old active scope and audits the supersession; posted runs are never superseded.

- Preview creates `DRAFT` evidence only. It requires exactly one captured rate for every eligible exposed currency.
- Review freezes the draft for posting but creates no journal.
- Post revalidates every source and carrying residual inside a serializable transaction, checks the fiscal period and configured accounts, creates a balanced unrealized FX journal, and updates the separate carrying layer.
- Reverse creates a posted reversal journal and restores the prior carrying layer, or removes the first carrying layer.

Every mutation accepts a tenant-scoped idempotency key and writes an audit record. Posted journals and source documents are not deleted or recalculated.

An active run is unique per organization and revaluation date. If source balances, prior carrying evidence, rate evidence, permissions, fiscal-period state, or posting configuration no longer match, the operation fails closed and the accountant must create or reload the appropriate run.

Source documents must be dated on or before the revaluation date and finalized before the following day. Preview and post inspect all qualifying foreign documents, including currently settled or later-voided documents, and reject a historical run when a payment, credit/debit-note allocation, reversal, document void, or other lifecycle event has an accounting/business date or operational timestamp after the requested close date. Post also requires the complete eligible source ID set to remain identical to the preview. This is a conservative current-ledger control; LedgerByte does not silently reconstruct historical open balances after later activity.

## Settlement after revaluation

Later customer and supplier settlements clear the adjusted carrying basis while reducing the source-document basis separately.

For a partial settlement, both residuals are allocated proportionally. The final allocation consumes the exact remaining carrying and source residuals so rounding cannot strand a balance. Realized FX compares settlement proceeds/payment against the adjusted carrying amount, preventing a previously recognized unrealized difference from being recognized twice.

Allocation evidence stores:

- transaction amount applied;
- source base amount applied;
- adjusted carrying base amount applied;
- carrying rate and rate snapshot;
- originating revaluation line; and
- realized gain/loss and its journal.

Payment reversal restores both residuals only if no later revaluation changed the frozen carrying line.

Revaluation post and every settlement/correction/void path take the same tenant-scoped source-row lock. This prevents a correction or settlement from racing between source validation and carrying-layer creation. Conditional carrying mutations and serializable revaluation transactions provide the second concurrency boundary.

### Revaluation then partial settlement example

An AED-base customer invoice has `USD 100.0000` open, original source basis `AED 365.0000`, and recognition rate `3.65000000`. A posted period-end revaluation at `3.75000000` changes its carrying basis to `AED 375.0000` and recognizes an `AED 10.0000` unrealized gain. The source basis remains `AED 365.0000`.

The customer later settles `USD 40.0000` at `3.80000000`:

| Evidence | Calculation | Amount |
| --- | --- | ---: |
| Settlement proceeds | `USD 40.0000 × 3.80000000` | `AED 152.0000` |
| Carrying basis allocated | `40 / 100 × AED 375.0000` | `AED 150.0000` |
| Source basis allocated | `40 / 100 × AED 365.0000` | `AED 146.0000` |
| Realized customer gain | `AED 152.0000 - AED 150.0000` | `AED 2.0000` |

```text
Dr Bank                         AED 152.0000
  Cr Accounts receivable                     AED 150.0000
  Cr Realized FX gain                         AED   2.0000
```

After the allocation, the transaction residual is `USD 60.0000`, carrying residual is `AED 225.0000`, and source residual is `AED 219.0000`. Realized FX uses the adjusted `AED 150.0000` carrying allocation, not the `AED 146.0000` source allocation, so the earlier unrealized difference is not recognized twice. The final settlement consumes the exact remaining carrying and source residuals.

## Reversal limitation

A posted revaluation can be reversed only while every affected carrying record still matches the run exactly. A later settlement or later revaluation blocks reversal. Non-payment corrections, credit/debit-note applications, and source voiding are also blocked while an active revalued carrying layer exists. The accountant must reverse later dependent activity first.

Reversal validation and carrying mutation occur in the same serializable transaction. Conditional update/delete predicates include organization, revaluation line, foreign residual, source basis, and carrying basis to prevent concurrent state loss.

## API and permissions

Tenant-scoped endpoints:

- `GET /fx/revaluations`
- `GET /fx/revaluations/:id`
- `POST /fx/revaluations/preview`
- `POST /fx/revaluations/:id/review`
- `POST /fx/revaluations/:id/post`
- `POST /fx/revaluations/:id/reverse`

Permissions:

- `fxRevaluation.read` for list/detail and the workspace;
- `fxRevaluation.run` for preview, review, and post; and
- `fxRevaluation.reverse` for reversal.

## Reporting and close integration

Read-only reporting is available through:

- `GET /reports/fx/realized-activity`
- `GET /reports/fx/unrealized-activity`
- `GET /reports/fx/rate-snapshots`
- `GET /reports/fx/open-exposure`
- `GET /fx/close-readiness`

The four report endpoints support JSON and CSV. PDF is explicitly unsupported. JSON is bounded and paginated; realized/unrealized JSON totals cover the returned page, while CSV totals cover the filtered export and fail closed above 10,000 rows. Current open exposure rejects date filters. General Ledger and aging accept a single transaction-currency filter while keeping official totals in base currency; Trial Balance, Profit & Loss, Balance Sheet, VAT, and Cash Flow reject that filter instead of producing misleading aggregates.

Realized activity dates original and reversal events separately, checks both journals, orders the complete bounded event window before pagination, and exposes previous/next navigation. Unposted revaluation runs remain preview evidence with zero recognized net effect. Fiscal-period close and lock call the same FX readiness guard inside their serializable state-transition transaction. Base-only organizations return `NOT_APPLICABLE`. Organizations with foreign activity fail closed for missing dated closing rates, invalid active/posting/type-correct FX or AR/AP account configuration, draft manual-rate documents, any current open source not counted against the exact close-date posted revaluation, later settlement/correction/void/revaluation activity without an exact posted close-date run, or original/reversal realized FX evidence without its journal.

Historical AR/AP aging also follows the conservative current-ledger boundary: if settlement, allocation reversal, credit/debit-note activity, source voiding, a later posted/reversed revaluation, or backdated finalization occurred after `asOf`, LedgerByte rejects the historical view rather than substituting current residuals or carrying values. Source queries also require `finalizedAt` before the next day boundary.

Generated report archives retain canonical base currency, transaction-currency filter, dates, dimensions, rate snapshots/sources, and revaluation run/line/status scope in their accounting context. Report packs remain metadata-only and keep pack download, storage mutation, scheduling, email, providers, and compliance submission disabled.

## Migration compatibility

The migration is additive. It creates run, line, and monetary-carrying models plus carrying evidence on allocation records. Existing allocation source basis is backfilled from its existing document base amount and its carrying rate from the existing recognition rate. It does not rewrite historical invoices, bills, posted journals, or open balances.

## Current limitations

- Eligible monetary balances are finalized foreign receivables and payables only.
- AR and AP control accounts remain LedgerByte foundation accounts `120` and `210`.
- Realized and unrealized FX accounts must be active posting accounts of the correct revenue/expense type; active AR `120` and AP `210` control accounts are also part of readiness.
- Closing rates are manual/import evidence; there is no provider, scheduling, or automatic posting.
- No ZATCA, UAE FTA, banking, payment collection, OCR, email, webhook delivery, external storage, or money-movement behavior is introduced by this control.

See [Multi-currency and FX accounting](./MULTI_CURRENCY_AND_FX_ACCOUNTING.md), [FX rate direction and rounding](./FX_RATE_DIRECTION_AND_ROUNDING.md), and [Realized FX settlements](./REALIZED_FX_SETTLEMENTS.md) for the surrounding amount, rounding, settlement, and limitation contracts.
