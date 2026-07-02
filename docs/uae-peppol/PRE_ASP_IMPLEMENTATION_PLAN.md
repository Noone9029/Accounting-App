# UAE Pre-ASP Implementation Plan

Status: provider-agnostic plan
Date: 2026-07-02

## Goal

Make future ASP onboarding plug-and-play without connecting to a real ASP, calling Peppol/FTA, or claiming UAE compliance.

## Current Foundation

- Local PINT-AE readiness and official serializer tests exist.
- Disabled and mock ASP adapters exist.
- This PR adds local-only idempotency keys, outbox draft shape, HMAC webhook signature verification with fake/local secrets, in-memory replay guard, and provider error normalization.

## Future Provider Sequence

1. Select provider and complete legal/commercial/security review.
2. Obtain sandbox credentials through an approved secret path.
3. Add provider-specific adapter behind disabled-by-default configuration.
4. Add contract tests against provider sandbox documentation.
5. Add webhook endpoint with signature/replay controls.
6. Add persistent outbox/retry schema only in a dedicated migration goal.
7. Run sandbox certification/onboarding evidence.
8. Update UI copy only after provider status is verified.

## Non-Claims

- No accredited ASP support.
- No UAE compliance.
- No Peppol certification.
- No FTA reporting.
- No production serializer completion beyond current local tested scope.

## UAE-PRE-ASP-ADAPTER-02 Addendum

The package foundation now separates three local surfaces:

- `READINESS_ONLY` XML for data-readiness checks.
- `OFFICIAL_DRAFT_LOCAL_ONLY` payloads for local PINT-AE draft serialization.
- `PROVIDER_SUBMISSION_BLOCKED` for every path that would require ASP access.

Additional package helpers now cover official identifier checks, endpoint scheme `0235` validation, predefined endpoint scenario classification, business-process metadata, typed transmission drafts, mock-only timeline events, timestamped fake webhook replay protection, and typed provider error normalization.

This does not change the future provider sequence. Persistent outbox/retry storage, provider-specific request envelopes, real webhook endpoints, provider URLs, credentials, and production retention rules remain deferred to a separate approved ASP-access goal.

## UAE-PRE-ASP-ADAPTER-03 Official Draft Readiness Addendum

The local package now includes explicit official-draft invoice and credit-note model helpers, structured draft validators, serializer boundary metadata, and fixture coverage for missing endpoints, missing address/tax registration, negative invoices, line/tax/document total mismatches, missing credit-note references/reasons, and blocked provider submission.

The new `docs/uae-peppol/UAE_PINT_AE_SERIALIZER_READINESS_MATRIX.md` records implemented-local areas separately from documented gaps and blockers. Because the full official PINT-AE reference pack and provider envelope/webhook docs are not present in the repository, unresolved official rules remain documented gaps rather than guessed implementation.

Provider submission payloads, real ASP calls, Peppol/FTA transmission, production provider endpoints, credentials, and production UAE compliance remain blocked.

## UAE-PRE-ASP-ADAPTER-04 Provider Harness Addendum

The package now includes provider-neutral envelope contract skeletons, a sandbox onboarding state-machine simulator, deterministic fake provider submission/status/webhook simulators, conservative capability negotiation helpers, and a provider error fixture library.

These helpers prepare the integration shape for future ASP onboarding while keeping all results local-only. They do not add provider-specific payload fields, provider URLs, credentials, network calls, Peppol/FTA transmission, production compliance, persistent outbox storage, object storage, signed URLs, or hosted behavior.

Provider-specific implementation remains blocked until provider envelope docs, webhook docs, sandbox credentials, legal/security review, and conformance evidence exist.
