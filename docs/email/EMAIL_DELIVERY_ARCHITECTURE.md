# Document email delivery architecture

SME-DOCUMENT-DELIVERY-02 established the shared email foundation for customer documents. SME-DOCUMENT-DELIVERY-03 extends the same queue, snapshot, history, suppression, retry, and provider boundary to purchase orders, purchase debit notes, supplier-payment remittances, and supplier statement snapshots.

## Queue boundary

The source orchestrators only perform tenant-scoped lookup, eligibility checks, safe template preparation, generated-PDF archival, replay lookup, and delegation to `DocumentDeliveryService`. Queue HTTP requests do not call SMTP or any external provider. The only provider execution path is `EmailRetryWorkerService`.

All sources share `EmailOutbox`, the organization-scoped idempotency hash, suppression checks, central delivery status mapping, redacted history, retry claiming, attachment verification, and provider execution. `EmailOutbox` stores PDF metadata and a bounded source context, never PDF bytes, raw idempotency keys, raw message bodies in history, or provider payloads.

## Sources and endpoints

| Source | Queue | History | Eligibility | Permission |
| --- | --- | --- | --- | --- |
| Sales quote/proforma | `POST /sales-quotes/:id/email-deliveries` | `GET /sales-quotes/:id/email-deliveries` | `SENT`, `ACCEPTED` | `salesInvoices.send` / `salesInvoices.view` |
| Credit note | `POST /credit-notes/:id/email-deliveries` | `GET /credit-notes/:id/email-deliveries` | `FINALIZED` | `creditNotes.send` / `creditNotes.view` |
| Customer payment receipt | `POST /customer-payments/:id/email-deliveries` | `GET /customer-payments/:id/email-deliveries` | `POSTED` | `customerPayments.send` / `customerPayments.view` |
| Customer statement | `POST /contacts/:id/email-deliveries` | `GET /contacts/:id/email-deliveries` | `CUSTOMER` or `BOTH` contact | `contacts.sendCustomerStatements` / `contacts.view` |
| Purchase order | `POST /purchase-orders/:id/email-deliveries` | `GET /purchase-orders/:id/email-deliveries` | `APPROVED`, `SENT` | `purchaseOrders.send` / `purchaseOrders.view` |
| Purchase debit note | `POST /purchase-debit-notes/:id/email-deliveries` | `GET /purchase-debit-notes/:id/email-deliveries` | `FINALIZED` | `purchaseDebitNotes.send` / `purchaseDebitNotes.view` |
| Supplier-payment remittance | `POST /supplier-payments/:id/email-deliveries` | `GET /supplier-payments/:id/email-deliveries` | `POSTED` | `supplierPayments.send` / `supplierPayments.view` |
| Supplier statement | `POST /contacts/:id/supplier-statement-email-deliveries` | `GET /contacts/:id/supplier-statement-email-deliveries` | `SUPPLIER` or `BOTH` contact | `contacts.sendSupplierStatements` / `contacts.view` |

## Statement identity

Statements reuse `ContactLedgerService.statementPdfData` and `statementPdf`. The queue requires `asOf`, rejects a conflicting `to`, normalizes omitted `to` to `asOf`, and stores only `from`, `to`, and `asOf` in bounded request/source context. Authoritative statement data is prepared before replay lookup; the PDF archive is created only after a replay/conflict check. The generated-document source ID contains the tenant-scoped customer statement identity and is verified against a customer/BOTH contact.

Supplier statements use the same PDF renderer with the supplier ledger's existing FX-aware snapshot identity. The supplier route accepts only `SUPPLIER`/`BOTH` contacts, requires exact real dates, preserves `to === asOf`, and exposes period metadata in safe delivery history. The shared web panel is source-neutral but retains customer-named compatibility exports for existing consumers.

## Status and safety

`QUEUED` means accepted into the outbox. `SENT_MOCK` means the local mock provider ran. Provider acceptance remains `SENT_PROVIDER`; it is not a claim that the recipient read or received the email. Suppression, bounce, complaint, attachment MIME/size/hash mismatch, stale claims, and retry exhaustion remain fail-closed or retryable through the existing worker rules.

No supplier route calls SMTP or a real provider. The mandatory two-worker PostgreSQL race fixture is guarded and requires disposable local PostgreSQL; a skipped run is not race evidence.
