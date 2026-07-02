# Fake Provider Test Harness

Status: deterministic local harness
Date: 2026-07-02

The fake UAE ASP provider harness exercises future integration expectations without calling a network, storing real credentials, emitting production statuses, or claiming provider acceptance.

## Added Package Surface

- `createFakeUaeAspProvider`
- `simulateSubmitInvoice`
- `simulateSubmitCreditNote`
- `simulateStatusPolling`
- `simulateWebhookDelivery`
- `simulateProviderRejection`
- `simulateRateLimit`
- `simulateDuplicateDocument`
- `simulateReceiverNotFound`
- `simulateEndpointNotRegistered`

## Harness Rules

- Every result is `localOnly: true`.
- Every result is `productionCompliance: false`.
- Every status is local/mock, such as `SUBMITTED_MOCK`, `REJECTED_MOCK`, `RATE_LIMITED_MOCK`, or `ENDPOINT_NOT_REGISTERED_MOCK`.
- Production environment simulation is rejected.
- External provider URLs are rejected.
- Payloads are redacted by default.

## Not Implemented

The harness does not prove ASP connectivity, Peppol delivery, FTA reporting, provider acceptance, buyer delivery, object storage, evidence download, or production readiness.
