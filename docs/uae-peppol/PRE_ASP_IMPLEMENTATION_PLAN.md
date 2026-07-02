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
