# API Catalog

Audit date: 2026-05-12

Most business endpoints require JWT auth and `x-organization-id`. Auth endpoints and `GET /health` are exceptions. Status values here describe implementation maturity, not runtime health.

## Auth

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/register` | Register user and organization context | No | No | Implemented | MVP registration. |
| POST | `/auth/login` | Login and receive JWT | No | No | Implemented | Uses configured JWT secret. |
| GET | `/auth/me` | Current authenticated user | Yes | No | Implemented | Does not require org context. |

## Health

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | API liveness check | No | No | Implemented | Used for local readiness checks. |

## Organizations

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/organizations` | Create organization | Yes | No | Implemented | Creates tenant context. |
| GET | `/organizations` | List organizations for user | Yes | No | Implemented | Membership scoped. |
| GET | `/organizations/:id` | Get one organization | Yes | No | Implemented | Membership scoped. |

## Branches

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/branches` | List branches | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/branches` | Create branch | Yes | Yes | Implemented | Basic branch data. |
| PATCH | `/branches/:id` | Update branch | Yes | Yes | Implemented | Tenant scoped. |

## Contacts And Ledgers

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/contacts` | List contacts | Yes | Yes | Implemented | Customer/supplier/BOTH. |
| POST | `/contacts` | Create contact | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/contacts/:id` | Contact detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/contacts/:id` | Update contact | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/contacts/:id/ledger` | Customer AR ledger | Yes | Yes | Implemented | Customer/BOTH only. |
| GET | `/contacts/:id/statement` | Customer statement JSON | Yes | Yes | Implemented | `from`/`to` query optional. |
| GET | `/contacts/:id/statement-pdf-data` | Customer statement PDF data | Yes | Yes | Implemented | Template data. |
| GET | `/contacts/:id/statement.pdf` | Customer statement PDF | Yes | Yes | Implemented | Archives PDF on download. |
| POST | `/contacts/:id/generate-statement-pdf` | Generate/archive statement PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/contacts/:id/supplier-ledger` | Supplier AP ledger | Yes | Yes | Implemented | Supplier/BOTH only. |
| GET | `/contacts/:id/supplier-statement` | Supplier statement JSON | Yes | Yes | Implemented | No supplier statement PDF yet. |

## Accounts

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/accounts` | List chart of accounts | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/accounts` | Create account | Yes | Yes | Implemented | Validates parent/org. |
| GET | `/accounts/:id` | Account detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/accounts/:id` | Update account | Yes | Yes | Implemented | System account restrictions. |
| DELETE | `/accounts/:id` | Delete account | Yes | Yes | Implemented | Blocks referenced/system accounts. |

## Tax Rates, Items, Journals, Audit

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/tax-rates` | List tax rates | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/tax-rates` | Create tax rate | Yes | Yes | Implemented | Validates non-negative rates. |
| PATCH | `/tax-rates/:id` | Update tax rate | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/items` | List items | Yes | Yes | Implemented | Product/service records. |
| POST | `/items` | Create item | Yes | Yes | Implemented | Revenue account required. |
| GET | `/items/:id` | Item detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/items/:id` | Update item | Yes | Yes | Implemented | Tenant scoped. |
| DELETE | `/items/:id` | Delete item | Yes | Yes | Implemented | Blocks referenced items. |
| GET | `/journal-entries` | List journals | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/journal-entries` | Create draft journal | Yes | Yes | Implemented | Balanced lines required. |
| GET | `/journal-entries/:id` | Journal detail | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/journal-entries/:id` | Edit draft journal | Yes | Yes | Implemented | Draft only. |
| POST | `/journal-entries/:id/post` | Post journal | Yes | Yes | Implemented | Idempotency guarded. |
| POST | `/journal-entries/:id/reverse` | Reverse journal | Yes | Yes | Implemented | Creates opposite posted journal. |
| GET | `/audit-logs` | List audit logs | Yes | Yes | Implemented | Tenant scoped. |

