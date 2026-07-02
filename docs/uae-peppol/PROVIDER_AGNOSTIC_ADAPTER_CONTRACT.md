# Provider-Agnostic ASP Adapter Contract

Status: local contract
Date: 2026-07-02

## Adapter Operations

- `validateDocument`
- `submitDocument`
- `getDocumentStatus`
- `parseWebhook`
- `verifyWebhookSignature`
- `downloadEvidence`
- `healthCheck`

## Required Result Flags

All disabled/mock/future adapter results must expose:

- `noNetwork: true` until a real provider goal is approved.
- `productionCompliance: false` until legal/provider evidence proves otherwise.
- `mockOnly: true` for mock adapter output.
- explicit provider key and mode.
- normalized status from the package status enum.

## Helpers Added

- `buildAspIdempotencyKey`
- `createAspSubmissionOutboxDraft`
- `signLocalAspWebhookPayload`
- `verifyLocalAspWebhookSignature`
- `createInMemoryAspWebhookReplayGuard`
- `normalizeAspProviderError`

## Provider Adapter Rules

- External provider URLs remain blocked by the factory in this branch.
- Future providers return not implemented.
- Mock submission requires explicit mock mode.
- Disabled provider must never emit live statuses such as FTA reporting or buyer delivery.
- Secrets must be redacted in config/error output.

## UAE-PRE-ASP-ADAPTER-02 Contract Strengthening

The adapter contract now also exposes:

- provider identity/display helpers: `getProviderId()` and `getDisplayName()`.
- boolean capability flags: sandbox, webhooks, inbound invoices, status polling, tax data reporting, client certificate, HMAC signature, `networkEnabled`, and `productionEnabled`.
- local config validation with `valid` and `ok` values.
- `prepareSubmission`, `submitInvoice`, `submitCreditNote`, and `getTransmissionStatus` aliases for future provider parity.
- config redaction, provider error normalization, webhook event normalization, and `isNetworkEnabled()`.

Mock provider success uses explicit mock statuses such as `ACCEPTED_MOCK` and `REJECTED_MOCK`. Real-provider statuses such as `PROVIDER_ACCEPTED`, `FTA_REPORTED`, and `INBOUND_RECEIVED` are modeled for future contracts but are rejected for disabled/mock provider modes.
