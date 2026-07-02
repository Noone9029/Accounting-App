# Provider Envelope Contract Skeleton

Status: local-only contract skeleton
Date: 2026-07-02

This document describes the provider-neutral envelope shape added before real UAE ASP access. It is not a provider mapping, Peppol submission format, FTA reporting format, or production compliance artifact.

## Added Package Surface

- `UaeAspProviderEnvelope`
- `UaeAspProviderEnvelopeMetadata`
- `UaeAspProviderEnvelopeDocument`
- `UaeAspProviderEnvelopeParty`
- `UaeAspProviderEnvelopeAttachment`
- `UaeAspProviderSubmissionRequest`
- `UaeAspProviderSubmissionResponse`
- `UaeAspProviderStatusRequest`
- `UaeAspProviderStatusResponse`
- `UaeAspProviderWebhookEnvelope`
- `UaeAspProviderWebhookEvent`
- `UaeAspProviderErrorEnvelope`
- `UaeAspProviderRedactionPolicy`
- `buildProviderEnvelope`

## Boundary

Envelope metadata carries tenant/organization id, document id, document type, serializer mode, provider id, provider environment, idempotency key, correlation id, timestamp, local-only status, and explicit false flags for `productionCompliance`, `aspSubmissionReady`, and `networkReady`.

Document body and attachment body fields are redacted by default. Helpers return hashes and metadata, not raw XML or provider payload bodies.

## Provider-Specific Gap

No provider-specific envelope docs, sandbox payload samples, headers, authentication format, retry contract, or evidence format are committed in the repo. Those fields must be filled only after real provider docs are available and reviewed.
