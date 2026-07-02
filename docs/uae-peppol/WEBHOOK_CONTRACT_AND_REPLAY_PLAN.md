# ASP Webhook Contract and Replay Plan

Status: local helper and future persistent design
Date: 2026-07-02

## Local Helper

This PR adds local-only HMAC helpers:

- `signLocalAspWebhookPayload(payload, secret)`
- `verifyLocalAspWebhookSignature({ payload, signature, secret })`
- `createInMemoryAspWebhookReplayGuard()`

These are test/foundation helpers. They do not expose a live webhook endpoint and do not call a provider.

## Future Persistent Contract

Persistent webhook handling should store:

- provider key
- event ID
- signature hash
- received timestamp
- normalized status
- related document/transmission ID
- raw payload storage reference, if legal/security approved
- processing result and retry count

## Replay Rules

- Missing event ID: reject.
- Duplicate event ID: reject and record duplicate attempt.
- Invalid signature: reject and alert.
- Unknown document/tenant: reject without leaking existence.
- Valid event: process idempotently through an outbox/worker path.

Persistent replay protection requires schema migration and is intentionally deferred.

## UAE-PRE-ASP-ADAPTER-02 Local Replay Helper

The local package now has a timestamp-aware fake replay guard for tests:

- `signFakeWebhookPayload({ payload, secret, timestamp })`
- `verifyWebhookSignature({ payload, signature, secret, timestamp })`
- `parseWebhookEvent(payload)`
- `normalizeWebhookEvent(event)`
- `createInMemoryUaeWebhookReplayGuard({ now, maxAgeSeconds })`

This helper rejects missing event IDs, invalid timestamps, stale timestamps, and duplicate event/signature pairs. It stores only in memory and is not a production replay store. Normalized events include hashes and redacted payload metadata only; raw bodies and secrets are not returned.

## UAE-PRE-ASP-ADAPTER-03 Draft Payload Redaction Boundary

Official draft payloads can appear only in local package tests and blocked/mock adapter calls. Provider error normalization redacts draft payload bodies, raw bodies, payload fields, tokens, credentials, and secrets before returning details.

Real webhook statuses, provider delivery statuses, FTA reporting statuses, and persistent replay storage remain blocked until provider-specific docs, real ASP access, schema approval, and legal/security review exist.

## UAE-PRE-ASP-ADAPTER-04 Fake Webhook Harness

The local package now includes fake webhook event and delivery helpers:

- `buildFakeWebhookEvent`
- `buildFakeWebhookDelivery`
- `verifyFakeWebhookDelivery`
- `simulateWebhookDelivery`
- `simulateWebhookReplay`
- `simulateWebhookStaleTimestamp`
- `normalizeFakeWebhookEventForTimeline`

The harness uses fake local signatures only, rejects replay/stale/invalid-signature cases, redacts normalized payloads, and emits mock/local statuses only. It does not create a live webhook endpoint or persistent replay store.
