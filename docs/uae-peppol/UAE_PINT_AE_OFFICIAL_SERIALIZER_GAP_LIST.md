# UAE PINT-AE Official Serializer Gap List

Status: local serializer partial proof
Date: 2026-07-02

## Current Covered Locally

- UAE electronic address scheme `0235`.
- Official customization/profile identifiers in local serializer output.
- Commercial invoice type code `380`.
- Tax credit note type code `381`.
- ProfileExecutionID transaction flag builder for mapped scenarios.
- Predefined endpoint scenarios currently represented in fixtures.
- Negative tests for missing endpoints, invalid TIN/TRN, missing credit-note reason/reference, and unmapped transaction flags.

## Known Gaps

- Provider-specific payload contract.
- Provider-specific submission envelope.
- Reverse-charge transaction flag mapping where source-backed mapping is still missing.
- Allowance/charge representation.
- Full official validation against external authority tooling.
- ASP sandbox certification evidence.
- Production certificate/accreditation evidence.

## Claim Boundary

The package can claim local readiness and tested local serializer coverage for the listed fixtures. It cannot claim UAE compliance, Peppol certification, FTA reporting, ASP acceptance, or production serializer completion.

## UAE-PRE-ASP-ADAPTER-02 Serializer Boundary Update

The package now exposes explicit serializer modes:

- `READINESS_ONLY`: local readiness XML, uses the LedgerByte readiness customization ID.
- `OFFICIAL_DRAFT_LOCAL_ONLY`: local official-draft serialization with `productionCompliance: false`, `noNetwork: true`, `noAspValidation: true`, and `noFtaReporting: true`.
- `PROVIDER_SUBMISSION_BLOCKED`: provider submission is blocked until real ASP access, provider docs, legal/security review, and contract tests exist.

The official draft serializer remains partial. The new mode metadata prevents the readiness serializer and official-draft serializer from being represented as certified, approved, production compliant, provider accepted, or FTA reported.

## UAE-PRE-ASP-ADAPTER-03 Gap Closure

Closed locally:

- official draft invoice and credit-note model helpers.
- structured draft validators for party endpoint/address/tax registration, line totals, tax totals, document totals, credit-note reference/reason, and negative invoice totals.
- serializer output metadata for serializer mode, official identifier use, official-reference verification status, provider requirement, missing provider access, conformance evidence availability, warnings, and errors.
- fixture coverage for valid-ish local drafts, negative invoice, missing endpoint/address/reference/reason, line/tax mismatches, predefined endpoint scenarios, readiness-vs-official boundaries, and disabled/mock provider submission safety.

Still open:

- complete official reference pack review.
- full official code-list enforcement.
- provider-specific request/response envelope mapping.
- official conformance evidence.
- ASP sandbox validation evidence.
- production compliance review.

## UAE-PRE-ASP-ADAPTER-04 Gap Movement

Closed locally:

- provider-neutral envelope skeleton for draft payload wrappers.
- sandbox onboarding state-machine simulator.
- fake local provider submission/status/webhook harness.
- provider capability negotiation checklist.
- provider error fixture library with redaction tests.

Still open:

- provider-specific envelope field mapping.
- provider-specific authentication and header rules.
- provider-specific webhook/event taxonomy.
- provider-specific retry, idempotency, and evidence download rules.
- real ASP sandbox credentials and conformance evidence.
