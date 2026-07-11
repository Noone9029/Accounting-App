# Local CSV import/export toolkit

LedgerByte supports a local-only migration toolkit for controlled beta master-data review. It is not production migration proof.

## Supported local imports

- Customers
- Suppliers
- Products and services
- Chart of accounts

Each import starts as a preview job with row-level validation, duplicate checks, and a `READY_FOR_REVIEW` status. Local commits require an explicit reviewed commit action and are blocked when validation errors exist.

### Product and service price columns

The existing required product/service columns are unchanged. Product/service CSV files may additionally include these optional columns:

- `currency`
- `exchangeRate`
- `rateDate`
- `rateSource`
- `rateSnapshotId`

Rows without FX values keep the existing behavior: `sellingPrice` is interpreted and committed in the organization's base currency at rate `1`. For a foreign-currency row, `sellingPrice` is the transaction-currency price and the preview records both `transactionSellingPrice` and `baseSellingPrice`. The normalized `sellingPrice` is the base amount that will be committed to the item catalog after explicit review.

The rate direction is exact and never inverted:

`base amount = transaction amount × captured exchange rate`

Inline foreign rates must include a supported currency, a positive plain-decimal `exchangeRate` with no more than eight fractional digits, and a valid `rateDate` in `YYYY-MM-DD` form. Inline imported rates use `IMPORT`; no live provider lookup occurs. A referenced `rateSnapshotId` is accepted only when the append-only snapshot belongs to the same tenant and exactly matches the imported currency, organization base currency, exchange rate, and rate date. Rate corrections create a new snapshot; existing snapshots are not edited by this toolkit.

Preview validation reports incomplete or malformed FX tuples, unsupported currencies, same-currency rates other than `1`, and missing or mismatched snapshots as row-level errors. No item is created until the reviewed job is committed, and that commit is atomic and concurrency-claimed.

## Supported exports

- Customers
- Suppliers
- Products and services
- Chart of accounts

Exports use CSV formula-injection protection. Export audit events record safe metadata only.

## Unsupported imports

- Opening balances
- Posted journals
- Sales invoices
- Credit notes
- Purchase bills
- Purchase debit notes
- Cash expenses
- Customer and supplier payments
- Customer and supplier refunds
- Journal entries and other accounting documents
- Bank credentials
- Provider payloads
- Hosted production migrations

## Boundaries

- No external provider upload is implemented.
- No hosted, production, beta, or staging mutation is performed by this toolkit.
- No bank credentials, provider secrets, document bodies, PDFs, XML, or private payload bodies are stored in diagnostics evidence.
- Production migration, hosted PITR, object-storage recovery, and RPO/RTO remain unproven and require separate approval.