## Sales Invoices

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/sales-invoices` | List invoices | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/sales-invoices/open` | Open invoices by customer | Yes | Yes | Implemented | Query `customerId`. |
| POST | `/sales-invoices` | Create draft invoice | Yes | Yes | Implemented | Server-side totals. |
| GET | `/sales-invoices/:id` | Invoice detail | Yes | Yes | Implemented | Includes lines/relations. |
| PATCH | `/sales-invoices/:id` | Edit draft invoice | Yes | Yes | Implemented | Draft only. |
| DELETE | `/sales-invoices/:id` | Delete draft invoice | Yes | Yes | Implemented | Draft only. |
| POST | `/sales-invoices/:id/finalize` | Finalize and post AR | Yes | Yes | Implemented | Idempotent. |
| POST | `/sales-invoices/:id/void` | Void invoice | Yes | Yes | Implemented | Blocks active allocations/payments. |
| GET | `/sales-invoices/:id/pdf-data` | Invoice PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/sales-invoices/:id/pdf` | Invoice PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/sales-invoices/:id/generate-pdf` | Generate/archive invoice PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/sales-invoices/:id/credit-notes` | Linked credit notes | Yes | Yes | Implemented | Invoice detail support. |
| GET | `/sales-invoices/:id/credit-note-allocations` | Credit allocation history | Yes | Yes | Implemented | Active/reversed rows. |
| GET | `/sales-invoices/:id/customer-payment-unapplied-allocations` | Overpayment allocation history | Yes | Yes | Implemented | Active/reversed rows. |

## Customer Payments, Credit Notes, Refunds

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/customer-payments` | List customer payments | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/customer-payments` | Create posted payment | Yes | Yes | Implemented | Allocations optional. |
| GET | `/customer-payments/:id` | Payment detail | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/customer-payments/:id/receipt-data` | Receipt data | Yes | Yes | Implemented | Legacy/structured data. |
| GET | `/customer-payments/:id/receipt-pdf-data` | Receipt PDF data | Yes | Yes | Implemented | Template data. |
| GET | `/customer-payments/:id/receipt.pdf` | Receipt PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/customer-payments/:id/generate-receipt-pdf` | Generate receipt PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/customer-payments/:id/unapplied-allocations` | Later overpayment allocations | Yes | Yes | Implemented | Active/reversed rows. |
| POST | `/customer-payments/:id/apply-unapplied` | Apply overpayment to invoice | Yes | Yes | Implemented | No journal entry. |
| POST | `/customer-payments/:id/unapplied-allocations/:allocationId/reverse` | Reverse overpayment allocation | Yes | Yes | Implemented | Restores balances. |
| POST | `/customer-payments/:id/void` | Void payment | Yes | Yes | Implemented | Restores invoice balances; blocks active later allocations/refunds. |
| DELETE | `/customer-payments/:id` | Delete draft payment | Yes | Yes | Partial | Draft exists in enum but MVP posts immediately. |
| GET | `/credit-notes` | List credit notes | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/credit-notes` | Create draft credit note | Yes | Yes | Implemented | Server-side totals. |
| GET | `/credit-notes/:id` | Credit note detail | Yes | Yes | Implemented | Includes lines/relations. |
| PATCH | `/credit-notes/:id` | Edit draft credit note | Yes | Yes | Implemented | Draft only. |
| DELETE | `/credit-notes/:id` | Delete draft credit note | Yes | Yes | Implemented | Draft only. |
| POST | `/credit-notes/:id/finalize` | Finalize and post AR reduction | Yes | Yes | Implemented | Idempotent. |
| POST | `/credit-notes/:id/void` | Void credit note | Yes | Yes | Implemented | Blocks active allocations/refunds. |
| GET | `/credit-notes/:id/allocations` | Credit allocations | Yes | Yes | Implemented | Includes reversed rows. |
| POST | `/credit-notes/:id/apply` | Apply credit note to invoice | Yes | Yes | Implemented | No journal entry. |
| POST | `/credit-notes/:id/allocations/:allocationId/reverse` | Reverse credit allocation | Yes | Yes | Implemented | Restores balances. |
| GET | `/credit-notes/:id/pdf-data` | Credit note PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/credit-notes/:id/pdf` | Credit note PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/credit-notes/:id/generate-pdf` | Generate credit note PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/customer-refunds` | List refunds | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/customer-refunds/refundable-sources` | Refundable payment/credit sources | Yes | Yes | Implemented | Query `customerId`. |
| POST | `/customer-refunds` | Create posted manual refund | Yes | Yes | Implemented | Payment gateway not involved. |
| GET | `/customer-refunds/:id` | Refund detail | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/customer-refunds/:id/void` | Void refund | Yes | Yes | Implemented | Restores source unapplied amount. |
| DELETE | `/customer-refunds/:id` | Delete draft refund | Yes | Yes | Partial | Draft exists in enum but MVP posts immediately. |
| GET | `/customer-refunds/:id/pdf-data` | Refund PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/customer-refunds/:id/pdf` | Refund PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/customer-refunds/:id/generate-pdf` | Generate refund PDF | Yes | Yes | Implemented | Explicit archive action. |

