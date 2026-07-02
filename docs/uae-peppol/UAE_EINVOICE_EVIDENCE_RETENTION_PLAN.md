# UAE eInvoice Evidence Retention Plan

Status: draft, needs legal/provider review
Date: 2026-07-02

## Evidence Classes

- local validation report
- generated XML
- future ASP submission payload
- future ASP response
- future webhook event
- future FTA/provider confirmation
- audit export
- supersession/cancellation record

## Draft Retention

Keep evidence for at least the accounting document retention period, subject to legal and provider requirements. Do not store provider secrets or private keys as evidence artifacts.

## Required Controls

- tenant-scoped metadata
- hash and size metadata
- immutable/versioned storage where required
- replay-protected webhook events
- evidence download audit trail
- legal hold support before production use

## Blocked Until ASP Access

- provider-specific evidence fields
- certified payload/response formats
- production retention obligations
- FTA/provider confirmation storage rules

## UAE-PRE-ASP-ADAPTER-02 Evidence Mapping

| Evidence artifact | Stored now | Contains sensitive data | Retention class | Redaction rule | Restore evidence needed | Legal hold relevance |
| --- | --- | --- | --- | --- | --- | --- |
| official XML payload | metadata/hash only | yes, if body stored later | tax document evidence | do not expose XML body in support or tests | hash, size, source document, archive pointer | high |
| readiness XML payload | local test output only | possible sample data | readiness evidence | keep sample-only or hash-only | test fixture hash and mode metadata | medium |
| provider request envelope | future | yes | provider submission evidence | redact headers, tokens, certificates, and body by default | envelope hash, provider correlation ID | high |
| provider response | future | yes | provider response evidence | redact raw body unless legal/security approves body storage | response hash, status, received timestamp | high |
| webhook raw body hash | future | no body, hash only | webhook integrity evidence | store hash, never raw body by default | raw body hash plus signature hash | high |
| webhook normalized event | local helper shape only | low after redaction | webhook processing evidence | redact payload/body/secret/token fields | event ID, status, document ID, signature hash | high |
| transmission attempt | package type only | no, if metadata-only | operational audit evidence | no customer body or secret fields | idempotency key, status, provider key | medium |
| status timeline | package type only | low | operational timeline evidence | mock statuses must remain `_MOCK`; real statuses require provider evidence | ordered events and actor/source metadata | medium |
| archive hash | metadata only | no body | archive integrity evidence | store hash/size/provider pointer only | hash, size, storage provider, source reference | high |
| receipt/delivery evidence | future | yes | delivery evidence | redact provider body and receiver details unless approved | provider receipt hash/correlation ID | high |
| FTA reporting evidence | future | yes | tax authority evidence | disabled until provider/legal requirements exist | authority/provider confirmation hash | high |
| inbound invoice evidence | future | yes | inbound document evidence | redact raw provider payload by default | inbound payload hash and normalized metadata | high |

No object storage, signed URL, provider evidence download, or immutable retention behavior is implemented by this mapping.

## UAE-PRE-ASP-ADAPTER-03 Evidence Boundary

Official draft model and validator outputs are local readiness evidence only. They may be retained as metadata, hashes, and test results, but they are not provider receipts, FTA reports, production tax evidence, or legal compliance evidence.

Draft payload bodies can contain business document data and must remain redacted from provider error details and support artifacts unless a later legal/security-approved storage goal explicitly permits body retention. No object storage, signed URL, immutable retention, provider evidence download, or production retention behavior is enabled by this pass.

## UAE-PRE-ASP-ADAPTER-04 Envelope And Simulator Evidence

Provider envelopes, fake provider events, fake webhook deliveries, capability summaries, and provider error fixtures are local evidence only. They are suitable for package tests and future contract planning, not legal tax evidence, provider receipts, FTA reports, buyer delivery receipts, or production archive records.

Envelope and webhook helpers redact document bodies, raw bodies, payloads, tokens, credentials, and secrets by default. No object storage, signed URL, immutable retention, provider evidence download, persistent replay storage, or production retention behavior is enabled.
