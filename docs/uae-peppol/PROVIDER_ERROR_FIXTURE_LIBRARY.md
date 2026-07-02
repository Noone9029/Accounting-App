# Provider Error Fixture Library

Status: local fixture library
Date: 2026-07-02

The provider error fixture library gives stable fake inputs for future adapter tests without including real provider bodies, credentials, or customer payloads.

## Added Fixture Areas

- Authentication failure
- Missing credentials/configuration
- Invalid endpoint
- Unknown receiver
- Duplicate document
- Provider unavailable
- Rate limited
- Invalid signature
- Replay detected
- Validation error
- Unknown provider error

## Redaction Boundary

Fixtures intentionally include fake sensitive-looking values so normalizers prove redaction. Normalized details redact request bodies, payloads, tokens, credentials, and secrets. User-facing and operator-facing messages stay safe and do not infer compliance or provider success.

## Remaining Gap

Provider-specific error taxonomies and retry rules remain blocked until actual provider docs exist.