## Purchases And Supplier Payments

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/purchase-bills` | List purchase bills | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/purchase-bills/open` | Open bills by supplier | Yes | Yes | Implemented | Query `supplierId`. |
| POST | `/purchase-bills` | Create draft bill | Yes | Yes | Implemented | Server-side totals. |
| GET | `/purchase-bills/:id` | Bill detail | Yes | Yes | Implemented | Includes lines/allocations. |
| PATCH | `/purchase-bills/:id` | Edit draft bill | Yes | Yes | Implemented | Draft only. |
| DELETE | `/purchase-bills/:id` | Delete draft bill | Yes | Yes | Implemented | Draft only. |
| POST | `/purchase-bills/:id/finalize` | Finalize and post AP | Yes | Yes | Implemented | Idempotent. |
| POST | `/purchase-bills/:id/void` | Void bill | Yes | Yes | Implemented | Blocks active supplier payment allocations. |
| GET | `/purchase-bills/:id/pdf-data` | Purchase bill PDF data | Yes | Yes | Implemented | Operational only. |
| GET | `/purchase-bills/:id/pdf` | Purchase bill PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/purchase-bills/:id/generate-pdf` | Generate purchase bill PDF | Yes | Yes | Implemented | Explicit archive action. |
| GET | `/supplier-payments` | List supplier payments | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/supplier-payments` | Create posted supplier payment | Yes | Yes | Implemented | Allocations optional. |
| GET | `/supplier-payments/:id` | Supplier payment detail | Yes | Yes | Implemented | Tenant scoped. |
| GET | `/supplier-payments/:id/allocations` | Payment allocations | Yes | Yes | Implemented | Bill allocations. |
| POST | `/supplier-payments/:id/void` | Void supplier payment | Yes | Yes | Implemented | Restores bill balances. |
| DELETE | `/supplier-payments/:id` | Delete draft supplier payment | Yes | Yes | Partial | Draft exists in enum but MVP posts immediately. |
| GET | `/supplier-payments/:id/receipt-data` | Supplier receipt data | Yes | Yes | Implemented | Structured data. |
| GET | `/supplier-payments/:id/receipt-pdf-data` | Supplier receipt PDF data | Yes | Yes | Implemented | Template data. |
| GET | `/supplier-payments/:id/receipt.pdf` | Supplier receipt PDF | Yes | Yes | Implemented | Archives download. |
| POST | `/supplier-payments/:id/generate-receipt-pdf` | Generate supplier receipt PDF | Yes | Yes | Implemented | Explicit archive action. |

