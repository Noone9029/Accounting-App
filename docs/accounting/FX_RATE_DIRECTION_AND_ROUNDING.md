# FX rate direction and rounding

## Canonical rate direction

LedgerByte stores the amount of organization base currency represented by one unit of transaction currency:

```text
base amount = transaction amount × captured rate
```

The rate is never inverted by document posting, settlement, revaluation, reporting, or reviewed product/service import. Same-currency evidence must use rate `1`.

Manual and import rate input must be a positive plain decimal with at most eight fractional digits and no exponent, hexadecimal, sign-only, trailing decimal point, zero, or negative form. Persistent rate evidence is represented at eight decimal places. Manual and imported snapshots are append-only; a correction creates a new snapshot.

## Money precision

Accounting calculations use Decimal arithmetic. Every converted money component uses `ROUND_HALF_UP` to four fractional digits. A final allocation consumes the exact stored residual rather than recalculating it, so repeated partial settlements do not strand rounding dust.

For direct conversion:

```text
round4(transaction amount × captured rate)
```

For example, `USD 4.5000 × 3.67250000 = AED 16.52625000`, which becomes `AED 16.5263` because the fifth fractional digit is `5`.

## Discount and tax conversion order

Document lines calculate in transaction currency first. The order is gross, discount before tax, taxable amount, tax, and line total:

1. Round `quantity × unit price` to transaction gross.
2. Calculate and round the transaction discount.
3. Derive the after-discount transaction amount.
4. For tax-exclusive lines, calculate tax on the after-discount taxable amount. For tax-inclusive lines, extract taxable amount and tax from the after-discount total. `NO_TAX` produces zero tax.
5. Convert transaction gross, discount, and tax separately at the captured rate to four places.
6. Preserve accounting identities in base currency. Tax-exclusive base taxable is base gross minus base discount and base total is taxable plus converted tax. Tax-inclusive base total is base gross minus base discount and base taxable is total minus converted tax.
7. Sum the already-converted base line components for document totals. Do not reconvert a transaction-currency grand total as a replacement for the stored component evidence.

This ordering preserves both transaction evidence and base journal identities under four-place component rounding.

## AED-base example

An AED-base organization records one USD tax-exclusive line:

- transaction gross: `USD 100.0000`;
- 10% discount: `USD 10.0000`;
- transaction taxable: `USD 90.0000`;
- 5% tax: `USD 4.5000`;
- transaction total: `USD 94.5000`; and
- captured rate: `3.67250000 AED per USD`.

The stored base components are:

| Component | Calculation | AED result |
| --- | --- | ---: |
| Gross | `100.0000 × 3.67250000` | `367.2500` |
| Discount | `10.0000 × 3.67250000` | `36.7250` |
| Taxable | `367.2500 - 36.7250` | `330.5250` |
| Tax | `4.5000 × 3.67250000` | `16.5263` |
| Total | `330.5250 + 16.5263` | `347.0513` |

## SAR-base example

A SAR-base organization converts `USD 75.1250` using the eight-place captured rate `4.08123456`:

```text
USD 75.1250 × 4.08123456 = SAR 306.60274632
stored base amount = SAR 306.6027
```

The same rule applies to document components, payments, settlement carrying values, revaluation, and reviewed catalog-price imports. A consumer must not divide by `4.08123456` or round the rate before multiplying.

## Journal rounding boundary

Supported journals remain exactly base-balanced and transaction-balanced by currency. Because a journal side can aggregate multiple independently rounded document components, its foreign base-to-transaction reconciliation allows at most `0.0001` per declared source component. That bounded evidence is not permission to force an unbalanced journal or hide a larger conversion difference.
