# Webhook Outbox Readiness

LedgerByte outbound webhooks are disabled by default. This groundwork adds tenant-scoped records and local/test-safe mock event recording only.

## Current Modes

- `DISABLED`: default. No outbound delivery or external URL calls.
- `MOCK_LOCAL`: local/test-only. Records an outbox item, webhook event, and mock delivery attempt without calling external URLs.
- `PROVIDER_PLACEHOLDER`: future production placeholder. Requires approval and additional implementation before any external delivery.

Production-like modes reject `MOCK_LOCAL`. Production-like delivery also requires explicit public delivery approval.

## Stored Data Policy

Webhook/outbox records store safe summaries only:

- event type
- aggregate type
- aggregate id
- requestId when available
- local mock status and retry state
- booleans proving raw payloads, provider payloads, and secret fields are not stored

They do not store webhook signing secrets, raw provider payloads, raw response bodies, authorization headers, customer document bodies, PDFs, XML, or credentials.

## Event Catalog

Initial catalogued events:

- `invoice.created`
- `invoice.finalized`
- `payment.recorded`
- `document.reviewed`
- `bank.feed_transaction.ready`
- `supplier_payout.approved`

## Remaining Production Gaps

- Real external webhook delivery is not implemented.
- Signing-secret custody is not approved.
- Endpoint verification is not implemented.
- Retry/backoff execution is not implemented.
- Monitoring, alerting, replay controls, and rate-limit controls still need production approval.