## Documents

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/organization-document-settings` | Read document settings | Yes | Yes | Implemented | Tenant scoped. |
| PATCH | `/organization-document-settings` | Update document settings | Yes | Yes | Implemented | Basic templates/colors. |
| GET | `/generated-documents` | List archive | Yes | Yes | Implemented | Excludes base64 payload. |
| GET | `/generated-documents/:id` | Archive detail | Yes | Yes | Implemented | Excludes base64 payload. |
| GET | `/generated-documents/:id/download` | Download archived PDF | Yes | Yes | Implemented | Streams stored PDF. |

## ZATCA And SDK

| Method | Path | Purpose | Auth | Org header | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/zatca/profile` | ZATCA seller profile | Yes | Yes | Implemented | Local readiness only. |
| PATCH | `/zatca/profile` | Update profile | Yes | Yes | Implemented | No official validation. |
| GET | `/zatca/adapter-config` | Safe adapter config summary | Yes | Yes | Implemented | Real network disabled by default. |
| GET | `/zatca/compliance-checklist` | Static compliance checklist | Yes | Yes | Implemented | Not legal certification. |
| GET | `/zatca/xml-field-mapping` | Local XML mapping | Yes | Yes | Implemented | Not official validation. |
| GET | `/zatca/readiness` | Local readiness booleans | Yes | Yes | Implemented | `productionReady=false`. |
| GET | `/zatca/egs-units` | List EGS units | Yes | Yes | Implemented | Private key redacted. |
| POST | `/zatca/egs-units` | Create EGS unit | Yes | Yes | Implemented | Local/dev data. |
| GET | `/zatca/egs-units/:id` | EGS detail | Yes | Yes | Implemented | Private key redacted. |
| PATCH | `/zatca/egs-units/:id` | Update EGS unit | Yes | Yes | Implemented | Tenant scoped. |
| POST | `/zatca/egs-units/:id/activate-dev` | Activate dev EGS | Yes | Yes | Implemented | Local-only helper. |
| POST | `/zatca/egs-units/:id/generate-csr` | Generate local CSR | Yes | Yes | Partial | CSR fields need official verification. |
| GET | `/zatca/egs-units/:id/csr` | CSR PEM | Yes | Yes | Implemented | CSR only, no private key. |
| GET | `/zatca/egs-units/:id/csr/download` | CSR download | Yes | Yes | Implemented | CSR only. |
| POST | `/zatca/egs-units/:id/request-compliance-csid` | Mock/safe compliance CSID | Yes | Yes | Mock/Scaffold | Mock by default, real disabled. |
| POST | `/zatca/egs-units/:id/request-production-csid` | Production CSID placeholder | Yes | Yes | Placeholder | Not implemented for production. |
| GET | `/sales-invoices/:id/zatca` | Invoice ZATCA metadata | Yes | Yes | Implemented | Local metadata only. |
| POST | `/sales-invoices/:id/zatca/generate` | Generate local XML/QR/hash | Yes | Yes | Groundwork | Not official XML/signing. |
| POST | `/sales-invoices/:id/zatca/compliance-check` | Mock/local compliance check | Yes | Yes | Mock | Logs local success only. |
| POST | `/sales-invoices/:id/zatca/clearance` | Clearance endpoint | Yes | Yes | Safe blocked | No production clearance. |
| POST | `/sales-invoices/:id/zatca/reporting` | Reporting endpoint | Yes | Yes | Safe blocked | No production reporting. |
| GET | `/sales-invoices/:id/zatca/xml` | Local XML download | Yes | Yes | Groundwork | Not official ZATCA XML. |
| GET | `/sales-invoices/:id/zatca/xml-validation` | Local XML validation | Yes | Yes | Groundwork | `officialValidation=false`. |
| GET | `/sales-invoices/:id/zatca/qr` | Local QR payload | Yes | Yes | Groundwork | Phase 2 QR incomplete. |
| GET | `/zatca/submissions` | Submission/onboarding logs | Yes | Yes | Implemented | Includes mock/safe blocked logs. |
| GET | `/zatca-sdk/readiness` | Local SDK readiness | Yes | Yes | Groundwork | Does not run SDK. |
| POST | `/zatca-sdk/validate-xml-dry-run` | SDK validation dry-run plan | Yes | Yes | Groundwork | Does not execute SDK. |
| POST | `/zatca-sdk/validate-xml-local` | Local SDK execution gate | Yes | Yes | Disabled placeholder | Disabled and not command-verified. |
