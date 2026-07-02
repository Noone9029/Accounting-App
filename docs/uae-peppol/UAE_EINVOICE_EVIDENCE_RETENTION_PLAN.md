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
