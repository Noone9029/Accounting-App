# Local CSV import/export toolkit

LedgerByte supports a local-only migration toolkit for controlled beta master-data review. It is not production migration proof.

## Supported local imports

- Customers
- Suppliers
- Products and services
- Chart of accounts

Each import starts as a preview job with row-level validation, duplicate checks, and a `READY_FOR_REVIEW` status. Local commits require an explicit reviewed commit action and are blocked when validation errors exist.

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
- Purchase bills
- Bank credentials
- Provider payloads
- Hosted production migrations

## Boundaries

- No external provider upload is implemented.
- No hosted, production, beta, or staging mutation is performed by this toolkit.
- No bank credentials, provider secrets, document bodies, PDFs, XML, or private payload bodies are stored in diagnostics evidence.
- Production migration, hosted PITR, object-storage recovery, and RPO/RTO remain unproven and require separate approval.
