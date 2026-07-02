# Provider Capability Negotiation

Status: conservative local comparator
Date: 2026-07-02

Provider capability negotiation is modeled as a conservative local checklist. Unknown values are not treated as supported.

## Added Package Surface

- `normalizeProviderCapabilities`
- `validateProviderCapabilities`
- `summarizeProviderCapabilities`
- `compareProviderCapabilitiesToLedgerByteRequirements`
- `listUnsupportedRequiredCapabilities`

## Required Capability Areas

- Sandbox support
- Webhooks
- Status polling
- Outbound invoice submission
- Outbound credit-note submission
- Error-code mapping
- Idempotency-key support
- Payload redaction/logging rules

## Future Optional Areas

- Inbound invoice support
- Tax data reporting support
- Client certificate requirement
- HMAC signature requirement

## Boundary

Capabilities can make local mock implementation planning clearer. They do not enable production, network calls, ASP connectivity, UAE compliance, Peppol certification, or FTA reporting.
