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
