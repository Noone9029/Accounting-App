# UAE Disabled ASP Connector Contracts Sprint Closure

Date: 2026-06-15

Branch: `feature/uae-disabled-asp-connector-contracts`

## Summary

This sprint adds the provider-neutral foundation for a future UAE ASP integration while keeping LedgerByte in controlled beta/user-testing posture.

LedgerByte remains the bookkeeping/accounting SaaS, data-capture layer, local readiness validator, audit trail, and orchestration layer. A future accredited UAE ASP API would handle final Peppol/PINT-AE validation, transmission, exchange, and FTA reporting only after commercial provider selection, API documentation review, sandbox credentials, redaction rules, and explicit approval.

## Implemented

- Provider-neutral ASP adapter contract in `@ledgerbyte/uae-peppol-pint-ae`.
- Normalized provider keys: `DISABLED`, `MOCK`, `FUTURE_COMPLYANCE`, `FUTURE_CLEARTAX`, `FUTURE_EDICOM`, and `FUTURE_GENERIC_ASP`.
- Normalized status values for disabled, local validation, future ASP, FTA, buyer delivery, retry, terminal, and archived states.
- Disabled ASP adapter that blocks submission, rejects non-mock webhooks, returns disabled/not-configured health, returns no evidence, and never emits sent, FTA-reported, or buyer-delivered states.
- Mock ASP adapter for deterministic local tests only. It can simulate validation success/failure and accepted/rejected mock submission only when explicit mock mode is enabled.
- Future provider placeholders that return safe not-implemented results.
- Provider factory rules for missing config, disabled config, explicit mock config, future providers, and arbitrary external URL blocking.
- Redaction helper for provider config and metadata.
- Compliance-core API/service surface for provider readiness summary, redacted config testing, local/mock transmission preview, explicit mock submit, and provider status timeline.
- Tenant-scoped compliance document lookup before preview, status, or mock submit behavior.

## Safety Boundaries

- Controlled beta/user-testing only.
- UAE Peppol/PINT-AE readiness only.
- Disabled/mock provider behavior only.
- No real ASP calls.
- No real ASP submission.
- No FTA reporting.
- No real Peppol transmission.
- No production Peppol claim.
- No production UAE compliance claim.
- No `FTA certified`, `Peppol certified`, `official UAE provider`, or `accredited ASP` claim.
- No ZATCA production behavior.
- No hosted/customer-data mutation.
- No Vercel/Supabase changes.
- No production infrastructure commands.
- Accounting finalization remains separate from compliance delivery state.

## Verification

Planned verification for this branch:

- `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae test`
- `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae typecheck`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- compliance-core.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- compliance.test.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- settings/compliance/page.test.tsx`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm verify:diff`
- `corepack pnpm verify:ci:local`
- `git diff --check`
- `git diff --cached --check`

## Skipped

The following remain intentionally skipped unless explicitly approved in a future lane:

- `db:migrate`
- seed/reset/delete
- smoke
- E2E
- deployed checks
- real ASP calls
- real ZATCA calls
- real email
- Vercel/Supabase changes
- production infrastructure commands

## Known Limitations

- No provider has been finalized.
- No provider-specific API contract has been implemented.
- No provider credentials, base URLs, or real webhooks are accepted.
- Future provider details will be added only after commercial provider selection and API documentation review.
- The mock provider is for local contract tests only and is not evidence of real ASP transmission, FTA reporting, or buyer delivery.
- ZATCA remains parked and blocked by default.

## Next Recommended Prompt Title

`UAE ASP provider selection research and provider-specific sandbox contract plan`
