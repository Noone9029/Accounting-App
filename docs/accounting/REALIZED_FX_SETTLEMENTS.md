# Realized FX settlements

## Scope and calculation

LedgerByte recognizes realized FX when a customer payment settles a foreign sales invoice or a supplier payment settles a foreign purchase bill and the settlement base value differs from the document carrying basis. Payment and document transaction currencies and base currencies must match. Cross-currency allocation is rejected.

For an allocation:

```text
settlement base = round4(transaction amount settled × settlement rate)
realized difference = settlement base - document carrying base allocated
```

For customers, a positive difference is a gain and a negative difference is a loss. For suppliers, the direction is reversed. A non-final allocation normally uses the document recognition basis, or the proportional carrying basis after revaluation. The final allocation consumes the exact remaining transaction, carrying-base, source-base, and payment-base residuals.

## Full customer settlement

An AED-base invoice has `USD 100.0000` open with a carrying basis of `AED 365.0000` at `3.65000000`. The customer pays the full USD amount at `3.75000000`, producing `AED 375.0000`.

```text
Dr Bank                         AED 375.0000
  Cr Accounts receivable                     AED 365.0000
  Cr Realized FX gain                         AED  10.0000
```

The allocation stores `USD 100.0000`, document base `AED 365.0000`, settlement base `AED 375.0000`, both rates, the relevant snapshots, realized gain `AED 10.0000`, and the linked journal.

## Partial customer settlement

Using the same `USD 100.0000` invoice carried at `AED 365.0000`, a first `USD 40.0000` payment at `3.75000000` produces settlement base `AED 150.0000`. The allocated carrying basis is `AED 146.0000`, so the realized gain is `AED 4.0000`.

```text
Dr Bank                         AED 150.0000
  Cr Accounts receivable                     AED 146.0000
  Cr Realized FX gain                         AED   4.0000
```

The remaining evidence is `USD 60.0000` and `AED 219.0000`. If the final `USD 60.0000` is settled at the same rate, the final allocation consumes that exact `AED 219.0000` carrying residual rather than manufacturing a new rounded basis.

## Full supplier settlement

A SAR-base bill has `USD 100.0000` open with a carrying basis of `SAR 375.0000` at `3.75000000`. Paying the full USD amount at `3.65000000` uses `SAR 365.0000`; clearing the larger payable produces a supplier gain of `SAR 10.0000`.

```text
Dr Accounts payable            SAR 375.0000
  Cr Bank                                     SAR 365.0000
  Cr Realized FX gain                         SAR  10.0000
```

If the settlement base exceeds the carrying basis instead, the excess is a supplier realized loss.

## Partial supplier settlement

A SAR-base bill has `USD 100.0000` open and carrying basis `SAR 365.0000` at `3.65000000`. A `USD 40.0000` payment at `3.75000000` clears `SAR 146.0000` of carrying basis but pays `SAR 150.0000`, producing a `SAR 4.0000` realized loss.

```text
Dr Accounts payable            SAR 146.0000
Dr Realized FX loss            SAR   4.0000
  Cr Bank                                     SAR 150.0000
```

The remaining evidence is `USD 60.0000` and `SAR 219.0000`.

## Carrying basis after revaluation

After a posted revaluation, settlement allocates the adjusted carrying basis proportionally while reducing the immutable source-document basis separately. It stores both amounts, the carrying rate/snapshot, and the originating revaluation line. Realized FX compares payment proceeds or payment cost with the adjusted carrying amount, so the period-end unrealized difference is not recognized a second time. The exact numeric flow is in [Period-end FX revaluation](./PERIOD_END_FX_REVALUATION.md#revaluation-then-partial-settlement-example).

## Posting, idempotency, and correction

Direct allocations post realized gain/loss inside the customer or supplier payment journal. A later allocation from unapplied payment credit creates at most one dedicated base-currency-only FX adjustment journal. A zero difference creates no realized FX line, journal, or focused realized event.

Tenant-scoped idempotency keys, request hashes, uniqueness constraints, conditional balance updates, and transaction-scoped source locks prevent duplicate allocation or journal effects. Replaying the same accepted request returns the existing result where supported; reusing a key for a different request or losing a concurrency claim fails closed.

Posted allocation evidence is corrected by supported reversal, not by editing its rates or amounts. Reversing an unapplied allocation creates a linked reversal journal and restores both transaction and base residuals exactly once. Voiding a direct payment reverses its payment journal and linked realized effect. A reversal is blocked when later revaluation or dependent activity means the frozen carrying evidence no longer matches.

## Configuration and unsupported paths

When a calculation produces a non-zero gain or loss, LedgerByte requires the corresponding configured account to be active, posting-enabled, tenant-owned, and the correct revenue or expense type. Missing or invalid account configuration fails closed before the payment or allocation posts. A zero-FX settlement does not require an unused gain/loss account.

The following are not realized-FX settlement workflows:

- cross-currency customer or supplier allocation;
- foreign-currency customer or supplier refunds;
- opening-balance or manual-journal settlement;
- payment-provider or bank-initiated money movement; and
- live-rate lookup, tax filing, or compliance submission.

See [Multi-currency and FX accounting](./MULTI_CURRENCY_AND_FX_ACCOUNTING.md), [FX reporting and close controls](./FX_REPORTING_AND_CLOSE.md), and [Audit log coverage review](../AUDIT_LOG_COVERAGE_REVIEW.md) for the surrounding journal, report, close, and audit contracts.
