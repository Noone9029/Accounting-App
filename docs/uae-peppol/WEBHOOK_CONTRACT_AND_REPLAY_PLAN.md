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
